import { stableId } from "../research/core/canonical.js";

export function createHumanValidationDecision({ action, targetPath, originalValue, reason, reviewer, createdAt, correctedValue }) {
  if (!['approve', 'reject', 'correct'].includes(action)) throw new Error("Human validation action is unsupported.");
  if (action === "correct" && correctedValue === undefined) throw new Error("A corrected value is required for a correction decision.");
  const correction = action === "correct" ? { id: stableId("bi_correction", { targetPath, originalValue, correctedValue, reason, reviewer, createdAt }), target_path: targetPath, previous_value: structuredClone(originalValue), corrected_value: structuredClone(correctedValue), reason, reviewer, created_at: createdAt, status: "approved", provenance: { source_type: "human_validation", reviewer }, supersedes_evidence_refs: [] } : null;
  const decisionCore = { action, target_path: targetPath, original_value: structuredClone(originalValue), reason, reviewer, created_at: createdAt, status: "active", correction_id: correction?.id || null };
  return { decision: { id: stableId("bi_decision", decisionCore), ...decisionCore }, correction };
}

export function resolveHumanValidationDecision(originalKnowledge, decision, correction = null) {
  if (decision.status !== "active") return { effective: originalKnowledge, audit: decision };
  if (JSON.stringify(decision.original_value) !== JSON.stringify(originalKnowledge)) throw new Error("Validation decision does not match the original knowledge.");
  if (decision.action === "approve") return { effective: { ...structuredClone(originalKnowledge), status: "human_verified", validation_decision_id: decision.id }, audit: decision };
  if (decision.action === "reject") return { effective: null, audit: decision };
  if (!correction || correction.id !== decision.correction_id || correction.status !== "approved") throw new Error("Active correction decision requires its approved correction artifact.");
  return { effective: { value: structuredClone(correction.corrected_value), knowledge_type: "fact", assertion_scope: "objective", evidence_refs: [], confidence: 1, status: "human_corrected", correction_id: correction.id, validation_decision_id: decision.id }, audit: decision };
}
