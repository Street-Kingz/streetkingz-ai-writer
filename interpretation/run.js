import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256, stableId } from "../research/core/canonical.js";
import { INTERPRETATION_PROMPT_VERSION, interpretationJsonSchema } from "./contracts.js";
import { buildInterpretationContext } from "./context.js";
import { buildInterpretationPrompt, INTERPRETATION_SYSTEM_PROMPT } from "./prompt.js";
import { renderInterpretationMarkdown } from "./render.js";
import { deriveEvidenceUse, validateInterpretationOutput } from "./validation.js";
import { assertInterpretationPreflight, measureInterpretationRequest } from "./preflight.js";

function safeTimestamp(value) {
  return value.replace(/[:.]/g, "-");
}

function productSlug(url) {
  return new URL(url).pathname.split("/").filter(Boolean).at(-1);
}

export async function runInterpretation({
  researchState,
  evidence,
  provider,
  outputRoot = "artifacts/interpretation",
  maxRecords,
  maxCharacters,
  preflightConfig = {},
  now = () => new Date()
}) {
  if (!provider || typeof provider.generate !== "function" || !provider.id || !provider.model) throw new Error("An interpretation provider abstraction is required.");
  const context = buildInterpretationContext({ researchState, evidence, maxRecords, maxCharacters });
  const startedAt = now().toISOString();
  const runId = `interpretation_run_${safeTimestamp(startedAt)}_${context.interpretation_context_id.slice(-8)}`;
  const outputDirectory = path.join(path.resolve(outputRoot), productSlug(context.source_product.product_url), context.objective.type, runId);
  const files = {
    inventory: path.join(outputDirectory, "current-page-inventory.json"),
    gapMatrix: path.join(outputDirectory, "gap-matrix.json"),
    context: path.join(outputDirectory, "interpretation-context.json"),
    decisionBrief: path.join(outputDirectory, "decision-brief.json"),
    requestPayload: path.join(outputDirectory, "interpretation-request.json"),
    preflight: path.join(outputDirectory, "request-preflight.json"),
    raw: path.join(outputDirectory, "raw-response.json"),
    interpretation: path.join(outputDirectory, "interpretation.json"),
    markdown: path.join(outputDirectory, "interpretation.md"),
    validation: path.join(outputDirectory, "validation-report.json"),
    metadata: path.join(outputDirectory, "run-metadata.json")
  };
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(files.inventory, `${JSON.stringify(context.current_page_inventory, null, 2)}\n`, "utf8"),
    writeFile(files.gapMatrix, `${JSON.stringify(context.gap_matrix, null, 2)}\n`, "utf8"),
    writeFile(files.context, `${JSON.stringify(context, null, 2)}\n`, "utf8")
    ,writeFile(files.decisionBrief, `${JSON.stringify(context.decision_brief, null, 2)}\n`, "utf8")
  ]);
  const userPrompt = buildInterpretationPrompt(context);
  const responseSchema = interpretationJsonSchema();
  const requestPayload = provider.requestPayload ? provider.requestPayload({ systemPrompt: INTERPRETATION_SYSTEM_PROMPT, userPrompt, responseSchema, temperature: 0.1 }) : { model: provider.model, temperature: 0.1, response_schema: responseSchema, messages: [{ role: "system", content: INTERPRETATION_SYSTEM_PROMPT }, { role: "user", content: userPrompt }] };
  const measurement = measureInterpretationRequest({ systemPrompt: INTERPRETATION_SYSTEM_PROMPT, userPrompt, responseSchema, model: provider.model, ...preflightConfig });
  await Promise.all([writeFile(files.requestPayload, `${JSON.stringify(requestPayload, null, 2)}\n`, "utf8"), writeFile(files.preflight, `${JSON.stringify(measurement, null, 2)}\n`, "utf8")]);
  assertInterpretationPreflight(measurement);
  const response = await provider.generate({ systemPrompt: INTERPRETATION_SYSTEM_PROMPT, userPrompt, responseSchema, temperature: 0.1 });
  const completedAt = now().toISOString();
  const rawArtifact = {
    schema_version: "1.0.0",
    artifact_type: "raw_ai_interpretation_response",
    run_id: runId,
    provider: response.provider || provider.id,
    model: response.model || provider.model,
    response_id: response.response_id || null,
    raw_text: response.rawText
  };
  await writeFile(files.raw, `${JSON.stringify(rawArtifact, null, 2)}\n`, "utf8");

  let parsed = null;
  let errors = [];
  try { parsed = JSON.parse(response.rawText); }
  catch (error) { errors = [{ code: "MALFORMED_JSON", path: "$", message: error.message }]; }
  if (parsed) errors = validateInterpretationOutput(parsed, context);
  const valid = errors.length === 0;
  const validationReport = {
    schema_version: "1.0.0",
    artifact_type: "interpretation_validation_report",
    run_id: runId,
    interpretation_context_id: context.interpretation_context_id,
    state: valid ? "valid" : "invalid",
    downstream_eligible: false,
    cited_evidence_ids: parsed ? [...new Set([...parsed.findings?.flatMap((finding) => finding.evidence_ids || []) || [], ...parsed.decision_areas?.flatMap((decision) => decision.evidence_ids || []) || []])].sort() : [],
    supplied_evidence_count: context.evidence.length,
    errors
  };
  const interpretationId = stableId("interpretation", { context_id: context.interpretation_context_id, raw_response_sha256: sha256(response.rawText), prompt_version: INTERPRETATION_PROMPT_VERSION });
  const interpretation = valid ? {
    ...parsed,
    evidence_use: deriveEvidenceUse(parsed, context),
    artifact_type: "validated_ai_interpretation",
    interpretation_id: interpretationId,
    interpretation_context_id: context.interpretation_context_id,
    validation_state: "valid",
    downstream_eligible: false,
    human_review_state: "awaiting_human_review"
  } : {
    schema_version: "1.0.0",
    artifact_type: "invalid_ai_interpretation",
    interpretation_id: interpretationId,
    interpretation_context_id: context.interpretation_context_id,
    objective: context.objective.type,
    validation_state: "invalid",
    downstream_eligible: false,
    human_review_state: "blocked_invalid",
    raw_response_ref: path.basename(files.raw),
    validation_report_ref: path.basename(files.validation)
  };
  const metadata = {
    schema_version: "1.0.0",
    artifact_type: "interpretation_run_metadata",
    run_id: runId,
    status: valid ? "awaiting_human_review" : "invalid",
    provider: response.provider || provider.id,
    model: response.model || provider.model,
    model_settings: response.settings || provider.settings || { temperature: 0.1, response_format: "json_object" },
    api: response.settings?.api || provider.settings?.api || "unknown",
    strict_structured_output: response.settings?.strict_structured_output === true || provider.settings?.strict_structured_output === true,
    prompt_version: INTERPRETATION_PROMPT_VERSION,
    system_prompt_sha256: sha256(INTERPRETATION_SYSTEM_PROMPT),
    user_prompt_sha256: sha256(userPrompt),
    input_artifact_id: researchState.research_state_id,
    interpretation_context_id: context.interpretation_context_id,
    validation_state: validationReport.state,
    downstream_eligible: false,
    human_review_state: interpretation.human_review_state,
    started_at: startedAt,
    completed_at: completedAt,
    usage: response.usage || null,
    request_preflight: measurement,
    files: Object.fromEntries(Object.entries(files).map(([key, value]) => [key, path.basename(value)]))
  };
  await Promise.all([
    writeFile(files.interpretation, `${JSON.stringify(interpretation, null, 2)}\n`, "utf8"),
    writeFile(files.validation, `${JSON.stringify(validationReport, null, 2)}\n`, "utf8"),
    writeFile(files.metadata, `${JSON.stringify(metadata, null, 2)}\n`, "utf8"),
    ...(valid ? [writeFile(files.markdown, renderInterpretationMarkdown(interpretation, context), "utf8")] : [])
  ]);
  return { valid, context, rawArtifact, interpretation, validationReport, metadata, files: { outputDirectory, ...files } };
}
