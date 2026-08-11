import { mkdir } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { calculateConfiguredCost, configuredModelPricing } from "../interpretation/cost.js";
import { invokeControlledCall, writeImmutableArtifact } from "../interpretation/call-control.js";
import { editorialRevisionJsonSchema } from "../editorial/revision-contracts.js";
import { renderEditorialDraftMarkdown } from "../editorial/draft-render.js";
import { buildVoiceTransformationPrompt, VOICE_TRANSFORMATION_PROMPT_VERSION, VOICE_TRANSFORMATION_SYSTEM_PROMPT } from "./transformation-prompt.js";
import { validateGeneratedVoiceTransformation, reviewVoiceTransformationQuality } from "./transformation-validation.js";
import { applyDeterministicVoiceTransformationLocks } from "./transformation.js";

export async function runControlledVoiceTransformation({ input, plan, conceptPolicy, allowlists, provider, outputDirectory, maxCalls = 1, env = process.env, now = () => new Date() }) {
  const userPrompt = buildVoiceTransformationPrompt(input);
  const responseSchema = editorialRevisionJsonSchema({ plan, allowlists, sourcePageHash: input.source.semantic_page_sha256, founderFactIds: [], modelOutput: true });
  await mkdir(path.resolve(outputDirectory), { recursive: true });
  const controlled = await invokeControlledCall({ benchmarkDirectory: path.resolve(outputDirectory), modelLabel: provider.model, maxCalls, retries: 0, invoke: async ({ signal, callDirectory }) => {
    const startedAt = now().toISOString(); const request = provider.requestPayload({ systemPrompt: VOICE_TRANSFORMATION_SYSTEM_PROMPT, userPrompt, responseSchema });
    await writeImmutableArtifact(callDirectory, "transformation-input.json", { ...input, prompt_version: VOICE_TRANSFORMATION_PROMPT_VERSION, model_configuration: { provider: provider.id, model: provider.model, settings: provider.settings }, request });
    let response;
    try { response = await provider.generate({ systemPrompt: VOICE_TRANSFORMATION_SYSTEM_PROMPT, userPrompt, responseSchema, signal }); }
    catch (error) { await writeImmutableArtifact(callDirectory, "provider-failure.json", { code: error.code || "AI_PROVIDER_FAILURE", status: error.status || null, message: error.message }); throw error; }
    await writeImmutableArtifact(callDirectory, "transformation-response-raw.json", { schema_version: "1.0.0", artifact_type: "raw_voice_transformation_response", provider: response.provider, model: response.model, response_id: response.response_id, raw_text: response.rawText });
    let revision; try { revision = JSON.parse(response.rawText); } catch (error) { const validation = { status: "FAIL", errors: [{ code: "MALFORMED_JSON", path: "$", message: error.message }] }; await writeImmutableArtifact(callDirectory, "transformation-validation.json", validation); return { accepted: false, validation, qualityReview: null, page: null, pageHash: null, callDirectory, response }; }
    const locked = applyDeterministicVoiceTransformationLocks(revision, input.source.semantic_page, input.source.semantic_page_sha256);
    revision = locked.revision;
    const validation = validateGeneratedVoiceTransformation(revision, { input, plan, conceptPolicy, allowlists });
    validation.locked_fields = {
      model_attempts_ignored: locked.attempts,
      model_controlled_media: false,
      exact_source_media_reapplied: !locked.error,
      error: locked.error
    };
    if (locked.error) validation.errors.push(locked.error);
    validation.status = validation.errors.length ? "FAIL" : "PASS";
    await writeImmutableArtifact(callDirectory, "transformation-validation.json", validation);
    const qualityReview = reviewVoiceTransformationQuality(revision, validation);
    await writeImmutableArtifact(callDirectory, "editorial-quality-review.json", qualityReview);
    const usage = response.usage || {}; const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? null; const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? null;
    const cost = calculateConfiguredCost({ inputTokens, outputTokens, pricing: configuredModelPricing(env, response.model || provider.model) });
    const pageHash = sha256(revision.page);
    const metadata = { schema_version: "1.0.0", artifact_type: "voice_transformation_run", calls: 1, retries: 0, provider: response.provider, model: response.model, status: validation.status === "PASS" && qualityReview.accepted_for_human_review ? "PASS" : "FAIL", source_semantic_page_sha256: input.source.semantic_page_sha256, voice_profile_sha256: input.voice.profile_sha256, semantic_page_sha256: pageHash, input_sha256: sha256(input), started_at: startedAt, completed_at: now().toISOString(), usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: usage.total_tokens ?? (Number.isFinite(inputTokens) && Number.isFinite(outputTokens) ? inputTokens + outputTokens : null) }, ...cost, wordpress_writes: 0, writer_executions: 0, publication_attempts: 0 };
    await writeImmutableArtifact(callDirectory, "run-metadata.json", metadata);
    const accepted = validation.status === "PASS" && qualityReview.accepted_for_human_review;
    if (accepted) { await writeImmutableArtifact(callDirectory, "semantic-page.json", revision.page); await writeImmutableArtifact(callDirectory, "semantic-page.md", renderEditorialDraftMarkdown(revision.page, allowlists)); }
    return { accepted, validation, qualityReview, page: accepted ? revision.page : null, pageHash: accepted ? pageHash : null, callDirectory, metadata, revision };
  }});
  return { ...controlled.result, lifecycle: controlled.lifecycle };
}
