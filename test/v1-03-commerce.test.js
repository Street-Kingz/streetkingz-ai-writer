import test from "node:test";
import assert from "node:assert/strict";
import { collectInitialCommerce, normalizeRefund, paginateWooCollection } from "../product-kernel/woocommerceCommerce.js";

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
    "products/2/variations": [[{ id: 20, parent: 2, sku: "V-2-A", attributes: [{ id: 1, name: "Size", option: "L", meta_data: [{ key: "email", value: "bad@example.test" }] }], price: "9.99", regular_price: "11.99", sale_price: "9.99", manage_stock: true, stock_quantity: 2, stock_status: "instock", status: "publish", date_created_gmt: "2025-01-01T00:00:00", date_modified_gmt: "2025-01-02T00:00:00" }]],
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
