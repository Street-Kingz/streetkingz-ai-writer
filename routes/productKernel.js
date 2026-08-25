import express from "express";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { privilegedClient } from "../product-kernel/privileged.js";
import { correlationMiddleware } from "../product-kernel/correlation.js";
import { assertConnectionTransition, assertConsentState } from "../product-kernel/constants.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { deleteAccountFoundation } from "../product-kernel/accountDeletion.js";
import { deleteVaultSecret } from "../product-kernel/vault.js";

const router = express.Router();
router.use(correlationMiddleware);

async function authContext(req) {
  const token = parseBearer(req.get("authorization"));
  const identity = await verifyIdentity(token);
  const client = callerClient(token);
  const account = await resolveAccount(client, identity.authUserId);
  return { token, identity, client, account };
}
async function audit({ account, businessId = null, eventType, correlationId, metadata = {} }) {
  if (!account) return;
  const { error } = await privilegedClient().from("audit_events").insert({ account_id: account.id, business_id: businessId, event_type: eventType, correlation_id: correlationId, safe_metadata: metadata });
  if (error) throw error;
}
async function auditFailure(details) {
  try { await audit(details); } catch { /* Preserve the primary security failure. */ }
}
function safeFailureCode(error) {
  return typeof error?.code === "string" && error.code.length <= 64 ? error.code : "INTERNAL_ERROR";
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
router.delete("/api/product/account", handle(async (req, res) => {
  const context = await authContext(req);
  try {
    await deleteAccountFoundation({ caller: context.client, admin: privilegedClient(), authUserId: context.identity.authUserId, account: context.account });
  } catch (error) {
    await auditFailure({ account: context.account, eventType: "account_deletion_failed", correlationId: req.correlationId, metadata: { operation: "account_deletion", error_code: safeFailureCode(error) } });
    throw error;
  }
  res.status(204).end();
}));

router.post("/api/product/account", handle(async (req, res) => {
  const context = await authContext(req);
  if (context.account) return res.status(200).json({ account: context.account });
  const { data, error } = await context.client.from("accounts").insert({ auth_user_id: context.identity.authUserId }).select("id,auth_user_id,status,created_at,updated_at").single();
  if (error) throw error;
  await audit({ account: data, eventType: "account_created", correlationId: req.correlationId });
  res.status(201).json({ account: data });
}));

router.get("/api/product/business", handle(async (req, res) => {
  const { client, account } = await authContext(req);
  if (!account) throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  const { data, error } = await client.from("businesses").select("id,account_id,name,ecommerce_platform,status,created_at,updated_at").eq("account_id", account.id).maybeSingle();
  if (error) throw error; res.json({ business: data });
}));
router.post("/api/product/business", handle(async (req, res) => {
  const { client, account } = await authContext(req);
  if (!account) throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) throw new ProductError("INVALID_REQUEST", "Business name is required.", 400);
  const { data, error } = await client.from("businesses").insert({ account_id: account.id, name, ecommerce_platform: req.body.ecommerce_platform || "unknown" }).select("id,account_id,name,ecommerce_platform,status,created_at,updated_at").single();
  if (error?.code === "23505") throw new ProductError("BUSINESS_LIMIT_REACHED", "Only one business is permitted for an account.", 409);
  if (error) throw error; await audit({ account, businessId: data.id, eventType: "business_created", correlationId: req.correlationId });
  res.status(201).json({ business: data });
}));

router.get("/api/product/connections", handle(async (req, res) => {
  const { client, account } = await authContext(req); if (!account) throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  const { data, error } = await client.from("connections").select("id,business_id,provider_type,status,consent_state,connected_at,disconnected_at,last_success_at,safe_error_code,safe_error_message,created_at,updated_at").in("business_id", (await client.from("businesses").select("id").eq("account_id", account.id)).data?.map(x => x.id) || []); if (error) throw error; res.json({ connections: data || [] });
}));
router.post("/api/product/connections", handle(async (req, res) => {
  const { client, account } = await authContext(req); if (!account) throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  const { data: business } = await client.from("businesses").select("id").eq("account_id", account.id).maybeSingle(); if (!business) throw new ProductError("TENANT_NOT_FOUND", "Business is not provisioned.", 404);
  const providerType = typeof req.body?.provider_type === "string" ? req.body.provider_type.trim() : ""; if (!providerType) throw new ProductError("INVALID_REQUEST", "Provider type is required.", 400);
  const { data, error } = await client.from("connections").insert({ business_id: business.id, provider_type: providerType }).select("id,business_id,provider_type,status,consent_state,created_at,updated_at").single(); if (error?.code === "23505") throw new ProductError("CONNECTION_EXISTS", "This provider connection already exists.", 409); if (error) throw error; await audit({ account, businessId: business.id, eventType: "connection_created", correlationId: req.correlationId }); res.status(201).json({ connection: data });
}));
router.patch("/api/product/connections/:id", handle(async (req, res) => {
  const { client, account } = await authContext(req); if (!account) throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  const { data: current, error: readError } = await client.from("connections").select("id,business_id,status,consent_state,secret_reference").eq("id", req.params.id).maybeSingle();
  if (readError) throw readError;
  if (!current) {
    await auditFailure({ account, eventType: "tenant_access_denied", correlationId: req.correlationId, metadata: { resource_type: "connection", reason: "not_owned_or_missing" } });
    throw new ProductError("CONNECTION_NOT_FOUND", "Connection not found.", 404);
  }
  const next = req.body?.status || current.status;
  const consent = req.body?.consent_state || current.consent_state;
  try {
    if (next !== current.status) assertConnectionTransition(current.status, next);
    assertConsentState(consent);
  } catch (error) {
    await auditFailure({ account, businessId: current.business_id, eventType: "connection_transition_failed", correlationId: req.correlationId, metadata: { operation: "connection_transition", error_code: safeFailureCode(error) } });
    throw error;
  }
  if (next === "disconnected" && current.secret_reference) {
    try {
      await deleteVaultSecret(privilegedClient(), current.secret_reference);
    } catch (error) {
      await auditFailure({ account, businessId: current.business_id, eventType: "secret_operation_failed", correlationId: req.correlationId, metadata: { operation: "disconnect", error_code: "SECRET_OPERATION_FAILED" } });
      throw error;
    }
  }
  const patch = { status: next, consent_state: consent, ...(next === "disconnected" ? { disconnected_at: new Date().toISOString(), secret_reference: null } : {}) };
  const { data, error } = await client.from("connections").update(patch).eq("id", current.id).select("id,business_id,provider_type,status,consent_state,connected_at,disconnected_at,last_success_at,created_at,updated_at").single();
  if (error) throw error;
  await audit({ account, businessId: current.business_id, eventType: next === "disconnected" ? "connection_disconnected" : "connection_status_changed", correlationId: req.correlationId });
  res.json({ connection: data });
}));
router.get("/api/product/audit-events", handle(async (req, res) => { const { client, account } = await authContext(req); if (!account) throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404); const { data, error } = await client.from("audit_events").select("id,business_id,event_type,correlation_id,safe_metadata,created_at").eq("account_id", account.id).order("created_at", { ascending: false }); if (error) throw error; res.json({ events: data || [] }); }));

export default router;
