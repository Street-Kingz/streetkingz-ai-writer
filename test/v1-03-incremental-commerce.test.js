import test from "node:test";
import assert from "node:assert/strict";
import { collectIncrementalCommerce, INCREMENTAL_ORDER_FIELDS } from "../product-kernel/woocommerceCommerce.js";

const headers = (total, pages = total ? 1 : 0) => ({ "x-wp-total": String(total), "x-wp-totalpages": String(pages) });
const product = ({ id = 1, type = "simple", status = "publish", modified = "2026-01-02T00:00:00Z", price = "10.00", categories = [{ id: 10 }] } = {}) => ({ id, name: `P${id}`, slug: `p-${id}`, permalink: `https://shop.example/p-${id}`, type, status, sku: `SKU-${id}`, price, regular_price: price, sale_price: "", manage_stock: true, stock_quantity: 3, stock_status: "instock", date_created_gmt: "2026-01-01T00:00:00Z", date_modified_gmt: modified, categories });
const order = ({ id = 50, status = "completed", created = "2025-12-01T00:00:00Z", modified = "2026-01-02T00:00:00Z", lineProduct = 1, subtotal = "10.00", total = "10.00", pricesIncludeTax = false } = {}) => ({ id, status, currency: "GBP", date_created_gmt: created, date_modified_gmt: modified, discount_total: "0", shipping_total: "0", total, total_tax: "2.00", prices_include_tax: pricesIncludeTax, line_items: [{ id: id * 10, product_id: lineProduct, variation_id: 0, quantity: 1, subtotal, total, total_tax: "2.00" }], refunds: [] });
function provider({ products, categories = [{ id: 10, name: "Cat", slug: "cat", parent: 0 }], variations = {}, orders, details = {}, calls }) {
  return {
    collection: async (path, options) => { calls.push(["collection", path, options?.fields]); const allData = path === "products" ? products.map(row => ({ id: row.id, type: row.type, status: row.status, date_modified_gmt: row.date_modified_gmt, ...(Object.prototype.hasOwnProperty.call(row, "categories") ? { categories: row.categories } : {}) })) : path === "products/categories" ? categories : path === "orders" ? orders : path.startsWith("products/") ? (variations[path] || []) : []; const page = Number(options?.query?.page || 1), perPage = Number(options?.query?.per_page || 100), data = allData.slice((page - 1) * perPage, page * perPage); return { data, headers: headers(allData.length, allData.length ? Math.ceil(allData.length / perPage) : 0) }; },
    get: async (path) => { calls.push(["get", path]); return details[path] || products.find(row => path === `products/${row.id}`) || orders.find(row => path === `orders/${row.id}`); }
  };
}
const current = ({ products = [{ source_id: 1, name: "P1", slug: "p-1", canonical_url: "https://shop.example/p-1", sku: "SKU-1", product_type: "simple", source_status: "publish", regular_price: "10.00", current_price: "10.00", sale_price: null, manage_stock: true, stock_quantity: "3", stock_status: "instock", source_created_at: "2026-01-01T00:00:00.000Z", source_modified_at: "2026-01-02T00:00:00.000Z" }], variations = [], categories = [{ source_id: 10, name: "Cat", slug: "cat", parent_source_id: null }], links = [{ product_source_id: 1, category_source_id: 10 }], orders = [{ source_id: 50, source_status: "completed", recognition_state: "recognised", currency: "GBP", source_created_at: "2025-12-01T00:00:00.000Z", source_modified_at: "2026-01-02T00:00:00.000Z", order_total: "10.00", tax_total: "2.00", shipping_total: "0", discount_total: "0", refund_total: "0", prices_include_tax: false }], lines = [{ order_source_id: 50, source_line_id: 500, product_source_id: 1, variation_source_id: null, quantity: "1", subtotal: "10.00", total: "10.00", tax: "2.00", refunded_quantity: "0", refund_total: "0", refund_tax: "0" }], adjustments = [] } = {}) => ({ products, variations, categories, links, orders, lines, adjustments });

test("unchanged incremental inventory carries forward and is idempotent", async () => {
  const calls = [], source = product();
  const result = await collectIncrementalCommerce(provider({ products: [source], orders: [order()], calls }), { current: current(), syncStartedAt: "2026-02-01T00:00:00Z" });
  assert.deepEqual(result.changes, { products_added: 0, products_refreshed: 0, products_removed: 0, variations_added_or_refreshed: 0, variations_removed: 0, orders_added: 0, orders_refreshed: 0, orders_expired_or_removed: 0 });
  assert.equal(calls.some(call => call[0] === "get"), false);
  assert.deepEqual(result.products[0], current().products[0]);
  assert.deepEqual(result.orders[0], current().orders[0]);
});

test("product inventory refreshes changes, removes missing products, and adds new products", async () => {
  const calls = [], changed = product({ id: 1, modified: "2026-01-03T00:00:00Z", price: "12.00" }), added = product({ id: 2, modified: "2026-01-03T00:00:00Z" });
  const result = await collectIncrementalCommerce(provider({ products: [changed, added], orders: [], calls }), { current: current(), syncStartedAt: "2026-02-01T00:00:00Z" });
  assert.deepEqual(result.products.map(row => row.source_id), [1, 2]);
  assert.equal(result.products[0].current_price, "12.00");
  assert.equal(result.changes.products_added, 1); assert.equal(result.changes.products_refreshed, 1); assert.equal(result.changes.products_removed, 0);
  assert.ok(calls.some(call => call[1] === "products/1")); assert.ok(calls.some(call => call[1] === "products/2"));
  const removed = await collectIncrementalCommerce(provider({ products: [], orders: [], calls: [] }), { current: current(), syncStartedAt: "2026-02-01T00:00:00Z" });
  assert.equal(removed.products.length, 0); assert.equal(removed.changes.products_removed, 1);
});

test("category membership and variable variations use current source state", async () => {
  const calls = [], variable = product({ id: 2, type: "variable", categories: [{ id: 11 }] }), variation = { id: 21, parent_id: 2, sku: "V", attributes: [], regular_price: "8", price: "7", sale_price: "", manage_stock: true, stock_quantity: 4, stock_status: "instock", status: "publish", date_created_gmt: "2026-01-01T00:00:00Z", date_modified_gmt: "2026-01-03T00:00:00Z" };
  const result = await collectIncrementalCommerce(provider({ products: [variable], categories: [{ id: 11, name: "New", slug: "new", parent: 0 }], variations: { "products/2/variations": [variation] }, orders: [], calls }), { current: current({ products: [], variations: [], links: [] }), syncStartedAt: "2026-02-01T00:00:00Z" });
  assert.deepEqual(result.categories.map(row => row.source_id), [11]); assert.deepEqual(result.links, [{ product_source_id: 2, category_source_id: 11 }]); assert.equal(result.variations[0].source_id, 21); assert.ok(calls.some(call => call[1] === "products/2/variations"));
});

test("Product inventory category membership fails closed and preserves exact links", async () => {
  const missingCategories = product(); delete missingCategories.categories;
  for (const malformed of [missingCategories, product({ categories: null }), product({ categories: [{ id: "10" }] })]) {
    const calls = [];
    await assert.rejects(() => collectIncrementalCommerce(provider({ products: [malformed], orders: [], calls }), { current: current(), syncStartedAt: "2026-02-01T00:00:00Z" }), /categories|category/i);
  }
  const calls = [], result = await collectIncrementalCommerce(provider({ products: [product({ categories: [] }), product({ id: 2, categories: [{ id: 10 }, { id: 10 }] })], categories: [{ id: 10, name: "Cat", slug: "cat", parent: 0 }], orders: [], calls }), { current: current({ products: [], links: [] }), syncStartedAt: "2026-02-01T00:00:00Z" });
  assert.deepEqual(result.links, [{ product_source_id: 2, category_source_id: 10 }]);
  assert.equal(result.products.length, 2);
});

test("Product inventory rejects a category absent from the complete category set", async () => {
  await assert.rejects(() => collectIncrementalCommerce(provider({ products: [product({ categories: [{ id: 999 }] })], categories: [{ id: 10, name: "Cat", slug: "cat", parent: 0 }], orders: [], calls: [] }), { current: current({ products: [], links: [] }), syncStartedAt: "2026-02-01T00:00:00Z" }), /unavailable category/i);
});

test("broken empty current links self-heal from valid Product inventory", async () => {
  const result = await collectIncrementalCommerce(provider({ products: [product({ id: 1, categories: [{ id: 10 }] })], categories: [{ id: 10, name: "Cat", slug: "cat", parent: 0 }], orders: [], calls: [] }), { current: current({ links: [] }), syncStartedAt: "2026-02-01T00:00:00Z" });
  assert.deepEqual(result.links, [{ product_source_id: 1, category_source_id: 10 }]);
  assert.equal(current().links.length, 1);
});

test("103-style Product-category membership is reconstructed exactly", async () => {
  const products = Array.from({ length: 103 }, (_, index) => product({ id: index + 1, categories: [{ id: index + 1 }] }));
  const categories = products.map(row => ({ id: row.id, name: `Cat${row.id}`, slug: `cat-${row.id}`, parent: 0 }));
  const calls = [], result = await collectIncrementalCommerce(provider({ products, categories, orders: [], calls }), { current: current({ products: [], links: [] }), syncStartedAt: "2026-02-01T00:00:00Z" });
  assert.equal(result.links.length, 103);
  assert.deepEqual(result.links, products.map(row => ({ product_source_id: row.id, category_source_id: row.id })));
  assert.deepEqual(calls.find(call => call[1] === "products")[2], ["id", "type", "status", "date_modified_gmt", "categories"]);
});

test("new and changed orders are refreshed while orders outside the rolling window are removed", async () => {
  const calls = [], changed = order({ modified: "2026-01-03T00:00:00Z", total: "11.00" }), added = order({ id: 51, modified: "2026-01-03T00:00:00Z" });
  const result = await collectIncrementalCommerce(provider({ products: [product()], orders: [changed, added], calls }), { current: current(), syncStartedAt: "2026-02-01T00:00:00Z" });
  assert.deepEqual(result.orders.map(row => row.source_id), [50, 51]); assert.equal(result.changes.orders_refreshed, 1); assert.equal(result.changes.orders_added, 1); assert.ok(calls.some(call => call[1] === "orders/50")); assert.ok(calls.some(call => call[1] === "orders/51"));
  const expired = await collectIncrementalCommerce(provider({ products: [product()], orders: [], calls: [] }), { current: current(), syncStartedAt: "2027-02-01T00:00:00Z" });
  assert.equal(expired.orders.length, 0); assert.equal(expired.changes.orders_expired_or_removed, 1);
});

test("incremental inventory is minimal and canonicalizes persisted numeric/timestamp facts", async () => {
  assert.deepEqual(INCREMENTAL_ORDER_FIELDS, ["id", "status", "currency", "date_created_gmt", "date_modified_gmt", "total", "total_tax", "discount_total", "shipping_total", "prices_include_tax", "refunds", "line_items"]);
  const calls = [], source = product({ modified: "2026-01-02T00:00:00Z" });
  const dbLoaded = current(); dbLoaded.products[0].current_price = 10; dbLoaded.products[0].stock_quantity = 3; dbLoaded.products[0].source_modified_at = "2026-01-02T00:00:00.000Z";
  const result = await collectIncrementalCommerce(provider({ products: [source], orders: [order()], calls }), { current: dbLoaded, syncStartedAt: "2026-02-01T00:00:00Z" });
  assert.equal(result.changes.products_refreshed, 0);
  assert.equal(result.changes.orders_refreshed, 0);
  assert.equal(calls.some(call => call[0] === "get"), false);
});

test("source timestamp boundary deliberately re-reads facts at provider precision edge", async () => {
  const calls = [], source = product();
  await collectIncrementalCommerce(provider({ products: [source], orders: [order()], calls }), { current: current(), syncStartedAt: "2026-02-01T00:00:00Z", previousSuccessfulAt: "2026-01-02T00:00:00Z" });
  assert.ok(calls.some(call => call[1] === "products/1"));
  assert.ok(calls.some(call => call[1] === "orders/50"));
});

test("refunded Orders are conservatively refreshed even when the prior refund was fully line-attributed", async () => {
  const calls = [], prior = current({ lines: [{ ...current().lines[0], refund_total: "2.00", refund_tax: "0.40" }], adjustments: [] });
  const result = await collectIncrementalCommerce(provider({ products: [product()], orders: [order({ total: "10.00" })], details: { "orders/50": order({ total: "10.00" }) }, calls }), { current: prior, syncStartedAt: "2026-02-01T00:00:00Z" });
  assert.ok(calls.some(call => call[1] === "orders/50"));
  assert.equal(result.orders.length, 1);
});

test("complete Order commercial fingerprint refreshes subtotal and persisted source facts", async () => {
  for (const changed of [
    { current: current({ lines: [{ ...current().lines[0], subtotal: "12.00" }] }), source: order({ subtotal: "13.00" }) },
    { current: current({ orders: [{ ...current().orders[0], source_created_at: "2025-12-01T00:00:00.000Z" }] }), source: order({ created: "2025-12-02T00:00:00Z" }) },
    { current: current({ orders: [{ ...current().orders[0], prices_include_tax: false }] }), source: order({ pricesIncludeTax: true }) }
  ]) {
    const calls = [];
    await collectIncrementalCommerce(provider({ products: [product()], orders: [changed.source], calls }), { current: changed.current, syncStartedAt: "2026-02-01T00:00:00Z" });
    assert.ok(calls.some(call => call[1] === "orders/50"));
  }
});
