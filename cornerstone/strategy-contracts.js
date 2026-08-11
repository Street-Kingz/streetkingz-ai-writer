export const CORNERSTONE_STRATEGY_SCHEMA_VERSION = "1.1.0";
export const CORNERSTONE_STRATEGY_PROMPT_VERSION = "1.1.0";
export const STRATEGY_DECISIONS = Object.freeze(["proceed", "proceed_with_caveats", "needs_more_evidence", "reject_topic"]);
export const STRATEGY_CONFIDENCE = Object.freeze(["low", "medium", "high"]);
export const CANNIBALISATION_HANDLING = Object.freeze(["proceed", "differentiate_intent", "consolidate", "update_existing_page_instead", "human_review_required"]);

const strings = { type: "array", items: { type: "string" } };
const evidenceIds = { type: "array", items: { $ref: "#/$defs/evidence_id" } };
const cited = {
  type: "object", additionalProperties: false,
  required: ["statement", "evidence_ids"],
  properties: { statement: { type: "string" }, evidence_ids: evidenceIds }
};
const citedList = { type: "array", items: cited };

export function cornerstoneStrategyJsonSchema(allowlists = null) {
  const evidenceEnum = allowlists?.evidence_ids || null;
  const productEnum = allowlists?.product_ids || null;
  const linkEnum = allowlists?.internal_link_ids || null;
  const idDefinition = (values) => values ? { type: "string", ...(values.length ? { enum: values } : {}) } : { type: "string" };
  return {
    $defs: { evidence_id: idDefinition(evidenceEnum), product_id: idDefinition(productEnum), internal_link_id: idDefinition(linkEnum) },
    type: "object", additionalProperties: false,
    required: ["schema_version", "packet_id", "decision", "strategy", "priorities", "structure", "content_gaps", "streetkingz_integration", "internal_linking", "cannibalisation", "evidence", "drafting_guidance", "open_questions"],
    properties: {
      schema_version: { type: "string", enum: [CORNERSTONE_STRATEGY_SCHEMA_VERSION] },
      packet_id: { type: "string" },
      decision: {
        type: "object", additionalProperties: false, required: ["outcome", "rationale", "evidence_ids"],
        properties: { outcome: { type: "string", enum: [...STRATEGY_DECISIONS] }, rationale: { type: "string" }, evidence_ids: evidenceIds }
      },
      strategy: {
        type: "object", additionalProperties: false,
        required: ["primary_intent_interpretation", "secondary_intent", "recommended_content_angle", "reader_outcome", "differentiation_strategy", "commercial_role", "confidence"],
        properties: {
          primary_intent_interpretation: cited,
          secondary_intent: { anyOf: [cited, { type: "null" }] },
          recommended_content_angle: cited,
          reader_outcome: cited,
          differentiation_strategy: cited,
          commercial_role: cited,
          confidence: { type: "string", enum: [...STRATEGY_CONFIDENCE] }
        }
      },
      priorities: {
        type: "object", additionalProperties: false,
        required: ["must_cover_topics", "secondary_topics", "low_value_topics", "questions_requiring_strong_answers"],
        properties: { must_cover_topics: citedList, secondary_topics: citedList, low_value_topics: citedList, questions_requiring_strong_answers: citedList }
      },
      structure: {
        type: "object", additionalProperties: false, required: ["recommended_h1_direction", "sections"],
        properties: {
          recommended_h1_direction: cited,
          sections: { type: "array", items: { type: "object", additionalProperties: false, required: ["heading_direction", "purpose", "evidence_dependencies"], properties: { heading_direction: { type: "string" }, purpose: { type: "string" }, evidence_dependencies: evidenceIds } } }
        }
      },
      content_gaps: {
        type: "object", additionalProperties: false, required: ["defensible_gaps", "uncertain_potential_gaps", "cannot_currently_be_claimed"],
        properties: { defensible_gaps: citedList, uncertain_potential_gaps: citedList, cannot_currently_be_claimed: citedList }
      },
      streetkingz_integration: {
        type: "object", additionalProperties: false, required: ["genuinely_relevant_products", "natural_placements", "forced_promotion_areas", "cta_direction"],
        properties: {
          genuinely_relevant_products: { type: "array", ...(productEnum?.length === 0 ? { maxItems: 0 } : {}), items: { type: "object", additionalProperties: false, required: ["product_id", "recommended_role", "placement_reason", "evidence_ids"], properties: { product_id: { $ref: "#/$defs/product_id" }, recommended_role: { type: "string" }, placement_reason: { type: "string" }, evidence_ids: evidenceIds } } },
          natural_placements: citedList, forced_promotion_areas: citedList, cta_direction: cited
        }
      },
      internal_linking: {
        type: "array", ...(linkEnum?.length === 0 ? { maxItems: 0 } : {}), items: { type: "object", additionalProperties: false, required: ["link_id", "priority", "reasoning", "evidence_ids"], properties: { link_id: { $ref: "#/$defs/internal_link_id" }, priority: { type: "string", enum: ["high", "medium", "low"] }, reasoning: { type: "string" }, evidence_ids: evidenceIds } }
      },
      cannibalisation: {
        type: "object", additionalProperties: false, required: ["assessment", "recommended_handling", "escalation_required", "evidence_ids"],
        properties: { assessment: { type: "string" }, recommended_handling: { type: "string", enum: [...CANNIBALISATION_HANDLING] }, escalation_required: { type: "boolean" }, evidence_ids: evidenceIds }
      },
      evidence: {
        type: "object", additionalProperties: false, required: ["missing_evidence", "claims_requiring_caution", "page_level_competitor_extraction", "human_judgement"],
        properties: { missing_evidence: citedList, claims_requiring_caution: citedList, page_level_competitor_extraction: citedList, human_judgement: citedList }
      },
      drafting_guidance: {
        type: "object", additionalProperties: false, required: ["tone", "complexity", "practical_depth", "what_to_avoid", "examples_comparisons_to_consider"],
        properties: { tone: { type: "string" }, complexity: { type: "string" }, practical_depth: { type: "string" }, what_to_avoid: strings, examples_comparisons_to_consider: citedList }
      },
      open_questions: citedList
    }
  };
}
