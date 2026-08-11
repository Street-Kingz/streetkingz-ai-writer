import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256, canonicalize } from "../research/core/canonical.js";
import { deriveCornerstoneStrategyAllowlists } from "../cornerstone/strategy-allowlists.js";
import { buildDryingTowelConceptPolicy } from "../editorial/concept-ownership.js";
import { renderEditorialDraftMarkdown } from "../editorial/draft-render.js";
import { visibleCopyStrings } from "../editorial/founder-voice.js";
import { applyDeterministicVoiceTransformationLocks } from "../voice/transformation.js";
import { validateGeneratedVoiceTransformation, reviewVoiceTransformationQuality } from "../voice/transformation-validation.js";

const root = path.resolve("artifacts/cornerstone/best-car-drying-towel");
const inputPath = path.join(root, "voice-transformation-v1/preparation-003/transformation-input.json");
const planPath = path.join(root, "component-draft-v1/approved-page-plan.json");
const rawPath = path.join(root, "voice-transformation-v1/gpt-5.6-sol/call_002/transformation-response-raw.json");
const outputDirectory = path.join(root, "voice-transformation-v1/gpt-5.6-sol/call_002-correction-001");
const [input, plan, rawEnvelope] = await Promise.all([inputPath, planPath, rawPath].map((file) => readFile(file, "utf8").then(JSON.parse)));
const rawRevision = JSON.parse(rawEnvelope.raw_text);
const conceptPolicy = buildDryingTowelConceptPolicy(plan);
const allowlists = deriveCornerstoneStrategyAllowlists(input.strategy.research_packet);
const corrected = applyDeterministicVoiceTransformationLocks(rawRevision, input.source.semantic_page, input.source.semantic_page_sha256);
if (corrected.error) throw new Error(JSON.stringify(corrected.error));
const validation = validateGeneratedVoiceTransformation(corrected.revision, { input, plan, conceptPolicy, allowlists });
validation.derived_from = { call_directory: "voice-transformation-v1/gpt-5.6-sol/call_002", raw_response_sha256: sha256(rawEnvelope.raw_text), original_candidate_semantic_sha256: sha256(rawRevision.page) };
const qualityReview = reviewVoiceTransformationQuality(corrected.revision, validation);
const originalVisible = visibleCopyStrings(rawRevision.page);
const correctedVisible = visibleCopyStrings(corrected.revision.page);
const metadataOnly = JSON.stringify(originalVisible) === JSON.stringify(correctedVisible);
const metadata = {
  schema_version: "1.0.0", artifact_type: "derived_voice_transformation_correction", ai_calls: 0, retries: 0,
  original_call_immutable: true, source_semantic_page_sha256: input.source.semantic_page_sha256,
  historical_source_metadata_replaced: true, corrected_semantic_page_sha256: sha256(corrected.revision.page),
  customer_facing_projection_unchanged: metadataOnly,
  original_customer_projection_sha256: sha256(originalVisible), corrected_customer_projection_sha256: sha256(correctedVisible),
  locked_attempts_ignored: corrected.attempts.map((item) => item.path), wordpress_writes: 0, writer_executions: 0, publication_attempts: 0
};
if (!metadataOnly) throw new Error("Customer-facing projection changed during deterministic correction.");
await mkdir(outputDirectory, { recursive: false });
const artifacts = {
  "semantic-page.json": corrected.revision.page,
  "semantic-page.md": renderEditorialDraftMarkdown(corrected.revision.page, allowlists),
  "transformation-validation.json": validation,
  "editorial-quality-review.json": qualityReview,
  "correction-metadata.json": metadata,
  "source-candidate.json": { source_call: "call_002", raw_response_sha256: sha256(rawEnvelope.raw_text), original_candidate_semantic_sha256: sha256(rawRevision.page) }
};
for (const [name, value] of Object.entries(artifacts)) await writeFile(path.join(outputDirectory, name), typeof value === "string" ? value : `${JSON.stringify(canonicalize(value), null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ outputDirectory, validation: validation.status, editorial_review: qualityReview.status, accepted_for_human_review: qualityReview.accepted_for_human_review, semantic_page_sha256: sha256(corrected.revision.page), customer_facing_projection_unchanged: metadataOnly, ai_calls: 0 }, null, 2));
