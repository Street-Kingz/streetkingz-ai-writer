import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import app from "../app.js";
import { setSiteEvidenceTransportFactory } from "../product-kernel/siteEvidence.js";

const enabled = process.env.V1_04_SLICE_C_INTEGRATION === "1";
const required = name => process.env[name] || (() => { throw new Error(`${name} required`); })();
const listen = target => new Promise((resolve, reject) => { const server = target.listen(0, "127.0.0.1", () => resolve(server)); server.once("error", reject); });
const request = (server, token) => new Promise((resolve, reject) => { const req = http.request({ hostname: "127.0.0.1", port: server.address().port, path: "/api/product/organic-evidence/site/acquire", method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" } }, res => { let body = ""; res.on("data", chunk => body += chunk); res.on("end", () => resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null })); }); req.on("error", reject); req.end("{}"); });

async function tenant(admin, publishable, name) {
  const email = `${name}-${crypto.randomUUID()}@local.test`; const password = `${crypto.randomUUID()}!Aa9`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true }); assert.ifError(created.error);
  const login = createClient(required("SUPABASE_URL"), publishable, { auth: { autoRefreshToken: false, persistSession: false } }); const signed = await login.auth.signInWithPassword({ email, password }); assert.ifError(signed.error);
  const token = signed.data.session.access_token; const caller = createClient(required("SUPABASE_URL"), publishable, { global: { headers: { authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } });
  assert.ifError((await caller.rpc("product_create_account", { p_correlation_id: crypto.randomUUID() })).error);
  const business = await caller.rpc("product_create_business", { p_name: name, p_platform: "woocommerce", p_correlation_id: crypto.randomUUID() }); assert.ifError(business.error);
  const connection = await caller.rpc("product_create_connection", { p_provider_type: "woocommerce", p_correlation_id: crypto.randomUUID() }); assert.ifError(connection.error);
  const account = await admin.from("accounts").select("id").eq("auth_user_id", created.data.user.id).single(); assert.ifError(account.error);
  const attemptToken = `slice-c-woo-${crypto.randomUUID()}`; const attempt = await admin.rpc("woo_create_auth_attempt", { p_user_id: attemptToken, p_account_id: account.data.id, p_business_id: business.data.id, p_connection_id: connection.data.id, p_canonical_base_url: `https://${name}.example/`, p_expires_at: new Date(Date.now() + 60000).toISOString() }); assert.ifError(attempt.error);
  assert.ifError((await admin.rpc("woo_claim_auth_attempt", { p_user_id: attemptToken })).error); assert.ifError((await admin.rpc("woo_capture_callback", { p_attempt_id: attempt.data, p_consumer_key: "synthetic-key", p_consumer_secret: "synthetic-secret", p_key_permissions: "read" })).error);
  const storeId = await admin.rpc("woo_complete_connection", { p_attempt_id: attempt.data, p_home_url: `https://${name}.example/`, p_site_url: `https://${name}.example/`, p_version: "synthetic", p_timezone: "UTC", p_currency: "GBP", p_correlation_id: crypto.randomUUID() }); assert.ifError(storeId.error);
  const store = { data: { id: storeId.data } };
  assert.ifError((await admin.from("commerce_stores").select("id").eq("id", store.data.id).single()).error);
  const generation = await admin.from("commerce_sync_generations").insert({ store_id: store.data.id, state: "complete", snapshot_kind: "complete", completed_at: new Date().toISOString() }).select("id").single(); assert.ifError(generation.error);
  assert.ifError((await admin.rpc("commerce_promote_generation", { p_store_id: store.data.id, p_generation_id: generation.data.id })).error);
  const product = await admin.from("commerce_products").insert({ business_id: business.data.id, store_id: store.data.id, generation_id: generation.data.id, source_id: 1, name: "Synthetic Product", slug: "product", canonical_url: `https://${name}.example/product/` }).select("id,source_id,canonical_url").single(); assert.ifError(product.error);
  return { userId: created.data.user.id, token, caller, business: business.data, store: store.data, product: product.data };
}

test("Slice C lifecycle, current/history inventory and tenant isolation", { skip: !enabled }, async t => {
  const url = required("SUPABASE_URL"), publishable = required("SUPABASE_PUBLISHABLE_KEY"), service = required("SUPABASE_SERVICE_ROLE_KEY"); const admin = createClient(url, service, { auth: { persistSession: false } });
  const a = await tenant(admin, publishable, "slice-c-a"); const b = await tenant(admin, publishable, "slice-c-b"); t.after(async () => { setSiteEvidenceTransportFactory(undefined); await admin.auth.admin.deleteUser(a.userId); await admin.auth.admin.deleteUser(b.userId); });
  let mode = 1; const fixtureTransport = { async fetch(target) { const path = new URL(target).pathname; if (mode === 4) throw Object.assign(new Error("timeout"), { code: "SITE_TIMEOUT" }); if (path === "/robots.txt") return { status: 200, content_type: "text/plain", body: "User-agent: *\nSitemap: https://slice-c-a.example/sitemap.xml", final_url: target, response_size_bytes: 60, retrieved_at: new Date().toISOString(), headers: new Headers() }; if (path === "/sitemap.xml") { if (mode === 3) throw Object.assign(new Error("timeout"), { code: "SITE_TIMEOUT" }); const urls = mode === 1 ? ["https://slice-c-a.example/a", "https://slice-c-a.example/b", "https://slice-c-a.example/c"] : ["https://slice-c-a.example/a", "https://slice-c-a.example/c", "https://slice-c-a.example/d"]; return { status: 200, content_type: "application/xml", body: `<urlset>${urls.map(x => `<url><loc>${x}</loc></url>`).join("")}</urlset>`, final_url: target, response_size_bytes: 300, retrieved_at: new Date().toISOString(), headers: new Headers() }; } return { status: 200, content_type: "text/html", body: `<title>${path}</title><link rel=canonical href="${target}"><h1>${path}</h1>`, final_url: target, response_size_bytes: 100, retrieved_at: new Date().toISOString(), headers: new Headers() }; } };
  setSiteEvidenceTransportFactory(() => fixtureTransport); const server = await listen(app); t.after(() => server.close());
  const first = await request(server, a.token); assert.equal(first.status, 200); assert.equal(first.body.completeness, "complete");
  const source = await admin.from("organic_evidence_sources").select("id,current_complete_run,evidence_as_of").eq("business_id", a.business.id).eq("source_kind", "site").single(); assert.ifError(source.error); const run1 = source.data.current_complete_run;
  const firstUrls = await admin.from("organic_site_discovered_urls").select("normalized_url").eq("run_id", run1); assert.ifError(firstUrls.error); assert.equal(firstUrls.data.some(row => row.normalized_url.endsWith("/b")), true);
  mode = 2; const second = await request(server, a.token); assert.equal(second.status, 200); assert.equal(second.body.completeness, "complete"); const current = await admin.from("organic_evidence_sources").select("current_complete_run,evidence_as_of").eq("id", source.data.id).single(); assert.ifError(current.error); const run2 = current.data.current_complete_run; const secondUrls = await admin.from("organic_site_discovered_urls").select("normalized_url").eq("run_id", run2); assert.equal(secondUrls.data.some(row => row.normalized_url.endsWith("/b")), false); assert.equal((await admin.from("organic_site_discovered_urls").select("id").eq("run_id", run1)).data.length > 0, true);
  mode = 3; const partial = await request(server, a.token); assert.equal(partial.status, 200); assert.equal(partial.body.completeness, "partial"); const afterPartial = await admin.from("organic_evidence_sources").select("current_complete_run,evidence_as_of").eq("id", source.data.id).single(); assert.deepEqual(afterPartial.data, current.data);
  const failed = await request(server, b.token); assert.equal(failed.status, 200); const bSource = await admin.from("organic_evidence_sources").select("id").eq("business_id", b.business.id).eq("source_kind", "site").single(); assert.ifError(bSource.error);
  const aCannotReadB = await a.caller.from("organic_site_discovered_urls").select("id").eq("source_id", bSource.data.id); assert.equal(aCannotReadB.data.length, 0); const bCannotReadA = await b.caller.from("organic_site_inspected_pages").select("id").eq("source_id", source.data.id); assert.equal(bCannotReadA.data.length, 0);
  const direct = await a.caller.from("organic_site_discovered_urls").insert({ business_id: a.business.id, source_id: source.data.id, run_id: run2, normalized_url: "https://slice-c-a.example/direct", comparison_url: "https://slice-c-a.example/direct", discovery_source: "link_frontier", discovered_at: new Date().toISOString(), last_discovered_at: new Date().toISOString() }); assert.ok(direct.error);
  assert.equal((await admin.from("organic_evidence_sources").select("current_complete_run").eq("id", source.data.id).single()).data.current_complete_run, run2);
});
