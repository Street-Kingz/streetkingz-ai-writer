import { visibleCopyStrings } from "./founder-voice.js";

const error = (code, path, message) => ({ code, path, message });
const normalise = (value) => String(value).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9×]+/g, " ").replace(/\s+/g, " ").trim();

// Concept definitions belong to a page plan. This fixture policy is deliberately
// separate from the generic analyser so another topic can supply different concepts.
export function buildDryingTowelConceptPolicy(plan) {
  const byType = (type) => plan.components.find((item) => item.component_type === type)?.component_id;
  const rich = plan.components.filter((item) => item.component_type === "rich_text_section");
  const vehicle = rich.find((item) => /vehicle size|manag.*when wet/i.test(item.purpose))?.component_id;
  const practical = rich.find((item) => /ordered workflow/i.test(item.purpose))?.component_id;
  const product = byType("product_recommendation");
  const faq = byType("faq");
  return {
    schema_version: "1.0.0",
    policy_id: "best_car_drying_towel_concept_ownership_v1",
    page_plan_id: plan.plan_id,
    concepts: [
      { concept_id: "gsm", labels: ["gsm", "grams per square metre", "weight rating", "headline number"], substantial_cues: ["quality score", "fabric weight", "better", "worse", "choose", "consider"], primary_component_id: byType("criteria_cards"), max_substantial_components: 2, secondary_component_ids: [product], permitted_non_substantial_kinds: ["brief_reference", "product_specification", "faq_direct_answer"] },
      { concept_id: "dimensions", labels: ["dimensions", "towel size", "physical size", "format", "90 × 60", "90 x 60", "broad panels", "larger towel", "smaller towel"], substantial_cues: ["panel area", "coverage", "cover", "position", "control", "reach", "convenient", "manageable", "smaller car", "larger vehicle"], primary_component_id: byType("criteria_cards"), max_substantial_components: 2, secondary_component_ids: [vehicle], permitted_non_substantial_kinds: ["brief_reference", "product_specification", "faq_direct_answer"] },
      { concept_id: "edging", labels: ["edging", "edge finish", "stitched edge", "seamless edge", "border finish"], substantial_cues: ["surface", "finish", "compare", "check", "construction"], primary_component_id: byType("criteria_cards"), max_substantial_components: 1, secondary_component_ids: [], permitted_non_substantial_kinds: ["brief_reference", "product_specification", "faq_direct_answer"] },
      { concept_id: "saturated_handling", labels: ["saturated", "when wet", "takes on water", "taken on water", "wet handling", "water loaded", "waterlogged", "heavier to handle", "weight as it fills"], substantial_cues: ["lift", "reposition", "wring", "control", "weight", "trade off", "tradeoff"], primary_component_id: vehicle, max_substantial_components: 2, secondary_component_ids: [product], permitted_non_substantial_kinds: ["brief_reference", "product_specification", "faq_direct_answer"] },
      { concept_id: "care", labels: ["care", "washing the towel", "wash the towel", "fabric softener", "bleach", "air dry", "tumble dry", "detergent", "storage", "store it"], substantial_cues: ["cold", "gentle", "avoid", "do not", "clean", "dry", "putting it away"], primary_component_id: byType("key_takeaway"), max_substantial_components: 2, secondary_component_ids: [faq], permitted_non_substantial_kinds: ["brief_reference", "faq_direct_answer"] },
      { concept_id: "construction", labels: ["construction", "weave", "microfibre pile", "microfiber pile", "twisted loop", "fibre structure", "fiber structure", "how it is made"], substantial_cues: ["fibres", "made", "arranged", "perform", "quality", "compare"], primary_component_id: byType("criteria_cards"), max_substantial_components: 2, secondary_component_ids: [], permitted_non_substantial_kinds: ["brief_reference", "product_specification", "faq_direct_answer"] }
    ],
    component_jobs: [
      { component_id: byType("hero"), job: "Introduce the reader's problem and the decision the page will help them make.", forbidden_substantial_concepts: ["gsm", "dimensions", "edging", "saturated_handling", "care", "construction"] },
      { component_id: byType("quick_answer"), job: "Give the shortest useful answer and name major criteria at most once without explaining them.", forbidden_substantial_concepts: ["gsm", "dimensions", "edging", "saturated_handling", "care", "construction"] },
      { component_id: byType("criteria_cards"), job: "Own detailed explanation of GSM, dimensions, edging and construction.", owns_concepts: ["gsm", "dimensions", "edging", "construction"] },
      { component_id: vehicle, job: "Apply criteria to vehicles and use cases; own saturated handling.", owns_concepts: ["saturated_handling"], forbidden_substantial_concepts: ["gsm", "edging", "construction"] },
      { component_id: product, job: "Explain who the product suits and its commercially relevant trade-off without repeating the guide.", allowed_substantial_concepts: ["saturated_handling"] },
      { component_id: practical, job: "Explain the practical drying workflow, not towel selection.", forbidden_substantial_concepts: ["gsm", "dimensions", "edging", "saturated_handling", "care", "construction"] },
      { component_id: byType("key_takeaway"), job: "Own washing, care and storage advice.", owns_concepts: ["care"] },
      { component_id: faq, job: "Answer residual questions briefly rather than repeat completed sections." },
      { component_id: byType("conclusion"), job: "Help the reader decide without recapping every criterion.", forbidden_substantial_concepts: ["gsm", "dimensions", "edging", "saturated_handling", "care", "construction"] }
    ]
  };
}

function visibleComponentData(component) {
  const data = { ...component.data };
  // cta_direction is internal planning metadata once customer-facing cta_label
  // exists; the renderer exposes only the label.
  if (data.cta_label) delete data.cta_direction;
  return visibleCopyStrings(data);
}

function sentences(component) {
  return visibleComponentData(component).flatMap((value) => value.split(/(?<=[.!?])\s+|\n+/)).map((value) => value.trim()).filter(Boolean);
}

function mentions(sentence, concept) {
  const text = normalise(sentence);
  return concept.labels.some((label) => text.includes(normalise(label)));
}

function classify(sentence, component, concept, policy) {
  const text = normalise(sentence);
  const words = text.split(" ").filter(Boolean).length;
  const explanatory = /\b(?:because|means|matters|affects|helps|makes|allows|depends|look for|choose|consider|rather than|better|worse|trade off|tradeoff|important)\b/.test(text);
  const multipleSignals = concept.labels.filter((label) => text.includes(normalise(label))).length > 1;
  const conceptCue = (concept.substantial_cues || []).some((cue) => text.includes(normalise(cue)));
  if (component.component_type === "product_recommendation" && /\b\d+(?:\s*gsm|\s*×\s*\d+|\s*x\s*\d+|\s*cm)\b/.test(text)) return "product_specification";
  if (component.component_type === "faq" && words <= 38) return "faq_direct_answer";
  if (["hero", "quick_answer"].includes(component.component_type) && words <= 50) return "brief_reference";
  const owner = component.component_id === concept.primary_component_id;
  const secondary = concept.secondary_component_ids.includes(component.component_id);
  if (owner) return "substantial_explanation";
  if (secondary && words > 22) return "substantial_explanation";
  if (words <= 22 && !explanatory && !multipleSignals) return "brief_reference";
  if (conceptCue || (explanatory && !(concept.substantial_cues || []).length) || multipleSignals) return "substantial_explanation";
  return "brief_reference";
}

export function validateConceptOwnership(page, policy) {
  const errors = [];
  const appearances = [];
  const componentMap = new Map(page.components.map((item) => [item.component_id, item]));
  for (const concept of policy.concepts) {
    if (!componentMap.has(concept.primary_component_id)) errors.push(error("CONCEPT_OWNER_MISSING", "$.page.components", `${concept.concept_id} owner is absent.`));
    for (const component of page.components) for (const sentence of sentences(component)) if (mentions(sentence, concept)) appearances.push({ concept_id: concept.concept_id, component_id: component.component_id, component_type: component.component_type, classification: classify(sentence, component, concept, policy), text: sentence });
    const substantialIds = [...new Set(appearances.filter((item) => item.concept_id === concept.concept_id && item.classification === "substantial_explanation").map((item) => item.component_id))];
    if (!substantialIds.includes(concept.primary_component_id)) errors.push(error("CONCEPT_OWNER_NOT_SUBSTANTIAL", "$.page.components", `${concept.concept_id} must be substantially explained by its primary owner.`));
    if (substantialIds.length > concept.max_substantial_components) errors.push(error("CONCEPT_REPETITION", "$.page.components", `${concept.concept_id} is substantially explained in ${substantialIds.length} components; budget is ${concept.max_substantial_components}.`));
    const allowed = new Set([concept.primary_component_id, ...concept.secondary_component_ids]);
    for (const id of substantialIds) if (!allowed.has(id)) errors.push(error("CONCEPT_OWNERSHIP_VIOLATION", "$.page.components", `${concept.concept_id} is substantially explained outside its owner/secondary scope in ${id}.`));
  }
  for (const job of policy.component_jobs) {
    for (const conceptId of job.forbidden_substantial_concepts || []) if (appearances.some((item) => item.component_id === job.component_id && item.concept_id === conceptId && item.classification === "substantial_explanation")) errors.push(error("COMPONENT_JOB_VIOLATION", "$.page.components", `${job.component_id} re-explains ${conceptId} outside its job.`));
  }
  const summary = Object.fromEntries(policy.concepts.map((concept) => {
    const relevant = appearances.filter((item) => item.concept_id === concept.concept_id);
    return [concept.concept_id, { primary_component_id: concept.primary_component_id, max_substantial_components: concept.max_substantial_components, substantial_component_ids: [...new Set(relevant.filter((item) => item.classification === "substantial_explanation").map((item) => item.component_id))], brief_reference_count: relevant.filter((item) => item.classification === "brief_reference").length, product_specification_count: relevant.filter((item) => item.classification === "product_specification").length, faq_direct_answer_count: relevant.filter((item) => item.classification === "faq_direct_answer").length }];
  }));
  return { schema_version: "1.0.0", artifact_type: "concept_ownership_validation", status: errors.length ? "FAIL" : "PASS", errors, policy_id: policy.policy_id, concepts: summary, appearances };
}
