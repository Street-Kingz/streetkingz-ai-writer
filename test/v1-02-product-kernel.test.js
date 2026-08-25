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
  assert.equal(internal.body.error.message, "An internal error occurred.");
  assert.doesNotMatch(JSON.stringify(internal), /secret/);
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
  assert.match(sql, /revoke insert, update, delete on public\.audit_events/);
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
  await assert.rejects(() => deleteVaultSecret({ rpc: async () => ({ error: new Error("provider failure") }) }, "opaque-ref"), /secret removal failed/);
});
