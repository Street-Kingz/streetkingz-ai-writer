import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseBearer } from "../product-kernel/auth.js";
import { assertConnectionTransition, assertConsentState } from "../product-kernel/constants.js";
import { safeError, ProductError } from "../product-kernel/errors.js";
import { createVaultSecret, deleteVaultSecret } from "../product-kernel/vault.js";
import { productKernelConfig } from "../config/productKernel.js";

test("V1-02 auth header parser accepts bearer tokens and rejects malformed input", () => {
  assert.equal(parseBearer("Bearer token"), "token");
  assert.throws(() => parseBearer(), /Authentication is required/);
  assert.throws(() => parseBearer("Basic token"), /Malformed bearer/);
});
test("V1-02 connection state machine is bounded", () => {
  assert.equal(assertConnectionTransition("pending", "connected"), true);
  assert.throws(() => assertConnectionTransition("connected", "pending"), /Invalid connection/);
  assert.doesNotThrow(() => assertConsentState("granted"));
  assert.throws(() => assertConsentState("anything"), /Invalid consent/);
});
test("V1-02 safe errors expose bounded diagnostics only", () => {
  const result = safeError(new ProductError("AUTH_INVALID", "bad token", 401), "corr");
  assert.deepEqual(result.body, { error: { code: "AUTH_INVALID", message: "bad token", correlation_id: "corr" } });
  const internal = safeError(new Error("password=secret"), "corr");
  const database = safeError(Object.assign(new Error("permission denied for table connections"), { code: "42501", details: "secret detail" }), "corr");
  assert.equal(internal.body.error.message, "An internal error occurred.");
  assert.doesNotMatch(JSON.stringify(internal), /secret/);
  assert.deepEqual(database, { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "An internal error occurred.", correlation_id: "corr" } } });
});
test("V1-02 configuration requires Supabase values without printing them", () => {
  assert.throws(() => productKernelConfig({}), /SUPABASE_URL/);
  const config = productKernelConfig({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public" });
  assert.deepEqual(Object.keys(config), ["url", "publishableKey"]);
  assert.equal(productKernelConfig({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public", SUPABASE_SERVICE_ROLE_KEY: "private" }, { privileged: true }).privilegedKey, "private");
});
test("V1-02 migration declares one-business, RLS and audit protections", () => {
  const sql = fs.readFileSync(new URL("../supabase/migrations/20260825000000_v1_02_product_kernel.sql", import.meta.url), "utf8");
  assert.match(sql, /account_id uuid not null unique references public\.accounts/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on public\.accounts, public\.businesses, public\.connections, public\.audit_events from authenticated/);
  assert.match(sql, /grant select on public\.accounts, public\.businesses, public\.audit_events to authenticated/);
  assert.match(sql, /grant select \(id,business_id,provider_type,status,consent_state,[^)]+\) on public\.connections to authenticated/);
  assert.match(sql, /product_transition_connection[\s\S]*security definer set search_path = ''/);
  assert.match(sql, /product_create_connection[\s\S]*returns jsonb/);
  assert.match(sql, /product_transition_connection[\s\S]*returns jsonb/);
  assert.doesNotMatch(sql.match(/product_transition_connection[\s\S]*?end \$\$;/)?.[0] || "", /to_jsonb\(v_row\)/);
  assert.match(sql, /business_deletion_requested/);
  assert.match(sql, /revoke all on function public\.set_product_updated_at\(\) from public, anon, authenticated/);
  assert.match(sql, /auth_user_id uuid not null unique/);
});
test("V1-02 privileged boundary is separate from caller-scoped auth", () => {
  const source = fs.readFileSync(new URL("../product-kernel/privileged.js", import.meta.url), "utf8");
  const route = fs.readFileSync(new URL("../routes/productKernel.js", import.meta.url), "utf8");
  assert.match(source, /privilegedKey/);
  assert.match(route, /callerClient/);
  assert.match(route, /privilegedClient/);
  assert.doesNotMatch(route, /getSession\(/);
});
test("V1-02 Vault deletion fails closed and never exposes secret material", async () => {
  const created = await createVaultSecret({ rpc: async (_name, args) => ({ data: { id: "opaque-id" }, args }) }, "synthetic-secret");
  assert.deepEqual(created, { secretReference: "opaque-id" });
  assert.deepEqual(await deleteVaultSecret({ rpc: async () => ({ data: true }) }, "opaque-ref"), { deleted: true });
  assert.deepEqual(await deleteVaultSecret({ rpc: async () => ({ data: null }) }, "missing-ref"), { deleted: true });
  await assert.rejects(() => deleteVaultSecret({ rpc: async () => ({ error: new Error("provider failure") }) }, "opaque-ref"), /secret removal failed/);
});
test("V1-02 disconnect is an atomic caller-scoped RPC and audits failures", () => {
  const route = fs.readFileSync(new URL("../routes/productKernel.js", import.meta.url), "utf8");
  const sql = fs.readFileSync(new URL("../supabase/migrations/20260825000000_v1_02_product_kernel.sql", import.meta.url), "utf8");
  assert.match(route, /client\.rpc\("product_transition_connection"/);
  assert.match(sql, /delete from vault\.secrets where id=v_row\.secret_reference/);
  assert.match(sql, /secret_reference=case when p_status='disconnected' then null/);
  assert.match(sql, /insert into public\.audit_events[\s\S]*connection_disconnected/);
  assert.doesNotMatch(route, /\.from\("connections"\)\.update/);
});

test("V1-02 portable recovery sanitisation fails stale credentials closed", () => {
  const sql = fs.readFileSync(new URL("../scripts/v1-02-sanitise-logical-recovery.sql", import.meta.url), "utf8");
  assert.match(sql, /^begin;/m);
  assert.match(sql, /where c\.secret_reference is not null/);
  assert.match(sql, /revoke all on public\.accounts, public\.businesses, public\.connections, public\.audit_events from anon, authenticated/);
  assert.match(sql, /grant select \([\s\S]*updated_at[\s\S]*\) on public\.connections to authenticated/);
  assert.match(sql, /product_create_account\(uuid\) to authenticated/);
  assert.match(sql, /product_cleanup_account\(uuid, uuid\) to service_role/);
  assert.match(sql, /status = 'disconnected'/);
  assert.match(sql, /consent_state = 'revoked'/);
  assert.match(sql, /secret_reference = null/);
  assert.match(sql, /REAUTHORISATION_REQUIRED_AFTER_RECOVERY/);
  assert.match(sql, /connection_status = 'disconnected'/);
  assert.match(sql, /connection_invalidated_after_recovery/);
  assert.match(sql, /^commit;/m);
  assert.doesNotMatch(sql, /vault\./i);
});
