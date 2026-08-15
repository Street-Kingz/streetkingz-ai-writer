import { readFile } from "node:fs/promises";
import path from "node:path";
import { createOpenAIInterpretationProvider } from "../interpretation/providers/openai.js";
import { interpretProductEvidence } from "../product-intelligence/interpretation.js";
import { calculateConfiguredCost, configuredModelPricing } from "../interpretation/cost.js";

const [artifactPath, outputRoot] = process.argv.slice(2);
if (!artifactPath) {
  console.error("Usage: npm run product-intelligence:interpret -- <raw-evidence.json> [output-root]");
  process.exitCode = 1;
} else {
  try {
    const evidenceArtifact = JSON.parse(await readFile(path.resolve(artifactPath), "utf8"));
    const baseProvider = createOpenAIInterpretationProvider();
    const provider = { ...baseProvider, async generate(input) { const result = await baseProvider.generate(input); const usage = result.usage || {}; const cost = calculateConfiguredCost({ inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens, pricing: configuredModelPricing(process.env, result.model || baseProvider.model) }); return { ...result, ...(cost.cost_usd === null ? {} : { estimated_cost: cost.cost_usd }), cost_status: cost.cost_status }; } };
    const result = await interpretProductEvidence({ evidenceArtifact, provider, ...(outputRoot ? { outputRoot } : {}) });
    console.log(JSON.stringify({ artifact: result.files.productIntelligence, validation: result.files.validation, model: result.pio.execution_metadata.model_used, input_tokens: result.pio.execution_metadata.input_tokens, output_tokens: result.pio.execution_metadata.output_tokens, estimated_cost: result.pio.execution_metadata.estimated_cost, validation_status: result.pio.validation_status, knowledge_gaps: result.pio.knowledge_gaps.length }, null, 2));
  } catch (error) {
    console.error(`Product Intelligence interpretation failed: ${error.message}`);
    if (error.errors) console.error(JSON.stringify(error.errors, null, 2));
    process.exitCode = 1;
  }
}
