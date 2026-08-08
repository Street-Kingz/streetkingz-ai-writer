import { readFile } from "node:fs/promises";
import path from "node:path";
import { createOpenAIInterpretationProvider } from "../interpretation/providers/openai.js";
import { runInterpretation } from "../interpretation/run.js";

const [researchStatePath, evidencePath, requestedOutputRoot] = process.argv.slice(2);
if (!researchStatePath || !evidencePath) {
  console.error("Usage: npm run interpret:product-page -- <research-state.json> <evidence.json> [output-root]");
  process.exitCode = 1;
} else {
  try {
    const [researchState, evidence] = await Promise.all([
      readFile(path.resolve(researchStatePath), "utf8").then(JSON.parse),
      readFile(path.resolve(evidencePath), "utf8").then(JSON.parse)
    ]);
    const provider = createOpenAIInterpretationProvider();
    const result = await runInterpretation({
      researchState,
      evidence,
      provider,
      outputRoot: requestedOutputRoot || "artifacts/live-validation/interpretation-2026-08-08",
      maxRecords: process.env.INTERPRETATION_CONTEXT_MAX_RECORDS ? Number(process.env.INTERPRETATION_CONTEXT_MAX_RECORDS) : undefined,
      maxCharacters: process.env.INTERPRETATION_CONTEXT_MAX_CHARACTERS ? Number(process.env.INTERPRETATION_CONTEXT_MAX_CHARACTERS) : undefined
      ,preflightConfig: {
        configuredMaxInputTokens: process.env.OPENAI_INTERPRETATION_MAX_INPUT_TOKENS ? Number(process.env.OPENAI_INTERPRETATION_MAX_INPUT_TOKENS) : undefined,
        configuredModelContextWindow: process.env.OPENAI_INTERPRETATION_CONTEXT_WINDOW ? Number(process.env.OPENAI_INTERPRETATION_CONTEXT_WINDOW) : undefined,
        configuredTpmLimit: process.env.OPENAI_INTERPRETATION_TPM_LIMIT ? Number(process.env.OPENAI_INTERPRETATION_TPM_LIMIT) : undefined
      }
    });
    console.log(`Validation state: ${result.validationReport.state}`);
    console.log(`Human review state: ${result.interpretation.human_review_state}`);
    console.log(`Context records considered: ${result.context.budget.records_considered}`);
    console.log(`Context records included: ${result.context.budget.records_included}`);
    console.log(`Output directory: ${result.files.outputDirectory}`);
    if (!result.valid) process.exitCode = 2;
  } catch (error) {
    console.error(`Interpretation run failed: ${error.message}`);
    process.exitCode = 1;
  }
}
