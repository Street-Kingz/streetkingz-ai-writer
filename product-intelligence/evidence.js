import { stableId, sha256 } from "../research/core/canonical.js";
import { authorityRankFor } from "./authority.js";
import { validateSourceEvidenceRecord } from "./validation.js";

export function normaliseEvidenceText(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&pound;/gi, "£")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&times;/gi, "×")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|li|h[1-6]|summary|div)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function createSourceEvidence({
  sourceType,
  sourceUriOrLocation,
  sourceField,
  rawValue,
  normalisedValue = normaliseEvidenceText(rawValue),
  retrievedAt,
  context
}) {
  const contentFingerprint = sha256(rawValue);
  const identity = {
    source_type: sourceType,
    source_uri_or_location: sourceUriOrLocation,
    source_field: sourceField,
    content_fingerprint: contentFingerprint
  };
  const record = {
    id: stableId("pie", identity),
    source_type: sourceType,
    source_uri_or_location: sourceUriOrLocation,
    source_field: sourceField,
    raw_value: rawValue,
    normalised_value: normalisedValue,
    retrieved_at: retrievedAt,
    authority_rank: authorityRankFor(sourceType),
    content_fingerprint: contentFingerprint,
    ...(context ? { context } : {})
  };
  const errors = validateSourceEvidenceRecord(record);
  if (errors.length) throw Object.assign(new Error("SourceEvidence failed validation."), { errors });
  return record;
}

export function deduplicateEvidence(records) {
  const seen = new Set();
  return records.filter((record) => {
    const identity = `${record.source_type}\0${record.source_uri_or_location}\0${record.source_field}\0${record.content_fingerprint}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

