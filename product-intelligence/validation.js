import {
  HUMAN_CORRECTION_STATUSES,
  KNOWLEDGE_GAP_IMPORTANCE,
  KNOWLEDGE_STATUSES,
  KNOWLEDGE_TYPES,
  PRODUCT_INTELLIGENCE_SCHEMA_VERSION,
  RELATIONSHIP_TYPES,
  SOURCE_TYPES,
  VALIDATION_STATUSES
} from "./contracts.js";
import { authorityRankFor } from "./authority.js";

export class ProductIntelligenceValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = "ProductIntelligenceValidationError";
    this.errors = errors;
  }
}

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const isoDate = (value) => nonEmpty(value) && !Number.isNaN(Date.parse(value));

function requiredString(value, path, errors) {
  if (!nonEmpty(value)) errors.push(`${path} must be a non-empty string.`);
}

function validateKnowledgeValue(value, path, errors, evidenceIds) {
  if (!isObject(value)) { errors.push(`${path} must be a knowledge value object.`); return; }
  if (!Object.hasOwn(value, "value")) errors.push(`${path}.value is required.`);
  if (!KNOWLEDGE_TYPES.includes(value.knowledge_type)) errors.push(`${path}.knowledge_type is not supported.`);
  if (!Array.isArray(value.evidence_refs)) errors.push(`${path}.evidence_refs must be an array.`);
  else {
    for (const ref of value.evidence_refs) {
      if (!nonEmpty(ref)) errors.push(`${path}.evidence_refs must contain non-empty strings.`);
      else if (!evidenceIds.has(ref)) errors.push(`${path}.evidence_refs contains unknown evidence ID ${ref}.`);
    }
  }
  if (typeof value.confidence !== "number" || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) {
    errors.push(`${path}.confidence must be a number between 0 and 1.`);
  }
  if (!KNOWLEDGE_STATUSES.includes(value.status)) errors.push(`${path}.status is not supported.`);
  if (value.knowledge_type === "unknown" && value.value !== null) errors.push(`${path}.value must be null when knowledge_type is unknown.`);
}

function validateKnowledgeArray(value, path, errors, evidenceIds, itemValidator) {
  if (value === undefined) return;
  if (!Array.isArray(value)) { errors.push(`${path} must be an array.`); return; }
  value.forEach((item, index) => {
    validateKnowledgeValue(item, `${path}[${index}]`, errors, evidenceIds);
    itemValidator?.(item, `${path}[${index}]`, errors);
  });
}

export function validateSourceEvidenceRecord(record, path = "source_evidence") {
  const errors = [];
  validateEvidence(record, path, errors);
  return errors;
}

function validateEvidence(record, path, errors) {
  if (!isObject(record)) { errors.push(`${path} must be an evidence record object.`); return; }
  for (const field of ["id", "source_type", "source_uri_or_location", "source_field", "retrieved_at", "content_fingerprint"]) {
    requiredString(record[field], `${path}.${field}`, errors);
  }
  if (!Object.hasOwn(record, "raw_value")) errors.push(`${path}.raw_value is required.`);
  if (!Object.hasOwn(record, "normalised_value")) errors.push(`${path}.normalised_value is required.`);
  if (!SOURCE_TYPES.includes(record.source_type)) errors.push(`${path}.source_type is not supported.`);
  if (!isoDate(record.retrieved_at)) errors.push(`${path}.retrieved_at must be a valid date-time.`);
  const expectedRank = authorityRankFor(record.source_type);
  if (!Number.isInteger(record.authority_rank) || record.authority_rank !== expectedRank) {
    errors.push(`${path}.authority_rank must match the central authority rule.`);
  }
}

export function validateProductIntelligenceObject(value) {
  const errors = [];
  if (!isObject(value)) return ["Product Intelligence Object must be an object."];
  for (const field of ["metadata", "product_identity", "source_evidence", "knowledge_gaps", "validation_status"]) {
    if (!Object.hasOwn(value, field)) errors.push(`${field} is required.`);
  }

  const metadata = value.metadata;
  if (!isObject(metadata)) errors.push("metadata must be an object.");
  else {
    for (const field of ["object_id", "product_url", "created_at", "updated_at", "ingestion_status", "source_fingerprint"]) requiredString(metadata[field], `metadata.${field}`, errors);
    if (metadata.schema_version !== PRODUCT_INTELLIGENCE_SCHEMA_VERSION) errors.push(`metadata.schema_version must be ${PRODUCT_INTELLIGENCE_SCHEMA_VERSION}.`);
    if (!isoDate(metadata.created_at)) errors.push("metadata.created_at must be a valid date-time.");
    if (!isoDate(metadata.updated_at)) errors.push("metadata.updated_at must be a valid date-time.");
    try { if (new URL(metadata.product_url).protocol === "") errors.push("metadata.product_url must be absolute."); } catch { errors.push("metadata.product_url must be a valid absolute URL."); }
  }

  if (!Array.isArray(value.source_evidence)) errors.push("source_evidence must be an array.");
  const evidenceIds = new Set();
  for (const [index, record] of (value.source_evidence || []).entries()) {
    validateEvidence(record, `source_evidence[${index}]`, errors);
    if (nonEmpty(record?.id)) {
      if (evidenceIds.has(record.id)) errors.push(`source_evidence contains duplicate ID ${record.id}.`);
      evidenceIds.add(record.id);
    }
  }

  if (!isObject(value.product_identity)) errors.push("product_identity must be an object.");
  else for (const field of ["product_name", "brand", "product_type"]) {
    if (!Object.hasOwn(value.product_identity, field)) errors.push(`product_identity.${field} is required.`);
    else validateKnowledgeValue(value.product_identity[field], `product_identity.${field}`, errors, evidenceIds);
  }
  for (const field of ["sku", "model_number", "barcode", "collection", "category"] ) {
    if (value.product_identity?.[field] !== undefined) validateKnowledgeValue(value.product_identity[field], `product_identity.${field}`, errors, evidenceIds);
  }
  validateKnowledgeArray(value.product_identity?.variants, "product_identity.variants", errors, evidenceIds);

  if (value.commercial_information !== undefined && !isObject(value.commercial_information)) errors.push("commercial_information must be an object.");
  for (const field of ["price", "currency", "availability", "sale_price", "stock_state"] ) {
    if (value.commercial_information?.[field] !== undefined) validateKnowledgeValue(value.commercial_information[field], `commercial_information.${field}`, errors, evidenceIds);
  }
  for (const field of ["variants", "bundles"]) validateKnowledgeArray(value.commercial_information?.[field], `commercial_information.${field}`, errors, evidenceIds);

  validateKnowledgeArray(value.specifications, "specifications", errors, evidenceIds, (item, path, itemErrors) => {
    requiredString(item.attribute, `${path}.attribute`, itemErrors);
    if (item.unit !== undefined && !nonEmpty(item.unit)) itemErrors.push(`${path}.unit must be a non-empty string when provided.`);
  });
  validateKnowledgeArray(value.features, "features", errors, evidenceIds);
  validateKnowledgeArray(value.benefits, "benefits", errors, evidenceIds, (item, path, itemErrors) => {
    if (item.supporting_feature_refs !== undefined && !Array.isArray(item.supporting_feature_refs)) itemErrors.push(`${path}.supporting_feature_refs must be an array.`);
    if (item.reasoning !== undefined && !nonEmpty(item.reasoning)) itemErrors.push(`${path}.reasoning must be a non-empty string when provided.`);
  });

  for (const section of ["customer_understanding", "usage_context", "existing_content"]) {
    if (value[section] !== undefined && !isObject(value[section])) errors.push(`${section} must be an object.`);
  }
  for (const field of ["problems_solved", "objections", "ideal_customers", "customer_groups"]) validateKnowledgeArray(value.customer_understanding?.[field], `customer_understanding.${field}`, errors, evidenceIds);
  for (const field of ["use_cases", "instructions", "limitations", "compatibility"]) validateKnowledgeArray(value.usage_context?.[field], `usage_context.${field}`, errors, evidenceIds);
  for (const field of ["current_description", "faqs", "internal_links", "guides", "images", "content_references"]) validateKnowledgeArray(value.existing_content?.[field], `existing_content.${field}`, errors, evidenceIds);

  validateKnowledgeArray(value.relationships, "relationships", errors, evidenceIds, (item, path, itemErrors) => {
    if (!RELATIONSHIP_TYPES.includes(item.relationship_type)) itemErrors.push(`${path}.relationship_type is not supported.`);
    if (!isObject(item.product_reference)) itemErrors.push(`${path}.product_reference must be an object.`);
    else if (![item.product_reference.id, item.product_reference.url, item.product_reference.name].some(nonEmpty)) itemErrors.push(`${path}.product_reference requires an id, URL or name.`);
  });

  if (!Array.isArray(value.knowledge_gaps)) errors.push("knowledge_gaps must be an array.");
  for (const [index, gap] of (value.knowledge_gaps || []).entries()) {
    const path = `knowledge_gaps[${index}]`;
    if (!isObject(gap)) { errors.push(`${path} must be an object.`); continue; }
    requiredString(gap.field, `${path}.field`, errors);
    requiredString(gap.reason, `${path}.reason`, errors);
    if (!KNOWLEDGE_GAP_IMPORTANCE.includes(gap.importance)) errors.push(`${path}.importance is not supported.`);
  }

  if (!VALIDATION_STATUSES.includes(value.validation_status)) errors.push("validation_status is not supported.");
  validateCorrections(value.human_corrections, errors, evidenceIds);
  validateConflicts(value.conflicts, errors, evidenceIds);
  validateExecutionMetadata(value.execution_metadata, errors);
  return errors;
}

function validateCorrections(corrections, errors, evidenceIds) {
  if (corrections === undefined) return;
  if (!Array.isArray(corrections)) { errors.push("human_corrections must be an array."); return; }
  for (const [index, correction] of corrections.entries()) {
    const path = `human_corrections[${index}]`;
    if (!isObject(correction)) { errors.push(`${path} must be an object.`); continue; }
    for (const field of ["id", "target_path", "reason", "created_at"]) requiredString(correction[field], `${path}.${field}`, errors);
    if (!Object.hasOwn(correction, "previous_value")) errors.push(`${path}.previous_value is required.`);
    if (!Object.hasOwn(correction, "corrected_value")) errors.push(`${path}.corrected_value is required.`);
    if (!HUMAN_CORRECTION_STATUSES.includes(correction.status)) errors.push(`${path}.status is not supported.`);
    if (!isoDate(correction.created_at)) errors.push(`${path}.created_at must be a valid date-time.`);
    if (!Array.isArray(correction.supersedes_evidence_refs)) errors.push(`${path}.supersedes_evidence_refs must be an array.`);
    else for (const ref of correction.supersedes_evidence_refs) if (!evidenceIds.has(ref)) errors.push(`${path}.supersedes_evidence_refs contains unknown evidence ID ${ref}.`);
  }
}

function validateConflicts(conflicts, errors, evidenceIds) {
  if (conflicts === undefined) return;
  if (!Array.isArray(conflicts)) { errors.push("conflicts must be an array."); return; }
  for (const [index, conflict] of conflicts.entries()) {
    const path = `conflicts[${index}]`;
    if (!isObject(conflict)) { errors.push(`${path} must be an object.`); continue; }
    requiredString(conflict.field, `${path}.field`, errors);
    requiredString(conflict.resolution_method, `${path}.resolution_method`, errors);
    if (!Array.isArray(conflict.candidates) || conflict.candidates.length < 2) errors.push(`${path}.candidates must contain at least two candidates.`);
    if (!Array.isArray(conflict.evidence_refs)) errors.push(`${path}.evidence_refs must be an array.`);
    else for (const ref of conflict.evidence_refs) if (!evidenceIds.has(ref)) errors.push(`${path}.evidence_refs contains unknown evidence ID ${ref}.`);
    if (!nonEmpty(conflict.provisional_evidence_ref) || !evidenceIds.has(conflict.provisional_evidence_ref)) errors.push(`${path}.provisional_evidence_ref must reference source evidence.`);
    if (typeof conflict.human_review_required !== "boolean") errors.push(`${path}.human_review_required must be boolean.`);
    if (!Object.hasOwn(conflict, "final_resolution")) errors.push(`${path}.final_resolution is required and may be null.`);
    if (conflict.final_resolution !== null && !isObject(conflict.final_resolution)) errors.push(`${path}.final_resolution must be an object or null.`);
  }
}

function validateExecutionMetadata(metadata, errors) {
  if (metadata === undefined) return;
  if (!isObject(metadata)) { errors.push("execution_metadata must be an object."); return; }
  for (const field of ["deterministic_steps", "ai_calls"]) if (metadata[field] !== undefined && !Array.isArray(metadata[field])) errors.push(`execution_metadata.${field} must be an array.`);
  for (const field of ["input_tokens", "output_tokens", "external_api_call_count"]) {
    if (metadata[field] !== undefined && (!Number.isInteger(metadata[field]) || metadata[field] < 0)) errors.push(`execution_metadata.${field} must be a non-negative integer.`);
  }
  if (metadata.estimated_cost !== undefined && (typeof metadata.estimated_cost !== "number" || !Number.isFinite(metadata.estimated_cost) || metadata.estimated_cost < 0)) errors.push("execution_metadata.estimated_cost must be a non-negative number.");
  if (metadata.model_used !== undefined && !nonEmpty(metadata.model_used)) errors.push("execution_metadata.model_used must be a non-empty string.");
}

export function assertValidProductIntelligenceObject(value) {
  const errors = validateProductIntelligenceObject(value);
  if (errors.length) throw new ProductIntelligenceValidationError("Product Intelligence Object failed validation.", errors);
  return value;
}
