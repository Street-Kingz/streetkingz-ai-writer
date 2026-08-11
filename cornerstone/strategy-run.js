import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256, stableId } from "../research/core/canonical.js";
import { calculateConfiguredCost, configuredModelPricing } from "../interpretation/cost.js";
import { invokeControlledCall, writeImmutableArtifact } from "../interpretation/call-control.js";
import { buildCornerstoneStrategyInput, buildCornerstoneStrategyPrompt, CORNERSTONE_STRATEGY_SYSTEM_PROMPT } from "./strategy-prompt.js";
import { CORNERSTONE_STRATEGY_PROMPT_VERSION, cornerstoneStrategyJsonSchema } from "./strategy-contracts.js";
import { validateCornerstoneStrategy } from "./strategy-validation.js";
import { renderCornerstoneStrategyMarkdown } from "./strategy-render.js";
import { resolveStrategyEntities } from "./strategy-allowlists.js";
import { reviewCornerstoneStrategyQuality } from "./strategy-quality.js";

export async function runControlledCornerstoneStrategy({ packet, brandRules, productFacts, provider, outputDirectory, env = process.env, now = () => new Date(), maxCalls = 1 }) {
  const input = buildCornerstoneStrategyInput({ packet, brandRules, productFacts });
  const userPrompt = buildCornerstoneStrategyPrompt(input);
  const responseSchema = cornerstoneStrategyJsonSchema(input.entity_allowlists);
  const startedAt = now().toISOString();
  await mkdir(path.resolve(outputDirectory), { recursive: true });
  const controlled = await invokeControlledCall({ benchmarkDirectory: path.resolve(outputDirectory), modelLabel: provider.model, maxCalls, retries: 0, invoke: async ({ signal, callDirectory }) => {
    const request = provider.requestPayload({ systemPrompt: CORNERSTONE_STRATEGY_SYSTEM_PROMPT, userPrompt, responseSchema, temperature: 0.1 });
    await writeImmutableArtifact(callDirectory, "strategy-input.json", { ...input, model_configuration: { provider: provider.id, model: provider.model, settings: provider.settings }, request, generated_at: startedAt });
    const response = await provider.generate({ systemPrompt: CORNERSTONE_STRATEGY_SYSTEM_PROMPT, userPrompt, responseSchema, signal });
    await writeImmutableArtifact(callDirectory, "strategy-response-raw.json", { schema_version: "1.0.0", artifact_type: "raw_cornerstone_strategy_response", provider: response.provider, model: response.model, response_id: response.response_id, raw_text: response.rawText });
    let parsed = null; let parseError = null;
    try { parsed = JSON.parse(response.rawText); } catch (error) { parseError = error; }
    const validation = parseError ? { status: "FAIL", errors: [{ code: "MALFORMED_JSON", path: "$", message: parseError.message }], warnings: [] } : validateCornerstoneStrategy(parsed, input);
    const validationArtifact = { schema_version: "1.0.0", artifact_type: "cornerstone_strategy_validation", packet_id: packet.packet_id, status: validation.status, downstream_eligible: validation.status !== "FAIL", ...validation };
    await writeImmutableArtifact(callDirectory, "strategy-validation.json", validationArtifact);
    const usage = response.usage || {};
    const inputTokens = usage.prompt_tokens ?? usage.input_tokens ?? null;
    const outputTokens = usage.completion_tokens ?? usage.output_tokens ?? null;
    const pricing = configuredModelPricing(env, response.model || provider.model);
    const cost = calculateConfiguredCost({ inputTokens, outputTokens, pricing });
    const metadata = { schema_version: "1.0.0", artifact_type: "cornerstone_strategy_run_metadata", status: validation.status, calls: 1, retries: 0, provider: response.provider, model: response.model, prompt_version: CORNERSTONE_STRATEGY_PROMPT_VERSION, input_hash: input.input_sha256, system_prompt_sha256: sha256(CORNERSTONE_STRATEGY_SYSTEM_PROMPT), started_at: startedAt, completed_at: now().toISOString(), usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: usage.total_tokens ?? (Number.isFinite(inputTokens) && Number.isFinite(outputTokens) ? inputTokens + outputTokens : null) }, ...cost };
    await writeImmutableArtifact(callDirectory, "run-metadata.json", metadata);
    if (validation.status === "FAIL") return { accepted: false, validation: validationArtifact, metadata, callDirectory };
    const resolved = resolveStrategyEntities(parsed, input.entity_allowlists);
    const strategy = { ...resolved, artifact_type: "validated_cornerstone_strategy", strategy_id: stableId("cornerstone_strategy", { packet_id: packet.packet_id, output: parsed, prompt_version: CORNERSTONE_STRATEGY_PROMPT_VERSION }), validation_status: validation.status, human_review_state: "awaiting_human_review", drafting_authorised: false, publication_authorised: false };
    await writeImmutableArtifact(callDirectory, "strategy.json", strategy);
    await writeImmutableArtifact(callDirectory, "cornerstone-strategy.md", renderCornerstoneStrategyMarkdown(strategy));
    const qualityReview = reviewCornerstoneStrategyQuality(strategy, validationArtifact);
    await writeImmutableArtifact(callDirectory, "strategy-quality-review.json", qualityReview);
    return { accepted: true, strategy, validation: validationArtifact, qualityReview, metadata, callDirectory };
  }});
  return { ...controlled.result, lifecycle: controlled.lifecycle };
}
