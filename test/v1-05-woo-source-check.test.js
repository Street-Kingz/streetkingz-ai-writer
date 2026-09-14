import test from "node:test";
import assert from "node:assert/strict";
import { verifySourceProduct } from "../scripts/validation/v1-05-verify-woo-readonly.mjs";

test("read-only source check makes one bounded catalogue request and returns only product identity", async () => {
  const calls = [];
  const result = await verifySourceProduct({ consumerKey: "secret-key", consumerSecret: "secret-value", request: async (...args) => {
    calls.push(args);
    return { data: [{ id: 902, name: "Example product", permalink: "https://streetkingz.co.uk/product/example/", status: "publish" }], headers: { "x-wp-total": "1" } };
  } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "https://streetkingz.co.uk/");
  assert.equal(calls[0][1], "wp-json/wc/v3/products");
  assert.deepEqual(calls[0][2].query, { per_page: 1, page: 1 });
  assert.deepEqual(calls[0][2].fields, ["id", "name", "permalink", "status"]);
  assert.deepEqual(result, { source_domain: "streetkingz.co.uk", product: { id: 902, name: "Example product", permalink: "https://streetkingz.co.uk/product/example/", status: "publish" } });
  assert.doesNotMatch(JSON.stringify(result), /secret-key|secret-value/);
});

test("read-only source check rejects empty catalogue and unsafe permalink", async () => {
  await assert.rejects(() => verifySourceProduct({ consumerKey: "k", consumerSecret: "s", request: async () => ({ data: [] }) }), error => error.code === "WOO_CATALOGUE_RESPONSE_INVALID");
  await assert.rejects(() => verifySourceProduct({ consumerKey: "k", consumerSecret: "s", request: async () => ({ data: [{ id: 1, name: "Item", permalink: "http://example.test/item", status: "publish" }] }) }), error => error.code === "WOO_PRODUCT_PERMALINK_INVALID");
});
