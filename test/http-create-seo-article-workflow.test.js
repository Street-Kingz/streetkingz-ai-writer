import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { requestJson, startServer, stopServer } from "./helpers/http.js";
import app from "../app.js";

let server;
before(async () => { server = await startServer(app); });
after(async () => { await stopServer(server); });

test("first-class create SEO article route accepts product_url alone without external calls", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error("No external call expected"); };
  try {
    const response = await requestJson(server, { method: "POST", path: "/workflows/create-seo-article", body: { product_url: "https://merchant.example/products/widget" } });
    assert.equal(response.status, 201);
    assert.equal(response.body.objective, "create_seo_article");
    assert.equal(response.body.current_stage, "product_understanding");
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("workflow route rejects prompt-led input", async () => {
  const response = await requestJson(server, { method: "POST", path: "/workflows/create-seo-article", body: { product_url: "https://merchant.example/products/widget", topic: "chosen topic" } });
  assert.equal(response.status, 400);
  assert.equal(response.body.code, "INVALID_WORKFLOW_INPUT");
});
