export const DEFAULT_INTERPRETATION_MODEL = "gpt-4o-mini";

export function supportsStrictStructuredOutputs(model) {
  return /^(?:gpt-4o|gpt-4\.1|gpt-5)/.test(model);
}

export function buildOpenAIInterpretationRequest({ model, systemPrompt, userPrompt, responseSchema, schemaName = "product_page_interpretation", temperature = 0.1, maxOutputTokens }) {
  const strictStructuredOutput = supportsStrictStructuredOutputs(model);
  if (strictStructuredOutput && !responseSchema) throw new Error("A JSON Schema is required for strict Structured Outputs.");
  const request = {
    model,
    temperature,
    response_format: strictStructuredOutput ? { type: "json_schema", json_schema: { name: schemaName, strict: true, schema: responseSchema } } : { type: "json_object" },
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]
  };
  if (maxOutputTokens !== undefined) request.max_completion_tokens = Math.min(Number(maxOutputTokens), 4000);
  return request;
}

export function createOpenAIInterpretationProvider({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for controlled interpretation validation.");
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  const model = env.OPENAI_INTERPRETATION_MODEL || env.OPENAI_MODEL || DEFAULT_INTERPRETATION_MODEL;
  const strictStructuredOutput = supportsStrictStructuredOutputs(model);
  return {
    id: "openai",
    model,
    settings: { temperature: 0.1, api: "chat.completions", response_format: strictStructuredOutput ? "json_schema" : "json_object", strict_structured_output: strictStructuredOutput },
    requestPayload({ systemPrompt, userPrompt, responseSchema, schemaName, temperature = 0.1, maxOutputTokens }) { return buildOpenAIInterpretationRequest({ model, systemPrompt, userPrompt, responseSchema, schemaName, temperature, maxOutputTokens }); },
    async generate({ systemPrompt, userPrompt, responseSchema, schemaName, maxOutputTokens, signal }) {
      const requestBody = buildOpenAIInterpretationRequest({ model, systemPrompt, userPrompt, responseSchema, schemaName, maxOutputTokens });
      const response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(requestBody), signal
      });
      const rawHttpBody = await response.text();
      let envelope;
      try { envelope = JSON.parse(rawHttpBody); } catch { envelope = null; }
      if (!response.ok) {
        const error = new Error(`OpenAI interpretation request failed with HTTP ${response.status}.`);
        error.status = response.status;
        error.provider = "openai";
        throw error;
      }
      const choice = envelope?.choices?.[0]; const finishReason = choice?.finish_reason; const refusal = choice?.message?.refusal;
      if (refusal) { const error = new Error("PROVIDER_REFUSAL"); error.code = "PROVIDER_REFUSAL"; throw error; }
      if (finishReason === "length") { const error = new Error("PROVIDER_LENGTH"); error.code = "PROVIDER_LENGTH"; throw error; }
      if (finishReason === "content_filter") { const error = new Error("PROVIDER_CONTENT_FILTER"); error.code = "PROVIDER_CONTENT_FILTER"; throw error; }
      const rawText = choice?.message?.content;
      if (typeof rawText !== "string" || !rawText.trim()) throw new Error("PROVIDER_EMPTY_CONTENT");
      return {
        provider: "openai",
        model: envelope?.model || model,
        settings: { temperature: 0.1, api: "chat.completions", response_format: requestBody.response_format.type, strict_structured_output: strictStructuredOutput },
        rawText,
        response_id: envelope?.id || null,
        usage: envelope?.usage || null
      };
    }
  };
}
