import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256, stableId } from "../research/core/canonical.js";
import { PRODUCT_INTELLIGENCE_SCHEMA_VERSION } from "./contracts.js";
import { assertValidProductIntelligenceObject } from "./validation.js";
import { buildProductIntelligencePrompt, PRODUCT_INTELLIGENCE_INTERPRETATION_PROMPT_VERSION, PRODUCT_INTELLIGENCE_SYSTEM_PROMPT, productIntelligenceInterpretationJsonSchema, selectRelevantProductEvidence } from "./interpretationPrompt.js";
import { validateInterpretedProductIntelligence } from "./interpretationValidation.js";

const safeTimestamp = (value) => value.replace(/[:.]/g, "-");
const slug = (url) => new URL(url).pathname.split("/").filter(Boolean).at(-1);

function constrainEvidenceReferenceSchema(schema, evidenceIds) {
  const constrained = structuredClone(schema);
  constrained.$defs = { ...(constrained.$defs || {}), evidence_id: { type: "string", enum: evidenceIds } };
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (value.properties?.evidence_refs?.items) value.properties.evidence_refs.items = { $ref: "#/$defs/evidence_id" };
    for (const child of Object.values(value)) walk(child);
  };
  walk(constrained);
  return constrained;
}

function withoutNulls(value) {
  if (Array.isArray(value)) return value.map(withoutNulls);
  if (!value || typeof value !== "object") return value;
  if (Object.hasOwn(value, "knowledge_type")) return Object.fromEntries(Object.entries(value).filter(([key, child]) => key === "value" || child !== null));
  return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== null).map(([key, child]) => [key, withoutNulls(child)]));
}

function confidenceSummary(pio) {
  const values = [];
  const walk = (value) => { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === "object") { if (typeof value.confidence === "number" && value.knowledge_type) values.push(value); Object.values(value).forEach(walk); } };
  walk(pio);
  const byType = Object.fromEntries(["fact", "derived", "inference", "unknown"].map((type) => [type, values.filter((item) => item.knowledge_type === type).length]));
  return { knowledge_value_count: values.length, average_confidence: values.length ? Number((values.reduce((sum, item) => sum + item.confidence, 0) / values.length).toFixed(4)) : 0, by_knowledge_type: byType, low_confidence_count: values.filter((item) => item.confidence < 0.6).length };
}

function unknownKnowledge(pio) {
  const unknowns = [];
  const walk = (value, path = "$") => {
    if (Array.isArray(value)) return value.forEach((item, index) => walk(item, `${path}[${index}]`));
    if (!value || typeof value !== "object") return;
    if (value.knowledge_type === "unknown") unknowns.push({ path, value: null, evidence_refs: value.evidence_refs, confidence: value.confidence });
    for (const [key, child] of Object.entries(value)) if (!["source_evidence", "value", "evidence_refs"].includes(key)) walk(child, `${path}.${key}`);
  };
  walk(pio);
  return unknowns;
}

export async function interpretProductEvidence({ evidenceArtifact, provider, outputRoot = "artifacts/product-intelligence-interpretation", now = () => new Date(), writeArtifacts = true }) {
  if (evidenceArtifact?.artifact_type !== "product_intelligence_raw_evidence") throw new Error("A Product Intelligence raw evidence artifact is required.");
  if (!provider?.generate || !provider.id || !provider.model) throw new Error("An injected interpretation provider is required.");
  const relevantEvidence = selectRelevantProductEvidence(evidenceArtifact);
  const systemPrompt = PRODUCT_INTELLIGENCE_SYSTEM_PROMPT;
  const userPrompt = buildProductIntelligencePrompt(evidenceArtifact, relevantEvidence);
  const responseSchema = constrainEvidenceReferenceSchema(productIntelligenceInterpretationJsonSchema(), relevantEvidence.map((record) => record.id));
  const startedAt = now().toISOString();
  const response = await provider.generate({ systemPrompt, userPrompt, responseSchema, temperature: 0.1 });
  let proposal;
  try { proposal = JSON.parse(response.rawText); } catch (error) { throw new Error(`AI interpretation returned malformed JSON: ${error.message}`); }
  const completedAt = now().toISOString();
  const usage = response.usage || {};
  const inputTokens = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0);
  const outputTokens = Number(usage.completion_tokens ?? usage.output_tokens ?? 0);
  const pio = {
    metadata: { object_id: stableId("pio", { product_url: evidenceArtifact.product_url, source_fingerprint: evidenceArtifact.source_fingerprint, prompt_version: PRODUCT_INTELLIGENCE_INTERPRETATION_PROMPT_VERSION }), schema_version: PRODUCT_INTELLIGENCE_SCHEMA_VERSION, product_url: evidenceArtifact.product_url, created_at: completedAt, updated_at: completedAt, ingestion_status: "interpreted_awaiting_human_validation", source_fingerprint: evidenceArtifact.source_fingerprint },
    ...withoutNulls(Object.fromEntries(Object.entries(proposal).filter(([key]) => key !== "assumptions"))),
    source_evidence: evidenceArtifact.evidence,
    conflicts: evidenceArtifact.conflict_candidates || [],
    human_corrections: [],
    validation_status: (evidenceArtifact.conflict_candidates || []).some((item) => item.human_review_required) ? "requires_review" : "awaiting_validation",
    execution_metadata: { deterministic_steps: ["select_relevant_evidence", "build_bounded_prompt", "invoke_ai_once", "parse_structured_output", "reattach_immutable_evidence", "validate_product_intelligence_object", "write_artifact"], ai_calls: [{ provider: response.provider || provider.id, model: response.model || provider.model, prompt_version: PRODUCT_INTELLIGENCE_INTERPRETATION_PROMPT_VERSION }], model_used: response.model || provider.model, input_tokens: inputTokens, output_tokens: outputTokens, external_api_call_count: 1, ...(Number.isFinite(response.estimated_cost) ? { estimated_cost: response.estimated_cost } : {}) }
  };
  const errors = validateInterpretedProductIntelligence(pio, proposal.assumptions || []);
  if (errors.length) throw Object.assign(new Error("AI-generated Product Intelligence Object failed validation."), { errors });
  assertValidProductIntelligenceObject(pio);
  const artifact = { schema_version: "1.0.0", artifact_type: "product_intelligence_interpretation", created_at: completedAt, input: { artifact_type: evidenceArtifact.artifact_type, source_fingerprint: evidenceArtifact.source_fingerprint, supplied_evidence_count: evidenceArtifact.evidence.length, interpreted_evidence_count: relevantEvidence.length }, product_intelligence_object: pio, human_validation: { status: pio.validation_status, confidence_summary: confidenceSummary(pio), unknowns: { knowledge_gaps: pio.knowledge_gaps, unknown_values: unknownKnowledge(pio) }, assumptions: proposal.assumptions || [], evidence_refs: [...new Set(relevantEvidence.map((record) => record.id))] }, execution_metadata: pio.execution_metadata };
  if (!writeArtifacts) return { artifact, pio, files: null, prompts: { systemPrompt, userPrompt, responseSchema } };
  const directory = path.resolve(outputRoot, slug(evidenceArtifact.product_url), safeTimestamp(completedAt));
  await mkdir(directory, { recursive: true });
  const files = { directory, productIntelligence: path.join(directory, "product-intelligence.json"), validation: path.join(directory, "validation-report.json"), runMetadata: path.join(directory, "run-metadata.json") };
  await Promise.all([
    writeFile(files.productIntelligence, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
    writeFile(files.validation, `${JSON.stringify({ valid: true, errors: [], human_validation_status: pio.validation_status }, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
    writeFile(files.runMetadata, `${JSON.stringify({ created_at: completedAt, started_at: startedAt, model: pio.execution_metadata.model_used, usage: { input_tokens: inputTokens, output_tokens: outputTokens }, source_fingerprint: evidenceArtifact.source_fingerprint, prompt_sha256: sha256({ systemPrompt, userPrompt }), files: { product_intelligence: "product-intelligence.json", validation: "validation-report.json" } }, null, 2)}\n`, { encoding: "utf8", flag: "wx" })
  ]);
  return { artifact, pio, files, prompts: { systemPrompt, userPrompt, responseSchema } };
}
