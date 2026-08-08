export const INTERPRETATION_SCHEMA_VERSION = "2.0.0";
export const INTERPRETATION_PROMPT_VERSION = "4.0.0";
export const INTERPRETATION_OBJECTIVE = "improve_existing_product_page";

export const EVIDENCE_CATEGORIES = Object.freeze(["product_facts", "keyword_ideas", "serp_advanced", "search_console"]);
export const DECISION_AREAS = Object.freeze([
  "search_positioning", "title_headings", "differentiation", "product_description_benefits", "specifications",
  "faqs_questions", "comparisons", "care_usage_guidance", "internal_linking", "metadata", "clarity_trust"
]);
export const DECISION_OUTCOMES = Object.freeze(["improve", "add", "reposition", "clarify", "reduce", "no_change", "insufficient_evidence"]);
export const CONFIDENCE_LEVELS = Object.freeze(["high", "medium", "low"]);

const stringArray = { type: "array", items: { type: "string" } };
const citations = {
  evidence_ids: stringArray,
  evidence_categories: { type: "array", items: { type: "string", enum: [...EVIDENCE_CATEGORIES] } }
};

export function interpretationJsonSchema() {
  return {
    type: "object", additionalProperties: false,
    required: ["schema_version", "objective", "source_product", "category_assessments", "findings", "decision_areas", "limitations", "overall_assessment"],
    properties: {
      schema_version: { type: "string", enum: [INTERPRETATION_SCHEMA_VERSION] },
      objective: { type: "string", enum: [INTERPRETATION_OBJECTIVE] },
      source_product: {
        type: "object", additionalProperties: false, required: ["subject_id", "product_name", "product_url"],
        properties: { subject_id: { type: "string" }, product_name: { type: "string" }, product_url: { type: "string" } }
      },
      category_assessments: {
        type: "array",
        items: { type: "object", additionalProperties: false, required: ["category", "assessment", "evidence_ids", "reason_no_action"], properties: {
          category: { type: "string", enum: [...EVIDENCE_CATEGORIES] }, assessment: { type: "string" },
          evidence_ids: stringArray, reason_no_action: { anyOf: [{ type: "string" }, { type: "null" }] }
        } }
      },
      findings: {
        type: "array", items: { type: "object", additionalProperties: false, required: ["id", "finding", "evidence_ids", "evidence_categories", "confidence", "confidence_reason", "limitations"], properties: {
          id: { type: "string" }, finding: { type: "string" }, ...citations,
          confidence: { type: "string", enum: [...CONFIDENCE_LEVELS] }, confidence_reason: { type: "string" }, limitations: stringArray
        } }
      },
      decision_areas: {
        type: "array",
        items: { type: "object", additionalProperties: false, required: ["area", "outcome", "current_state", "recommendation", "evidence_ids", "evidence_categories", "external_evidence_ids", "confidence", "confidence_reason", "limitations"], properties: {
          area: { type: "string", enum: [...DECISION_AREAS] }, outcome: { type: "string", enum: [...DECISION_OUTCOMES] }, current_state: { type: "string", enum: ["present", "absent", "unknown"] },
          recommendation: { type: "string" }, ...citations, external_evidence_ids: stringArray, confidence: { type: "string", enum: [...CONFIDENCE_LEVELS] }, confidence_reason: { type: "string" }, limitations: stringArray
        } }
      },
      limitations: stringArray,
      overall_assessment: { type: "string" }
    }
  };
}

export function interpretationOutputShape() {
  return {
    schema_version: INTERPRETATION_SCHEMA_VERSION, objective: INTERPRETATION_OBJECTIVE,
    source_product: { subject_id: "exact context value", product_name: "exact context value", product_url: "exact context value" },
    category_assessments: EVIDENCE_CATEGORIES.map((category) => ({ category, assessment: "evidence-backed assessment", evidence_ids: ["ID from this exact category"], reason_no_action: "reason or null" })),
    findings: [{ id: "finding_1", finding: "observation", evidence_ids: ["ID"], evidence_categories: [EVIDENCE_CATEGORIES.join(" | ")], confidence: CONFIDENCE_LEVELS.join(" | "), confidence_reason: "support reasoning", limitations: [] }],
    decision_areas: DECISION_AREAS.map((area) => ({ area, outcome: DECISION_OUTCOMES.join(" | "), current_state: "present | absent | unknown", recommendation: "specific recommendation or evidence-backed no-change/uncertainty rationale", evidence_ids: ["ID"], evidence_categories: [EVIDENCE_CATEGORIES.join(" | ")], external_evidence_ids: ["non-product evidence ID where applicable"], confidence: CONFIDENCE_LEVELS.join(" | "), confidence_reason: "support reasoning", limitations: [] })),
    limitations: [], overall_assessment: "concise assessment"
  };
}
