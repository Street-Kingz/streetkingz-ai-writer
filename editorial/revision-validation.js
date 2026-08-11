import { editorialRevisionJsonSchema } from "./revision-contracts.js";
import { validateAgainstSchema } from "./validation.js";
import { validateFounderVoice, visibleCopyStrings } from "./founder-voice.js";
import { validateConceptOwnership } from "./concept-ownership.js";
import { canonicalJson } from "../research/core/canonical.js";

const error = (code, path, message) => ({ code, path, message });
const normalise = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const concepts = {
  gsm: /\bgsm\b/i,
  dimensions: /\b(?:dimensions?|size|90 × 60|90 x 60)\b/i,
  edging: /\b(?:edging|edges?|edge finish)\b/i,
  saturated_handling: /\b(?:saturat|when wet|takes? on water|wet handling|heavier)\b/i,
  care: /\b(?:care|wash|washing|fabric softener|bleach|air dry|tumble dry|detergent)\b/i,
  construction: /\b(?:construction|weave|microfibre|microfiber)\b/i
};
const limits = { gsm: 3, dimensions: 4, edging: 2, saturated_handling: 4, care: 3, construction: 5 };
export function mediaRequirementsEqual(left, right) { return canonicalJson(left) === canonicalJson(right); }

function componentCopy(component) { const data = { ...component.data }; if (data.cta_label) delete data.cta_direction; return visibleCopyStrings(data).join(" "); }

export function validateEditorialRevision(revision, { sourcePageHash, plan, conceptPolicy, allowlists, founderFactIds = [] }) {
  const errors = validateAgainstSchema(revision, editorialRevisionJsonSchema({ plan, allowlists, sourcePageHash, founderFactIds }));
  if (!revision?.page) return { status: "FAIL", errors, founderVoice: null, repetition: null };
  const page = revision.page;
  if (revision.comparison_component_decision?.decision !== "remove") errors.push(error("COMPARISON_DECISION_DEVIATION", "$.comparison_component_decision.decision", "The approved comparison removal decision is fixed."));
  if (revision.founder_note_decision?.decision !== "omit") errors.push(error("FOUNDER_NOTE_DECISION_DEVIATION", "$.founder_note_decision.decision", "The approved founder-note omission is fixed."));
  if (page.validation_metadata.source_semantic_page_hash !== sourcePageHash) errors.push(error("SOURCE_PAGE_DRIFT", "$.page.validation_metadata.source_semantic_page_hash", "Revision must bind to the accepted semantic source."));
  const comparisonId = plan.components.find((item) => item.component_type === "comparison_table")?.component_id;
  const originalIds = plan.component_sequence;
  let expected = revision.comparison_component_decision.decision === "remove" ? originalIds.filter((id) => id !== comparisonId) : [...originalIds];
  if (revision.founder_note_decision.decision === "add") {
    const productIndex = expected.indexOf(plan.components.find((item) => item.component_type === "product_recommendation").component_id);
    expected.splice(productIndex, 0, "revision_founder_note_v1");
  }
  const actual = page.components.map((item) => item.component_id);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(error("REVISION_COMPONENT_DEVIATION", "$.page.components", "Only the declared comparison removal or founder-note insertion is allowed."));
  const slots = new Map(plan.components.map((item) => [item.component_id, item]));
  for (const [index, component] of page.components.entries()) {
    const slot = slots.get(component.component_id);
    if (slot && slot.component_type !== component.component_type) errors.push(error("REVISION_COMPONENT_DEVIATION", `$.page.components[${index}]`, "Component type changed."));
    if (slot) {
      for (const id of component.evidence_ids) if (!slot.evidence_ids.includes(id)) errors.push(error("UNKNOWN_EVIDENCE_ID", `$.page.components[${index}].evidence_ids`, id));
      for (const id of component.product_ids) if (!slot.product_ids.includes(id)) errors.push(error("UNKNOWN_PRODUCT_ID", `$.page.components[${index}].product_ids`, id));
      for (const id of component.internal_link_ids) if (!slot.internal_link_ids.includes(id)) errors.push(error("UNKNOWN_INTERNAL_LINK_ID", `$.page.components[${index}].internal_link_ids`, id));
      if (!mediaRequirementsEqual(component.media_requirements, slot.media_requirements)) errors.push(error("MEDIA_REQUIREMENT_DEVIATION", `$.page.components[${index}].media_requirements`, "Media requirements must be preserved."));
    }
    if (component.component_type === "founder_note" && (component.product_ids.length || component.internal_link_ids.length || component.media_requirements.length)) errors.push(error("FOUNDER_NOTE_SCOPE", `$.page.components[${index}]`, "Founder note cannot create commercial or media scope."));
    if (!["hero", "conclusion", "founder_note"].includes(component.component_type) && !component.claim_annotations.length) errors.push(error("CLAIM_ANNOTATION_REQUIRED", `$.page.components[${index}].claim_annotations`, "Substantive components require claim classification."));
    for (const annotation of component.claim_annotations) {
      for (const id of annotation.evidence_ids) if (!component.evidence_ids.includes(id)) errors.push(error("CLAIM_EVIDENCE_OUT_OF_SCOPE", `$.page.components[${index}].claim_annotations`, id));
    }
  }
  const product = page.components.find((item) => item.component_type === "product_recommendation");
  if (!product || product.data.product_id !== allowlists.product_ids[0] || product.product_ids.length !== 1) errors.push(error("PRODUCT_BOUNDARY", "$.page.components", "Exactly the approved product recommendation is required."));
  if (!product?.data?.cta_label || product.data.cta_label.length < 3 || product.data.cta_label.length > 70 || /direction|approved|registered/i.test(product.data.cta_label)) errors.push(error("CTA_INVALID", "$.page.components.product_recommendation.data.cta_label", "CTA must be actual low-pressure customer copy."));
  const allCopy = visibleCopyStrings(page).join("\n");
  if (/https?:\/\//i.test(allCopy)) errors.push(error("INVENTED_URL", "$.page", "Visible copy cannot invent or recreate URLs."));
  if (/<\/?[a-z][^>]*>|(^|\n)#{1,6}\s/i.test(allCopy)) errors.push(error("ARBITRARY_HTML_OR_DOCUMENT", "$.page", "HTML and document Markdown are prohibited."));
  if (/in this (?:comprehensive|ultimate) guide|keyword density|unlock the secrets/i.test(allCopy)) errors.push(error("GENERIC_SEO_FILLER", "$.page", "Generic SEO filler is prohibited."));
  const conceptCounts = Object.fromEntries(Object.keys(concepts).map((name) => [name, page.components.filter((item) => concepts[name].test(componentCopy(item))).length]));
  // Retain legacy mention counts for audit continuity, but ownership classification
  // (not literal keyword count) is authoritative for repetition failures.
  const conceptOwnership = conceptPolicy ? validateConceptOwnership(page, conceptPolicy) : { status: "FAIL", errors: [error("CONCEPT_POLICY_REQUIRED", "$.page", "A page-specific concept ownership policy is required.")] };
  errors.push(...conceptOwnership.errors);
  const sentences = page.components.flatMap((component) => componentCopy(component).split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length > 70).map((sentence) => ({ id: component.component_id, value: normalise(sentence) })));
  for (let i = 0; i < sentences.length; i += 1) for (let j = i + 1; j < sentences.length; j += 1) if (sentences[i].id !== sentences[j].id && sentences[i].value === sentences[j].value) errors.push(error("DUPLICATE_CONTENT", "$.page.components", `Repeated sentence across ${sentences[i].id} and ${sentences[j].id}.`));
  const faq = page.components.find((item) => item.component_type === "faq");
  if ((faq?.data?.items || []).some((item) => item.question === "What criteria should I use to choose the best car drying towel for my vehicle and routine?")) errors.push(error("REDUNDANT_FAQ_NOT_REMOVED", "$.page.components.faq.items", "The explicitly rejected criteria FAQ must be removed."));
  for (const [index, item] of (faq?.data?.items || []).entries()) if (item.answer.length < 35 || item.answer.length > 650) errors.push(error("FAQ_ANSWER_QUALITY", `$.page.components.faq.items[${index}]`, "FAQ answer must be concise but useful."));
  if (revision.comparison_component_decision.decision === "retain") {
    const comparison = page.components.find((item) => item.component_type === "comparison_table");
    if (!comparison || revision.comparison_component_decision.customer_value.length < 50) errors.push(error("WEAK_COMPARISON", "$.comparison_component_decision", "A retained comparison must provide clear customer value."));
  }
  const founderVoice = validateFounderVoice(page, { founderFactIds });
  errors.push(...founderVoice.errors);
  return { status: errors.length ? "FAIL" : "PASS", errors, warnings: [], founderVoice, repetition: { legacy_mention_component_counts: conceptCounts, legacy_limits: limits, authoritative_method: "page_specific_concept_ownership", concept_summary: conceptOwnership.concepts || {} }, conceptOwnership };
}
