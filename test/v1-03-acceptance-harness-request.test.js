import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import app from "../app.js";
import { createV103AcceptanceHarnessRouter } from "../routes/v1-03AcceptanceHarness.js";

function serverFor(handler) { return new Promise((resolve, reject) => { const application = express(); if (handler) application.use(handler); const server = http.createServer(application).listen(0, "127.0.0.1", () => resolve(server)); server.once("error", reject); }); }
function request(server, { path, host }) { return new Promise((resolve, reject) => { const address = server.address(); const req = http.request({ hostname: "127.0.0.1", port: address.port, path, headers: { host } }, res => { res.resume(); res.on("end", () => resolve(res.statusCode)); }); req.on("error", reject); req.end(); }); }

test("disabled app returns 404 and enabled router is local-host only", async t => {
  const disabled = await serverFor(app); t.after(() => disabled.close()); assert.equal(await request(disabled, { path: "/internal/v1-03", host: "127.0.0.1" }), 404);
  const enabled = await serverFor(createV103AcceptanceHarnessRouter()); t.after(() => enabled.close()); assert.equal(await request(enabled, { path: "/internal/v1-03", host: "127.0.0.1" }), 200); assert.equal(await request(enabled, { path: "/internal/v1-03", host: "public-tunnel.example" }), 404); assert.equal(await request(enabled, { path: "/internal/v1-03", host: "localhost:9999" }), 200);
});

test("hosted Supabase bootstrap is refused before user creation", async t => {
  const previous = { url: process.env.SUPABASE_URL, pub: process.env.SUPABASE_PUBLISHABLE_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = "https://hosted.supabase.co"; process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-test"; process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
  const server = await serverFor(createV103AcceptanceHarnessRouter()); t.after(() => { server.close(); for (const [key, value] of [["SUPABASE_URL", previous.url], ["SUPABASE_PUBLISHABLE_KEY", previous.pub], ["SUPABASE_SERVICE_ROLE_KEY", previous.service]]) value === undefined ? delete process.env[key] : process.env[key] = value; });
  const address = server.address(); const result = await new Promise((resolve, reject) => { const req = http.request({ hostname: "127.0.0.1", port: address.port, path: "/internal/v1-03/bootstrap", method: "POST", headers: { host: "localhost", "content-type": "application/json" } }, res => { let text = ""; res.on("data", chunk => text += chunk); res.on("end", () => resolve({ status: res.statusCode, text })); }); req.on("error", reject); req.end("{}"); });
  assert.equal(result.status, 403); assert.match(result.text, /LOCAL_SUPABASE_REQUIRED/); assert.doesNotMatch(result.text, /service-test|password|access_token/);
});

test("snapshot requires bearer authentication and a caller-owned connection", async t => {
  const server = await serverFor(createV103AcceptanceHarnessRouter()); t.after(() => server.close()); const address = server.address();
  const result = await new Promise((resolve, reject) => { const req = http.request({ hostname: "127.0.0.1", port: address.port, path: "/internal/v1-03/product-snapshot?connection_id=00000000-0000-4000-8000-000000000000", headers: { host: "localhost" } }, res => { let text = ""; res.on("data", chunk => text += chunk); res.on("end", () => resolve({ status: res.statusCode, text })); }); req.on("error", reject); req.end(); });
  assert.equal(result.status, 401); assert.doesNotMatch(result.text, /secret_reference|service_role|password/);
});
