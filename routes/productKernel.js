import express from "express";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { privilegedClient } from "../product-kernel/privileged.js";
import { correlationMiddleware } from "../product-kernel/correlation.js";
import { CONNECTION_STATUS, CONSENT_STATE } from "../product-kernel/constants.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { deleteAccountFoundation } from "../product-kernel/accountDeletion.js";

const router = express.Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
router.use(correlationMiddleware);

async function authContext(req) {
  const token = parseBearer(req.get("authorization"));
  const identity = await verifyIdentity(token);
  const client = callerClient(token);
  const account = await resolveAccount(client, identity.authUserId);
  return { identity, client, account };
}
function requireAccount(account, { active = true } = {}) {
  if (!account) throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  if (active && account.status !== "active") throw new ProductError("ACCOUNT_NOT_ACTIVE", "Product account is not active.", 409);
}
function mapRpcError(error) {
  const message = error?.message || "";
  const mappings = [
    ["BUSINESS_LIMIT_REACHED", 409, "Only one business is permitted for an account."],
    ["CONNECTION_EXISTS", 409, "This provider connection already exists."],
    ["CONNECTION_NOT_FOUND", 404, "Connection not found."],
    ["BUSINESS_NOT_PROVISIONED", 404, "Business is not provisioned."],
    ["ACCOUNT_NOT_ACTIVE", 409, "Product account is not active."],
    ["INVALID_CONNECTION_TRANSITION", 409, "Invalid connection status transition."],
    ["SECRET_OPERATION_FAILED", 503, "Connector secret removal failed."],
    ["INVALID_BUSINESS_NAME", 400, "Business name is invalid."],
    ["INVALID_PLATFORM", 400, "Ecommerce platform is invalid."],
    ["INVALID_BUSINESS_LOCALE", 400, "A bounded market and language are required."],
    ["INVALID_PROVIDER_TYPE", 400, "Provider type is invalid."],
    ["WOO_CONNECTION_STATE_MANAGED", 409, "WooCommerce connection state is managed by the WooCommerce authorisation lifecycle."]
  ];
  for (const [code, status, safeMessage] of mappings) if (message.includes(code)) return new ProductError(code, safeMessage, status);
  return error;
}
async function auditFailure({ account, businessId = null, eventType, correlationId, metadata }) {
  if (!account) return;
  try { await privilegedClient().from("audit_events").insert({ account_id: account.id, business_id: businessId, event_type: eventType, correlation_id: correlationId, safe_metadata: metadata }); } catch { /* Preserve primary failure. */ }
}
function handle(next) { return (req, res) => Promise.resolve(next(req, res)).catch(error => {
  const safe = safeError(error, req.correlationId);
  if (safe.body.error.code.startsWith("AUTH_")) console.warn(JSON.stringify({ event: "product_auth_failure", error_code: safe.body.error.code, correlation_id: req.correlationId }));
  res.status(safe.status).json(safe.body);
}); }

router.get("/api/product/account", handle(async (req, res) => {
  const context = await authContext(req);
  res.json({ account: context.account, auth_user_id: context.identity.authUserId });
}));
router.post("/api/product/account", handle(async (req, res) => {
  const { client } = await authContext(req);
  const { data, error } = await client.rpc("product_create_account", { p_correlation_id: req.correlationId });
  if (error) throw mapRpcError(error);
  res.status(data.created ? 201 : 200).json({ account: data.account });
}));
router.delete("/api/product/account", handle(async (req, res) => {
  const context = await authContext(req); requireAccount(context.account, { active: false });
  try {
    await deleteAccountFoundation({ caller: context.client, admin: privilegedClient(), authUserId: context.identity.authUserId, account: context.account, correlationId: req.correlationId });
  } catch (error) {
    await auditFailure({ account: context.account, eventType: "account_deletion_failed", correlationId: req.correlationId, metadata: { operation: "account_deletion", error_code: error instanceof ProductError ? error.code : "INTERNAL_ERROR" } });
    throw error;
  }
  res.status(204).end();
}));

router.get("/api/product/business", handle(async (req, res) => {
  const { client, account } = await authContext(req); requireAccount(account);
  const { data, error } = await client.from("businesses").select("id,account_id,name,ecommerce_platform,primary_market,primary_language,connection_status,status,created_at,updated_at").eq("account_id", account.id).maybeSingle();
  if (error) throw error;
  res.json({ business: data });
}));
router.post("/api/product/business", handle(async (req, res) => {
  const { client, account } = await authContext(req); requireAccount(account);
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const platform = req.body?.ecommerce_platform === undefined ? "unknown" : req.body.ecommerce_platform;
  if (!name || name.length > 200) throw new ProductError("INVALID_REQUEST", "Business name must contain 1–200 characters.", 400);
  if (typeof platform !== "string" || !platform.trim() || platform.trim().length > 64) throw new ProductError("INVALID_REQUEST", "Ecommerce platform must contain 1–64 characters.", 400);
  const { data, error } = await client.rpc("product_create_business", { p_name: name, p_platform: platform.trim(), p_correlation_id: req.correlationId });
  if (error) throw mapRpcError(error);
  res.status(201).json({ business: data });
}));
router.patch("/api/product/business/locale", handle(async (req, res) => {
  const { client, account } = await authContext(req); requireAccount(account);
  const market = typeof req.body?.primary_market === "string" ? req.body.primary_market.trim().toUpperCase() : "";
  const rawLanguage = typeof req.body?.primary_language === "string" ? req.body.primary_language.trim() : "";
  const languageParts = rawLanguage.split("-"); const language = languageParts.length === 1 ? rawLanguage.toLowerCase() : `${languageParts[0].toLowerCase()}-${languageParts[1].toUpperCase()}`;
  if (!/^[A-Z]{2,3}$/.test(market) || !/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(language)) throw new ProductError("INVALID_BUSINESS_LOCALE", "A bounded market and language are required.", 400);
  const { data, error } = await client.rpc("product_set_business_locale", { p_market: market, p_language: language, p_correlation_id: req.correlationId });
  if (error) throw mapRpcError(error);
  res.json({ business: data });
}));

router.get("/api/product/connections", handle(async (req, res) => {
  const { client, account } = await authContext(req); requireAccount(account);
  const { data: businesses, error: businessError } = await client.from("businesses").select("id").eq("account_id", account.id);
  if (businessError) throw businessError;
  const ids = businesses.map(row => row.id);
  if (!ids.length) return res.json({ connections: [] });
  const { data, error } = await client.from("connections").select("id,business_id,provider_type,status,consent_state,connected_at,disconnected_at,last_success_at,safe_error_code,safe_error_message,created_at,updated_at").in("business_id", ids);
  if (error) throw error;
  res.json({ connections: data || [] });
}));
router.post("/api/product/connections", handle(async (req, res) => {
  const { client, account } = await authContext(req); requireAccount(account);
  const providerType = typeof req.body?.provider_type === "string" ? req.body.provider_type.trim() : "";
  if (!providerType || providerType.length > 64) throw new ProductError("INVALID_REQUEST", "Provider type must contain 1–64 characters.", 400);
  const { data, error } = await client.rpc("product_create_connection", { p_provider_type: providerType, p_correlation_id: req.correlationId });
  if (error) throw mapRpcError(error);
  const { secret_reference: _secret, ...customerConnection } = data;
  res.status(201).json({ connection: customerConnection });
}));
router.patch("/api/product/connections/:id", handle(async (req, res) => {
  const { client, account } = await authContext(req); requireAccount(account);
  if (!UUID.test(req.params.id)) throw new ProductError("INVALID_REQUEST", "Connection ID is invalid.", 400);
  if (!CONNECTION_STATUS.includes(req.body?.status) || !CONSENT_STATE.includes(req.body?.consent_state)) throw new ProductError("INVALID_CONNECTION_TRANSITION", "A supported status and consent state are required.", 409);
  const { data, error } = await client.rpc("product_transition_connection", { p_connection_id: req.params.id, p_status: req.body.status, p_consent_state: req.body.consent_state, p_correlation_id: req.correlationId });
  if (error) {
    const mapped = mapRpcError(error);
    const eventType = mapped instanceof ProductError && mapped.code === "SECRET_OPERATION_FAILED" ? "secret_operation_failed" : mapped instanceof ProductError && mapped.code === "CONNECTION_NOT_FOUND" ? "tenant_access_denied" : "connection_transition_failed";
    await auditFailure({ account, businessId: null, eventType, correlationId: req.correlationId, metadata: { operation: "connection_transition", error_code: mapped instanceof ProductError ? mapped.code : "INTERNAL_ERROR" } });
    throw mapped;
  }
  const { secret_reference: _secret, ...customerConnection } = data;
  res.json({ connection: customerConnection });
}));
router.get("/api/product/audit-events", handle(async (req, res) => {
  const { client, account } = await authContext(req); requireAccount(account);
  const { data, error } = await client.from("audit_events").select("id,business_id,event_type,correlation_id,safe_metadata,created_at").eq("account_id", account.id).order("created_at", { ascending: false });
  if (error) throw error;
  res.json({ events: data || [] });
}));

export default router;
