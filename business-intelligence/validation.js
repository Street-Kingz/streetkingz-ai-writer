import {
  ASSERTION_SCOPES, AUDIENCE_ARCHITECTURE_TYPES, BUSINESS_INTELLIGENCE_SCHEMA_VERSION, BUSINESS_KNOWLEDGE_STATUSES,
  BUSINESS_KNOWLEDGE_TYPES, BUSINESS_SOURCE_ROLES, BUSINESS_SOURCE_TYPES, BUSINESS_TYPES, BUSINESS_WIDE_AUDIENCE_STATUSES,
  CATALOGUE_COHERENCE, CLAIM_CLASSIFICATIONS, HUMAN_CORRECTION_STATUSES, HUMAN_DECISION_STATUSES,
  HUMAN_VALIDATION_ACTIONS, KNOWLEDGE_GAP_IMPORTANCE, PRICE_VALUE_ORIENTATIONS, VALIDATION_STATUSES, AUTHORITY_DOMAINS
} from "./contracts.js";

export class BusinessIntelligenceValidationError extends Error {
  constructor(message, errors) { super(message); this.name = "BusinessIntelligenceValidationError"; this.errors = errors; }
}

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const isoDate = (value) => nonEmpty(value) && !Number.isNaN(Date.parse(value));
const requiredString = (value, path, errors) => { if (!nonEmpty(value)) errors.push(`${path} must be a non-empty string.`); };

function validateEvidence(record, path, errors) {
  if (!isObject(record)) { errors.push(`${path} must be an evidence object.`); return; }
  for (const field of ["id", "source_type", "source_uri_or_location", "source_role", "source_field", "retrieved_at", "content_fingerprint", "claim_classification"]) requiredString(record[field], `${path}.${field}`, errors);
  if (!Object.hasOwn(record, "raw_value")) errors.push(`${path}.raw_value is required.`);
  if (!Object.hasOwn(record, "normalised_value")) errors.push(`${path}.normalised_value is required.`);
  if (!BUSINESS_SOURCE_TYPES.includes(record.source_type)) errors.push(`${path}.source_type is unsupported.`);
  if (!BUSINESS_SOURCE_ROLES.includes(record.source_role)) errors.push(`${path}.source_role is unsupported.`);
  if (!CLAIM_CLASSIFICATIONS.includes(record.claim_classification)) errors.push(`${path}.claim_classification is unsupported.`);
  if (!isoDate(record.retrieved_at)) errors.push(`${path}.retrieved_at must be a valid date-time.`);
  if (record.source_role === "inference_output" && record.source_type !== "ai_inference") errors.push(`${path}.source_role inference_output requires source_type ai_inference.`);
}

export function validateBusinessSourceEvidenceRecord(record, path = "source_evidence") { const errors = []; validateEvidence(record, path, errors); return errors; }

function validateKnowledge(value, path, errors, evidenceById, allowedValues) {
  if (!isObject(value)) { errors.push(`${path} must be a BusinessKnowledgeValue.`); return; }
  if (!Object.hasOwn(value, "value")) errors.push(`${path}.value is required.`);
  if (!BUSINESS_KNOWLEDGE_TYPES.includes(value.knowledge_type)) errors.push(`${path}.knowledge_type is unsupported.`);
  if (!ASSERTION_SCOPES.includes(value.assertion_scope)) errors.push(`${path}.assertion_scope is unsupported.`);
  if (!BUSINESS_KNOWLEDGE_STATUSES.includes(value.status)) errors.push(`${path}.status is unsupported.`);
  if (typeof value.confidence !== "number" || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) errors.push(`${path}.confidence must be between 0 and 1.`);
  if (!Array.isArray(value.evidence_refs)) errors.push(`${path}.evidence_refs must be an array.`);
  else for (const ref of value.evidence_refs) if (!evidenceById.has(ref)) errors.push(`${path}.evidence_refs contains unknown evidence ID ${ref}.`);
  if (value.knowledge_type === "unknown") {
    if (value.value !== null || value.assertion_scope !== "unknown" || value.confidence !== 0) errors.push(`${path} unknown knowledge must have null value, unknown assertion_scope and zero confidence.`);
  } else {
    if (value.assertion_scope === "unknown") errors.push(`${path}.assertion_scope cannot be unknown for known knowledge.`);
    if (!value.evidence_refs?.length && value.status !== "human_corrected") errors.push(`${path} non-unknown automated knowledge requires evidence_refs.`);
  }
  if (["derived", "inference"].includes(value.knowledge_type) && value.assertion_scope !== "interpretation") errors.push(`${path} derived/inference knowledge must use interpretation assertion_scope.`);
  if (value.knowledge_type === "fact" && value.assertion_scope === "interpretation") errors.push(`${path} factual knowledge cannot use interpretation assertion_scope.`);
  if (allowedValues && value.knowledge_type !== "unknown" && !allowedValues.includes(value.value)) errors.push(`${path}.value is unsupported.`);
  if (value.assertion_scope === "objective" && value.status === "extracted" && value.evidence_refs?.length) {
    const evidence = value.evidence_refs.map((ref) => evidenceById.get(ref)).filter(Boolean);
    if (evidence.length && !evidence.some((record) => record.claim_classification === "observed_fact")) errors.push(`${path} objective fact cannot be supported only by business marketing claims or unclassified evidence.`);
  }
  if (value.assertion_scope === "business_claim" && value.evidence_refs?.length) {
    const evidence = value.evidence_refs.map((ref) => evidenceById.get(ref)).filter(Boolean);
    if (evidence.length && !evidence.some((record) => ["positioning_claim", "customer_claim"].includes(record.claim_classification))) errors.push(`${path} business_claim requires claim-classified evidence.`);
  }
}

function validateKnowledgeArray(value, path, errors, evidenceById) {
  if (value === undefined) return;
  if (!Array.isArray(value)) { errors.push(`${path} must be an array.`); return; }
  value.forEach((item, index) => validateKnowledge(item, `${path}[${index}]`, errors, evidenceById));
}

export function validateBusinessIntelligenceObject(value) {
  const errors = [];
  if (!isObject(value)) return ["Business Intelligence Object must be an object."];
  for (const field of ["metadata", "business_identity", "catalogue_understanding", "audience_architecture", "source_evidence", "knowledge_gaps", "validation_status"]) if (!Object.hasOwn(value, field)) errors.push(`${field} is required.`);
  const metadata = value.metadata;
  if (!isObject(metadata)) errors.push("metadata must be an object.");
  else {
    for (const field of ["object_id", "business_id", "primary_domain", "created_at", "updated_at", "source_fingerprint", "ingestion_status"]) requiredString(metadata[field], `metadata.${field}`, errors);
    if (metadata.schema_version !== BUSINESS_INTELLIGENCE_SCHEMA_VERSION) errors.push(`metadata.schema_version must be ${BUSINESS_INTELLIGENCE_SCHEMA_VERSION}.`);
    for (const field of ["created_at", "updated_at"]) if (!isoDate(metadata[field])) errors.push(`metadata.${field} must be a valid date-time.`);
    try { const url = new URL(metadata.primary_domain); if (!/^https?:$/.test(url.protocol)) throw new Error(); } catch { errors.push("metadata.primary_domain must be a valid absolute HTTP(S) URL."); }
  }
  if (!Array.isArray(value.source_evidence)) errors.push("source_evidence must be an array.");
  const evidenceById = new Map();
  for (const [index, evidence] of (value.source_evidence || []).entries()) { validateEvidence(evidence, `source_evidence[${index}]`, errors); if (nonEmpty(evidence?.id)) { if (evidenceById.has(evidence.id)) errors.push(`source_evidence contains duplicate ID ${evidence.id}.`); evidenceById.set(evidence.id, evidence); } }

  if (!isObject(value.business_identity)) errors.push("business_identity must be an object.");
  else {
    for (const field of ["business_name", "business_type"]) if (!Object.hasOwn(value.business_identity, field)) errors.push(`business_identity.${field} is required.`);
    validateKnowledge(value.business_identity?.business_name, "business_identity.business_name", errors, evidenceById);
    validateKnowledge(value.business_identity?.business_type, "business_identity.business_type", errors, evidenceById, BUSINESS_TYPES);
    for (const field of ["owned_brand_status", "geographic_market", "sales_channel", "business_description"]) if (value.business_identity?.[field] !== undefined) validateKnowledge(value.business_identity[field], `business_identity.${field}`, errors, evidenceById);
  }

  if (!isObject(value.catalogue_understanding)) errors.push("catalogue_understanding must be an object.");
  else {
    for (const field of ["product_focus", "primary_categories", "catalogue_coherence"]) if (!Object.hasOwn(value.catalogue_understanding, field)) errors.push(`catalogue_understanding.${field} is required.`);
    validateKnowledge(value.catalogue_understanding?.product_focus, "catalogue_understanding.product_focus", errors, evidenceById);
    validateKnowledgeArray(value.catalogue_understanding?.primary_categories, "catalogue_understanding.primary_categories", errors, evidenceById);
    validateKnowledge(value.catalogue_understanding?.catalogue_coherence, "catalogue_understanding.catalogue_coherence", errors, evidenceById, CATALOGUE_COHERENCE);
    for (const field of ["secondary_categories", "representative_product_refs", "catalogue_limitations"]) validateKnowledgeArray(value.catalogue_understanding?.[field], `catalogue_understanding.${field}`, errors, evidenceById);
  }

  if (!isObject(value.audience_architecture)) errors.push("audience_architecture must be an object.");
  else {
    for (const field of ["type", "business_wide_profile_status"]) if (!Object.hasOwn(value.audience_architecture, field)) errors.push(`audience_architecture.${field} is required.`);
    validateKnowledge(value.audience_architecture?.type, "audience_architecture.type", errors, evidenceById, AUDIENCE_ARCHITECTURE_TYPES);
    validateKnowledge(value.audience_architecture?.business_wide_profile_status, "audience_architecture.business_wide_profile_status", errors, evidenceById, BUSINESS_WIDE_AUDIENCE_STATUSES);
  }

  for (const section of ["customer_understanding", "positioning"]) if (value[section] !== undefined && !isObject(value[section])) errors.push(`${section} must be an object.`);
  for (const field of ["target_customer_groups", "customer_behaviours", "customer_motivations", "customer_priorities", "customer_problems", "purchase_drivers", "exclusions"]) validateKnowledgeArray(value.customer_understanding?.[field], `customer_understanding.${field}`, errors, evidenceById);
  for (const field of ["value_proposition", "positioning_themes", "differentiators", "positioning_claims"]) validateKnowledgeArray(value.positioning?.[field], `positioning.${field}`, errors, evidenceById);
  if (value.positioning?.price_value_orientation !== undefined) validateKnowledge(value.positioning.price_value_orientation, "positioning.price_value_orientation", errors, evidenceById, PRICE_VALUE_ORIENTATIONS);

  if (value.category_audiences !== undefined && !Array.isArray(value.category_audiences)) errors.push("category_audiences must be an array.");
  for (const [index, category] of (value.category_audiences || []).entries()) {
    const base = `category_audiences[${index}]`;
    if (!isObject(category)) { errors.push(`${base} must be an object.`); continue; }
    requiredString(category.category_ref, `${base}.category_ref`, errors);
    for (const field of ["category_name", "audience_profile_status"]) if (!Object.hasOwn(category, field)) errors.push(`${base}.${field} is required.`);
    validateKnowledge(category.category_name, `${base}.category_name`, errors, evidenceById);
    validateKnowledge(category.audience_profile_status, `${base}.audience_profile_status`, errors, evidenceById, BUSINESS_WIDE_AUDIENCE_STATUSES);
    for (const field of ["target_customer_groups", "customer_behaviours", "customer_motivations", "customer_priorities", "purchase_drivers"]) validateKnowledgeArray(category[field], `${base}.${field}`, errors, evidenceById);
  }

  if (!Array.isArray(value.knowledge_gaps)) errors.push("knowledge_gaps must be an array.");
  for (const [index, gap] of (value.knowledge_gaps || []).entries()) { const base = `knowledge_gaps[${index}]`; if (!isObject(gap)) { errors.push(`${base} must be an object.`); continue; } requiredString(gap.field, `${base}.field`, errors); requiredString(gap.reason, `${base}.reason`, errors); if (!KNOWLEDGE_GAP_IMPORTANCE.includes(gap.importance)) errors.push(`${base}.importance is unsupported.`); if (gap.evidence_refs !== undefined && !Array.isArray(gap.evidence_refs)) errors.push(`${base}.evidence_refs must be an array.`); else for (const ref of gap.evidence_refs || []) if (!evidenceById.has(ref)) errors.push(`${base}.evidence_refs contains unknown evidence ID ${ref}.`); }
  validateConflicts(value.conflicts, errors, evidenceById);
  validateHumanDecisions(value.human_validation_decisions, errors);
  validateCorrections(value.human_corrections, errors, evidenceById);
  if (!VALIDATION_STATUSES.includes(value.validation_status)) errors.push("validation_status is unsupported.");
  validateExecution(value.execution_metadata, errors);
  return errors;
}

function validateConflicts(conflicts, errors, evidenceById) {
  if (conflicts === undefined) return; if (!Array.isArray(conflicts)) { errors.push("conflicts must be an array."); return; }
  for (const [index, conflict] of conflicts.entries()) { const base = `conflicts[${index}]`; if (!isObject(conflict)) { errors.push(`${base} must be an object.`); continue; } for (const field of ["id", "field_path", "authority_domain", "resolution_method"]) requiredString(conflict[field], `${base}.${field}`, errors); if (!AUTHORITY_DOMAINS.includes(conflict.authority_domain)) errors.push(`${base}.authority_domain is unsupported.`); if (!Array.isArray(conflict.candidates) || conflict.candidates.length < 2) errors.push(`${base}.candidates must contain at least two candidates.`); if (!Array.isArray(conflict.evidence_refs)) errors.push(`${base}.evidence_refs must be an array.`); else for (const ref of conflict.evidence_refs) if (!evidenceById.has(ref)) errors.push(`${base}.evidence_refs contains unknown evidence ID ${ref}.`); if (!isObject(conflict.provisional_selection)) errors.push(`${base}.provisional_selection must be an object.`); if (typeof conflict.human_review_required !== "boolean") errors.push(`${base}.human_review_required must be boolean.`); if (!Object.hasOwn(conflict, "final_resolution")) errors.push(`${base}.final_resolution is required.`); }
}

function validateHumanDecisions(decisions, errors) {
  if (decisions === undefined) return; if (!Array.isArray(decisions)) { errors.push("human_validation_decisions must be an array."); return; }
  for (const [index, decision] of decisions.entries()) { const base = `human_validation_decisions[${index}]`; if (!isObject(decision)) { errors.push(`${base} must be an object.`); continue; } for (const field of ["id", "target_path", "reason", "reviewer", "created_at"]) requiredString(decision[field], `${base}.${field}`, errors); if (!Object.hasOwn(decision, "original_value")) errors.push(`${base}.original_value is required.`); if (!HUMAN_VALIDATION_ACTIONS.includes(decision.action)) errors.push(`${base}.action is unsupported.`); if (!HUMAN_DECISION_STATUSES.includes(decision.status)) errors.push(`${base}.status is unsupported.`); if (!isoDate(decision.created_at)) errors.push(`${base}.created_at must be a valid date-time.`); if (decision.action === "correct" && !nonEmpty(decision.correction_id)) errors.push(`${base}.correction_id is required for correct.`); if (decision.action !== "correct" && decision.correction_id !== null) errors.push(`${base}.correction_id must be null unless action is correct.`); }
}

function validateCorrections(corrections, errors, evidenceById) {
  if (corrections === undefined) return; if (!Array.isArray(corrections)) { errors.push("human_corrections must be an array."); return; }
  for (const [index, correction] of corrections.entries()) { const base = `human_corrections[${index}]`; if (!isObject(correction)) { errors.push(`${base} must be an object.`); continue; } for (const field of ["id", "target_path", "reason", "reviewer", "created_at"]) requiredString(correction[field], `${base}.${field}`, errors); for (const field of ["previous_value", "corrected_value"]) if (!Object.hasOwn(correction, field)) errors.push(`${base}.${field} is required.`); if (!HUMAN_CORRECTION_STATUSES.includes(correction.status)) errors.push(`${base}.status is unsupported.`); if (!isoDate(correction.created_at)) errors.push(`${base}.created_at must be a valid date-time.`); if (correction.provenance?.source_type !== "human_validation") errors.push(`${base}.provenance must identify human_validation.`); if (!Array.isArray(correction.supersedes_evidence_refs)) errors.push(`${base}.supersedes_evidence_refs must be an array.`); else for (const ref of correction.supersedes_evidence_refs) if (!evidenceById.has(ref)) errors.push(`${base}.supersedes_evidence_refs contains unknown evidence ID ${ref}.`); }
}

function validateExecution(metadata, errors) {
  if (metadata === undefined) return; if (!isObject(metadata)) { errors.push("execution_metadata must be an object."); return; }
  for (const field of ["deterministic_steps", "ai_calls"]) if (metadata[field] !== undefined && !Array.isArray(metadata[field])) errors.push(`execution_metadata.${field} must be an array.`);
  for (const field of ["input_tokens", "output_tokens", "external_api_call_count"]) if (metadata[field] !== undefined && (!Number.isInteger(metadata[field]) || metadata[field] < 0)) errors.push(`execution_metadata.${field} must be a non-negative integer.`);
  if (metadata.estimated_cost !== undefined && (!Number.isFinite(metadata.estimated_cost) || metadata.estimated_cost < 0)) errors.push("execution_metadata.estimated_cost must be a non-negative number.");
}

export function assertValidBusinessIntelligenceObject(value) { const errors = validateBusinessIntelligenceObject(value); if (errors.length) throw new BusinessIntelligenceValidationError("Business Intelligence Object failed validation.", errors); return value; }
