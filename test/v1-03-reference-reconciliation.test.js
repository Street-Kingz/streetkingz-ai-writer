import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { addDecimal, subtractDecimal, classifyReferenceStatus, compareReference, calculateExpected, refundMagnitude, parseReferenceRefund } from "../internal/v1-03-harness/referenceReconciliation.js";

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

test("reference reader is independent of Product commerce normalisers and .tmp is ignored", () => {
  const source = fs.readFileSync(new URL("../internal/v1-03-harness/referenceReconciliation.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /woocommerceCommerce/); assert.doesNotMatch(source, /collectInitialCommerce|normalizeRefund|normalizeOrder/);
  assert.match(fs.readFileSync(new URL("../.gitignore", import.meta.url), "utf8"), /^\.tmp\/$/m);
});

test("reference source reader uses GET-only Woo operations and keeps output sanitised", () => {
  const source = fs.readFileSync(new URL("../internal/v1-03-harness/referenceReconciliation.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /method\s*:\s*["'](POST|PATCH|PUT|DELETE)/i); assert.doesNotMatch(source, /secret_reference|consumerSecret|customer|billing|email|phone|user_agent|raw payload/i);
});
