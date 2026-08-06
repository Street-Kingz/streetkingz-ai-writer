import { createHash } from "node:crypto";

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  const input = typeof value === "string" || Buffer.isBuffer(value) ? value : canonicalJson(value);
  return createHash("sha256").update(input).digest("hex");
}

export function stableId(prefix, identity, length = 24) {
  return `${prefix}_${sha256(identity).slice(0, length)}`;
}

export function createRequestFingerprint(requestIdentity) {
  return sha256({ kind: "provider_request", identity: requestIdentity });
}

export function createEvidenceId({ providerId, evidenceType, subjectId, sourceRecordId, value }) {
  return stableId("ev", {
    provider_id: providerId,
    evidence_type: evidenceType,
    subject_id: subjectId,
    source_record_id: sourceRecordId,
    value
  });
}
