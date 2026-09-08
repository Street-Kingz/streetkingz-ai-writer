export function configuredModelPricing(env, model) {
  const raw = env.OPENAI_INTERPRETATION_PRICING_JSON;
  if (!raw) return null;
  let table;
  try { table = JSON.parse(raw); } catch { throw new Error("OPENAI_INTERPRETATION_PRICING_JSON must be valid JSON."); }
  const pricing = table?.[model];
  if (!pricing) return null;
  for (const field of ["input_per_million_tokens_usd", "output_per_million_tokens_usd"]) if (!Number.isFinite(Number(pricing[field])) || Number(pricing[field]) < 0) throw new Error(`Configured pricing field ${field} must be a non-negative number.`);
  return { input_per_million_tokens_usd: Number(pricing.input_per_million_tokens_usd), output_per_million_tokens_usd: Number(pricing.output_per_million_tokens_usd), source: "explicit_environment_configuration" };
}

export function calculateConfiguredCost({ inputTokens, outputTokens, pricing }) {
  if (!pricing || !Number.isFinite(Number(inputTokens)) || !Number.isFinite(Number(outputTokens))) return { cost_usd: null, cost_status: "unknown" };
  const cost = Number(inputTokens) / 1_000_000 * pricing.input_per_million_tokens_usd + Number(outputTokens) / 1_000_000 * pricing.output_per_million_tokens_usd;
  return { cost_usd: Number(cost.toFixed(8)), cost_status: "calculated_from_explicit_configuration", pricing };
}

export function conservativeProviderRequestCostBound({ requestPayload, pricing, maxOutputTokens = 4000 }) {
  if (!requestPayload || typeof requestPayload !== "object") throw new Error("REQUEST_PAYLOAD_REQUIRED");
  const conservativeInputTokenBound = Buffer.byteLength(JSON.stringify(requestPayload), "utf8");
  const maxOutputTokenBound = Math.min(Number(maxOutputTokens), 4000);
  if (!Number.isFinite(maxOutputTokenBound) || maxOutputTokenBound < 0) throw new Error("INVALID_OUTPUT_TOKEN_BOUND");
  const cost = calculateConfiguredCost({ inputTokens: conservativeInputTokenBound, outputTokens: maxOutputTokenBound, pricing });
  return { conservative_input_token_bound: conservativeInputTokenBound, max_output_token_bound: maxOutputTokenBound, maximum_request_cost_usd: cost.cost_usd, cost_status: cost.cost_status };
}

export function assertAcceptanceCostWithinCap({ currentCost, costStatus, pendingBound, capUsd = 5 }) {
  if (costStatus !== "calculated_from_explicit_configuration" || !Number.isFinite(Number(currentCost)) || !pendingBound || !Number.isFinite(Number(pendingBound.maximum_request_cost_usd))) { const error = new Error("GLOBAL_ACCEPTANCE_COST_BOUND"); error.code = error.message; throw error; }
  if (Number(currentCost) + Number(pendingBound.maximum_request_cost_usd) > capUsd) { const error = new Error("GLOBAL_ACCEPTANCE_COST_BOUND"); error.code = error.message; throw error; }
  return true;
}
