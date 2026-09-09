export const DEFAULT_INTERPRETATION_MAX_COMPLETION_TOKENS = 8_000;
export const MAX_INTERPRETATION_BATCHES = 5;
export const MAX_INTERPRETATION_DEADLINE_MS = 180_000;

export function interpretationLimits(env = process.env) {
  const raw = env.OPENAI_INTERPRETATION_MAX_COMPLETION_TOKENS;
  const maxCompletionTokens = raw === undefined || raw === "" ? DEFAULT_INTERPRETATION_MAX_COMPLETION_TOKENS : Number(raw);
  if (!Number.isInteger(maxCompletionTokens) || maxCompletionTokens < 1 || maxCompletionTokens > DEFAULT_INTERPRETATION_MAX_COMPLETION_TOKENS) throw new Error("OPENAI_INTERPRETATION_MAX_COMPLETION_TOKENS must be an integer from 1 through 8000.");
  return Object.freeze({ maxCompletionTokens, maxOutputTokens: maxCompletionTokens * MAX_INTERPRETATION_BATCHES, deadlineMs: MAX_INTERPRETATION_DEADLINE_MS });
}
