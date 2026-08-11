import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { deriveCornerstoneStrategyAllowlists } from "../cornerstone/strategy-allowlists.js";
import { buildEditorialPagePlan } from "../editorial/plan.js";
import { buildDryingTowelConceptPolicy } from "../editorial/concept-ownership.js";
import { bindRevisionToImmediateSource } from "../editorial/revision-lineage.js";
import { validateEditorialRevision } from "../editorial/revision-validation.js";
import { reviewFounderRevisionQuality } from "../editorial/revision-quality.js";
import { renderEditorialDraftMarkdown } from "../editorial/draft-render.js";
import { writeImmutableArtifact } from "../interpretation/call-control.js";

const root = path.resolve("artifacts/cornerstone/best-car-drying-towel");
const call2 = path.join(root, "component-revision-v1/gpt-5.6-sol/call_002");
const call3 = path.join(root, "component-revision-v1/gpt-5.6-sol/call_003");
const output = path.join(root, "component-revision-v1/deterministic-acceptance-001");
const [packet, strategy, plan, sourceWrapper, candidateWrapper] = await Promise.all([
  readFile(path.join(root, "fixture-v1/research-packet.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "strategy-v1/gpt-5.6-sol/call_002/strategy.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "component-draft-v1/approved-page-plan.json"), "utf8").then(JSON.parse),
  readFile(path.join(call2, "revision-response-raw.json"), "utf8").then(JSON.parse),
  readFile(path.join(call3, "revision-response-raw.json"), "utf8").then(JSON.parse)
]);
const immediateSourcePage = JSON.parse(sourceWrapper.raw_text).page;
const candidate = JSON.parse(candidateWrapper.raw_text);
const immediateSourceHash = sha256(immediateSourcePage);
const rejectedCandidateHash = sha256(candidate.page);
if (immediateSourceHash !== "e396ef51898d5b8a8be4d088471242ae46695ef6cfc730befeca9fd5f007d37e") throw new Error("Immediate source candidate drifted.");
if (rejectedCandidateHash !== "23f22412a2eac3d0b97b8ee5e05b3b75dec5136ba9818e0b05e85b6cc1dddf88") throw new Error("Latest rejected candidate drifted.");
const bound = bindRevisionToImmediateSource({ revision: candidate, immediateSourcePage, expectedImmediateSourceHash: immediateSourceHash });
const allowlists = deriveCornerstoneStrategyAllowlists(packet);
const conceptPolicy = buildDryingTowelConceptPolicy(plan);
const validation = validateEditorialRevision(bound.revision, { sourcePageHash: immediateSourceHash, plan, conceptPolicy, allowlists, founderFactIds: [] });
if (validation.status !== "PASS") throw new Error(`Corrected candidate validation failed: ${JSON.stringify(validation.errors)}`);
const editorial = reviewFounderRevisionQuality(bound.revision, validation);
if (!editorial.accepted_for_human_review) throw new Error(`Corrected candidate editorial review failed: ${JSON.stringify(editorial.issues)}`);
const correctedHash = sha256(bound.revision.page);
await mkdir(output, { recursive: false });
await writeImmutableArtifact(output, "source-binding-correction.json", { ...bound.audit, lineage: ["51a340f7767a77b69519a0053b296e66f5ecaceb1044b89192fe8777885caced", immediateSourceHash, rejectedCandidateHash, correctedHash] });
await writeImmutableArtifact(output, "revision-validation.json", { schema_version: "1.0.0", artifact_type: "corrected_founder_revision_validation", status: "PASS", downstream_eligible: true, ...validation });
await writeImmutableArtifact(output, "founder-voice-validation.json", validation.founderVoice);
await writeImmutableArtifact(output, "repetition-validation.json", validation.repetition);
await writeImmutableArtifact(output, "concept-ownership-validation.json", validation.conceptOwnership);
await writeImmutableArtifact(output, "editorial-quality-review.json", editorial);
await writeImmutableArtifact(output, "semantic-page.json", bound.revision.page);
await writeImmutableArtifact(output, "semantic-page.md", renderEditorialDraftMarkdown(bound.revision.page, allowlists));
await writeImmutableArtifact(output, "run-metadata.json", { schema_version: "1.0.0", artifact_type: "deterministic_revision_acceptance_metadata", source_call: call3, immediate_source_hash: immediateSourceHash, rejected_candidate_hash: rejectedCandidateHash, corrected_semantic_page_hash: correctedHash, ai_calls: 0, dataforseo_calls: 0, search_console_calls: 0, wordpress_writes: 0, writer_executions: 0, recovery_executions: 0, publication_attempts: 0, accepted_for_human_review: true });
console.log(JSON.stringify({ status: "PASS", corrected_semantic_page_hash: correctedHash, customer_facing_content_changed: false, output }, null, 2));
