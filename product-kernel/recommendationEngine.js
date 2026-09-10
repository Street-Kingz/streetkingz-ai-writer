import { sha256 } from "./decisionDiscovery.js";

export const RECOMMENDATION_VERSION = "v1-05-slice-c-recommendation-2";
export const RECOMMENDATION_STATUS = Object.freeze(["current", "deferred", "needs_reassessment", "superseded", "withdrawn", "completed", "ignored"]);
export const INTERVENTIONS = Object.freeze(["improve_existing_product", "improve_existing_category", "improve_existing_content", "create_new_page_or_content_asset", "improve_internal_linking", "no_action", "insufficient_evidence"]);
const priorityOrder = { high: 0, medium: 1, low: 2, reassess: 3 };
const rejectDispositions = new Set(["reject_mismatch", "reject_wrong_page_type", "reject_overlap_redundant"]);
const deterministicRejectStates = new Set(["reject", "rejected"]);

function text(value, fallback = "") { return typeof value === "string" ? value : fallback; }
function unique(values) { return [...new Set((values || []).filter(Boolean).map(String))]; }
function interventionFor(candidate) {
  return { existing_product_improvement: "improve_existing_product", existing_category_improvement: "improve_existing_category", existing_content_improvement: "improve_existing_content", new_page_or_content_asset: "create_new_page_or_content_asset", internal_linking: "improve_internal_linking" }[candidate.candidate_type] || null;
}
function commercialSignal(candidate) {
  const commercial = candidate.commercial_context;
  if (!commercial || commercial.available !== true || commercial.reliable !== true || commercial.relevant !== true) return { state: "unknown", reasons: ["commercial_evidence_unavailable_or_unreliable"], applied_dimensions: [] };
  if (commercial.stock_status === "outofstock" || commercial.stock_status === "out_of_stock") return { state: "adverse", reasons: ["stock_constraint_limits_immediate_action"], applied_dimensions: ["sequencing", "explanation"] };
  if (Number.isFinite(commercial.stock_quantity) && commercial.stock_quantity > 0 && Number(commercial.sales_90d || 0) > 0) return { state: "supportive", reasons: ["reliable_stock_and_sales_context_supports_priority"], applied_dimensions: ["priority", "explanation"] };
  return { state: "neutral", reasons: ["reliable_commercial_context_does_not_change_organic_target"], applied_dimensions: ["explanation"] };
}

export function qualificationEligibility(candidate) {
  if (deterministicRejectStates.has(text(candidate.deterministic_disposition)) || candidate.candidate_status === "rejected") {
    return { state: "rejected", reasons: ["deterministic_rejection_not_actionable"] };
  }
  if (candidate.deterministic_disposition === "bounded_out") {
    return { state: "unassessed", reasons: ["candidate_bounded_out_before_interpretation"] };
  }
  if (candidate.interpretation_state !== "complete") {
    return { state: "unassessed", reasons: ["applicable_interpretation_not_complete"] };
  }
  if (rejectDispositions.has(text(candidate.interpretive_disposition))) {
    return { state: "rejected", reasons: ["interpretive_rejection_not_actionable"] };
  }
  if (candidate.interpretive_disposition === "retain_uncertain") {
    return { state: "uncertain", reasons: ["completed_interpretation_uncertain"] };
  }
  if (candidate.interpretive_disposition !== "retain") {
    return { state: "unassessed", reasons: ["interpretation_not_qualified_for_action"] };
  }
  return { state: "qualified", reasons: ["applicable_qualification_complete"] };
}

export function merchantSafetyProjection(candidate) {
  const targetRefs = Array.isArray(candidate.attributed_target_resources) ? candidate.attributed_target_resources : [];
  const disposition = text(candidate.interpretive_disposition);
  const unsafeReasons = [];
  if (candidate.target_attribution_state === "invalid" || (candidate.target_attribution_state === "established" && targetRefs.length === 0)) unsafeReasons.push("invalid_or_missing_target_attribution");
  if (candidate.relevance_state === "irrelevant" && !rejectDispositions.has(disposition)) unsafeReasons.push("irrelevant_opportunity_retained");
  if (candidate.page_type_fit === "misaligned" && disposition !== "reject_wrong_page_type") unsafeReasons.push("wrong_page_type_retained");
  if (candidate.new_asset_fit === "redundant" && disposition !== "reject_overlap_redundant") unsafeReasons.push("redundant_new_asset_recommended");
  if (candidate.invented_evidence === true || candidate.invented_target === true) unsafeReasons.push("invented_evidence_or_target");
  if (unsafeReasons.length) return { state: "unsafe", reasons: unsafeReasons };
  const uncertainReasons = [];
  if (["ambiguous", "unresolved"].includes(candidate.target_attribution_state)) uncertainReasons.push("target_attribution_uncertain");
  if (["uncertain"].includes(candidate.relevance_state)) uncertainReasons.push("relevance_uncertain");
  if (["ambiguous", "unknown"].includes(candidate.page_type_fit)) uncertainReasons.push("page_type_uncertain");
  if (["retain_uncertain"].includes(disposition) || ["low", "unknown"].includes(candidate.intent_confidence)) uncertainReasons.push("interpretation_confidence_limited");
  if (uncertainReasons.length) return { state: "uncertain", reasons: unique(uncertainReasons) };
  return { state: "safe", reasons: rejectDispositions.has(disposition) ? ["candidate_blocked_by_interpretive_disposition"] : ["target_relevance_and_page_safety_supported"] };
}

function priorityFor(candidate, safety, commercial) {
  if (safety.state !== "safe" || rejectDispositions.has(candidate.interpretive_disposition)) return { band: "reassess", reasons: [safety.state === "unsafe" ? "merchant_safety_blocked" : "not_ready_for_confident_action"] };
  const reasons = [];
  let band = candidate.evidence_maturity === "rich" && candidate.target_attribution_state === "established" && candidate.page_type_fit === "aligned" ? "high" : candidate.evidence_maturity === "sparse" ? "low" : "medium";
  if (candidate.target_attribution_state === "established") reasons.push("target_is_established");
  if (candidate.page_type_fit === "aligned") reasons.push("page_type_fit_is_aligned");
  if (candidate.evidence_maturity) reasons.push(`evidence_maturity_${candidate.evidence_maturity}`);
  if (commercial.state === "supportive") { band = band === "low" ? "medium" : "high"; reasons.push("reliable_commercial_context_supports_priority"); }
  if (commercial.state === "adverse") { band = band === "high" ? "medium" : "low"; reasons.push("commercial_constraint_changes_sequencing"); }
  if (commercial.state === "unknown") reasons.push("commercial_context_remains_unknown");
  return { band, reasons: unique(reasons) };
}

export function buildRecommendationIdentity({ businessId, runId: _runId, candidate }) {
  return `rec-${sha256({ recommendation_version: RECOMMENDATION_VERSION, business_id: businessId || null, candidate_identity: candidate.candidate_identity, target_resources: candidate.attributed_target_resources || [], intervention: interventionFor(candidate) }).slice(0, 24)}`;
}

export function buildRecommendationRecord(candidate, { businessId = null, runId = null } = {}) {
  if (!candidate || !candidate.candidate_identity) throw new Error("RECOMMENDATION_CANDIDATE_IDENTITY_REQUIRED");
  const qualification = qualificationEligibility(candidate);
  const safety = merchantSafetyProjection(candidate); const commercial = commercialSignal(candidate); const priority = priorityFor(candidate, safety, commercial); const intervention = interventionFor(candidate);
  const rejected = rejectDispositions.has(candidate.interpretive_disposition);
  if (qualification.state !== "qualified") {
    const qualificationSafety = { state: "uncertain", reasons: qualification.reasons };
    const qualificationRejected = qualification.state === "rejected";
    const completedUncertainty = qualification.state === "uncertain";
    const explanation = qualificationRejected
      ? qualification.reasons[0] === "interpretive_rejection_not_actionable" ? "The completed interpretation rejected this candidate, so no action is recommended." : "The candidate was deterministically rejected, so no action is recommended."
      : completedUncertainty ? "The candidate was assessed, but the completed interpretation remains uncertain and is deferred for reassessment."
      : "The opportunity is preserved for audit or reassessment, but applicable qualification is incomplete.";
    return {
      recommendation_id: buildRecommendationIdentity({ businessId, runId, candidate }), business_id: businessId, source_run_id: runId, source_candidate_identity: candidate.candidate_identity,
      status: "deferred", intervention: qualificationRejected ? "no_action" : "insufficient_evidence", priority_band: "reassess",
      priority_reasons: unique([...qualification.reasons, "qualification_required_before_action"]), target_resources: unique(candidate.attributed_target_resources), customer_job: text(candidate.customer_job) || null,
      merchant_safety_state: qualificationSafety.state, merchant_safety_reasons: qualificationSafety.reasons, commercial_signal: commercial, confidence: text(candidate.intent_confidence, "unknown"), limitations: unique(candidate.limitations), evidence_refs: candidate.evidence_refs || [],
      why_this_matters: explanation,
      what_to_do_next: [{ objective: qualificationRejected ? "No action" : completedUncertainty ? "Reassess the uncertain interpretation before action" : "Complete qualification before action", actions: qualificationRejected ? ["Retain the rejection rationale for audit"] : completedUncertainty ? ["Review the cited evidence and completed interpretation", "Reassess the opportunity after the evidence is updated"] : ["Review the cited evidence and complete applicable qualification", "Reassess the opportunity after the evidence is updated"], prerequisites: ["Evidence review"], important_limitation: "No current action is authorised from this state." }],
      recommendation_version: RECOMMENDATION_VERSION, provenance: { candidate_version: candidate.candidate_version || null, interpretation_version: candidate.interpretation_version || null, instruction_version: candidate.instruction_version || null, evidence_refs: candidate.evidence_refs || [] }
    };
  }
  const status = safety.state === "unsafe" ? "needs_reassessment" : safety.state === "uncertain" ? "deferred" : "current";
  const finalIntervention = rejected ? "no_action" : safety.state === "unsafe" ? "insufficient_evidence" : safety.state === "uncertain" ? "insufficient_evidence" : intervention;
  return {
    recommendation_id: buildRecommendationIdentity({ businessId, runId, candidate }), business_id: businessId, source_run_id: runId, source_candidate_identity: candidate.candidate_identity, status, intervention: finalIntervention, priority_band: priority.band, priority_reasons: unique([...priority.reasons, ...safety.reasons]), target_resources: unique(candidate.attributed_target_resources), customer_job: text(candidate.customer_job) || null, merchant_safety_state: safety.state, merchant_safety_reasons: safety.reasons, commercial_signal: commercial, confidence: text(candidate.intent_confidence, "unknown"), limitations: unique(candidate.limitations), evidence_refs: candidate.evidence_refs || [], why_this_matters: safety.state === "safe" && !rejected ? "Bounded organic evidence supports work on this opportunity and its identified target." : safety.state === "uncertain" ? "The opportunity may matter, but the available evidence is not strong enough for a confident current action." : safety.state === "unsafe" ? "This candidate is blocked because its merchant-facing decision safety could not be established." : "The candidate was not promoted because its interpretation disposition does not support action.", what_to_do_next: safety.state === "safe" && !rejected ? actionList(candidate, intervention) : [{ objective: "Resolve the evidence limitation before action", actions: ["Review the cited evidence and target state", "Confirm the missing or conflicting information", "Reassess the opportunity after the evidence is updated"], prerequisites: ["Evidence review"], important_limitation: "No current action is authorised from this state." }], recommendation_version: RECOMMENDATION_VERSION, provenance: { candidate_version: candidate.candidate_version || null, interpretation_version: candidate.interpretation_version || null, instruction_version: candidate.instruction_version || null, evidence_refs: candidate.evidence_refs || [] }
  };
}

function actionList(candidate, intervention) {
  const target = unique(candidate.attributed_target_resources); const first = target[0] || "the identified target";
  const action = { improve_existing_product: "Review and improve the identified product page", improve_existing_category: "Review and improve the identified category page", improve_existing_content: "Review and improve the identified content page", create_new_page_or_content_asset: "Assess a new page or content asset against the supplied evidence", improve_internal_linking: "Review the identified internal-link route" }[intervention] || "Review the recommendation evidence";
  return [{ objective: action, actions: [action, `Check the supplied evidence and target ${first}`, "Make only evidence-supported changes", "Recheck the target and supporting evidence after the change"], prerequisites: ["Access to the relevant site or catalogue area"], important_limitation: "This is a bounded development action list, not an execution authorization." }];
}

export function rankRecommendations(candidates, options = {}) {
  const records = (candidates || []).map(candidate => buildRecommendationRecord(candidate, options));
  const actionable = records.filter(record => record.merchant_safety_state === "safe" && record.intervention !== "no_action").sort((a, b) => priorityOrder[a.priority_band] - priorityOrder[b.priority_band] || a.recommendation_id.localeCompare(b.recommendation_id));
  const selected = new Set(actionable.slice(0, 5).map(record => record.recommendation_id));
  for (const record of records) if (record.intervention !== "no_action" && !selected.has(record.recommendation_id) && record.status === "current") { record.status = "deferred"; record.priority_band = "reassess"; record.priority_reasons = unique([...record.priority_reasons, "bounded_current_recommendation_limit"]); }
  return { recommendations: records, current_recommendations: records.filter(record => selected.has(record.recommendation_id)), outcomes: { no_action: records.some(record => record.intervention === "no_action"), insufficient_evidence: records.some(record => record.intervention === "insufficient_evidence") } };
}

export function projectMerchantRecommendation(record) {
  const target = record.target_resources.length ? record.target_resources.join(", ") : "No confirmed target";
  return { title: record.intervention === "no_action" ? "No action recommended" : record.intervention === "insufficient_evidence" ? "More evidence needed before action" : record.intervention.replaceAll("_", " ").replace(/^./, char => char.toUpperCase()), priority: record.priority_band, state: record.status, why_this_matters: record.why_this_matters, recommended_action: record.intervention.replaceAll("_", " "), target, confidence: record.confidence, limitations: record.limitations, evidence: record.evidence_refs.map(ref => ({ source_kind: ref.source_kind, source_record_type: ref.source_record_type, source_record_id: ref.source_record_id, source_run_or_generation_reference: ref.source_run_or_generation_reference, relationship: ref.relationship })), what_to_do_next: record.what_to_do_next };
}

export function upsertRecommendationRecords(existingRecords, candidates, options = {}) {
  const map = new Map((existingRecords || []).map(record => [record.recommendation_id, record]));
  const terminal = new Set(["completed", "ignored", "superseded", "withdrawn"]);
  for (const record of rankRecommendations(candidates, options).recommendations) { const prior = map.get(record.recommendation_id); if (prior && terminal.has(prior.status)) record.status = prior.status; map.set(record.recommendation_id, record); }
  return [...map.values()].sort((a, b) => a.recommendation_id.localeCompare(b.recommendation_id));
}
