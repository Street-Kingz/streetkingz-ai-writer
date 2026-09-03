import fs from "node:fs/promises";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const mode = args.get("--mode");
const statePath = args.get("--state");
const snapshotPath = args.get("--snapshot");
if (!mode || !statePath) throw new Error("--mode and --state are required");
const required = name => process.env[name] || (() => { throw new Error(`${name} required`); })();
const admin = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { autoRefreshToken: false, persistSession: false } });
const execFileAsync = promisify(execFile);

const readState = async () => JSON.parse(await fs.readFile(statePath, "utf8"));
const writeState = state => fs.writeFile(statePath, JSON.stringify(state), { mode: 0o600 });
const fail = (label, result) => { if (result?.error) throw new Error(`${label} failed: ${result.error.code || result.error.message || "database error"}`); return result.data; };
const get = async (table, columns, field, value) => fail(table, await admin.from(table).select(columns).eq(field, value).single());
const many = async (table, columns, field, value) => fail(table, await admin.from(table).select(columns).eq(field, value));
const related = async (table, columns, field, values) => values.length ? fail(table, await admin.from(table).select(columns).in(field, values)) : [];
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const hash = value => crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
const sqlLiteral = value => value == null ? "null" : typeof value === "object" ? `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb` : typeof value === "boolean" ? String(value) : typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const directSql = async (sql) => {
  const container = required("P4_DB_CONTAINER");
  const query = `begin; set local role service_role; set local request.jwt.claim.role = 'service_role'; ${sql}; commit;`;
  let result;
  try { result = await execFileAsync("docker", ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atq", "-c", query], { maxBuffer: 4 * 1024 * 1024 }); }
  catch (error) { throw new Error(`direct database function failed: ${error.stderr?.match(/ERROR:\s+([^\n]+)/)?.[1] || "database error"}`); }
  return result.stdout.trim().split("\n").filter(Boolean).at(-1) || "";
};
const rpc = async (name, params) => {
  if (process.env.P4_DB_CONTAINER) {
    const args = Object.entries(params).map(([key, value]) => `${key} => ${sqlLiteral(value)}`).join(", ");
    const select = ["organic_ensure_source", "organic_begin_run"].includes(name) ? `row_to_json(public.${name}(${args}))` : `public.${name}(${args})`;
    const raw = await directSql(`select ${select}`);
    if (!raw) return true;
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return fail(name, await admin.rpc(name, params));
};

async function projection(state) {
  const account = await get("accounts", "id,auth_user_id,status", "id", state.accountId);
  const business = await get("businesses", "id,account_id,name,ecommerce_platform,status,connection_status", "id", state.businessId);
  const connection = await get("connections", "id,business_id,provider_type,status,consent_state,connected_at,secret_reference", "id", state.connectionId);
  const store = await get("commerce_stores", "id,business_id,connection_id,provider,canonical_base_url,source_home_url,source_site_url,source_version,timezone,currency,sync_state,current_generation,last_attempted_at,last_successful_at", "id", state.storeId);
  const generation = await get("commerce_sync_generations", "id,store_id,state,snapshot_kind,started_at,completed_at", "id", state.generationId);
  const products = await many("commerce_products", "source_id,name,slug,product_type,source_status,current_price", "generation_id", state.generationId);
  const categories = await many("commerce_categories", "source_id,name,slug,parent_source_id", "generation_id", state.generationId);
  const links = await many("commerce_product_categories", "product_id,category_id,store_id,generation_id", "generation_id", state.generationId);
  const orders = await many("commerce_orders", "source_id,source_status,recognition_state,currency,order_total,tax_total,shipping_total,discount_total,refund_total,prices_include_tax", "generation_id", state.generationId);
  const orderRows = await many("commerce_orders", "id", "generation_id", state.generationId);
  const lines = await related("commerce_order_lines", "order_id,source_line_id,product_source_id,variation_source_id,quantity,subtotal,total,tax,refund_total", "order_id", orderRows.map(row => row.id));
  const source = await get("organic_evidence_sources", "id,business_id,source_class,source_kind,provider_id,connection_id,evidence_state,current_complete_run,current_completeness_state,evidence_as_of,last_attempted_at,last_successful_at,active_run", "id", state.sourceId);
  const run = await get("organic_evidence_runs", "id,source_id,business_id,state,completeness_state,evidence_period_start,evidence_period_end,retrieved_at,completed_at,evidence_as_of,source_version,error_code", "id", state.runId);
  const secret = process.env.P4_DB_CONTAINER ? await rpc("vault_read_secret", { secret_id: connection.secret_reference }) : fail("vault read", await admin.rpc("vault_read_secret", { secret_id: connection.secret_reference }));
  if (secret == null) throw new Error("active Woo secret unreadable");
  return {
    account: { id: account.id, auth_user_id: account.auth_user_id, status: account.status },
    business: { id: business.id, account_id: business.account_id, ecommerce_platform: business.ecommerce_platform, status: business.status, connection_status: business.connection_status },
    connection: { id: connection.id, business_id: connection.business_id, provider_type: connection.provider_type, status: connection.status, consent_state: connection.consent_state, connected_at: connection.connected_at, active_secret_present: Boolean(connection.secret_reference) },
    store, generation,
    commerce: { products, categories, links, orders, lines },
    organic: { source, run },
    vault: { active_woo_reference_stable: connection.secret_reference === state.wooSecretReference, active_woo_secret_readable: true, active_woo_secret_content_hash: hash(process.env.P4_DB_CONTAINER ? secret : secret.data) }
  };
}

async function seed() {
  const email = `v104-p4-preserve-${crypto.randomUUID()}@local.test`;
  const password = `${crypto.randomUUID()}!Aa9`;
  const user = fail("auth user", await admin.auth.admin.createUser({ email, password, email_confirm: true }));
  const caller = createClient(required("SUPABASE_URL"), required("SUPABASE_PUBLISHABLE_KEY"), { auth: { autoRefreshToken: false, persistSession: false } });
  const session = fail("sign in", await caller.auth.signInWithPassword({ email, password }));
  const userClient = createClient(required("SUPABASE_URL"), required("SUPABASE_PUBLISHABLE_KEY"), { global: { headers: { authorization: `Bearer ${session.session.access_token}` } }, auth: { autoRefreshToken: false, persistSession: false } });
  const account = await userClient.rpc("product_create_account", { p_correlation_id: crypto.randomUUID() });
  const business = await userClient.rpc("product_create_business", { p_name: "P4 persistent upgrade fixture", p_platform: "woocommerce", p_correlation_id: crypto.randomUUID() });
  const connection = await userClient.rpc("product_create_connection", { p_provider_type: "woocommerce", p_correlation_id: crypto.randomUUID() });
  const accountId = fail("account", account)?.id || (await get("accounts", "id", "auth_user_id", user.user.id)).id;
  const businessId = fail("business", business).id;
  const connectionId = fail("connection", connection).id;
  const attemptToken = `p4-preserve-${crypto.randomUUID()}`;
  const attemptId = await rpc("woo_create_auth_attempt", { p_user_id: attemptToken, p_account_id: accountId, p_business_id: businessId, p_connection_id: connectionId, p_canonical_base_url: "https://preservation.example/shop/", p_expires_at: new Date(Date.now() + 600000).toISOString() });
  await rpc("woo_claim_auth_attempt", { p_user_id: attemptToken });
  await rpc("woo_capture_callback", { p_attempt_id: attemptId, p_consumer_key: "p4-synthetic-key", p_consumer_secret: "p4-synthetic-secret", p_key_permissions: "read" });
  const storeId = await rpc("woo_complete_connection", { p_attempt_id: attemptId, p_home_url: "https://preservation.example/shop/", p_site_url: "https://preservation.example/shop/", p_version: "p4", p_timezone: "UTC", p_currency: "GBP", p_correlation_id: crypto.randomUUID() });
  const conn = await get("connections", "secret_reference", "id", connectionId);
  const generationId = await rpc("commerce_begin_initial_sync", { p_store_id: storeId, p_correlation_id: crypto.randomUUID() });
  await rpc("commerce_stage_initial_snapshot", { p_store_id: storeId, p_generation_id: generationId, p_products: [{ source_id: 7001, name: "P4 preserved product", slug: "p4-preserved-product", product_type: "simple", source_status: "publish", current_price: "12.50" }], p_variations: [], p_categories: [{ source_id: 7002, name: "P4 preserved category", slug: "p4-preserved-category", parent_source_id: null }], p_links: [{ product_source_id: 7001, category_source_id: 7002 }], p_orders: [{ source_id: 7003, source_status: "completed", recognition_state: "recognised", currency: "GBP", order_total: "12.50", tax_total: "2.08", shipping_total: "0", discount_total: "0", refund_total: "0", prices_include_tax: false }], p_lines: [{ order_source_id: 7003, source_line_id: 7004, product_source_id: 7001, variation_source_id: null, quantity: 1, subtotal: "10.42", total: "10.42", tax: "2.08", refunded_quantity: 0, refund_total: "0", refund_tax: "0" }], p_adjustments: [] });
  await rpc("commerce_complete_initial_sync", { p_store_id: storeId, p_generation_id: generationId });
  const source = await rpc("organic_ensure_source", { p_business_id: businessId, p_source_class: "no_separate_connection", p_source_kind: "site" });
  const run = await rpc("organic_begin_run", { p_source_id: source.id, p_correlation_id: crypto.randomUUID(), p_retrieved_at: "2026-09-02T10:00:00Z", p_source_version: "p4-fixture" });
  const runId = run.id;
  await rpc("organic_finish_run", { p_run_id: runId, p_state: "complete", p_completeness_state: "complete", p_evidence_as_of: "2026-09-01T00:00:00Z" });
  const state = { userId: user.user.id, accountId, businessId, connectionId, storeId, generationId, sourceId: source.id, runId, wooSecretReference: conn.secret_reference, email, password };
  await writeState(state);
  if (snapshotPath) await fs.writeFile(snapshotPath, JSON.stringify(await projection(state)), { mode: 0o600 });
  return state;
}

if (mode === "seed") { await seed(); console.log("preservation-seed=PASS"); }
else if (mode === "snapshot-before" || mode === "snapshot-after") {
  const state = await readState();
  const value = await projection(state);
  const out = snapshotPath || `${statePath}.${mode}.json`;
  await fs.writeFile(out, JSON.stringify(value), { mode: 0o600 });
  await fs.writeFile(`${out}.sha256`, `${hash(value)}\n`, { mode: 0o600 });
  console.log(`${mode}=PASS`);
}
else if (mode === "cleanup") {
  const state = await readState();
  const refs = new Set([state.wooSecretReference]);
  for (const ref of refs) if (ref) await rpc("vault_delete_secret", { secret_id: ref });
  fail("auth delete", await admin.auth.admin.deleteUser(state.userId));
  for (const table of ["accounts", "businesses", "connections", "commerce_stores", "organic_evidence_sources"]) {
    const result = await admin.from(table).select("id").eq("id", state[table === "accounts" ? "accountId" : table === "businesses" ? "businessId" : table === "connections" ? "connectionId" : table === "commerce_stores" ? "storeId" : "sourceId"]);
    if (result.error || result.data.length) throw new Error(`${table} residue`);
  }
  console.log("preservation-cleanup=PASS");
}
else throw new Error(`unknown mode: ${mode}`);
