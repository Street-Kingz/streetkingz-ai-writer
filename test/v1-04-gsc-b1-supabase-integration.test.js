import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import route from "../routes/googleSearchConsole.js";
import { setGoogleSearchConsoleTransportFactory } from "../product-kernel/googleSearchConsoleOAuth.js";

const enabled = process.env.V1_04_INTEGRATION === "1";
const required = name => process.env[name] || (() => { throw new Error(`${name} required`); })();
const request = (server, method, path, token, body) => new Promise((resolve, reject) => { const headers = { "content-type": "application/json" }; if (token) headers.authorization = `Bearer ${token}`; const req = http.request({ hostname: "127.0.0.1", port: server.address().port, method, path, headers }, res => { let text = ""; res.on("data", chunk => { text += chunk; }); res.on("end", () => resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null })); }); req.on("error", reject); if (body) req.write(JSON.stringify(body)); req.end(); });

test("B1 real route/Vault lifecycle uses authenticated local tenant and fake Google", { skip: !enabled }, async t => {
  const url = required("SUPABASE_URL"), publishable = required("SUPABASE_PUBLISHABLE_KEY"), service = required("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const email = `v104-b1-${crypto.randomUUID()}@local.test`, password = `${crypto.randomUUID()}!Aa9`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true }); assert.ifError(created.error); const userId = created.data.user.id;
  t.after(() => admin.auth.admin.deleteUser(userId));
  const login = createClient(url, publishable, { auth: { persistSession: false } }); const signed = await login.auth.signInWithPassword({ email, password }); assert.ifError(signed.error); const token = signed.data.session.access_token;
  const caller = createClient(url, publishable, { global: { headers: { authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const account = await caller.rpc("product_create_account", { p_correlation_id: crypto.randomUUID() }); assert.ifError(account.error);
  const business = await caller.rpc("product_create_business", { p_name: "V1-04 B1 route test", p_platform: "woocommerce", p_correlation_id: crypto.randomUUID() }); assert.ifError(business.error);
  const woo = await caller.rpc("product_create_connection", { p_provider_type: "woocommerce", p_correlation_id: crypto.randomUUID() }); assert.ifError(woo.error);
  const accountRow = await admin.from("accounts").select("id").eq("auth_user_id", userId).single(); assert.ifError(accountRow.error);
  const attemptToken = `v104-b1-woo-${crypto.randomUUID()}`;
  const attempt = await admin.rpc("woo_create_auth_attempt", { p_user_id: attemptToken, p_account_id: accountRow.data.id, p_business_id: business.data.id, p_connection_id: woo.data.id, p_canonical_base_url: "https://example.com/shop/", p_expires_at: new Date(Date.now() + 60000).toISOString() }); assert.ifError(attempt.error);
  assert.ifError((await admin.rpc("woo_claim_auth_attempt", { p_user_id: attemptToken })).error);
  assert.ifError((await admin.rpc("woo_capture_callback", { p_attempt_id: attempt.data, p_consumer_key: "local-key", p_consumer_secret: "local-secret", p_key_permissions: "read" })).error);
  const storeId = await admin.rpc("woo_complete_connection", { p_attempt_id: attempt.data, p_home_url: "https://example.com/shop/", p_site_url: "https://example.com/shop/", p_version: "local", p_timezone: "UTC", p_currency: "GBP", p_correlation_id: crypto.randomUUID() }); assert.ifError(storeId.error);
  const storedCommerce = await admin.from("commerce_stores").select("id,business_id,provider,canonical_base_url").eq("business_id", business.data.id); assert.ifError(storedCommerce.error); assert.equal(storedCommerce.data.length, 1, JSON.stringify({ store_rpc: storeId.data, stores: storedCommerce.data }));
  const store = { data: { id: storeId.data } };
  let exchanges = 0;
  setGoogleSearchConsoleTransportFactory(() => ({
    authorizationUrl: ({ state }) => `https://accounts.google.test/authorize?state=${state}`,
    async exchangeCode() { exchanges += 1; return { refresh_token: "fake-refresh-token", scope: "https://www.googleapis.com/auth/webmasters.readonly" }; },
    async accessToken() { return "fake-access-token"; },
    async sitesList() { return { siteEntry: [{ siteUrl: "https://example.com/", permissionLevel: "siteOwner" }, { siteUrl: "sc-domain:example.com", permissionLevel: "siteFullUser" }, { siteUrl: "https://example.com/", permissionLevel: "siteUnverifiedUser" }] }; },
    async site(_token, siteUrl) { return { siteUrl, permissionLevel: siteUrl.startsWith("sc-domain:") ? "siteFullUser" : "siteOwner" }; }
  }));
  const app = express(); app.use(express.json()); app.use(route); const server = await new Promise((resolve, reject) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); s.on("error", reject); });
  t.after(() => server.close());
  const started = await request(server, "POST", "/api/product/organic-evidence/search-console/connect", token, {}); assert.equal(started.status, 201, JSON.stringify(started.body)); const authUrl = new URL(started.body.authorization_url); const connectionId = started.body.connection.id; assert.equal(authUrl.searchParams.has("state"), true);
  const callback = await request(server, "GET", `/api/product/organic-evidence/search-console/callback?state=${encodeURIComponent(authUrl.searchParams.get("state"))}&code=fake-code`, null); assert.equal(callback.status, 200, JSON.stringify(callback.body)); assert.equal(callback.body.status, "awaiting_property");
  const properties = await request(server, "GET", `/api/product/organic-evidence/search-console/properties?connection_id=${connectionId}`, token); assert.equal(properties.status, 200); assert.equal(properties.body.properties.length, 2);
  const selected = await request(server, "POST", "/api/product/organic-evidence/search-console/select", token, { connection_id: connectionId, site_url: "https://example.com/shop/" }); assert.equal(selected.status, 200, JSON.stringify(selected.body)); assert.equal(selected.body.evidence_state, "never_collected");
  const status = await request(server, "GET", `/api/product/organic-evidence/search-console/status?connection_id=${connectionId}`, token); assert.equal(status.status, 200); assert.equal(status.body.connection_state, "connected"); assert.equal(status.body.evidence_state, "never_collected"); assert.equal(status.body.has_current_complete_evidence, false); assert.equal(Object.hasOwn(status.body, "secret_reference"), false);
  const wooBefore = await admin.from("connections").select("id,status,consent_state,secret_reference").eq("id", woo.data.id).single(); const businessBefore = await admin.from("businesses").select("connection_status").eq("id", business.data.id).single();
  const disconnected = await request(server, "POST", "/api/product/organic-evidence/search-console/disconnect", token, { connection_id: connectionId }); assert.equal(disconnected.status, 200);
  const wooAfter = await admin.from("connections").select("id,status,consent_state,secret_reference").eq("id", woo.data.id).single(); const businessAfter = await admin.from("businesses").select("connection_status").eq("id", business.data.id).single();
  assert.deepEqual(wooAfter.data, wooBefore.data); assert.deepEqual(businessAfter.data, businessBefore.data); assert.equal(exchanges, 1); assert.equal((await admin.from("gsc_connections").select("connection_state").eq("connection_id", connectionId).single()).data.connection_state, "disconnected"); assert.ok(store.data.id);
});
