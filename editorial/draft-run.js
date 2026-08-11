import { mkdir } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { calculateConfiguredCost, configuredModelPricing } from "../interpretation/cost.js";
import { invokeControlledCall, writeImmutableArtifact } from "../interpretation/call-control.js";
import { editorialPageJsonSchema } from "./contracts.js";
import { buildEditorialDraftInput, buildEditorialDraftPrompt, EDITORIAL_DRAFT_PROMPT_VERSION, EDITORIAL_DRAFT_SYSTEM_PROMPT } from "./draft-prompt.js";
import { validateStructuredEditorialPage } from "./validation.js";
import { reviewEditorialDraftQuality } from "./draft-quality.js";
import { renderEditorialDraftMarkdown } from "./draft-render.js";

export async function runControlledEditorialDraft({ packet, strategy, plan, approval, allowlists, brandRules, provider, outputDirectory, env = process.env, now = () => new Date(), maxCalls = 1 }) {
  if (approval?.status !== "APPROVED" || approval?.plan_id !== plan.plan_id || approval?.plan_hash !== plan.deterministic_content_sha256) throw new Error("Exact human page-plan approval is required.");
  if (approval?.semantic_drafting !== true || approval?.wordpress_publication !== false || approval?.wordpress_mutation !== false) throw new Error("Approval authority is invalid.");
  const input = buildEditorialDraftInput({ packet, strategy, plan, approval, allowlists, brandRules });
  const userPrompt = buildEditorialDraftPrompt(input);
  const responseSchema = editorialPageJsonSchema(allowlists, plan);
  const startedAt = now().toISOString();
  await mkdir(path.resolve(outputDirectory), { recursive: true });
  const controlled = await invokeControlledCall({ benchmarkDirectory: path.resolve(outputDirectory), modelLabel: provider.model, maxCalls, retries: 0, invoke: async ({ signal, callDirectory }) => {
    const request = provider.requestPayload({ systemPrompt: EDITORIAL_DRAFT_SYSTEM_PROMPT, userPrompt, responseSchema });
    await writeImmutableArtifact(callDirectory, "draft-input.json", { ...input, model_configuration: { provider: provider.id, model: provider.model, settings: provider.settings }, request, generated_at: startedAt });
    const response = await provider.generate({ systemPrompt: EDITORIAL_DRAFT_SYSTEM_PROMPT, userPrompt, responseSchema, signal });
    await writeImmutableArtifact(callDirectory, "draft-response-raw.json", { schema_version: "1.0.0", artifact_type: "raw_editorial_draft_response", provider: response.provider, model: response.model, response_id: response.response_id, raw_text: response.rawText });
    let parsed = null; let parseError = null;
    try { parsed = JSON.parse(response.rawText); } catch (error) { parseError = error; }
    const pageHash = parsed ? sha256(parsed) : null;
    const errors = parseError ? [{ code: "MALFORMED_JSON", path: "$", message: parseError.message }] : validateStructuredEditorialPage(parsed, { plan, allowlists });
    const validation = { schema_version: "1.0.0", artifact_type: "editorial_draft_validation", status: errors.length ? "FAIL" : "PASS", downstream_eligible: errors.length === 0, errors, warnings: [] };
    await writeImmutableArtifact(callDirectory, "draft-validation.json", validation);
    const usage = response.usage || {};
    const inputTokens = usage.prompt_tokens ?? usage.input_tokens ?? null;
    const outputTokens = usage.completion_tokens ?? usage.output_tokens ?? null;
    const cost = calculateConfiguredCost({ inputTokens, outputTokens, pricing: configuredModelPricing(env, response.model || provider.model) });
    const metadata = { schema_version: "1.0.0", artifact_type: "editorial_draft_run_metadata", calls: 1, retries: 0, status: validation.status, provider: response.provider, model: response.model, prompt_version: EDITORIAL_DRAFT_PROMPT_VERSION, input_hash: input.input_sha256, semantic_page_sha256: pageHash, system_prompt_sha256: sha256(EDITORIAL_DRAFT_SYSTEM_PROMPT), started_at: startedAt, completed_at: now().toISOString(), usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: usage.total_tokens ?? (Number.isFinite(inputTokens) && Number.isFinite(outputTokens) ? inputTokens + outputTokens : null) }, ...cost, wordpress_writes: 0, publication_attempts: 0 };
    await writeImmutableArtifact(callDirectory, "run-metadata.json", metadata);
    if (errors.length) return { accepted: false, page: null, validation, qualityReview: null, metadata, callDirectory };
    const qualityReview = reviewEditorialDraftQuality(parsed);
    await writeImmutableArtifact(callDirectory, "editorial-quality-review.json", qualityReview);
    if (!qualityReview.accepted_for_human_review) return { accepted: false, page: null, validation, qualityReview, metadata: { ...metadata, status: "FAIL_EDITORIAL_REVIEW" }, callDirectory };
    const page = parsed;
    await writeImmutableArtifact(callDirectory, "semantic-page.json", page);
    await writeImmutableArtifact(callDirectory, "semantic-page.md", renderEditorialDraftMarkdown(page, allowlists));
    return { accepted: true, page, pageHash, validation, qualityReview, metadata, callDirectory };
  }});
  return { ...controlled.result, lifecycle: controlled.lifecycle };
}
