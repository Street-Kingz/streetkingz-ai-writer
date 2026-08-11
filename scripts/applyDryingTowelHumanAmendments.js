import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, canonicalize, sha256 } from "../research/core/canonical.js";
import { deriveCornerstoneStrategyAllowlists } from "../cornerstone/strategy-allowlists.js";
import { buildDryingTowelConceptPolicy, validateConceptOwnership } from "../editorial/concept-ownership.js";
import { validateEditorialRevision } from "../editorial/revision-validation.js";
import { validateFounderVoice } from "../editorial/founder-voice.js";
import { renderEditorialDraftMarkdown } from "../editorial/draft-render.js";
import { validateVoiceTransformation } from "../voice/profile.js";
import { validateGeneratedVoiceTransformation, reviewVoiceTransformationQuality } from "../voice/transformation-validation.js";

const root = path.resolve("artifacts/cornerstone/best-car-drying-towel");
const sourcePath = path.join(root, "voice-transformation-v1/gpt-5.6-sol/call_002-correction-001/semantic-page.json");
const inputPath = path.join(root, "voice-transformation-v1/preparation-003/transformation-input.json");
const planPath = path.join(root, "component-draft-v1/approved-page-plan.json");
const outputDirectory = path.join(root, "voice-transformation-v1/human-amendment-v1-001");
const EXPECTED_SOURCE_HASH = "59a7231eef7a45d6caa5ef4182384244b138a0f9da29b40c831e408b31785358";
const [before, input, plan] = await Promise.all([sourcePath, inputPath, planPath].map((file) => readFile(file, "utf8").then(JSON.parse)));
if (sha256(before) !== EXPECTED_SOURCE_HASH) throw new Error("Accepted semantic source hash mismatch.");
const after = structuredClone(before);
const criteria = after.components.find((item) => item.component_type === "criteria_cards");
const construction = criteria.data.cards.find((item) => item.title === "Construction and weave");
construction.explanation = "Construction is how the towel is made, while weave is how its fibres are arranged. Microfibre and waffle weave are formats you may come across when comparing drying towels, but the label alone won’t tell you which towel is better. Check the full specification and how it suits your car instead.";
const edging = criteria.data.cards.find((item) => item.title === "Edging");
edging.explanation = "The edge also touches the car, so check how it is finished rather than looking only at the main fabric.";
const product = after.components.find((item) => item.component_type === "product_recommendation");
product.data.recommendation_context = "This is our own 1200gsm drying towel. It has a 1200 GSM dual-sided microfibre construction, measures 90 × 60 cm, uses soft microfibre edging and is listed as suitable for cars and larger vehicles.";
const faq = after.components.find((item) => item.component_type === "faq");
faq.data.items = faq.data.items.filter((item) => item.question !== "What do professional detailers use to dry cars?");
const conclusion = after.components.find((item) => item.component_type === "conclusion");
conclusion.data.next_step = "If that sounds like what you want from a drying towel, ours is worth a look. If not, choose something that suits you better.";
// Keep claim annotations traceable to the amended visible text.
const beforeCriteria = before.components.find((item) => item.component_type === "criteria_cards");
const beforeConstruction = beforeCriteria.data.cards.find((item) => item.title === "Construction and weave");
const beforeEdging = beforeCriteria.data.cards.find((item) => item.title === "Edging");
for (const annotation of criteria.claim_annotations || []) {
  if (annotation.claim_text === "Microfibre is a prominent car-drying option, and waffle weave is another format people look for, but the label alone won’t tell you which one will perform better.") annotation.claim_text = "Microfibre and waffle weave are formats you may come across when comparing drying towels, but the label alone won’t tell you which towel is better.";
  if (annotation.claim_text === "The edging is a separate part of the towel, so it deserves its own look when you compare product descriptions.") annotation.claim_text = edging.explanation;
}
const beforeProduct = before.components.find((item) => item.component_type === "product_recommendation");
for (const annotation of product.claim_annotations || []) {
  if (annotation.claim_text === "Street Kingz is our business, and this is our heavy-duty drying towel.") annotation.claim_text = "This is our own 1200gsm drying towel.";
  if (annotation.claim_text === beforeProduct.data.recommendation_context) annotation.claim_text = product.data.recommendation_context;
}
const removedFaq = before.components.find((item) => item.component_type === "faq").data.items.find((item) => item.question === "What do professional detailers use to dry cars?");
const afterFaqAnnotation = faq.claim_annotations || [];
faq.claim_annotations = afterFaqAnnotation.filter((annotation) => annotation.claim_text !== removedFaq.answer);
const beforeConclusion = before.components.find((item) => item.component_type === "conclusion");
for (const annotation of conclusion.claim_annotations || []) if (annotation.claim_text === "The Street Kingz heavy-duty towel is worth considering if it suits the way you dry your car.") annotation.claim_text = "If that sounds like what you want from a drying towel, ours is worth a look.";
const changed = {
  "$.components[03_criteria_cards_44e50cdc].data.cards[Construction and weave].explanation": true,
  "$.components[03_criteria_cards_44e50cdc].data.cards[Edging].explanation": true,
  "$.components[06_product_recommendation_55fb7dcb].data.recommendation_context": true,
  "$.components[09_faq_5dc1c294].data.items[professional_detailer_question]": true,
  "$.components[10_conclusion_b18ab30e].data.next_step": true
};
const lockedFields = ["component_id", "component_type", "evidence_ids", "product_ids", "internal_link_ids", "media_requirements", "conversion_role"];
const sanitise = (page) => {
  const clone = structuredClone(page);
  for (const component of clone.components) {
    const type = component.component_type;
    for (const field of lockedFields) delete component[field];
    delete component.claim_annotations;
    if (type === "criteria_cards") for (const card of component.data.cards) if (card.title === "Construction and weave" || card.title === "Edging") delete card.explanation;
    if (type === "product_recommendation") delete component.data.recommendation_context;
    if (type === "faq") component.data.items = component.data.items.filter((item) => item.question !== "What do professional detailers use to dry cars?");
    if (type === "conclusion") delete component.data.next_step;
  }
  delete clone.validation_metadata;
  return clone;
};
if (canonicalJson(sanitise(before)) !== canonicalJson(sanitise(after))) throw new Error("Unapproved customer-facing or structural change detected.");
const revision = {
  revision_version: "1.0.0",
  comparison_component_decision: { decision: "remove", rationale: "Preserved from the accepted page.", evidence_ids: [], customer_value: "Preserved from the accepted page." },
  founder_note_decision: { decision: "omit", rationale: "Preserved from the accepted page.", evidence_ids: [] },
  page: after
};
const allowlists = deriveCornerstoneStrategyAllowlists(input.strategy.research_packet);
const conceptPolicy = buildDryingTowelConceptPolicy(plan);
const revisionValidation = validateEditorialRevision(revision, { sourcePageHash: input.source.semantic_page_sha256, plan, conceptPolicy, allowlists, founderFactIds: [] });
const voiceValidation = validateVoiceTransformation({ before, after, founderFactIds: [] });
const founderValidation = validateFounderVoice(after, { founderFactIds: [] });
const conceptValidation = validateConceptOwnership(after, conceptPolicy);
const standardValidation = validateGeneratedVoiceTransformation(revision, { input, plan, conceptPolicy, allowlists });
const allErrors = [...revisionValidation.errors, ...voiceValidation.errors, ...founderValidation.errors, ...conceptValidation.errors, ...standardValidation.errors];
const validation = { schema_version: "1.0.0", artifact_type: "bounded_human_editorial_amendment_validation", status: allErrors.length ? "FAIL" : "PASS", errors: allErrors, permitted_changes: Object.keys(changed), revision: revisionValidation, voice: voiceValidation, founder: founderValidation, concept: conceptValidation, standard_transformation_checks: standardValidation };
const quality = reviewVoiceTransformationQuality(revision, standardValidation);
const metadata = { schema_version: "1.0.0", artifact_type: "bounded_human_editorial_amendment", source_semantic_page_sha256: EXPECTED_SOURCE_HASH, corrected_semantic_page_sha256: sha256(after), permitted_changes: Object.keys(changed), customer_facing_projection_changed: false, ai_calls: 0, wordpress_writes: 0, writer_executions: 0, publication_attempts: 0 };
if (validation.status !== "PASS" || quality.status === "FAIL") throw new Error(JSON.stringify({ validation, quality }));
await mkdir(outputDirectory, { recursive: false });
const artifacts = { "semantic-page.json": after, "semantic-page.md": renderEditorialDraftMarkdown(after, allowlists), "amendment-validation.json": validation, "editorial-quality-review.json": quality, "amendment-metadata.json": metadata };
for (const [name, value] of Object.entries(artifacts)) await writeFile(path.join(outputDirectory, name), typeof value === "string" ? value : `${JSON.stringify(canonicalize(value), null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ outputDirectory, validation: validation.status, editorial_review: quality.status, semantic_page_sha256: sha256(after), ai_calls: 0 }, null, 2));
