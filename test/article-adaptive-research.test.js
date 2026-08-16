import test from "node:test";
import assert from "node:assert/strict";
import { deriveResearchGaps, deriveTargetedResearchQueries, evaluateSubjectDepthV2, ADAPTIVE_MAX_ACTIVE_GAPS, ADAPTIVE_MAX_TARGETED_QUERIES, ADAPTIVE_WAVE2_MAX_PAGES } from "../research/articleAdaptiveEvidence.js";

function pack() {
  return {
    lineage: { primary_query: "best example product", article_type: "supporting_article", search_intent: "commercial_investigation" }, unknowns: ["unknown"],
    research_questions: [
      { question_id: "q1", question: "What options and characteristics matter?" },
      { question_id: "q2", question: "What trade-offs should a reader understand?" },
      { question_id: "q3", question: "What practical customer concerns exist?" }
    ],
    question_coverage: [{ question_id: "q1", status: "ANSWERED" }, { question_id: "q2", status: "PARTIALLY_ANSWERED" }, { question_id: "q3", status: "PARTIALLY_ANSWERED" }],
    subject_depth: { status: "FAIL" }, actual_constructions: ["one", "two", "three"], live_buying_criteria: ["capacity", "size", "handling"], sources: [{ source_id: "s1", provenance_status: "LIVE", source_class: "MANUFACTURER_BRAND" }], relevant_product_facts: [{ evidence_id: "p1" }], page_level_coverage: { successful: 3 }
  };
}

test("gap derivation is bounded and prioritises unresolved commercial questions", () => {
  const gaps = deriveResearchGaps(pack());
  assert.ok(gaps.length <= ADAPTIVE_MAX_ACTIVE_GAPS);
  assert.equal(gaps[0].importance, "high");
  assert.ok(gaps.every((gap) => gap.status === "UNRESOLVED"));
});

test("targeted query generation is automatic and bounded", () => {
  const gaps = deriveResearchGaps(pack());
  const queries = deriveTargetedResearchQueries(gaps, pack());
  assert.ok(queries.length <= ADAPTIVE_MAX_TARGETED_QUERIES);
  assert.ok(queries.every((query) => query.query.includes("best example product")));
  assert.ok(queries.every((query) => query.gap_id));
});

test("subject-depth evaluator distinguishes pass, warn and fail without raw source counts", () => {
  const value = pack();
  value.technical_findings = [
    { finding: "construction trade-off a", claim_class: "INDEPENDENT_EXPERT_CLAIM" },
    { finding: "construction trade-off b", claim_class: "INDEPENDENT_EXPERT_CLAIM" },
    { finding: "construction format c", claim_class: "INDEPENDENT_EXPERT_CLAIM" }
  ];
  value.community_findings = [{ support_status: "anecdotal_bounded_observation" }];
  value.sources = [
    { source_id: "a", provenance_status: "LIVE", source_class: "MANUFACTURER_BRAND" },
    { source_id: "b", provenance_status: "LIVE", source_class: "INDEPENDENT_EXPERT" },
    { source_id: "c", provenance_status: "LIVE", source_class: "COMMUNITY_CUSTOMER" },
    { source_id: "d", provenance_status: "LIVE", source_class: "SERP_COMPETITOR" }
  ];
  assert.equal(evaluateSubjectDepthV2(value).status, "PASS");
  value.technical_findings = [
    { finding: "construction trade-off a", claim_class: "MANUFACTURER_CLAIM" },
    { finding: "construction trade-off b", claim_class: "MANUFACTURER_CLAIM" },
    { finding: "construction format c", claim_class: "MANUFACTURER_CLAIM" }
  ];
  assert.equal(evaluateSubjectDepthV2(value).status, "WARN");
  value.actual_constructions = [];
  assert.equal(evaluateSubjectDepthV2(value).status, "FAIL");
});

test("the adaptive wave bound is explicit and does not permit an implicit third wave", () => {
  assert.equal(ADAPTIVE_WAVE2_MAX_PAGES, 8);
  assert.equal(ADAPTIVE_MAX_ACTIVE_GAPS, 5);
});
