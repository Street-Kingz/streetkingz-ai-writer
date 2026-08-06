import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { requestJson, startServer, stopServer } from "./helpers/http.js";

delete process.env.OPENAI_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.AI_PROVIDER;

const { default: app } = await import("../app.js");

let server;

before(async () => {
  server = await startServer(app);
});

after(async () => {
  await stopServer(server);
});

test("GET / preserves the health response", async () => {
  const response = await requestJson(server);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "ok",
    message: "Street Kingz AI writer service running"
  });
});

test("POST /generate-article rejects a missing topic and keyword first", async () => {
  const response = await requestJson(server, {
    method: "POST",
    path: "/generate-article",
    body: {}
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    error: "Missing required fields: 'topic' and 'primary_keyword'."
  });
});

test("POST /generate-article rejects a missing featured product", async () => {
  const response = await requestJson(server, {
    method: "POST",
    path: "/generate-article",
    body: { topic: "A topic", primary_keyword: "a keyword" }
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    error: "Missing required fields: 'featured_product_name' and 'featured_product_url'."
  });
});

test("POST /generate-article preserves the no-provider response", async () => {
  const response = await requestJson(server, {
    method: "POST",
    path: "/generate-article",
    body: {
      topic: "A topic",
      primary_keyword: "a keyword",
      featured_product_name: "A product",
      featured_product_url: "https://example.com/product"
    }
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    error: "No AI keys set. Add OPENAI_API_KEY and/or GEMINI_API_KEY in Render."
  });
});
