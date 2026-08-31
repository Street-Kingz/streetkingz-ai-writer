import express from "express";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { productKernelConfig } from "../config/productKernel.js";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { privilegedClient } from "../product-kernel/privileged.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { loadWooStoreContext } from "../product-kernel/woocommerceRouteService.js";
import { collectReference, compareReference } from "../internal/v1-03-harness/referenceReconciliation.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const localOnly = (req, res, next) => LOCAL_HOSTS.has(req.hostname) ? next() : res.status(404).end();
const handle = fn => (req, res) => Promise.resolve(fn(req, res)).catch(error => { const safe = safeError(error, req.correlationId); res.status(safe.status).json(safe.body); });
function envIsLocal(url) { try { const hostname = new URL(url).hostname; return LOCAL_HOSTS.has(hostname); } catch { return false; } }
function isExactAcceptanceStoreUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.toLowerCase() === "streetkingz.co.uk" && (url.port === "" || url.port === "443") && url.pathname === "/" && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}
function config() { return productKernelConfig(process.env, { privileged: true }); }
async function context(req) { const token = parseBearer(req.get("authorization")); const identity = await verifyIdentity(token); const client = callerClient(token); const account = await resolveAccount(client, identity.authUserId); if (!account || account.status !== "active") throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404); return { token, identity, client, account }; }
async function ownedConnection(ctx, id) { if (typeof id !== "string" || !UUID.test(id)) throw new ProductError("INVALID_REQUEST", "Connection ID is invalid.", 400); const business = await ctx.client.from("businesses").select("id").eq("account_id", ctx.account.id).maybeSingle(); if (business.error) throw business.error; if (!business.data) throw new ProductError("BUSINESS_NOT_PROVISIONED", "Business is not provisioned.", 404); const row = await ctx.client.from("connections").select("id,business_id,provider_type,status,consent_state").eq("id", id).eq("business_id", business.data.id).maybeSingle(); if (row.error) throw row.error; if (!row.data || row.data.provider_type !== "woocommerce") throw new ProductError("CONNECTION_NOT_FOUND", "WooCommerce connection not found.", 404); return row.data; }
async function findAcceptanceTenant(admin) {
  const businesses = await admin.from("businesses").select("id,account_id").eq("name", "Street Kingz V1-03 Acceptance").eq("ecommerce_platform", "woocommerce");
  if (businesses.error) throw businesses.error;
  const candidates = [];
  for (const business of businesses.data || []) {
    const account = await admin.from("accounts").select("id,auth_user_id,status").eq("id", business.account_id).eq("status", "active").maybeSingle();
    if (account.error) throw account.error;
    if (!account.data) continue;
    const connections = await admin.from("connections").select("id,business_id,provider_type,status,consent_state").eq("business_id", business.id).eq("provider_type", "woocommerce");
    if (connections.error) throw connections.error;
    const stores = connections.data?.length === 1 ? await admin.from("commerce_stores").select("id,connection_id,current_generation,canonical_base_url").eq("business_id", business.id).eq("connection_id", connections.data[0].id).eq("provider", "woocommerce") : { data: [], error: null };
    if (stores.error) throw stores.error;
    const store = stores.data?.length === 1 ? stores.data[0] : null;
    const generation = store?.current_generation && isExactAcceptanceStoreUrl(store.canonical_base_url) ? await admin.from("commerce_sync_generations").select("id,state").eq("id", store.current_generation).eq("store_id", store.id).maybeSingle() : { data: null, error: null };
    if (generation.error) throw generation.error;
    if (connections.data?.length !== 1 || connections.data[0].status !== "connected" || connections.data[0].consent_state !== "granted" || !store || !isExactAcceptanceStoreUrl(store.canonical_base_url) || !generation.data || generation.data.state !== "complete") continue;
    candidates.push({ account: account.data, business, connections: connections.data, stores: stores.data, generation: generation.data });
  }
  if (candidates.length === 0) throw new ProductError("ACCEPTANCE_SESSION_NOT_FOUND", "The existing Street Kingz V1-03 acceptance session was not found.", 404);
  if (candidates.length > 1) throw new ProductError("ACCEPTANCE_SESSION_AMBIGUOUS", "More than one Street Kingz V1-03 acceptance session matches.", 409);
  const candidate = candidates[0];
  return { ...candidate, connection: candidate.connections[0], store: candidate.stores[0] };
}
export async function readCurrentProductSnapshot({ admin, client, accountId, connectionId }) {
  const business = await client.from("businesses").select("id").eq("account_id", accountId).maybeSingle(); if (business.error) throw business.error; if (!business.data) throw new ProductError("BUSINESS_NOT_PROVISIONED", "Business is not provisioned.", 404);
  const connection = await client.from("connections").select("id,business_id,provider_type,status,consent_state").eq("id", connectionId).eq("business_id", business.data.id).maybeSingle(); if (connection.error) throw connection.error; if (!connection.data || connection.data.provider_type !== "woocommerce") throw new ProductError("CONNECTION_NOT_FOUND", "Connection not found.", 404);
  const storeResult = await admin.from("commerce_stores").select("id,business_id,connection_id,sync_state,current_generation").eq("connection_id", connectionId).maybeSingle();
  const store = storeResult.data; if (storeResult.error) throw storeResult.error;
  if (!store || store.business_id !== connection.data.business_id || store.connection_id !== connection.data.id) throw new ProductError("STORE_NOT_FOUND", "WooCommerce Store is not established.", 404);
  const generation = store.current_generation ? (await admin.from("commerce_sync_generations").select("id,state").eq("id", store.current_generation).eq("store_id", store.id).maybeSingle()).data : null;
  if (!generation) return { connection: { state: connection.data.status, consent: connection.data.consent_state }, store: { sync_state: store.sync_state }, generation: null, counts: {}, rows: [] };
  const counts = {}; for (const table of ["commerce_products", "commerce_variations", "commerce_categories", "commerce_orders"]) { const q = await admin.from(table).select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("generation_id", generation.id); if (q.error) throw q.error; counts[table.replace("commerce_", "")] = q.count || 0; }
  const orderIdsResult = await admin.from("commerce_orders").select("id").eq("store_id", store.id).eq("generation_id", generation.id); if (orderIdsResult.error) throw orderIdsResult.error; const orderIds = (orderIdsResult.data || []).map(row => row.id);
  for (const [table, key] of [["commerce_order_lines", "lines"], ["commerce_order_adjustments", "adjustments"]]) { if (!orderIds.length) { counts[key] = 0; continue; } const q = await admin.from(table).select("id", { count: "exact", head: true }).in("order_id", orderIds); if (q.error) throw q.error; counts[key] = q.count || 0; }
  const rows = await admin.from("commerce_product_net_sales_by_generation").select("product_source_id,variation_source_id,product_net_sales_ex_tax,product_tax").eq("store_id", store.id).eq("generation_id", generation.id); if (rows.error) throw rows.error;
  return { connection: { state: connection.data.status, consent: connection.data.consent_state }, store: { sync_state: store.sync_state }, generation: { id: generation.id, state: generation.state }, counts, rows: rows.data || [] };
}
export function createV103AcceptanceHarnessRouter(overrides = {}) {
  const deps = { config, adminFactory: c => createClient(c.url, c.privilegedKey, { auth: { autoRefreshToken: false, persistSession: false } }), clientFactory: (c, token) => createClient(c.url, c.publishableKey, { global: { headers: { authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }), ...overrides };
  const router = express.Router(); router.use(localOnly); router.use(express.json({ limit: "32kb" }));
  router.get("/internal/v1-03", (_req, res) => res.sendFile("index.html", { root: "internal/v1-03-harness" }));
  router.get("/internal/v1-03/harness.js", (_req, res) => res.sendFile("harness.js", { root: "internal/v1-03-harness" }));
  router.get("/internal/v1-03/styles.css", (_req, res) => res.sendFile("styles.css", { root: "internal/v1-03-harness" }));
  router.post("/internal/v1-03/bootstrap", handle(async (_req, res) => { const c = deps.config(); if (!envIsLocal(c.url)) throw new ProductError("LOCAL_SUPABASE_REQUIRED", "The acceptance harness only permits loopback Supabase.", 403); const email = `v103-acceptance-${randomUUID()}@local.test`; const password = `${randomUUID()}!Aa9`; const admin = deps.adminFactory(c); const created = await admin.auth.admin.createUser({ email, password, email_confirm: true }); if (created.error) throw created.error; const userId = created.data.user.id; const client = deps.clientFactory(c); const signed = await client.auth.signInWithPassword({ email, password }); if (signed.error || !signed.data.session) { await admin.auth.admin.deleteUser(userId); throw signed.error || new ProductError("BOOTSTRAP_FAILED", "Local test session could not be started.", 503); } res.json({ access_token: signed.data.session.access_token, expires_at: signed.data.session.expires_at || null, expires_in: signed.data.session.expires_in || null }); }));
  router.post("/internal/v1-03/resume", handle(async (_req, res) => { const c = deps.config(); if (!envIsLocal(c.url)) throw new ProductError("LOCAL_SUPABASE_REQUIRED", "The acceptance harness only permits loopback Supabase.", 403); const admin = deps.adminFactory(c); const tenant = await findAcceptanceTenant(admin); const user = await admin.auth.admin.getUserById(tenant.account.auth_user_id); if (user.error || !user.data?.user?.email) throw new ProductError("ACCEPTANCE_SESSION_NOT_FOUND", "The existing Street Kingz V1-03 acceptance user was not found.", 404); const password = `${randomUUID()}!Aa9`; const updated = await admin.auth.admin.updateUserById(tenant.account.auth_user_id, { password, email_confirm: true }); if (updated.error) throw updated.error; const client = deps.clientFactory(c); const signed = await client.auth.signInWithPassword({ email: user.data.user.email, password }); if (signed.error || !signed.data.session) throw signed.error || new ProductError("RESUME_FAILED", "The existing local acceptance session could not be resumed.", 503); res.json({ access_token: signed.data.session.access_token, expires_at: signed.data.session.expires_at || null, expires_in: signed.data.session.expires_in || null }); }));
  router.post("/internal/v1-03/snapshot", handle(async (req, res) => { const ctx = await context(req); const connection = await ownedConnection(ctx, req.body?.connection_id); res.json(await readCurrentProductSnapshot({ admin: privilegedClient(), client: ctx.client, accountId: ctx.account.id, connectionId: connection.id })); }));
  router.get("/internal/v1-03/product-snapshot", handle(async (req, res) => { const ctx = await context(req); const connection = await ownedConnection(ctx, req.query?.connection_id); res.json(await readCurrentProductSnapshot({ admin: privilegedClient(), client: ctx.client, accountId: ctx.account.id, connectionId: connection.id })); }));
  router.post("/internal/v1-03/reconcile", handle(async (req, res) => { const ctx = await context(req); const connection = await ownedConnection(ctx, req.body?.connection_id); const admin = privilegedClient(); const expected = await collectReference({ admin, connectionId: connection.id, orderWindow: req.body?.order_window }); const product = await readCurrentProductSnapshot({ admin, client: ctx.client, accountId: ctx.account.id, connectionId: connection.id }); const sourceAfter = await collectReference({ admin, connectionId: connection.id, orderWindow: req.body?.order_window }); if (sourceAfter.source_signature !== expected.source_signature) throw new ProductError("SOURCE_CHANGED_DURING_ACCEPTANCE", "WooCommerce source evidence changed during reconciliation. Run another Product sync and reconciliation.", 409); const comparison = compareReference(expected, product); const countPairs = [["Products", expected.source.products, product.counts.products || 0], ["Variations", expected.source.variations, product.counts.variations || 0], ["Categories", expected.source.categories, product.counts.categories || 0], ["Orders in exact window", expected.source.orders, product.counts.orders || 0]]; const countResults = countPairs.map(([label, source, current]) => ({ label, source, product: current, result: source === current ? "PASS" : "FAIL" })); const overall = comparison.overall === "PASS" && countResults.every(row => row.result === "PASS") ? "PASS" : "FAIL"; res.json({ counts: countResults, source: expected.source, product: product.counts, order_window: expected.window, commercial: comparison.rows, overall }); }));
  router.post("/internal/v1-03/cleanup", handle(async (req, res) => { const c = config(); if (!envIsLocal(c.url)) throw new ProductError("LOCAL_SUPABASE_REQUIRED", "The acceptance harness only permits loopback Supabase.", 403); const identity = await verifyIdentity(parseBearer(req.get("authorization"))); const admin = privilegedClient(); const existing = await admin.auth.admin.getUserById(identity.authUserId); if (existing.error && existing.error.status !== 404) throw existing.error; if (existing.data?.user) { const deleted = await admin.auth.admin.deleteUser(identity.authUserId); if (deleted.error && deleted.error.status !== 404) throw deleted.error; } res.status(204).end(); }));
  return router;
}
const enabled = process.env.V1_03_ACCEPTANCE_HARNESS === "1";
export default enabled ? createV103AcceptanceHarnessRouter() : null;
