import { ProductError } from "./errors.js";

const FIELDS = {
  products: "id,name,slug,permalink,type,status,sku,price,regular_price,sale_price,manage_stock,stock_quantity,stock_status,date_created_gmt,date_modified_gmt,categories",
  variations: "id,parent,sku,attributes,regular_price,price,sale_price,manage_stock,stock_quantity,stock_status,status,date_created_gmt,date_modified_gmt",
  categories: "id,name,slug,parent",
  orders: "id,status,currency,date_created_gmt,date_modified_gmt,discount_total,shipping_total,total,total_tax,prices_include_tax,line_items,refunds"
};
const MAX_PAGES = 10000;
const positiveInt = value => Number.isSafeInteger(value) && value > 0 ? value : null;
const text = value => typeof value === "string" && value.length ? value : null;
const decimal = value => typeof value === "string" && /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value) ? value : null;
const date = value => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null;

function addDecimal(left, right) {
  const [li = "0", lf = ""] = String(left || "0").replace(/^-/, "").split(".");
  const [ri = "0", rf = ""] = String(right || "0").replace(/^-/, "").split(".");
  const scale = Math.max(lf.length, rf.length);
  const integer = BigInt(li) * (10n ** BigInt(scale)) + BigInt(ri) * (10n ** BigInt(scale)) + BigInt(lf.padEnd(scale, "0")) + BigInt(rf.padEnd(scale, "0"));
  const divisor = 10n ** BigInt(scale);
  return scale ? `${integer / divisor}.${String(integer % divisor).padStart(scale, "0")}` : String(integer);
}
function magnitude(value) { const d = decimal(value); return d ? d.replace(/^-/, "") : "0"; }
function pageHeader(headers, name) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  if (typeof value !== "string" || !/^(?:0|[1-9][0-9]{0,5})$/.test(value)) throw new ProductError("PROVIDER_MALFORMED_RESPONSE", "WooCommerce pagination was invalid.", 502);
  return Number(value);
}

export async function paginateWooCollection(provider, path, { fields, query = {}, perPage = 100 } = {}) {
  if (!Number.isSafeInteger(perPage) || perPage < 1 || perPage > 100) throw new ProductError("PROVIDER_MALFORMED_RESPONSE", "WooCommerce pagination was invalid.", 502);
  const rows = [];
  let pages = null;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await provider.collection(path, { fields, query: { ...query, page, per_page: perPage } });
    if (!Array.isArray(result.data)) throw new ProductError("PROVIDER_MALFORMED_RESPONSE", "WooCommerce collection was invalid.", 502);
    const total = pageHeader(result.headers, "x-wp-total");
    const totalPages = pageHeader(result.headers, "x-wp-totalpages");
    if (totalPages > MAX_PAGES || totalPages < Math.ceil(total / perPage) || pages !== null && totalPages !== pages || total === 0 && totalPages !== 0) throw new ProductError("PROVIDER_MALFORMED_RESPONSE", "WooCommerce pagination was invalid.", 502);
    pages = totalPages;
    if (totalPages === 0) return rows;
    rows.push(...result.data);
    if (page === totalPages) {
      if (rows.length !== total) throw new ProductError("PROVIDER_MALFORMED_RESPONSE", "WooCommerce collection was incomplete.", 502);
      return rows;
    }
  }
  throw new ProductError("PROVIDER_MALFORMED_RESPONSE", "WooCommerce pagination exceeded its bound.", 502);
}

function normalizeProduct(row) { return { source_id: positiveInt(row.id), name: text(row.name), slug: text(row.slug), canonical_url: text(row.permalink), sku: text(row.sku), product_type: text(row.type), source_status: text(row.status), regular_price: decimal(row.regular_price), current_price: decimal(row.price), sale_price: decimal(row.sale_price), manage_stock: typeof row.manage_stock === "boolean" ? row.manage_stock : null, stock_quantity: typeof row.stock_quantity === "number" && Number.isFinite(row.stock_quantity) ? String(row.stock_quantity) : null, stock_status: text(row.stock_status), source_created_at: date(row.date_created_gmt), source_modified_at: date(row.date_modified_gmt) }; }
function normalizeVariation(row) { return { source_id: positiveInt(row.id), parent_source_id: positiveInt(row.parent), sku: text(row.sku), attributes: Array.isArray(row.attributes) ? row.attributes.filter(x => x && positiveInt(x.id) && typeof x.name === "string" && typeof x.option === "string").map(x => ({ id: x.id, name: x.name, option: x.option })) : [], regular_price: decimal(row.regular_price), current_price: decimal(row.price), sale_price: decimal(row.sale_price), manage_stock: typeof row.manage_stock === "boolean" ? row.manage_stock : null, stock_quantity: typeof row.stock_quantity === "number" && Number.isFinite(row.stock_quantity) ? String(row.stock_quantity) : null, stock_status: text(row.stock_status), source_status: text(row.status), source_created_at: date(row.date_created_gmt), source_modified_at: date(row.date_modified_gmt) }; }
function normalizeCategory(row) { return { source_id: positiveInt(row.id), name: text(row.name), slug: text(row.slug), parent_source_id: row.parent === 0 ? null : positiveInt(row.parent) }; }
function recognition(status) { return status === "processing" || status === "completed" ? "recognised" : status === "cancelled" || status === "failed" ? "excluded" : status === "pending" || status === "on-hold" ? "unknown" : "unclassified"; }

export function normalizeRefund(refund, orderId) {
  const id = positiveInt(refund.id);
  if (!id) throw new ProductError("PROVIDER_MALFORMED_RESPONSE", "WooCommerce refund was invalid.", 502);
  const lines = [];
  for (const line of Array.isArray(refund.line_items) ? refund.line_items : []) {
    const meta = Array.isArray(line.meta_data) ? line.meta_data.find(item => item && item.key === "_refunded_item_id") : null;
    const sourceLine = positiveInt(Number(meta?.value));
    if (sourceLine) lines.push({ source_line_id: sourceLine, refunded_quantity: typeof line.quantity === "number" ? String(Math.abs(line.quantity)) : "0", refund_total: magnitude(line.total), refund_tax: magnitude(line.total_tax) });
  }
  return { order_source_id: orderId, provider_adjustment_id: String(id), amount: magnitude(refund.amount), lines, has_unattributed_line: Array.isArray(refund.line_items) && refund.line_items.length > lines.length };
}
function normalizeOrder(row, refundTotal) { return { source_id: positiveInt(row.id), source_status: text(row.status) || "unknown", recognition_state: recognition(row.status), currency: text(row.currency), source_created_at: date(row.date_created_gmt), source_modified_at: date(row.date_modified_gmt), order_total: decimal(row.total), tax_total: decimal(row.total_tax), shipping_total: decimal(row.shipping_total), discount_total: decimal(row.discount_total), refund_total: refundTotal, prices_include_tax: typeof row.prices_include_tax === "boolean" ? row.prices_include_tax : null }; }

export async function collectInitialCommerce(provider, { syncStartedAt = new Date(), perPage = 100 } = {}) {
  const start = new Date(syncStartedAt);
  if (Number.isNaN(start.valueOf())) throw new ProductError("INVALID_REQUEST", "Sync start time is invalid.", 400);
  const orderWindowEnd = start.toISOString();
  const orderWindowStart = new Date(start.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const productsRaw = await paginateWooCollection(provider, "products", { fields: FIELDS.products, perPage });
  const categoriesRaw = await paginateWooCollection(provider, "products/categories", { fields: FIELDS.categories, perPage });
  const variationsRaw = [];
  for (const product of productsRaw.filter(row => row.type === "variable")) variationsRaw.push(...await paginateWooCollection(provider, `products/${positiveInt(product.id)}/variations`, { fields: FIELDS.variations, perPage }));
  const ordersRaw = await paginateWooCollection(provider, "orders", { fields: FIELDS.orders, perPage, query: { after: orderWindowStart, before: orderWindowEnd, dates_are_gmt: "true", status: "any", orderby: "date", order: "asc" } });
  const refunds = [];
  for (const raw of ordersRaw) {
    for (const summary of Array.isArray(raw.refunds) ? raw.refunds : []) refunds.push(normalizeRefund(await provider.get(`orders/${positiveInt(raw.id)}/refunds/${positiveInt(summary.id || summary.refund_id)}`, { fields: "id,amount,line_items" }), positiveInt(raw.id)));
  }
  const refundTotals = new Map();
  for (const refund of refunds) refundTotals.set(refund.order_source_id, addDecimal(refundTotals.get(refund.order_source_id), refund.amount));
  const lines = [];
  const adjustments = [];
  for (const raw of ordersRaw) {
    for (const line of Array.isArray(raw.line_items) ? raw.line_items : []) lines.push({ order_source_id: positiveInt(raw.id), source_line_id: positiveInt(line.id), product_source_id: positiveInt(line.product_id), variation_source_id: positiveInt(line.variation_id), quantity: typeof line.quantity === "number" ? String(line.quantity) : null, subtotal: decimal(line.subtotal), total: decimal(line.total), tax: decimal(line.total_tax), refunded_quantity: "0", refund_total: "0", refund_tax: "0" });
    for (const refund of refunds.filter(item => item.order_source_id === positiveInt(raw.id))) {
      if (refund.has_unattributed_line) {
        adjustments.push({ order_source_id: refund.order_source_id, adjustment_type: "refund", provider_adjustment_id: refund.provider_adjustment_id, amount: `-${refund.amount}`, product_source_id: null, variation_source_id: null });
        continue;
      }
      for (const refundLine of refund.lines) {
        const target = lines.find(line => line.order_source_id === refund.order_source_id && line.source_line_id === refundLine.source_line_id);
        if (target) { target.refunded_quantity = addDecimal(target.refunded_quantity, refundLine.refunded_quantity); target.refund_total = addDecimal(target.refund_total, refundLine.refund_total); target.refund_tax = addDecimal(target.refund_tax, refundLine.refund_tax); }
        else adjustments.push({ order_source_id: refund.order_source_id, adjustment_type: "refund", provider_adjustment_id: refund.provider_adjustment_id, amount: `-${refund.amount}`, product_source_id: null, variation_source_id: null });
      }
      if (!refund.lines.length) adjustments.push({ order_source_id: refund.order_source_id, adjustment_type: "refund", provider_adjustment_id: refund.provider_adjustment_id, amount: `-${refund.amount}`, product_source_id: null, variation_source_id: null });
    }
  }
  const links = [];
  for (const raw of productsRaw) for (const category of Array.isArray(raw.categories) ? raw.categories : []) links.push({ product_source_id: positiveInt(raw.id), category_source_id: positiveInt(category.id) });
  return { syncStartedAt: start.toISOString(), orderWindowStart, orderWindowEnd, products: productsRaw.map(normalizeProduct), variations: variationsRaw.map(normalizeVariation), categories: categoriesRaw.map(normalizeCategory), links, orders: ordersRaw.map(row => normalizeOrder(row, refundTotals.get(positiveInt(row.id)) || "0")), lines, adjustments };
}
