import test from "node:test";
import assert from "node:assert/strict";
import { buildOpenAIInterpretationRequest, createOpenAIInterpretationProvider } from "../interpretation/providers/openai.js";
import { conservativeProviderRequestCostBound } from "../interpretation/cost.js";
import { MAX_CALL_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS } from "../product-kernel/candidateEvaluation.js";

test("the product sends the governed 8,000-token outbound allowance", () => {
  const request = buildOpenAIInterpretationRequest({ model: "gpt-5.6-sol", reasoningEffort: "medium", systemPrompt: "s", userPrompt: "u", responseSchema: {}, maxOutputTokens: MAX_CALL_OUTPUT_TOKENS });
  assert.equal(MAX_CALL_OUTPUT_TOKENS, 8000);
  assert.equal(MAX_OUTPUT_TOKENS, 40000);
  assert.equal(request.max_completion_tokens, 8000);
  assert.equal(buildOpenAIInterpretationRequest({ model: "gpt-5.6-sol", reasoningEffort: "medium", systemPrompt: "s", userPrompt: "u", responseSchema: {}, maxOutputTokens: 8001 }).max_completion_tokens, 8000);
});

test("length-limited provider output is rejected with usage preserved", async () => {
  const provider = createOpenAIInterpretationProvider({ env: { OPENAI_API_KEY: "test", OPENAI_INTERPRETATION_MODEL: "gpt-5.6-sol", OPENAI_INTERPRETATION_REASONING_EFFORT: "medium" }, fetchImpl: async (_url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.max_completion_tokens, 8000);
    return new Response(JSON.stringify({ id: "resp-length", model: "gpt-5.6-sol", choices: [{ finish_reason: "length", message: { content: "partial" } }], usage: { prompt_tokens: 6290, completion_tokens: 4000 } }), { status: 200, headers: { "content-type": "application/json" } });
  } });
  await assert.rejects(() => provider.generate({ systemPrompt: "s", userPrompt: "u", responseSchema: {}, schemaName: "x", maxOutputTokens: 8000 }), error => { assert.equal(error.code, "PROVIDER_LENGTH"); assert.equal(error.providerMetadata.usage.completion_tokens, 4000); return true; });
});

test("conservative cost accounting does not re-clamp the 8,000-token allowance", () => {
  const bound = conservativeProviderRequestCostBound({ requestPayload: { messages: [] }, pricing: { input_per_million_tokens_usd: 4, output_per_million_tokens_usd: 20 }, maxOutputTokens: 8000 });
  assert.equal(bound.max_output_token_bound, 8000);
  assert.equal(bound.maximum_request_cost_usd, 0.16006);
});
