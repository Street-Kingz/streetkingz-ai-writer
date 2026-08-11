import { canonicalJson, sha256 } from "../research/core/canonical.js";

const error = (code, path, message) => ({ code, path, message });
const references = (page, field) => page.components.map((component) => ({ component_id: component.component_id, values: structuredClone(component[field]) }));

// These fields describe the approved page, rather than editorial prose. They are
// always re-attached from the immediate source after the model response.
export const VOICE_TRANSFORMATION_LOCKED_COMPONENT_FIELDS = Object.freeze([
  "component_id", "component_type", "evidence_ids", "product_ids", "internal_link_ids",
  "media_requirements", "conversion_role"
]);

export function applyDeterministicVoiceTransformationLocks(revision, sourcePage, sourceSemanticPageHash = null) {
  const candidate = structuredClone(revision);
  const attempts = [];
  if (!candidate?.page || !Array.isArray(candidate.page.components) || !Array.isArray(sourcePage?.components)) {
    return { revision: candidate, attempts, error: error("LOCKED_SOURCE_SHAPE", "$.page.components", "Source and candidate components are required.") };
  }
  if (candidate.page.components.length !== sourcePage.components.length) {
    return { revision: candidate, attempts, error: error("LOCKED_COMPONENT_COUNT", "$.page.components", "Voice transformation cannot add or remove components.") };
  }
  const recordAttempt = (path, sourceValue, candidateValue) => {
    if (canonicalJson(sourceValue) !== canonicalJson(candidateValue)) attempts.push({ path, source_value: structuredClone(sourceValue), attempted_value: structuredClone(candidateValue) });
  };
  const pageLocks = ["schema_version", "artifact_type", "page_type", "topic", "search_intent", "h1", "validation_metadata"];
  for (const field of pageLocks) {
    const expected = field === "validation_metadata" ? structuredClone(sourcePage[field]) : sourcePage[field];
    if (field === "validation_metadata" && expected && sourceSemanticPageHash) expected.source_semantic_page_hash = sourceSemanticPageHash;
    recordAttempt(`$.page.${field}`, expected, candidate.page[field]);
    candidate.page[field] = structuredClone(expected);
  }
  candidate.page.components = sourcePage.components.map((sourceComponent, index) => {
    const modelComponent = candidate.page.components[index];
    const output = modelComponent ? structuredClone(modelComponent) : {};
    for (const field of VOICE_TRANSFORMATION_LOCKED_COMPONENT_FIELDS) {
      recordAttempt(`$.page.components[${index}].${field}`, sourceComponent[field], modelComponent?.[field]);
      output[field] = structuredClone(sourceComponent[field]);
    }
    return output;
  });
  return { revision: candidate, attempts, error: null };
}

export function buildVoiceTransformationInput({ sourcePage, voiceProfile, strategy, researchPacket, pagePlan, conceptPolicy, approvalRecord }) {
  if (voiceProfile?.state !== "approved") throw new Error("A human-approved VoiceProfile is required.");
  return {
    schema_version: "1.0.0", artifact_type: "voice_transformation_input", execution_authority: false,
    source: { semantic_page: sourcePage, semantic_page_sha256: sha256(sourcePage) },
    voice: { profile: voiceProfile, profile_sha256: sha256(voiceProfile), approval_record: approvalRecord },
    strategy: { strategy, strategy_sha256: sha256(strategy), research_packet: researchPacket, research_packet_sha256: sha256(researchPacket), search_intent: sourcePage.search_intent },
    structure_lock: {
      component_sequence: sourcePage.components.map((item) => ({ component_id: item.component_id, component_type: item.component_type })),
      page_plan_sha256: sha256(pagePlan), component_jobs: conceptPolicy.component_jobs,
      concept_policy: conceptPolicy
    },
    reference_lock: {
      evidence_ids: references(sourcePage, "evidence_ids"), product_ids: references(sourcePage, "product_ids"),
      internal_link_ids: references(sourcePage, "internal_link_ids"), media_requirements: references(sourcePage, "media_requirements")
    },
    fact_lock: { founder_fact_ids: [], voice_profile_is_fact_source: false, factual_meaning_may_change: false, product_facts_may_change: false },
    editorial_scope: {
      allowed: ["rewrite visible copy for approved voice", "replace abstraction with practical consequence", "use natural first person where appropriate", "simplify without changing meaning"],
      targets: ["overly technical wording", "legalistic/evidentiary wording", "detached product language", "unnecessary abstraction", "rigid sentence construction", "unnatural qualification"],
      prohibited: ["change SEO/search intent", "change component order or jobs", "add/remove products", "add/remove evidence", "add/remove internal links", "invent founder experience", "imitate raw transcript", "add keyword-density copy", "render or publish"]
    },
    required_post_response_validation: ["schema", "source binding", "SEO intent", "evidence IDs", "product IDs and facts", "internal-link IDs", "component sequence and jobs", "concept ownership", "repetition", "founder facts", "factual meaning", "voice profile", "editorial quality"],
    transformation_boundary: {
      model_controls: ["visible customer-facing editorial text", "claim annotations needed to trace rewritten claims"],
      deterministic_source_fields: ["component IDs", "component types", "component ordering", "media requirements", "product IDs", "internal-link IDs", "evidence IDs", "conversion roles", "page metadata", "source bindings"],
      locked_fields_reapplied_after_response: true,
      media_requirements_model_authority: false
    },
    ai_call_authorised: false
  };
}

export function validateVoiceTransformationInput(input) {
  const errors = [];
  if (input?.schema_version !== "1.0.0" || input?.artifact_type !== "voice_transformation_input") errors.push(error("SCHEMA", "$", "Voice transformation input v1 is required."));
  if (input?.voice?.profile?.state !== "approved") errors.push(error("PROFILE_NOT_APPROVED", "$.voice.profile.state", input?.voice?.profile?.state));
  if (sha256(input?.source?.semantic_page) !== input?.source?.semantic_page_sha256) errors.push(error("SOURCE_HASH", "$.source.semantic_page_sha256", "Source page hash mismatch."));
  if (sha256(input?.voice?.profile) !== input?.voice?.profile_sha256) errors.push(error("PROFILE_HASH", "$.voice.profile_sha256", "Profile hash mismatch."));
  if (sha256(input?.strategy?.strategy) !== input?.strategy?.strategy_sha256) errors.push(error("STRATEGY_HASH", "$.strategy.strategy_sha256", "Strategy hash mismatch."));
  if (sha256(input?.strategy?.research_packet) !== input?.strategy?.research_packet_sha256) errors.push(error("RESEARCH_PACKET_HASH", "$.strategy.research_packet_sha256", "Research packet hash mismatch."));
  const actualSequence = input?.source?.semantic_page?.components?.map((item) => ({ component_id: item.component_id, component_type: item.component_type }));
  if (JSON.stringify(actualSequence) !== JSON.stringify(input?.structure_lock?.component_sequence)) errors.push(error("STRUCTURE_DRIFT", "$.structure_lock.component_sequence", "Immediate source structure must be exact."));
  for (const field of ["evidence_ids", "product_ids", "internal_link_ids", "media_requirements"]) {
    const expected = references(input.source.semantic_page, field);
    if (JSON.stringify(expected) !== JSON.stringify(input.reference_lock[field])) errors.push(error("REFERENCE_DRIFT", `$.reference_lock.${field}`, field));
  }
  if (input?.fact_lock?.founder_fact_ids?.length || input?.fact_lock?.voice_profile_is_fact_source !== false || input?.fact_lock?.factual_meaning_may_change !== false) errors.push(error("FACT_BOUNDARY", "$.fact_lock", "Voice preparation cannot create facts or meaning-change authority."));
  const requiredLocks = ["component IDs", "component types", "component ordering", "media requirements", "product IDs", "internal-link IDs", "evidence IDs", "conversion roles", "page metadata", "source bindings"];
  const locks = input?.transformation_boundary?.deterministic_source_fields || [];
  for (const field of requiredLocks) if (!locks.includes(field)) errors.push(error("TRANSFORMATION_BOUNDARY", "$.transformation_boundary.deterministic_source_fields", field));
  if (input?.transformation_boundary?.locked_fields_reapplied_after_response !== true || input?.transformation_boundary?.media_requirements_model_authority !== false) errors.push(error("TRANSFORMATION_BOUNDARY", "$.transformation_boundary", "Source-owned fields must be deterministically reapplied and media cannot be model-controlled."));
  if (input?.ai_call_authorised !== false || input?.execution_authority !== false) errors.push(error("AUTHORITY", "$", "Preparation must be non-executable and no-call."));
  return { schema_version: "1.0.0", artifact_type: "voice_transformation_input_validation", status: errors.length ? "FAIL" : "PASS", errors, bindings: { source_semantic_page_sha256: input?.source?.semantic_page_sha256, voice_profile_sha256: input?.voice?.profile_sha256, strategy_sha256: input?.strategy?.strategy_sha256, page_plan_sha256: input?.structure_lock?.page_plan_sha256 } };
}
