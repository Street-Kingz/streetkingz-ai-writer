import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256 } from "../research/core/canonical.js";
import { deriveCornerstoneStrategyAllowlists } from "../cornerstone/strategy-allowlists.js";
import { buildDryingTowelConceptPolicy, validateConceptOwnership } from "../editorial/concept-ownership.js";
import { validateEditorialRevision } from "../editorial/revision-validation.js";
import { validateFounderVoice } from "../editorial/founder-voice.js";
import { renderEditorialDraftMarkdown } from "../editorial/draft-render.js";
import { validateVoiceTransformation } from "../voice/profile.js";
import { validateGeneratedVoiceTransformation, reviewVoiceTransformationQuality } from "../voice/transformation-validation.js";

const root = path.resolve("artifacts/cornerstone/best-car-drying-towel");
const sourcePath = path.join(root, "voice-transformation-v1/human-amendment-v1-001/semantic-page.json");
const inputPath = path.join(root, "voice-transformation-v1/preparation-003/transformation-input.json");
const planPath = path.join(root, "component-draft-v1/approved-page-plan.json");
const outputDirectory = path.join(root, "final-human-approved-v2");
const expectedSourceHash = "6e784f6cb98feb679cb08444bcccc6306d20d64ffac4b464c3fe55be03e43f7c";
const [source, input, plan] = await Promise.all([sourcePath, inputPath, planPath].map((file) => readFile(file, "utf8").then(JSON.parse)));
if (sha256(canonicalJson(source)) !== expectedSourceHash) throw new Error("Amended semantic source hash mismatch.");
const page = structuredClone(source);
const criteria = page.components.find((component) => component.component_type === "criteria_cards");
const construction = criteria.data.cards.find((card) => card.title === "Construction and weave");
const oldText = "Microfibre and waffle weave are formats you may come across when comparing drying towels, but the label alone won’t tell you which towel is better.";
const newText = "Microfibre towels come in different constructions and weaves, including waffle-style options, but the label alone won’t tell you which towel is better.";
if (!construction.explanation.includes(oldText)) throw new Error("Expected construction wording was not found.");
construction.explanation = construction.explanation.replace(oldText, newText);
for (const annotation of criteria.claim_annotations || []) if (annotation.claim_text === oldText) annotation.claim_text = newText;
const before = structuredClone(source);
const sanitise = (value) => {
  const clone = structuredClone(value);
  for (const component of clone.components) delete component.claim_annotations;
  delete clone.validation_metadata;
  return clone;
};
const permitted = structuredClone(before);
const permittedCriteria = permitted.components.find((component) => component.component_type === "criteria_cards");
const permittedConstruction = permittedCriteria.data.cards.find((card) => card.title === "Construction and weave");
permittedConstruction.explanation = permittedConstruction.explanation.replace(oldText, newText);
if (canonicalJson(sanitise(page)) !== canonicalJson(sanitise(permitted))) throw new Error("Unexpected customer-facing or structural change.");
const allowlists = deriveCornerstoneStrategyAllowlists(input.strategy.research_packet);
const conceptPolicy = buildDryingTowelConceptPolicy(plan);
const revision = { revision_version: "1.0.0", comparison_component_decision: { decision: "remove", rationale: "Preserved from the accepted page.", evidence_ids: [], customer_value: "Preserved from the accepted page." }, founder_note_decision: { decision: "omit", rationale: "Preserved from the accepted page.", evidence_ids: [] }, page };
const revisionValidation = validateEditorialRevision(revision, { sourcePageHash: input.source.semantic_page_sha256, plan, conceptPolicy, allowlists, founderFactIds: [] });
const generatedVoice = validateGeneratedVoiceTransformation(revision, { input, plan, conceptPolicy, allowlists });
const validations = {
  amendment: revisionValidation,
  voice: validateVoiceTransformation({ before, after: page, founderFactIds: [] }),
  founderVoice: validateFounderVoice(page, { founderFactIds: [] }),
  generatedVoice,
  conceptOwnership: validateConceptOwnership(page, conceptPolicy),
  editorial: reviewVoiceTransformationQuality(revision, generatedVoice)
};
if (Object.values(validations).some((result) => result.status === "FAIL" || result.accepted_for_human_review === false)) throw new Error(JSON.stringify(validations));
await mkdir(outputDirectory, { recursive: false });
await writeFile(path.join(outputDirectory, "semantic-page.json"), `${JSON.stringify(page, null, 2)}\n`);
await writeFile(path.join(outputDirectory, "semantic-page.md"), `${renderEditorialDraftMarkdown(page, allowlists)}\n`);
await writeFile(path.join(outputDirectory, "final-approval-validation.json"), `${JSON.stringify({ artifact_type: "final_human_approved_semantic_page_validation", status: "PASS", validations }, null, 2)}\n`);
await writeFile(path.join(outputDirectory, "approval.json"), `${JSON.stringify({ artifact_type: "human_approved_semantic_page", approval_state: "HUMAN_APPROVED", approved_by: "human", ai_calls: 0, source_semantic_page_sha256: input.source.semantic_page_sha256, voice_profile_sha256: input.voice.profile_sha256, final_semantic_page_sha256: sha256(canonicalJson(page)), permitted_change: "Construction/weave wording only.", wordpress_writes: 0, publication_attempts: 0 }, null, 2)}\n`);
console.log(JSON.stringify({ outputDirectory, status: "PASS", approval_state: "HUMAN_APPROVED", semantic_page_sha256: sha256(canonicalJson(page)), ai_calls: 0 }));
