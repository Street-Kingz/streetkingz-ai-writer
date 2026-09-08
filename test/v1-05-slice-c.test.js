import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildRecommendationIdentity, buildRecommendationRecord, merchantSafetyProjection, rankRecommendations, upsertRecommendationRecords, projectMerchantRecommendation } from "../product-kernel/recommendationEngine.js";
import { feedProjection, detailProjection, resolveTargetLabels, recommendationPersistenceRow } from "../product-kernel/recommendationRepository.js";

const base = { candidate_identity: "test-candidate", candidate_type: "existing_product_improvement", customer_job: "Improve a bounded product opportunity", relevance_state: "relevant", target_attribution_state: "established", attributed_target_resources: ["product:1"], page_type_fit: "aligned", new_asset_fit: "not_applicable", interpretive_disposition: "retain", intent_confidence: "medium", evidence_maturity: "mixed", evidence_refs: [{ source_kind: "fixture", source_record_type: "observation", source_record_id: "e1", source_run_or_generation_reference: "r1", relationship: "supports" }], limitations: [] };
const record = (overrides = {}) => ({ ...base, ...overrides });

test("merchant safety fails closed for unsafe decisions and defers uncertainty", () => {
  for (const candidate of [record({ page_type_fit: "misaligned" }), record({ relevance_state: "irrelevant" }), record({ candidate_type: "new_page_or_content_asset", new_asset_fit: "redundant" }), record({ invented_target: true }), record({ target_attribution_state: "established", attributed_target_resources: [] })]) assert.equal(merchantSafetyProjection(candidate).state, "unsafe");
  assert.equal(merchantSafetyProjection(record({ target_attribution_state: "ambiguous" })).state, "uncertain");
  assert.equal(merchantSafetyProjection(record()).state, "safe");
});

test("interventions, outcomes and ranking do not depend on intent_class", () => {
  const a = buildRecommendationRecord(record({ intent_class: "product_selection" }), { businessId: "b", runId: "r" });
  const b = buildRecommendationRecord(record({ intent_class: "brand_navigation" }), { businessId: "b", runId: "r" });
  assert.equal(a.recommendation_id, b.recommendation_id);
  assert.equal(a.priority_band, b.priority_band);
  assert.equal(rankRecommendations([record({ candidate_identity: "no-action", relevance_state: "irrelevant", interpretive_disposition: "reject_mismatch" })]).outcomes.no_action, true);
  assert.equal(rankRecommendations([record({ candidate_identity: "uncertain", target_attribution_state: "ambiguous" })]).outcomes.insufficient_evidence, true);
});

test("commercial context is bounded, refinements preserve target and intervention", () => {
  const without = buildRecommendationRecord(record({ commercial_context: undefined }), { businessId: "b", runId: "r" });
  const withCommercial = buildRecommendationRecord(record({ commercial_context: { available: true, reliable: true, relevant: true, stock_status: "instock", stock_quantity: 18, sales_90d: 24 } }), { businessId: "b", runId: "r" });
  assert.equal(without.commercial_signal.state, "unknown");
  assert.equal(withCommercial.commercial_signal.state, "supportive");
  assert.equal(withCommercial.priority_band, "high");
  assert.equal(without.intervention, withCommercial.intervention);
  assert.deepEqual(without.target_resources, withCommercial.target_resources);
});

test("recommendation identity makes reruns idempotent and projection hides internals", () => {
  const once = upsertRecommendationRecords([], [record()], { businessId: "b", runId: "r" });
  const twice = upsertRecommendationRecords(once, [record()], { businessId: "b", runId: "r" });
  assert.equal(twice.length, 1);
  const projection = projectMerchantRecommendation(once[0]);
  assert.equal("candidate_identity" in projection, false);
  assert.equal("intent_class" in projection, false);
  assert.equal("model" in projection, false);
  assert.ok(projection.evidence.length);
  assert.ok(projection.what_to_do_next.length);
});

test("logical recommendation identity is stable across decision runs and evidence refreshes", () => {
  const first = buildRecommendationIdentity({ businessId: "b", runId: "run-1", candidate: record({ evidence_refs: ["e1"] }) });
  const second = buildRecommendationIdentity({ businessId: "b", runId: "run-2", candidate: record({ evidence_refs: ["e2"] }) });
  const legacy = runId => `legacy-${JSON.stringify({ business_id: "b", run_id: runId, candidate_identity: "test-candidate", evidence_refs: [runId], target_resources: ["product:1"], intervention: "improve_existing_product" })}`;
  assert.notEqual(legacy("run-1"), legacy("run-2"));
  assert.equal(first, second);
  assert.notEqual(first, buildRecommendationIdentity({ businessId: "b", runId: "run-3", candidate: record({ attributed_target_resources: ["product:2"] }) }));
});

test("commercial calibration manifest contains the frozen eleven plus one new genuine scenario", () => {
  const manifest = JSON.parse(fs.readFileSync("artifacts/planning/v1-05/evaluation-slice-c-commercial.json", "utf8"));
  assert.equal(manifest.cases.length, 12);
  assert.equal(new Set(manifest.cases.map(item => item.scenario_id)).size, 12);
  for (const id of ["V105-EVAL-001", "V105-EVAL-004", "V105-EVAL-009", "V105-EVAL-014", "V105-EVAL-017", "V105-EVAL-020", "V105-EVAL-021", "V105-EVAL-039", "V105-EVAL-040", "V105-EVAL-043", "V105-EVAL-048"]) assert.ok(manifest.cases.some(item => item.scenario_id === id));
  assert.ok(manifest.cases.some(item => item.scenario_id === "V105-SLICE-C-COMM-001"));
});

test("target resolution and merchant feed/detail projections are bounded", () => {
  const recommendations = upsertRecommendationRecords([], [record({ candidate_identity: "high", evidence_maturity: "rich" }), record({ candidate_identity: "deferred", target_attribution_state: "ambiguous" }), record({ candidate_identity: "blocked", page_type_fit: "misaligned" })], { businessId: "b", runId: "r" });
  const options = { products: [{ id: "1", name: "XL Drying Towel" }] };
  assert.equal(resolveTargetLabels(["product:1"], options)[0].label, "XL Drying Towel");
  const feed = feedProjection(recommendations, options);
  assert.equal(feed[0].title, "Improve XL Drying Towel");
  assert.equal(feed.some(item => item.recommendation_id === recommendations[1].recommendation_id), true);
  assert.equal("intent_class" in feed[0], false);
  assert.equal(detailProjection(recommendations[0], options).target[0].label, "XL Drying Towel");
});

test("terminal lifecycle states survive regeneration and feed is capped at five current tasks", () => {
  const candidates = Array.from({ length: 7 }, (_, index) => record({ candidate_identity: `candidate-${index}`, evidence_maturity: "rich" }));
  const records = upsertRecommendationRecords([], candidates, { businessId: "b", runId: "r" });
  assert.equal(records.filter(item => item.status === "current").length, 5);
  const terminal = { ...records[0], status: "completed" };
  const rerun = upsertRecommendationRecords([terminal], [candidates[0]], { businessId: "b", runId: "r" });
  assert.equal(rerun.find(item => item.recommendation_id === terminal.recommendation_id).status, "completed");
  const ignored = { ...records[1], status: "ignored" };
  assert.equal(upsertRecommendationRecords([ignored], [candidates[1]], { businessId: "b", runId: "r" }).find(item => item.recommendation_id === ignored.recommendation_id).status, "ignored");
});

test("persistence row keeps business ownership and server provenance", () => {
  const row = recommendationPersistenceRow(buildRecommendationRecord(record(), { businessId: "b", runId: "r" }), { businessId: "b", runId: "r" });
  assert.equal(row.business_id, "b"); assert.equal(row.source_run_id, "r"); assert.equal(row.recommendation_id.startsWith("rec-"), true);
});

test("recommendation migration uses business ownership RLS and server-only writes", () => {
  const sql = fs.readFileSync("supabase/migrations/20260931000000_v1_05_slice_c_recommendations.sql", "utf8");
  assert.match(sql, /create table public\.organic_recommendations/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /grant select on public\.organic_recommendations to authenticated/);
  assert.match(sql, /grant all on public\.organic_recommendations to service_role/);
  assert.match(sql, /auth_user_id=auth\.uid\(\)/);
  assert.doesNotMatch(sql, /grant .*insert.*authenticated/);
});

test("authenticated development API exposes generation, feed and detail only", () => {
  const route = fs.readFileSync("routes/recommendations.js", "utf8");
  const app = fs.readFileSync("app.js", "utf8");
  assert.match(app, /recommendationsRoute/);
  assert.match(route, /router\.post\("\/api\/product\/decision-runs\/:id\/recommendations"/);
  assert.match(route, /router\.get\("\/api\/product\/recommendations"/);
  assert.match(route, /router\.get\("\/api\/product\/recommendations\/:id"/);
  assert.doesNotMatch(route, /publish|woocommerce.*update|generate content/i);
});
