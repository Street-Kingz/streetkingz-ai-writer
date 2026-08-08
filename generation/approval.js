import { sha256, stableId } from "../research/core/canonical.js";
import { APPROVAL_SCHEMA_VERSION, APPROVAL_STATES } from "./contracts.js";

const clone = (value) => structuredClone(value);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

export function interpretationIdentity(interpretation) {
  return interpretation.interpretation_id || stableId("interpretation", interpretation);
}

export function createApprovalArtifact({ interpretation, decisions = {}, fixtureOnly = false, createdAt = null, reviewer = null }) {
  if (!interpretation || !Array.isArray(interpretation.decision_areas)) throw new Error("A structured interpretation is required.");
  const sourceId = interpretationIdentity(interpretation);
  const approvals = interpretation.decision_areas.map((decision) => {
    const selection = decisions[decision.area] || { state: "pending" };
    if (!APPROVAL_STATES.includes(selection.state)) throw new Error(`Invalid approval state for ${decision.area}.`);
    if (selection.state === "modified" && !nonEmpty(selection.human_modification)) throw new Error(`Modified decision ${decision.area} requires human_modification.`);
    return {
      action_id: stableId("approved_action", { interpretation_id: sourceId, decision_area: decision.area }),
      decision_area: decision.area,
      approval_state: selection.state,
      original_decision_sha256: sha256(decision),
      original_interpretation: clone(decision),
      human_modification: selection.state === "modified" ? selection.human_modification.trim() : null,
      reason: nonEmpty(selection.reason) ? selection.reason.trim() : null,
      original_evidence_ids: [...decision.evidence_ids],
      approved_at: ["approved", "modified", "rejected"].includes(selection.state) ? (selection.approved_at || createdAt) : null
    };
  });
  const core = {
    schema_version: APPROVAL_SCHEMA_VERSION,
    artifact_type: "interpretation_decision_approval",
    fixture_only: fixtureOnly === true,
    source_interpretation_id: sourceId,
    source_interpretation_sha256: sha256(interpretation),
    reviewer,
    created_at: createdAt,
    decisions: approvals
  };
  return { ...core, approval_artifact_id: stableId("approval", core) };
}

export function validateApprovalArtifact(approval, interpretation) {
  const errors = [];
  const source = new Map((interpretation?.decision_areas || []).map((decision) => [decision.area, decision]));
  if (approval?.source_interpretation_sha256 !== sha256(interpretation)) errors.push({ code: "INTERPRETATION_HASH_MISMATCH", path: "source_interpretation_sha256" });
  const seen = new Set();
  for (const [index, item] of (approval?.decisions || []).entries()) {
    const path = `decisions[${index}]`;
    const original = source.get(item.decision_area);
    if (!original) errors.push({ code: "UNKNOWN_DECISION", path });
    if (seen.has(item.decision_area)) errors.push({ code: "DUPLICATE_APPROVAL", path });
    seen.add(item.decision_area);
    if (!APPROVAL_STATES.includes(item.approval_state)) errors.push({ code: "INVALID_APPROVAL_STATE", path });
    if (item.approval_state === "modified" && !nonEmpty(item.human_modification)) errors.push({ code: "MISSING_HUMAN_MODIFICATION", path });
    if (original && (item.original_decision_sha256 !== sha256(original) || sha256(item.original_interpretation) !== sha256(original))) errors.push({ code: "ORIGINAL_DECISION_MUTATED", path });
    if (original && JSON.stringify(item.original_evidence_ids) !== JSON.stringify(original.evidence_ids)) errors.push({ code: "ORIGINAL_CITATIONS_MUTATED", path });
  }
  for (const area of source.keys()) if (!seen.has(area)) errors.push({ code: "MISSING_APPROVAL_STATE", path: area });
  return errors;
}
