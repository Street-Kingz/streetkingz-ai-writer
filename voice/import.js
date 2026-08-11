import { canonicalize, sha256 } from "../research/core/canonical.js";
import { createVoiceSource, countVoiceWords } from "./corpus.js";
import { AUTHORSHIP_CLASSES, SOURCE_TYPES } from "./contracts.js";

const ROOT_KEYS = new Set(["schema_version", "corpus_id", "identity", "sources", "export_summary", "semantic_sha256"]);
const SOURCE_KEYS = new Set(["source_id", "source_type", "text", "text_sha256", "authorship_classification", "modality", "provenance", "transformation_status", "word_count", "platform", "context", "quality"]);
const error = (code, path, message) => ({ code, path, message });

export function validateVoiceCorpusArtifact(artifact) {
  const errors = [];
  if (artifact?.schema_version !== "1.0.0") errors.push(error("SCHEMA_VERSION", "$.schema_version", artifact?.schema_version));
  for (const key of Object.keys(artifact || {})) if (!ROOT_KEYS.has(key)) errors.push(error("UNKNOWN_ROOT_FIELD", `$.${key}`, key));
  if (!artifact?.corpus_id || !artifact?.identity?.id || !Array.isArray(artifact?.sources) || !artifact?.export_summary) errors.push(error("SCHEMA", "$", "Corpus identity, sources and export summary are required."));
  const semantic = structuredClone(artifact || {}); delete semantic.semantic_sha256;
  const observedSemanticHash = sha256(canonicalize(semantic));
  if (artifact?.semantic_sha256 !== observedSemanticHash) errors.push(error("SEMANTIC_HASH_MISMATCH", "$.semantic_sha256", observedSemanticHash));
  const ids = new Set(), textHashes = new Set();
  let words = 0, spoken = 0, written = 0;
  for (const [index, source] of (artifact?.sources || []).entries()) {
    const path = `$.sources[${index}]`;
    for (const key of Object.keys(source)) if (!SOURCE_KEYS.has(key)) errors.push(error("UNKNOWN_SOURCE_FIELD", `${path}.${key}`, key));
    if (!source.source_id || ids.has(source.source_id)) errors.push(error("DUPLICATE_OR_MISSING_SOURCE_ID", `${path}.source_id`, source.source_id));
    ids.add(source.source_id);
    const textHash = sha256(source.text || "");
    if (source.text_sha256 !== textHash) errors.push(error("SOURCE_HASH_MISMATCH", `${path}.text_sha256`, source.source_id));
    if (textHashes.has(textHash)) errors.push(error("DUPLICATE_TEXT", `${path}.text_sha256`, source.source_id));
    textHashes.add(textHash);
    if (source.word_count !== countVoiceWords(source.text, "portable_voice_corpus_v1")) errors.push(error("WORD_COUNT_MISMATCH", `${path}.word_count`, source.source_id));
    words += source.word_count || 0;
    if (!AUTHORSHIP_CLASSES.includes(source.authorship_classification)) errors.push(error("AUTHORSHIP_CLASS", `${path}.authorship_classification`, source.authorship_classification));
    if (!SOURCE_TYPES.includes(source.source_type)) errors.push(error("SOURCE_TYPE", `${path}.source_type`, source.source_type));
    if (!source.provenance?.collection || !source.provenance?.record_key || !source.provenance?.derivation) errors.push(error("PROVENANCE", `${path}.provenance`, source.source_id));
    if (source.modality === "SPOKEN") spoken += 1; else if (source.modality === "WRITTEN") written += 1; else errors.push(error("MODALITY", `${path}.modality`, source.modality));
    if (!["GENUINE_AUTHOR_CONTENT", "TRANSCRIBED_GENUINE_SPEECH", "EDITED_AUTHOR_CONTENT"].includes(source.authorship_classification)) errors.push(error("INELIGIBLE_EXPORTED_SOURCE", `${path}.authorship_classification`, source.source_id));
  }
  const summary = artifact?.export_summary || {};
  if (summary.eligible_sources_exported !== artifact?.sources?.length || summary.candidate_sources !== artifact?.sources?.length) errors.push(error("SOURCE_COUNT_MISMATCH", "$.export_summary", "Eligible/candidate counts must equal exported source count."));
  if (summary.total_words !== words || summary.spoken_sources !== spoken || summary.written_sources !== written) errors.push(error("SUMMARY_MISMATCH", "$.export_summary", "Modality or word totals do not match sources."));
  const excludedTotal = Object.values(summary.excluded || {}).reduce((sum, value) => sum + value, 0);
  if (summary.records_inspected !== artifact?.sources?.length + excludedTotal + (summary.duplicates_excluded || 0)) errors.push(error("ELIGIBLE_EXCLUDED_BOUNDARY", "$.export_summary.records_inspected", "Inspected records must reconcile."));
  return { schema_version: "1.0.0", artifact_type: "voice_corpus_import_validation", status: errors.length ? "FAIL" : "PASS", errors, observed_semantic_sha256: observedSemanticHash, metrics: { sources: artifact?.sources?.length || 0, words, spoken_sources: spoken, written_sources: written, duplicate_ids: (artifact?.sources?.length || 0) - ids.size, duplicate_texts: (artifact?.sources?.length || 0) - textHashes.size, excluded_upstream: excludedTotal } };
}

export function importVoiceCorpus(artifact) {
  const validation = validateVoiceCorpusArtifact(artifact);
  if (validation.status !== "PASS") throw new Error(`Voice corpus rejected: ${JSON.stringify(validation.errors)}`);
  const sources = artifact.sources.map((source) => createVoiceSource({
    source_id: source.source_id, source_type: source.source_type, voice_identity: artifact.identity.id,
    authorship_class: source.authorship_classification, original_or_transformed: source.transformation_status,
    mode: source.modality.toLowerCase(), date: null, source_reference: `${source.provenance.collection}:${source.provenance.record_key}`,
    provenance: source.provenance, content: source.text, text_sha256: source.text_sha256,
    voice_confidence: source.quality.authorship_confidence.toLowerCase(), context: source.context,
    editing_level: "transcribed", naturalness: source.modality === "SPOKEN" ? "free_speech" : "natural",
    platform_constraints: source.platform ? [`platform:${source.platform}`] : [],
    word_count_method: "portable_voice_corpus_v1", approximate_words: source.word_count
  }));
  return { corpus_id: artifact.corpus_id, identity: artifact.identity, semantic_sha256: artifact.semantic_sha256, sources, validation, export_summary: artifact.export_summary };
}
