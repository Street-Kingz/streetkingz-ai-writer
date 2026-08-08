import { DECISION_AREAS } from "../interpretation/contracts.js";

export const APPROVAL_SCHEMA_VERSION = "2.0.0";
export const EXECUTION_RESOLUTION_SCHEMA_VERSION = "1.0.0";
export const GENERATION_BRIEF_SCHEMA_VERSION = "2.0.0";
export const GENERATION_OUTPUT_SCHEMA_VERSION = "2.0.0";

export const APPROVAL_STATES = Object.freeze(["approved", "rejected", "modified", "pending"]);
export const EXECUTION_STATES = Object.freeze(["authorised", "no_output", "insufficient_evidence", "requires_page_state"]);
export const EXECUTION_ROLES = Object.freeze(["generation_action", "shared_constraint", "none"]);
export const ACTIONABLE_DECISION_OUTCOMES = Object.freeze(["improve", "add", "reposition", "clarify", "reduce"]);
export const GENERATION_OBJECTIVES = Object.freeze([
  "rewrite_existing_section",
  "add_approved_section",
  "reposition_existing_content",
  "clarify_existing_copy",
  "reduce_approved_content",
  "create_approved_faq_answer",
  "create_approved_comparison_presentation",
  "produce_approved_title_heading_wording",
  "produce_approved_metadata",
  "propose_approved_internal_link_anchor"
]);
export const GENERATION_OPERATIONS = Object.freeze(["replace", "insert", "move", "shorten", "remove", "no_output"]);
export const GENERATION_HUMAN_REVIEW_STATES = Object.freeze(["awaiting_human_review"]);

export const OPERATIONS_BY_OUTCOME = Object.freeze({
  improve: Object.freeze(["replace", "shorten", "no_output"]),
  add: Object.freeze(["insert", "no_output"]),
  reposition: Object.freeze(["move", "replace", "no_output"]),
  clarify: Object.freeze(["replace", "no_output"]),
  reduce: Object.freeze(["shorten", "remove", "no_output"])
});

export const DEFAULT_OBJECTIVE_BY_OUTCOME = Object.freeze({
  improve: "rewrite_existing_section",
  add: "add_approved_section",
  reposition: "reposition_existing_content",
  clarify: "clarify_existing_copy",
  reduce: "reduce_approved_content"
});

const stringArray = { type: "array", items: { type: "string" } };

export function generationOutputJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["schema_version", "generation_brief_id", "changes", "limitations", "human_review_state"],
    properties: {
      schema_version: { type: "string", enum: [GENERATION_OUTPUT_SCHEMA_VERSION] },
      generation_brief_id: { type: "string" },
      changes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["action_id", "decision_area", "operation", "existing_content", "proposed_content", "factual_evidence_ids", "search_evidence_ids", "comparison_claims", "implementation_notes", "limitations"],
          properties: {
            action_id: { type: "string" },
            decision_area: { type: "string", enum: [...DECISION_AREAS] },
            operation: { type: "string", enum: [...GENERATION_OPERATIONS] },
            existing_content: { anyOf: [{ type: "string" }, { type: "null" }] },
            proposed_content: { anyOf: [{ type: "string" }, { type: "null" }] },
            factual_evidence_ids: stringArray,
            search_evidence_ids: stringArray,
            comparison_claims: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["entity_id", "attribute", "evidence_ids"],
                properties: {
                  entity_id: { type: "string" },
                  attribute: { type: "string" },
                  evidence_ids: stringArray
                }
              }
            },
            implementation_notes: stringArray,
            limitations: stringArray
          }
        }
      },
      limitations: stringArray,
      human_review_state: { type: "string", enum: [...GENERATION_HUMAN_REVIEW_STATES] }
    }
  };
}
