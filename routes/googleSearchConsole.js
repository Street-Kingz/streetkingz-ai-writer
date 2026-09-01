import express from "express";
import crypto from "node:crypto";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { privilegedClient } from "../product-kernel/privileged.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { createVaultSecret, deleteVaultSecret } from "../product-kernel/vault.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { correlationMiddleware } from "../product-kernel/correlation.js";
import { googleSearchConsoleTransport, hashOAuthState, propertyMatches, normalizeProperty } from "../product-kernel/googleSearchConsoleOAuth.js";

const router = express.Router(); router.use(correlationMiddleware);
const provider = "google_search_console";
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
  const fail = async code => { await admin.rpc("gsc_fail_oauth_attempt", { p_attempt_id: attempt.attempt_id }); throw new ProductError(code, "Google Search Console authorization could not be completed.", 409); };
  if (req.query.error) return fail("GSC_AUTH_DENIED");
  let tokens; try { tokens = await googleSearchConsoleTransport().exchangeCode(req.query.code, attempt.pkce_verifier); } catch { return fail("GSC_TOKEN_EXCHANGE_FAILED"); }
  let staged;
  try { staged = await createVaultSecret(admin, JSON.stringify({ refresh_token: tokens.refresh_token }), "v1-04-google-search-console-pending"); const saved = await admin.rpc("gsc_stage_oauth_secret", { p_attempt_id: attempt.attempt_id, p_secret_reference: staged.secretReference }); if (saved.error) throw saved.error; } catch { if (staged?.secretReference) await deleteVaultSecret(admin, staged.secretReference); return fail("GSC_CONNECTION_FAILED"); }
  res.json({ status: "awaiting_property" });
}));

async function stagedAuthorization(admin, connectionId) {
  const row = await admin.from("gsc_oauth_attempts").select("id,staged_secret_reference").eq("connection_id", connectionId).eq("status", "processing").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (row.error || !row.data?.staged_secret_reference) throw new ProductError("GSC_REAUTH_REQUIRED", "Search Console requires reconnection.", 409);
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
  const { business, admin } = await context(req); const connection = await ownedConnection(admin, business.id, req.body?.connection_id); const authorization = await stagedAuthorization(admin, connection.id); const store = await admin.from("commerce_stores").select("canonical_base_url").eq("business_id", business.id).eq("provider", "woocommerce").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (store.error || !store.data) throw new ProductError("GSC_BUSINESS_SITE_REQUIRED", "A verified Business site is required.", 409);
  const property = normalizeProperty(req.body?.site_url); if (!property || !propertyMatches(req.body.site_url, store.data.canonical_base_url)) throw new ProductError("GSC_PROPERTY_MISMATCH", "Search Console property does not match the Business site.", 409);
  const transport = googleSearchConsoleTransport(); const verified = await transport.site(await transport.accessToken(authorization.refreshToken), property.siteUrl); const allowed = ["siteOwner", "siteFullUser", "siteRestrictedUser"];
  if (!verified || !allowed.includes(verified.permissionLevel)) throw new ProductError("GSC_PROPERTY_INVALID", "Search Console property is not usable.", 409);
  const activated = await admin.rpc("gsc_activate_property", { p_attempt_id: authorization.attemptId, p_site_url: property.siteUrl, p_property_type: property.type, p_permission_level: verified.permissionLevel }); if (activated.error) throw activated.error;
  res.json({ status: "connected", property: { siteUrl: property.siteUrl, property_type: property.type, permissionLevel: verified.permissionLevel }, evidence_state: "never_collected" });
}));

router.post("/api/product/organic-evidence/search-console/disconnect", handle(async (req, res) => { const { business, admin } = await context(req); const result = await admin.rpc("gsc_disconnect", { p_business_id: business.id, p_connection_id: req.body?.connection_id }); if (result.error) throw result.error; res.json({ status: "disconnected", consent_state: "revoked" }); }));

export default router;
