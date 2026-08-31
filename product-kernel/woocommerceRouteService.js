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
  const store = await admin.from("commerce_stores").select("id,business_id,connection_id,canonical_base_url,current_generation").eq("connection_id", connection.data.id).eq("provider", "woocommerce").maybeSingle();
  if (store.error || !store.data || store.data.business_id !== connection.data.business_id) throw new ProductError("WOO_CONNECTION_NOT_ESTABLISHED", "WooCommerce Store is not established.", 409);
  const secret = await admin.rpc("vault_read_secret", { secret_id: connection.data.secret_reference });
  if (secret.error || secret.data === null || secret.data === undefined) throw new ProductError("WOO_CREDENTIAL_INVALID", "WooCommerce credentials are invalid.", 502);
  return { connection: connection.data, store: store.data, credentials: parseCredential(secret.data) };
}

async function requiredRows(admin, table, columns, storeId, generationId) {
  const result = await admin.from(table).select(columns).eq("store_id", storeId).eq("generation_id", generationId);
  if (result.error) throw result.error;
  return result.data || [];
}

export async function loadCurrentCommerceSnapshot(admin, { storeId, generationId }) {
  if (!storeId || !generationId) throw new ProductError("CURRENT_GENERATION_NOT_FOUND", "A complete current commerce generation is required.", 409);
  const [products, variations, categories, orders] = await Promise.all([
    requiredRows(admin, "commerce_products", "source_id,name,slug,canonical_url,sku,product_type,source_status,regular_price,current_price,sale_price,manage_stock,stock_quantity,stock_status,source_created_at,source_modified_at", storeId, generationId),
    requiredRows(admin, "commerce_variations", "source_id,parent_source_id,sku,attributes,regular_price,current_price,sale_price,manage_stock,stock_quantity,stock_status,source_status,source_created_at,source_modified_at", storeId, generationId),
    requiredRows(admin, "commerce_categories", "source_id,name,slug,parent_source_id", storeId, generationId),
    requiredRows(admin, "commerce_orders", "id,source_id,source_status,recognition_state,currency,source_created_at,source_modified_at,order_total,tax_total,shipping_total,discount_total,refund_total,prices_include_tax", storeId, generationId)
  ]);
  const orderIds = orders.map(row => row.id), productIds = new Map(products.map(row => [row.id, row.source_id])), categoryIds = new Map(categories.map(row => [row.id, row.source_id]));
  const linesResult = orderIds.length ? await admin.from("commerce_order_lines").select("order_id,source_line_id,product_source_id,variation_source_id,quantity,subtotal,total,tax,refunded_quantity,refund_total,refund_tax").in("order_id", orderIds) : { data: [], error: null };
  const adjustmentsResult = orderIds.length ? await admin.from("commerce_order_adjustments").select("order_id,adjustment_type,provider_adjustment_id,amount,product_source_id,variation_source_id").in("order_id", orderIds) : { data: [], error: null };
  if (linesResult.error) throw linesResult.error;
  if (adjustmentsResult.error) throw adjustmentsResult.error;
  const orderSource = new Map(orders.map(row => [row.id, row.source_id]));
  const lines = (linesResult.data || []).map(row => ({ ...row, order_source_id: orderSource.get(row.order_id) })).map(({ order_id, ...row }) => row);
  const adjustments = (adjustmentsResult.data || []).map(row => ({ ...row, order_source_id: orderSource.get(row.order_id) })).map(({ order_id, ...row }) => row);
  const linksResult = await admin.from("commerce_product_categories").select("product_id,category_id").eq("store_id", storeId).eq("generation_id", generationId);
  if (linksResult.error) throw linksResult.error;
  const links = (linksResult.data || []).map(row => ({ product_source_id: productIds.get(row.product_id), category_source_id: categoryIds.get(row.category_id) })).filter(row => row.product_source_id && row.category_source_id);
  return { products, variations, categories, links, orders: orders.map(({ id, ...row }) => row), lines, adjustments };
}

export async function assertWooSyncActive(admin, { connectionId, storeId, generationId }) {
  const connection = await admin.from("connections").select("id,business_id,provider_type,status,consent_state").eq("id", connectionId).maybeSingle();
  const store = await admin.from("commerce_stores").select("id,business_id,connection_id,provider").eq("id", storeId).maybeSingle();
  const generation = await admin.from("commerce_sync_generations").select("id,store_id,state").eq("id", generationId).maybeSingle();
  if (connection.error || store.error || generation.error || !connection.data || !store.data || !generation.data || connection.data.provider_type !== "woocommerce" || connection.data.status !== "connected" || connection.data.consent_state !== "granted" || store.data.business_id !== connection.data.business_id || store.data.connection_id !== connection.data.id || store.data.provider !== "woocommerce" || generation.data.store_id !== store.data.id || generation.data.state !== "pending") throw new ProductError("SYNC_CANCELLED", "WooCommerce evidence sync is no longer active.", 409);
  return true;
}
