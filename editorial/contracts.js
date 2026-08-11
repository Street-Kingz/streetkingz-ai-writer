export const EDITORIAL_PAGE_SCHEMA_VERSION = "1.0.0";
export const EDITORIAL_PLAN_VERSION = "1.1.0";
export const EDITORIAL_PAGE_TYPES = Object.freeze(["cornerstone", "evergreen_guide", "product_guide", "category_guide"]);
export const CONVERSION_ROLES = Object.freeze(["none", "education", "consideration", "product_discovery", "conversion"]);
export const MEDIA_KINDS = Object.freeze(["lifestyle_image", "product_image", "comparison_visual", "explanatory_graphic", "demonstration_image"]);
export const COMPONENT_TYPES = Object.freeze([
  "hero", "quick_answer", "rich_text_section", "key_takeaway", "comparison_table", "criteria_cards",
  "image_text", "product_recommendation", "product_comparison", "pros_tradeoffs", "founder_note",
  "faq", "related_guides", "conclusion", "call_to_action"
]);

const string = { type: "string" };
const strings = { type: "array", items: string };
const evidenceIds = { type: "array", items: { $ref: "#/$defs/evidence_id" } };
const productIds = { type: "array", items: { $ref: "#/$defs/product_id" } };
const linkIds = { type: "array", items: { $ref: "#/$defs/internal_link_id" } };
const mediaRequirement = {
  type: "object", additionalProperties: false,
  required: ["requirement_id", "kind", "purpose", "alt_text_direction", "status"],
  properties: {
    requirement_id: string, kind: { type: "string", enum: [...MEDIA_KINDS] }, purpose: string,
    alt_text_direction: string, status: { type: "string", enum: ["required_missing", "optional_missing"] }
  }
};
const baseProperties = {
  component_id: string,
  component_type: { type: "string", enum: [...COMPONENT_TYPES] },
  evidence_ids: evidenceIds,
  product_ids: productIds,
  internal_link_ids: linkIds,
  media_requirements: { type: "array", items: mediaRequirement },
  conversion_role: { type: "string", enum: [...CONVERSION_ROLES] }
};
const component = (type, dataProperties, dataRequired = Object.keys(dataProperties)) => ({
  type: "object", additionalProperties: false,
  required: [...Object.keys(baseProperties), "data"],
  properties: {
    ...baseProperties,
    component_type: { type: "string", enum: [type] },
    data: { type: "object", additionalProperties: false, required: dataRequired, properties: dataProperties }
  }
});

export const COMPONENT_DATA_SCHEMAS = Object.freeze({
  hero: component("hero", { h1: string, supporting_copy: string, trust_update_note: { anyOf: [string, { type: "null" }] } }),
  quick_answer: component("quick_answer", { heading: string, concise_answer: string, supporting_points: strings }),
  rich_text_section: component("rich_text_section", { heading: string, paragraphs: strings, key_points: strings }),
  key_takeaway: component("key_takeaway", { heading: string, takeaway: string, supporting_points: strings }),
  comparison_table: component("comparison_table", { heading: string, columns: strings, rows: { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "cells", "evidence_ids"], properties: { label: string, cells: strings, evidence_ids: evidenceIds } } }, limitations: strings }),
  criteria_cards: component("criteria_cards", { heading: string, cards: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "explanation", "evidence_ids"], properties: { title: string, explanation: string, evidence_ids: evidenceIds } } } }),
  image_text: component("image_text", { heading: string, body: strings, media_requirement_id: string }),
  product_recommendation: component("product_recommendation", { heading: string, product_id: { $ref: "#/$defs/product_id" }, recommendation_context: string, relevance_reason: string, cta_direction: string }),
  product_comparison: component("product_comparison", { heading: string, product_ids: productIds, comparison_points: { type: "array", items: { type: "object", additionalProperties: false, required: ["criterion", "values", "evidence_ids"], properties: { criterion: string, values: strings, evidence_ids: evidenceIds } } }, limitations: strings }),
  pros_tradeoffs: component("pros_tradeoffs", { heading: string, advantages: strings, tradeoffs: strings, suitable_for: strings, not_ideal_for: strings }),
  founder_note: component("founder_note", { heading: string, opinion: string, attribution: string, fact_boundary: string }),
  faq: component("faq", {
    heading: string,
    items: { type: "array", items: { type: "object", additionalProperties: false, required: ["question", "answer", "evidence_ids", "claim_kind"], properties: { question: string, answer: string, evidence_ids: evidenceIds, claim_kind: { type: "string", enum: ["evidenced_fact", "bounded_inference", "first_party_opinion"] } } } }
  }),
  related_guides: component("related_guides", {
    heading: string,
    links: { type: "array", items: { type: "object", additionalProperties: false, required: ["internal_link_id", "context"], properties: { internal_link_id: { $ref: "#/$defs/internal_link_id" }, context: string } } }
  }),
  conclusion: component("conclusion", { heading: string, summary: string, next_step: string }),
  call_to_action: component("call_to_action", { heading: string, body: string, cta_direction: string, product_id: { anyOf: [{ $ref: "#/$defs/product_id" }, { type: "null" }] }, internal_link_id: { anyOf: [{ $ref: "#/$defs/internal_link_id" }, { type: "null" }] } })
});

const enumDefinition = (values) => ({ type: "string", ...(values?.length ? { enum: values } : {}) });

export function editorialPageJsonSchema(allowlists, plan = null) {
  const components = plan?.components?.length
    ? plan.components.map((slot) => ({
      ...COMPONENT_DATA_SCHEMAS[slot.component_type],
      properties: {
        ...COMPONENT_DATA_SCHEMAS[slot.component_type].properties,
        component_id: { type: "string", enum: [slot.component_id] }
      }
    }))
    : Object.values(COMPONENT_DATA_SCHEMAS);
  const componentIds = plan?.component_sequence || [];
  return {
    $defs: {
      evidence_id: enumDefinition(allowlists.evidence_ids),
      product_id: enumDefinition(allowlists.product_ids),
      internal_link_id: enumDefinition(allowlists.internal_link_ids)
    },
    type: "object", additionalProperties: false,
    required: ["schema_version", "artifact_type", "page_type", "topic", "search_intent", "title", "h1", "introduction_deck", "components", "conclusion", "validation_metadata"],
    properties: {
      schema_version: { type: "string", enum: [EDITORIAL_PAGE_SCHEMA_VERSION] },
      artifact_type: { type: "string", enum: ["structured_semantic_editorial_page"] },
      page_type: { type: "string", enum: [...EDITORIAL_PAGE_TYPES] },
      topic: string,
      search_intent: { type: "object", additionalProperties: false, required: ["primary", "secondary"], properties: { primary: string, secondary: { anyOf: [string, { type: "null" }] } } },
      title: string,
      h1: string,
      introduction_deck: string,
      components: {
        type: "array",
        ...(componentIds.length ? { minItems: componentIds.length, maxItems: componentIds.length } : {}),
        items: { anyOf: components }
      },
      conclusion: string,
      validation_metadata: { type: "object", additionalProperties: false, required: ["packet_id", "strategy_id", "page_plan_id", "page_plan_hash"], properties: { packet_id: string, strategy_id: string, page_plan_id: string, page_plan_hash: string } }
    }
  };
}
