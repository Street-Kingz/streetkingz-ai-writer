import { readFile } from "node:fs/promises";
import path from "node:path";
import { deriveCornerstoneStrategyAllowlists } from "../cornerstone/strategy-allowlists.js";
import { createOpenAIEditorialDraftProvider } from "../editorial/draft-provider.js";
import { runControlledVoiceTransformation } from "../voice/transformation-run.js";

const root = path.resolve("artifacts/cornerstone/best-car-drying-towel");
const [input, plan] = await Promise.all([
  readFile(path.join(root, "voice-transformation-v1/preparation-003/transformation-input.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "component-draft-v1/approved-page-plan.json"), "utf8").then(JSON.parse)
]);
if (input.source.semantic_page_sha256 !== "77e9e3a92bf9216b0e4874cbcb9e3943cbfab273d569dec8ac3d65ea6af5753b") throw new Error("Authorised source semantic hash mismatch.");
if (input.voice.profile.profile_id !== "street-kingz-founder-v1" || input.voice.profile.profile_version !== "1.1.0" || input.voice.profile_sha256 !== "d208d7a3fa5fe56feec59b3ffffe2b807e855ff296fff9678e9b1218e9376d18") throw new Error("Authorised VoiceProfile binding mismatch.");
const allowlists = deriveCornerstoneStrategyAllowlists(input.strategy.research_packet);
const provider = createOpenAIEditorialDraftProvider({ env: { ...process.env, OPENAI_CORNERSTONE_DRAFT_MODEL: "gpt-5.6-sol" } });
if (provider.model !== "gpt-5.6-sol") throw new Error("Exactly GPT-5.6 Sol is required.");
const result = await runControlledVoiceTransformation({ input, plan, conceptPolicy: input.structure_lock.concept_policy, allowlists, provider, outputDirectory: path.join(root, "voice-transformation-v1"), maxCalls: 2, env: process.env });
console.log(JSON.stringify({ accepted: result.accepted, validation: result.validation.status, editorial_review: result.qualityReview?.status || null, semantic_page_sha256: result.pageHash, model: result.metadata?.model || provider.model, calls: result.metadata?.calls || 1, retries: 0, usage: result.metadata?.usage || null, cost_status: result.metadata?.cost_status || "unknown", cost_usd: result.metadata?.cost_usd ?? null, output_directory: result.callDirectory }, null, 2));
if (!result.accepted) process.exitCode = 1;
