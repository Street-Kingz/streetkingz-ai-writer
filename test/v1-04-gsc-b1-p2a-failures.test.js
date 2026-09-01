import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import route from "../routes/googleSearchConsole.js";
import { GSC_SCOPE, createGscTransport, setGoogleSearchConsoleTransportFactory } from "../product-kernel/googleSearchConsoleOAuth.js";
import { createVaultSecretProduction, deleteVaultSecretProduction, setVaultAdapterForTests } from "../product-kernel/vault.js";

const enabled = process.env.V1_04_P2A_INTEGRATION === "1";
const required = name => process.env[name] || (() => { throw new Error(`${name} required`); })();
const request = (server, method, path, token, body) => new Promise((resolve, reject) => {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const req = http.request({ hostname: "127.0.0.1", port: server.address().port, method, path, headers }, res => {
    let text = ""; res.on("data", chunk => { text += chunk; });
    res.on("end", () => { let parsed = null; try { parsed = text ? JSON.parse(text) : null; } catch {} resolve({ status: res.statusCode, body: parsed, text }); });
  });
  req.on("error", reject); if (body !== undefined) req.write(JSON.stringify(body)); req.end();
});
const hashState = state => crypto.createHash("sha256").update(state).digest("base64url");
const safeText = value => { const text = value?.text || ""; assert.doesNotMatch(text, /synthetic-refresh|access_token|client_secret|pkce|verifier|authorization code|invalid_grant|state=/i); };

test("P2-A OAuth, transport, Vault and provider failure ledger", { skip: !enabled }, async t => {
  const url = required("SUPABASE_URL");
  const publishable = required("SUPABASE_PUBLISHABLE_KEY");
  const service = required("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const password = `${crypto.randomUUID()}!Aa9`;
  const created = await admin.auth.admin.createUser({ email: `v104-p2a-${crypto.randomUUID()}@local.test`, password, email_confirm: true });
  assert.ifError(created.error); const userId = created.data.user.id;
  const login = createClient(url, publishable, { auth: { persistSession: false } });
  const signed = await login.auth.signInWithPassword({ email: created.data.user.email, password });
  assert.ifError(signed.error);
  const token = signed.data.session.access_token;
  const caller = createClient(url, publishable, { global: { headers: { authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const account = await caller.rpc("product_create_account", { p_correlation_id: crypto.randomUUID() }); assert.ifError(account.error);
  const business = await caller.rpc("product_create_business", { p_name: "P2-A synthetic business", p_platform: "woocommerce", p_correlation_id: crypto.randomUUID() }); assert.ifError(business.error);
  const accountRow = await admin.from("accounts").select("id").eq("auth_user_id", userId).single(); assert.ifError(accountRow.error);

  let mode = "success"; let exchanges = 0; let requestedProbe = null;
  const env = { GOOGLE_SEARCH_CONSOLE_CLIENT_ID: "synthetic-client", GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET: "synthetic-secret", GOOGLE_SEARCH_CONSOLE_CALLBACK_URL: "https://product.example/api/product/organic-evidence/search-console/callback" };
  const transport = () => createGscTransport({ env, fetchImpl: async (target, options) => {
    const host = new URL(target).host;
    if (!host.endsWith("googleapis.com")) throw new Error("live network blocked");
    if (target.includes("oauth2.googleapis.com/token")) {
      exchanges++;
      if (options.body?.includes("grant_type=refresh_token")) return new Response(JSON.stringify({ access_token: "synthetic-access" }), { status: 200 });
      if (mode === "generic") return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
      if (mode === "timeout") throw new DOMException("synthetic timeout", "AbortError");
      if (mode === "malformed") return new Response("{", { status: 200 });
      if (mode === "empty-body") return new Response(null, { status: 200 });
      if (mode === "oversize") return new Response("x".repeat(1024 * 1024 + 1), { status: 200 });
      if (mode === "invalid-grant") return new Response(JSON.stringify({ error: "invalid_grant", error_description: "synthetic" }), { status: 400 });
      const scopes = { exact: GSC_SCOPE, whitespace: `  ${GSC_SCOPE}\n`, missing: "", "missing-scope": "https://www.googleapis.com/auth/webmasters", wrong: "https://www.googleapis.com/auth/webmasters", openid: `${GSC_SCOPE} openid`, email: `${GSC_SCOPE} email`, write: `${GSC_SCOPE} https://www.googleapis.com/auth/webmasters`, malformed: 4, "malformed-scope": 4, empty: "   " };
      const scope = scopes[mode] ?? GSC_SCOPE;
      return new Response(JSON.stringify({ refresh_token: mode === "missing" ? undefined : mode === "empty-refresh" ? "" : "synthetic-refresh", scope }), { status: 200 });
    }
    if (target.endsWith("/sites")) {
      if (mode === "provider-list-failure") return new Response(JSON.stringify({ error: "synthetic" }), { status: 503 });
      if (mode === "provider-list-malformed") return new Response(JSON.stringify({ siteEntry: {} }), { status: 200 });
      return new Response(JSON.stringify({ siteEntry: [{ siteUrl: "https://example.com/shop/", permissionLevel: "siteOwner" }] }), { status: 200 });
    }
    requestedProbe = decodeURIComponent(new URL(target).pathname.split("/sites/")[1] || "");
    if (mode === "provider-probe-failure") return new Response(JSON.stringify({ error: "synthetic" }), { status: 403 });
    if (mode === "provider-probe-malformed") return new Response(JSON.stringify({ permissionLevel: "siteOwner" }), { status: 200 });
    if (mode === "provider-probe-unusable") return new Response(JSON.stringify({ siteUrl: requestedProbe, permissionLevel: "siteUnverifiedUser" }), { status: 200 });
    if (mode === "provider-probe-different") return new Response(JSON.stringify({ siteUrl: "https://example.com/", permissionLevel: "siteOwner" }), { status: 200 });
    return new Response(JSON.stringify({ siteUrl: requestedProbe, permissionLevel: "siteOwner" }), { status: 200 });
  } });
  setGoogleSearchConsoleTransportFactory(transport);
  const app = express(); app.use(express.json()); app.use(route);
  const server = await new Promise((resolve, reject) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); s.on("error", reject); });

  const makeWooSite = async () => {
    const woo = await caller.rpc("product_create_connection", { p_provider_type: "woocommerce", p_correlation_id: crypto.randomUUID() }); assert.ifError(woo.error);
    const user = `p2a-woo-${crypto.randomUUID()}`;
    const attempt = await admin.rpc("woo_create_auth_attempt", { p_user_id: user, p_account_id: accountRow.data.id, p_business_id: business.data.id, p_connection_id: woo.data.id, p_canonical_base_url: "https://example.com/shop/", p_expires_at: new Date(Date.now() + 60000).toISOString() }); assert.ifError(attempt.error);
    assert.ifError((await admin.rpc("woo_claim_auth_attempt", { p_user_id: user })).error);
    assert.ifError((await admin.rpc("woo_capture_callback", { p_attempt_id: attempt.data, p_consumer_key: "synthetic-key", p_consumer_secret: "synthetic-secret", p_key_permissions: "read" })).error);
    const store = await admin.rpc("woo_complete_connection", { p_attempt_id: attempt.data, p_home_url: "https://example.com/shop/", p_site_url: "https://example.com/shop/", p_version: "local", p_timezone: "UTC", p_currency: "GBP", p_correlation_id: crypto.randomUUID() }); assert.ifError(store.error);
    return woo.data.id;
  };
  const wooId = await makeWooSite();
  const start = async () => { const r = await request(server, "POST", "/api/product/organic-evidence/search-console/connect", token, {}); assert.equal(r.status, 201, JSON.stringify(r.body)); const u = new URL(r.body.authorization_url); return { state: u.searchParams.get("state"), connectionId: r.body.connection.id }; };
  const callback = (state, suffix = "code=synthetic-code") => request(server, "GET", `/api/product/organic-evidence/search-console/callback?state=${encodeURIComponent(state)}${suffix ? `&${suffix}` : ""}`, null);
  const attemptFor = async state => { const row = await admin.from("gsc_oauth_attempts").select("id,status,staged_secret_reference").eq("state_hash", hashState(state)).single(); assert.ifError(row.error); return row.data; };
  const expire = async state => { const a = await attemptFor(state); assert.ifError((await admin.rpc("gsc_expire_oauth_attempt", { p_attempt_id: a.id })).error); return a.id; };
  const pendingVaultCount = async () => { const r = await admin.from("vault.secrets").select("id", { count: "exact", head: true }).like("name", "v1-04-google-search-console-pending-%"); assert.ifError(r.error); return r.count || 0; };
  const vaultBaseline = await pendingVaultCount();

  t.after(async () => { setGoogleSearchConsoleTransportFactory(undefined); setVaultAdapterForTests(undefined); await server.close(); await admin.auth.admin.deleteUser(userId); assert.equal(await pendingVaultCount(), vaultBaseline); });

  const callbackCases = [
    ["P2-OAUTH-001", "missing state", "/api/product/organic-evidence/search-console/callback", 400, false],
    ["P2-OAUTH-002", "malformed state", "/api/product/organic-evidence/search-console/callback?state=", 400, false],
    ["P2-OAUTH-003", "repeated state parameter", "/api/product/organic-evidence/search-console/callback?state=a&state=b&code=x", 400, false],
    ["P2-OAUTH-004", "unknown state", "/api/product/organic-evidence/search-console/callback?state=unknown&code=x", 400, false],
    ["P2-OAUTH-010", "missing code and provider error", "/api/product/organic-evidence/search-console/callback?state=unknown", 400, false],
    ["P2-OAUTH-011", "unexpected callback parameter", "/api/product/organic-evidence/search-console/callback?state=unknown&code=x&unexpected=x", 400, false]
  ];
  for (const [id, title, path, expected, shouldExchange] of callbackCases) await t.test(`${id} ${title}`, async () => { const before = exchanges; const r = await request(server, "GET", path, null); assert.equal(r.status, expected); assert.equal(exchanges, before + (shouldExchange ? 1 : 0)); safeText(r); });

  const terminalCallback = async (id, suffix, expected, modeName = "success") => { mode = modeName; const s = await start(); const before = exchanges; const r = await callback(s.state, suffix); assert.equal(r.status, 409, `${id}: ${r.text}`); assert.equal(r.body?.error?.code, expected); assert.equal(exchanges, before + (modeName === "success" && suffix.includes("code=") ? 1 : modeName === "success" ? 0 : 1)); const a = await attemptFor(s.state); assert.equal(a.status, "failed"); assert.equal(a.staged_secret_reference, null); safeText(r); assert.equal((await callback(s.state)).status, 400); };
  await t.test("P2-OAUTH-005 expired pending state", async () => { const s = await start(); await expire(s.state); const r = await callback(s.state); assert.equal(r.status, 400); safeText(r); });
  await t.test("P2-OAUTH-006 consumed state replay", async () => { mode = "success"; const s = await start(); assert.equal((await callback(s.state)).status, 200); assert.equal((await callback(s.state)).status, 400); });
  await t.test("P2-OAUTH-007 failed state replay", async () => terminalCallback("P2-OAUTH-007", "error=access_denied", "GSC_AUTH_DENIED"));
  await t.test("P2-OAUTH-008 superseded state replay", async () => { const old = await start(); const newer = await start(); assert.notEqual((await callback(old.state)).status, 200); assert.equal((await callback(newer.state, "error=access_denied")).status, 409); });
  await t.test("P2-OAUTH-009 expired state replay", async () => { const s = await start(); await expire(s.state); assert.equal((await callback(s.state)).status, 400); assert.equal((await callback(s.state)).status, 400); });
  await t.test("P2-OAUTH-012 provider denial", async () => terminalCallback("P2-OAUTH-012", "error=access_denied&error_description=synthetic", "GSC_AUTH_DENIED"));
  await t.test("P2-OAUTH-013 code and error deterministically denies without exchange", async () => { const s = await start(); const before = exchanges; const r = await callback(s.state, "code=x&error=access_denied"); assert.equal(r.body.error.code, "GSC_AUTH_DENIED"); assert.equal(exchanges, before); });

  const tokenCases = [
    ["P2-TOKEN-001", "generic", "GSC_TOKEN_EXCHANGE_FAILED"], ["P2-TOKEN-002", "timeout", "GSC_TOKEN_EXCHANGE_FAILED"], ["P2-TOKEN-003", "malformed", "GSC_TOKEN_EXCHANGE_FAILED"], ["P2-TOKEN-004", "empty-body", "GSC_TOKEN_EXCHANGE_FAILED"], ["P2-TOKEN-005", "oversize", "GSC_TOKEN_EXCHANGE_FAILED"], ["P2-TOKEN-006", "invalid-grant", "GSC_REAUTH_REQUIRED"], ["P2-TOKEN-007", "missing", "GSC_REFRESH_TOKEN_REQUIRED"], ["P2-TOKEN-008", "empty-refresh", "GSC_REFRESH_TOKEN_REQUIRED"], ["P2-TOKEN-009", "missing-scope", "GSC_SCOPE_INVALID"], ["P2-TOKEN-010", "openid", "GSC_SCOPE_INVALID"], ["P2-TOKEN-011", "malformed-scope", "GSC_SCOPE_INVALID"]
  ];
  for (const [id, modeName, expected] of tokenCases) await t.test(`${id} ${modeName} token response`, async () => { mode = modeName; const s = await start(); const r = await callback(s.state); assert.equal(r.status, 409); assert.equal(r.body.error.code, expected); const a = await attemptFor(s.state); assert.equal(a.status, "failed"); assert.equal(a.staged_secret_reference, null); safeText(r); });
  for (const [label, scope] of [["exact", GSC_SCOPE], ["whitespace", ` ${GSC_SCOPE} `]]) await t.test(`P2-SCOPE-${label} exact approved scope`, async () => { mode = label; const tr = transport(); const result = await tr.exchangeCode("synthetic-code", "synthetic-verifier"); assert.equal(result.scope.trim(), GSC_SCOPE); });
  for (const label of ["openid", "email", "write"]) await t.test(`P2-SCOPE-${label} broader scope rejected`, async () => { mode = label; await assert.rejects(() => transport().exchangeCode("synthetic-code", "synthetic-verifier"), e => e.code === "GSC_SCOPE_INVALID"); });

  for (const [id, title] of [["P2-VAULT-001", "create fails before reference"], ["P2-VAULT-002", "staging RPC fails after create"], ["P2-VAULT-003", "superseded before staging"], ["P2-VAULT-004", "expires before staging"], ["P2-VAULT-005", "failed before staging"]]) await t.test(`${id} ${title}`, async () => {
    setVaultAdapterForTests(undefined); mode = "exact"; const before = await pendingVaultCount(); const s = await start();
    if (id === "P2-VAULT-001") setVaultAdapterForTests({ create: async () => { throw new Error("synthetic vault create failure"); }, remove: async () => ({ deleted: true }) });
    else if (id === "P2-VAULT-002") setVaultAdapterForTests({ create: async (adminClient, value, name) => { const made = await createVaultSecretProduction(adminClient, value, name); await adminClient.rpc("gsc_expire_oauth_attempt", { p_attempt_id: (await attemptFor(s.state)).id }); return made; }, remove: deleteVaultSecretProduction });
    else if (id === "P2-VAULT-003") setVaultAdapterForTests({ create: async (adminClient, value, name) => { const made = await createVaultSecretProduction(adminClient, value, name); await adminClient.rpc("gsc_begin_oauth_attempt", { p_account_id: accountRow.data.id, p_business_id: business.data.id, p_state_hash: crypto.randomUUID(), p_pkce_verifier: crypto.randomUUID(), p_expires_at: new Date(Date.now() + 60000).toISOString() }); return made; }, remove: deleteVaultSecretProduction });
    else if (id === "P2-VAULT-004") setVaultAdapterForTests({ create: async (adminClient, value, name) => { const made = await createVaultSecretProduction(adminClient, value, name); await adminClient.rpc("gsc_expire_oauth_attempt", { p_attempt_id: (await attemptFor(s.state)).id }); return made; }, remove: deleteVaultSecretProduction });
    else setVaultAdapterForTests({ create: async (adminClient, value, name) => { const made = await createVaultSecretProduction(adminClient, value, name); await adminClient.rpc("gsc_fail_oauth_attempt", { p_attempt_id: (await attemptFor(s.state)).id, p_code: "GSC_CONNECTION_FAILED" }); return made; }, remove: deleteVaultSecretProduction });
    const r = await callback(s.state); assert.ok(r.status >= 400); safeText(r); const a = await attemptFor(s.state); assert.equal(a.staged_secret_reference, null); assert.equal(await pendingVaultCount(), before); setVaultAdapterForTests(undefined);
  });

  const providerCases = [["P2-PROVIDER-001", "provider-list-failure", "properties", 502], ["P2-PROVIDER-002", "provider-list-malformed", "properties", 502], ["P2-PROVIDER-003", "provider-probe-failure", "select", 409], ["P2-PROVIDER-004", "provider-probe-malformed", "select", 409], ["P2-PROVIDER-005", "provider-probe-unusable", "select", 409], ["P2-PROVIDER-006", "provider-probe-different", "select", 409]];
  for (const [id, providerMode, endpoint, expected] of providerCases) await t.test(`${id} ${providerMode} route failure`, async () => { mode = "exact"; const s = await start(); assert.equal((await callback(s.state)).status, 200); mode = providerMode; const path = endpoint === "properties" ? `/api/product/organic-evidence/search-console/properties?connection_id=${s.connectionId}` : "/api/product/organic-evidence/search-console/select"; const r = await request(server, endpoint === "properties" ? "GET" : "POST", path, token, endpoint === "select" ? { connection_id: s.connectionId, site_url: "https://example.com/shop/" } : undefined); assert.equal(r.status, expected); safeText(r); await expire(s.state); const gsc = await admin.from("gsc_connections").select("selected_site_url").eq("connection_id", s.connectionId).single(); assert.ifError(gsc.error); assert.equal(gsc.data.selected_site_url, null); });
  await t.test("P2-PROVIDER-positive exact synthetic property probe", async () => { mode = "exact"; const s = await start(); assert.equal((await callback(s.state)).status, 200); const r = await request(server, "POST", "/api/product/organic-evidence/search-console/select", token, { connection_id: s.connectionId, site_url: "https://example.com/shop/" }); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(requestedProbe, "https://example.com/shop/"); });
  assert.equal(wooId.length > 0, true);
});
