export const BRAND_VOICE_PROFILE_VERSION = "1.0.0";

export function validateBrandVoiceProfile(profile) {
  const errors = [];
  if (!profile || profile.schema_version !== BRAND_VOICE_PROFILE_VERSION) errors.push("BrandVoiceProfile schema version is unsupported.");
  for (const field of ["brand_name", "audience", "tone", "sentence_style", "personality", "forbidden_phrases", "preferred_phrases", "recommendation_style", "founder_style", "opinion_strength"]) {
    if (profile?.[field] === undefined) errors.push(`Missing BrandVoiceProfile field: ${field}`);
  }
  if (!Array.isArray(profile?.tone) || !Array.isArray(profile?.forbidden_phrases) || !Array.isArray(profile?.preferred_phrases)) errors.push("Voice lists must be arrays.");
  return { status: errors.length ? "FAIL" : "PASS", errors };
}

export function createBrandVoiceProfile(profile) {
  const candidate = { schema_version: BRAND_VOICE_PROFILE_VERSION, ...structuredClone(profile) };
  const validation = validateBrandVoiceProfile(candidate);
  if (validation.status === "FAIL") throw new Error(validation.errors.join("; "));
  return Object.freeze(candidate);
}
