import express from "express";
import crypto from "node:crypto";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { privilegedClient } from "../product-kernel/privileged.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { createVaultSecret, deleteVaultSecret } from "../product-kernel/vault.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { correlationMiddleware } from "../product-kernel/correlation.js";
import { googleSearchConsoleTransport, hashOAuthState, propertyMatches, propertyProbeMatches, normalizeProperty } from "../product-kernel/googleSearchConsoleOAuth.js";

const router = express.Router(); router.use(correlationMiddleware);
const provider = "google_search_console";
let lifecycleTestHook = null;
export function setGoogleSearchConsoleLifecycleHookForTests(next) { lifecycleTestHook = next || null; }
async function lifecyclePause(point) { if (lifecycleTestHook) await lifecycleTestHook(point); }
const handle = fn => (req, res) => Promise.resolve(fn(req, res)).catch(error => { const safe = safeError(error, req.correlationId); res.status(safe.status).json(safe.body); });

async function context(req) {
  const token = parseBearer(req.get("authorization"));
  const identity = await verifyIdentity(token);
  const client = callerClient(token);
  const account = await resolveAccount(client, identity.authUserId);
  if (!account || account.status !== "active") throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  const business = await client.from("businesses").select("id").eq("account_id", account.id).eq("status", "active").maybeSingle();
  if (business.error) throw business.error;
  if (!business.data) throw new ProductError("BUSINESS_NOT_FOUND", "Business is not provisioned.", 404);
  return { account, business: business.data, admin: privilegedClient() };
}

async function ownedConnection(admin, businessId, id) {
  const row = await admin.from("connections").select("id,business_id,provider_type,secret_reference").eq("id", id).eq("business_id", businessId).eq("provider_type", provider).maybeSingle();
  if (row.error || !row.data) throw new ProductError("CONNECTION_NOT_FOUND", "Connection not found.", 404);
  return row.data;
}

router.post("/api/product/organic-evidence/search-console/connect", handle(start));
router.post("/api/product/organic-evidence/search-console/reconnect", handle(start));

async function start(req, res) {
  const { account, business, admin } = await context(req);
  const ensured = await admin.rpc("gsc_ensure_connection", { p_business_id: business.id });
  if (ensured.error) throw ensured.error;
  const state = crypto.randomBytes(32).toString("base64url");
  const verifier = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + 15 * 60_000).toISOString();
  await lifecyclePause("before_begin");
  const attempt = await admin.rpc("gsc_begin_oauth_attempt", { p_account_id: account.id, p_business_id: business.id, p_state_hash: hashOAuthState(state), p_pkce_verifier: verifier, p_expires_at: expires });
  if (attempt.error) throw attempt.error;
  res.status(201).json({ authorization_url: googleSearchConsoleTransport().authorizationUrl({ state, verifier }), connection: { id: ensured.data.id, status: ensured.data.status, consent_state: ensured.data.consent_state }, expires_at: expires });
}

router.get("/api/product/organic-evidence/search-console/callback", handle(async (req, res) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  if (!state || (typeof req.query.code !== "string" && typeof req.query.error !== "string") || Object.keys(req.query).some(key => !["state", "code", "error", "error_description", "error_uri"].includes(key))) throw new ProductError("GSC_CALLBACK_INVALID", "Search Console callback is invalid.", 400);
  const admin = privilegedClient();
  const claim = await admin.rpc("gsc_claim_oauth_attempt", { p_state_hash: hashOAuthState(state) });
  if (claim.error || !claim.data) throw new ProductError("GSC_CALLBACK_INVALID", "Search Console callback is invalid or expired.", 400);
  const attempt = Array.isArray(claim.data) ? claim.data[0] : claim.data;
  const fail = async code => { const failed = await admin.rpc("gsc_fail_oauth_attempt", { p_attempt_id: attempt.attempt_id, p_code: code }); if (failed.error && !String(failed.error.message || "").includes("GSC_CALLBACK_INVALID")) throw failed.error; throw new ProductError(code, "Google Search Console authorization could not be completed.", 409); };
  if (req.query.error) return fail("GSC_AUTH_DENIED");
  let tokens; try { tokens = await googleSearchConsoleTransport().exchangeCode(req.query.code, attempt.pkce_verifier); } catch (error) { return fail(["GSC_REFRESH_TOKEN_REQUIRED", "GSC_SCOPE_INVALID", "GSC_REAUTH_REQUIRED"].includes(error?.code) ? error.code : "GSC_TOKEN_EXCHANGE_FAILED"); }
  let staged;
  try { staged = await createVaultSecret(admin, JSON.stringify({ refresh_token: tokens.refresh_token }), `v1-04-google-search-console-pending-${attempt.attempt_id}`); await lifecyclePause("before_stage"); const saved = await admin.rpc("gsc_stage_oauth_secret", { p_attempt_id: attempt.attempt_id, p_secret_reference: staged.secretReference }); if (saved.error) throw saved.error; } catch { if (staged?.secretReference) await deleteVaultSecret(admin, staged.secretReference); return fail("GSC_CONNECTION_FAILED"); }
  res.json({ status: "awaiting_property" });
}));

async function stagedAuthorization(admin, connectionId) {
  const row = await admin.from("gsc_oauth_attempts").select("id,staged_secret_reference").eq("connection_id", connectionId).eq("status", "processing").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (row.error || !row.data?.staged_secret_reference) throw new ProductError("GSC_REAUTH_REQUIRED", "Search Console requires reconnection.", 409);
  const expiry = await admin.from("gsc_oauth_attempts").select("expires_at").eq("id", row.data.id).single();
  if (expiry.error || new Date(expiry.data.expires_at) <= new Date()) { await admin.rpc("gsc_expire_oauth_attempt", { p_attempt_id: row.data.id }); throw new ProductError("GSC_REAUTH_REQUIRED", "Search Console authorization expired; reconnect to continue.", 409); }
  const secret = await admin.rpc("vault_read_secret", { secret_id: row.data.staged_secret_reference });
  if (secret.error || !secret.data) throw new ProductError("GSC_REAUTH_REQUIRED", "Search Console requires reconnection.", 409);
  return { attemptId: row.data.id, refreshToken: JSON.parse(secret.data).refresh_token };
}

router.get("/api/product/organic-evidence/search-console/properties", handle(async (req, res) => {
  const { business, admin } = await context(req); const connection = await ownedConnection(admin, business.id, req.query.connection_id); const authorization = await stagedAuthorization(admin, connection.id); const transport = googleSearchConsoleTransport(); const body = await transport.sitesList(await transport.accessToken(authorization.refreshToken));
  if (body?.siteEntry !== undefined && !Array.isArray(body.siteEntry)) throw new ProductError("GSC_PROVIDER_MALFORMED", "Search Console returned an invalid property list.", 502);
  const allowed = ["siteOwner", "siteFullUser", "siteRestrictedUser"];
  res.json({ properties: (body?.siteEntry || []).flatMap(item => typeof item?.siteUrl === "string" && allowed.includes(item.permissionLevel) ? [{ siteUrl: item.siteUrl, permissionLevel: item.permissionLevel, property_type: item.siteUrl.startsWith("sc-domain:") ? "domain" : "url_prefix" }] : []) });
}));

router.post("/api/product/organic-evidence/search-console/select", handle(async (req, res) => {
  const { business, admin } = await context(req); const connection = await ownedConnection(admin, business.id, req.body?.connection_id); const authorization = await stagedAuthorization(admin, connection.id); const store = await admin.from("commerce_stores").select("canonical_base_url").eq("business_id", business.id).eq("provider", "woocommerce").order("id", { ascending: false }).limit(1).maybeSingle();
  if (store.error || !store.data) throw new ProductError("GSC_BUSINESS_SITE_REQUIRED", "A verified Business site is required.", 409);
  const property = normalizeProperty(req.body?.site_url); if (!property || !propertyMatches(req.body.site_url, store.data.canonical_base_url)) throw new ProductError("GSC_PROPERTY_MISMATCH", "Search Console property does not match the Business site.", 409);
  const transport = googleSearchConsoleTransport(); const verified = await transport.site(await transport.accessToken(authorization.refreshToken), property.siteUrl); const allowed = ["siteOwner", "siteFullUser", "siteRestrictedUser"];
  if (!propertyProbeMatches(property.siteUrl, verified) || !allowed.includes(verified.permissionLevel)) throw new ProductError("GSC_PROPERTY_INVALID", "Search Console property is not usable.", 409);
  await lifecyclePause("before_activate"); const activated = await admin.rpc("gsc_activate_property", { p_attempt_id: authorization.attemptId, p_site_url: property.siteUrl, p_property_type: property.type, p_permission_level: verified.permissionLevel }); if (activated.error) { if (activated.error.message?.includes("GSC_ACTIVATION_INVALID") || activated.error.message?.includes("CONNECTION_NOT_FOUND")) throw new ProductError("GSC_REAUTH_REQUIRED", "Search Console authorization expired; reconnect to continue.", 409); throw activated.error; } if (!activated.data) throw new ProductError("GSC_REAUTH_REQUIRED", "Search Console authorization expired; reconnect to continue.", 409);
  res.json({ status: "connected", property: { siteUrl: property.siteUrl, property_type: property.type, permissionLevel: verified.permissionLevel }, evidence_state: activated.data.evidence_state, has_current_complete_evidence: Boolean(activated.data.current_complete_run), evidence_as_of: activated.data.evidence_as_of || null });
}));

router.post("/api/product/organic-evidence/search-console/disconnect", handle(async (req, res) => { const { business, admin } = await context(req); await lifecyclePause("before_disconnect"); const result = await admin.rpc("gsc_disconnect", { p_business_id: business.id, p_connection_id: req.body?.connection_id }); if (result.error) throw result.error; res.json({ status: "disconnected", consent_state: "revoked", local_credential_removed: true, remote_google_revocation_requested: false }); }));

router.post("/api/product/organic-evidence/search-console/reauth-check", handle(async (req, res) => {
  const { business, admin } = await context(req); const connection = await ownedConnection(admin, business.id, req.body?.connection_id);
  const currentState = async () => { const row = await admin.from("gsc_connections").select("connection_state").eq("connection_id", connection.id).eq("business_id", business.id).single(); if (row.error) throw row.error; return row.data.connection_state; };
  const staleResponse = async () => { const state = await currentState(); if (state === "disconnected") return res.json({ status: "disconnected" }); return res.json({ status: "connected" }); };
  if (!connection.secret_reference) {
    await lifecyclePause("before_reauth_mark");
    const marked = await admin.rpc("gsc_try_mark_reauthentication_required", { p_business_id: business.id, p_connection_id: connection.id, p_expected_secret_reference: null });
    if (marked.error) throw marked.error;
    if (!marked.data) return staleResponse();
    throw new ProductError("GSC_REAUTH_REQUIRED", "Search Console requires reconnection.", 409);
  }
  const checkedReference = connection.secret_reference;
  try {
    const secret = await admin.rpc("vault_read_secret", { secret_id: checkedReference });
    if (secret.error || !secret.data) throw new ProductError("GSC_REAUTH_REQUIRED", "Search Console requires reconnection.", 409);
    let stored; try { stored = JSON.parse(secret.data); } catch { throw new ProductError("GSC_REAUTH_REQUIRED", "Search Console requires reconnection.", 409); }
    if (typeof stored?.refresh_token !== "string" || !stored.refresh_token) throw new ProductError("GSC_REAUTH_REQUIRED", "Search Console requires reconnection.", 409);
    const transport = googleSearchConsoleTransport(); await transport.accessToken(stored.refresh_token);
  }
  catch (error) {
    if (error?.code === "GSC_REAUTH_REQUIRED") {
      await lifecyclePause("before_reauth_mark");
      const marked = await admin.rpc("gsc_try_mark_reauthentication_required", { p_business_id: business.id, p_connection_id: connection.id, p_expected_secret_reference: checkedReference });
      if (marked.error) throw marked.error;
      if (!marked.data) return staleResponse();
      throw new ProductError("GSC_REAUTH_REQUIRED", "Search Console requires reconnection.", 409);
    }
    throw error;
  }
  const current = await admin.rpc("gsc_confirm_credential_health", { p_business_id: business.id, p_connection_id: connection.id, p_expected_secret_reference: checkedReference });
  if (current.error) throw current.error;
  if (!current.data) return staleResponse();
  res.json({ status: "connected" });
}));

router.get("/api/product/organic-evidence/search-console/status", handle(async (req, res) => {
  const { business, admin } = await context(req);
  const connection = await admin.from("connections").select("id,status,consent_state").eq("business_id", business.id).eq("provider_type", provider).maybeSingle();
  if (connection.error) throw connection.error;
  if (!connection.data) return res.json({ connection_state: "disconnected", selected_property: null, property_type: null, permission_level: null, evidence_state: null, has_current_complete_evidence: false, current_completeness_state: null, last_successful_at: null, evidence_as_of: null });
  const expired = await admin.from("gsc_oauth_attempts").select("id").eq("connection_id", connection.data.id).in("status", ["pending", "processing"]).lte("expires_at", new Date().toISOString());
  if (!expired.error) for (const attempt of expired.data || []) await admin.rpc("gsc_expire_oauth_attempt", { p_attempt_id: attempt.id });
  const gsc = await admin.from("gsc_connections").select("connection_state,selected_site_url,property_type,permission_level").eq("connection_id", connection.data.id).single();
  if (gsc.error) throw gsc.error;
  const source = await admin.from("organic_evidence_sources").select("evidence_state,current_complete_run,current_completeness_state,last_successful_at,evidence_as_of").eq("business_id", business.id).eq("connection_id", connection.data.id).maybeSingle();
  if (source.error) throw source.error;
  res.json({ connection_state: gsc.data.connection_state, selected_property: gsc.data.selected_site_url, property_type: gsc.data.property_type, permission_level: gsc.data.permission_level, evidence_state: source.data?.evidence_state || null, has_current_complete_evidence: Boolean(source.data?.current_complete_run), current_completeness_state: source.data?.current_complete_run ? source.data.current_completeness_state : null, last_successful_at: source.data?.last_successful_at || null, evidence_as_of: source.data?.evidence_as_of || null });
}));

export default router;
