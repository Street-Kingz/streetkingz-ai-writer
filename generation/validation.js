import { GENERATION_HUMAN_REVIEW_STATES, GENERATION_OPERATIONS, GENERATION_OUTPUT_SCHEMA_VERSION } from "./contracts.js";

const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const superiority = /\b(?:better than|more absorbent than|safer than|outperforms?|lasts longer than|best(?:\s+in|\s+on|\s+for)?|superior to)\b/i;
const rankingClaim = /\b(?:google (?:prefers?|rewards?|requires?)|ranking requirement|guarantee(?:d)? rankings?|rank higher)\b/i;

export function validateGenerationOutput(output, brief) {
  const errors = [];
  const actions = new Map((brief?.approved_actions || []).map((action) => [action.action_id, action]));
  if (!output || typeof output !== "object" || Array.isArray(output)) return [{ code: "INVALID_SCHEMA", path: "$" }];
  if (output.schema_version !== GENERATION_OUTPUT_SCHEMA_VERSION || output.generation_brief_id !== brief.generation_brief_id || !Array.isArray(output.changes) || !Array.isArray(output.limitations) || !GENERATION_HUMAN_REVIEW_STATES.includes(output.human_review_state)) errors.push({ code: "INVALID_SCHEMA", path: "$" });
  const seen = new Set();
  for (const [index, change] of (output.changes || []).entries()) {
    const path = `changes[${index}]`;
    const action = actions.get(change.action_id);
    if (!action) { errors.push({ code: "UNAPPROVED_ACTION", path }); continue; }
    if (seen.has(change.action_id)) errors.push({ code: "DUPLICATE_ACTION_ID", path });
    seen.add(change.action_id);
    if (change.decision_area !== action.decision_area) errors.push({ code: "ACTION_SCOPE_MISMATCH", path });
    if (!GENERATION_OPERATIONS.includes(change.operation) || !action.allowed_operations.includes(change.operation)) errors.push({ code: "INVALID_OPERATION", path });
    if (!Array.isArray(change.factual_evidence_ids) || !Array.isArray(change.search_evidence_ids) || !Array.isArray(change.implementation_notes) || !Array.isArray(change.limitations)) errors.push({ code: "INVALID_SCHEMA", path });
    const allowed = new Set(action.allowed_evidence_ids);
    for (const id of [...(change.factual_evidence_ids || []), ...(change.search_evidence_ids || [])]) if (!allowed.has(id)) errors.push({ code: "INVALID_EVIDENCE_ID", path, evidence_id: id });
    const factual = new Set(action.factual_evidence_ids);
    for (const id of change.factual_evidence_ids || []) if (!factual.has(id)) errors.push({ code: "INVALID_FACTUAL_EVIDENCE", path, evidence_id: id });
    const search = new Set(action.search_evidence_ids);
    for (const id of change.search_evidence_ids || []) if (!action.search_execution_authorized || !search.has(id)) errors.push({ code: "UNAPPROVED_SEARCH_EVIDENCE", path, evidence_id: id });
    if (action.current_state === "unknown" && action.decision_area === "metadata" && change.operation !== "no_output") errors.push({ code: "UNKNOWN_METADATA_GENERATION", path });
    if (change.operation === "insert" && action.interpretation_outcome !== "add") errors.push({ code: "PAGE_STATE_OPERATION_MISMATCH", path });
    if (["replace", "move", "shorten", "remove"].includes(change.operation) && action.current_state !== "present") errors.push({ code: "PAGE_STATE_OPERATION_MISMATCH", path });
    if (!["no_output", "remove"].includes(change.operation) && !nonEmpty(change.proposed_content)) errors.push({ code: "MISSING_PROPOSED_CONTENT", path });
    if (change.operation === "remove" && change.proposed_content !== null) errors.push({ code: "INVALID_REMOVE_OUTPUT", path });
    if (change.operation === "no_output" && change.proposed_content !== null) errors.push({ code: "INVALID_NO_OUTPUT", path });
    if (change.operation !== "no_output" && !(change.factual_evidence_ids || []).length) errors.push({ code: "MISSING_FACTUAL_SUPPORT", path });
    if (["replace", "move", "shorten", "remove"].includes(change.operation) && !nonEmpty(change.existing_content)) errors.push({ code: "MISSING_EXISTING_CONTENT", path });
    for (const limitation of action.required_limitations) if (!(change.limitations || []).includes(limitation)) errors.push({ code: "REQUIRED_LIMITATION_DROPPED", path, limitation });
    const prose = `${change.proposed_content || ""} ${(change.implementation_notes || []).join(" ")}`;
    if (superiority.test(prose)) errors.push({ code: "UNSUPPORTED_SUPERIORITY_LANGUAGE", path });
    if (rankingClaim.test(prose)) errors.push({ code: "UNSUPPORTED_RANKING_LANGUAGE", path });
  }
  for (const actionId of actions.keys()) if (!seen.has(actionId)) errors.push({ code: "MISSING_APPROVED_ACTION", path: "changes", action_id: actionId });
  return errors;
}
