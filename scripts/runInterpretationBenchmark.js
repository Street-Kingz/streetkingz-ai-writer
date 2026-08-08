import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { deriveEvidenceUse, validateInterpretationOutput } from "../interpretation/validation.js";
import { renderInterpretationMarkdown } from "../interpretation/render.js";
import { benchmarkCallSummary, invokeControlledCall, writeImmutableArtifact } from "../interpretation/call-control.js";
import { calculateConfiguredCost, configuredModelPricing } from "../interpretation/cost.js";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is required.");
const frozenDirectory = path.resolve("artifacts/live-validation/interpretation-payload-optimisation-2026-08-08");
const validationContextPath = path.resolve("artifacts/live-validation/interpretation-final-2026-08-08/heavy-duty-drying-towel-1200gsm/improve_existing_product_page/interpretation_run_2026-08-08T08-46-52-571Z_022e7eed/interpretation-context.json");
const outputDirectory = path.resolve(process.env.BENCHMARK_OUTPUT_DIR || "artifacts/live-validation/interpretation-model-benchmark-controlled");
const [briefBytes, frozenRequest, context] = await Promise.all([
  readFile(path.join(frozenDirectory, "decision-brief.json")),
  readFile(path.join(frozenDirectory, "interpretation-request.json"), "utf8").then(JSON.parse),
  readFile(validationContextPath, "utf8").then(JSON.parse)
]);
const brief = JSON.parse(briefBytes);
if (JSON.stringify(brief) !== JSON.stringify(context.decision_brief || brief)) {
  // The preserved validation context predates embedding the brief; validation uses its unchanged registry/inventory/gap data.
}
const systemPrompt = frozenRequest.messages.find((message) => message.role === "system").content;
const userPrompt = frozenRequest.messages.find((message) => message.role === "user").content;
const schema = frozenRequest.response_format.json_schema.schema;
const briefHash = createHash("sha256").update(briefBytes).digest("hex");
const inputHash = createHash("sha256").update(`${systemPrompt}\n${userPrompt}${JSON.stringify(schema)}`).digest("hex");
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDirectory, "decision-brief.json"), briefBytes),
  writeFile(path.join(outputDirectory, "benchmark-input.json"), `${JSON.stringify({ decision_brief_sha256: briefHash, model_input_sha256: inputHash, system_prompt: systemPrompt, user_prompt: userPrompt, schema }, null, 2)}\n`)
]);

const publicHeaders = (headers) => Object.fromEntries([...headers.entries()].filter(([name]) => /^(?:retry-after|x-ratelimit-|x-request-id|openai-)/i.test(name)));
const extractResponsesText = (envelope) => envelope?.output_text || envelope?.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;

async function execute({ label, model, endpoint, payload, reasoning }) {
  const controlled = await invokeControlledCall({
    benchmarkDirectory: outputDirectory,
    modelLabel: label,
    maxCalls: 1,
    retries: 0,
    timeoutMs: process.env.OPENAI_INTERPRETATION_TIMEOUT_MS ? Number(process.env.OPENAI_INTERPRETATION_TIMEOUT_MS) : 0,
    invoke: async ({ signal, callId, callDirectory }) => {
      await writeImmutableArtifact(callDirectory, "request.json", { call_id: callId, endpoint, payload });
      const started = performance.now();
      const response = await fetch(endpoint, { method: "POST", signal, headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` }, body: JSON.stringify(payload) });
      const rawBody = await response.text();
      return { ok: response.ok, status: response.status, headers: publicHeaders(response.headers), rawBody, latencyMs: Math.round(performance.now() - started) };
    }
  });
  const directory = controlled.callDirectory;
  const { ok, status, headers, rawBody, latencyMs } = controlled.result;
  let envelope = null;
  try { envelope = rawBody ? JSON.parse(rawBody) : null; } catch {}
  const rawText = ok ? (endpoint.endsWith("/responses") ? extractResponsesText(envelope) : envelope?.choices?.[0]?.message?.content) : null;
  let parsed = null;
  let errors = [];
  if (typeof rawText === "string") try { parsed = JSON.parse(rawText); } catch (error) { errors.push({ code: "MALFORMED_JSON", path: "$", message: error.message }); }
  if (parsed) errors = validateInterpretationOutput(parsed, context);
  if (!ok) errors.push({ code: "PROVIDER_HTTP_ERROR", path: "$", message: `HTTP ${status}`, provider_error: envelope?.error || null });
  if (ok && typeof rawText !== "string") errors.push({ code: "MISSING_MODEL_OUTPUT", path: "$", message: "Provider returned no output text." });
  const valid = Boolean(ok && parsed && errors.length === 0);
  const interpretation = valid ? { ...parsed, evidence_use: deriveEvidenceUse(parsed, context), validation_state: "valid", human_review_state: "awaiting_human_review", downstream_eligible: false } : null;
  const usage = envelope?.usage || null;
  const inputTokens = usage?.prompt_tokens ?? usage?.input_tokens ?? null;
  const outputTokens = usage?.completion_tokens ?? usage?.output_tokens ?? null;
  const cost = calculateConfiguredCost({ inputTokens, outputTokens, pricing: configuredModelPricing(process.env, envelope?.model || model) });
  const metadata = {
    label, model: envelope?.model || model, endpoint, api_mode: endpoint.endsWith("/responses") ? "responses" : "chat.completions",
    structured_output: true, temperature: payload.temperature ?? null, reasoning: reasoning || null,
    decision_brief_sha256: briefHash, model_input_sha256: inputHash, latency_ms: latencyMs,
    call_id: controlled.callId, call_directory: path.basename(directory), http_status: status, response_headers: headers, usage,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: usage?.total_tokens ?? null,
    ...cost,
    cost_note: cost.cost_usd === null ? "Unknown: no explicit trusted pricing configuration exists for this model." : "Calculated from explicit configured per-million-token prices."
  };
  await Promise.all([
    writeImmutableArtifact(directory, "raw-response.json", { http_status: status, headers, raw_body: rawBody }),
    writeImmutableArtifact(directory, "validation-report.json", { state: valid ? "valid" : "invalid", errors }),
    writeImmutableArtifact(directory, "run-metadata.json", metadata),
    ...(valid ? [writeImmutableArtifact(directory, "interpretation.json", interpretation), writeImmutableArtifact(directory, "interpretation.md", renderInterpretationMarkdown(interpretation, context))] : [])
  ]);
  return { label, valid, errors, metadata, interpretation };
}

const onlyModel = process.env.BENCHMARK_ONLY_MODEL || null;
let gpt41 = null;
if (!onlyModel || onlyModel === "gpt-4.1") {
  const chatPayload = structuredClone(frozenRequest);
  chatPayload.model = "gpt-4.1-2025-04-14";
  gpt41 = await execute({ label: "gpt-4.1", model: chatPayload.model, endpoint: "https://api.openai.com/v1/chat/completions", payload: chatPayload });
}

const solPayload = {
  model: "gpt-5.6-sol",
  reasoning: { effort: "high" },
  text: { format: { type: "json_schema", name: "product_page_interpretation", strict: true, schema } },
  input: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]
};
let sol = null;
if (!onlyModel || onlyModel === "gpt-5.6-sol") sol = await execute({ label: "gpt-5.6-sol", model: solPayload.model, endpoint: "https://api.openai.com/v1/responses", payload: solPayload, reasoning: { effort: "high" } });
const completedRuns = [gpt41, sol].filter(Boolean);
const authorisedCallPlan = onlyModel ? { [onlyModel]: 1 } : { "gpt-4.1": 1, "gpt-5.6-sol": 1 };
const callSummary = await benchmarkCallSummary({ benchmarkDirectory: outputDirectory, modelLimits: authorisedCallPlan });
await writeFile(path.join(outputDirectory, "machine-comparison.json"), `${JSON.stringify({ decision_brief_sha256: briefHash, model_input_sha256: inputHash, call_control: callSummary, runs: completedRuns.map((run) => ({ label: run.label, valid: run.valid, errors: run.errors, metadata: run.metadata })) }, null, 2)}\n`);
console.log(JSON.stringify({ output_directory: outputDirectory, decision_brief_sha256: briefHash, model_input_sha256: inputHash, runs: completedRuns.map((run) => ({ label: run.label, valid: run.valid, status: run.metadata.http_status, errors: run.errors.length })) }, null, 2));
