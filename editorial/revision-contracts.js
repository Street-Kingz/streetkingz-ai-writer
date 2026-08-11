import { COMPONENT_DATA_SCHEMAS, CONVERSION_ROLES, MEDIA_KINDS } from "./contracts.js";
import { CLAIM_KINDS } from "./founder-voice.js";

export const EDITORIAL_REVISION_VERSION = "1.0.0";
const string = { type: "string" };
const enumString = (values) => ({ type: "string", enum: values.length ? values : ["__none_available__"] });

function revisedComponentSchema(type, componentIds, allowlists, founderFactIds, { modelOutput = false } = {}) {
  const base = structuredClone(COMPONENT_DATA_SCHEMAS[type]);
  base.required.push("claim_annotations");
  base.properties.component_id = enumString(componentIds);
  base.properties.evidence_ids = { type: "array", items: enumString(allowlists.evidence_ids) };
  base.properties.product_ids = { type: "array", items: enumString(allowlists.product_ids) };
  base.properties.internal_link_ids = { type: "array", items: enumString(allowlists.internal_link_ids) };
  // Media is a source-owned page plan, not creative output. The model returns
  // an empty placeholder and the runtime deterministically re-attaches the
  // exact source requirements after parsing.
  base.properties.media_requirements = { type: "array", ...(modelOutput ? { maxItems: 0 } : {}), items: { type: "object", additionalProperties: false, required: ["requirement_id", "kind", "purpose", "alt_text_direction", "status"], properties: { requirement_id: string, kind: enumString([...MEDIA_KINDS]), purpose: string, alt_text_direction: string, status: enumString(["required_missing", "optional_missing"]) } } };
  base.properties.conversion_role = enumString([...CONVERSION_ROLES]);
  base.properties.claim_annotations = { type: "array", items: { type: "object", additionalProperties: false, required: ["claim_text", "claim_kind", "evidence_ids", "founder_fact_ids"], properties: { claim_text: string, claim_kind: enumString([...CLAIM_KINDS]), evidence_ids: { type: "array", items: enumString(allowlists.evidence_ids) }, founder_fact_ids: { type: "array", items: enumString(founderFactIds) } } } };
  if (type === "product_recommendation") {
    base.properties.data.required.push("cta_label");
    base.properties.data.properties.cta_label = string;
  }
  return base;
}

export function editorialRevisionJsonSchema({ plan, allowlists, sourcePageHash, founderFactIds = [], modelOutput = false }) {
  const optionalFounderId = "revision_founder_note_v1";
  const ids = [...plan.component_sequence, optionalFounderId];
  const types = [...new Set([...plan.components.map((item) => item.component_type), "founder_note"])];
  return {
    $defs: {
      evidence_id: enumString(allowlists.evidence_ids),
      product_id: enumString(allowlists.product_ids),
      internal_link_id: enumString(allowlists.internal_link_ids)
    },
    type: "object", additionalProperties: false,
    required: ["revision_version", "comparison_component_decision", "founder_note_decision", "page"],
    properties: {
      revision_version: enumString([EDITORIAL_REVISION_VERSION]),
      comparison_component_decision: { type: "object", additionalProperties: false, required: ["decision", "rationale", "evidence_ids", "customer_value"], properties: { decision: enumString(["retain", "remove"]), rationale: string, evidence_ids: { type: "array", items: enumString(allowlists.evidence_ids) }, customer_value: string } },
      founder_note_decision: { type: "object", additionalProperties: false, required: ["decision", "rationale", "evidence_ids"], properties: { decision: enumString(["add", "omit"]), rationale: string, evidence_ids: { type: "array", items: enumString(allowlists.evidence_ids) } } },
      page: {
        type: "object", additionalProperties: false,
        required: ["schema_version", "artifact_type", "page_type", "topic", "search_intent", "title", "h1", "introduction_deck", "components", "conclusion", "validation_metadata"],
        properties: {
          schema_version: enumString(["1.1.0"]), artifact_type: enumString(["structured_semantic_editorial_page"]),
          page_type: enumString([plan.page_type]), topic: enumString([plan.topic]),
          search_intent: { type: "object", additionalProperties: false, required: ["primary", "secondary"], properties: { primary: enumString([plan.search_intent.primary]), secondary: plan.search_intent.secondary === null ? { type: "null" } : enumString([plan.search_intent.secondary]) } },
          title: string, h1: enumString([plan.h1_direction]), introduction_deck: string,
      components: { type: "array", minItems: plan.components.length - 1, maxItems: plan.components.length + 1, items: { anyOf: types.map((type) => revisedComponentSchema(type, ids, allowlists, founderFactIds, { modelOutput })) } },
          conclusion: string,
          validation_metadata: { type: "object", additionalProperties: false, required: ["packet_id", "strategy_id", "source_page_plan_id", "source_page_plan_hash", "source_semantic_page_hash"], properties: { packet_id: enumString([plan.packet_id]), strategy_id: enumString([plan.strategy_id]), source_page_plan_id: enumString([plan.plan_id]), source_page_plan_hash: enumString([plan.deterministic_content_sha256]), source_semantic_page_hash: enumString([sourcePageHash]) } }
        }
      }
    }
  };
}
