import express from "express";
import bodyParser from "body-parser";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { privilegedClient } from "../product-kernel/privileged.js";
import { correlationMiddleware } from "../product-kernel/correlation.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { createWooAuthUrl, newAttemptToken } from "../product-kernel/woocommerceAuth.js";
import { captureWooCallback } from "../product-kernel/woocommerceCallback.js";
import { assertEstablishedWooConnection, establishedWooStatus, verifyWooConnection, loadWooStoreContext, assertWooSyncActive } from "../product-kernel/woocommerceRouteService.js";
import { collectInitialCommerce } from "../product-kernel/woocommerceCommerce.js";
import { wooCollectionRequest, wooRequest } from "../product-kernel/woocommerceEgress.js";
import { wooCommerceRouteConfig } from "../config/productKernel.js";
import { validateWooOriginWithDeadline } from "../product-kernel/woocommerceEgress.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USER_ID = /^[A-Za-z0-9_-]{20,128}$/;
const CALLBACK_KEYS = new Set(["key_id", "user_id", "consumer_key", "consumer_secret", "key_permissions"]);
const CALLBACK_PARSER = bodyParser.json({ limit: "8kb", strict: true, type: "application/json" });
const REQUEST_PARSER = bodyParser.json({ limit: "32kb", strict: true, type: "application/json" });

function makeAuthContext(deps) { return async function authContext() {
  const token = parseBearer(this.get("authorization"));
  const identity = await deps.verifyIdentity(token);
  const client = deps.callerClient(token);
  const account = await resolveAccount(client, identity.authUserId);
  if (!account) throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  if (account.status !== "active") throw new ProductError("ACCOUNT_NOT_ACTIVE", "Product account is not active.", 409);
  return { identity, client, account };
}; }

async function ownedWooConnection(client, accountId, connectionId) {
  if (typeof connectionId !== "string" || !UUID.test(connectionId)) throw new ProductError("INVALID_REQUEST", "Connection ID is invalid.", 400);
  const business = await client.from("businesses").select("id").eq("account_id", accountId).maybeSingle();
  if (business.error) throw business.error;
  if (!business.data) throw new ProductError("BUSINESS_NOT_PROVISIONED", "Business is not provisioned.", 404);
  const connection = await client.from("connections").select("id,business_id,provider_type,status,consent_state").eq("id", connectionId).eq("business_id", business.data.id).maybeSingle();
  if (connection.error) throw connection.error;
  if (!connection.data) throw new ProductError("CONNECTION_NOT_FOUND", "Connection not found.", 404);
  if (connection.data.provider_type !== "woocommerce") throw new ProductError("INVALID_PROVIDER_TYPE", "This connection is not a WooCommerce connection.", 400);
  return connection.data;
}

function safeCallbackBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ProductError("INVALID_REQUEST", "Callback payload is invalid.", 400);
  if (Object.keys(body).some(key => !CALLBACK_KEYS.has(key))) throw new ProductError("INVALID_REQUEST", "Callback payload is invalid.", 400);
  if (body.key_id !== undefined && (!(Number.isSafeInteger(body.key_id) && body.key_id > 0) && !(typeof body.key_id === "string" && /^[1-9][0-9]{0,15}$/.test(body.key_id)))) throw new ProductError("INVALID_REQUEST", "Callback payload is invalid.", 400);
  for (const [key, max] of [["user_id", 128], ["consumer_key", 512], ["consumer_secret", 512], ["key_permissions", 16]]) if (body[key] !== undefined && (typeof body[key] !== "string" || !body[key] || body[key].length > max)) throw new ProductError("INVALID_REQUEST", "Callback payload is invalid.", 400);
  for (const key of ["user_id", "consumer_key", "consumer_secret", "key_permissions"]) if (typeof body[key] !== "string" || !body[key]) throw new ProductError("INVALID_REQUEST", "Callback payload is incomplete.", 400);
  if (!USER_ID.test(body.user_id)) throw new ProductError("INVALID_REQUEST", "Callback payload is invalid.", 400);
  if (body.key_permissions !== "read") throw new ProductError("WOO_PERMISSION_INVALID", "WooCommerce read permission is required.", 400);
  return { userId: body.user_id, consumerKey: body.consumer_key, consumerSecret: body.consumer_secret, keyPermissions: body.key_permissions };
}

function statusFromError(error) { return ["PROVIDER_TIMEOUT", "PROVIDER_RATE_LIMITED", "PROVIDER_UNAVAILABLE", "PROVIDER_MALFORMED_RESPONSE", "PROVIDER_RESPONSE_TOO_LARGE", "PROVIDER_REDIRECT_LIMIT"].includes(error?.code) ? "processing" : error?.code === "WOO_VERIFICATION_NOT_READY" ? "processing" : "failed"; }
function handle(next) { return (req, res) => Promise.resolve(next(req, res)).catch(error => { const safe = safeError(error, req.correlationId); res.status(safe.status).json(safe.body); }); }

export function createWooCommerceRouter(overrides = {}) {
 const deps = { verifyIdentity, callerClient, privilegedClient, wooCommerceRouteConfig, validateWooOriginWithDeadline, createWooAuthUrl, newAttemptToken, captureWooCallback, verifyWooConnection, assertEstablishedWooConnection, establishedWooStatus, loadWooStoreContext, assertWooSyncActive, collectInitialCommerce, wooCollectionRequest, wooRequest, initialSyncPerPage: Math.min(100, Math.max(1, Number(process.env.WOO_SYNC_PAGE_SIZE || 100))), ...overrides };
 const router = express.Router();
 const authContext = makeAuthContext(deps);
 router.use(correlationMiddleware);
 router.use((req, res, next) => { res.set("Cache-Control", "no-store"); if (req.path.endsWith("/woocommerce/return")) res.set("Referrer-Policy", "no-referrer"); next(); });
 router.post("/api/product/woocommerce/authorize", REQUEST_PARSER, handle(async function (req, res) {
  const context = await authContext.call(req);
  const connection = await ownedWooConnection(context.client, context.account.id, req.body?.connection_id);
  const storeUrl = typeof req.body?.store_url === "string" ? req.body.store_url : "";
  const routeConfig = deps.wooCommerceRouteConfig();
  const checked = await deps.validateWooOriginWithDeadline(storeUrl);
  const userId = deps.newAttemptToken();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);
  const admin = deps.privilegedClient();
  const attemptId = await admin.rpc("woo_create_auth_attempt", { p_user_id: userId, p_account_id: context.account.id, p_business_id: connection.business_id, p_connection_id: connection.id, p_canonical_base_url: checked.url.toString(), p_expires_at: expiry.toISOString() });
  if (attemptId.error) throw new ProductError("AUTH_ATTEMPT_INVALID", "WooCommerce authorisation could not be started.", 400);
  const authUrl = deps.createWooAuthUrl({ origin: checked.url.toString(), appName: routeConfig.appName, returnUrl: `${routeConfig.productOrigin}/api/product/woocommerce/return`, callbackUrl: `${routeConfig.productOrigin}/api/product/woocommerce/callback`, productOrigin: routeConfig.productOrigin, userId });
  void attemptId;
  res.status(201).json({ authorization_url: authUrl });
}));

 router.post("/api/product/woocommerce/callback", CALLBACK_PARSER, handle(async (req, res) => {
  const callback = safeCallbackBody(req.body);
  const result = await deps.captureWooCallback(deps.privilegedClient(), callback);
  res.status(200).end();
 }));
 router.use((error, req, res, next) => { if (!req.path.endsWith("/woocommerce/callback")) return next(error); const mapping = { "entity.parse.failed": [400, "INVALID_REQUEST", "Malformed JSON request."], "entity.too.large": [413, "PAYLOAD_TOO_LARGE", "Request body is too large."], "encoding.unsupported": [415, "UNSUPPORTED_ENCODING", "Request encoding is not supported."], "charset.unsupported": [415, "UNSUPPORTED_ENCODING", "Request encoding is not supported."] }; const [status, code, message] = mapping[error?.type] || [400, "INVALID_REQUEST", "Invalid request body."]; res.status(status).json({ error: { code, message, correlation_id: req.correlationId } }); });

 router.get("/api/product/woocommerce/return", handle(async (req, res) => {
  const success = req.query.success;
  const userId = req.query.user_id;
  if (success !== "0" && success !== "1") throw new ProductError("INVALID_REQUEST", "Return status is invalid.", 400);
  if (typeof userId !== "string" || !USER_ID.test(userId)) throw new ProductError("INVALID_REQUEST", "Return token is invalid.", 400);
  const admin = deps.privilegedClient();
  if (success === "0") { const denied = await admin.rpc("woo_deny_auth_attempt", { p_user_id: userId, p_correlation_id: req.correlationId }); if (denied.error) return res.json({ status: "failed" }); if (denied.data) return res.json({ status: "denied" }); const existing = await admin.from("woocommerce_auth_attempts").select("status,connection_id").eq("user_id", userId).maybeSingle(); const state = existing.data?.status; if (state === "consumed") return res.json({ status: await deps.establishedWooStatus(admin, existing.data.connection_id) }); return res.json({ status: ["failed", "expired", "superseded"].includes(state) ? "failed" : state === "denied" ? "denied" : "processing" }); }
  try { const row = await admin.from("woocommerce_auth_attempts").select("id,status,connection_id").eq("user_id", userId).maybeSingle(); if (row.error || !row.data) return res.json({ status: "processing" }); if (row.data.status === "consumed") return res.json({ status: await deps.establishedWooStatus(admin, row.data.connection_id) }); if (row.data.status !== "callback_received") return res.json({ status: ["failed", "expired", "superseded"].includes(row.data.status) ? "failed" : row.data.status === "denied" ? "denied" : "processing" }); await deps.verifyWooConnection(admin, { attemptId: row.data.id, correlationId: req.correlationId }); return res.json({ status: "connected" }); } catch (error) { return res.json({ status: error.code === "WOO_CONNECTION_DISCONNECTED" ? "disconnected" : statusFromError(error) }); }
}));

 router.post("/api/product/woocommerce/verify", REQUEST_PARSER, handle(async function (req, res) {
  const context = await authContext.call(req);
  const connection = await ownedWooConnection(context.client, context.account.id, req.body?.connection_id);
  if (connection.status === "connected") { await deps.assertEstablishedWooConnection(deps.privilegedClient(), connection.id); return res.json({ status: "connected" }); }
  try { await deps.verifyWooConnection(deps.privilegedClient(), { connectionId: connection.id, correlationId: req.correlationId }); return res.json({ status: "connected" }); } catch (error) { if (error.code === "WOO_VERIFICATION_NOT_READY" || ["PROVIDER_TIMEOUT", "PROVIDER_RATE_LIMITED", "PROVIDER_UNAVAILABLE", "PROVIDER_MALFORMED_RESPONSE", "PROVIDER_RESPONSE_TOO_LARGE", "PROVIDER_REDIRECT_LIMIT"].includes(error.code)) return res.json({ status: "processing" }); throw error; }
 }));

 router.post("/api/product/woocommerce/sync", REQUEST_PARSER, handle(async function (req, res) {
  const context = await authContext.call(req);
  const connection = await ownedWooConnection(context.client, context.account.id, req.body?.connection_id);
  const admin = deps.privilegedClient();
  const established = await deps.loadWooStoreContext(admin, connection.id);
  const startedAt = new Date();
  const generation = await admin.rpc("commerce_begin_initial_sync", { p_store_id: established.store.id, p_correlation_id: req.correlationId });
  if (generation.error) { if (generation.error.message?.includes("SYNC_ALREADY_RUNNING")) throw new ProductError("SYNC_ALREADY_RUNNING", "A WooCommerce evidence sync is already running.", 409); throw generation.error; }
  const generationId = generation.data;
  try {
   const provider = { collection: async (path, options) => { await deps.assertWooSyncActive(admin, { connectionId: connection.id, storeId: established.store.id, generationId }); return deps.wooCollectionRequest(established.store.canonical_base_url, `wp-json/wc/v3/${path}`, { ...options, credentials: established.credentials }); }, get: async (path, options) => { await deps.assertWooSyncActive(admin, { connectionId: connection.id, storeId: established.store.id, generationId }); return deps.wooRequest(established.store.canonical_base_url, `wp-json/wc/v3/${path}`, { ...options, credentials: established.credentials }); } };
   const snapshot = await deps.collectInitialCommerce(provider, { syncStartedAt: startedAt, perPage: deps.initialSyncPerPage || 100 });
   const productIds = new Set(snapshot.products.map(row => row.source_id));
   const categoryIds = new Set(snapshot.categories.map(row => row.source_id));
   if ([...snapshot.products, ...snapshot.variations, ...snapshot.categories, ...snapshot.orders].some(row => !Number.isSafeInteger(row.source_id) || row.source_id <= 0) || snapshot.variations.some(row => !Number.isSafeInteger(row.parent_source_id) || row.parent_source_id <= 0 || !productIds.has(row.parent_source_id)) || snapshot.links.some(row => !productIds.has(row.product_source_id) || !categoryIds.has(row.category_source_id))) throw new ProductError("PROVIDER_MALFORMED_RESPONSE", "WooCommerce evidence could not be reconciled.", 502);
   await deps.assertWooSyncActive(admin, { connectionId: connection.id, storeId: established.store.id, generationId });
   const staged = await admin.rpc("commerce_stage_initial_snapshot", { p_store_id: established.store.id, p_generation_id: generationId, p_products: snapshot.products, p_variations: snapshot.variations, p_categories: snapshot.categories, p_links: snapshot.links, p_orders: snapshot.orders, p_lines: snapshot.lines, p_adjustments: snapshot.adjustments });
   if (staged.error) throw staged.error;
   await deps.assertWooSyncActive(admin, { connectionId: connection.id, storeId: established.store.id, generationId });
   const completed = await admin.rpc("commerce_complete_initial_sync", { p_store_id: established.store.id, p_generation_id: generationId });
   if (completed.error) throw completed.error;
   return res.status(201).json({ status: "complete", counts: { products: snapshot.products.length, variations: snapshot.variations.length, categories: snapshot.categories.length, links: snapshot.links.length, orders: snapshot.orders.length, lines: snapshot.lines.length, adjustments: snapshot.adjustments.length }, order_window: { start: snapshot.orderWindowStart, end: snapshot.orderWindowEnd } });
  } catch (error) {
   await admin.rpc("commerce_mark_sync_failed", { p_store_id: established.store.id, p_generation_id: generationId, p_error_code: error instanceof ProductError ? error.code : "SYNC_FAILED", p_partial: true });
   throw error instanceof ProductError ? error : new ProductError("SYNC_FAILED", "WooCommerce evidence sync failed.", 502);
  }
 }));

 return router;
}

const router = createWooCommerceRouter();
export default router;
export { CALLBACK_PARSER, safeCallbackBody, ownedWooConnection };
