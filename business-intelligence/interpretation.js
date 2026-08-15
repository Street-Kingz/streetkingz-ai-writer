import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256, stableId } from "../research/core/canonical.js";
import { BUSINESS_INTELLIGENCE_SCHEMA_VERSION } from "./contracts.js";
import { assertValidBusinessIntelligenceObject } from "./validation.js";
import {
  buildBusinessIntelligencePrompt, businessIntelligenceInterpretationJsonSchema,
  BUSINESS_INTELLIGENCE_INTERPRETATION_PROMPT_VERSION, BUSINESS_INTELLIGENCE_SYSTEM_PROMPT,
  selectRelevantBusinessEvidence
} from "./interpretationPrompt.js";
import { validateInterpretedBusinessIntelligence } from "./interpretationValidation.js";

const safeTimestamp = (value) => value.replace(/[:.]/g, "-");
const slug = (url) => new URL(url).hostname.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function constrainEvidenceIds(schema, evidence) {
  const evidenceIds = evidence.map((record) => record.id);
  const constrained = structuredClone(schema);
  constrained.$defs = { evidence_id: { type: "string", enum: evidenceIds } };
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (value.properties?.evidence_refs?.items) value.properties.evidence_refs.items = { $ref: "#/$defs/evidence_id" };
    if (value.properties?.evidence_id) value.properties.evidence_id = { $ref: "#/$defs/evidence_id" };
    for (const child of Object.values(value)) walk(child);
  };
  walk(constrained);
  return constrained;
}

function visitKnowledge(value, path = "$", output = []) {
  if (Array.isArray(value)) { value.forEach((item, index) => visitKnowledge(item, `${path}[${index}]`, output)); return output; }
  if (!value || typeof value !== "object") return output;
  if (Object.hasOwn(value, "knowledge_type") && Object.hasOwn(value, "evidence_refs")) output.push({ path, ...value });
  for (const [key, child] of Object.entries(value)) if (!["value", "evidence_refs", "source_evidence"].includes(key)) visitKnowledge(child, `${path}.${key}`, output);
  return output;
}

export async function interpretBusinessEvidence({ evidenceArtifact, provider, outputRoot = "artifacts/business-intelligence", now = () => new Date(), monotonicNow = () => performance.now(), writeArtifacts = true }) {
  if (evidenceArtifact?.artifact_type !== "business_intelligence_raw_evidence") throw new Error("A raw Business Intelligence evidence artifact is required.");
  if (!provider?.generate || !provider.id || !provider.model) throw new Error("An injected Business Intelligence interpretation provider is required.");
  const relevantEvidence = selectRelevantBusinessEvidence(evidenceArtifact);
  const systemPrompt = BUSINESS_INTELLIGENCE_SYSTEM_PROMPT;
  const userPrompt = buildBusinessIntelligencePrompt(evidenceArtifact, relevantEvidence);
  const responseSchema = constrainEvidenceIds(businessIntelligenceInterpretationJsonSchema(), relevantEvidence);
  const startedAt = now().toISOString();
  const startedTick = monotonicNow();
  const response = await provider.generate({ systemPrompt, userPrompt, responseSchema, temperature: 0.1 });
  const elapsedMs = Math.max(0, Math.round(monotonicNow() - startedTick));
  let proposal;
  try { proposal = JSON.parse(response.rawText); } catch (error) { throw new Error(`AI business interpretation returned malformed JSON: ${error.message}`); }
  const completedAt = now().toISOString();
  const usage = response.usage || {};
  const inputTokens = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0);
  const outputTokens = Number(usage.completion_tokens ?? usage.output_tokens ?? 0);
  const assumptions = proposal.assumptions || [];
  const conflicts = proposal.conflicts || [];
  const body = Object.fromEntries(Object.entries(proposal).filter(([key]) => !["assumptions", "conflicts"].includes(key)));
  const bio = {
    metadata: {
      object_id: stableId("bio", { business_url: evidenceArtifact.business_url, source_fingerprint: evidenceArtifact.source_fingerprint, prompt_version: BUSINESS_INTELLIGENCE_INTERPRETATION_PROMPT_VERSION }),
      schema_version: BUSINESS_INTELLIGENCE_SCHEMA_VERSION,
      business_id: stableId("business", new URL(evidenceArtifact.business_url).hostname),
      primary_domain: evidenceArtifact.business_url, created_at: completedAt, updated_at: completedAt,
      source_fingerprint: evidenceArtifact.source_fingerprint, ingestion_status: "interpreted_awaiting_human_validation"
    },
    ...body,
    source_evidence: evidenceArtifact.evidence,
    conflicts,
    human_validation_decisions: [], human_corrections: [], validation_status: "awaiting_validation",
    execution_metadata: {
      deterministic_steps: ["select_relevant_business_evidence", "build_blind_interpretation_prompt", "invoke_ai_once", "parse_structured_output", "reattach_immutable_evidence", "validate_business_intelligence_object", "write_artifacts"],
      ai_calls: [{ provider: response.provider || provider.id, model: response.model || provider.model, prompt_version: BUSINESS_INTELLIGENCE_INTERPRETATION_PROMPT_VERSION }],
      model_used: response.model || provider.model, input_tokens: inputTokens, output_tokens: outputTokens,
      ...(Number.isFinite(Number(response.reasoning_tokens ?? usage.reasoning_tokens)) ? { reasoning_tokens: Number(response.reasoning_tokens ?? usage.reasoning_tokens) } : {}),
      external_api_call_count: 1, execution_time_ms: elapsedMs,
      ...(Number.isFinite(response.estimated_cost) ? { estimated_cost: response.estimated_cost } : {})
    }
  };
  const errors = validateInterpretedBusinessIntelligence(bio, assumptions);
  if (errors.length) throw Object.assign(new Error("AI-generated Business Intelligence Object failed validation."), { errors });
  assertValidBusinessIntelligenceObject(bio);
  const knowledge = visitKnowledge(bio);
  const validationReport = {
    schema_version: "1.0.0", artifact_type: "business_intelligence_interpretation_validation",
    created_at: completedAt, valid: true, errors: [], supplied_evidence_count: evidenceArtifact.evidence.length,
    evidence_count_used: relevantEvidence.length, knowledge_values_created: knowledge.length,
    unknowns_created: knowledge.filter((item) => item.knowledge_type === "unknown").map(({ path, value, evidence_refs, confidence }) => ({ path, value, evidence_refs, confidence })),
    conflicts_identified: conflicts.length, validation_status: bio.validation_status, assumptions,
    execution_metadata: bio.execution_metadata
  };
  const artifact = { schema_version: "1.0.0", artifact_type: "business_intelligence_interpretation", created_at: completedAt, input: { artifact_type: evidenceArtifact.artifact_type, source_fingerprint: evidenceArtifact.source_fingerprint, supplied_evidence_count: evidenceArtifact.evidence.length, interpreted_evidence_count: relevantEvidence.length }, business_intelligence_object: bio, assumptions, execution_metadata: bio.execution_metadata };
  if (!writeArtifacts) return { artifact, bio, validationReport, files: null, prompts: { systemPrompt, userPrompt, responseSchema } };
  const directory = path.resolve(outputRoot, slug(evidenceArtifact.business_url), safeTimestamp(completedAt));
  await mkdir(directory, { recursive: true });
  const files = { directory, businessIntelligence: path.join(directory, "business-intelligence.json"), validation: path.join(directory, "interpretation-validation-report.json"), runMetadata: path.join(directory, "run-metadata.json") };
  await Promise.all([
    writeFile(files.businessIntelligence, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
    writeFile(files.validation, `${JSON.stringify(validationReport, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
    writeFile(files.runMetadata, `${JSON.stringify({ artifact_type: "business_intelligence_interpretation_run", created_at: completedAt, started_at: startedAt, model: bio.execution_metadata.model_used, source_fingerprint: evidenceArtifact.source_fingerprint, prompt_sha256: sha256({ systemPrompt, userPrompt }), usage: { input_tokens: inputTokens, output_tokens: outputTokens }, execution_time_ms: elapsedMs, files: { business_intelligence: "business-intelligence.json", validation: "interpretation-validation-report.json" } }, null, 2)}\n`, { encoding: "utf8", flag: "wx" })
  ]);
  return { artifact, bio, validationReport, files, prompts: { systemPrompt, userPrompt, responseSchema } };
}
