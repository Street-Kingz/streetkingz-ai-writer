import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { deriveCornerstoneStrategyAllowlists } from "../cornerstone/strategy-allowlists.js";
import { buildEditorialPagePlan } from "../editorial/plan.js";
import { validateEditorialPagePlan } from "../editorial/validation.js";
import { createOpenAIEditorialDraftProvider } from "../editorial/draft-provider.js";
import { runControlledEditorialDraft } from "../editorial/draft-run.js";

const packetPath = path.resolve("artifacts/cornerstone/best-car-drying-towel/fixture-v1/research-packet.json");
const strategyPath = path.resolve("artifacts/cornerstone/best-car-drying-towel/strategy-v1/gpt-5.6-sol/call_002/strategy.json");
const outputDirectory = path.resolve(process.env.CORNERSTONE_DRAFT_OUTPUT || "artifacts/cornerstone/best-car-drying-towel/component-draft-v1");
const [packet, strategy] = await Promise.all([readFile(packetPath, "utf8").then(JSON.parse), readFile(strategyPath, "utf8").then(JSON.parse)]);
const allowlists = deriveCornerstoneStrategyAllowlists(packet);
const plan = buildEditorialPagePlan({ packet, strategy });
const planErrors = validateEditorialPagePlan(plan, allowlists);
if (planErrors.length) throw new Error(`Approved page plan failed validation: ${JSON.stringify(planErrors)}`);
const approval = {
  schema_version: "1.0.0", artifact_type: "human_component_page_plan_approval", status: "APPROVED",
  plan_id: plan.plan_id, plan_hash: plan.deterministic_content_sha256,
  approved_component_sequence: plan.component_sequence,
  semantic_drafting: true, add_components: false, alter_sequence: false,
  wordpress_mutation: false, wordpress_publication: false,
  approval_text_sha256: sha256("The proposed Choosing the best car drying towel component page plan is APPROVED for controlled drafting."),
  recorded_at: new Date().toISOString()
};
const brandRules = {
  audience: "Normal car owners who want a clean car without turning detailing into a hobby.",
  qualities: ["useful", "straightforward", "knowledgeable", "commercially aware without being sales-heavy", "easy to scan"],
  avoid: ["generic AI introductions", "in this comprehensive guide", "keyword stuffing", "word-count padding", "repetitive summaries", "fake testing", "invented expertise", "unsupported performance or competitor claims", "unnecessary jargon", "GSM as sole proof of quality", "forced product promotion"],
  commercial_principle: "Help the reader understand the decision before presenting a packet-backed product that genuinely fits a relevant use case."
};
await mkdir(outputDirectory, { recursive: false });
await Promise.all([
  writeFile(path.join(outputDirectory, "approved-page-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, { flag: "wx" }),
  writeFile(path.join(outputDirectory, "human-page-plan-approval.json"), `${JSON.stringify(approval, null, 2)}\n`, { flag: "wx" })
]);
const provider = createOpenAIEditorialDraftProvider();
const result = await runControlledEditorialDraft({ packet, strategy, plan, approval, allowlists, brandRules, provider, outputDirectory, maxCalls: 1 });
console.log(JSON.stringify({ accepted: result.accepted, validation: result.validation.status, editorial_review: result.qualityReview?.status || null, semantic_page_sha256: result.pageHash || null, model: result.metadata.model, calls: result.metadata.calls, retries: result.metadata.retries, output_directory: result.callDirectory }, null, 2));
if (!result.accepted) process.exitCode = 1;
