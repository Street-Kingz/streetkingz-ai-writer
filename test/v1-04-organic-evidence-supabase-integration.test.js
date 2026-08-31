import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const enabled = process.env.V1_04_INTEGRATION === "1";
const required = name => process.env[name] || (() => { throw new Error(`${name} required`); })();

test("Slice A local Supabase source/run lifecycle, RLS and LKG", { skip: !enabled }, async t => {
  const url = required("SUPABASE_URL");
  const publishable = required("SUPABASE_PUBLISHABLE_KEY");
  const service = required("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const email = `v104-foundation-${crypto.randomUUID()}@local.test`;
  const password = `${crypto.randomUUID()}!Aa9`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  const userId = created.data.user.id;
  t.after(async () => { await admin.auth.admin.deleteUser(userId); });
  const caller = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });
  const signed = await caller.auth.signInWithPassword({ email, password });
  assert.ifError(signed.error);
  const token = signed.data.session.access_token;
  const userClient = createClient(url, publishable, { global: { headers: { authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } });
  const account = await userClient.rpc("product_create_account", { p_correlation_id: crypto.randomUUID() });
  assert.ifError(account.error);
  const business = await userClient.rpc("product_create_business", { p_name: "V1-04 Foundation Test", p_platform: "woocommerce", p_correlation_id: crypto.randomUUID() });
  assert.ifError(business.error);
  const ensured = await admin.rpc("organic_ensure_source", { p_business_id: business.data.id, p_source_class: "no_separate_connection", p_source_kind: "site" });
  assert.ifError(ensured.error);
  const source = ensured.data;
  assert.equal(source.evidence_state, "never_collected");
  const ensuredAgain = await admin.rpc("organic_ensure_source", { p_business_id: business.data.id, p_source_class: "no_separate_connection", p_source_kind: "site" });
  assert.ifError(ensuredAgain.error);
  assert.equal(ensuredAgain.data.id, source.id, "logical source ensure is idempotent");
  const invalidShape = await admin.rpc("organic_ensure_source", { p_business_id: business.data.id, p_source_class: "customer_connected", p_source_kind: "search_console", p_provider_id: "google_search_console" });
  assert.ok(invalidShape.error, "customer-connected source cannot omit its connection");
  const started = await admin.rpc("organic_begin_run", { p_source_id: source.id, p_correlation_id: crypto.randomUUID(), p_retrieved_at: new Date().toISOString() });
  assert.ifError(started.error);
  const competing = await admin.rpc("organic_begin_run", { p_source_id: source.id, p_correlation_id: crypto.randomUUID() });
  assert.ok(competing.error, "only one active run may exist");
  const complete = await admin.rpc("organic_finish_run", { p_run_id: started.data.id, p_state: "complete", p_completeness_state: "complete", p_evidence_as_of: new Date().toISOString() });
  assert.ifError(complete.error);
  const status = await userClient.from("organic_evidence_sources").select("source_kind,source_class,provider_id,evidence_state,last_attempted_at,last_successful_at,evidence_as_of,current_complete_run,active_run").eq("id", source.id).single();
  assert.ifError(status.error);
  assert.deepEqual({ kind: status.data.source_kind, cls: status.data.source_class, state: status.data.evidence_state, current: status.data.current_complete_run === complete.data.id, active: status.data.active_run }, { kind: "site", cls: "no_separate_connection", state: "complete", current: true, active: null });
  const second = await admin.rpc("organic_begin_run", { p_source_id: source.id, p_correlation_id: crypto.randomUUID() });
  assert.ifError(second.error);
  const attempted = status.data.last_attempted_at;
  const failed = await admin.rpc("organic_finish_run", { p_run_id: second.data.id, p_state: "failed", p_completeness_state: "unavailable", p_error_code: "PROVIDER_UNAVAILABLE" });
  assert.ifError(failed.error);
  const after = await admin.from("organic_evidence_sources").select("evidence_state,current_complete_run,last_attempted_at,last_successful_at,evidence_as_of").eq("id", source.id).single();
  assert.ifError(after.error);
  assert.equal(after.data.evidence_state, "failed");
  assert.equal(after.data.current_complete_run, complete.data.id);
  assert.equal(after.data.last_successful_at, status.data.last_successful_at);
  assert.equal(after.data.evidence_as_of, status.data.evidence_as_of);
  assert.notEqual(after.data.last_attempted_at, attempted);
  const forged = await userClient.from("organic_evidence_sources").insert({ business_id: business.data.id, source_class: "no_separate_connection", source_kind: "site" });
  assert.ok(forged.error, "customer direct writes must be denied");

  const replacement = await admin.rpc("organic_begin_run", { p_source_id: source.id, p_correlation_id: crypto.randomUUID(), p_source_version: "v2" });
  assert.ifError(replacement.error);
  const replacementComplete = await admin.rpc("organic_finish_run", { p_run_id: replacement.data.id, p_state: "complete", p_completeness_state: "complete", p_evidence_as_of: "2026-08-31T12:00:00Z" });
  assert.ifError(replacementComplete.error);
  const promoted = await admin.from("organic_evidence_sources").select("current_complete_run,last_successful_at,evidence_as_of,evidence_state").eq("id", source.id).single();
  assert.ifError(promoted.error);
  assert.equal(promoted.data.current_complete_run, replacementComplete.data.id);
  assert.equal(promoted.data.evidence_as_of, "2026-08-31T12:00:00+00:00");
  assert.equal(promoted.data.evidence_state, "complete");

  const stale = await admin.rpc("organic_begin_run", { p_source_id: source.id, p_correlation_id: crypto.randomUUID() });
  assert.ifError(stale.error);
  const newer = await admin.rpc("organic_finish_run", { p_run_id: stale.data.id, p_state: "partial", p_completeness_state: "partial", p_error_code: "PROVIDER_PARTIAL" });
  assert.ifError(newer.error);
  const next = await admin.rpc("organic_begin_run", { p_source_id: source.id, p_correlation_id: crypto.randomUUID() });
  assert.ifError(next.error);
  const nextComplete = await admin.rpc("organic_finish_run", { p_run_id: next.data.id, p_state: "complete", p_completeness_state: "complete", p_evidence_as_of: "2026-08-31T13:00:00Z" });
  assert.ifError(nextComplete.error);
  const staleFinish = await admin.rpc("organic_finish_run", { p_run_id: stale.data.id, p_state: "complete", p_completeness_state: "complete", p_evidence_as_of: "2026-08-31T14:00:00Z" });
  assert.ok(staleFinish.error, "a stale worker cannot promote after a newer transition");
  assert.match(staleFinish.error.message, /ORGANIC_RUN_STALE/);

  const race = await admin.rpc("organic_begin_run", { p_source_id: source.id, p_correlation_id: crypto.randomUUID() });
  assert.ifError(race.error);
  const [raceComplete, raceFailed] = await Promise.all([
    admin.rpc("organic_finish_run", { p_run_id: race.data.id, p_state: "complete", p_completeness_state: "complete", p_evidence_as_of: "2026-08-31T15:00:00Z" }),
    admin.rpc("organic_finish_run", { p_run_id: race.data.id, p_state: "failed", p_completeness_state: "unavailable", p_error_code: "PROVIDER_UNAVAILABLE" })
  ]);
  assert.equal([raceComplete.error, raceFailed.error].filter(Boolean).length, 1, "completion/failure race has one winner");
  const finalSource = await admin.from("organic_evidence_sources").select("active_run,current_complete_run,evidence_state").eq("id", source.id).single();
  assert.ifError(finalSource.error);
  assert.equal(finalSource.data.active_run, null);
  assert.equal(finalSource.data.evidence_state === "complete" || finalSource.data.evidence_state === "failed", true);

  const deleted = await admin.auth.admin.deleteUser(userId);
  assert.ifError(deleted.error);
  const removed = await admin.from("organic_evidence_sources").select("id").eq("id", source.id);
  assert.ifError(removed.error);
  assert.deepEqual(removed.data, [], "Business deletion removes owned organic evidence");
  t.after(() => {});
});
