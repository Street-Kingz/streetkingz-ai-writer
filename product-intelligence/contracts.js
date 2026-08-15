export const PRODUCT_INTELLIGENCE_SCHEMA_VERSION = "1.0.0";

export const KNOWLEDGE_TYPES = Object.freeze(["fact", "derived", "inference", "unknown"]);
export const KNOWLEDGE_STATUSES = Object.freeze([
  "extracted",
  "inferred",
  "conflicted",
  "human_verified",
  "human_corrected"
]);
export const SOURCE_TYPES = Object.freeze([
  "woocommerce",
  "rendered_product_page",
  "faq",
  "internal_link",
  "brand_catalogue",
  "ai_inference",
  "human_correction"
]);
export const VALIDATION_STATUSES = Object.freeze([
  "draft",
  "awaiting_validation",
  "validated",
  "requires_review"
]);
export const HUMAN_CORRECTION_STATUSES = Object.freeze(["approved", "superseded", "withdrawn"]);
export const RELATIONSHIP_TYPES = Object.freeze([
  "used_with",
  "alternative_to",
  "replacement_for",
  "part_of_bundle"
]);
export const KNOWLEDGE_GAP_IMPORTANCE = Object.freeze(["low", "medium", "high", "critical"]);

export const PRODUCT_INTELLIGENCE_SECTIONS = Object.freeze([
  "metadata",
  "product_identity",
  "commercial_information",
  "specifications",
  "features",
  "benefits",
  "customer_understanding",
  "usage_context",
  "relationships",
  "existing_content",
  "knowledge_gaps",
  "source_evidence",
  "conflicts",
  "human_corrections",
  "validation_status",
  "execution_metadata"
]);

const knowledgeValueSchema = Object.freeze({
  type: "object",
  required: ["value", "knowledge_type", "evidence_refs", "confidence", "status"],
  properties: {
    value: {},
    knowledge_type: { enum: KNOWLEDGE_TYPES },
    evidence_refs: { type: "array", items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    status: { enum: KNOWLEDGE_STATUSES }
  }
});

export const KNOWLEDGE_VALUE_SCHEMA = knowledgeValueSchema;

export const SOURCE_EVIDENCE_SCHEMA = Object.freeze({
  type: "object",
  required: [
    "id", "source_type", "source_uri_or_location", "source_field", "raw_value",
    "normalised_value", "retrieved_at", "authority_rank", "content_fingerprint"
  ],
  properties: {
    id: { type: "string" },
    source_type: { enum: SOURCE_TYPES },
    source_uri_or_location: { type: "string" },
    source_field: { type: "string" },
    raw_value: {},
    normalised_value: {},
    retrieved_at: { type: "string" },
    authority_rank: { type: "integer" },
    content_fingerprint: { type: "string" },
    context: { type: "object" }
  }
});

export const HUMAN_CORRECTION_SCHEMA = Object.freeze({
  type: "object",
  required: ["id", "target_path", "previous_value", "corrected_value", "reason", "created_at", "status", "supersedes_evidence_refs"],
  properties: {
    id: { type: "string" },
    target_path: { type: "string" },
    previous_value: {},
    corrected_value: {},
    reason: { type: "string" },
    created_at: { type: "string" },
    status: { enum: HUMAN_CORRECTION_STATUSES },
    supersedes_evidence_refs: { type: "array", items: { type: "string" } }
  }
});

export const CONFLICT_SCHEMA = Object.freeze({
  type: "object",
  required: [
    "field", "candidates", "evidence_refs", "provisional_value", "provisional_evidence_ref",
    "resolution_method", "human_review_required", "final_resolution"
  ]
});

export const PRODUCT_INTELLIGENCE_OBJECT_SCHEMA = Object.freeze({
  $id: "streetkingz.product-intelligence-object.v1",
  type: "object",
  required: ["metadata", "product_identity", "source_evidence", "knowledge_gaps", "validation_status"],
  properties: {
    metadata: {
      required: ["object_id", "schema_version", "product_url", "created_at", "updated_at", "ingestion_status", "source_fingerprint"]
    },
    product_identity: { required: ["product_name", "brand", "product_type"] },
    commercial_information: { type: "object" },
    specifications: { type: "array" },
    features: { type: "array", items: knowledgeValueSchema },
    benefits: { type: "array", items: knowledgeValueSchema },
    customer_understanding: { type: "object" },
    usage_context: { type: "object" },
    relationships: { type: "array" },
    existing_content: { type: "object" },
    knowledge_gaps: { type: "array" },
    source_evidence: { type: "array", items: SOURCE_EVIDENCE_SCHEMA },
    conflicts: { type: "array", items: CONFLICT_SCHEMA },
    human_corrections: { type: "array", items: HUMAN_CORRECTION_SCHEMA },
    validation_status: { enum: VALIDATION_STATUSES },
    execution_metadata: { type: "object" }
  },
  definitions: {
    knowledge_value: knowledgeValueSchema,
    source_evidence: SOURCE_EVIDENCE_SCHEMA,
    human_correction: HUMAN_CORRECTION_SCHEMA,
    conflict: CONFLICT_SCHEMA
  }
});
