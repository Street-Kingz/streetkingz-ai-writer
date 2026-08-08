export const SCHEMA_VERSION = "1.0.0";

export const PROVIDER_STATUSES = Object.freeze([
  "complete",
  "partial",
  "failed",
  "unavailable",
  "skipped"
]);

export const RUN_STATUSES = Object.freeze(["complete", "partial", "insufficient", "failed"]);
export const SUFFICIENCY_STATES = Object.freeze(["sufficient", "partial", "insufficient", "unavailable"]);

export const OBJECTIVE_TYPES = Object.freeze([
  "improve_existing_product_page",
  "create_supporting_content",
  "identify_content_opportunities"
]);

export const providerRequestSchema = Object.freeze({
  $id: "streetkingz.provider-request.v1",
  type: "object",
  required: [
    "schema_version",
    "artifact_type",
    "provider_id",
    "subject_id",
    "product_facts_ref",
    "scope",
    "approval"
  ],
  properties: {
    schema_version: { const: SCHEMA_VERSION },
    artifact_type: { const: "provider_request" },
    provider_id: { type: "string" },
    subject_id: { type: "string" },
    product_facts_ref: { type: "object" },
    scope: { type: "object" },
    approval: { type: "object" }
  }
});

export const providerResultSchema = Object.freeze({
  $id: "streetkingz.provider-result.v1",
  type: "object",
  required: [
    "schema_version",
    "artifact_type",
    "provider_id",
    "provider_version",
    "provider_run_id",
    "request_fingerprint",
    "status",
    "cache",
    "raw_artifacts",
    "normalised_artifact",
    "evidence_record_ids",
    "errors",
    "warnings"
  ]
});

export const evidenceRecordSchema = Object.freeze({
  $id: "streetkingz.evidence-record.v1",
  type: "object",
  required: [
    "evidence_id",
    "provider_id",
    "provider_run_id",
    "evidence_type",
    "subject_id",
    "seed_ids",
    "value",
    "context",
    "observed_at",
    "retrieved_at",
    "provenance",
    "confidence",
    "raw_ref",
    "normaliser_version",
    "status"
  ]
});

export const coverageSchema = Object.freeze({
  $id: "streetkingz.coverage.v1",
  type: "object",
  required: [
    "schema_version",
    "artifact_type",
    "status",
    "requested_providers",
    "provider_statuses",
    "requested_evidence_types",
    "evidence_type_counts",
    "usable_record_count"
  ]
});

export const interpretationPlaceholderSchema = Object.freeze({
  $id: "streetkingz.interpretation-placeholder.v1",
  type: "object",
  required: [
    "schema_version",
    "artifact_type",
    "evidence_artifact_id",
    "evidence_artifact_hash",
    "status",
    "reason",
    "findings"
  ]
});

export const evidenceArtifactSchema = Object.freeze({
  $id: "streetkingz.evidence-artifact.v1",
  type: "object",
  required: [
    "schema_version",
    "artifact_type",
    "evidence_artifact_id",
    "evidence_run_id",
    "subject",
    "scope",
    "provider_runs",
    "records",
    "coverage_ref",
    "created_at",
    "warnings"
  ]
});

export const researchStateSchema = Object.freeze({
  $id: "content-intelligence.research-state.v1",
  type: "object",
  required: [
    "schema_version",
    "artifact_type",
    "research_state_id",
    "research_run_id",
    "objective",
    "source_evidence",
    "subject",
    "providers",
    "evidence_counts",
    "keyword_topic_groups",
    "site_pages",
    "external_pages",
    "external_domains",
    "serp_feature_observations",
    "search_console_relationships",
    "conflicts",
    "missing_evidence_categories",
    "sufficiency"
  ]
});
