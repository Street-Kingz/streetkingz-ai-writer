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
