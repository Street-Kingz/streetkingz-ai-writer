import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { addDecimal, subtractDecimal, classifyReferenceStatus, compareReference, calculateExpected, refundMagnitude, parseReferenceRefund, buildSourceSignature } from "../internal/v1-03-harness/referenceReconciliation.js";

test("reference status contract and exact decimal comparison", () => {
  assert.equal(classifyReferenceStatus("processing"), "recognised"); assert.equal(classifyReferenceStatus("refunded"), "recognised"); assert.equal(classifyReferenceStatus("cancelled"), "excluded"); assert.equal(classifyReferenceStatus("failed"), "excluded"); assert.equal(classifyReferenceStatus("pending"), "unknown"); assert.equal(classifyReferenceStatus("on-hold"), "unknown"); assert.equal(classifyReferenceStatus("custom"), "unclassified");
  assert.equal(addDecimal("0.10", "0.20"), "0.30"); assert.equal(subtractDecimal("100.00", "0.01"), "99.99");
  const expected = { expected: [{ product_source_id: 123, variation_source_id: null, product_net_sales_ex_tax: "99.99", product_tax: "20.00" }] };
  assert.equal(compareReference(expected, { rows: [{ product_source_id: 123, variation_source_id: null, product_net_sales_ex_tax: "99.99", product_tax: "20" }] }).overall, "PASS");
  assert.equal(compareReference(expected, { rows: [{ product_source_id: 123, variation_source_id: null, product_net_sales_ex_tax: "100.00", product_tax: "20.00" }] }).overall, "FAIL");
  assert.equal(compareReference(expected, { rows: [] }).overall, "FAIL");
});

test("independent commercial formula recognises exact refunds and excludes non-commercial statuses", () => {
  const orders = [
    { id: 1, status: "completed", line_items: [{ id: 10, product_id: 123, variation_id: 0, total: "100.00", total_tax: "20.00" }], refunds: [] },
    { id: 2, status: "pending", line_items: [{ id: 11, product_id: 123, variation_id: 0, total: "9.00", total_tax: "1.80" }] },
    { id: 3, status: "cancelled", line_items: [{ id: 12, product_id: 123, variation_id: 0, total: "8.00", total_tax: "1.60" }] },
    { id: 4, status: "failed", line_items: [{ id: 13, product_id: 456, variation_id: 0, total: "7.00", total_tax: "1.40" }] },
    { id: 5, status: "on-hold", line_items: [{ id: 14, product_id: 789, variation_id: 0, total: "6.00", total_tax: "1.20" }] },
  ];
  const rows = calculateExpected({ orders, refunds: [{ orderId: 1, lines: [{ lineId: 10, total: "25.00", tax: "5.00" }], unattributed: "15.00" }] });
  assert.deepEqual(rows, [{ product_source_id: 123, variation_source_id: null, product_net_sales_ex_tax: "75.00", product_tax: "15.00" }]);
});

test("genuine Woo negative refund values become magnitudes and shipping does not reduce Product sales", () => {
  assert.equal(refundMagnitude("-12.00", "refund"), "12.00"); assert.equal(refundMagnitude("0", "refund"), "0");
  const orders = [{ id: 1, status: "refunded", line_items: [{ id: 10, product_id: 123, variation_id: 0, total: "100.00", total_tax: "20.00" }] }];
  const refund = parseReferenceRefund({ id: 99, amount: "-12.00", line_items: [{ meta_data: [{ key: "_refunded_item_id", value: "10" }], total: "-10.00", total_tax: "-2.00" }] }, 1);
  const rows = calculateExpected({ orders, refunds: [refund] });
  assert.deepEqual(rows, [{ product_source_id: 123, variation_source_id: null, product_net_sales_ex_tax: "90.00", product_tax: "18.00" }]);
  const shippingRefund = parseReferenceRefund({ id: 100, amount: "-16.80", line_items: [{ meta_data: [{ key: "_refunded_item_id", value: "10" }], total: "-10", total_tax: "-2" }], shipping_lines: [{ total: "-4", total_tax: "-0.80" }] }, 1);
  assert.deepEqual(calculateExpected({ orders, refunds: [shippingRefund] })[0], { product_source_id: 123, variation_source_id: null, product_net_sales_ex_tax: "90.00", product_tax: "18.00" });
});

test("refund gross conflict blocks instead of silently changing the expected result", () => {
  assert.throws(() => refundMagnitude("-bad", "refund"), /malformed/);
  assert.throws(() => parseReferenceRefund({ id: 1, amount: "-11.00", line_items: [{ meta_data: [{ key: "_refunded_item_id", value: "10" }], total: "-10.00", total_tax: "-2.00" }] }, 1), /conflicted/);
});

test("malformed reference money fails closed", () => assert.throws(() => calculateExpected({ orders: [{ id: 1, status: "processing", line_items: [{ id: 1, product_id: 1, total: "not-money", total_tax: "0" }] }] }), /malformed/));

test("null aggregate semantics are explicit and never coerce zero to no-sales", () => {
  const absent = { expected: [] };
  assert.equal(compareReference(absent, { rows: [{ product_source_id: 1, variation_source_id: 2, product_net_sales_ex_tax: null, product_tax: null }] }).overall, "PASS");
  assert.equal(compareReference(absent, { rows: [{ product_source_id: 1, variation_source_id: 2, product_net_sales_ex_tax: "0", product_tax: "0" }] }).overall, "FAIL");
  assert.equal(compareReference(absent, { rows: [{ product_source_id: 1, variation_source_id: 2, product_net_sales_ex_tax: "1", product_tax: "0" }] }).overall, "FAIL");
  const numeric = { expected: [{ product_source_id: 1, variation_source_id: 2, product_net_sales_ex_tax: "1", product_tax: "0" }] };
  assert.equal(compareReference(numeric, { rows: [{ product_source_id: 1, variation_source_id: 2, product_net_sales_ex_tax: null, product_tax: null }] }).overall, "FAIL");
  assert.equal(compareReference(numeric, { rows: [] }).overall, "FAIL");
  assert.equal(compareReference(numeric, { rows: [{ product_source_id: 1, variation_source_id: 2, product_net_sales_ex_tax: "1", product_tax: "0" }] }).overall, "PASS");
  assert.equal(compareReference(numeric, { rows: [{ product_source_id: 1, variation_source_id: 2, product_net_sales_ex_tax: "1.01", product_tax: "0" }] }).overall, "FAIL");
});

test("non-recognised-only activity maps to NULL aggregate equivalence and fingerprints line identity", () => {
  const orders = [{ id: 3151, status: "failed", date_created_gmt: "2026-01-01T00:00:00.000Z", line_items: [{ id: 273, product_id: 2018, variation_id: 2020, total: "12.99", total_tax: "0" }], refunds: [] }];
  assert.deepEqual(calculateExpected({ orders }), []);
  assert.equal(compareReference({ expected: [] }, { rows: [{ product_source_id: 2018, variation_source_id: 2020, product_net_sales_ex_tax: null, product_tax: null }] }).rows[0].reason, "NO_RECOGNISED_SALES");
  const before = buildSourceSignature({ orders }); const after = buildSourceSignature({ orders: [{ ...orders[0], line_items: [{ ...orders[0].line_items[0], product_id: 9999 }] }] }); assert.notEqual(before, after); assert.doesNotMatch(before, /customer|billing|shipping|email|phone|address/i);
});

test("reference reader is independent of Product commerce normalisers and .tmp is ignored", () => {
  const source = fs.readFileSync(new URL("../internal/v1-03-harness/referenceReconciliation.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /woocommerceCommerce/); assert.doesNotMatch(source, /collectInitialCommerce|normalizeRefund|normalizeOrder/);
  assert.match(fs.readFileSync(new URL("../.gitignore", import.meta.url), "utf8"), /^\.tmp\/$/m);
});

test("reference source reader uses GET-only Woo operations and keeps output sanitised", () => {
  const source = fs.readFileSync(new URL("../internal/v1-03-harness/referenceReconciliation.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /method\s*:\s*["'](POST|PATCH|PUT|DELETE)/i); assert.doesNotMatch(source, /secret_reference|consumerSecret|customer|billing|email|phone|user_agent|raw payload/i);
});

test("reference links compare exact pairs, not only counts", () => {
  const expected = { expected: [], source: { product_category_links: 2, links: [{ product_source_id: 1, category_source_id: 10 }, { product_source_id: 2, category_source_id: 11 }] } };
  assert.equal(compareReference(expected, { rows: [], links: [{ product_source_id: 1, category_source_id: 10 }, { product_source_id: 2, category_source_id: 99 }] }).links.result, "FAIL");
  assert.equal(compareReference(expected, { rows: [], links: expected.source.links }).links.result, "PASS");
  assert.equal(compareReference({ expected: [], source: { product_category_links: 0, links: [] } }, { rows: [], links: [{ product_source_id: 1, category_source_id: 10 }] }).overall, "FAIL");
});

test("reference Product categories are strict and source fingerprints include membership", () => {
  const product = { id: 1, type: "simple", categories: [{ id: 10 }, { id: 10 }] };
  const signature = buildSourceSignature({ products: [product] });
  assert.match(signature, /category_ids/);
  assert.throws(() => buildSourceSignature({ products: [{ id: 1, type: "simple" }] }), /categories/);
  assert.notEqual(signature, buildSourceSignature({ products: [{ ...product, categories: [{ id: 11 }] }] }));
});
