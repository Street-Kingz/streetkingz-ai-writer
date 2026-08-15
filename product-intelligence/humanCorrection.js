import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { stableId } from "../research/core/canonical.js";
import { resolveKnowledgeCandidates } from "./resolution.js";
import { assertValidProductIntelligenceObject } from "./validation.js";

const safeTimestamp = (value) => value.replace(/[:.]/g, "-");
const productSlug = (url) => new URL(url).pathname.split("/").filter(Boolean).at(-1);

function valueAtPath(value, targetPath) {
  return targetPath.split(".").reduce((current, key) => current?.[key], value);
}

function setAtPath(value, targetPath, replacement) {
  const keys = targetPath.split(".");
  const parent = keys.slice(0, -1).reduce((current, key) => current[key], value);
  parent[keys.at(-1)] = replacement;
}

export function createApprovedHumanCorrection({ targetPath, previousValue, correctedValue, reason, createdAt, supersedesEvidenceRefs = [] }) {
  const core = { target_path: targetPath, previous_value: structuredClone(previousValue), corrected_value: structuredClone(correctedValue), reason, created_at: createdAt, status: "approved", supersedes_evidence_refs: [...supersedesEvidenceRefs] };
  return { id: stableId("pio_correction", core), ...core };
}

export function applyApprovedKnowledgeArrayCorrection(pio, correction) {
  assertValidProductIntelligenceObject(pio);
  if (correction?.status !== "approved") throw new Error("Only an approved human correction can become effective.");
  const original = valueAtPath(pio, correction.target_path);
  if (!Array.isArray(original) || !original.length || !original.every((item) => item?.knowledge_type && Array.isArray(item.evidence_refs))) {
    throw new Error(`Correction target ${correction.target_path} must be a populated knowledge array.`);
  }
  if (JSON.stringify(original) !== JSON.stringify(correction.previous_value)) throw new Error("Human correction previous_value does not match the current knowledge exactly.");
  const evidenceById = new Map(pio.source_evidence.map((record) => [record.id, record]));
  const candidates = original.map((item, index) => {
    const evidenceId = item.evidence_refs[0];
    const evidence = evidenceById.get(evidenceId);
    if (!evidence) throw new Error(`Original knowledge contains unknown evidence ID ${evidenceId}.`);
    return { value: item.value, evidence_id: evidenceId, source_type: evidence.source_type, knowledge_type: item.knowledge_type, confidence: item.confidence, status: item.status, index };
  });
  const resolved = resolveKnowledgeCandidates({ field: correction.target_path, candidates, corrections: [...(pio.human_corrections || []), correction] });
  if (resolved.resolution_method !== "approved_human_correction" || resolved.selected?.status !== "human_corrected") throw new Error("Approved correction did not become effective.");
  const corrected = structuredClone(pio);
  setAtPath(corrected, correction.target_path, [resolved.selected]);
  corrected.human_corrections = [...(corrected.human_corrections || []), correction];
  if (resolved.conflict) corrected.conflicts = [...(corrected.conflicts || []), resolved.conflict];
  corrected.metadata.updated_at = correction.created_at;
  corrected.validation_status = "validated";
  assertValidProductIntelligenceObject(corrected);
  return corrected;
}

export async function writeCorrectedProductIntelligenceArtifact({ sourceArtifact, correction, outputRoot = "artifacts/product-intelligence-founder-validation", now = () => new Date(), knownNextSliceRequirement = null }) {
  const sourcePio = sourceArtifact?.product_intelligence_object || sourceArtifact;
  const correctedPio = applyApprovedKnowledgeArrayCorrection(sourcePio, correction);
  const createdAt = now().toISOString();
  const directory = path.resolve(outputRoot, productSlug(correctedPio.metadata.product_url), safeTimestamp(createdAt));
  await mkdir(directory, { recursive: true });
  const artifactPath = path.join(directory, "product-intelligence-corrected.json");
  const metadataPath = path.join(directory, "founder-validation-metadata.json");
  const artifact = {
    schema_version: "1.0.0",
    artifact_type: "founder_validated_product_intelligence",
    created_at: createdAt,
    source_object_id: sourcePio.metadata.object_id,
    product_intelligence_object: correctedPio,
    founder_validation: { correction_ids: [correction.id], status: "validated", effective_paths: [correction.target_path] }
  };
  await Promise.all([
    writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
    writeFile(metadataPath, `${JSON.stringify({ artifact_type: "product_intelligence_founder_validation_metadata", created_at: createdAt, source_evidence_changed: false, ai_calls: 0, external_requests: 0, known_next_slice_requirement: knownNextSliceRequirement }, null, 2)}\n`, { encoding: "utf8", flag: "wx" })
  ]);
  return { artifact, correctedPio, paths: { directory, artifact: artifactPath, metadata: metadataPath } };
}
