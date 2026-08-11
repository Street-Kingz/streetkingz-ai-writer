export const FOUNDER_VOICE_VERSION = "1.0.0";
export const CLAIM_KINDS = Object.freeze(["founder_fact", "founder_opinion", "evidence_bound_fact", "editorial_judgement"]);

export const STREET_KINGZ_FOUNDER_VOICE = Object.freeze({
  version: FOUNDER_VOICE_VERSION,
  applies_to: ["cornerstone", "evergreen", "buying_guide", "product_support", "category_support", "url_driven_editorial"],
  audience: "Normal people who like having a clean car, not detailing obsessives.",
  qualities: ["founder-led", "straightforward", "conversational", "useful", "confident where evidence allows", "honest about limitations"],
  first_person: "Allowed where natural, but never forced into every paragraph.",
  experiential_rule: "First-person testing, use, ownership, history, development, customer, sales, experiment or comparison claims require an approved founder-fact ID.",
  commercial_rule: "Be transparent that Street Kingz sells products; help first and recommend only when the bounded product genuinely fits.",
  prohibited_visible_language: [
    "supplied evidence", "approved registry", "registered option", "evidence packet", "packet-backed", "approved product",
    "evidence boundary", "verified registry", "supplied first-party example", "unsupported by the packet", "approved link",
    "validation", "model", "schema", "source registry"
  ]
});

const FIRST_PERSON = /\b(?:I|I've|I'd|I'll|I'm|me|my|mine|we|we've|we'd|we'll|we're|us|our|ours)\b/i;
const EXPERIENCE = /\b(?:tested|test-driven|used|owned|driven|I always (?:use|dry|wash|choose)|for \d+ (?:years?|months?)|designed|developed|created|sold|sell thousands|customers? (?:normally|usually|tell|say|prefer)|found .* (?:better|worse)|experimented|compared .* myself|personally)\b/i;

const visibleStrings = (value, output = []) => {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => visibleStrings(item, output));
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) if (!["evidence_ids", "product_ids", "internal_link_ids", "claim_annotations", "validation_metadata", "media_requirements"].includes(key)) visibleStrings(item, output);
  return output;
};

export function validateFounderVoice(page, { founderFactIds = [] } = {}) {
  const errors = [], warnings = [];
  const facts = new Set(founderFactIds);
  const firstPersonComponents = [];
  const pageLevelCopy = [page?.title, page?.h1, page?.introduction_deck, page?.conclusion].filter((item) => typeof item === "string").join(" ").toLowerCase();
  for (const phrase of STREET_KINGZ_FOUNDER_VOICE.prohibited_visible_language) if (pageLevelCopy.includes(phrase)) errors.push({ code: "INTERNAL_SYSTEM_LANGUAGE", path: "$.page", message: phrase });
  for (const [index, component] of (page?.components || []).entries()) {
    const copy = visibleStrings(component.data).join(" ");
    if (FIRST_PERSON.test(copy)) firstPersonComponents.push(component.component_id);
    const annotations = component.claim_annotations || [];
    for (const [annotationIndex, annotation] of annotations.entries()) {
      if (!CLAIM_KINDS.includes(annotation.claim_kind)) errors.push({ code: "INVALID_CLAIM_KIND", path: `$.components[${index}].claim_annotations[${annotationIndex}]`, message: annotation.claim_kind });
      if (!copy.includes(annotation.claim_text)) errors.push({ code: "CLAIM_TEXT_NOT_VISIBLE", path: `$.components[${index}].claim_annotations[${annotationIndex}].claim_text`, message: "Annotated claim must appear verbatim in component copy." });
      if (annotation.claim_kind === "founder_fact") {
        if (!annotation.founder_fact_ids.length) errors.push({ code: "FOUNDER_FACT_SOURCE_REQUIRED", path: `$.components[${index}].claim_annotations[${annotationIndex}]`, message: "Founder facts require an explicit source." });
        for (const id of annotation.founder_fact_ids) if (!facts.has(id)) errors.push({ code: "UNKNOWN_FOUNDER_FACT", path: `$.components[${index}].claim_annotations[${annotationIndex}].founder_fact_ids`, message: id });
      } else if (annotation.founder_fact_ids.length) errors.push({ code: "FOUNDER_FACT_MISCLASSIFIED", path: `$.components[${index}].claim_annotations[${annotationIndex}]`, message: "Only founder_fact may cite founder facts." });
      if (annotation.claim_kind === "evidence_bound_fact" && !annotation.evidence_ids.length) errors.push({ code: "EVIDENCE_REQUIRED", path: `$.components[${index}].claim_annotations[${annotationIndex}]`, message: "Evidence-bound facts require evidence." });
    }
    const experientialSentences = copy.split(/(?<=[.!?])\s+/).filter((sentence) => FIRST_PERSON.test(sentence) && EXPERIENCE.test(sentence));
    for (const sentence of experientialSentences) {
      const supported = annotations.some((annotation) => annotation.claim_kind === "founder_fact" && annotation.founder_fact_ids.some((id) => facts.has(id)) && (annotation.claim_text.includes(sentence) || sentence.includes(annotation.claim_text)));
      if (!supported) errors.push({ code: "UNSUPPORTED_FIRST_PERSON_EXPERIENCE", path: `$.components[${index}].data`, message: sentence });
    }
    const lower = copy.toLowerCase();
    for (const phrase of STREET_KINGZ_FOUNDER_VOICE.prohibited_visible_language) if (lower.includes(phrase)) errors.push({ code: "INTERNAL_SYSTEM_LANGUAGE", path: `$.components[${index}].data`, message: phrase });
  }
  if (firstPersonComponents.length === 0) errors.push({ code: "FOUNDER_VOICE_ABSENT", path: "$.components", message: "No natural founder-led first-person voice is present." });
  const product = page?.components?.find((item) => item.component_type === "product_recommendation");
  if (product && !FIRST_PERSON.test(visibleStrings(product.data).join(" "))) errors.push({ code: "COMMERCIAL_TRANSPARENCY_MISSING", path: `$.components.${product.component_id}`, message: "The product recommendation must transparently use founder/company voice." });
  return { schema_version: "1.0.0", artifact_type: "founder_voice_validation", voice_version: FOUNDER_VOICE_VERSION, status: errors.length ? "FAIL" : warnings.length ? "PASS_WITH_WARNINGS" : "PASS", errors, warnings, metrics: { first_person_component_count: firstPersonComponents.length, first_person_components: firstPersonComponents, founder_fact_registry_count: founderFactIds.length } };
}

export function visibleCopyStrings(page) { return visibleStrings(page); }
