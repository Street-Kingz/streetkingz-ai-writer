import {
  PROVIDER_STATUSES,
  RUN_STATUSES,
  SCHEMA_VERSION
} from "../contracts/schemas.js";
import { sha256 } from "../core/canonical.js";

export class EvidenceValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = "EvidenceValidationError";
    this.errors = errors;
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value, path, errors) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${path} must be a non-empty string.`);
}

function requiredArray(value, path, errors) {
  if (!Array.isArray(value)) errors.push(`${path} must be an array.`);
}

function validateBaseArtifact(value, artifactType, errors) {
  if (!isObject(value)) {
    errors.push("Artifact must be an object.");
    return;
  }
  if (value.schema_version !== SCHEMA_VERSION) errors.push(`schema_version must be ${SCHEMA_VERSION}.`);
  if (value.artifact_type !== artifactType) errors.push(`artifact_type must be ${artifactType}.`);
}

export function validateProviderRequest(value) {
  const errors = [];
  validateBaseArtifact(value, "provider_request", errors);
  requiredString(value?.provider_id, "provider_id", errors);
  requiredString(value?.subject_id, "subject_id", errors);
  if (!isObject(value?.product_facts_ref)) errors.push("product_facts_ref must be an object.");
  requiredString(value?.product_facts_ref?.sha256, "product_facts_ref.sha256", errors);
  if (!isObject(value?.scope)) errors.push("scope must be an object.");
  requiredString(value?.scope?.market, "scope.market", errors);
  requiredString(value?.scope?.language, "scope.language", errors);
  if (value?.approval?.status !== "approved") errors.push("approval.status must be approved.");
  return errors;
}

export function validateProvenance(value) {
  const errors = [];
  if (!isObject(value)) return ["provenance must be an object."];
  for (const field of [
    "provider_id",
    "provider_version",
    "source_owner",
    "source_url",
    "source_record_id",
    "market",
    "language",
    "observed_at",
    "retrieved_at",
    "extraction_method",
    "normaliser_version"
  ]) {
    requiredString(value[field], `provenance.${field}`, errors);
  }
  if (!isObject(value.raw_artifact)) errors.push("provenance.raw_artifact must be an object.");
  requiredString(value.raw_artifact?.path, "provenance.raw_artifact.path", errors);
  if (!/^[a-f0-9]{64}$/.test(value.raw_artifact?.sha256 || "")) {
    errors.push("provenance.raw_artifact.sha256 must be a SHA-256 hash.");
  }
  if (!isObject(value.locator)) errors.push("provenance.locator must be an object.");
  requiredString(value.locator?.type, "provenance.locator.type", errors);
  requiredString(value.locator?.value, "provenance.locator.value", errors);
  requiredArray(value.parent_evidence_ids, "provenance.parent_evidence_ids", errors);
  return errors;
}

export function validateEvidenceRecord(value) {
  const errors = [];
  if (!isObject(value)) return ["Evidence record must be an object."];
  for (const field of [
    "evidence_id",
    "provider_id",
    "provider_run_id",
    "evidence_type",
    "subject_id",
    "observed_at",
    "retrieved_at",
    "normaliser_version",
    "status"
  ]) requiredString(value[field], field, errors);
  requiredArray(value.seed_ids, "seed_ids", errors);
  if (!isObject(value.value)) errors.push("value must be an object.");
  requiredString(value.value?.field_path, "value.field_path", errors);
  if (value.value?.value === undefined || value.value?.value === null) errors.push("value.value is required.");
  if (!isObject(value.context)) errors.push("context must be an object.");
  errors.push(...validateProvenance(value.provenance));
  if (!isObject(value.confidence)) errors.push("confidence must be an object.");
  if (typeof value.confidence?.score !== "number" || value.confidence.score < 0 || value.confidence.score > 1) {
    errors.push("confidence.score must be between 0 and 1.");
  }
  if (!isObject(value.raw_ref)) errors.push("raw_ref must be an object.");
  requiredString(value.raw_ref?.path, "raw_ref.path", errors);
  requiredString(value.raw_ref?.sha256, "raw_ref.sha256", errors);
  return errors;
}

export function validateProviderResult(value) {
  const errors = [];
  validateBaseArtifact(value, "provider_result", errors);
  requiredString(value?.provider_id, "provider_id", errors);
  requiredString(value?.provider_version, "provider_version", errors);
  requiredString(value?.provider_run_id, "provider_run_id", errors);
  requiredString(value?.request_fingerprint, "request_fingerprint", errors);
  if (!PROVIDER_STATUSES.includes(value?.status)) errors.push("status is not a supported provider status.");
  if (!isObject(value?.cache)) errors.push("cache must be an object.");
  requiredArray(value?.raw_artifacts, "raw_artifacts", errors);
  if (!isObject(value?.normalised_artifact)) errors.push("normalised_artifact must be an object.");
  requiredArray(value?.evidence_record_ids, "evidence_record_ids", errors);
  requiredArray(value?.errors, "errors", errors);
  requiredArray(value?.warnings, "warnings", errors);
  return errors;
}

export function validateCoverage(value) {
  const errors = [];
  validateBaseArtifact(value, "evidence_coverage", errors);
  if (!RUN_STATUSES.includes(value?.status)) errors.push("coverage status is not supported.");
  requiredArray(value?.requested_providers, "requested_providers", errors);
  requiredArray(value?.provider_statuses, "provider_statuses", errors);
  requiredArray(value?.requested_evidence_types, "requested_evidence_types", errors);
  if (!isObject(value?.evidence_type_counts)) errors.push("evidence_type_counts must be an object.");
  if (!Number.isInteger(value?.usable_record_count) || value.usable_record_count < 0) {
    errors.push("usable_record_count must be a non-negative integer.");
  }
  return errors;
}

export function validateInterpretationPlaceholder(value) {
  const errors = [];
  validateBaseArtifact(value, "ai_interpretation", errors);
  requiredString(value?.evidence_artifact_id, "evidence_artifact_id", errors);
  requiredString(value?.evidence_artifact_hash, "evidence_artifact_hash", errors);
  if (value?.status !== "not_generated") errors.push("interpretation status must be not_generated.");
  requiredString(value?.reason, "reason", errors);
  requiredArray(value?.findings, "findings", errors);
  if (Array.isArray(value?.findings) && value.findings.length) errors.push("placeholder findings must be empty.");
  return errors;
}

export function validateEvidenceArtifact(value) {
  const errors = [];
  validateBaseArtifact(value, "research_evidence", errors);
  requiredString(value?.evidence_artifact_id, "evidence_artifact_id", errors);
  requiredString(value?.evidence_run_id, "evidence_run_id", errors);
  if (!isObject(value?.subject)) errors.push("subject must be an object.");
  requiredString(value?.subject?.subject_id, "subject.subject_id", errors);
  requiredString(value?.subject?.product_url, "subject.product_url", errors);
  requiredString(value?.subject?.product_facts_sha256, "subject.product_facts_sha256", errors);
  if (!isObject(value?.scope)) errors.push("scope must be an object.");
  requiredArray(value?.provider_runs, "provider_runs", errors);
  requiredArray(value?.records, "records", errors);
  for (const [index, record] of (value?.records || []).entries()) {
    errors.push(...validateEvidenceRecord(record).map((error) => `records[${index}].${error}`));
  }
  const ids = (value?.records || []).map((record) => record.evidence_id);
  if (new Set(ids).size !== ids.length) errors.push("records contain duplicate evidence IDs.");
  requiredString(value?.coverage_ref, "coverage_ref", errors);
  requiredString(value?.created_at, "created_at", errors);
  requiredArray(value?.warnings, "warnings", errors);
  return errors;
}

export function assertValid(name, value, validator) {
  const errors = validator(value);
  if (errors.length) throw new EvidenceValidationError(`${name} failed validation.`, errors);
  return value;
}

export function artifactHash(value) {
  return sha256(value);
}
