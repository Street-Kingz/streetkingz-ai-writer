export const VOICE_PROFILE_VERSION = "1.0.0";

export const AUTHORSHIP_CLASSES = Object.freeze([
  "GENUINE_AUTHOR_CONTENT",
  "TRANSCRIBED_GENUINE_SPEECH",
  "EDITED_AUTHOR_CONTENT",
  "UNCERTAIN_AUTHORSHIP",
  "AI_GENERATED",
  "AI_TRANSFORMED",
  "THIRD_PARTY"
]);

export const SOURCE_TYPES = Object.freeze([
  "video_transcript", "podcast_transcript", "audio_transcript", "article", "website_copy",
  "product_description", "email", "newsletter", "social_post", "ad_copy", "support_response",
  "founder_note", "script", "long_form_message", "writing_sample", "questionnaire_response"
]);

export const MODES = Object.freeze(["spoken", "written"]);
export const OBSERVATION_CLASSES = Object.freeze([
  "STRONG_OBSERVED_PATTERN", "MODERATE_OBSERVED_PATTERN", "WEAK_OBSERVED_PATTERN", "EDITORIAL_ADAPTATION", "EXPLICIT_HUMAN_RULE"
]);
export const CONFIDENCE = Object.freeze(["low", "medium", "high"]);
export const PROFILE_STATES = Object.freeze(["observed", "awaiting_human_review", "approved", "insufficient_corpus"]);

export const ELIGIBLE_AUTHORSHIP = new Set([
  "GENUINE_AUTHOR_CONTENT", "TRANSCRIBED_GENUINE_SPEECH", "EDITED_AUTHOR_CONTENT"
]);

export const VOICE_DIMENSIONS = Object.freeze([
  "vocabulary", "sentence_rhythm", "paragraphs", "directness", "technical_language",
  "explanation_style", "first_person", "pronouns", "recommendation_style", "qualification",
  "humour_personality", "commercial_language", "ownership_language", "transitions",
  "disliked_constructions", "formality", "spoken_written_adaptation"
]);
