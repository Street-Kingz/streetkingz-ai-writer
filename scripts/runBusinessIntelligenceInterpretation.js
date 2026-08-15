import { readFile } from "node:fs/promises";
import path from "node:path";
import { createOpenAIInterpretationProvider } from "../interpretation/providers/openai.js";
import { createOpenAIResponsesInterpretationProvider } from "../interpretation/providers/openaiResponses.js";
import { calculateConfiguredCost, configuredModelPricing } from "../interpretation/cost.js";
import { interpretBusinessEvidence } from "../business-intelligence/interpretation.js";

const [artifactPath, outputRoot] = process.argv.slice(2);
if (!artifactPath) {
  console.error("Usage: npm run business-intelligence:interpret -- <raw-business-evidence.json> [output-root]");
  process.exitCode = 1;
} else {
  try {
    const evidenceArtifact = JSON.parse(await readFile(path.resolve(artifactPath), "utf8"));
    const useResponses = process.env.OPENAI_INTERPRETATION_API === "responses";
    const baseProvider = useResponses ? createOpenAIResponsesInterpretationProvider() : createOpenAIInterpretationProvider();
    const provider = { ...baseProvider, async generate(input) { const result = await baseProvider.generate(input); const usage = result.usage || {}; const cost = calculateConfiguredCost({ inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens, pricing: configuredModelPricing(process.env, result.model || baseProvider.model) }); return { ...result, ...(cost.cost_usd === null ? {} : { estimated_cost: cost.cost_usd }), cost_status: cost.cost_status }; } };
    const result = await interpretBusinessEvidence({ evidenceArtifact, provider, ...(outputRoot ? { outputRoot } : {}) });
    console.log(JSON.stringify({ artifact: result.files.businessIntelligence, validation: result.files.validation, model: result.bio.execution_metadata.model_used, input_tokens: result.bio.execution_metadata.input_tokens, output_tokens: result.bio.execution_metadata.output_tokens, execution_time_ms: result.bio.execution_metadata.execution_time_ms, estimated_cost: result.bio.execution_metadata.estimated_cost ?? null, validation_status: result.bio.validation_status, evidence_used: result.validationReport.evidence_count_used, knowledge_values: result.validationReport.knowledge_values_created, unknowns: result.validationReport.unknowns_created.length, conflicts: result.validationReport.conflicts_identified }, null, 2));
  } catch (error) {
    console.error(`Business Intelligence interpretation failed: ${error.message}`);
    if (error.errors) console.error(JSON.stringify(error.errors, null, 2));
    process.exitCode = 1;
  }
}
