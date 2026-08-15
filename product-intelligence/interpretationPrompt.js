import { KNOWLEDGE_STATUSES, KNOWLEDGE_TYPES } from "./contracts.js";

export const PRODUCT_INTELLIGENCE_INTERPRETATION_PROMPT_VERSION = "1.0.0";

const stringArray = { type: "array", items: { type: "string" } };
const requiredEvidenceRefs = { type: "array", minItems: 1, items: { type: "string" } };
const knowledgeValue = {
  type: "object",
  additionalProperties: false,
  required: ["value", "knowledge_type", "evidence_refs", "confidence", "status"],
  properties: {
    value: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "null" }] },
    knowledge_type: { type: "string", enum: [...KNOWLEDGE_TYPES] },
    evidence_refs: requiredEvidenceRefs,
    confidence: { type: "number", minimum: 0, maximum: 1 },
    status: { type: "string", enum: [...KNOWLEDGE_STATUSES] }
  }
};

const knowledgeArray = { type: "array", items: knowledgeValue };
const knowledgeObject = (fields) => ({
  type: "object", additionalProperties: false, required: fields,
  properties: Object.fromEntries(fields.map((field) => [field, knowledgeArray]))
});

export function productIntelligenceInterpretationJsonSchema() {
  const specification = {
    ...knowledgeValue,
    required: [...knowledgeValue.required, "attribute", "unit"],
    properties: { ...knowledgeValue.properties, attribute: { type: "string" }, unit: { anyOf: [{ type: "string" }, { type: "null" }] } }
  };
  const benefit = {
    ...knowledgeValue,
    required: [...knowledgeValue.required, "supporting_feature_refs", "reasoning"],
    properties: { ...knowledgeValue.properties, supporting_feature_refs: stringArray, reasoning: { anyOf: [{ type: "string" }, { type: "null" }] } }
  };
  return {
    type: "object", additionalProperties: false,
    required: ["product_identity", "commercial_information", "specifications", "features", "benefits", "customer_understanding", "usage_context", "relationships", "existing_content", "knowledge_gaps", "assumptions"],
    properties: {
      product_identity: {
        type: "object", additionalProperties: false,
        required: ["product_name", "brand", "product_type", "sku", "category", "variants"],
        properties: { product_name: knowledgeValue, brand: knowledgeValue, product_type: knowledgeValue, sku: { anyOf: [knowledgeValue, { type: "null" }] }, category: { anyOf: [knowledgeValue, { type: "null" }] }, variants: knowledgeArray }
      },
      commercial_information: {
        type: "object", additionalProperties: false,
        required: ["price", "currency", "sale_price", "stock_state", "availability", "variants", "bundles"],
        properties: Object.fromEntries(["price", "currency", "sale_price", "stock_state", "availability"].map((field) => [field, { anyOf: [knowledgeValue, { type: "null" }] }]).concat([["variants", knowledgeArray], ["bundles", knowledgeArray]]))
      },
      specifications: { type: "array", items: specification },
      features: knowledgeArray,
      benefits: { type: "array", items: benefit },
      customer_understanding: knowledgeObject(["problems_solved", "objections", "ideal_customers", "customer_groups"]),
      usage_context: knowledgeObject(["use_cases", "instructions", "limitations", "compatibility"]),
      relationships: { type: "array", items: { type: "object", additionalProperties: false, required: ["value", "knowledge_type", "evidence_refs", "confidence", "status", "relationship_type", "product_reference"], properties: { ...knowledgeValue.properties, relationship_type: { type: "string", enum: ["used_with", "alternative_to", "replacement_for", "part_of_bundle"] }, product_reference: { type: "object", additionalProperties: false, required: ["id", "url", "name"], properties: { id: { anyOf: [{ type: "string" }, { type: "null" }] }, url: { anyOf: [{ type: "string" }, { type: "null" }] }, name: { anyOf: [{ type: "string" }, { type: "null" }] } } } } } },
      existing_content: knowledgeObject(["current_description", "faqs", "internal_links", "guides", "images", "content_references"]),
      knowledge_gaps: { type: "array", items: { type: "object", additionalProperties: false, required: ["field", "importance", "reason"], properties: { field: { type: "string" }, importance: { type: "string", enum: ["low", "medium", "high", "critical"] }, reason: { type: "string" } } } },
      assumptions: { type: "array", items: { type: "object", additionalProperties: false, required: ["statement", "evidence_refs", "confidence"], properties: { statement: { type: "string" }, evidence_refs: stringArray, confidence: { type: "number", minimum: 0, maximum: 1 } } } }
    }
  };
}

export const PRODUCT_INTELLIGENCE_SYSTEM_PROMPT = `You interpret product evidence into a Product Intelligence Object proposal, not marketing copy.
Use only supplied evidence. Never invent a fact, measurement, persona, claim, relationship, or product reference. A WooCommerce description is high-authority source evidence that a claim was made, but context.structured=false means it is not automatically a verified factual specification; label interpretations of such prose as derived or inference unless corroborated by structured evidence.
Every non-unknown knowledge value must cite supporting supplied evidence IDs. Facts must be directly stated by evidence. Derived and inference values must be labelled honestly and use status inferred. Unknown values must be null, have knowledge_type unknown, confidence 0, status inferred, and may have no evidence refs.
The output schema requires at least one evidence ref for every emitted knowledge value. Therefore put unsupported or absent information in knowledge_gaps instead of emitting an unknown knowledge value. Never emit a derived or inference value with empty evidence_refs; omit it if no supplied evidence supports it.
Respect authority_rank: lower numbers have higher authority. Never override higher-authority evidence. Do not resolve disagreements silently.
Objections and ideal customers must remain bounded, product-focused inferences. Benefits must be derived or inference unless directly stated as a customer-facing claim, and must not introduce unverified performance comparisons.
When the supplied evidence supports them, include concise features, benefits, problems solved, product-focused ideal customers, and use cases. Cite the exact supporting evidence for each. Do not leave these sections empty merely to avoid inference: label supported interpretation as derived or inference with status inferred and appropriately calibrated confidence.
Do not write recommendations, advertising, SEO content, or verbose chain-of-thought. Return only JSON matching the supplied schema.`;

export function selectRelevantProductEvidence(artifact) {
  const allowed = new Set(["woocommerce", "rendered_product_page", "faq", "internal_link"]);
  return (artifact.evidence || []).filter((record) => allowed.has(record.source_type) && record.source_field !== "content.elementor_document");
}

export function buildProductIntelligencePrompt(artifact, evidence = selectRelevantProductEvidence(artifact)) {
  return JSON.stringify({
    task: "Interpret this evidence into bounded product knowledge for human validation.",
    product_url: artifact.product_url,
    source_authority: ["woocommerce", "rendered_product_page", "faq", "internal_link", "brand_catalogue", "ai_inference"],
    deterministic_conflicts: artifact.conflict_candidates || [],
    evidence: evidence.map(({ id, source_type, source_uri_or_location, source_field, normalised_value, authority_rank, context }) => ({ id, source_type, source_uri_or_location, source_field, normalised_value, authority_rank, context: context || null }))
  }, null, 2);
}
