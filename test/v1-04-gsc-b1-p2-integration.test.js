import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { ProductError } from "../product-kernel/errors.js";
import route from "../routes/googleSearchConsole.js";
import { setGoogleSearchConsoleTransportFactory } from "../product-kernel/googleSearchConsoleOAuth.js";

const enabled = process.env.V1_04_P2_INTEGRATION === "1";
const required = name => process.env[name] || (() => { throw new Error(name + " required"); })();
const request = (server, method, path, token, body) => new Promise((resolve, reject) => {
  const headers = { "content-type": "application/json" }; if (token) headers.authorization = "Bearer " + token;
  const req = http.request({ hostname: "127.0.0.1", port: server.address().port, method, path, headers }, res => { let text = ""; res.on("data", chunk => { text += chunk; }); res.on("end", () => { let parsed = null; try { parsed = text ? JSON.parse(text) : null; } catch {} resolve({ status: res.statusCode, body: parsed, text }); }); });
  req.on("error", reject); if (body) req.write(JSON.stringify(body)); req.end();
});

test("P2 OAuth failure and deterministic race matrix", { skip: !enabled }, async t => {
  const url = required("SUPABASE_URL"), publishable = required("SUPABASE_PUBLISHABLE_KEY"), service = required("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const email = "v104-p2-" + crypto.randomUUID() + "@local.test", password = crypto.randomUUID() + "!Aa9";
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true }); assert.ifError(created.error); const userId = created.data.user.id;
  t.after(async () => { await admin.auth.admin.deleteUser(userId); });
  const login = createClient(url, publishable, { auth: { persistSession: false } }); const signed = await login.auth.signInWithPassword({ email, password }); assert.ifError(signed.error); const token = signed.data.session.access_token;
  const caller = createClient(url, publishable, { global: { headers: { authorization: "Bearer " + token } }, auth: { persistSession: false } });
  assert.ifError((await caller.rpc("product_create_account", { p_correlation_id: crypto.randomUUID() })).error);
  const business = await caller.rpc("product_create_business", { p_name: "P2 synthetic business", p_platform: "woocommerce", p_correlation_id: crypto.randomUUID() }); assert.ifError(business.error);
  let mode = "success", exchanges = 0, gate = null, release = null;
  setGoogleSearchConsoleTransportFactory(() => ({
    authorizationUrl: ({ state }) => "https://accounts.google.test/authorize?state=" + encodeURIComponent(state),
    async exchangeCode() {
      exchanges++;
      if (gate) await new Promise(resolve => { release = resolve; });
      if (mode === "generic") throw new ProductError("GSC_TOKEN_EXCHANGE_FAILED", "bounded", 502);
      if (mode === "timeout") throw new ProductError("GSC_PROVIDER_ERROR", "bounded", 502);
      if (mode === "malformed") throw new ProductError("GSC_PROVIDER_MALFORMED", "bounded", 502);
      if (mode === "missing" || mode === "empty") throw new ProductError("GSC_REFRESH_TOKEN_REQUIRED", "bounded", 409);
      if (mode === "scope") throw new ProductError("GSC_SCOPE_INVALID", "bounded", 409);
      if (mode === "grant") throw new ProductError("GSC_REAUTH_REQUIRED", "bounded", 409);
      return { refresh_token: "synthetic-refresh-" + exchanges, scope: "https://www.googleapis.com/auth/webmasters.readonly" };
    },
    async accessToken() { return "synthetic-access"; },
    async sitesList() {
      if (mode === "property-failure") throw new ProductError("GSC_PROVIDER_ERROR", "bounded", 502);
      if (mode === "property-malformed") return { siteEntry: "malformed" };
      return { siteEntry: [] };
    },
    async site() { if (mode === "probe-failure") throw new ProductError("GSC_PROVIDER_ERROR", "bounded", 502); return { siteUrl: "https://synthetic.test/", permissionLevel: "siteOwner" }; }
  }));
  const app = express(); app.use(express.json()); app.use(route);
  const server = await new Promise((resolve, reject) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); s.on("error", reject); }); t.after(() => server.close());
  const start = async () => { gate = null; release = null; const r = await request(server, "POST", "/api/product/organic-evidence/search-console/connect", token, {}); assert.equal(r.status, 201, JSON.stringify(r.body)); const u = new URL(r.body.authorization_url); return { state: u.searchParams.get("state"), connectionId: r.body.connection.id }; };
  const waitFor = async predicate => { const deadline = Date.now() + 2000; while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5)); assert.equal(predicate(), true, "deterministic provider barrier was not reached"); };
  const callback = (state, query = "code=synthetic-code") => request(server, "GET", "/api/product/organic-evidence/search-console/callback?state=" + encodeURIComponent(state) + (query ? "&" + query : ""), null);
  const row = async id => { const r = await admin.from("gsc_oauth_attempts").select("id,status,staged_secret_reference").eq("id", id).single(); assert.ifError(r.error); return r.data; };
  const expire = async id => assert.ifError((await admin.rpc("gsc_expire_oauth_attempt", { p_attempt_id: id })).error);

  await t.test("P2-OAUTH-001..013 callback input failures fail closed", async () => {
    for (const path of ["/api/product/organic-evidence/search-console/callback", "/api/product/organic-evidence/search-console/callback?state=%5B%22x%22%5D&code=x", "/api/product/organic-evidence/search-console/callback?state=unknown&code=x", "/api/product/organic-evidence/search-console/callback?state=unknown&code=x&unexpected=x", "/api/product/organic-evidence/search-console/callback?state=unknown"]) {
      const r = await request(server, "GET", path, null); assert.ok(r.status >= 400 && r.status < 500); assert.doesNotMatch(r.text, /unknown|state=|synthetic-code/);
    }
    const s = await start(); const denied = await callback(s.state, "error=access_denied"); assert.equal(denied.status, 409); assert.equal((await row((await admin.from("gsc_oauth_attempts").select("id").eq("connection_id", s.connectionId).order("created_at", { ascending: false }).limit(1).single()).data.id)).status, "failed");
    const both = await start(); const result = await callback(both.state, "code=x&error=access_denied"); assert.equal(result.status, 409); assert.equal(exchanges, 0);
  });

  await t.test("P2-TOKEN-001..011 authorization failures are bounded and terminal", async () => {
    for (const [name, expected] of [["generic", "GSC_TOKEN_EXCHANGE_FAILED"], ["timeout", "GSC_TOKEN_EXCHANGE_FAILED"], ["malformed", "GSC_TOKEN_EXCHANGE_FAILED"], ["missing", "GSC_REFRESH_TOKEN_REQUIRED"], ["empty", "GSC_REFRESH_TOKEN_REQUIRED"], ["scope", "GSC_SCOPE_INVALID"], ["grant", "GSC_REAUTH_REQUIRED"]]) {
      const s = await start(); mode = name; const before = exchanges; const r = await callback(s.state); assert.equal(r.status, 409, name); assert.equal(r.body.error.code, expected); assert.equal(exchanges, before + 1); const attempt = await admin.from("gsc_oauth_attempts").select("status,staged_secret_reference").eq("state_hash", crypto.createHash("sha256").update(s.state).digest("base64url")).single(); assert.ifError(attempt.error); assert.equal(attempt.data.status, "failed"); assert.equal(attempt.data.staged_secret_reference, null); assert.doesNotMatch(r.text, /synthetic-refresh|invalid_grant|authorization code|access_denied/);
    }
  });

  await t.test("P2-PROVIDER-001..006 provider failures do not activate", async () => {
    const s = await start(); mode = "success"; assert.equal((await callback(s.state)).status, 200);
    for (const name of ["property-failure", "property-malformed"]) { mode = name; const r = await request(server, "GET", "/api/product/organic-evidence/search-console/properties?connection_id=" + s.connectionId, token); assert.ok(r.status >= 400); assert.doesNotMatch(r.text, /synthetic-refresh|Vault|secret/); }
    const attempt = await admin.from("gsc_oauth_attempts").select("id,staged_secret_reference").eq("connection_id", s.connectionId).eq("status", "processing").single(); assert.ifError(attempt.error); await expire(attempt.data.id); assert.equal((await row(attempt.data.id)).staged_secret_reference, null);
  });

  await t.test("P2-RACE-CALLBACK concurrent claim has one exchange", async () => {
    const s = await start(); mode = "success"; exchanges = 0; gate = true; const first = callback(s.state); await waitFor(() => exchanges === 1); const second = callback(s.state); const secondResult = await second; assert.notEqual(secondResult.status, 200); assert.equal(exchanges, 1); assert.ok(release); release(); const results = await Promise.all([first]); assert.equal(results.filter(r => r.status === 200).length, 1); assert.equal((await callback(s.state)).status, 400);
  });

  await t.test("P2-RACE-CALLBACK three-way race still has one winner", async () => {
    const s = await start(); mode = "success"; exchanges = 0; gate = true; const calls = [callback(s.state), callback(s.state), callback(s.state)]; await waitFor(() => exchanges === 1); assert.equal(exchanges, 1); release(); const results = await Promise.all(calls); assert.equal(results.filter(r => r.status === 200).length, 1); assert.equal(exchanges, 1);
  });

  await t.test("P2-RACE-START simultaneous and superseding starts leave one pending attempt", async () => {
    const results = await Promise.all([start(), start(), start()]); const ids = results.map(r => r.connectionId); assert.equal(new Set(ids).size, 1); const attempts = await admin.from("gsc_oauth_attempts").select("status").eq("connection_id", ids[0]).order("created_at", { ascending: false }).limit(3); assert.ifError(attempts.error); assert.equal(attempts.data.filter(r => r.status === "pending").length, 1); assert.ok(attempts.data.filter(r => r.status === "superseded").length >= 2);
  });

  await t.test("P2-RACE-SUPERSEDE callback cannot stage after a newer start", async () => {
    const old = await start(); mode = "success"; exchanges = 0; gate = true; const pending = callback(old.state); await waitFor(() => exchanges === 1); const newerResponse = await request(server, "POST", "/api/product/organic-evidence/search-console/connect", token, {}); assert.equal(newerResponse.status, 201); assert.ok(release); release(); assert.notEqual((await pending).status, 200); const oldRow = await admin.from("gsc_oauth_attempts").select("status,staged_secret_reference").eq("state_hash", crypto.createHash("sha256").update(old.state).digest("base64url")).single(); assert.ifError(oldRow.error); assert.equal(oldRow.data.status, "superseded"); assert.equal(oldRow.data.staged_secret_reference, null);
  });

  await t.test("P2-RACE-EXPIRY pending and processing cleanup prevent activation", async () => {
    const pending = await start(); const pendingRow = await admin.from("gsc_oauth_attempts").select("id").eq("state_hash", crypto.createHash("sha256").update(pending.state).digest("base64url")).single(); assert.ifError(pendingRow.error); await expire(pendingRow.data.id); assert.equal((await callback(pending.state)).status, 400);
    const processing = await start(); assert.equal((await callback(processing.state)).status, 200); const processingRow = await admin.from("gsc_oauth_attempts").select("id,staged_secret_reference").eq("state_hash", crypto.createHash("sha256").update(processing.state).digest("base64url")).single(); assert.ifError(processingRow.error); assert.ok(processingRow.data.staged_secret_reference); await expire(processingRow.data.id); mode = "success"; const properties = await request(server, "GET", "/api/product/organic-evidence/search-console/properties?connection_id=" + processing.connectionId, token); assert.equal(properties.status, 409); assert.equal((await row(processingRow.data.id)).staged_secret_reference, null);
  });
});
