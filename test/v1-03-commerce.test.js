import test from "node:test";
import assert from "node:assert/strict";
import { collectInitialCommerce, normalizeRefund, paginateWooCollection, FIELDS } from "../product-kernel/woocommerceCommerce.js";
import { wooCollectionRequest } from "../product-kernel/woocommerceEgress.js";

const headers = (total, pages) => ({ "x-wp-total": String(total), "x-wp-totalpages": String(pages) });
test("V1-03 paginator proves every page and rejects incomplete pagination", async () => {
  const calls = [];
  const provider = { collection: async (path, { query }) => { calls.push({ path, page: query.page }); return { data: query.page === 1 ? [{ id: 1 }] : [{ id: 2 }], headers: headers(2, 2) }; } };
  assert.deepEqual(await paginateWooCollection(provider, "products", { perPage: 1 }), [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(calls.map(call => call.page), [1, 2]);
  await assert.rejects(paginateWooCollection({ collection: async () => ({ data: [{ id: 1 }], headers: headers(3, 2) }) }, "products", { perPage: 1 }), error => error.code === "PROVIDER_MALFORMED_RESPONSE");
});

test("V1-03 initial commerce normalisation bounds PII, preserves decimals and refunds", async () => {
  const requests = [];
  const pages = {
    products: [[{ id: 1, name: "Simple", slug: "simple", permalink: "https://shop.example/simple", type: "simple", status: "publish", sku: "", price: "", regular_price: "12.10", sale_price: "", manage_stock: false, stock_quantity: null, stock_status: "instock", date_created_gmt: "2025-01-01T00:00:00", date_modified_gmt: "2025-01-02T00:00:00", categories: [{ id: 10 }] }, { id: 2, name: "Variable", slug: "variable", permalink: "https://shop.example/variable", type: "variable", status: "publish", sku: "V-2", price: "9.99", regular_price: "11.99", sale_price: "9.99", manage_stock: true, stock_quantity: 4, stock_status: "instock", date_created_gmt: "2025-01-01T00:00:00", date_modified_gmt: "2025-01-02T00:00:00", categories: [{ id: 11 }] }]],
    "products/categories": [[{ id: 10, name: "Cat", slug: "cat", parent: 0 }, { id: 11, name: "Other", slug: "other", parent: 0 }]],
    "products/2/variations": [[{ id: 20, parent_id: 2, sku: "V-2-A", attributes: [{ id: 1, name: "Size", option: "L", meta_data: [{ key: "email", value: "bad@example.test" }] }, { name: "Colour", option: "Blue" }], price: "9.99", regular_price: "11.99", sale_price: "9.99", manage_stock: true, stock_quantity: 2, stock_status: "instock", status: "publish", date_created_gmt: "2025-01-01T00:00:00", date_modified_gmt: "2025-01-02T00:00:00" }]],
    orders: [[{ id: 100, status: "completed", currency: "GBP", date_created_gmt: "2025-05-01T00:00:00", date_modified_gmt: "2025-05-02T00:00:00", discount_total: "1.10", shipping_total: "4.00", total: "12.89", total_tax: "2.15", prices_include_tax: true, billing: { email: "pii@example.test" }, shipping: { address_1: "Private" }, customer_note: "secret note", line_items: [{ id: 501, product_id: 1, variation_id: 0, quantity: 1, subtotal: "11.00", total: "9.90", total_tax: "1.65", meta_data: [{ key: "email", value: "pii@example.test" }] }], refunds: [{ id: 700 }] }]],
  };
  const provider = { collection: async (path, options) => { requests.push({ path, options }); return { data: pages[path]?.[0] || [], headers: headers((pages[path]?.[0] || []).length, 1) }; }, get: async path => { requests.push({ path }); return { id: 700, amount: "-2.10", line_items: [{ id: 501, quantity: -1, total: "-1.80", total_tax: "-0.30", meta_data: [{ key: "_refunded_item_id", value: "501" }, { key: "email", value: "pii@example.test" }] }] }; } };
  const snapshot = await collectInitialCommerce(provider, { syncStartedAt: "2026-08-30T12:00:00.000Z", perPage: 2 });
  assert.equal(snapshot.orderWindowEnd, "2026-08-30T12:00:00.000Z");
  assert.equal(snapshot.orderWindowStart, "2025-08-30T12:00:00.000Z");
  assert.equal(snapshot.products[0].regular_price, "12.10");
  assert.equal(snapshot.products[0].current_price, null);
  assert.equal(snapshot.orders[0].recognition_state, "recognised");
  assert.equal(snapshot.orders[0].refund_total, "2.10");
  assert.equal(snapshot.variations[0].parent_source_id, 2);
  assert.deepEqual(snapshot.variations[0].attributes, [{ id: 1, name: "Size", option: "L" }, { name: "Colour", option: "Blue" }]);
  assert.deepEqual(snapshot.lines[0].refund_total, "1.80");
  assert.equal(snapshot.adjustments.length, 0);
  assert.doesNotMatch(JSON.stringify(snapshot), /pii@example|Private|secret note|email/);
  assert.ok(requests.some(request => request.path === "orders/100/refunds/700"));
});

test("V1-03 refund attribution requires exact _refunded_item_id", () => {
  const refund = normalizeRefund({ id: 9, amount: "-4.00", line_items: [{ quantity: -1, total: "-4.00", total_tax: "-0.67", meta_data: [{ key: "product_id", value: "10" }] }] }, 3);
  assert.equal(refund.lines.length, 0);
  assert.equal(refund.amount, "4.00");
});

test("V1-03 egress receives collector fields as a bounded _fields array", async () => {
  let seen;
  const request = (target, _options, callback) => { seen = `${target.pathname}${target.search}`; const response = { statusCode: 200, headers: { "content-type": "application/json" }, on(event, fn) { if (event === "data") fn(Buffer.from("[]")); if (event === "end") fn(); return this; } }; callback(response); return { on() { return this; }, end() {} }; };
  await wooCollectionRequest("https://shop.example/", "wp-json/wc/v3/products", { fields: ["id", "name"], lookup: async () => [{ address: "93.184.216.34", family: 4 }], request });
  assert.match(seen, /_fields=id%2Cname/);
});

test("V1-03 every collector field set is an explicit array", () => {
  for (const fields of Object.values(FIELDS)) assert.ok(Array.isArray(fields));
  assert.ok(FIELDS.variations.includes("parent_id"));
  assert.ok(!FIELDS.variations.includes("parent"));
});

test("V1-03 refund portions preserve exact attribution and order-level remainder", () => {
  const mixed = normalizeRefund({ id: 1, amount: "-7.00", line_items: [{ quantity: -1, total: "-5.00", total_tax: "-1.00", meta_data: [{ key: "_refunded_item_id", value: "10" }] }], shipping_lines: [{ total: "-1.00", total_tax: "0.00" }] }, 3);
  assert.deepEqual(mixed.lines, [{ source_line_id: 10, refunded_quantity: "1", refund_total: "5.00", refund_tax: "1.00" }]);
  assert.equal(mixed.unattributed_amount, "1.00");
  const full = normalizeRefund({ id: 2, amount: "-6.00", line_items: [{ quantity: -2, total: "-5.00", total_tax: "-1.00", meta_data: [{ key: "_refunded_item_id", value: "10" }] }] }, 3);
  assert.equal(full.unattributed_amount, "0.00");
  const orderOnly = normalizeRefund({ id: 3, amount: "-2.00", line_items: [] }, 3);
  assert.equal(orderOnly.lines.length, 0);
  assert.equal(orderOnly.unattributed_amount, "2.00");
  const unknown = normalizeRefund({ id: 4, amount: "-3.00", line_items: [{ quantity: -1, total: "-3.00", total_tax: "0.00", meta_data: [{ key: "product_id", value: "10" }] }] }, 3);
  assert.equal(unknown.lines.length, 0);
  assert.equal(unknown.unattributed_amount, "3.00");
});

test("V1-03 refunded orders remain recognised and retain source line evidence", async () => {
  const row = { id: 44, status: "refunded", currency: "GBP", date_created_gmt: "2026-01-01T00:00:00Z", date_modified_gmt: "2026-01-01T00:00:00Z", total: "10.00", total_tax: "2.00", shipping_total: "0", discount_total: "0", prices_include_tax: false, line_items: [{ id: 440, product_id: 1, variation_id: 0, quantity: 1, subtotal: "10.00", total: "10.00", total_tax: "2.00" }], refunds: [{ id: 441 }] };
  const provider = { collection: async path => ({ data: path === "products" ? [{ id: 1, type: "simple", name: "P", slug: "p", permalink: "https://shop.example/p", status: "publish", price: "10", regular_price: "10", sale_price: "", manage_stock: false, stock_quantity: null, stock_status: "instock", categories: [] }] : path === "orders" ? [row] : [], headers: headers(path === "products" || path === "orders" ? 1 : 0, path === "products" || path === "orders" ? 1 : 0) }), get: async () => ({ id: 441, amount: "-12.00", line_items: [{ quantity: -1, total: "-10.00", total_tax: "-2.00", meta_data: [{ key: "_refunded_item_id", value: "440" }] }] }) };
  const snapshot = await collectInitialCommerce(provider, { syncStartedAt: "2026-02-01T00:00:00Z" });
  assert.equal(snapshot.orders[0].recognition_state, "recognised");
  assert.equal(snapshot.lines[0].refund_total, "10.00");
  assert.equal(snapshot.adjustments.length, 0);
});

test("V1-03 required money evidence fails closed instead of becoming zero", async () => {
  const base = { id: 1, amount: "-1.00", line_items: [] };
  for (const refund of [{ ...base, amount: undefined }, { ...base, amount: "bad" }, { ...base, line_items: [{ total: "bad", total_tax: "0" }] }, { ...base, amount: "-1.00", line_items: [{ total: "-2.00", total_tax: "0", meta_data: [{ key: "_refunded_item_id", value: "4" }] }] }]) {
    assert.throws(() => normalizeRefund(refund, 2), error => error.code === "PROVIDER_MALFORMED_RESPONSE");
  }
});

test("V1-03 recognised line missing or malformed total fails closed", async () => {
  const product = { id: 1, type: "simple", name: "P", slug: "p", permalink: "https://shop.example/p", status: "publish", price: "1", regular_price: "1", sale_price: "", manage_stock: false, stock_quantity: null, stock_status: "instock", categories: [] };
  for (const total of [undefined, "bad"]) {
    const order = { id: 2, status: "completed", currency: "GBP", date_created_gmt: "2026-01-01T00:00:00Z", date_modified_gmt: "2026-01-01T00:00:00Z", total: "1", total_tax: "0", shipping_total: "0", discount_total: "0", prices_include_tax: false, line_items: [{ id: 3, product_id: 1, variation_id: 0, quantity: 1, subtotal: "1", total, total_tax: "0" }], refunds: [] };
    const provider = { collection: async path => ({ data: path === "products" ? [product] : path === "orders" ? [order] : [], headers: headers(path === "products" || path === "orders" ? 1 : 0, path === "products" || path === "orders" ? 1 : 0) }), get: async () => { throw new Error("unexpected"); } };
    await assert.rejects(collectInitialCommerce(provider, { syncStartedAt: "2026-02-01T00:00:00Z" }), error => error.code === "PROVIDER_MALFORMED_RESPONSE");
  }
});

test("V1-03 valid zero money remains zero after complete no-refund collection", async () => {
  const product = { id: 1, type: "simple", name: "P", slug: "p", permalink: "https://shop.example/p", status: "publish", price: "0", regular_price: "0", sale_price: "", manage_stock: false, stock_quantity: null, stock_status: "instock", categories: [] };
  const order = { id: 2, status: "completed", currency: "GBP", date_created_gmt: "2026-01-01T00:00:00Z", date_modified_gmt: "2026-01-01T00:00:00Z", total: "0", total_tax: "0", shipping_total: "0", discount_total: "0", prices_include_tax: false, line_items: [{ id: 3, product_id: 1, variation_id: 0, quantity: 1, subtotal: "0", total: "0", total_tax: "0" }], refunds: [] };
  const provider = { collection: async path => ({ data: path === "products" ? [product] : path === "orders" ? [order] : [], headers: headers(path === "products" || path === "orders" ? 1 : 0, path === "products" || path === "orders" ? 1 : 0) }), get: async () => { throw new Error("unexpected"); } };
  const snapshot = await collectInitialCommerce(provider, { syncStartedAt: "2026-02-01T00:00:00Z" });
  assert.equal(snapshot.orders[0].refund_total, "0");
  assert.equal(snapshot.lines[0].total, "0");
});
