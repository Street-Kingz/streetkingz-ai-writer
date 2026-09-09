#!/usr/bin/env node
/* Codex-off Street Kingz recovery runner. It invokes Product HTTP routes only. */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const mode = process.argv.includes("--read") ? "read" : process.argv.includes("--prepare") ? "prepare" : "run";
const manifestPath = process.env.V105_RECOVERY_MANIFEST || path.resolve("artifacts/validation/v1-05/private/streetkingz-recovery-manifest.json");
const resultPath = process.env.V105_RECOVERY_RESULT || path.resolve("artifacts/validation/v1-05/private/streetkingz-recovery-result.json");
const required = (name) => { const value = process.env[name]; if (!value) throw new Error(`${name}_REQUIRED`); return value; };
const safeJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writePrivate = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 }); };
const assertLocal = (url) => { const parsed = new URL(url); if (!((parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") && parsed.protocol === "http:")) throw new Error("RECOVERY_DESTINATION_MUST_BE_LOCAL_HTTP"); };
const one = async (query, label) => { const result = await query; if (result.error) throw new Error(`${label}:${result.error.code || "ERROR"}`); return result.data; };

function loadManifest() {
  if (!fs.existsSync(manifestPath)) throw new Error("RECOVERY_MANIFEST_REQUIRED");
  const manifest = safeJson(manifestPath);
  if (manifest.schema_version !== 1 || manifest.actual_evidence_copy !== true || manifest.original_run_state_copied !== true || manifest.model !== "gpt-5.6-sol" || manifest.reasoning_effort !== "medium" || manifest.interpretation_version !== "v1-05-interpretation-7" || manifest.instruction_version !== "v1-05-slice-b-instructions-6") throw new Error("RECOVERY_MANIFEST_INCOMPATIBLE");
  if (manifest.allowed_batch_indexes?.join(",") !== "3,4" || manifest.max_additional_requests !== 2 || manifest.max_completion_tokens !== 4000 || manifest.deadline_ms !== 180000) throw new Error("RECOVERY_MANIFEST_BOUND_INVALID");
  if (!Number.isFinite(Number(manifest.cumulative_upper_bound_usd)) || Number(manifest.cumulative_upper_bound_usd) > 5) throw new Error("RECOVERY_COST_RESERVATION_INVALID");
  return manifest;
}

async function destinationClients() {
  const url = required("V105_RECOVERY_DEST_SUPABASE_URL"); assertLocal(url);
  const publishable = required("V105_RECOVERY_DEST_PUBLISHABLE_KEY"); const service = required("V105_RECOVERY_DEST_SERVICE_ROLE_KEY");
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const caller = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });
  return { url, admin, caller };
}

async function verifyDestination(admin, manifest) {
  const tables = ["businesses", "organic_decision_runs", "organic_candidate_evaluation_runs", "organic_candidate_interpretation_batches", "organic_candidate_evaluations", "organic_recommendations"];
  for (const table of tables) await one(admin.from(table).select("*", { count: "exact", head: true }), `destination_${table}`);
  const batches = await one(admin.from("organic_candidate_interpretation_batches").select("batch_index,state,outcome_state,request_attempts,input_hash").eq("evaluation_run_id", manifest.evaluation_run_id).order("batch_index"), "recovery_batches");
  if (batches.length !== 5) throw new Error("RECOVERY_BATCH_SET_INVALID");
  if (batches.some((batch) => batch.batch_index < 3 && batch.state !== "complete")) throw new Error("SUCCESSFUL_BATCH_REUSE_NOT_VERIFIED");
  if (batches.some((batch) => [3, 4].includes(batch.batch_index) && batch.state !== "pending")) throw new Error("RECOVERY_UNFINISHED_BATCH_NOT_PENDING");
  if (batches.some((batch) => batch.request_attempts !== 0 && [3, 4].includes(batch.batch_index))) throw new Error("RECOVERY_BATCH_ALREADY_ATTEMPTED");
  return { table_count: tables.length, batches: batches.map(({ batch_index, state, outcome_state, request_attempts, input_hash }) => ({ batch_index, state, outcome_state, request_attempts, input_hash })) };
}

async function authenticatedToken(caller, admin, manifest) {
  const email = required("V105_RECOVERY_EMAIL"); const password = required("V105_RECOVERY_PASSWORD");
  const signed = await caller.auth.signInWithPassword({ email, password }); if (signed.error || !signed.data.session?.access_token) throw new Error("RECOVERY_AUTH_SIGNIN_FAILED");
  const identity = await admin.auth.admin.getUserByEmail(email); if (identity.error || !identity.data.user?.id) throw new Error("RECOVERY_AUTH_IDENTITY_LOOKUP_FAILED");
  const account = await admin.from("accounts").select("id").eq("auth_user_id", identity.data.user.id).maybeSingle();
  if (account.error || !account.data) throw new Error("RECOVERY_AUTH_ACCOUNT_NOT_BOUND");
  const business = await admin.from("businesses").select("id").eq("id", manifest.business_id).eq("account_id", account.data.id).maybeSingle();
  if (business.error || !business.data) throw new Error("RECOVERY_DESTINATION_BUSINESS_NOT_BOUND");
  return signed.data.session.access_token;
}

async function requestJson(base, token, pathname, method = "GET") {
  const response = await fetch(`${base}${pathname}`, { method, headers: { authorization: `Bearer ${token}`, ...(method === "POST" ? { "content-type": "application/json" } : {}) }, body: method === "POST" ? "{}" : undefined });
  const body = await response.json().catch(() => null); return { status: response.status, body };
}

if (mode === "read") {
  const result = safeJson(resultPath);
  process.stdout.write(`${JSON.stringify({ status: result.status, result: result.result, recommendation_ids: result.recommendation_ids, saved_fields: result.saved_fields, provider_calls: result.provider_calls, actual_cost_usd: result.actual_cost_usd, reserved_unknown_cost_usd: result.reserved_unknown_cost_usd }, null, 2)}\n`);
} else {
  const manifest = loadManifest(); const { admin, caller } = await destinationClients(); const destination = await verifyDestination(admin, manifest);
  if (mode === "prepare") { writePrivate(resultPath, { schema_version: 1, status: "PREPARED_NOT_EXECUTED", destination, manifest_identity: { source_run_id: manifest.source_run_id, recovery_run_id: manifest.recovery_run_id, evidence_input_hash: manifest.evidence_input_hash }, provider_calls: 0 }); process.stdout.write(JSON.stringify({ status: "PREPARED_NOT_EXECUTED", provider_calls: 0, destination }, null, 2) + "\n"); }
  else {
    if (process.env.V105_RECOVERY_APPROVED !== "1") throw new Error("V105_RECOVERY_APPROVED_REQUIRED");
    process.env.V105_RECOVERY_MODE = "1";
    const { default: app } = await import("../../app.js");
    const token = await authenticatedToken(caller, admin, manifest); const server = app.listen(0, "127.0.0.1"); await new Promise(resolve => server.once("listening", resolve)); const port = server.address().port;
    try {
      const evaluation = await requestJson(`http://127.0.0.1:${port}`, token, `/api/product/decision-runs/${manifest.recovery_run_id}/evaluate`, "POST");
      if (![201, 202].includes(evaluation.status)) throw new Error(`RECOVERY_EVALUATION_HTTP_${evaluation.status}`);
      const recommendations = await requestJson(`http://127.0.0.1:${port}`, token, `/api/product/decision-runs/${manifest.recovery_run_id}/recommendations`, "POST");
      if (recommendations.status !== 201) throw new Error(`RECOVERY_RECOMMENDATION_HTTP_${recommendations.status}`);
      const feed = await requestJson(`http://127.0.0.1:${port}`, token, "/api/product/recommendations");
      const ids = (recommendations.body?.recommendations || []).map(item => item.recommendation_id);
      const batches = await one(admin.from("organic_candidate_interpretation_batches").select("batch_index,request_attempts,state,outcome_state,input_tokens,output_tokens,estimated_cost_usd,cost_status").eq("evaluation_run_id", manifest.evaluation_run_id).order("batch_index"), "recovery_result_batches");
      const newAttempts = batches.filter(batch => [3, 4].includes(batch.batch_index)).reduce((sum, batch) => sum + Number(batch.request_attempts || 0), 0);
      if (newAttempts !== 2) throw new Error("RECOVERY_REQUEST_COUNT_INVALID");
      const result = { schema_version: 1, status: "COMPLETE_DEVELOPMENT_ONLY", source_run_id: manifest.source_run_id, recovery_run_id: manifest.recovery_run_id, recommendation_ids: ids, saved_fields: { evaluation_status: evaluation.status, feed_status: feed.status, development_only: recommendations.body?.development_only === true }, provider_calls: newAttempts, actual_cost_usd: null, reserved_unknown_cost_usd: manifest.reserved_unknown_cost_usd, batches: batches.map(({ batch_index, request_attempts, state, outcome_state, input_tokens, output_tokens, estimated_cost_usd, cost_status }) => ({ batch_index, request_attempts, state, outcome_state, input_tokens, output_tokens, estimated_cost_usd, cost_status })) };
      writePrivate(resultPath, result); process.stdout.write(JSON.stringify({ status: result.status, recommendation_ids: ids, provider_calls: 2 }, null, 2) + "\n");
    } finally { await new Promise(resolve => server.close(resolve)); }
  }
}
