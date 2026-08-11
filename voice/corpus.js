import { AUTHORSHIP_CLASSES, CONFIDENCE, ELIGIBLE_AUTHORSHIP, MODES, SOURCE_TYPES } from "./contracts.js";

const error = (code, path, message) => ({ code, path, message });
export const countVoiceWords = (text, method = "whitespace") => method === "portable_voice_corpus_v1"
  ? (String(text || "").match(/\b[\w’'-]+\b/g) || []).length
  : String(text || "").trim().split(/\s+/).filter(Boolean).length;

export function validateVoiceSource(source) {
  const errors = [];
  for (const key of ["source_id", "source_type", "voice_identity", "authorship_class", "mode", "source_reference", "content"])
    if (!source?.[key]) errors.push(error("REQUIRED", `$.${key}`, `${key} is required.`));
  if (!SOURCE_TYPES.includes(source?.source_type)) errors.push(error("SOURCE_TYPE", "$.source_type", source?.source_type));
  if (!AUTHORSHIP_CLASSES.includes(source?.authorship_class)) errors.push(error("AUTHORSHIP_CLASS", "$.authorship_class", source?.authorship_class));
  if (!MODES.includes(source?.mode)) errors.push(error("MODE", "$.mode", source?.mode));
  if (!CONFIDENCE.includes(source?.voice_confidence)) errors.push(error("CONFIDENCE", "$.voice_confidence", source?.voice_confidence));
  if (source?.approximate_words !== countVoiceWords(source?.content, source?.word_count_method)) errors.push(error("LENGTH_MISMATCH", "$.approximate_words", "Word count must be derived from content."));
  const eligible = ELIGIBLE_AUTHORSHIP.has(source?.authorship_class) && source?.voice_confidence !== "low";
  if (Boolean(source?.eligible_for_voice_analysis) !== eligible) errors.push(error("ELIGIBILITY_MISMATCH", "$.eligible_for_voice_analysis", "Eligibility must follow authorship and confidence rules."));
  if (!eligible && !source?.exclusion_reason) errors.push(error("EXCLUSION_REASON_REQUIRED", "$.exclusion_reason", "Ineligible sources need a reason."));
  return { status: errors.length ? "FAIL" : "PASS", errors };
}

export function createVoiceSource(input) {
  const eligible = ELIGIBLE_AUTHORSHIP.has(input.authorship_class) && input.voice_confidence !== "low";
  const influenceTier = !eligible ? "excluded"
    : input.mode === "spoken" && input.naturalness === "free_speech" ? "primary"
      : input.platform_constraints?.length || input.naturalness === "constrained_instruction" ? "limited"
        : input.approximate_words >= 800 || input.naturalness === "natural" ? "primary" : "supporting";
  const source = {
    source_id: input.source_id,
    source_type: input.source_type,
    voice_identity: input.voice_identity,
    authorship_class: input.authorship_class,
    original_or_transformed: input.original_or_transformed || "original",
    mode: input.mode,
    date: input.date || null,
    source_reference: input.source_reference,
    provenance: input.provenance || null,
    content: input.content,
    text_sha256: input.text_sha256 || null,
    word_count_method: input.word_count_method || "whitespace",
    approximate_words: input.approximate_words ?? countVoiceWords(input.content, input.word_count_method),
    voice_confidence: input.voice_confidence,
    context: input.context || "unknown",
    editing_level: input.editing_level || "unknown",
    naturalness: input.naturalness || "unknown",
    platform_constraints: input.platform_constraints || [],
    eligible_for_voice_analysis: eligible,
    influence_tier: influenceTier,
    exclusion_reason: input.exclusion_reason || null
  };
  const validation = validateVoiceSource(source);
  if (validation.status === "FAIL") throw new Error(`Invalid voice source: ${JSON.stringify(validation.errors)}`);
  return source;
}

export function assessCorpus(sources, { minimumWords = 250, minimumEligibleSources = 2 } = {}) {
  const eligible = sources.filter((source) => source.eligible_for_voice_analysis);
  const byMode = Object.fromEntries(MODES.map((mode) => [mode, eligible.filter((source) => source.mode === mode)]));
  const totalWords = eligible.reduce((sum, source) => sum + source.approximate_words, 0);
  const sourceTypes = new Set(eligible.map((source) => source.source_type));
  const sufficient = eligible.length >= minimumEligibleSources && totalWords >= minimumWords;
  return {
    schema_version: "1.0.0", artifact_type: "voice_corpus_assessment",
    sufficient, eligible_sources: eligible.length, excluded_sources: sources.length - eligible.length,
    usable_words: totalWords, spoken_words: byMode.spoken.reduce((sum, item) => sum + item.approximate_words, 0),
    written_words: byMode.written.reduce((sum, item) => sum + item.approximate_words, 0),
    source_type_diversity: sourceTypes.size,
    influence_tiers: Object.fromEntries(["primary", "supporting", "limited", "excluded"].map((tier) => [tier, sources.filter((source) => source.influence_tier === tier).length])),
    strength: !sufficient ? "insufficient" : (totalWords >= 3500 && eligible.length >= 20) || (totalWords >= 5000 && sourceTypes.size >= 2) ? "strong" : "limited",
    weak_areas: [
      ...(byMode.spoken.length ? [] : ["spoken rhythm and natural delivery"]),
      ...(byMode.written.length ? [] : ["long-form written construction"]),
      ...(sourceTypes.size > 1 ? [] : ["source diversity"])
    ],
    recommendation: sufficient ? (sourceTypes.size > 1 ? "Human review is required before approval." : "Usable with caution; add a different source type.") : "Collect more genuine author material or use an explicit configurable default voice."
  };
}
