import { validateProductIntelligenceObject } from "./validation.js";

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

function visitKnowledge(value, path, visit) {
  if (Array.isArray(value)) return value.forEach((item, index) => visitKnowledge(item, `${path}[${index}]`, visit));
  if (!isObject(value)) return;
  if (Object.hasOwn(value, "knowledge_type") && Object.hasOwn(value, "evidence_refs")) visit(value, path);
  for (const [key, child] of Object.entries(value)) if (!['value', 'evidence_refs', 'supporting_feature_refs'].includes(key)) visitKnowledge(child, `${path}.${key}`, visit);
}

export function validateInterpretedProductIntelligence(pio, assumptions = []) {
  const errors = validateProductIntelligenceObject(pio);
  visitKnowledge(pio, "$", (knowledge, path) => {
    if (knowledge.knowledge_type !== "unknown" && knowledge.evidence_refs.length === 0) errors.push(`${path} is unsupported: non-unknown knowledge requires evidence_refs.`);
    if (["derived", "inference"].includes(knowledge.knowledge_type) && knowledge.status !== "inferred") errors.push(`${path}.status must be inferred for AI-derived knowledge.`);
    if (knowledge.knowledge_type === "fact" && !["extracted", "conflicted"].includes(knowledge.status)) errors.push(`${path}.status must be extracted or conflicted for AI-classified facts.`);
  });
  const evidenceIds = new Set(pio.source_evidence.map((record) => record.id));
  for (const [index, assumption] of assumptions.entries()) {
    if (!isObject(assumption) || typeof assumption.statement !== "string" || !assumption.statement.trim()) errors.push(`assumptions[${index}].statement is required.`);
    if (!Array.isArray(assumption?.evidence_refs)) errors.push(`assumptions[${index}].evidence_refs must be an array.`);
    else for (const ref of assumption.evidence_refs) if (!evidenceIds.has(ref)) errors.push(`assumptions[${index}] contains unknown evidence ID ${ref}.`);
    if (typeof assumption?.confidence !== "number" || assumption.confidence < 0 || assumption.confidence > 1) errors.push(`assumptions[${index}].confidence must be between 0 and 1.`);
  }
  return errors;
}
