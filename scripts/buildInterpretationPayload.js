import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildInterpretationContext } from "../interpretation/context.js";
import { interpretationJsonSchema } from "../interpretation/contracts.js";
import { buildInterpretationPrompt, INTERPRETATION_SYSTEM_PROMPT } from "../interpretation/prompt.js";
import { measureInterpretationRequest } from "../interpretation/preflight.js";
import { buildOpenAIInterpretationRequest, DEFAULT_INTERPRETATION_MODEL } from "../interpretation/providers/openai.js";

const [researchStatePath, evidencePath, outputDirectory, requestedModel] = process.argv.slice(2);
if (!researchStatePath || !evidencePath || !outputDirectory) {
  console.error("Usage: node scripts/buildInterpretationPayload.js <research-state.json> <evidence.json> <output-directory> [model]");
  process.exitCode = 1;
} else {
  const [researchState, evidence] = await Promise.all([readFile(path.resolve(researchStatePath), "utf8").then(JSON.parse), readFile(path.resolve(evidencePath), "utf8").then(JSON.parse)]);
  const context = buildInterpretationContext({ researchState, evidence, maxRecords: 96 });
  const model = requestedModel || process.env.OPENAI_INTERPRETATION_MODEL || process.env.OPENAI_MODEL || DEFAULT_INTERPRETATION_MODEL;
  const userPrompt = buildInterpretationPrompt(context);
  const schema = interpretationJsonSchema();
  const payload = buildOpenAIInterpretationRequest({ model, systemPrompt: INTERPRETATION_SYSTEM_PROMPT, userPrompt, responseSchema: schema });
  const preflight = measureInterpretationRequest({
    systemPrompt: INTERPRETATION_SYSTEM_PROMPT,
    userPrompt,
    responseSchema: schema,
    model,
    configuredMaxInputTokens: process.env.OPENAI_INTERPRETATION_MAX_INPUT_TOKENS ? Number(process.env.OPENAI_INTERPRETATION_MAX_INPUT_TOKENS) : undefined,
    configuredModelContextWindow: process.env.OPENAI_INTERPRETATION_CONTEXT_WINDOW ? Number(process.env.OPENAI_INTERPRETATION_CONTEXT_WINDOW) : undefined,
    configuredTpmLimit: process.env.OPENAI_INTERPRETATION_TPM_LIMIT ? Number(process.env.OPENAI_INTERPRETATION_TPM_LIMIT) : undefined
  });
  await mkdir(path.resolve(outputDirectory), { recursive: true });
  await Promise.all([
    writeFile(path.join(path.resolve(outputDirectory), "decision-brief.json"), `${JSON.stringify(context.decision_brief, null, 2)}\n`, "utf8"),
    writeFile(path.join(path.resolve(outputDirectory), "interpretation-request.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8"),
    writeFile(path.join(path.resolve(outputDirectory), "request-preflight.json"), `${JSON.stringify(preflight, null, 2)}\n`, "utf8")
  ]);
  console.log(JSON.stringify({ output_directory: path.resolve(outputDirectory), model, characters: preflight.characters, estimated_tokens: preflight.estimated_tokens, citable_evidence_ids: context.decision_brief.citation_index.length }, null, 2));
}
