const PATTERNS = Object.freeze({
  first_person: /\b(?:I|I'm|I've|I'd|I'll|me|my)\b/gi,
  company_pronouns: /\b(?:we|we're|we've|our)\b/gi,
  second_person: /\b(?:you|you're|you'll|you've|your)\b/gi,
  contractions: /\b\w+'(?:s|t|re|ve|d|ll|m)\b/gi,
  rhetorical_questions: /\?/g,
  direct_cta: /\b(?:get yours|grab yours|buy one|you know where to go)\b/gi,
  candid_qualifier: /\b(?:to be honest|I think|I'm not sure|I can't remember|don't get me wrong)\b/gi,
  practical_sequence: /\b(?:start from|then|once|all you do|just|number one|number two)\b/gi,
  humour_or_swearing: /\b(?:fuck(?:ing|ed)?|shit|arse|bastard|piss|bougie|capiche|anywho)\b/gi,
  plain_explanation: /\b(?:what (?:that|this) means|which means|because|so that|that way)\b/gi
});

export function analyzeVoiceSources(sources) {
  const eligible = sources.filter((source) => source.eligible_for_voice_analysis);
  const patterns = {};
  for (const [patternId, expression] of Object.entries(PATTERNS)) {
    const source_ids = []; let occurrences = 0;
    for (const source of eligible) {
      const matches = source.content.match(expression) || [];
      if (matches.length) source_ids.push(source.source_id);
      occurrences += matches.length;
    }
    patterns[patternId] = { occurrences, source_count: source_ids.length, source_ids, prevalence: eligible.length ? Number((source_ids.length / eligible.length).toFixed(3)) : 0 };
  }
  const modality = (mode) => eligible.filter((source) => source.mode === mode);
  return { schema_version: "1.0.0", artifact_type: "deterministic_voice_analysis", source_count: eligible.length, word_count: eligible.reduce((sum, source) => sum + source.approximate_words, 0), modalities: { spoken: { sources: modality("spoken").length, words: modality("spoken").reduce((sum, source) => sum + source.approximate_words, 0) }, written: { sources: modality("written").length, words: modality("written").reduce((sum, source) => sum + source.approximate_words, 0) } }, patterns };
}
