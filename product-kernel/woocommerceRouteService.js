import { ProductError } from "./errors.js";
import { establishWooConnection } from "./woocommerceCallback.js";

const CALLBACK_STATES = new Set(["callback_received"]);
const exactCredentialKeys = ["consumerKey", "consumerSecret"];

function parseCredential(value) {
  let parsed;
  try { parsed = typeof value === "string" ? JSON.parse(value) : value; } catch { throw new ProductError("WOO_CREDENTIAL_INVALID", "WooCommerce credentials are invalid.", 502); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).sort().join(",") !== exactCredentialKeys.join(",") || exactCredentialKeys.some(key => typeof parsed[key] !== "string" || !parsed[key] || parsed[key].length > 512)) throw new ProductError("WOO_CREDENTIAL_INVALID", "WooCommerce credentials are invalid.", 502);
  return { consumerKey: parsed.consumerKey, consumerSecret: parsed.consumerSecret };
}

export async function loadWooVerificationContext(admin, { connectionId, attemptId } = {}) {
  let query = admin.from("woocommerce_auth_attempts").select("id,connection_id,canonical_base_url,status,credential_reference").eq("status", "callback_received").gt("expires_at", new Date().toISOString()).not("credential_reference", "is", null);
  query = attemptId ? query.eq("id", attemptId) : query.eq("connection_id", connectionId);
  const result = await query.maybeSingle();
  if (result.error) throw new ProductError("WOO_VERIFICATION_UNAVAILABLE", "WooCommerce verification is unavailable.", 503);
  const attempt = result.data;
  if (!attempt || !CALLBACK_STATES.has(attempt.status) || !attempt.credential_reference) throw new ProductError("WOO_VERIFICATION_NOT_READY", "WooCommerce verification is not ready.", 409);
  const secret = await admin.rpc("vault_read_secret", { secret_id: attempt.credential_reference });
  if (secret.error || secret.data === null || secret.data === undefined) throw new ProductError("WOO_CREDENTIAL_INVALID", "WooCommerce credentials are invalid.", 502);
  return { attempt, credentials: parseCredential(secret.data) };
}

export async function assertEstablishedWooConnection(admin, connectionId) {
  const status = await establishedWooStatus(admin, connectionId);
  if (status !== "connected") throw new ProductError("WOO_CONNECTION_STATE_MANAGED", "WooCommerce connection state is not established.", 409);
  return status;
}

export async function establishedWooStatus(admin, connectionId) {
  const connection = await admin.from("connections").select("id,business_id,provider_type,status,consent_state,secret_reference").eq("id", connectionId).maybeSingle();
  if (connection.error || !connection.data || connection.data.provider_type !== "woocommerce") return "failed";
  if (connection.data.status === "disconnected" && connection.data.consent_state === "revoked") return "disconnected";
  if (connection.data.status !== "connected" || connection.data.consent_state !== "granted" || !connection.data.secret_reference) return "failed";
  const store = await admin.from("commerce_stores").select("id,business_id,connection_id").eq("business_id", connection.data.business_id).eq("connection_id", connection.data.id).eq("provider", "woocommerce").maybeSingle();
  return store.error || !store.data ? "failed" : "connected";
}

export async function verifyWooConnection(admin, options, deps = {}) {
  const context = await loadWooVerificationContext(admin, options);
  return establishWooConnection(admin, { attempt: context.attempt, credentials: context.credentials, correlationId: options.correlationId }, deps);
}

export async function loadWooStoreContext(admin, connectionId) {
  const connection = await admin.from("connections").select("id,business_id,provider_type,status,consent_state,secret_reference").eq("id", connectionId).maybeSingle();
  if (connection.error || !connection.data || connection.data.provider_type !== "woocommerce" || connection.data.status !== "connected" || connection.data.consent_state !== "granted" || !connection.data.secret_reference) throw new ProductError("WOO_CONNECTION_NOT_ESTABLISHED", "WooCommerce connection is not established.", 409);
  const store = await admin.from("commerce_stores").select("id,business_id,connection_id,canonical_base_url").eq("connection_id", connection.data.id).eq("provider", "woocommerce").maybeSingle();
  if (store.error || !store.data || store.data.business_id !== connection.data.business_id) throw new ProductError("WOO_CONNECTION_NOT_ESTABLISHED", "WooCommerce Store is not established.", 409);
  const secret = await admin.rpc("vault_read_secret", { secret_id: connection.data.secret_reference });
  if (secret.error || secret.data === null || secret.data === undefined) throw new ProductError("WOO_CREDENTIAL_INVALID", "WooCommerce credentials are invalid.", 502);
  return { connection: connection.data, store: store.data, credentials: parseCredential(secret.data) };
}

export async function assertWooSyncActive(admin, { connectionId, storeId, generationId }) {
  const connection = await admin.from("connections").select("id,business_id,provider_type,status,consent_state").eq("id", connectionId).maybeSingle();
  const store = await admin.from("commerce_stores").select("id,business_id,connection_id,provider").eq("id", storeId).maybeSingle();
  const generation = await admin.from("commerce_sync_generations").select("id,store_id,state").eq("id", generationId).maybeSingle();
  if (connection.error || store.error || generation.error || !connection.data || !store.data || !generation.data || connection.data.provider_type !== "woocommerce" || connection.data.status !== "connected" || connection.data.consent_state !== "granted" || store.data.business_id !== connection.data.business_id || store.data.connection_id !== connection.data.id || store.data.provider !== "woocommerce" || generation.data.store_id !== store.data.id || generation.data.state !== "pending") throw new ProductError("SYNC_CANCELLED", "WooCommerce evidence sync is no longer active.", 409);
  return true;
}
