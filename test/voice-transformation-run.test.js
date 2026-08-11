import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildVoiceTransformationPrompt } from "../voice/transformation-prompt.js";
import { validateGeneratedVoiceTransformation } from "../voice/transformation-validation.js";
import { deriveCornerstoneStrategyAllowlists } from "../cornerstone/strategy-allowlists.js";
import { applyDeterministicVoiceTransformationLocks } from "../voice/transformation.js";
import { mediaRequirementsEqual, validateEditorialRevision } from "../editorial/revision-validation.js";
import { editorialRevisionJsonSchema } from "../editorial/revision-contracts.js";

const root = "artifacts/cornerstone/best-car-drying-towel";
const load = (path) => readFile(path, "utf8").then(JSON.parse);
test("voice transformation prompt binds approved profile source and no-call preparation", async () => { const input = await load(`${root}/voice-transformation-v1/preparation-002/transformation-input.json`); const prompt = buildVoiceTransformationPrompt(input); assert.match(prompt, /street-kingz-founder-v1/); assert.match(prompt, /77e9e3a92bf9216b0e4874cbcb9e3943cbfab273d569dec8ac3d65ea6af5753b/); assert.equal(input.ai_call_authorised, false); });
test("unchanged source fails the targeted voice cleanup rather than being silently accepted", async () => { const [input, plan] = await Promise.all([load(`${root}/voice-transformation-v1/preparation-002/transformation-input.json`), load(`${root}/component-draft-v1/approved-page-plan.json`)]); const revision = { revision_version: "1.0.0", comparison_component_decision: { decision: "remove", rationale: "Evidence-limited comparison remains removed.", evidence_ids: [], customer_value: "The page stays focused on evidence-backed selection decisions rather than a caveat-dominated comparison." }, founder_note_decision: { decision: "omit", rationale: "Founder voice belongs naturally in the page.", evidence_ids: [] }, page: input.source.semantic_page }; const allowlists = deriveCornerstoneStrategyAllowlists(input.strategy.research_packet); const result = validateGeneratedVoiceTransformation(revision, { input, plan, conceptPolicy: input.structure_lock.concept_policy, allowlists }); assert.ok(result.errors.some((item) => item.code === "LEGALISTIC_LANGUAGE_REMAINS")); });
test("generic run and prompt modules contain no WordPress mutation authority", async () => { const code = (await Promise.all(["voice/transformation-run.js", "voice/transformation-prompt.js", "voice/transformation-validation.js"].map((file) => readFile(file, "utf8")))).join(" ").toLowerCase(); for (const term of ["update_post_meta", "update_metadata(", "wp_update_post", "document::save"]) assert.equal(code.includes(term), false, term); });
test("locked source metadata is deterministically reapplied and media has no model authority", async () => {
  const input = await load(`${root}/voice-transformation-v1/preparation-002/transformation-input.json`);
  const candidate = structuredClone({ page: input.source.semantic_page });
  candidate.page.components[0].media_requirements = [];
  candidate.page.components[0].component_id = "attempted-id";
  const locked = applyDeterministicVoiceTransformationLocks(candidate, input.source.semantic_page);
  assert.equal(locked.error, null);
  assert.deepEqual(locked.revision.page.components[0].media_requirements, input.source.semantic_page.components[0].media_requirements);
  assert.equal(locked.revision.page.components[0].component_id, input.source.semantic_page.components[0].component_id);
  assert.ok(locked.attempts.some((item) => item.path.endsWith("media_requirements")));
  assert.ok(locked.attempts.some((item) => item.path.endsWith("component_id")));
});
test("model-output schema removes media from the creative surface while final schema permits source reattachment", async () => {
  const input = await load(`${root}/voice-transformation-v1/preparation-002/transformation-input.json`);
  const plan = await load(`${root}/component-draft-v1/approved-page-plan.json`);
  const allowlists = deriveCornerstoneStrategyAllowlists(input.strategy.research_packet);
  const modelSchema = editorialRevisionJsonSchema({ plan, allowlists, sourcePageHash: input.source.semantic_page_sha256, modelOutput: true });
  const finalSchema = editorialRevisionJsonSchema({ plan, allowlists, sourcePageHash: input.source.semantic_page_sha256 });
  const media = modelSchema.properties.page.properties.components.items.anyOf[0].properties.media_requirements;
  assert.equal(media.maxItems, 0);
  assert.equal(finalSchema.properties.page.properties.components.items.anyOf[0].properties.media_requirements.maxItems, undefined);
});
test("customer-facing evidence register is rejected while internal metadata may retain evidence annotations", async () => {
  const [input, plan] = await Promise.all([load(`${root}/voice-transformation-v1/preparation-002/transformation-input.json`), load(`${root}/component-draft-v1/approved-page-plan.json`)]);
  const candidate = structuredClone(input.source.semantic_page);
  candidate.components[0].data.supporting_copy = "There is no reliable basis here for choosing one towel.";
  assert.match(JSON.stringify(candidate), /There is no reliable basis/);
  const pageCopy = candidate.components[0].data.supporting_copy;
  assert.equal(pageCopy.includes("There is no reliable basis"), true);
  const revision = { revision_version: "1.0.0", comparison_component_decision: { decision: "remove", rationale: "bounded", evidence_ids: [], customer_value: "bounded" }, founder_note_decision: { decision: "omit", rationale: "bounded", evidence_ids: [] }, page: candidate };
  const allowlists = deriveCornerstoneStrategyAllowlists(input.strategy.research_packet);
  const result = validateGeneratedVoiceTransformation(revision, { input, plan, conceptPolicy: input.structure_lock.concept_policy, allowlists });
  assert.ok(result.errors.some((item) => item.code === "LEGALISTIC_LANGUAGE_REMAINS"));
});
test("source binding is always rebound to the immediate source, never historical page metadata", async () => {
  const input = await load(`${root}/voice-transformation-v1/preparation-003/transformation-input.json`);
  const candidate = { page: structuredClone(input.source.semantic_page) };
  candidate.page.validation_metadata.source_semantic_page_hash = "e396ef51898d5b8a8be4d088471242ae46695ef6cfc730befeca9fd5f007d37e";
  const corrected = applyDeterministicVoiceTransformationLocks(candidate, input.source.semantic_page, input.source.semantic_page_sha256);
  assert.equal(corrected.revision.page.validation_metadata.source_semantic_page_hash, input.source.semantic_page_sha256);
  assert.equal(corrected.attempts.some((item) => item.path === "$.page.validation_metadata"), true);
  const stale = structuredClone(corrected.revision);
  stale.page.validation_metadata.source_semantic_page_hash = "e396ef51898d5b8a8be4d088471242ae46695ef6cfc730befeca9fd5f007d37e";
  assert.equal(stale.page.validation_metadata.source_semantic_page_hash === input.source.semantic_page_sha256, false);
});
test("media comparison is canonical, preserves array order, and rejects value/shape drift", () => {
  const left = [{ requirement_id: "a", kind: "lifestyle_image", purpose: "p", alt_text_direction: "a", status: "required_missing" }, { requirement_id: "b", kind: "product_image", purpose: "q", alt_text_direction: "b", status: "optional_missing" }];
  const reorderedKeys = [{ status: "required_missing", alt_text_direction: "a", purpose: "p", kind: "lifestyle_image", requirement_id: "a" }, { status: "optional_missing", alt_text_direction: "b", purpose: "q", kind: "product_image", requirement_id: "b" }];
  assert.equal(mediaRequirementsEqual(left, reorderedKeys), true);
  assert.equal(mediaRequirementsEqual(left, left.map((item) => ({ ...item, purpose: item.purpose + " changed" }))), false);
  assert.equal(mediaRequirementsEqual(left, left.map(({ purpose, ...item }) => item)), false);
  assert.equal(mediaRequirementsEqual(left, left.map((item) => ({ ...item, extra: true }))), false);
  assert.equal(mediaRequirementsEqual(left, [...left].reverse()), false);
});
