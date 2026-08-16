import test from "node:test";
import assert from "node:assert/strict";
import { buildClaimRestrictionPolicy, validateClaimRestrictionPolicy, evaluateResearchConfidence, buildM4BHandoff } from "../research/articleEvidencePolicy.js";

function makePack(status = "WARN") {
  return {
    artifact_type: "article_editorial_evidence_pack",
    evidence_pack_id: "pack-1",
    evidence_pack_sha256: "hash-1",
    lineage: { objective: "create_seo_article", opportunity_id: "opp-1", opportunity_sha256: "opp-hash", primary_query: "example query", article_type: "supporting_article", search_intent: "commercial_investigation" },
    subject_depth: { status, dimensions: {}, reason: "fixture" },
    research_waves: { total_page_budget: 18, total_pages_attempted: 13 },
    unknowns: ["technical uncertainty"],
    sources: [
      { source_id: "manufacturer-1", source_class: "MANUFACTURER_BRAND" },
      { source_id: "community-1", source_class: "COMMUNITY_CUSTOMER" },
      { source_id: "independent-1", source_class: "INDEPENDENT_EXPERT" }
    ],
    technical_findings: [{ source_id: "independent-1" }],
    research_gaps: [{ type: "technical_depth", evidence_refs: ["independent-1"] }],
    relevant_product_facts: [{ evidence_id: "product-fact-1" }]
  };
}
const opportunity = { decision_id: "opp-1", decision_sha256: "opp-hash" };
const guidance = { snapshot_id: "guidance-1", snapshot_sha256: "guidance-hash", freshness_status: "CURRENT" };

test("PASS proceeds normally and does not require WARN restrictions", () => {
  const result = evaluateResearchConfidence(makePack("PASS"));
  assert.deepEqual(result, { status: "PASS", can_proceed: true, planning_allowed: true, generation_allowed: true, restriction_mode: "NORMAL" });
  const policy = buildClaimRestrictionPolicy({ pack: makePack("PASS"), opportunity, seoGuidanceLineage: guidance });
  assert.equal(policy.restrictions.length, 0);
});

test("WARN proceeds only in qualified mode with derived restrictions", () => {
  const pack = makePack();
  const policy = buildClaimRestrictionPolicy({ pack, opportunity, seoGuidanceLineage: guidance });
  assert.equal(policy.confidence.restriction_mode, "QUALIFIED");
  assert.ok(policy.restrictions.length >= 1);
  assert.equal(validateClaimRestrictionPolicy(policy, { pack, opportunity }).length, 0);
});

test("FAIL is blocked even if a restriction policy is supplied", () => {
  const pack = makePack("FAIL");
  const policy = buildClaimRestrictionPolicy({ pack, opportunity, seoGuidanceLineage: guidance });
  assert.equal(policy.confidence.can_proceed, false);
  assert.throws(() => buildM4BHandoff({ pack, policy, opportunity }), /FAIL_HANDOFF_BLOCKED/);
});

test("WARN without restrictions fails closed", () => {
  const pack = makePack();
  const policy = buildClaimRestrictionPolicy({ pack, opportunity, seoGuidanceLineage: guidance });
  policy.restrictions = [];
  assert.ok(validateClaimRestrictionPolicy(policy, { pack, opportunity }).includes("WARN_RESTRICTIONS_REQUIRED"));
});

test("WARN without SEO-guidance lineage fails closed for downstream handoff", () => {
  const pack = makePack();
  const policy = buildClaimRestrictionPolicy({ pack, opportunity });
  const errors = validateClaimRestrictionPolicy(policy, { pack, opportunity });
  assert.ok(errors.includes("WARN_SEO_GUIDANCE_LINEAGE_REQUIRED"));
  assert.throws(() => buildM4BHandoff({ pack, policy, opportunity }), /WARN_HANDOFF_BLOCKED/);
});

test("foreign evidence-pack and opportunity lineage fail closed", () => {
  const pack = makePack();
  const policy = buildClaimRestrictionPolicy({ pack, opportunity, seoGuidanceLineage: guidance });
  policy.lineage.evidence_pack_id = "foreign";
  policy.lineage.opportunity_id = "foreign";
  const errors = validateClaimRestrictionPolicy(policy, { pack, opportunity });
  assert.ok(errors.includes("EVIDENCE_PACK_LINEAGE_MISMATCH"));
  assert.ok(errors.includes("OPPORTUNITY_LINEAGE_MISMATCH"));
});

test("unknown evidence references and invalid treatment fail closed", () => {
  const pack = makePack();
  const policy = buildClaimRestrictionPolicy({ pack, opportunity, seoGuidanceLineage: guidance });
  policy.restrictions[0].evidence_refs.push("unknown");
  policy.restrictions[0].treatment = "IGNORE";
  const errors = validateClaimRestrictionPolicy(policy, { pack, opportunity });
  assert.ok(errors.includes(`UNKNOWN_RESTRICTION_EVIDENCE:${policy.restrictions[0].restriction_id}`));
  assert.ok(errors.includes(`INVALID_CLAIM_TREATMENT:${policy.restrictions[0].restriction_id}`));
});

test("policy hash tampering and silent WARN-to-PASS downgrade fail", () => {
  const pack = makePack();
  const policy = buildClaimRestrictionPolicy({ pack, opportunity, seoGuidanceLineage: guidance });
  policy.confidence.status = "PASS";
  const downgradeErrors = validateClaimRestrictionPolicy(policy, { pack, opportunity });
  assert.ok(downgradeErrors.includes("POLICY_CONFIDENCE_STATUS_MISMATCH"));
  policy.confidence.status = "WARN";
  policy.restrictions[0].subject = "tampered";
  assert.ok(validateClaimRestrictionPolicy(policy, { pack, opportunity }).includes("POLICY_HASH_MISMATCH"));
});

test("WARN handoff carries restriction lineage and permits qualified M4B planning", () => {
  const pack = makePack();
  const policy = buildClaimRestrictionPolicy({ pack, opportunity, seoGuidanceLineage: guidance });
  const handoff = buildM4BHandoff({ pack, policy, opportunity });
  assert.equal(handoff.handoff_status, "READY_FOR_M4B");
  assert.equal(handoff.restriction_mode, "QUALIFIED");
  assert.equal(handoff.restriction_policy_lineage.id, policy.policy_id);
});
