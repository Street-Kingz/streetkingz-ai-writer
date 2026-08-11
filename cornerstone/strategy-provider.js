import { buildOpenAIInterpretationRequest, supportsStrictStructuredOutputs } from "../interpretation/providers/openai.js";

export const DEFAULT_CORNERSTONE_STRATEGY_MODEL = "gpt-5.6-sol";

export function createOpenAICornerstoneStrategyProvider({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for the controlled strategy call.");
  const model = env.OPENAI_CORNERSTONE_STRATEGY_MODEL || env.OPENAI_INTERPRETATION_MODEL || DEFAULT_CORNERSTONE_STRATEGY_MODEL;
  if (!supportsStrictStructuredOutputs(model)) throw new Error(`Model ${model} does not support the required strict Structured Output path.`);
  const responsesApi = /^gpt-5\.6-sol/.test(model);
  const requestBody = ({ systemPrompt, userPrompt, responseSchema }) => responsesApi ? {
    model,
    reasoning: { effort: "high" },
    text: { format: { type: "json_schema", name: "cornerstone_strategy", strict: true, schema: responseSchema } },
    input: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]
  } : buildOpenAIInterpretationRequest({ model, systemPrompt, userPrompt, responseSchema, temperature: 0.1 });
  return {
    id: "openai", model,
    settings: { api: responsesApi ? "responses" : "chat.completions", temperature: responsesApi ? null : 0.1, reasoning: responsesApi ? { effort: "high" } : null, response_format: "json_schema", strict_structured_output: true },
    requestPayload(args) { return requestBody(args); },
    async generate({ systemPrompt, userPrompt, responseSchema, signal }) {
      const body = requestBody({ systemPrompt, userPrompt, responseSchema });
      const response = await fetchImpl(`https://api.openai.com/v1/${responsesApi ? "responses" : "chat/completions"}`, { method: "POST", signal, headers: { "content-type": "application/json", authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: JSON.stringify(body) });
      const rawHttp = await response.text();
      let envelope; try { envelope = JSON.parse(rawHttp); } catch { envelope = null; }
      if (!response.ok) throw Object.assign(new Error(`OpenAI strategy request failed with HTTP ${response.status}.`), { code: "AI_PROVIDER_FAILURE", status: response.status });
      const rawText = responsesApi ? (envelope?.output_text || envelope?.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text) : envelope?.choices?.[0]?.message?.content;
      if (typeof rawText !== "string" || !rawText.trim()) throw Object.assign(new Error("OpenAI returned no strategy content."), { code: "AI_EMPTY_RESPONSE" });
      return { provider: "openai", model: envelope?.model || model, response_id: envelope?.id || null, rawText, usage: envelope?.usage || null, settings: this.settings };
    }
  };
}
