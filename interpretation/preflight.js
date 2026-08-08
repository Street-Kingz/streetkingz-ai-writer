export const TOKEN_ESTIMATE_CHARS_PER_TOKEN = 4;

function size(value) { return typeof value === "string" ? value.length : JSON.stringify(value).length; }

export function measureInterpretationRequest({ systemPrompt, userPrompt, responseSchema, model, configuredMaxInputTokens, configuredModelContextWindow, configuredTpmLimit }) {
  const contributors = {
    system_instructions: size(systemPrompt),
    interpretation_input: size(userPrompt),
    structured_output_schema: size(responseSchema)
  };
  const characters = Object.values(contributors).reduce((sum, value) => sum + value, 0);
  const estimatedTokens = Math.ceil(characters / TOKEN_ESTIMATE_CHARS_PER_TOKEN);
  return {
    model,
    characters,
    estimated_tokens: estimatedTokens,
    estimator: `characters/${TOKEN_ESTIMATE_CHARS_PER_TOKEN}`,
    contributors: Object.fromEntries(Object.entries(contributors).map(([name, chars]) => [name, { characters: chars, estimated_tokens: Math.ceil(chars / TOKEN_ESTIMATE_CHARS_PER_TOKEN), percentage: Number((chars / characters * 100).toFixed(2)) }])),
    limits: {
      application_max_input_tokens: configuredMaxInputTokens ?? null,
      model_context_window_tokens: configuredModelContextWindow ?? null,
      account_project_tpm: configuredTpmLimit ?? null
    },
    distinctions: {
      application_input_budget: "Local request gate configured by the application.",
      model_context_window: "Maximum tokens the model can accept across input and output.",
      account_project_tpm: "Account/project throughput allowance per minute; not a context-window limit."
    }
  };
}

export function assertInterpretationPreflight(measurement) {
  const ceiling = Number(measurement.limits.application_max_input_tokens);
  if (Number.isFinite(ceiling) && ceiling > 0 && measurement.estimated_tokens > ceiling) {
    const largest = Object.entries(measurement.contributors).sort(([, a], [, b]) => b.characters - a.characters)[0];
    const error = new Error(`Interpretation input preflight failed: estimated ${measurement.estimated_tokens} tokens exceeds configured application ceiling ${ceiling}; largest contributor is ${largest[0]} (${largest[1].estimated_tokens} estimated tokens).`);
    error.code = "INTERPRETATION_INPUT_BUDGET_EXCEEDED";
    error.measurement = measurement;
    throw error;
  }
  return measurement;
}
