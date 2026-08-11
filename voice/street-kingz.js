import { createVoiceSource, assessCorpus } from "./corpus.js";
import { VOICE_PROFILE_VERSION } from "./contracts.js";
import { analyzeVoiceSources } from "./analysis.js";

const identity = "street-kingz-founder";

export const STREET_KINGZ_VOICE_SOURCES = Object.freeze([
  createVoiceSource({
    source_id: "sk_voice_written_editorial_direction_2026_08_10",
    source_type: "long_form_message",
    voice_identity: identity,
    authorship_class: "GENUINE_AUTHOR_CONTENT",
    mode: "written",
    date: "2026-08-10",
    source_reference: "Human-authored Site Voice Profile task: CORE VOICE and HUMAN REVIEW / CORRECTION LOOP",
    voice_confidence: "high",
    context: "editorial_direction",
    editing_level: "self_edited_unknown",
    naturalness: "constrained_instruction",
    platform_constraints: ["technical task brief"],
    content: `Street Kingz content should feel as though the founder is talking directly to the customer. First-person language such as I, me, my, we and our is allowed and encouraged where it makes the writing more natural. However, do not force first-person language into every paragraph. The desired effect is founder-led, experienced but not pretending to know everything, straightforward, conversational, useful, confident where evidence allows, honest about limitations, and written for normal people who like having a clean car, not detailing obsessives. Avoid corporate editorial voice, academic language, SEO-blog filler, robotic neutrality, excessive disclaimers, internal governance terminology, repeated evidence caveats, fake authority, exaggerated detailing language and unnecessary jargon. A future customer should be able to say: Yes, that sounds like me. I don't say that. That's too formal. I swear occasionally, but not in articles. I use we when talking about the company and I when giving my opinion.`
  }),
  createVoiceSource({
    source_id: "sk_voice_written_founder_boundaries_2026_08_10",
    source_type: "questionnaire_response",
    voice_identity: identity,
    authorship_class: "GENUINE_AUTHOR_CONTENT",
    mode: "written",
    date: "2026-08-10",
    source_reference: "Human-authored founder voice requirements and examples",
    voice_confidence: "high",
    context: "onboarding_questionnaire",
    editing_level: "deliberate_examples",
    naturalness: "semi_natural",
    platform_constraints: ["examples selected to define editorial boundaries"],
    content: `I wouldn't choose a towel on GSM alone. For most people, I'd look at size and handling as well as GSM. If you drive a larger car, I'd pay attention to how manageable the towel becomes when wet. I sell a 1200gsm towel, but that doesn't mean I'm going to tell you the biggest GSM number automatically wins. Street Kingz is my business. The copy should sound natural for me to say things such as I sell, our and we. Yes, this is my product. Here's where it fits. Decide whether that suits what you need. Do not pretend Street Kingz is an unrelated third party. Do not oversell it. Do not claim it is objectively the best. Do not invent personal testing, customer behaviour, sales history or product-development history.`
  }),
  createVoiceSource({
    source_id: "sk_voice_written_adaptation_rules_2026_08_10",
    source_type: "long_form_message",
    voice_identity: identity,
    authorship_class: "GENUINE_AUTHOR_CONTENT",
    mode: "written",
    date: "2026-08-10",
    source_reference: "Human-authored spoken/written and voice/fact boundary requirements",
    voice_confidence: "medium",
    context: "architecture_direction",
    editing_level: "formal_task_brief",
    naturalness: "constrained_instruction",
    platform_constraints: ["technical architecture specification"],
    content: `Spoken material is excellent for discovering vocabulary, rhythm, humour, directness, explanations, opinions, natural phrasing, recommendation behaviour and personality. But spoken material may contain filler, repetition, fragments, abandoned sentences, conversational loops and context dependent on video. Written material may provide better evidence for paragraph construction, punctuation, long-form pacing, heading transitions, written explanations and commercial wording. The goal is: this sounds like this person sat down and wrote it carefully, not: this is a transcript. Knowing how someone speaks does not tell us what happened to them. Voice evidence may establish that Ben naturally writes: I'd go for the larger one if. That permits the construction stylistically. It does not permit: I've used this every weekend for two years. Personal experiences, testing history, customer experiences, company history and anecdotes require explicit factual evidence.`
  }),
  createVoiceSource({
    source_id: "sk_ai_cornerstone_semantic_page_excluded",
    source_type: "article",
    voice_identity: identity,
    authorship_class: "AI_TRANSFORMED",
    mode: "written",
    date: "2026-08-10",
    source_reference: "artifacts/cornerstone/best-car-drying-towel/component-revision-v1/deterministic-acceptance-001/semantic-page.json",
    voice_confidence: "low",
    context: "ai_assisted_editorial",
    editing_level: "ai_transformed",
    naturalness: "not_applicable",
    exclusion_reason: "AI-assisted copy cannot establish the founder's voice.",
    content: "AI-assisted cornerstone semantic page; retained only as an excluded provenance record."
  }),
  createVoiceSource({
    source_id: "sk_catalogue_authorship_uncertain",
    source_type: "product_description",
    voice_identity: identity,
    authorship_class: "UNCERTAIN_AUTHORSHIP",
    mode: "written",
    date: null,
    source_reference: "catalogue/products.js",
    voice_confidence: "low",
    context: "product_catalogue",
    editing_level: "unknown",
    naturalness: "marketplace_or_catalogue_constrained",
    platform_constraints: ["catalogue format"],
    exclusion_reason: "Repository records do not establish author identity or whether copy was AI-transformed.",
    content: "Existing product catalogue copy; authorship is not established and it is excluded from voice learning."
  })
]);

const obs = (observation_id, dimension, classification, confidence, rule, source_ids = [], mode_scope = "both") => ({ observation_id, dimension, classification, confidence, rule, source_ids, mode_scope });

export function buildStreetKingzFounderProfile() {
  const corpus = assessCorpus(STREET_KINGZ_VOICE_SOURCES);
  return {
    schema_version: VOICE_PROFILE_VERSION,
    artifact_type: "site_voice_profile",
    profile_id: "street-kingz-founder-v1",
    site_id: "street-kingz",
    voice_identity: identity,
    state: corpus.sufficient ? "awaiting_human_review" : "insufficient_corpus",
    corpus_assessment: corpus,
    observations: [
      obs("sk_obs_direct_advice", "directness", "WEAK_OBSERVED_PATTERN", "medium", "Prefer a direct recommendation framed around the customer's actual decision.", ["sk_voice_written_founder_boundaries_2026_08_10"], "written"),
      obs("sk_obs_contractions", "sentence_rhythm", "WEAK_OBSERVED_PATTERN", "medium", "Contractions and short follow-up sentences can make advice feel natural; do not turn the copy into transcript fragments.", ["sk_voice_written_founder_boundaries_2026_08_10"], "written"),
      obs("sk_obs_qualified_recommendation", "recommendation_style", "WEAK_OBSERVED_PATTERN", "medium", "Give a clear view, then name the practical condition or trade-off that could change the choice.", ["sk_voice_written_founder_boundaries_2026_08_10"], "both"),
      obs("sk_obs_i_we", "pronouns", "WEAK_OBSERVED_PATTERN", "medium", "Use I for founder judgement and we/our for the company or its products.", ["sk_voice_written_editorial_direction_2026_08_10", "sk_voice_written_founder_boundaries_2026_08_10"], "written"),
      obs("sk_adapt_spoken_polish", "spoken_written_adaptation", "EDITORIAL_ADAPTATION", "medium", "Carry across vocabulary, directness and rhythm from genuine speech while removing filler, loops and abandoned sentences.", ["sk_voice_written_adaptation_rules_2026_08_10"], "spoken"),
      obs("sk_rule_founder_led", "formality", "EXPLICIT_HUMAN_RULE", "high", "Founder-led, straightforward, conversational and useful; avoid corporate, academic and SEO-blog language."),
      obs("sk_rule_customer", "technical_language", "EXPLICIT_HUMAN_RULE", "high", "Write for normal people who like a clean car, explaining useful technical terms without detailing-obsessive jargon."),
      obs("sk_rule_fact_boundary", "first_person", "EXPLICIT_HUMAN_RULE", "high", "First-person opinion is allowed; personal experience, testing, history and customer claims require separate founder-fact evidence."),
      obs("sk_rule_commercial", "ownership_language", "EXPLICIT_HUMAN_RULE", "high", "Acknowledge Street Kingz ownership naturally, help first and describe where the product fits without pretending independence or claiming universal superiority."),
      obs("sk_rule_caveats", "qualification", "EXPLICIT_HUMAN_RULE", "high", "Be honest about limitations without legalistic caveats or repeated disclaimers.")
    ],
    human_rules: [],
    disliked_or_unnatural: [
      "detached evidentiary framing", "legalistic absence-of-evidence phrasing", "corporate third-person references to Street Kingz",
      "abstract SEO-summary language", "fake expertise", "repeated caveats", "unexplained detailing jargon"
    ],
    founder_fact_policy: { voice_profile_is_fact_source: false, founder_fact_registry: [], unsupported_personal_experience: "reject" },
    approval: null,
    limitations: [
      "No genuine video/audio transcript corpus was found in this repository.",
      "Current genuine written samples are deliberate editorial instructions, not a broad sample of published natural writing.",
      "Observed patterns remain weak until natural speech and substantial authored copy are imported and provenance-reviewed."
    ]
  };
}

export function buildExpandedStreetKingzFounderProfile(importedSources) {
  const genuineWritten = STREET_KINGZ_VOICE_SOURCES.filter((source) => source.eligible_for_voice_analysis);
  const sources = [...importedSources, ...genuineWritten];
  const corpus = assessCorpus(sources);
  const analysis = analyzeVoiceSources(sources);
  const pattern = (id) => analysis.patterns[id];
  const observed = (observation_id, dimension, classification, confidence, rule, patternId, mode_scope = "spoken") => ({
    observation_id, dimension, classification, confidence, rule,
    source_ids: pattern(patternId).source_ids,
    mode_scope,
    evidence_summary: { pattern_id: patternId, occurrences: pattern(patternId).occurrences, independent_sources: pattern(patternId).source_count, prevalence: pattern(patternId).prevalence }
  });
  const profile = {
    schema_version: VOICE_PROFILE_VERSION, artifact_type: "site_voice_profile", profile_id: "street-kingz-founder-v1",
    profile_version: "1.1.0",
    site_id: "street-kingz", voice_identity: identity, state: "awaiting_human_review",
    corpus_assessment: corpus, corpus_composition: analysis.modalities,
    observations: [
      observed("sk_observed_second_person", "directness", "STRONG_OBSERVED_PATTERN", "high", "Address the customer directly and frame advice around what they need to do or decide.", "second_person"),
      observed("sk_observed_contractions", "sentence_rhythm", "STRONG_OBSERVED_PATTERN", "high", "Use ordinary contractions and a mix of explanatory sentences with short emphatic follow-ups.", "contractions"),
      observed("sk_observed_first_person", "first_person", "STRONG_OBSERVED_PATTERN", "high", "Use first person naturally for a personal view, admission or recommendation rather than maintaining detached editorial distance.", "first_person"),
      observed("sk_observed_practical_sequence", "explanation_style", "STRONG_OBSERVED_PATTERN", "high", "Explain technical or practical points through what the customer does next, using concrete sequences rather than abstract definitions.", "practical_sequence"),
      observed("sk_observed_plain_explanation", "technical_language", "STRONG_OBSERVED_PATTERN", "high", "Translate a specification into its practical consequence in plain language.", "plain_explanation"),
      observed("sk_observed_humour", "humour_personality", "STRONG_OBSERVED_PATTERN", "high", "Humour is blunt, self-aware and conversational, often used to puncture overcomplication; use sparingly in polished articles.", "humour_or_swearing"),
      observed("sk_observed_commercial_directness", "commercial_language", "MODERATE_OBSERVED_PATTERN", "medium", "Move openly from useful explanation to a direct product invitation; long-form copy should soften repeated hard CTAs without hiding ownership.", "direct_cta"),
      observed("sk_observed_questions", "transitions", "MODERATE_OBSERVED_PATTERN", "medium", "Questions are used to introduce a problem, anticipate an objection or challenge an overcomplicated view.", "rhetorical_questions"),
      observed("sk_observed_candid_qualification", "qualification", "MODERATE_OBSERVED_PATTERN", "medium", "Qualify advice with candid uncertainty or a plain admission rather than formal evidentiary language.", "candid_qualifier"),
      observed("sk_observed_company_pronouns", "pronouns", "WEAK_OBSERVED_PATTERN", "medium", "I is much more common in speech; we and our appear when the company or shared position genuinely calls for them.", "company_pronouns"),
      obs("sk_written_direct_advice", "recommendation_style", "WEAK_OBSERVED_PATTERN", "medium", "In the available written direction, recommendations are conditional and tied to the customer's vehicle, routine or trade-off.", ["sk_voice_written_founder_boundaries_2026_08_10"], "written"),
      obs("sk_adapt_spoken_polish", "spoken_written_adaptation", "EDITORIAL_ADAPTATION", "high", "Keep the direct address, contractions, practical explanations, candid qualifications and occasional humour; remove filler, loops, transcript fragments, repeated hooks, repeated CTAs, routine swearing and unsupported anecdotes.", [...pattern("contractions").source_ids, "sk_voice_written_adaptation_rules_2026_08_10"], "both"),
      obs("sk_rule_founder_led", "formality", "EXPLICIT_HUMAN_RULE", "high", "Founder-led, straightforward, conversational and useful; avoid corporate, academic and SEO-blog language."),
      obs("sk_rule_customer", "technical_language", "EXPLICIT_HUMAN_RULE", "high", "Write for normal people who like a clean car, explaining useful technical terms without detailing-obsessive jargon."),
      obs("sk_rule_fact_boundary", "first_person", "EXPLICIT_HUMAN_RULE", "high", "First-person opinion is allowed; personal experience, testing, history and customer claims require separate founder-fact evidence."),
      obs("sk_rule_commercial", "ownership_language", "EXPLICIT_HUMAN_RULE", "high", "Acknowledge Street Kingz ownership naturally, help first and describe where the product fits without pretending independence or claiming universal superiority."),
      obs("sk_rule_caveats", "qualification", "EXPLICIT_HUMAN_RULE", "high", "Be honest about limitations without legalistic caveats or repeated disclaimers."),
      obs("sk_rule_no_ai_filler", "disliked_constructions", "EXPLICIT_HUMAN_RULE", "high", "Reject generic AI/SEO filler, internal evidence language and robotic summaries.")
    ],
    human_rules: [],
    spoken_written_comparison: {
      shared_patterns: ["direct recommendations", "contractions and uncomplicated language", "first-person judgement", "customer-centred trade-offs"],
      spoken_only_or_stronger: ["frequent rhetorical questions", "swearing and teasing humour", "fragmented demonstrations", "repeated direct CTAs", "self-corrections and conversational loops"],
      written_only_or_stronger: ["deliberately stated pronoun rules", "explicit fact/experience boundaries", "more controlled qualification", "long-form audience and formality direction"],
      contradictions: ["Speech frequently uses strong sales imperatives and swearing; explicit written rules call for low-pressure, selectively humorous long-form copy."],
      preserve_in_articles: ["directness", "plain explanations", "practical framing", "honest ownership", "candid qualification", "occasional natural humour"],
      reduce_in_articles: ["filler", "repetition", "abandoned sentences", "TikTok hook repetition", "routine swearing", "repeated get-yours CTAs", "video-dependent references"]
    },
    founder_fact_policy: { voice_profile_is_fact_source: false, founder_fact_registry: [], transcript_claims_imported_as_facts: false, unsupported_personal_experience: "reject" },
    approval: null,
    limitations: ["Imported transcripts are complete as stored but unverified against the original audio.", "Only 409 words of genuine written direction are available, and all are constrained editorial/onboarding material.", "Twenty-four videos establish recurring communication patterns but should not be treated as exhaustive of the founder's voice."]
  };
  return { profile, sources, analysis };
}
