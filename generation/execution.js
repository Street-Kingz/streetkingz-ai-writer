import { sha256, stableId } from "../research/core/canonical.js";
import { EXECUTION_RESOLUTION_SCHEMA_VERSION, EXECUTION_ROLES, EXECUTION_STATES, GENERATION_OPERATIONS } from "./contracts.js";
import { validateApprovalArtifact } from "./approval.js";

const sortedUnique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "en"));
const recordText = (record) => JSON.stringify(record?.observation || "");
const matchesAll = (text, patterns = []) => patterns.every((pattern) => new RegExp(pattern, "i").test(text));

function pageArea(context, area) {
  return context.current_page_inventory?.decision_areas.find((item) => item.decision_area === area);
}

function baseResolution(approval) {
  const decision = approval.original_interpretation;
  return {
    action_id: approval.action_id,
    decision_area: approval.decision_area,
    source_interpretation_outcome: decision.outcome,
    source_current_state: decision.current_state,
    human_status: approval.approval_state,
    human_modification: approval.human_modification,
    implementation_conditions: [...approval.implementation_conditions],
    execution_status: "no_output",
    execution_role: "none",
    execution_rationale: "No executable output was authorised.",
    required_evidence_ids: [],
    required_current_page_evidence_ids: [],
    missing_requirements: [],
    allowed_generation_operation: null,
    prohibited_operations: [...GENERATION_OPERATIONS],
    comparison_support: null,
    shared_constraint: null
  };
}

function resolveCopyChange(result, directive, approval, context, evidenceById) {
  const inventory = pageArea(context, approval.decision_area);
  const decisionEvidence = approval.original_evidence_ids.map((id) => evidenceById.get(id)).filter(Boolean);
  const productFacts = decisionEvidence.filter((record) => record.evidence_category === "product_facts");
  const missingFacts = (directive.required_product_facts || []).filter((requirement) => !productFacts.some((record) => matchesAll(recordText(record), requirement.patterns)));
  const refs = inventory?.current_page_fact_refs || [];
  const missingTargets = (directive.required_current_content || []).filter((requirement) => !refs.some((ref) => matchesAll(`${ref.field_path} ${JSON.stringify(ref.value)}`, requirement.patterns)));
  if (directive.operation === "move" && !(directive.rendered_page_state_evidence_ids || []).length) {
    result.execution_status = "requires_page_state";
    result.execution_rationale = "Moving existing content requires rendered position or layout evidence that is not available.";
    result.missing_requirements = ["rendered position or layout evidence"];
    return;
  }
  if (missingFacts.length) {
    result.execution_status = "insufficient_evidence";
    result.execution_rationale = "Required factual support for the narrowed copy task is unavailable.";
    result.missing_requirements = missingFacts.map((item) => item.label);
    return;
  }
  if (!inventory || inventory.presence !== "present" || missingTargets.length) {
    result.execution_status = "requires_page_state";
    result.execution_rationale = "The approved copy task lacks deterministically identified current target content.";
    result.missing_requirements = missingTargets.length ? missingTargets.map((item) => item.label) : ["known existing target content"];
    return;
  }
  result.execution_status = "authorised";
  result.execution_role = "generation_action";
  result.execution_rationale = "The human modification narrows execution to known existing copy with sufficient factual support.";
  result.allowed_generation_operation = directive.operation;
  result.prohibited_operations = GENERATION_OPERATIONS.filter((operation) => operation !== directive.operation && operation !== "no_output");
  result.required_evidence_ids = sortedUnique(productFacts.map((record) => record.evidence_id));
  result.required_current_page_evidence_ids = sortedUnique(refs.filter((ref) => (directive.required_current_content || []).some((requirement) => matchesAll(`${ref.field_path} ${JSON.stringify(ref.value)}`, requirement.patterns))).map((ref) => ref.evidence_id));
}

function resolveFaq(result, directive, context, evidenceById) {
  const questionRecords = (directive.question_evidence_ids || []).map((id) => evidenceById.get(id)).filter((record) => record?.evidence_category === "serp_advanced");
  const productRecords = (context.citation_registry?.records || []).filter((record) => record.evidence_category === "product_facts");
  const answerEvidence = productRecords.filter((record) => (directive.answer_requirements || []).some((requirement) => matchesAll(recordText(record), requirement.patterns)));
  if (!questionRecords.length) {
    result.execution_status = "insufficient_evidence";
    result.execution_rationale = "The proposed FAQ question is not supported by supplied question evidence.";
    result.missing_requirements = ["supported customer question"];
    return;
  }
  const missing = (directive.answer_requirements || []).filter((requirement) => !answerEvidence.some((record) => matchesAll(recordText(record), requirement.patterns)));
  if (missing.length) {
    result.execution_status = "insufficient_evidence";
    result.execution_rationale = "PAA supports the question, but Product Facts do not support a useful side-selection answer without inference.";
    result.required_evidence_ids = questionRecords.map((record) => record.evidence_id);
    result.missing_requirements = missing.map((item) => item.label);
    return;
  }
  result.execution_status = "authorised";
  result.execution_role = "generation_action";
  result.execution_rationale = "Both the customer question and a product-specific answer are directly supported.";
  result.allowed_generation_operation = "insert";
  result.prohibited_operations = GENERATION_OPERATIONS.filter((operation) => !["insert", "no_output"].includes(operation));
  result.required_evidence_ids = sortedUnique([...questionRecords, ...answerEvidence].map((record) => record.evidence_id));
}

function comparisonAttributeSupport(attribute, entity, evidenceById, sourceProduct) {
  for (const id of attribute.evidence_ids || []) {
    const record = evidenceById.get(id);
    if (!record || record.evidence_category !== "product_facts") continue;
    const text = recordText(record);
    const attributeMatches = matchesAll(text, attribute.patterns);
    const ownershipMatches = entity.ownership === "source_product"
      ? sourceProduct?.subject_id && (entity.entity_id === sourceProduct.subject_id || entity.entity_id === "source_product")
      : (entity.aliases || []).some((alias) => new RegExp(`${alias}(?:\\s+towel|\\s+product)?\\s+(?:is|are|has|holds|feels|glides)`, "i").test(text));
    if (attributeMatches && ownershipMatches) return id;
  }
  return null;
}

function resolveComparison(result, directive, context, evidenceById) {
  const support = [];
  const missing = [];
  for (const entity of directive.entities || []) for (const attribute of entity.attributes || []) {
    const evidenceId = comparisonAttributeSupport(attribute, entity, evidenceById, context.source_product);
    if (evidenceId) support.push({ entity_id: entity.entity_id, entity_name: entity.entity_name, attribute: attribute.name, evidence_ids: [evidenceId] });
    else missing.push(`${entity.entity_name}: ${attribute.name}`);
  }
  result.comparison_support = support;
  if (missing.length) {
    result.execution_status = "insufficient_evidence";
    result.execution_rationale = "One or more approved comparison attributes lack evidence owned by the described product.";
    result.missing_requirements = missing;
    result.required_evidence_ids = sortedUnique(support.flatMap((item) => item.evidence_ids));
    return;
  }
  const inventory = pageArea(context, "comparisons");
  if (inventory?.component_states?.comparison_content_elsewhere !== "present") {
    result.execution_status = "requires_page_state";
    result.execution_rationale = "Existing comparison content cannot be identified for consolidation.";
    result.missing_requirements = ["existing XL 800GSM comparison content"];
    return;
  }
  result.execution_status = "authorised";
  result.execution_role = "generation_action";
  result.execution_rationale = "All approved attributes resolve to the correct product and existing FAQ comparison content is identified for bounded consolidation.";
  result.allowed_generation_operation = "replace";
  result.prohibited_operations = GENERATION_OPERATIONS.filter((operation) => !["replace", "no_output"].includes(operation));
  result.required_evidence_ids = sortedUnique(support.flatMap((item) => item.evidence_ids));
  result.required_current_page_evidence_ids = sortedUnique((inventory.current_page_fact_refs || []).map((ref) => ref.evidence_id));
}

export function resolveExecution({ interpretation, approvalArtifact, context }) {
  const approvalErrors = validateApprovalArtifact(approvalArtifact, interpretation);
  if (approvalErrors.length) throw Object.assign(new Error("Approval artifact is invalid."), { code: "INVALID_APPROVAL_ARTIFACT", errors: approvalErrors });
  const evidenceById = new Map((context.citation_registry?.records || []).map((record) => [record.evidence_id, record]));
  const decisions = approvalArtifact.decisions.map((approval) => {
    const result = baseResolution(approval);
    const directive = approval.execution_directive;
    if (["rejected", "pending"].includes(approval.approval_state)) {
      result.execution_rationale = `${approval.approval_state} human decisions cannot be authorised.`;
      return result;
    }
    if (["no_change", "insufficient_evidence"].includes(approval.original_interpretation.outcome) || directive?.type === "no_output") {
      result.execution_rationale = "The approved strategic decision is complete and authorises no generated content.";
      return result;
    }
    if (directive?.type === "shared_constraint") {
      result.execution_status = "authorised";
      result.execution_role = "shared_constraint";
      result.execution_rationale = "The approved positioning direction constrains relevant actions without creating standalone output.";
      result.required_evidence_ids = sortedUnique(directive.evidence_ids || []);
      result.shared_constraint = structuredClone(directive.constraint);
      return result;
    }
    if (directive?.type === "copy_change") resolveCopyChange(result, directive, approval, context, evidenceById);
    else if (directive?.type === "faq_answer") resolveFaq(result, directive, context, evidenceById);
    else if (directive?.type === "comparison_copy") resolveComparison(result, directive, context, evidenceById);
    else {
      result.execution_status = "requires_page_state";
      result.execution_rationale = "No bounded deterministic execution directive is available.";
      result.missing_requirements = ["bounded execution directive"];
    }
    return result;
  });
  const core = {
    schema_version: EXECUTION_RESOLUTION_SCHEMA_VERSION,
    artifact_type: "generation_execution_resolution",
    source_approval_artifact_id: approvalArtifact.approval_artifact_id,
    source_approval_sha256: sha256(approvalArtifact),
    source_interpretation_id: approvalArtifact.source_interpretation_id,
    source_interpretation_sha256: approvalArtifact.source_interpretation_sha256,
    decisions
  };
  return { ...core, execution_resolution_id: stableId("execution_resolution", core), execution_resolution_sha256: sha256(core) };
}

export function validateExecutionResolution(resolution, approvalArtifact, context) {
  const errors = [];
  const approvals = new Map((approvalArtifact.decisions || []).map((item) => [item.action_id, item]));
  const evidenceIds = new Set((context.citation_registry?.records || []).map((record) => record.evidence_id));
  const seen = new Set();
  if (resolution?.source_approval_sha256 !== sha256(approvalArtifact)) errors.push({ code: "APPROVAL_HASH_MISMATCH", path: "source_approval_sha256" });
  for (const [index, item] of (resolution?.decisions || []).entries()) {
    const path = `decisions[${index}]`;
    const approval = approvals.get(item.action_id);
    if (!approval) errors.push({ code: "UNTRACEABLE_EXECUTION", path });
    if (seen.has(item.action_id)) errors.push({ code: "DUPLICATE_EXECUTION_RESOLUTION", path });
    seen.add(item.action_id);
    if (!EXECUTION_STATES.includes(item.execution_status) || !EXECUTION_ROLES.includes(item.execution_role)) errors.push({ code: "INVALID_EXECUTION_STATE", path });
    if (approval && item.human_status !== approval.approval_state) errors.push({ code: "HUMAN_STATUS_MISMATCH", path });
    if (["rejected", "pending"].includes(item.human_status) && item.execution_status === "authorised") errors.push({ code: "UNAPPROVED_EXECUTION", path });
    if (item.execution_role === "generation_action" && (item.execution_status !== "authorised" || !GENERATION_OPERATIONS.includes(item.allowed_generation_operation))) errors.push({ code: "INVALID_GENERATION_AUTHORISATION", path });
    if (item.execution_role === "shared_constraint" && (item.execution_status !== "authorised" || !item.shared_constraint)) errors.push({ code: "INVALID_SHARED_CONSTRAINT", path });
    if (item.execution_status !== "authorised" && item.execution_role !== "none") errors.push({ code: "UNRESOLVED_ACTION_LEAKAGE", path });
    for (const id of [...(item.required_evidence_ids || []), ...(item.required_current_page_evidence_ids || [])]) if (!evidenceIds.has(id)) errors.push({ code: "INVALID_EVIDENCE_ID", path, evidence_id: id });
  }
  for (const actionId of approvals.keys()) if (!seen.has(actionId)) errors.push({ code: "MISSING_EXECUTION_RESOLUTION", path: actionId });
  return errors;
}
