import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import app from "../../app.js";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const reportPath = process.env.V1_05_SLICE_C_E2E_REPORT || null;

assert.ok(url, "SUPABASE_URL is required");
assert.ok(publishableKey, "SUPABASE_PUBLISHABLE_KEY is required");
assert.ok(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY is required");

const clientOptions = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(url, serviceRoleKey, clientOptions);
const anonymous = createClient(url, publishableKey, clientOptions);

function must(result, label) {
  if (result?.error) throw new Error(`${label}: ${result.error.code || "ERROR"} ${result.error.message || "unknown error"}`);
  return result?.data;
}

function denied(error) {
  const text = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`;
  return /42501|permission denied|row-level security|not allowed|unauthorized/i.test(text);
}

async function provisionUser(label) {
  const email = `v105-slice-c-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const password = `E2E-${randomUUID()}-aA1!`;
  const created = must(await admin.auth.admin.createUser({ email, password, email_confirm: true }), `${label} auth create`);
  assert.ok(created?.user?.id, `${label} auth user id missing`);

  const client = createClient(url, publishableKey, clientOptions);
  const signedIn = must(await client.auth.signInWithPassword({ email, password }), `${label} sign in`);
  assert.ok(signedIn?.session?.access_token, `${label} access token missing`);

  must(await client.rpc("product_create_account", { p_correlation_id: randomUUID() }), `${label} account provision`);
  must(await client.rpc("product_create_business", { p_name: `E2E Business ${label}`, p_platform: "woocommerce", p_correlation_id: randomUUID() }), `${label} business provision`);
  const business = must(await client.from("businesses").select("id").eq("status", "active").single(), `${label} business lookup`);
  assert.ok(business?.id, `${label} business id missing`);

  return { client, token: signedIn.session.access_token, userId: created.user.id, businessId: business.id };
}

async function seedCommerceProduct(businessId) {
  const connection = must(await admin.from("connections").insert({ business_id: businessId, provider_type: "woocommerce", status: "pending", consent_state: "pending" }).select("id").single(), "seed connection");
  const store = must(await admin.from("commerce_stores").insert({ business_id: businessId, connection_id: connection.id, provider: "woocommerce", canonical_base_url: "https://e2e-a.example.test/", sync_state: "complete", last_successful_at: new Date().toISOString() }).select("id").single(), "seed store");
  const generation = must(await admin.from("commerce_sync_generations").insert({ store_id: store.id, state: "complete", completed_at: new Date().toISOString() }).select("id").single(), "seed generation");
  must(await admin.from("commerce_stores").update({ current_generation: generation.id }).eq("id", store.id), "link current generation");
  const product = must(await admin.from("commerce_products").insert({ business_id: businessId, store_id: store.id, generation_id: generation.id, source_id: 101, name: "XL Drying Towel", slug: "xl-drying-towel", canonical_url: "https://e2e-a.example.test/product/xl-drying-towel", source_status: "publish", current_price: 17.99, stock_status: "instock", stock_quantity: 20 }).select("id").single(), "seed product");
  return product.id;
}

async function seedEvaluatedRun({ businessId, productId, ordinal, evidenceId }) {
  const fingerprint = String(ordinal).repeat(64).slice(0, 64);
  const inputHash = (ordinal === 1 ? "a" : "b").repeat(64);
  const run = must(await admin.from("organic_decision_runs").insert({ business_id: businessId, snapshot_fingerprint: fingerprint, input_hash: inputHash, source_references: [], discovery_version: "e2e-discovery-v1", state: "discovery_complete", candidate_count: 1, discovery_completeness: "complete", completed_at: new Date().toISOString() }).select("id").single(), `seed decision run ${ordinal}`);

  const target = `product:${productId}`;
  const evidenceRef = { source_kind: "site", source_record_type: "page", source_record_id: evidenceId, source_run_or_generation_reference: `e2e-source-${ordinal}`, relationship: "supports" };
  const candidate = must(await admin.from("organic_opportunity_candidates").insert({ business_id: businessId, decision_run_id: run.id, candidate_identity: "stable-xl-drying-towel-opportunity", candidate_type: "existing_product_improvement", target_resources: [target], allowed_target_refs: [target], target_resource_type: "product", discovery_sources: ["site"], evidence_refs: [evidenceRef], direct_derived_relationships: [{ ...evidenceRef, direct_source: true, derived_candidate: true }], market: "GB", language: "en", freshness_state: "complete", completeness: "complete", limitations: [], candidate_status: "interpreted", rejection_reason_codes: [], snapshot_id: fingerprint, candidate_version: "e2e-candidate-v1", evaluated_at: new Date().toISOString() }).select("candidate_id").single(), `seed candidate ${ordinal}`);

  const evaluationRun = must(await admin.from("organic_candidate_evaluation_runs").insert({ business_id: businessId, decision_run_id: run.id, evaluation_version: "e2e-evaluation-v1", input_hash: inputHash, filter_version: "e2e-filter-v1", interpretation_version: "e2e-interpretation-v1", instruction_version: "e2e-instructions-v1", state: "interpretation_complete", discovered_count: 1, post_filter_count: 1, interpreted_count: 1, completed_at: new Date().toISOString() }).select("id").single(), `seed evaluation run ${ordinal}`);

  must(await admin.from("organic_candidate_evaluations").insert({ business_id: businessId, evaluation_run_id: evaluationRun.id, decision_run_id: run.id, candidate_id: candidate.candidate_id, evaluation_version: "e2e-evaluation-v1", deterministic_disposition: "pass", deterministic_reason_codes: [], target_attribution_state: "established", attributed_target_resources: [target], customer_job: "Improve the XL Drying Towel product opportunity", intent_class: "product_selection", intent_confidence: "medium", page_type_fit: "aligned", relevance_state: "relevant", new_asset_fit: "not_applicable", interpretation_state: "complete", interpretive_disposition: "retain", interpretive_reason_codes: ["target_supported"], evidence_refs: [evidenceRef], limitations: [], interpretation_input_hash: `e2e-input-${ordinal}`, model_provider: "e2e", model_name: "none", instruction_version: "e2e-instructions-v1", provider_response_id: `e2e-response-${ordinal}`, input_tokens: 0, output_tokens: 0, completed_at: new Date().toISOString() }), `seed evaluation ${ordinal}`);

  return { runId: run.id, evidenceRef };
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1");
    server.once("error", reject);
    server.once("listening", () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function requestJson(baseUrl, token, path, method = "GET") {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(method === "POST" ? { "content-type": "application/json" } : {}) },
    body: method === "POST" ? "{}" : undefined
  });
  const raw = await response.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = { raw }; }
  return { status: response.status, body };
}

const report = {
  schema_version: 1,
  provider_calls: 0,
  from_zero_auth_users: 2,
  checks: {}
};

const tenantA = await provisionUser("A");
const tenantB = await provisionUser("B");
const productId = await seedCommerceProduct(tenantA.businessId);
const first = await seedEvaluatedRun({ businessId: tenantA.businessId, productId, ordinal: 1, evidenceId: "evidence-run-1" });

const { server, baseUrl } = await startServer();
try {
  const generated = await requestJson(baseUrl, tenantA.token, `/api/product/decision-runs/${first.runId}/recommendations`, "POST");
  assert.equal(generated.status, 201, `generation status ${generated.status}: ${JSON.stringify(generated.body)}`);
  assert.equal(generated.body?.recommendations?.length, 1, "expected one generated recommendation");
  assert.equal(generated.body.recommendations[0].title, "Improve XL Drying Towel");
  const recommendationId = generated.body.recommendations[0].recommendation_id;
  assert.ok(recommendationId?.startsWith("rec-"), "recommendation id missing");
  report.checks.api_post_generation = "PASS";
  report.checks.actionable_title = "PASS";

  const feedA = await requestJson(baseUrl, tenantA.token, "/api/product/recommendations");
  assert.equal(feedA.status, 200);
  assert.equal(feedA.body?.recommendations?.length, 1);
  assert.equal(feedA.body.recommendations[0].recommendation_id, recommendationId);
  report.checks.api_get_feed = "PASS";

  const detailA = await requestJson(baseUrl, tenantA.token, `/api/product/recommendations/${recommendationId}`);
  assert.equal(detailA.status, 200);
  assert.equal(detailA.body?.recommendation?.title, "Improve XL Drying Towel");
  report.checks.api_get_detail = "PASS";

  const ownRead = await tenantA.client.from("organic_recommendations").select("recommendation_id,business_id,status").eq("recommendation_id", recommendationId);
  assert.equal(ownRead.error, null, ownRead.error?.message);
  assert.equal(ownRead.data?.length, 1);
  assert.equal(ownRead.data[0].business_id, tenantA.businessId);
  report.checks.user_a_owner_select = "PASS";

  const crossRead = await tenantB.client.from("organic_recommendations").select("recommendation_id,business_id,status").eq("recommendation_id", recommendationId);
  assert.equal(crossRead.error, null, crossRead.error?.message);
  assert.equal(crossRead.data?.length, 0);
  report.checks.user_b_cross_business_select = "PASS";

  const anonymousRead = await anonymous.from("organic_recommendations").select("recommendation_id").limit(1);
  assert.ok(anonymousRead.error, "anonymous SELECT unexpectedly succeeded");
  assert.ok(denied(anonymousRead.error), `anonymous SELECT failed for unexpected reason: ${anonymousRead.error.message}`);
  report.checks.anonymous_select_denied = "PASS";

  const directInsert = await tenantA.client.from("organic_recommendations").insert({ recommendation_id: `rec-forbidden-${randomUUID()}` });
  assert.ok(directInsert.error, "authenticated direct INSERT unexpectedly succeeded");
  assert.ok(denied(directInsert.error), `authenticated INSERT failed for unexpected reason: ${directInsert.error.message}`);
  report.checks.authenticated_direct_insert_denied = "PASS";

  const directUpdate = await tenantA.client.from("organic_recommendations").update({ status: "ignored" }).eq("recommendation_id", recommendationId);
  assert.ok(directUpdate.error, "authenticated direct UPDATE unexpectedly succeeded");
  assert.ok(denied(directUpdate.error), `authenticated UPDATE failed for unexpected reason: ${directUpdate.error.message}`);
  report.checks.authenticated_direct_update_denied = "PASS";

  const serviceUpdate = await admin.from("organic_recommendations").update({ status: "completed" }).eq("recommendation_id", recommendationId).select("recommendation_id,status").single();
  assert.equal(serviceUpdate.error, null, serviceUpdate.error?.message);
  assert.equal(serviceUpdate.data.status, "completed");
  report.checks.service_role_write = "PASS";

  const second = await seedEvaluatedRun({ businessId: tenantA.businessId, productId, ordinal: 2, evidenceId: "evidence-run-2" });
  const regenerated = await requestJson(baseUrl, tenantA.token, `/api/product/decision-runs/${second.runId}/recommendations`, "POST");
  assert.equal(regenerated.status, 201, `cross-run generation status ${regenerated.status}: ${JSON.stringify(regenerated.body)}`);

  const continuity = await admin.from("organic_recommendations").select("*").eq("business_id", tenantA.businessId).eq("recommendation_id", recommendationId);
  assert.equal(continuity.error, null, continuity.error?.message);
  assert.equal(continuity.data?.length, 1, "cross-run continuity created duplicate rows");
  assert.equal(continuity.data[0].source_run_id, second.runId, "latest source run was not retained");
  assert.equal(continuity.data[0].status, "completed", "completed state was not preserved across runs");
  assert.equal(continuity.data[0].evidence_refs?.[0]?.source_record_id, "evidence-run-2", "latest evidence provenance was not retained");
  report.checks.cross_run_one_logical_record = "PASS";
  report.checks.latest_source_run = "PASS";
  report.checks.latest_evidence_provenance = "PASS";
  report.checks.completed_preserved = "PASS";

  const feedAfterCompletion = await requestJson(baseUrl, tenantA.token, "/api/product/recommendations");
  assert.equal(feedAfterCompletion.status, 200);
  assert.equal(feedAfterCompletion.body?.recommendations?.length, 0, "completed recommendation leaked into active feed");
  report.checks.completed_removed_from_active_feed = "PASS";

  const detailAfterCompletion = await requestJson(baseUrl, tenantA.token, `/api/product/recommendations/${recommendationId}`);
  assert.equal(detailAfterCompletion.status, 200);
  assert.equal(detailAfterCompletion.body?.recommendation?.state, "completed");
  report.checks.completed_detail_history = "PASS";

  const feedB = await requestJson(baseUrl, tenantB.token, "/api/product/recommendations");
  assert.equal(feedB.status, 200);
  assert.equal(feedB.body?.recommendations?.length, 0);
  const detailB = await requestJson(baseUrl, tenantB.token, `/api/product/recommendations/${recommendationId}`);
  assert.equal(detailB.status, 404);
  report.checks.cross_tenant_feed_isolation = "PASS";
  report.checks.cross_tenant_detail_isolation = "PASS";

  report.recommendation_id = recommendationId;
  report.first_run_id = first.runId;
  report.latest_run_id = second.runId;
  report.result = "PASS";
} finally {
  await new Promise(resolve => server.close(resolve));
}

const output = `${JSON.stringify(report, null, 2)}\n`;
if (reportPath) fs.writeFileSync(reportPath, output, "utf8");
process.stdout.write(output);
