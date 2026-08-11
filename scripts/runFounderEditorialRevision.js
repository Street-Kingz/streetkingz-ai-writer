import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { deriveCornerstoneStrategyAllowlists } from "../cornerstone/strategy-allowlists.js";
import { createOpenAIEditorialDraftProvider } from "../editorial/draft-provider.js";
import { runControlledFounderRevision } from "../editorial/revision-run.js";
import { buildDryingTowelConceptPolicy } from "../editorial/concept-ownership.js";

const root = path.resolve("artifacts/cornerstone/best-car-drying-towel");
const sourceDirectory = path.join(root, "component-revision-v1/gpt-5.6-sol/call_002");
const outputDirectory = path.resolve(process.env.CORNERSTONE_REVISION_OUTPUT || path.join(root, "component-revision-v1"));
const [sourceWrapper, packet, strategy, plan] = await Promise.all([
  readFile(path.join(sourceDirectory, "revision-response-raw.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "fixture-v1/research-packet.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "strategy-v1/gpt-5.6-sol/call_002/strategy.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "component-draft-v1/approved-page-plan.json"), "utf8").then(JSON.parse)
]);
const sourcePage = JSON.parse(sourceWrapper.raw_text).page;
const sourcePageHash = sha256(sourcePage);
if (sourcePageHash !== "e396ef51898d5b8a8be4d088471242ae46695ef6cfc730befeca9fd5f007d37e") throw new Error("Latest deterministic-PASS candidate hash mismatch.");
const allowlists = deriveCornerstoneStrategyAllowlists(packet);
const conceptPolicy = buildDryingTowelConceptPolicy(plan);
const provider = createOpenAIEditorialDraftProvider();
// call_001 and call_002 are immutable historical evidence. This separately
// authorised run may allocate exactly call_003 and must never retry it.
const result = await runControlledFounderRevision({ sourcePage, sourcePageHash, packet, strategy, plan, conceptPolicy, allowlists, founderFacts: [], provider, outputDirectory, maxCalls: 3 });
console.log(JSON.stringify({ accepted: result.accepted, validation: result.validation.status, founder_voice: result.validation.founderVoice?.status || null, editorial_review: result.qualityReview?.status || null, semantic_page_sha256: result.pageHash || null, model: result.metadata.model, calls: result.metadata.calls, retries: result.metadata.retries, usage: result.metadata.usage, cost_status: result.metadata.cost_status, cost_usd: result.metadata.cost_usd, comparison: result.revision?.comparison_component_decision?.decision || null, founder_note: result.revision?.founder_note_decision?.decision || null, output_directory: result.callDirectory }, null, 2));
if (!result.accepted) process.exitCode = 1;
