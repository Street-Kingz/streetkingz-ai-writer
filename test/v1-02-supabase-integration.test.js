import test from "node:test";
import assert from "node:assert/strict";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import app from "../app.js";
import { verifyIdentity } from "../product-kernel/auth.js";
import { createVaultSecret, deleteVaultSecret } from "../product-kernel/vault.js";

const execFileAsync = promisify(execFile);
const enabled = process.env.V1_02_INTEGRATION === "1";
const required = name => { const value = process.env[name]; if (!value) throw new Error(`${name} is required for the V1-02 integration proof.`); return value; };

test("V1-02 hardened real Supabase boundary", { skip: !enabled }, async t => {
  const url = required("SUPABASE_URL");
  const publishableKey = required("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `V1-02-${crypto.randomUUID()}!aA7`;
  const users = [];
  let server;
  let baseUrl;
  const psql = sql => execFileAsync("docker", ["exec", "supabase_db_streetkingz-ai-writer", "psql", "-U", "supabase_admin", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql]);
  const startApi = async () => { server = app.listen(0, "127.0.0.1"); await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); }); baseUrl = `http://127.0.0.1:${server.address().port}`; };
  const stopApi = async () => { if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); server = undefined; };
  const request = async (token, method, path, body, headers = {}) => {
    const response = await fetch(`${baseUrl}${path}`, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text(); return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null };
  };
  await startApi();
  t.after(async () => { await stopApi(); for (const id of users) await admin.auth.admin.deleteUser(id); });

  const identities = [];
  for (const label of ["a", "b"]) {
    const email = `v1-02-${label}-${stamp}@example.test`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true }); assert.ifError(createError); users.push(created.user.id);
    const caller = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: signedIn, error: signInError } = await caller.auth.signInWithPassword({ email, password }); assert.ifError(signInError);
    const verified = await verifyIdentity(signedIn.session.access_token); assert.equal(verified.authUserId, created.user.id);
    identities.push({ id: created.user.id, email, token: signedIn.session.access_token, refreshToken: signedIn.session.refresh_token, caller });
  }
  const [a, b] = identities;

  const { data: renewed, error: renewError } = await b.caller.auth.refreshSession({ refresh_token: b.refreshToken }); assert.ifError(renewError); assert.equal((await verifyIdentity(renewed.session.access_token)).authUserId, b.id); b.token = renewed.session.access_token;
  assert.ifError((await b.caller.auth.signOut()).error);
  assert.ok((await b.caller.auth.refreshSession({ refresh_token: renewed.session.refresh_token })).error);
  assert.equal((await verifyIdentity(b.token)).authUserId, b.id); // Managed sign-out revokes refresh state; an issued JWT remains valid until expiry.

  const noAuth = await request(null, "GET", "/api/product/account"); assert.equal(noAuth.status, 401); assert.equal(noAuth.body.error.code, "AUTH_REQUIRED");
  const badBearer = await request(null, "GET", "/api/product/account", undefined, { authorization: "Basic unsafe" }); assert.equal(badBearer.status, 401); assert.equal(badBearer.body.error.code, "AUTH_INVALID");
  const badToken = await request("not-a-jwt", "GET", "/api/product/account"); assert.equal(badToken.status, 401); assert.equal(badToken.body.error.code, "AUTH_INVALID");
  const malformedResponse = await fetch(`${baseUrl}/api/product/business`, { method: "POST", headers: { authorization: `Bearer ${a.token}`, "content-type": "application/json", "x-correlation-id": "caller-controlled" }, body: "{" });
  const malformed = await malformedResponse.json(); assert.equal(malformedResponse.status, 400); assert.equal(malformed.error.code, "INVALID_REQUEST"); assert.match(malformed.error.correlation_id, /^[0-9a-f-]{36}$/i); assert.notEqual(malformed.error.correlation_id, "caller-controlled");
  const oversizedResponse = await fetch(`${baseUrl}/api/product/business`, { method: "POST", headers: { authorization: `Bearer ${a.token}`, "content-type": "application/json" }, body: JSON.stringify({ name: "x".repeat(110 * 1024) }) });
  const oversized = await oversizedResponse.json(); assert.equal(oversizedResponse.status, 413); assert.equal(oversized.error.code, "PAYLOAD_TOO_LARGE"); assert.match(oversized.error.correlation_id, /^[0-9a-f-]{36}$/i); assert.doesNotMatch(JSON.stringify(oversized), /node_modules|body-parser|\/Users\/|xxxxx/i);

  const racing = await Promise.all([request(a.token, "POST", "/api/product/account", {}), request(a.token, "POST", "/api/product/account", {})]);
  assert.deepEqual(racing.map(result => result.status).sort(), [200, 201], JSON.stringify(racing));
  a.account = racing[0].body.account;
  const repeatedAccount = await request(a.token, "POST", "/api/product/account", {}); assert.equal(repeatedAccount.status, 200); assert.equal(repeatedAccount.body.account.id, a.account.id);
  const bAccount = await request(b.token, "POST", "/api/product/account", {}); assert.equal(bAccount.status, 201); b.account = bAccount.body.account;

  for (const identity of identities) {
    const business = await request(identity.token, "POST", "/api/product/business", { name: `Business ${identity.id.slice(0, 8)}`, ecommerce_platform: "woocommerce" }); assert.equal(business.status, 201, JSON.stringify(business.body)); identity.business = business.body.business;
    const connection = await request(identity.token, "POST", "/api/product/connections", { provider_type: "synthetic" }); assert.equal(connection.status, 201, JSON.stringify(connection.body)); assert.equal(Object.hasOwn(connection.body.connection, "secret_reference"), false); identity.connection = connection.body.connection;
  }
  const directCreate = await a.caller.rpc("product_create_connection", { p_provider_type: "direct-safe-probe", p_correlation_id: crypto.randomUUID() }); assert.ifError(directCreate.error); assert.equal(Object.hasOwn(directCreate.data, "secret_reference"), false); assert.ifError((await admin.from("connections").delete().eq("id", directCreate.data.id)).error);
  assert.equal((await request(a.token, "POST", "/api/product/business", { name: "second" })).body.error.code, "BUSINESS_LIMIT_REACHED");
  assert.equal((await request(a.token, "POST", "/api/product/connections", { provider_type: "synthetic" })).body.error.code, "CONNECTION_EXISTS");
  for (const body of [{ name: "" }, { name: "x".repeat(201) }, { name: "ok", ecommerce_platform: {} }]) assert.equal((await request(a.token, "POST", "/api/product/business", body)).status, 400);
  for (const value of [{}, "", "x".repeat(65)]) assert.equal((await request(a.token, "POST", "/api/product/connections", { provider_type: value })).status, 400);
  assert.equal((await request(a.token, "PATCH", "/api/product/connections/not-a-uuid", { status: "connected", consent_state: "granted" })).status, 400);
  assert.equal((await request(a.token, "PATCH", `/api/product/connections/${a.connection.id}`, { status: "connected", consent_state: "unsupported" })).status, 409);

  const rpcProbePlaintext = `rpc-probe-${crypto.randomUUID()}`;
  const rpcProbeSecret = await createVaultSecret(admin, rpcProbePlaintext, `rpc-probe-${stamp}`);
  assert.ifError((await admin.from("connections").update({ secret_reference: rpcProbeSecret.secretReference }).eq("id", a.connection.id)).error);
  const rpcProbe = await a.caller.rpc("product_transition_connection", { p_connection_id: a.connection.id, p_status: "connected", p_consent_state: "granted", p_correlation_id: crypto.randomUUID() });
  assert.ifError(rpcProbe.error);
  assert.equal(Object.hasOwn(rpcProbe.data, "secret_reference"), false);
  assert.ok(!JSON.stringify(rpcProbe.data).includes(rpcProbeSecret.secretReference));
  assert.ok(!JSON.stringify(rpcProbe.data).includes(rpcProbePlaintext));
  assert.equal((await admin.rpc("vault_read_secret", { secret_id: rpcProbeSecret.secretReference })).data, rpcProbePlaintext);
  assert.ifError((await a.caller.rpc("product_transition_connection", { p_connection_id: a.connection.id, p_status: "error", p_consent_state: "granted", p_correlation_id: crypto.randomUUID() })).error);
  assert.ifError((await a.caller.rpc("product_transition_connection", { p_connection_id: a.connection.id, p_status: "pending", p_consent_state: "pending", p_correlation_id: crypto.randomUUID() })).error);

  const denied = [
    a.caller.from("businesses").delete().eq("id", a.business.id),
    a.caller.from("accounts").update({ status: "deleted" }).eq("id", a.account.id),
    a.caller.from("accounts").delete().eq("id", a.account.id),
    a.caller.from("connections").update({ status: "connected" }).eq("id", a.connection.id),
    a.caller.from("connections").update({ consent_state: "granted", secret_reference: crypto.randomUUID(), safe_error_message: "unsafe" }).eq("id", a.connection.id),
    a.caller.from("connections").insert({ business_id: a.business.id, provider_type: "bypass", status: "connected" }),
    a.caller.from("connections").delete().eq("id", a.connection.id),
    a.caller.from("audit_events").insert({ account_id: a.account.id, event_type: "forged", correlation_id: "forged" }),
    a.caller.from("audit_events").update({ event_type: "forged" }).eq("account_id", a.account.id),
    a.caller.from("audit_events").delete().eq("account_id", a.account.id)
  ];
  for (const operation of denied) assert.ok((await operation).error);
  assert.ok((await a.caller.from("connections").select("secret_reference").eq("id", a.connection.id)).error);
  assert.ok((await a.caller.rpc("product_transition_connection", { p_connection_id: a.connection.id, p_status: "connected", p_consent_state: "revoked", p_correlation_id: crypto.randomUUID() })).error);
  assert.ok((await a.caller.rpc("product_transition_connection", { p_connection_id: b.connection.id, p_status: "connected", p_consent_state: "granted", p_correlation_id: crypto.randomUUID() })).error);
  assert.ok((await a.caller.rpc("product_cleanup_account", { p_auth_user_id: a.id, p_correlation_id: crypto.randomUUID() })).error);
  assert.deepEqual((await a.caller.from("businesses").select("id").eq("id", b.business.id)).data, []);
  assert.deepEqual((await a.caller.from("connections").select("id").eq("id", b.connection.id)).data, []);
  assert.deepEqual((await a.caller.from("audit_events").select("id").eq("account_id", b.account.id)).data, []);
  assert.equal((await request(a.token, "PATCH", `/api/product/connections/${b.connection.id}`, { status: "connected", consent_state: "granted" })).status, 404);
  assert.ok((await a.caller.rpc("vault_read_secret", { secret_id: crypto.randomUUID() })).error);

  const rpcProbeDisconnect = await request(a.token, "PATCH", `/api/product/connections/${a.connection.id}`, { status: "disconnected", consent_state: "revoked" }); assert.equal(rpcProbeDisconnect.status, 200); assert.equal(Object.hasOwn(rpcProbeDisconnect.body.connection, "secret_reference"), false); assert.equal((await admin.rpc("vault_read_secret", { secret_id: rpcProbeSecret.secretReference })).data, null); assert.equal((await admin.from("connections").select("secret_reference").eq("id", a.connection.id).single()).data.secret_reference, null);

  const connected = await request(b.token, "PATCH", `/api/product/connections/${b.connection.id}`, { status: "connected", consent_state: "granted" }); assert.equal(connected.status, 200); assert.ok(connected.body.connection.connected_at); assert.notEqual(connected.body.connection.updated_at, b.connection.updated_at);
  const disconnectPlaintext = `disconnect-${crypto.randomUUID()}`; const disconnectSecret = await createVaultSecret(admin, disconnectPlaintext, `disconnect-${stamp}`); assert.ifError((await admin.from("connections").update({ secret_reference: disconnectSecret.secretReference }).eq("id", b.connection.id)).error);
  const disconnected = await request(b.token, "PATCH", `/api/product/connections/${b.connection.id}`, { status: "disconnected", consent_state: "revoked" }); assert.equal(disconnected.status, 200); assert.ok(disconnected.body.connection.disconnected_at); assert.equal(Object.hasOwn(disconnected.body.connection, "secret_reference"), false); assert.equal((await admin.rpc("vault_read_secret", { secret_id: disconnectSecret.secretReference })).data, null);
  const disconnectedDb = (await admin.from("connections").select("status,consent_state,secret_reference,connected_at,disconnected_at,updated_at").eq("id", b.connection.id).single()).data; assert.equal(disconnectedDb.secret_reference, null); assert.ok(disconnectedDb.connected_at); assert.ok(disconnectedDb.disconnected_at);
  assert.equal((await request(b.token, "PATCH", `/api/product/connections/${b.connection.id}`, { status: "connected", consent_state: "granted" })).status, 409);

  const absentSecret = await createVaultSecret(admin, `absent-${crypto.randomUUID()}`, `absent-${stamp}`); assert.ifError((await admin.from("connections").update({ secret_reference: absentSecret.secretReference }).eq("id", a.connection.id)).error); await deleteVaultSecret(admin, absentSecret.secretReference);
  const absentRetry = await request(a.token, "PATCH", `/api/product/connections/${a.connection.id}`, { status: "disconnected", consent_state: "revoked" }); assert.equal(absentRetry.status, 200); assert.equal((await admin.from("connections").select("secret_reference").eq("id", a.connection.id).single()).data.secret_reference, null);

  assert.equal((await request(a.token, "PATCH", `/api/product/connections/${a.connection.id}`, { status: "pending", consent_state: "pending" })).status, 200);
  const failurePlaintext = `failure-${crypto.randomUUID()}`; const failureSecret = await createVaultSecret(admin, failurePlaintext, `failure-${stamp}`); assert.ifError((await admin.from("connections").update({ secret_reference: failureSecret.secretReference }).eq("id", a.connection.id)).error);
  await psql("alter table vault.secrets rename to secrets_v102_failure");
  let failedDisconnect;
  try { failedDisconnect = await request(a.token, "PATCH", `/api/product/connections/${a.connection.id}`, { status: "disconnected", consent_state: "revoked" }); } finally { await psql("alter table vault.secrets_v102_failure rename to secrets"); }
  assert.equal(failedDisconnect.status, 503); assert.equal(failedDisconnect.body.error.code, "SECRET_OPERATION_FAILED"); assert.doesNotMatch(JSON.stringify(failedDisconnect.body), /failure-|authorization|bearer|password/i);
  const recoverable = (await admin.from("connections").select("status,consent_state,secret_reference").eq("id", a.connection.id).single()).data; assert.deepEqual(recoverable, { status: "pending", consent_state: "pending", secret_reference: failureSecret.secretReference });
  assert.equal((await request(a.token, "PATCH", `/api/product/connections/${a.connection.id}`, { status: "disconnected", consent_state: "revoked" })).status, 200); assert.equal((await admin.rpc("vault_read_secret", { secret_id: failureSecret.secretReference })).data, null);

  await psql("revoke select on public.connections from authenticated");
  let rawDbFailure;
  try { rawDbFailure = await request(b.token, "GET", "/api/product/connections"); } finally { await psql("grant select (id,business_id,provider_type,status,consent_state,connected_at,disconnected_at,last_success_at,safe_error_code,safe_error_message,created_at,updated_at) on public.connections to authenticated"); }
  assert.equal(rawDbFailure.status, 500); assert.deepEqual(rawDbFailure.body.error.message, "An internal error occurred."); assert.doesNotMatch(JSON.stringify(rawDbFailure.body), /permission|table|postgres|grant/i);

  const auditA = await request(a.token, "GET", "/api/product/audit-events"); const auditB = await request(b.token, "GET", "/api/product/audit-events"); assert.equal(auditA.status, 200); assert.equal(auditB.status, 200);
  const audits = JSON.stringify([...auditA.body.events, ...auditB.body.events]); assert.doesNotMatch(audits, /authorization|bearer|password|permission denied|postgres/i); assert.ok(!audits.includes(disconnectPlaintext)); assert.ok(!audits.includes(failurePlaintext));
  assert.ok(auditA.body.events.some(event => event.event_type === "secret_operation_failed")); assert.ok(auditA.body.events.every(event => /^[0-9a-f-]{36}$/i.test(event.correlation_id)));
  for (const requiredEvent of ["account_created", "business_created", "connection_created", "connection_status_changed", "connection_disconnected"]) assert.ok([...auditA.body.events, ...auditB.body.events].some(event => event.event_type === requiredEvent));

  await stopApi(); await startApi(); const durable = await request(b.token, "GET", "/api/product/business"); assert.equal(durable.status, 200); assert.equal(durable.body.business.id, b.business.id); assert.equal(durable.body.business.connection_status, "disconnected");

  const deletionSecret = await createVaultSecret(admin, `deletion-${crypto.randomUUID()}`, `delete-${stamp}`); assert.ifError((await admin.from("connections").update({ secret_reference: deletionSecret.secretReference }).eq("id", a.connection.id)).error);
  const deletionRequest = await a.caller.rpc("product_request_account_deletion", { p_correlation_id: crypto.randomUUID() }); assert.ifError(deletionRequest.error); assert.equal(deletionRequest.data.status, "deletion_requested");
  assert.equal((await admin.from("businesses").select("status").eq("id", a.business.id).single()).data.status, "deletion_requested");
  const requestAudits = (await admin.from("audit_events").select("event_type,business_id").eq("account_id", a.account.id).in("event_type", ["account_deletion_requested", "business_deletion_requested"])).data; assert.equal(requestAudits.filter(event => event.event_type === "account_deletion_requested").length, 1); assert.equal(requestAudits.filter(event => event.event_type === "business_deletion_requested" && event.business_id === a.business.id).length, 1);
  assert.ifError((await a.caller.rpc("product_request_account_deletion", { p_correlation_id: crypto.randomUUID() })).error);
  const retriedRequestAudits = (await admin.from("audit_events").select("event_type").eq("account_id", a.account.id).in("event_type", ["account_deletion_requested", "business_deletion_requested"])).data; assert.equal(retriedRequestAudits.length, 2);
  assert.equal((await request(a.token, "POST", "/api/product/connections", { provider_type: "blocked" })).body.error.code, "ACCOUNT_NOT_ACTIVE");
  await psql("create or replace function public.v102_block_auth_delete() returns trigger language plpgsql as $$ begin raise exception 'controlled auth deletion failure'; end $$; create trigger v102_block_auth_delete before delete on auth.users for each row when (old.id = '" + a.id + "'::uuid) execute function public.v102_block_auth_delete()");
  const partialDelete = await request(a.token, "DELETE", "/api/product/account"); assert.equal(partialDelete.status, 503); assert.equal(partialDelete.body.error.code, "ACCOUNT_DELETION_FAILED");
  const deletionState = (await admin.from("accounts").select("status").eq("id", a.account.id).single()).data; assert.equal(deletionState.status, "deleted"); assert.deepEqual((await admin.from("businesses").select("id").eq("account_id", a.account.id)).data, []); assert.equal((await admin.rpc("vault_read_secret", { secret_id: deletionSecret.secretReference })).data, null);
  assert.ok((await admin.from("audit_events").select("id").eq("account_id", a.account.id).eq("event_type", "account_deletion_failed")).data.length === 1);
  assert.equal((await request(a.token, "POST", "/api/product/business", { name: "resurrection" })).body.error.code, "ACCOUNT_NOT_ACTIVE");
  await psql("drop trigger v102_block_auth_delete on auth.users; drop function public.v102_block_auth_delete()");
  const resumedDelete = await request(a.token, "DELETE", "/api/product/account"); assert.equal(resumedDelete.status, 204); assert.equal((await admin.auth.admin.getUserById(a.id)).data.user, null); assert.deepEqual((await admin.from("accounts").select("id").eq("auth_user_id", a.id)).data, []);
  assert.ok((await a.caller.auth.signInWithPassword({ email: a.email, password })).error);
  assert.ok((await a.caller.auth.refreshSession({ refresh_token: a.refreshToken })).error);
});
