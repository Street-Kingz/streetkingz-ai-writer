import { mkdir } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { calculateConfiguredCost, configuredModelPricing } from "../interpretation/cost.js";
import { invokeControlledCall, writeImmutableArtifact } from "../interpretation/call-control.js";
import { editorialRevisionJsonSchema } from "./revision-contracts.js";
import { buildFounderRevisionInput, buildFounderRevisionPrompt, FOUNDER_REVISION_PROMPT_VERSION, FOUNDER_REVISION_SYSTEM_PROMPT } from "./revision-prompt.js";
import { validateEditorialRevision } from "./revision-validation.js";
import { reviewFounderRevisionQuality } from "./revision-quality.js";
import { renderEditorialDraftMarkdown } from "./draft-render.js";

export async function runControlledFounderRevision({ sourcePage, sourcePageHash, packet, strategy, plan, conceptPolicy, allowlists, founderFacts = [], provider, outputDirectory, env = process.env, now = () => new Date(), maxCalls = 1 }) {
  if (sha256(sourcePage) !== sourcePageHash) throw new Error("Accepted semantic source hash mismatch.");
  const input = buildFounderRevisionInput({ sourcePage, sourcePageHash, packet, strategy, plan, conceptPolicy, allowlists, founderFacts });
  const userPrompt = buildFounderRevisionPrompt(input);
  const responseSchema = editorialRevisionJsonSchema({ plan, allowlists, sourcePageHash, founderFactIds: founderFacts.map((item) => item.founder_fact_id) });
  const startedAt = now().toISOString();
  await mkdir(path.resolve(outputDirectory), { recursive: true });
  const controlled = await invokeControlledCall({ benchmarkDirectory: path.resolve(outputDirectory), modelLabel: provider.model, maxCalls, retries: 0, invoke: async ({ signal, callDirectory }) => {
    const request = provider.requestPayload({ systemPrompt: FOUNDER_REVISION_SYSTEM_PROMPT, userPrompt, responseSchema });
    await writeImmutableArtifact(callDirectory, "revision-input.json", { ...input, model_configuration: { provider: provider.id, model: provider.model, settings: provider.settings }, request, generated_at: startedAt });
    const response = await provider.generate({ systemPrompt: FOUNDER_REVISION_SYSTEM_PROMPT, userPrompt, responseSchema, signal });
    await writeImmutableArtifact(callDirectory, "revision-response-raw.json", { schema_version: "1.0.0", artifact_type: "raw_founder_revision_response", provider: response.provider, model: response.model, response_id: response.response_id, raw_text: response.rawText });
    let revision = null; let parseError = null;
    try { revision = JSON.parse(response.rawText); } catch (error) { parseError = error; }
    const validation = parseError ? { status: "FAIL", errors: [{ code: "MALFORMED_JSON", path: "$", message: parseError.message }], warnings: [], founderVoice: null, repetition: null, conceptOwnership: null } : validateEditorialRevision(revision, { sourcePageHash, plan, conceptPolicy, allowlists, founderFactIds: founderFacts.map((item) => item.founder_fact_id) });
    const validationArtifact = { schema_version: "1.0.0", artifact_type: "founder_revision_validation", downstream_eligible: validation.status !== "FAIL", ...validation };
    await writeImmutableArtifact(callDirectory, "revision-validation.json", validationArtifact);
    if (validation.founderVoice) await writeImmutableArtifact(callDirectory, "founder-voice-validation.json", validation.founderVoice);
    if (validation.repetition) await writeImmutableArtifact(callDirectory, "repetition-validation.json", validation.repetition);
    if (validation.conceptOwnership) await writeImmutableArtifact(callDirectory, "concept-ownership-validation.json", validation.conceptOwnership);
    const usage = response.usage || {}; const inputTokens = usage.prompt_tokens ?? usage.input_tokens ?? null; const outputTokens = usage.completion_tokens ?? usage.output_tokens ?? null;
    const cost = calculateConfiguredCost({ inputTokens, outputTokens, pricing: configuredModelPricing(env, response.model || provider.model) });
    const pageHash = revision?.page ? sha256(revision.page) : null;
    const metadata = { schema_version: "1.0.0", artifact_type: "founder_revision_run_metadata", calls: 1, retries: 0, status: validation.status, provider: response.provider, model: response.model, prompt_version: FOUNDER_REVISION_PROMPT_VERSION, input_hash: input.input_sha256, source_semantic_page_sha256: sourcePageHash, semantic_page_sha256: pageHash, started_at: startedAt, completed_at: now().toISOString(), usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: usage.total_tokens ?? (Number.isFinite(inputTokens) && Number.isFinite(outputTokens) ? inputTokens + outputTokens : null) }, ...cost, wordpress_writes: 0, writer_executions: 0, recovery_executions: 0, publication_attempts: 0 };
    await writeImmutableArtifact(callDirectory, "run-metadata.json", metadata);
    if (validation.status === "FAIL") return { accepted: false, revision, page: null, pageHash: null, validation: validationArtifact, qualityReview: null, metadata, callDirectory };
    const qualityReview = reviewFounderRevisionQuality(revision, validationArtifact);
    await writeImmutableArtifact(callDirectory, "editorial-quality-review.json", qualityReview);
    await writeImmutableArtifact(callDirectory, "comparison-component-decision.json", revision.comparison_component_decision);
    if (!qualityReview.accepted_for_human_review) return { accepted: false, revision, page: null, pageHash: null, validation: validationArtifact, qualityReview, metadata: { ...metadata, status: "FAIL_EDITORIAL_REVIEW" }, callDirectory };
    await writeImmutableArtifact(callDirectory, "semantic-page.json", revision.page);
    await writeImmutableArtifact(callDirectory, "semantic-page.md", renderEditorialDraftMarkdown(revision.page, allowlists));
    return { accepted: true, revision, page: revision.page, pageHash, validation: validationArtifact, qualityReview, metadata, callDirectory };
  }});
  return { ...controlled.result, lifecycle: controlled.lifecycle };
}
