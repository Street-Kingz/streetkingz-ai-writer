import { sha256, stableId } from "../research/core/canonical.js";
import { validateBusinessSourceEvidenceRecord } from "./validation.js";

export function createBusinessSourceEvidence({ sourceType, sourceUriOrLocation, sourceRole, sourceField, rawValue, normalisedValue = rawValue, retrievedAt, claimClassification, context }) {
  const contentFingerprint = sha256(rawValue);
  const identity = { source_type: sourceType, source_uri_or_location: sourceUriOrLocation, source_field: sourceField, content_fingerprint: contentFingerprint };
  const record = { id: stableId("bie", identity), source_type: sourceType, source_uri_or_location: sourceUriOrLocation, source_role: sourceRole, source_field: sourceField, raw_value: rawValue, normalised_value: normalisedValue, retrieved_at: retrievedAt, content_fingerprint: contentFingerprint, claim_classification: claimClassification, ...(context ? { context } : {}) };
  const errors = validateBusinessSourceEvidenceRecord(record);
  if (errors.length) throw Object.assign(new Error("BusinessSourceEvidence failed validation."), { errors });
  return record;
}
