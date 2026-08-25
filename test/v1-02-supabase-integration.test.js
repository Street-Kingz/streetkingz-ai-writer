import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import app from "../app.js";
import { verifyIdentity } from "../product-kernel/auth.js";
import { createVaultSecret, deleteVaultSecret } from "../product-kernel/vault.js";

const enabled = process.env.V1_02_INTEGRATION === "1";
const required = name => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the V1-02 integration proof.`);
  return value;
};

test("V1-02 real Supabase Auth, RLS, Vault, deletion and Product API proof", { skip: !enabled }, async t => {
  const url = required("SUPABASE_URL");
  const publishableKey = required("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `V1-02-${crypto.randomUUID()}!aA7`;
  const users = [];
  let server;
  let baseUrl;

  const startApi = async () => {
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  };
  const stopApi = async () => {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    server = undefined;
  };
  const request = async (token, method, path, body) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  await startApi();
  t.after(async () => {
    await stopApi();
    for (const id of users) await admin.auth.admin.deleteUser(id);
  });

  const identities = [];
  for (const label of ["a", "b"]) {
    const email = `v1-02-${label}-${stamp}@example.test`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.ifError(createError);
    users.push(created.user.id);
    const caller = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: signedIn, error: signInError } = await caller.auth.signInWithPassword({ email, password });
    assert.ifError(signInError);
    assert.ok(signedIn.session.access_token);
    const verified = await verifyIdentity(signedIn.session.access_token);
    assert.equal(verified.authUserId, created.user.id);
    identities.push({ id: created.user.id, email, token: signedIn.session.access_token, caller });
  }
  const [a, b] = identities;

  const unauthenticated = await request(null, "GET", "/api/product/account");
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.body.error.code, "AUTH_REQUIRED");

  for (const identity of identities) {
    const account = await request(identity.token, "POST", "/api/product/account");
    assert.equal(account.status, 201, JSON.stringify(account.body));
    identity.account = account.body.account;
    assert.equal(identity.account.auth_user_id, identity.id);
    const business = await request(identity.token, "POST", "/api/product/business", { name: `Business ${identity.id.slice(0, 8)}`, ecommerce_platform: "woocommerce" });
    assert.equal(business.status, 201, JSON.stringify(business.body));
    identity.business = business.body.business;
    const connection = await request(identity.token, "POST", "/api/product/connections", { provider_type: "synthetic" });
    assert.equal(connection.status, 201, JSON.stringify(connection.body));
    identity.connection = connection.body.connection;
  }

  const secondBusiness = await request(a.token, "POST", "/api/product/business", { name: "Forbidden second business" });
  assert.equal(secondBusiness.status, 409);
  assert.equal(secondBusiness.body.error.code, "BUSINESS_LIMIT_REACHED");

  const { data: crossBusinesses, error: crossBusinessError } = await a.caller.from("businesses").select("id").eq("id", b.business.id);
  assert.ifError(crossBusinessError);
  assert.deepEqual(crossBusinesses, []);
  const { data: crossUpdate, error: crossUpdateError } = await a.caller.from("businesses").update({ name: "tenant escape" }).eq("id", b.business.id).select("id");
  assert.ifError(crossUpdateError);
  assert.deepEqual(crossUpdate, []);
  const { data: crossConnections, error: crossConnectionError } = await a.caller.from("connections").select("id").eq("id", b.connection.id);
  assert.ifError(crossConnectionError);
  assert.deepEqual(crossConnections, []);
  const { data: crossAudits, error: crossAuditError } = await a.caller.from("audit_events").select("id").eq("account_id", b.account.id);
  assert.ifError(crossAuditError);
  assert.deepEqual(crossAudits, []);

  const anon = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: anonData, error: anonError } = await anon.from("accounts").select("id");
  assert.ok(anonError || anonData.length === 0);
  const { error: directVaultDenial } = await a.caller.rpc("vault_read_secret", { secret_id: crypto.randomUUID() });
  assert.ok(directVaultDenial);

  const { error: invalidState } = await admin.from("connections").insert({ business_id: a.business.id, provider_type: "invalid-state-proof", status: "impossible" });
  assert.equal(invalidState?.code, "23514");
  const { error: invalidOwner } = await admin.from("businesses").insert({ account_id: crypto.randomUUID(), name: "invalid owner" });
  assert.equal(invalidOwner?.code, "23503");

  const syntheticSecret = `synthetic-${crypto.randomUUID()}`;
  const { secretReference } = await createVaultSecret(admin, syntheticSecret, `v1-02-${stamp}`);
  assert.match(secretReference, /^[0-9a-f-]{36}$/i);
  const { data: decrypted, error: decryptError } = await admin.rpc("vault_read_secret", { secret_id: secretReference });
  assert.ifError(decryptError);
  assert.equal(decrypted, syntheticSecret);
  await deleteVaultSecret(admin, secretReference);
  const { data: deletedSecret, error: deletedReadError } = await admin.rpc("vault_read_secret", { secret_id: secretReference });
  assert.ifError(deletedReadError);
  assert.equal(deletedSecret, null);

  const transition = await request(b.token, "PATCH", `/api/product/connections/${b.connection.id}`, { status: "connected", consent_state: "granted" });
  assert.equal(transition.status, 200, JSON.stringify(transition.body));
  assert.equal(transition.body.connection.status, "connected");
  const disconnect = await request(b.token, "PATCH", `/api/product/connections/${b.connection.id}`, { status: "disconnected", consent_state: "revoked" });
  assert.equal(disconnect.status, 200, JSON.stringify(disconnect.body));
  assert.equal(disconnect.body.connection.secret_reference, null);

  const auditA = await request(a.token, "GET", "/api/product/audit-events");
  const auditB = await request(b.token, "GET", "/api/product/audit-events");
  assert.equal(auditA.status, 200);
  assert.equal(auditB.status, 200);
  assert.ok(auditA.body.events.length >= 3);
  assert.ok(auditB.body.events.length >= 5);
  assert.ok(auditA.body.events.every(event => !JSON.stringify(event).includes(syntheticSecret)));

  await stopApi();
  await startApi();
  const durable = await request(b.token, "GET", "/api/product/business");
  assert.equal(durable.status, 200, JSON.stringify(durable.body));
  assert.equal(durable.body.business.id, b.business.id);

  const deletionSecret = await createVaultSecret(admin, `deletion-${crypto.randomUUID()}`, `v1-02-delete-${stamp}`);
  const { error: attachError } = await admin.from("connections").update({ secret_reference: deletionSecret.secretReference }).eq("id", a.connection.id);
  assert.ifError(attachError);
  const deletion = await request(a.token, "DELETE", "/api/product/account");
  assert.equal(deletion.status, 204, JSON.stringify(deletion.body));
  const { data: secretAfterDeletion, error: secretAfterDeletionError } = await admin.rpc("vault_read_secret", { secret_id: deletionSecret.secretReference });
  assert.ifError(secretAfterDeletionError);
  assert.equal(secretAfterDeletion, null);
  const { data: authAfterDeletion } = await admin.auth.admin.getUserById(a.id);
  assert.equal(authAfterDeletion.user, null);
  const { data: accountAfterDeletion, error: accountAfterDeletionError } = await admin.from("accounts").select("id").eq("auth_user_id", a.id);
  assert.ifError(accountAfterDeletionError);
  assert.deepEqual(accountAfterDeletion, []);
  const failedLogin = await a.caller.auth.signInWithPassword({ email: a.email, password });
  assert.ok(failedLogin.error);
});
