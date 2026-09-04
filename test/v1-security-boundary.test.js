import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "node:http";
import { productCorsOptions, loopbackOnly, generalProductRateLimit, correlationMiddleware } from "../product-kernel/security.js";

function invoke(app, { method = "GET", path = "/", headers = {} } = {}) {
  return new Promise((resolve, reject) => { const server = app.listen(0, "127.0.0.1", () => { const address = server.address(); const req = request.request({ host: address.address, port: address.port, method, path, headers }, response => { let body = ""; response.on("data", chunk => { body += chunk; }); response.on("end", () => { server.close(); resolve({ status: response.statusCode, headers: response.headers, body }); }); }); req.on("error", error => { server.close(); reject(error); }); req.end(); }); });
}

test("CORS is exact-origin and does not allow wildcard or lookalikes", () => {
  const options = productCorsOptions({ PRODUCT_ALLOWED_ORIGINS: "https://app.example.test:443" });
  let allowed; options.origin("https://app.example.test:443", (error, value) => { assert.equal(error, null); allowed = value; }); assert.equal(allowed, "https://app.example.test:443");
  options.origin("https://evil-example.test", (error, value) => { assert.equal(error, null); assert.equal(value, false); });
  options.origin(undefined, (error, value) => { assert.equal(error, null); assert.equal(value, true); });
});

test("correlation middleware is idempotent", async () => {
  const app = express(); app.use(correlationMiddleware); app.get("/", (req, res) => res.json({ id: req.correlationId }));
  const result = await invoke(app); assert.equal(result.status, 200); assert.match(result.headers["x-correlation-id"], /^[0-9a-f-]{36}$/); assert.equal(JSON.parse(result.body).id, result.headers["x-correlation-id"]);
});

test("rate limiter returns safe correlated 429", async () => {
  const app = express(); app.use(correlationMiddleware); app.use(generalProductRateLimit); app.get("/", (_req, res) => res.json({ ok: true }));
  let last; for (let i = 0; i < 121; i++) last = await invoke(app); assert.equal(last.status, 429); const body = JSON.parse(last.body); assert.equal(body.error.code, "RATE_LIMITED"); assert.equal(body.error.correlation_id, last.headers["x-correlation-id"]); assert.doesNotMatch(last.body, /127\.0\.0\.1|counter|stack/i);
});

test("loopback guard rejects non-loopback host and forwards no customer input", async () => {
  const app = express(); app.use(loopbackOnly); app.get("/", (_req, res) => res.send("ok")); const result = await invoke(app, { headers: { host: "evil.example.test" } }); assert.equal(result.status, 404);
});
