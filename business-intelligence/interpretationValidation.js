import { validateBusinessIntelligenceObject } from "./validation.js";

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const forbiddenDemographic = /\b(?:aged?\s+\d|\d{2}\s*(?:-|to)\s*\d{2}|male|female|men|women|income|salary|occupation|middle[- ]class|wealthy|affluent|millennial|gen\s*z|boomer)\b/i;
const inferredIdentity = /\b(?:enthusiasts?|hobbyists?|professionals?|aficionados?|luxury\s+(?:buyers?|owners?)|lifestyle)\b/i;
const evaluativeCatalogueLanguage = /\b(?:premium|professional(?:[- ]grade)?|best|leading|superior|advanced|high[- ]performance|luxury|ultimate|finest|world[- ]class|high[- ]quality)\b/i;

export const FIELD_EVIDENCE_ELIGIBILITY = Object.freeze({
  objective_representative_product: Object.freeze(["observed_fact"]),
  positioning_business_claim: Object.freeze(["positioning_claim"]),
  positioning_interpretation: Object.freeze(["observed_fact", "positioning_claim"]),
  business_identity_business_claim: Object.freeze(["positioning_claim"]),
  business_identity_interpretation: Object.freeze(["observed_fact", "positioning_claim"]),
  catalogue_business_claim: Object.freeze(["positioning_claim"]),
  catalogue_interpretation: Object.freeze(["observed_fact", "positioning_claim"]),
  customer_business_claim: Object.freeze(["customer_claim"]),
  customer_interpretation: Object.freeze(["observed_fact", "customer_claim"])
});

function comparableEntityName(value) { return String(value ?? "").toLowerCase().replace(/[–—]/g, "-").replace(/[^a-z0-9]+/g, " ").trim(); }
function observedEntityNames(record) {
  if (record?.claim_classification !== "observed_fact") return [];
  if (typeof record.normalised_value === "string") return [record.normalised_value];
  if (!isObject(record.normalised_value)) return [];
  return ["label", "name", "title", "product_name", "category_name"].map((field) => record.normalised_value[field]).filter((value) => typeof value === "string");
}

function visitKnowledge(value, path, visit) {
  if (Array.isArray(value)) return value.forEach((item, index) => visitKnowledge(item, `${path}[${index}]`, visit));
  if (!isObject(value)) return;
  if (Object.hasOwn(value, "knowledge_type") && Object.hasOwn(value, "evidence_refs")) visit(value, path);
  for (const [key, child] of Object.entries(value)) if (!["value", "evidence_refs"].includes(key)) visitKnowledge(child, `${path}.${key}`, visit);
}

function isCustomerKnowledgePath(path) {
  return path.startsWith("$.customer_understanding.") || /\$\.category_audiences\[\d+\]\.(?:target_customer_groups|customer_behaviours|customer_motivations|customer_priorities|purchase_drivers)/.test(path);
}

function enforceEvidenceEligibility({ knowledge, path, evidenceById, errors }) {
  if (knowledge.knowledge_type === "unknown") return;
  const cited = knowledge.evidence_refs.map((ref) => evidenceById.get(ref)).filter(Boolean);
  let rule = null;
  if (path.startsWith("$.catalogue_understanding.representative_product_refs[") && knowledge.assertion_scope === "objective") rule = "objective_representative_product";
  else if (path.startsWith("$.positioning.") && knowledge.assertion_scope === "business_claim") rule = "positioning_business_claim";
  else if (path.startsWith("$.positioning.") && knowledge.assertion_scope === "interpretation") rule = "positioning_interpretation";
  else if (path.startsWith("$.business_identity.") && knowledge.assertion_scope === "business_claim") rule = "business_identity_business_claim";
  else if (path.startsWith("$.business_identity.") && knowledge.assertion_scope === "interpretation") rule = "business_identity_interpretation";
  else if (path.startsWith("$.catalogue_understanding.") && knowledge.assertion_scope === "business_claim") rule = "catalogue_business_claim";
  else if (path.startsWith("$.catalogue_understanding.") && knowledge.assertion_scope === "interpretation") rule = "catalogue_interpretation";
  else if (isCustomerKnowledgePath(path) && knowledge.assertion_scope === "business_claim") rule = "customer_business_claim";
  else if (isCustomerKnowledgePath(path) && knowledge.assertion_scope === "interpretation") rule = "customer_interpretation";
  if (!rule) return;
  const allowed = FIELD_EVIDENCE_ELIGIBILITY[rule];
  const ineligible = cited.filter((record) => !allowed.includes(record.claim_classification));
  if (ineligible.length) errors.push(`${path} uses evidence ineligible for ${rule}: ${[...new Set(ineligible.map((record) => record.claim_classification))].join(", ")}; allowed: ${allowed.join(", ")}.`);
}

export function validateInterpretedBusinessIntelligence(bio, assumptions = []) {
  const errors = validateBusinessIntelligenceObject(bio);
  const evidenceById = new Map(bio.source_evidence.map((record) => [record.id, record]));
  visitKnowledge(bio, "$", (knowledge, path) => {
    if (knowledge.knowledge_type !== "unknown" && !knowledge.evidence_refs.length) errors.push(`${path} is unsupported: non-unknown knowledge requires evidence_refs.`);
    if (["derived", "inference"].includes(knowledge.knowledge_type) && knowledge.status !== "inferred") errors.push(`${path}.status must be inferred for AI interpretation.`);
    if (knowledge.knowledge_type === "fact" && knowledge.status !== "extracted") errors.push(`${path}.status must be extracted for AI-classified facts.`);
    if (typeof knowledge.value === "string" && forbiddenDemographic.test(knowledge.value)) errors.push(`${path} contains unsupported demographic profiling.`);
    if (path === "$.business_identity.geographic_market" && ["derived", "inference"].includes(knowledge.knowledge_type)) errors.push(`${path} cannot be inferred from indirect signals; use direct fact/claim evidence or unknown.`);
    if ((path.startsWith("$.positioning.") || path.startsWith("$.customer_understanding.") || /\.category_audiences\[\d+\]\.(?:target_customer_groups|customer_behaviours|customer_motivations|customer_priorities|purchase_drivers)/.test(path)) && knowledge.assertion_scope === "objective") errors.push(`${path} cannot be objective in this interpretation field.`);
    if ((path.startsWith("$.customer_understanding.") || path.includes(".category_audiences[")) && ["derived", "inference"].includes(knowledge.knowledge_type) && typeof knowledge.value === "string" && inferredIdentity.test(knowledge.value)) errors.push(`${path} contains an inferred customer identity label; direct claim evidence is required.`);
    if (path.startsWith("$.catalogue_understanding.") && knowledge.assertion_scope === "objective" && typeof knowledge.value === "string" && evaluativeCatalogueLanguage.test(knowledge.value)) {
      const exactObservedEntity = knowledge.evidence_refs.some((ref) => observedEntityNames(evidenceById.get(ref)).some((name) => comparableEntityName(name) === comparableEntityName(knowledge.value)));
      if (!exactObservedEntity) errors.push(`${path} uses evaluative marketing language as an objective catalogue fact without an exact observed entity-name match.`);
    }
    if (knowledge.assertion_scope === "objective") {
      const cited = knowledge.evidence_refs.map((ref) => evidenceById.get(ref)).filter(Boolean);
      const observed = cited.filter((record) => record.claim_classification === "observed_fact").length;
      const claims = cited.filter((record) => ["positioning_claim", "customer_claim"].includes(record.claim_classification)).length;
      if (claims > observed) errors.push(`${path} is supported primarily by marketing claims and cannot be objective.`);
    }
    enforceEvidenceEligibility({ knowledge, path, evidenceById, errors });
  });
  const evidenceIds = new Set(evidenceById.keys());
  for (const [index, assumption] of assumptions.entries()) {
    if (!isObject(assumption) || typeof assumption.statement !== "string" || !assumption.statement.trim()) errors.push(`assumptions[${index}].statement is required.`);
    if (!Array.isArray(assumption?.evidence_refs)) errors.push(`assumptions[${index}].evidence_refs must be an array.`);
    else for (const ref of assumption.evidence_refs) if (!evidenceIds.has(ref)) errors.push(`assumptions[${index}] contains unknown evidence ID ${ref}.`);
    if (typeof assumption?.confidence !== "number" || assumption.confidence < 0 || assumption.confidence > 1) errors.push(`assumptions[${index}].confidence must be between 0 and 1.`);
  }
  if (bio.validation_status !== "awaiting_validation") errors.push("validation_status must remain awaiting_validation before human review.");
  if (bio.human_validation_decisions?.length || bio.human_corrections?.length) errors.push("AI interpretation must not create human validation decisions or corrections.");
  return errors;
}
