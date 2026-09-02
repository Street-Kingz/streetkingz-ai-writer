import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import http from "node:http";
import { propertyProbeMatches, normalizeProperty, propertyMatches } from "../product-kernel/googleSearchConsoleOAuth.js";
import { createV104B1AcceptanceRouter, isLoopbackPeer } from "../routes/v1-04B1Acceptance.js";
import { assertV104B1AcceptanceEnvironment, createV104B1AcceptanceApp } from "../scripts/runV104B1Acceptance.js";

const env = { V1_04_B1_ACCEPTANCE: "1", NODE_ENV: "test", SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable", SUPABASE_SERVICE_ROLE_KEY: "synthetic-service" };
const request = (server, method, path, headers = {}) => new Promise((resolve, reject) => {
  const req = http.request({ hostname: "127.0.0.1", port: server.address().port, method, path, headers }, res => { let body = ""; res.on("data", chunk => { body += chunk; }); res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body })); });
  req.on("error", reject); req.end();
});

test("P1 validates the provider's returned property identity exactly", () => {
  assert.equal(propertyProbeMatches("https://example.com/shop/", { siteUrl: "https://example.com/shop/", permissionLevel: "siteOwner" }), true);
  for (const returned of ["https://example.com/", "https://example.com/shop/products", "http://example.com/shop/", "https://www.example.com/shop/", "https://example.com:444/shop/"]) assert.equal(propertyProbeMatches("https://example.com/shop/", { siteUrl: returned, permissionLevel: "siteOwner" }), false);
  assert.equal(propertyProbeMatches("sc-domain:example.co.uk", { siteUrl: "sc-domain:example.co.uk", permissionLevel: "siteOwner" }), true);
  assert.equal(propertyProbeMatches("sc-domain:example.co.uk", { siteUrl: "sc-domain:other.co.uk", permissionLevel: "siteOwner" }), false);
  assert.equal(propertyProbeMatches("https://example.com/", { permissionLevel: "siteOwner" }), false);
  assert.equal(propertyProbeMatches("https://example.com/", { siteUrl: "not-a-property", permissionLevel: "siteOwner" }), false);
});

test("P1 property comparison preserves exact identities and approved boundaries", () => {
  assert.equal(normalizeProperty("https://example.com/shop/").siteUrl, "https://example.com/shop/");
  assert.equal(propertyMatches("https://example.com/", "https://example.com/shop/"), true);
  assert.equal(propertyMatches("https://example.com/shop/", "https://example.com/shop/"), true);
  assert.equal(propertyMatches("https://example.com/shop/", "https://example.com/shop/products"), true);
  assert.equal(propertyMatches("https://example.com/shop/", "https://example.com/shopping"), false);
  assert.equal(propertyMatches("sc-domain:example.co.uk", "https://shop.example.co.uk/"), true);
});

test("P1 normal Product app does not mount the acceptance harness", async () => {
  const source = await import("node:fs/promises");
  const appSource = await source.readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.doesNotMatch(appSource, /v1-04B1Acceptance|internal\/v1-04/);
});

test("P1 acceptance environment requires explicit flag, non-production and local Supabase", () => {
  assert.throws(() => assertV104B1AcceptanceEnvironment({ ...env, V1_04_B1_ACCEPTANCE: "0" }), /V1_04_B1_ACCEPTANCE=1/);
  assert.throws(() => assertV104B1AcceptanceEnvironment({ ...env, NODE_ENV: "production" }), /cannot run in production/);
  assert.throws(() => assertV104B1AcceptanceEnvironment({ ...env, SUPABASE_URL: "https://project.supabase.co" }), /local Supabase/);
  assert.equal(assertV104B1AcceptanceEnvironment(env).url, env.SUPABASE_URL);
});

test("P1 runner is loopback-bound by contract and peer validation rejects spoofing", () => {
  assert.equal(isLoopbackPeer("127.0.0.1"), true);
  assert.equal(isLoopbackPeer("::1"), true);
  assert.equal(isLoopbackPeer("::ffff:127.0.0.1"), true);
  assert.equal(isLoopbackPeer("203.0.113.10"), false);
});

test("P1 bootstrap boundary rejects missing/foreign origin and accepts local bootstrap", async t => {
  const app = express(); app.use(createV104B1AcceptanceRouter({ enabled: true, bootstrapToken: "synthetic-bootstrap", config: () => ({ url: "http://127.0.0.1:54321", publishableKey: "synthetic-publishable", privilegedKey: "synthetic-service" }) }));
  const server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  t.after(() => server.close());
  assert.equal((await request(server, "POST", "/internal/v1-04/session")).status, 403);
  assert.equal((await request(server, "GET", "/internal/v1-04/bootstrap", { origin: "https://evil.example" })).status, 404);
  const bootstrap = await request(server, "GET", "/internal/v1-04/bootstrap");
  assert.equal(bootstrap.status, 200); assert.doesNotMatch(bootstrap.headers["access-control-allow-origin"] || "", /\*/);
  assert.equal((await request(server, "POST", "/internal/v1-04/session", { "x-v1-04-bootstrap": "synthetic-bootstrap", origin: `http://127.0.0.1:${server.address().port}` })).status, 503);
});

test("P1 dedicated runner app rejects production and exposes no wildcard CORS", () => {
  assert.throws(() => createV104B1AcceptanceApp({ env: { ...env, NODE_ENV: "production" } }), /cannot run in production/);
  const app = createV104B1AcceptanceApp({ env, bootstrapToken: "synthetic-bootstrap" });
  assert.equal(app._router.stack.some(layer => layer.name === "corsMiddleware"), false);
});
