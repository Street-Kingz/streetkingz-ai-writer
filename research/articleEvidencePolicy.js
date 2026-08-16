import { sha256, stableId } from "./core/canonical.js";

export const RESTRICTION_TYPES = new Set(["QUALIFICATION_REQUIRED", "ATTRIBUTION_REQUIRED", "COMPARATIVE_CLAIM_RESTRICTED", "UNIVERSAL_CLAIM_PROHIBITED", "TECHNICAL_CLAIM_UNRESOLVED", "ANECDOTAL_ONLY", "MANUFACTURER_CLAIM_ONLY", "INSUFFICIENT_INDEPENDENT_CORROBORATION"]);
export const CLAIM_TREATMENTS = new Set(["SAFE", "QUALIFY", "ATTRIBUTE", "AVOID"]);

function evidenceIds(pack, predicate) {
  return [...new Set((pack.sources || []).filter(predicate).map((source) => source.source_id))];
}

function restriction({ subject, type, treatment, reason, evidenceRefs, permitted, prohibited }) {
  return { restriction_id: stableId("article_claim_restriction", { subject, type, evidenceRefs }), subject, restriction_type: type, treatment, reason, evidence_refs: [...new Set(evidenceRefs)], permitted_treatment: permitted, prohibited_treatment: prohibited };
}

export function evaluateResearchConfidence(pack) {
  const status = pack?.subject_depth?.status;
  if (!new Set(["PASS", "WARN", "FAIL"]).has(status)) throw new Error("INVALID_SUBJECT_DEPTH_STATUS");
  return status === "PASS" ? { status, can_proceed: true, planning_allowed: true, generation_allowed: true, restriction_mode: "NORMAL" } : status === "WARN" ? { status, can_proceed: true, planning_allowed: true, generation_allowed: true, restriction_mode: "QUALIFIED" } : { status, can_proceed: false, planning_allowed: false, generation_allowed: false, restriction_mode: "BLOCKED" };
}

export function deriveClaimRestrictions(pack) {
  const confidence = evaluateResearchConfidence(pack);
  if (confidence.status === "PASS") return [];
  if (confidence.status === "FAIL") return [];
  const restrictions = [];
  const technicalRefs = [...new Set([...(pack.research_gaps || []).filter((gap) => gap.type === "technical_depth").flatMap((gap) => gap.evidence_refs || []), ...(pack.technical_findings || []).map((finding) => finding.source_id)])];
  if (technicalRefs.length) restrictions.push(restriction({ subject: "technical GSM, absorbency and construction-performance relationships", type: "TECHNICAL_CLAIM_UNRESOLVED", treatment: "QUALIFY", reason: "The evidence pack marks technical depth WARN and lacks sufficient independent corroboration.", evidenceRefs: technicalRefs, permitted: "Explain the measurement or construction as an observed/qualified consideration and preserve source limitations.", prohibited: "Do not state a universal technical relationship or imply that one metric determines performance." }));
  const manufacturerRefs = evidenceIds(pack, (source) => source.source_class === "MANUFACTURER_BRAND");
  if (manufacturerRefs.length) restrictions.push(restriction({ subject: "manufacturer descriptions of towel designs and benefits", type: "MANUFACTURER_CLAIM_ONLY", treatment: "ATTRIBUTE", reason: "These records are manufacturer-owned observations or marketing claims.", evidenceRefs: manufacturerRefs, permitted: "Attribute the description to the manufacturer or present it as a market example.", prohibited: "Do not promote manufacturer claims to objective category facts." }));
  const communityRefs = evidenceIds(pack, (source) => source.source_class === "COMMUNITY_CUSTOMER");
  if (communityRefs.length) restrictions.push(restriction({ subject: "customer and practitioner experiences", type: "ANECDOTAL_ONLY", treatment: "ATTRIBUTE", reason: "Community evidence records experience and concerns, not technical consensus.", evidenceRefs: communityRefs, permitted: "Use as attributed concerns, questions or examples of user experience.", prohibited: "Do not state anecdotes as universal practice, preference or performance proof." }));
  const universalRefs = [...new Set([...(pack.unknowns || []).flatMap(() => []), ...technicalRefs, ...manufacturerRefs])];
  restrictions.push(restriction({ subject: "universal superiority and best-in-market claims", type: "UNIVERSAL_CLAIM_PROHIBITED", treatment: "AVOID", reason: "The pack contains no evidence establishing universal superiority and explicitly preserves uncertainty.", evidenceRefs: universalRefs, permitted: "Describe the available options and qualified decision criteria.", prohibited: "Do not claim that any construction, GSM range or product is universally best." }));
  return restrictions;
}

export function buildClaimRestrictionPolicy({ pack, opportunity, seoGuidanceLineage = null }) {
  const confidence = evaluateResearchConfidence(pack);
  const restrictions = deriveClaimRestrictions(pack);
  const policy = {
    artifact_type: "article_claim_restriction_policy",
    schema_version: 1,
    policy_version: "1.0.0",
    status: "VALIDATED",
    confidence,
    lineage: { objective: pack.lineage?.objective, opportunity_id: opportunity?.decision_id, opportunity_sha256: opportunity?.decision_sha256, primary_query: opportunity?.primary_query, article_type: opportunity?.article_type, search_intent: opportunity?.search_intent, evidence_pack_id: pack.evidence_pack_id, evidence_pack_sha256: pack.evidence_pack_sha256, subject_depth: pack.subject_depth, seo_guidance: seoGuidanceLineage },
    restrictions,
    safe_claim_categories: ["observed category terminology", "validated first-party Product Facts", "bounded buyer considerations", "qualified existence of multiple formats"],
    evidence_limitations: pack.unknowns || [],
    research_budget_status: pack.research_waves ? "EXHAUSTED" : "UNKNOWN",
    upgrade_rule: "WARN may become PASS only through a new validated evidence pack and reassessment; founder or model preference cannot upgrade it.",
    handoff_requirements: ["evidence_pack_id", "evidence_pack_sha256", "subject_depth", "restriction_policy_id", "restriction_policy_sha256", "evidence_refs"]
  };
  const { policy_id: _id, policy_sha256: _hash, ...core } = policy;
  return { ...policy, policy_id: stableId("article_claim_restriction_policy", core), policy_sha256: sha256(core) };
}

export function validateClaimRestrictionPolicy(policy, { pack, opportunity } = {}) {
  const errors = [];
  const confidence = evaluateResearchConfidence(pack);
  if (!policy || policy.artifact_type !== "article_claim_restriction_policy") errors.push("INVALID_POLICY_ARTIFACT");
  if (policy?.lineage?.evidence_pack_id !== pack?.evidence_pack_id || policy?.lineage?.evidence_pack_sha256 !== pack?.evidence_pack_sha256) errors.push("EVIDENCE_PACK_LINEAGE_MISMATCH");
  if (policy?.lineage?.opportunity_id !== opportunity?.decision_id || policy?.lineage?.opportunity_sha256 !== opportunity?.decision_sha256) errors.push("OPPORTUNITY_LINEAGE_MISMATCH");
  if (pack?.lineage?.opportunity_id !== opportunity?.decision_id) errors.push("PACK_OPPORTUNITY_LINEAGE_MISMATCH");
  if (pack?.lineage?.opportunity_sha256 && pack.lineage.opportunity_sha256 !== opportunity?.decision_sha256) errors.push("PACK_OPPORTUNITY_HASH_MISMATCH");
  if (policy?.lineage?.subject_depth?.status !== confidence.status) errors.push("SUBJECT_DEPTH_LINEAGE_MISMATCH");
  if (policy?.confidence?.status !== confidence.status) errors.push("POLICY_CONFIDENCE_STATUS_MISMATCH");
  if (confidence.status === "WARN" && !policy?.lineage?.seo_guidance?.snapshot_id) errors.push("WARN_SEO_GUIDANCE_LINEAGE_REQUIRED");
  if (confidence.status === "WARN" && !policy?.restrictions?.length) errors.push("WARN_RESTRICTIONS_REQUIRED");
  if (confidence.status === "FAIL" && policy?.confidence?.can_proceed) errors.push("FAIL_CANNOT_PROCEED");
  const known = new Set((pack?.sources || []).map((source) => source.source_id));
  for (const item of policy?.restrictions || []) {
    if (!RESTRICTION_TYPES.has(item.restriction_type)) errors.push(`INVALID_RESTRICTION_TYPE:${item.restriction_id}`);
    if (!CLAIM_TREATMENTS.has(item.treatment)) errors.push(`INVALID_CLAIM_TREATMENT:${item.restriction_id}`);
    if ((item.evidence_refs || []).some((ref) => !known.has(ref))) errors.push(`UNKNOWN_RESTRICTION_EVIDENCE:${item.restriction_id}`);
  }
  const { policy_id: _id, policy_sha256: _hash, ...core } = policy || {};
  if (policy && sha256(core) !== policy.policy_sha256) errors.push("POLICY_HASH_MISMATCH");
  return errors;
}

export function buildM4BHandoff({ pack, policy, opportunity, seoGuidanceLineage = null, productIntelligenceLineage = null }) {
  const errors = validateClaimRestrictionPolicy(policy, { pack, opportunity });
  const confidence = evaluateResearchConfidence(pack);
  if (confidence.status === "WARN" && errors.length) throw new Error(`WARN_HANDOFF_BLOCKED:${errors.join(",")}`);
  if (confidence.status === "FAIL") throw new Error("FAIL_HANDOFF_BLOCKED");
  return { handoff_status: "READY_FOR_M4B", planning_allowed: true, restriction_mode: confidence.restriction_mode, opportunity_lineage: { id: opportunity.decision_id, sha256: opportunity.decision_sha256 }, evidence_pack_lineage: { id: pack.evidence_pack_id, sha256: pack.evidence_pack_sha256 }, subject_depth: pack.subject_depth, restriction_policy_lineage: { id: policy.policy_id, sha256: policy.policy_sha256 }, seo_guidance_lineage: seoGuidanceLineage, product_intelligence_lineage: productIntelligenceLineage, required_inheritance: policy.handoff_requirements };
}
