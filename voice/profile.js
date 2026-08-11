import { CONFIDENCE, OBSERVATION_CLASSES, PROFILE_STATES, VOICE_DIMENSIONS, VOICE_PROFILE_VERSION } from "./contracts.js";
import { sha256 } from "../research/core/canonical.js";

const error = (code, path, message) => ({ code, path, message });

export function validateVoiceProfile(profile, sources = []) {
  const errors = [];
  const sourceMap = new Map(sources.map((source) => [source.source_id, source]));
  if (profile?.schema_version !== VOICE_PROFILE_VERSION) errors.push(error("VERSION", "$.schema_version", profile?.schema_version));
  if (!profile?.profile_id || !profile?.site_id || !profile?.voice_identity) errors.push(error("IDENTITY", "$", "Profile identity is incomplete."));
  if (!PROFILE_STATES.includes(profile?.state)) errors.push(error("STATE", "$.state", profile?.state));
  for (const [index, observation] of (profile?.observations || []).entries()) {
    const path = `$.observations[${index}]`;
    if (!VOICE_DIMENSIONS.includes(observation.dimension)) errors.push(error("DIMENSION", `${path}.dimension`, observation.dimension));
    if (!OBSERVATION_CLASSES.includes(observation.classification)) errors.push(error("CLASSIFICATION", `${path}.classification`, observation.classification));
    if (!CONFIDENCE.includes(observation.confidence)) errors.push(error("CONFIDENCE", `${path}.confidence`, observation.confidence));
    if (observation.classification === "EXPLICIT_HUMAN_RULE" && observation.source_ids.length) errors.push(error("HUMAN_RULE_SOURCE_MIX", `${path}.source_ids`, "Human rules must remain separate from observed corpus evidence."));
    if (observation.classification !== "EXPLICIT_HUMAN_RULE" && !observation.source_ids.length) errors.push(error("OBSERVATION_SOURCE_REQUIRED", `${path}.source_ids`, "Observed patterns and adaptations require sources."));
    for (const id of observation.source_ids) {
      const source = sourceMap.get(id);
      if (!source) errors.push(error("UNKNOWN_SOURCE", `${path}.source_ids`, id));
      else if (!source.eligible_for_voice_analysis) errors.push(error("INELIGIBLE_SOURCE", `${path}.source_ids`, id));
    }
  }
  for (const [index, adaptation] of (profile?.editorial_adaptations || []).entries()) {
    const path = `$.editorial_adaptations[${index}]`;
    if (adaptation.classification !== "EDITORIAL_ADAPTATION") errors.push(error("ADAPTATION_CLASS", path, "Editorial adaptations must remain explicitly classified."));
    if (!adaptation.source_ids?.length) errors.push(error("ADAPTATION_SOURCE_REQUIRED", `${path}.source_ids`, "Adaptations require their source evidence."));
    for (const id of adaptation.source_ids || []) if (!sourceMap.get(id)?.eligible_for_voice_analysis) errors.push(error("UNKNOWN_OR_INELIGIBLE_SOURCE", `${path}.source_ids`, id));
  }
  if ((profile?.human_rules || []).some((rule) => rule.classification !== "EXPLICIT_HUMAN_RULE")) errors.push(error("HUMAN_RULE_CLASS", "$.human_rules", "Human corrections must be explicit rules."));
  return { status: errors.length ? "FAIL" : "PASS", errors, profile_hash: sha256(profile) };
}

export function approveVoiceProfile(observedProfile, humanRules, { reviewer, reviewedAt }) {
  if (!reviewer || !reviewedAt) throw new Error("Reviewer and review timestamp are required.");
  const approved = structuredClone(observedProfile);
  approved.state = "approved";
  approved.observed_profile_hash = sha256(observedProfile);
  const embeddedHumanRules = (approved.observations || []).filter((item) => item.classification === "EXPLICIT_HUMAN_RULE");
  approved.editorial_adaptations = (approved.observations || []).filter((item) => item.classification === "EDITORIAL_ADAPTATION");
  approved.observations = (approved.observations || []).filter((item) => item.classification.endsWith("OBSERVED_PATTERN"));
  approved.human_rules = [...embeddedHumanRules, ...humanRules].map((rule, index) => ({ rule_id: rule.rule_id || rule.observation_id || `human_rule_${index + 1}`, classification: "EXPLICIT_HUMAN_RULE", confidence: rule.confidence || "high", rule: rule.rule, source_ids: [] }));
  approved.approval = { reviewer, reviewed_at: reviewedAt, observed_profile_hash: sha256(observedProfile) };
  return approved;
}

export function resolveSiteVoiceProfile(siteConfiguration, profiles) {
  const id = siteConfiguration?.editorial?.voice_profile_id;
  if (!id) return { mode: "configurable_default", profile: null };
  const profile = profiles.find((item) => item.profile_id === id);
  if (!profile) throw new Error(`Unknown site voice profile: ${id}`);
  if (profile.state !== "approved") throw new Error(`Voice profile is not human-approved: ${id}`);
  return { mode: "approved_profile", profile };
}

export function validateVoiceTransformation({ before, after, founderFactIds = [] }) {
  const errors = [];
  const componentIdentity = (page) => (page.components || []).map((item) => ({ id: item.component_id, type: item.component_type }));
  if (JSON.stringify(componentIdentity(before)) !== JSON.stringify(componentIdentity(after))) errors.push(error("COMPONENT_DRIFT", "$.components", "Voice transformation cannot change component jobs or order."));
  for (const field of ["product_ids", "evidence_ids", "internal_link_ids", "media_requirements"]) {
    const projection = (page) => (page.components || []).map((item) => item[field]);
    if (JSON.stringify(projection(before)) !== JSON.stringify(projection(after))) errors.push(error("REFERENCE_DRIFT", `$.components.${field}`, `${field} must remain exact.`));
  }
  const facts = new Set(founderFactIds);
  const experiential = /\b(?:I|we|my|our)\b[^.!?]{0,90}\b(?:tested|used|owned|designed|developed|sold|customers? (?:say|tell|prefer)|for \d+ years?)\b/gi;
  const visible = JSON.stringify(after.components?.map((item) => item.data) || []);
  if (experiential.test(visible) && facts.size === 0) errors.push(error("UNSUPPORTED_PERSONAL_EXPERIENCE", "$.components", "Voice cannot invent personal facts."));
  return { status: errors.length ? "FAIL" : "PASS", errors };
}
