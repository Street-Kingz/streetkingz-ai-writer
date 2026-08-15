export const BUSINESS_INTELLIGENCE_SCHEMA_VERSION = "1.0.0";

export const BUSINESS_KNOWLEDGE_TYPES = Object.freeze(["fact", "derived", "inference", "unknown"]);
export const BUSINESS_KNOWLEDGE_STATUSES = Object.freeze(["extracted", "inferred", "conflicted", "human_verified", "human_corrected"]);
export const ASSERTION_SCOPES = Object.freeze(["objective", "business_claim", "interpretation", "unknown"]);
export const BUSINESS_SOURCE_TYPES = Object.freeze([
  "structured_site_identity", "structured_catalogue", "navigation", "homepage", "about_page",
  "category_page", "product_sample", "faq", "customer_service_page", "ai_inference"
]);
export const BUSINESS_SOURCE_ROLES = Object.freeze(["structured_record", "observed_structure", "business_statement", "inference_output"]);
export const CLAIM_CLASSIFICATIONS = Object.freeze(["observed_fact", "positioning_claim", "customer_claim", "unknown"]);
export const BUSINESS_TYPES = Object.freeze(["brand", "retailer", "manufacturer", "marketplace", "mixed", "unknown"]);
export const CATALOGUE_COHERENCE = Object.freeze(["focused", "related_categories", "mixed", "unrelated_general_store", "unknown"]);
export const AUDIENCE_ARCHITECTURE_TYPES = Object.freeze(["focused_business", "multi_audience_business", "general_store", "unknown"]);
export const BUSINESS_WIDE_AUDIENCE_STATUSES = Object.freeze(["meaningful", "not_meaningful", "insufficient_evidence"]);
export const PRICE_VALUE_ORIENTATIONS = Object.freeze(["lowest_price", "value_for_money", "quality_over_lowest_price", "premium", "mixed", "unknown"]);
export const KNOWLEDGE_GAP_IMPORTANCE = Object.freeze(["low", "medium", "high", "critical"]);
export const VALIDATION_STATUSES = Object.freeze(["draft", "awaiting_validation", "validated", "requires_review"]);
export const HUMAN_VALIDATION_ACTIONS = Object.freeze(["approve", "reject", "correct"]);
export const HUMAN_DECISION_STATUSES = Object.freeze(["active", "superseded", "withdrawn"]);
export const HUMAN_CORRECTION_STATUSES = Object.freeze(["approved", "superseded", "withdrawn"]);
export const AUTHORITY_DOMAINS = Object.freeze(["business_identity", "catalogue_structure", "declared_positioning", "audience_understanding", "category_audience"]);

export const BUSINESS_KNOWLEDGE_VALUE_SCHEMA = Object.freeze({
  type: "object",
  required: ["value", "knowledge_type", "assertion_scope", "evidence_refs", "confidence", "status"],
  properties: {
    value: {}, knowledge_type: { enum: BUSINESS_KNOWLEDGE_TYPES }, assertion_scope: { enum: ASSERTION_SCOPES },
    evidence_refs: { type: "array", items: { type: "string" } }, confidence: { type: "number", minimum: 0, maximum: 1 },
    status: { enum: BUSINESS_KNOWLEDGE_STATUSES }
  }
});

export const BUSINESS_SOURCE_EVIDENCE_SCHEMA = Object.freeze({
  type: "object",
  required: ["id", "source_type", "source_uri_or_location", "source_role", "source_field", "raw_value", "normalised_value", "retrieved_at", "content_fingerprint", "claim_classification"],
  properties: {
    id: { type: "string" }, source_type: { enum: BUSINESS_SOURCE_TYPES }, source_uri_or_location: { type: "string" },
    source_role: { enum: BUSINESS_SOURCE_ROLES }, source_field: { type: "string" }, raw_value: {}, normalised_value: {},
    retrieved_at: { type: "string" }, content_fingerprint: { type: "string" }, claim_classification: { enum: CLAIM_CLASSIFICATIONS },
    context: { type: "object" }
  }
});

export const HUMAN_VALIDATION_DECISION_SCHEMA = Object.freeze({
  type: "object",
  required: ["id", "action", "target_path", "original_value", "reason", "reviewer", "created_at", "status", "correction_id"],
  properties: { action: { enum: HUMAN_VALIDATION_ACTIONS }, status: { enum: HUMAN_DECISION_STATUSES } }
});

export const HUMAN_CORRECTION_SCHEMA = Object.freeze({
  type: "object",
  required: ["id", "target_path", "previous_value", "corrected_value", "reason", "reviewer", "created_at", "status", "provenance", "supersedes_evidence_refs"],
  properties: { status: { enum: HUMAN_CORRECTION_STATUSES } }
});

export const BUSINESS_INTELLIGENCE_OBJECT_SCHEMA = Object.freeze({
  $id: "generic.business-intelligence-object.v1", type: "object",
  required: ["metadata", "business_identity", "catalogue_understanding", "audience_architecture", "source_evidence", "knowledge_gaps", "validation_status"],
  properties: {
    metadata: { required: ["object_id", "schema_version", "business_id", "primary_domain", "created_at", "updated_at", "source_fingerprint", "ingestion_status"] },
    business_identity: { required: ["business_name", "business_type"] },
    catalogue_understanding: { required: ["product_focus", "primary_categories", "catalogue_coherence"] },
    audience_architecture: { required: ["type", "business_wide_profile_status"] },
    customer_understanding: { type: "object" }, positioning: { type: "object" }, category_audiences: { type: "array" },
    knowledge_gaps: { type: "array" }, source_evidence: { type: "array", items: BUSINESS_SOURCE_EVIDENCE_SCHEMA },
    conflicts: { type: "array" }, human_validation_decisions: { type: "array", items: HUMAN_VALIDATION_DECISION_SCHEMA },
    human_corrections: { type: "array", items: HUMAN_CORRECTION_SCHEMA }, validation_status: { enum: VALIDATION_STATUSES },
    execution_metadata: { type: "object" }
  },
  definitions: { business_knowledge_value: BUSINESS_KNOWLEDGE_VALUE_SCHEMA, business_source_evidence: BUSINESS_SOURCE_EVIDENCE_SCHEMA, human_validation_decision: HUMAN_VALIDATION_DECISION_SCHEMA, human_correction: HUMAN_CORRECTION_SCHEMA }
});
