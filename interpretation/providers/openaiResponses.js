export function buildOpenAIResponsesRequest({ model, systemPrompt, userPrompt, responseSchema, reasoningEffort = "medium" }) {
  if (!responseSchema) throw new Error("A JSON Schema is required for strict Responses API output.");
  return {
    model,
    reasoning: { effort: reasoningEffort },
    text: { format: { type: "json_schema", name: "product_page_interpretation", strict: true, schema: responseSchema } },
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  };
}

const responseText = (envelope) => envelope?.output_text || envelope?.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;

export function createOpenAIResponsesInterpretationProvider({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for controlled interpretation validation.");
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  const model = env.OPENAI_INTERPRETATION_MODEL || env.OPENAI_MODEL;
  if (!model) throw new Error("OPENAI_INTERPRETATION_MODEL is required for the Responses API provider.");
  const reasoningEffort = env.OPENAI_INTERPRETATION_REASONING_EFFORT || "medium";
  return {
    id: "openai-responses",
    model,
    settings: { reasoning: { effort: reasoningEffort }, api: "responses", response_format: "json_schema", strict_structured_output: true },
    requestPayload({ systemPrompt, userPrompt, responseSchema }) { return buildOpenAIResponsesRequest({ model, systemPrompt, userPrompt, responseSchema, reasoningEffort }); },
    async generate({ systemPrompt, userPrompt, responseSchema }) {
      const requestBody = buildOpenAIResponsesRequest({ model, systemPrompt, userPrompt, responseSchema, reasoningEffort });
      const response = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(requestBody)
      });
      const rawHttpBody = await response.text();
      let envelope;
      try { envelope = JSON.parse(rawHttpBody); } catch { envelope = null; }
      if (!response.ok) {
        const error = new Error(`OpenAI Responses interpretation request failed with HTTP ${response.status}.`);
        error.status = response.status;
        error.provider = "openai-responses";
        error.provider_error = envelope?.error || null;
        throw error;
      }
      const rawText = responseText(envelope);
      if (typeof rawText !== "string" || !rawText.trim()) throw new Error("OpenAI Responses returned no interpretation content.");
      const usage = envelope?.usage || null;
      const reasoningTokens = usage?.output_tokens_details?.reasoning_tokens ?? usage?.reasoning_tokens ?? null;
      return {
        provider: "openai-responses",
        model: envelope?.model || model,
        settings: { reasoning: { effort: reasoningEffort }, api: "responses", response_format: "json_schema", strict_structured_output: true },
        rawText,
        response_id: envelope?.id || null,
        usage: usage ? { ...usage, prompt_tokens: usage.input_tokens ?? usage.prompt_tokens, completion_tokens: usage.output_tokens ?? usage.completion_tokens, ...(reasoningTokens === null ? {} : { reasoning_tokens: reasoningTokens }) } : null,
        reasoning_tokens: reasoningTokens
      };
    }
  };
}
