import { ProductError } from "./errors.js";

const FIELDS = {
  products: ["id","name","slug","permalink","type","status","sku","price","regular_price","sale_price","manage_stock","stock_quantity","stock_status","date_created_gmt","date_modified_gmt","categories"],
  variations: ["id","parent_id","sku","attributes","regular_price","price","sale_price","manage_stock","stock_quantity","stock_status","status","date_created_gmt","date_modified_gmt"],
  categories: ["id","name","slug","parent"],
  orders: ["id","status","currency","date_created_gmt","date_modified_gmt","discount_total","shipping_total","total","total_tax","prices_include_tax","line_items","refunds"]
};
export { FIELDS };
export const INCREMENTAL_PRODUCT_FIELDS = ["id", "type", "status", "date_modified_gmt", "categories.id"];
// Woo 11.0.1 did not advance an Order's modified timestamp for a rapid line-total edit.
// Keep only the strict commercial line fingerprint in the inventory response.
export const INCREMENTAL_ORDER_FIELDS = ["id", "status", "currency", "date_created_gmt", "date_modified_gmt", "total", "total_tax", "discount_total", "shipping_total", "prices_include_tax", "refunds", "line_items"];
const MAX_PAGES = 10000;
const positiveInt = value => Number.isSafeInteger(value) && value > 0 ? value : null;
const text = value => typeof value === "string" && value.length ? value : null;
const decimal = value => typeof value === "string" && /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value) ? value : null;
const date = value => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null;

function decimalPair(value) { const raw = String(value || "0"); const negative = raw.startsWith("-"); const [integer = "0", fraction = ""] = raw.replace(/^-/, "").split("."); return { negative, integer, fraction }; }
function addDecimal(left, right) {
  const l = decimalPair(left), r = decimalPair(right), scale = Math.max(l.fraction.length, r.fraction.length), factor = 10n ** BigInt(scale);
  const signed = (x) => (x.negative ? -1n : 1n) * (BigInt(x.integer) * factor + BigInt(x.fraction.padEnd(scale, "0") || "0"));
  const value = signed(l) + signed(r), negative = value < 0n, magnitudeValue = negative ? -value : value, divisor = factor, integer = magnitudeValue / divisor, fraction = magnitudeValue % divisor;
  return negative ? `-${integer}${scale ? `.${String(fraction).padStart(scale, "0")}` : ""}` : `${integer}${scale ? `.${String(fraction).padStart(scale, "0")}` : ""}`;
}
function requiredMoney(value, label) { const d = decimal(value); if (!d) throw new ProductError("PROVIDER_MALFORMED_RESPONSE", `WooCommerce ${label} was invalid.`, 502); return d.replace(/^-/, ""); }
function optionalMoney(value, label) { if (value === undefined || value === null || value === "") return null; return requiredMoney(value, label); }
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
function normalizeVariation(row) { return { source_id: positiveInt(row.id), parent_source_id: positiveInt(row.parent_id), sku: text(row.sku), attributes: Array.isArray(row.attributes) ? row.attributes.filter(x => x && typeof x.name === "string" && typeof x.option === "string").map(x => ({ ...(positiveInt(x.id) ? { id: x.id } : {}), name: x.name, option: x.option })) : [], regular_price: decimal(row.regular_price), current_price: decimal(row.price), sale_price: decimal(row.sale_price), manage_stock: typeof row.manage_stock === "boolean" ? row.manage_stock : null, stock_quantity: typeof row.stock_quantity === "number" && Number.isFinite(row.stock_quantity) ? String(row.stock_quantity) : null, stock_status: text(row.stock_status), source_status: text(row.status), source_created_at: date(row.date_created_gmt), source_modified_at: date(row.date_modified_gmt) }; }
function normalizeCategory(row) { return { source_id: positiveInt(row.id), name: text(row.name), slug: text(row.slug), parent_source_id: row.parent === 0 ? null : positiveInt(row.parent) }; }
function recognition(status) { return status === "processing" || status === "completed" || status === "refunded" ? "recognised" : status === "cancelled" || status === "failed" ? "excluded" : status === "pending" || status === "on-hold" ? "unknown" : "unclassified"; }

export function normalizeRefund(refund, orderId) {
  const id = positiveInt(refund.id);
  if (!id) throw new ProductError("PROVIDER_MALFORMED_RESPONSE", "WooCommerce refund was invalid.", 502);
  const total = requiredMoney(refund.amount, "refund amount");
  const lines = [];
  for (const line of Array.isArray(refund.line_items) ? refund.line_items : []) {
    const meta = Array.isArray(line.meta_data) ? line.meta_data.find(item => item && item.key === "_refunded_item_id") : null;
    const sourceLine = positiveInt(Number(meta?.value));
    const lineTotal = requiredMoney(line.total, "refund line total");
    const lineTax = requiredMoney(line.total_tax, "refund line tax");
    if (sourceLine) lines.push({ source_line_id: sourceLine, refunded_quantity: typeof line.quantity === "number" ? String(Math.abs(line.quantity)) : null, refund_total: lineTotal, refund_tax: lineTax });
  }
  const exactGross = lines.reduce((sum, line) => addDecimal(sum, addDecimal(line.refund_total, line.refund_tax)), "0");
  const otherGross = [...(Array.isArray(refund.shipping_lines) ? refund.shipping_lines : []), ...(Array.isArray(refund.fee_lines) ? refund.fee_lines : [])].reduce((sum, line) => addDecimal(sum, addDecimal(requiredMoney(line.total, "refund component total"), optionalMoney(line.total_tax, "refund component tax") || "0")), "0");
  const used = addDecimal(exactGross, otherGross);
  const remainderCandidate = addDecimal(total, `-${used}`);
  if (remainderCandidate.startsWith("-")) throw new ProductError("PROVIDER_MALFORMED_RESPONSE", "WooCommerce refund components conflict with the provider total.", 502);
  const remainder = remainderCandidate;
  return { order_source_id: orderId, provider_adjustment_id: String(id), amount: total, lines, unattributed_amount: addDecimal(otherGross, remainder) };
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
    for (const summary of Array.isArray(raw.refunds) ? raw.refunds : []) refunds.push(normalizeRefund(await provider.get(`orders/${positiveInt(raw.id)}/refunds/${positiveInt(summary.id || summary.refund_id)}`, { fields: ["id","amount","line_items","shipping_lines","fee_lines","taxes"] }), positiveInt(raw.id)));
  }
  const refundTotals = new Map();
  for (const refund of refunds) refundTotals.set(refund.order_source_id, addDecimal(refundTotals.get(refund.order_source_id), refund.amount));
  const lines = [];
  const adjustments = [];
  for (const raw of ordersRaw) {
    for (const line of Array.isArray(raw.line_items) ? raw.line_items : []) {
      const total = decimal(line.total);
      const tax = decimal(line.total_tax);
      if (recognition(raw.status) === "recognised" && (!total || !tax)) throw new ProductError("PROVIDER_MALFORMED_RESPONSE", "WooCommerce recognised order line money was invalid.", 502);
      lines.push({ order_source_id: positiveInt(raw.id), source_line_id: positiveInt(line.id), product_source_id: positiveInt(line.product_id), variation_source_id: positiveInt(line.variation_id), quantity: typeof line.quantity === "number" ? String(line.quantity) : null, subtotal: decimal(line.subtotal), total, tax, refunded_quantity: "0", refund_total: "0", refund_tax: "0" });
    }
    for (const refund of refunds.filter(item => item.order_source_id === positiveInt(raw.id))) {
      for (const refundLine of refund.lines) {
        const target = lines.find(line => line.order_source_id === refund.order_source_id && line.source_line_id === refundLine.source_line_id);
        if (target) { target.refunded_quantity = addDecimal(target.refunded_quantity, refundLine.refunded_quantity); target.refund_total = addDecimal(target.refund_total, refundLine.refund_total); target.refund_tax = addDecimal(target.refund_tax, refundLine.refund_tax); }
        else adjustments.push({ order_source_id: refund.order_source_id, adjustment_type: "refund", provider_adjustment_id: `${refund.provider_adjustment_id}:unmatched:${refundLine.source_line_id}`, amount: `-${addDecimal(refundLine.refund_total, refundLine.refund_tax)}`, product_source_id: null, variation_source_id: null });
      }
      if (!/^0(?:\.0+)?$/.test(refund.unattributed_amount)) adjustments.push({ order_source_id: refund.order_source_id, adjustment_type: "refund", provider_adjustment_id: `${refund.provider_adjustment_id}:unattributed`, amount: `-${refund.unattributed_amount}`, product_source_id: null, variation_source_id: null });
    }
  }
  const links = [];
  for (const raw of productsRaw) for (const category of Array.isArray(raw.categories) ? raw.categories : []) links.push({ product_source_id: positiveInt(raw.id), category_source_id: positiveInt(category.id) });
  return { syncStartedAt: start.toISOString(), orderWindowStart, orderWindowEnd, products: productsRaw.map(normalizeProduct), variations: variationsRaw.map(normalizeVariation), categories: categoriesRaw.map(normalizeCategory), links, orders: ordersRaw.map(row => normalizeOrder(row, refundTotals.get(positiveInt(row.id)) || "0")), lines, adjustments };
}

function sourceDate(value) { return date(value); }
function canonicalDecimal(value) {
  if (typeof value === "number" && Number.isFinite(value)) value = String(value);
  const parsed = decimal(value);
  if (!parsed) return null;
  const [whole, fraction = ""] = parsed.replace(/^-/, "").split(".");
  const sign = parsed.startsWith("-") && !/^0+$/.test(whole) ? "-" : "";
  const trimmed = fraction.replace(/0+$/, "");
  return `${sign}${whole}${trimmed ? `.${trimmed}` : ""}`;
}
function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  return value;
}
function sameCanonical(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => sameCanonical(value, right[index]));
  if (left && typeof left === "object" || right && typeof right === "object") {
    if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
    const leftKeys = Object.keys(left).sort(), rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && sameCanonical(left[key], right[key]));
  }
  return left === right;
}
function canonicalTimestamp(value) { return sourceDate(value); }
function sameSourceDate(inventoryValue, currentValue) { return canonicalTimestamp(inventoryValue) === canonicalTimestamp(currentValue); }
function sameMoney(left, right) { return canonicalDecimal(left) === canonicalDecimal(right); }
function sameNormalizedProduct(left, right) {
  return left?.source_id === right?.source_id && left?.name === right?.name && left?.slug === right?.slug && left?.canonical_url === right?.canonical_url && left?.sku === right?.sku && left?.product_type === right?.product_type && left?.source_status === right?.source_status && sameMoney(left?.regular_price, right?.regular_price) && sameMoney(left?.current_price, right?.current_price) && sameMoney(left?.sale_price, right?.sale_price) && left?.manage_stock === right?.manage_stock && sameMoney(left?.stock_quantity, right?.stock_quantity) && left?.stock_status === right?.stock_status && canonicalTimestamp(left?.source_created_at) === canonicalTimestamp(right?.source_created_at) && canonicalTimestamp(left?.source_modified_at) === canonicalTimestamp(right?.source_modified_at);
}
function sameNormalizedVariation(left, right) {
  return left?.source_id === right?.source_id && left?.parent_source_id === right?.parent_source_id && left?.sku === right?.sku && sameCanonical(canonicalValue(left?.attributes || []), canonicalValue(right?.attributes || [])) && sameMoney(left?.regular_price, right?.regular_price) && sameMoney(left?.current_price, right?.current_price) && sameMoney(left?.sale_price, right?.sale_price) && left?.manage_stock === right?.manage_stock && sameMoney(left?.stock_quantity, right?.stock_quantity) && left?.stock_status === right?.stock_status && left?.source_status === right?.source_status && canonicalTimestamp(left?.source_created_at) === canonicalTimestamp(right?.source_created_at) && canonicalTimestamp(left?.source_modified_at) === canonicalTimestamp(right?.source_modified_at);
}
function withinTimestampBoundary(value, previousSuccessfulAt, precisionMs) {
  if (!previousSuccessfulAt || !value) return false;
  const sourceMs = Date.parse(value), boundaryMs = Date.parse(previousSuccessfulAt);
  return Number.isFinite(sourceMs) && Number.isFinite(boundaryMs) && sourceMs >= boundaryMs - precisionMs && sourceMs <= boundaryMs + precisionMs;
}
function orderLineFingerprint(lines) {
  return (lines || []).map(line => ({ source_line_id: line.source_line_id, product_source_id: line.product_source_id, variation_source_id: line.variation_source_id, quantity: canonicalDecimal(line.quantity), subtotal: canonicalDecimal(line.subtotal), total: canonicalDecimal(line.total), tax: canonicalDecimal(line.tax) })).sort((a, b) => a.source_line_id - b.source_line_id);
}
function inventoryLineFingerprint(row) {
  return orderLineFingerprint((Array.isArray(row.line_items) ? row.line_items : []).map(line => ({ source_line_id: positiveInt(line.id), product_source_id: positiveInt(line.product_id), variation_source_id: positiveInt(line.variation_id), quantity: typeof line.quantity === "number" ? String(line.quantity) : line.quantity, subtotal: line.subtotal, total: line.total, tax: line.total_tax })));
}
function sameOrderInventory(inventory, current, currentLines, previousSuccessfulAt, precisionMs) {
  return current && positiveInt(inventory.id) === current.source_id && (text(inventory.status) || "unknown") === current.source_status && text(inventory.currency) === current.currency && canonicalTimestamp(inventory.date_created_gmt) === canonicalTimestamp(current.source_created_at) && sameSourceDate(inventory.date_modified_gmt, current.source_modified_at) && sameMoney(inventory.total, current.order_total) && sameMoney(inventory.total_tax, current.tax_total) && sameMoney(inventory.discount_total, current.discount_total) && sameMoney(inventory.shipping_total, current.shipping_total) && inventory.prices_include_tax === current.prices_include_tax && sameCanonical(canonicalValue(inventoryLineFingerprint(inventory)), canonicalValue(orderLineFingerprint(currentLines))) && !withinTimestampBoundary(inventory.date_modified_gmt, previousSuccessfulAt, precisionMs);
}
function sameProductInventory(inventory, current, previousSuccessfulAt, precisionMs) { return current && positiveInt(inventory.id) === current.source_id && inventory.type === current.product_type && inventory.status === current.source_status && sameSourceDate(inventory.date_modified_gmt, current.source_modified_at) && !withinTimestampBoundary(inventory.date_modified_gmt, previousSuccessfulAt, precisionMs); }
function productCategoryIds(product) { return (Array.isArray(product.categories) ? product.categories : []).map(row => positiveInt(row.id)).filter(Boolean).sort((a, b) => a - b); }
function sameProductInventoryWithCategories(inventory, current, oldLinks, previousSuccessfulAt, precisionMs) { const oldCategoryIds = oldLinks.filter(row => row.product_source_id === current.source_id).map(row => row.category_source_id).sort((a, b) => a - b); return sameProductInventory(inventory, current, previousSuccessfulAt, precisionMs) && sameCanonical(productCategoryIds(inventory), oldCategoryIds); }

async function collectOrderDetails(provider, rawOrders) {
  const refunds = [];
  for (const raw of rawOrders) for (const summary of Array.isArray(raw.refunds) ? raw.refunds : []) refunds.push(normalizeRefund(await provider.get(`orders/${positiveInt(raw.id)}/refunds/${positiveInt(summary.id || summary.refund_id)}`, { fields: ["id", "amount", "line_items", "shipping_lines", "fee_lines", "taxes"] }), positiveInt(raw.id)));
  const refundTotals = new Map();
  for (const refund of refunds) refundTotals.set(refund.order_source_id, addDecimal(refundTotals.get(refund.order_source_id), refund.amount));
  const lines = [], adjustments = [];
  for (const raw of rawOrders) {
    for (const line of Array.isArray(raw.line_items) ? raw.line_items : []) {
      const total = decimal(line.total), tax = decimal(line.total_tax);
      if (recognition(raw.status) === "recognised" && (!total || !tax)) throw new ProductError("PROVIDER_MALFORMED_RESPONSE", "WooCommerce recognised order line money was invalid.", 502);
      lines.push({ order_source_id: positiveInt(raw.id), source_line_id: positiveInt(line.id), product_source_id: positiveInt(line.product_id), variation_source_id: positiveInt(line.variation_id), quantity: typeof line.quantity === "number" ? String(line.quantity) : null, subtotal: decimal(line.subtotal), total, tax, refunded_quantity: "0", refund_total: "0", refund_tax: "0" });
    }
    for (const refund of refunds.filter(item => item.order_source_id === positiveInt(raw.id))) {
      for (const refundLine of refund.lines) {
        const target = lines.find(line => line.order_source_id === refund.order_source_id && line.source_line_id === refundLine.source_line_id);
        if (target) { target.refunded_quantity = addDecimal(target.refunded_quantity, refundLine.refunded_quantity); target.refund_total = addDecimal(target.refund_total, refundLine.refund_total); target.refund_tax = addDecimal(target.refund_tax, refundLine.refund_tax); }
        else adjustments.push({ order_source_id: refund.order_source_id, adjustment_type: "refund", provider_adjustment_id: `${refund.provider_adjustment_id}:unmatched:${refundLine.source_line_id}`, amount: `-${addDecimal(refundLine.refund_total, refundLine.refund_tax)}`, product_source_id: null, variation_source_id: null });
      }
      if (!/^0(?:\.0+)?$/.test(refund.unattributed_amount)) adjustments.push({ order_source_id: refund.order_source_id, adjustment_type: "refund", provider_adjustment_id: `${refund.provider_adjustment_id}:unattributed`, amount: `-${refund.unattributed_amount}`, product_source_id: null, variation_source_id: null });
    }
  }
  return { orders: rawOrders.map(row => normalizeOrder(row, refundTotals.get(positiveInt(row.id)) || "0")), lines, adjustments };
}

export async function collectIncrementalCommerce(provider, { syncStartedAt = new Date(), previousSuccessfulAt = null, current = {}, perPage = 100, providerTimestampPrecisionMs = 1000 } = {}) {
  const start = new Date(syncStartedAt);
  if (Number.isNaN(start.valueOf())) throw new ProductError("INVALID_REQUEST", "Sync start time is invalid.", 400);
  const orderWindowEnd = start.toISOString(), orderWindowStart = new Date(start.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const previous = { products: current.products || [], variations: current.variations || [], categories: current.categories || [], links: current.links || [], orders: current.orders || [], lines: current.lines || [], adjustments: current.adjustments || [] };
  const productInventory = await paginateWooCollection(provider, "products", { fields: INCREMENTAL_PRODUCT_FIELDS, perPage });
  const categoriesRaw = await paginateWooCollection(provider, "products/categories", { fields: FIELDS.categories, perPage });
  const categories = categoriesRaw.map(normalizeCategory), categoryIds = new Set(categories.map(row => row.source_id));
  const oldProducts = new Map(previous.products.map(row => [row.source_id, row]));
  const products = [];
  for (const inventory of productInventory) {
    const old = oldProducts.get(positiveInt(inventory.id));
    const oldLinks = previous.links.filter(row => row.product_source_id === old?.source_id);
    products.push(old && sameProductInventoryWithCategories(inventory, old, oldLinks, previousSuccessfulAt, providerTimestampPrecisionMs) ? old : normalizeProduct(await provider.get(`products/${positiveInt(inventory.id)}`, { fields: FIELDS.products })));
  }
  const links = productInventory.flatMap(row => productCategoryIds(row).filter(categoryId => categoryIds.has(categoryId)).map(categoryId => ({ product_source_id: positiveInt(row.id), category_source_id: categoryId })));
  const variationsRaw = [];
  for (const product of productInventory.filter(row => row.type === "variable")) variationsRaw.push(...await paginateWooCollection(provider, `products/${positiveInt(product.id)}/variations`, { fields: FIELDS.variations, perPage }));
  const variations = variationsRaw.map(normalizeVariation);
  const ordersRaw = await paginateWooCollection(provider, "orders", { fields: INCREMENTAL_ORDER_FIELDS, perPage, query: { after: orderWindowStart, before: orderWindowEnd, dates_are_gmt: "true", status: "any", orderby: "date", order: "asc" } });
  const oldOrders = new Map(previous.orders.map(row => [row.source_id, row]));
  const oldLines = new Map(), oldAdjustments = new Map();
  for (const row of previous.lines) { const list = oldLines.get(row.order_source_id) || []; list.push(row); oldLines.set(row.order_source_id, list); }
  for (const row of previous.adjustments) { const list = oldAdjustments.get(row.order_source_id) || []; list.push(row); oldAdjustments.set(row.order_source_id, list); }
  const currentProductIds = new Set(productInventory.map(row => positiveInt(row.id))), currentVariationIds = new Set(variations.map(row => row.source_id)), currentOrderIds = new Set(ordersRaw.map(row => positiveInt(row.id)));
  const changedRaw = [], carriedOrders = [], carriedLines = [], carriedAdjustments = [], changes = { products_added: 0, products_refreshed: 0, products_removed: previous.products.filter(row => !currentProductIds.has(row.source_id)).length, variations_added_or_refreshed: 0, variations_removed: previous.variations.filter(row => !currentVariationIds.has(row.source_id)).length, orders_added: 0, orders_refreshed: 0, orders_expired_or_removed: previous.orders.filter(row => !currentOrderIds.has(row.source_id)).length };
  for (const inventory of ordersRaw) {
    const id = positiveInt(inventory.id), old = oldOrders.get(id), oldOrderLines = oldLines.get(id) || [], oldOrderAdjustments = oldAdjustments.get(id) || [], hasCurrentRefunds = Array.isArray(inventory.refunds) && inventory.refunds.length > 0, hasPreviousRefundEvidence = oldOrderAdjustments.length > 0 || oldOrderLines.some(line => !sameMoney(line.refund_total, "0") || !sameMoney(line.refund_tax, "0")), unchanged = old && !hasCurrentRefunds && !hasPreviousRefundEvidence && sameOrderInventory(inventory, old, oldOrderLines, previousSuccessfulAt, providerTimestampPrecisionMs);
    if (unchanged) { carriedOrders.push(old); carriedLines.push(...(oldLines.get(id) || [])); carriedAdjustments.push(...(oldAdjustments.get(id) || [])); }
    else { changedRaw.push(await provider.get(`orders/${id}`, { fields: FIELDS.orders })); if (old) changes.orders_refreshed += 1; else changes.orders_added += 1; }
  }
  const refreshed = await collectOrderDetails(provider, changedRaw);
  const orderFacts = { orders: [...carriedOrders, ...refreshed.orders].sort((a, b) => a.source_id - b.source_id), lines: [...carriedLines, ...refreshed.lines], adjustments: [...carriedAdjustments, ...refreshed.adjustments] };
  changes.products_added = products.filter(row => !oldProducts.has(row.source_id)).length; changes.products_refreshed = products.filter(row => oldProducts.has(row.source_id) && !sameNormalizedProduct(oldProducts.get(row.source_id), row)).length;
  const oldVariations = new Map(previous.variations.map(row => [row.source_id, row])); changes.variations_added_or_refreshed = variations.filter(row => !oldVariations.has(row.source_id) || !sameNormalizedVariation(oldVariations.get(row.source_id), row)).length;
  return { syncStartedAt: start.toISOString(), orderWindowStart, orderWindowEnd, products, variations, categories, links, ...orderFacts, changes };
}
