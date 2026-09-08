import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildRecommendationRecord, merchantSafetyProjection, rankRecommendations, upsertRecommendationRecords, projectMerchantRecommendation } from "../product-kernel/recommendationEngine.js";

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

test("commercial calibration manifest contains the frozen eleven plus one new genuine scenario", () => {
  const manifest = JSON.parse(fs.readFileSync("artifacts/planning/v1-05/evaluation-slice-c-commercial.json", "utf8"));
  assert.equal(manifest.cases.length, 12);
  assert.equal(new Set(manifest.cases.map(item => item.scenario_id)).size, 12);
  for (const id of ["V105-EVAL-001", "V105-EVAL-004", "V105-EVAL-009", "V105-EVAL-014", "V105-EVAL-017", "V105-EVAL-020", "V105-EVAL-021", "V105-EVAL-039", "V105-EVAL-040", "V105-EVAL-043", "V105-EVAL-048"]) assert.ok(manifest.cases.some(item => item.scenario_id === id));
  assert.ok(manifest.cases.some(item => item.scenario_id === "V105-SLICE-C-COMM-001"));
});
