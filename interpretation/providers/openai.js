export const DEFAULT_INTERPRETATION_MODEL = "gpt-4o-mini";
const SOL_MODEL = "gpt-5.6-sol";
const REASONING_EFFORTS = new Set(["none", "low", "medium", "high", "xhigh", "max"]);

export function supportsStrictStructuredOutputs(model) {
  return /^(?:gpt-4o|gpt-4\.1|gpt-5)/.test(model);
}

export function interpretationModelProfile(model, env = {}) {
  const configuredReasoningEffort = env.OPENAI_INTERPRETATION_REASONING_EFFORT;
  if (model === SOL_MODEL) {
    if (!REASONING_EFFORTS.has(configuredReasoningEffort)) throw new Error("OPENAI_INTERPRETATION_REASONING_EFFORT must be one of none, low, medium, high, xhigh, or max for gpt-5.6-sol.");
    return { model, api: "chat.completions", response_format: "json_schema", strict_structured_output: true, reasoning_effort: configuredReasoningEffort };
  }
  if (configuredReasoningEffort !== undefined && configuredReasoningEffort !== "") throw new Error(`OPENAI_INTERPRETATION_REASONING_EFFORT is incompatible with ${model}.`);
  return { model, api: "chat.completions", response_format: supportsStrictStructuredOutputs(model) ? "json_schema" : "json_object", strict_structured_output: supportsStrictStructuredOutputs(model), temperature: 0.1 };
}

export function buildOpenAIInterpretationRequest({ model, systemPrompt, userPrompt, responseSchema, schemaName = "product_page_interpretation", temperature = 0.1, reasoningEffort, maxOutputTokens }) {
  const profile = interpretationModelProfile(model, { OPENAI_INTERPRETATION_REASONING_EFFORT: reasoningEffort });
  const strictStructuredOutput = supportsStrictStructuredOutputs(model);
  if (strictStructuredOutput && !responseSchema) throw new Error("A JSON Schema is required for strict Structured Outputs.");
  const request = {
    model,
    response_format: strictStructuredOutput ? { type: "json_schema", json_schema: { name: schemaName, strict: true, schema: responseSchema } } : { type: "json_object" },
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]
  };
  if (profile.reasoning_effort) request.reasoning_effort = profile.reasoning_effort;
  else if (profile.temperature !== undefined) request.temperature = temperature;
  if (maxOutputTokens !== undefined) request.max_completion_tokens = Math.min(Number(maxOutputTokens), 4000);
  return request;
}

export function createOpenAIInterpretationProvider({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for controlled interpretation validation.");
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  const model = env.OPENAI_INTERPRETATION_MODEL || env.OPENAI_MODEL || DEFAULT_INTERPRETATION_MODEL;
  const profile = interpretationModelProfile(model, env);
  const strictStructuredOutput = profile.strict_structured_output;
  return {
    id: "openai",
    model,
    settings: { ...profile },
    requestPayload({ systemPrompt, userPrompt, responseSchema, schemaName, temperature = 0.1, maxOutputTokens }) { return buildOpenAIInterpretationRequest({ model, systemPrompt, userPrompt, responseSchema, schemaName, temperature, reasoningEffort: profile.reasoning_effort, maxOutputTokens }); },
    async generate({ systemPrompt, userPrompt, responseSchema, schemaName, maxOutputTokens, signal }) {
      const requestBody = buildOpenAIInterpretationRequest({ model, systemPrompt, userPrompt, responseSchema, schemaName, reasoningEffort: profile.reasoning_effort, maxOutputTokens });
      if (signal?.aborted) { const error = new Error("PROVIDER_DEADLINE_EXPIRED"); error.code = error.message; error.provider = "openai"; throw error; }
      let response; try { response = await fetchImpl("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` }, body: JSON.stringify(requestBody), signal }); } catch (error) { const code = signal?.aborted ? "PROVIDER_DEADLINE_EXPIRED" : "PROVIDER_OUTCOME_UNKNOWN"; const classified = new Error(code); classified.code = code; classified.provider = "openai"; throw classified; }
      const rawHttpBody = await response.text();
      let envelope;
      try { envelope = JSON.parse(rawHttpBody); } catch { envelope = null; }
      const safeMetadata = { provider: "openai", model: envelope?.model || model, response_id: envelope?.id || null, usage: envelope?.usage || null, status: response.status };
      if (!response.ok) {
        const error = new Error(`OpenAI interpretation request failed with HTTP ${response.status}.`);
        error.status = response.status; error.provider = "openai"; error.providerMetadata = safeMetadata; error.code = response.status === 429 || response.status >= 500 ? "PROVIDER_TRANSIENT" : "PROVIDER_HTTP_ERROR";
        throw error;
      }
      const choice = envelope?.choices?.[0]; const finishReason = choice?.finish_reason; const refusal = choice?.message?.refusal;
      if (refusal) { const error = new Error("PROVIDER_REFUSAL"); error.code = "PROVIDER_REFUSAL"; error.providerMetadata = { ...safeMetadata, finish_reason: "refusal" }; throw error; }
      if (finishReason === "length") { const error = new Error("PROVIDER_LENGTH"); error.code = "PROVIDER_LENGTH"; error.providerMetadata = { ...safeMetadata, finish_reason: "length" }; throw error; }
      if (finishReason === "content_filter") { const error = new Error("PROVIDER_CONTENT_FILTER"); error.code = "PROVIDER_CONTENT_FILTER"; error.providerMetadata = { ...safeMetadata, finish_reason: "content_filter" }; throw error; }
      const rawText = choice?.message?.content;
      if (typeof rawText !== "string" || !rawText.trim()) { const error = new Error("PROVIDER_EMPTY_CONTENT"); error.code = "PROVIDER_EMPTY_CONTENT"; error.providerMetadata = safeMetadata; throw error; }
      const usage = envelope?.usage || null;
      const reasoningTokens = usage?.completion_tokens_details?.reasoning_tokens ?? usage?.reasoning_tokens ?? null;
      return {
        provider: "openai",
        model: envelope?.model || model,
        settings: { ...profile, response_format: requestBody.response_format.type },
        rawText,
        response_id: envelope?.id || null,
        usage,
        reasoning_tokens: reasoningTokens
      };
    }
  };
}
