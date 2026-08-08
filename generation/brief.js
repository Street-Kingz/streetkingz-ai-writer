import { sha256, stableId } from "../research/core/canonical.js";
import { validateApprovalArtifact } from "./approval.js";
import { validateExecutionResolution } from "./execution.js";
import { GENERATION_BRIEF_SCHEMA_VERSION } from "./contracts.js";

const sortedUnique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "en"));

export function buildGenerationBrief({ interpretation, approvalArtifact, executionResolution, context, brandConstraints = {} }) {
  const approvalErrors = validateApprovalArtifact(approvalArtifact, interpretation);
  if (approvalErrors.length) throw Object.assign(new Error("Approval artifact is invalid."), { code: "INVALID_APPROVAL_ARTIFACT", errors: approvalErrors });
  const resolutionErrors = validateExecutionResolution(executionResolution, approvalArtifact, context);
  if (resolutionErrors.length) throw Object.assign(new Error("Execution resolution is invalid."), { code: "INVALID_EXECUTION_RESOLUTION", errors: resolutionErrors });
  const evidenceById = new Map((context.citation_registry?.records || []).map((record) => [record.evidence_id, record]));
  const approvals = new Map(approvalArtifact.decisions.map((item) => [item.action_id, item]));
  const inventoryByArea = new Map((context.current_page_inventory?.decision_areas || []).map((item) => [item.decision_area, item]));

  const authorisedActions = executionResolution.decisions.filter((item) => item.execution_status === "authorised" && item.execution_role === "generation_action").map((resolution) => {
    const approval = approvals.get(resolution.action_id);
    const inventory = inventoryByArea.get(resolution.decision_area);
    const allowedEvidenceIds = sortedUnique(resolution.required_evidence_ids);
    const records = allowedEvidenceIds.map((id) => evidenceById.get(id));
    const currentIds = new Set(resolution.required_current_page_evidence_ids);
    return {
      action_id: resolution.action_id,
      decision_area: resolution.decision_area,
      human_status: approval.approval_state,
      authorised_operation: resolution.allowed_generation_operation,
      approved_instruction: approval.human_modification || approval.original_interpretation.recommendation,
      original_interpretation: approval.original_interpretation.recommendation,
      implementation_conditions: [...approval.implementation_conditions],
      current_state: approval.original_interpretation.current_state,
      current_content: (inventory?.current_page_fact_refs || []).filter((ref) => currentIds.has(ref.evidence_id)).map((ref) => ({ evidence_id: ref.evidence_id, field_path: ref.field_path, value: ref.value })),
      allowed_evidence_ids: allowedEvidenceIds,
      factual_evidence_ids: records.filter((record) => record.evidence_category === "product_facts").map((record) => record.evidence_id),
      search_evidence_ids: records.filter((record) => record.evidence_category !== "product_facts").map((record) => record.evidence_id),
      required_limitations: [...approval.original_interpretation.limitations],
      prohibited_operations: [...resolution.prohibited_operations],
      comparison_support: resolution.comparison_support,
      execution_rationale: resolution.execution_rationale
    };
  });

  const sharedConstraints = executionResolution.decisions.filter((item) => item.execution_status === "authorised" && item.execution_role === "shared_constraint").map((resolution) => ({
    source_action_id: resolution.action_id,
    decision_area: resolution.decision_area,
    constraint: structuredClone(resolution.shared_constraint),
    evidence_ids: [...resolution.required_evidence_ids]
  }));
  for (const action of authorisedActions) {
    const applicable = sharedConstraints.filter((item) => (item.constraint.applies_to || []).includes(action.decision_area));
    const sharedEvidenceIds = sortedUnique(applicable.flatMap((item) => item.evidence_ids));
    action.shared_constraint_action_ids = applicable.map((item) => item.source_action_id);
    action.search_execution_authorized = applicable.length > 0;
    action.allowed_evidence_ids = sortedUnique([...action.allowed_evidence_ids, ...sharedEvidenceIds]);
    action.factual_evidence_ids = action.allowed_evidence_ids.filter((id) => evidenceById.get(id)?.evidence_category === "product_facts");
    action.search_evidence_ids = action.allowed_evidence_ids.filter((id) => evidenceById.get(id)?.evidence_category !== "product_facts");
  }
  const allowedIds = sortedUnique([
    ...authorisedActions.flatMap((action) => action.allowed_evidence_ids),
    ...sharedConstraints.flatMap((constraint) => constraint.evidence_ids)
  ]);
  const allowedEvidence = allowedIds.map((id) => {
    const record = evidenceById.get(id);
    return { id, category: record.evidence_category, signal: record.human_readable_evidence || record.summary || record.observation };
  });
  const core = {
    schema_version: GENERATION_BRIEF_SCHEMA_VERSION,
    artifact_type: "generation_brief",
    fixture_only: approvalArtifact.fixture_only,
    source_interpretation_id: approvalArtifact.source_interpretation_id,
    source_interpretation_sha256: approvalArtifact.source_interpretation_sha256,
    approval_artifact_id: approvalArtifact.approval_artifact_id,
    execution_resolution_id: executionResolution.execution_resolution_id,
    objective: interpretation.objective,
    product: structuredClone(interpretation.source_product),
    authorised_actions: authorisedActions,
    shared_constraints: sharedConstraints,
    allowed_evidence: allowedEvidence,
    product_facts: { evidence_ids: allowedEvidence.filter((record) => record.category === "product_facts").map((record) => record.id) },
    search_constraints: {
      independent_keyword_selection_allowed: false,
      source_action_ids: sharedConstraints.map((constraint) => constraint.source_action_id)
    },
    brand_constraints: structuredClone(brandConstraints),
    prohibited_claims: [
      "unsupported best or superiority claims",
      "unsupported ranking or Google-preference claims",
      "invented product, competitor, performance, safety, side-selection or comparison facts",
      "keyword variants not explicitly authorised by a shared constraint",
      "rendered layout, ordering or prominence changes not explicitly authorised",
      "duplication of existing FAQ, comparison, care, specification or link content"
    ],
    output_requirements: {
      strict_schema: true,
      claim_citations_required: true,
      publication_allowed: false,
      generated_state: "awaiting_human_review"
    }
  };
  return { ...core, generation_brief_id: stableId("generation_brief", core), generation_brief_sha256: sha256(core) };
}

export function validateGenerationBrief(brief, { interpretation, approvalArtifact, executionResolution, context }) {
  const errors = [];
  const authorised = new Map(executionResolution.decisions.filter((item) => item.execution_status === "authorised" && item.execution_role === "generation_action").map((item) => [item.action_id, item]));
  const shared = new Set(executionResolution.decisions.filter((item) => item.execution_status === "authorised" && item.execution_role === "shared_constraint").map((item) => item.action_id));
  const registry = new Set((context.citation_registry?.records || []).map((item) => item.evidence_id));
  const seen = new Set();
  if (brief.source_interpretation_sha256 !== sha256(interpretation) || brief.approval_artifact_id !== approvalArtifact.approval_artifact_id || brief.execution_resolution_id !== executionResolution.execution_resolution_id) errors.push({ code: "GENERATION_PROVENANCE_MISMATCH", path: "$" });
  if (brief.fixture_only !== approvalArtifact.fixture_only || brief.output_requirements?.publication_allowed !== false) errors.push({ code: "INVALID_GENERATION_BOUNDARY", path: "$" });
  for (const [index, action] of (brief.authorised_actions || []).entries()) {
    const resolution = authorised.get(action.action_id);
    if (!resolution) errors.push({ code: "UNAUTHORISED_ACTION", path: `authorised_actions[${index}]` });
    if (seen.has(action.action_id)) errors.push({ code: "DUPLICATE_ACTION_ID", path: `authorised_actions[${index}]` });
    seen.add(action.action_id);
    if (resolution && (action.authorised_operation !== resolution.allowed_generation_operation || action.decision_area !== resolution.decision_area)) errors.push({ code: "EXECUTION_SCOPE_MISMATCH", path: `authorised_actions[${index}]` });
    for (const id of action.allowed_evidence_ids || []) if (!registry.has(id)) errors.push({ code: "INVALID_EVIDENCE_ID", path: `authorised_actions[${index}]`, evidence_id: id });
    if (action.decision_area === "metadata") errors.push({ code: "UNKNOWN_METADATA_GENERATION", path: `authorised_actions[${index}]` });
    if (action.authorised_operation === "move") errors.push({ code: "LAYOUT_OPERATION_NOT_BOUNDED", path: `authorised_actions[${index}]` });
  }
  for (const actionId of authorised.keys()) if (!seen.has(actionId)) errors.push({ code: "MISSING_AUTHORISED_ACTION", path: actionId });
  for (const [index, constraint] of (brief.shared_constraints || []).entries()) if (!shared.has(constraint.source_action_id)) errors.push({ code: "UNAUTHORISED_SHARED_CONSTRAINT", path: `shared_constraints[${index}]` });
  const expectedEvidence = sortedUnique([...(brief.authorised_actions || []).flatMap((action) => action.allowed_evidence_ids || []), ...(brief.shared_constraints || []).flatMap((constraint) => constraint.evidence_ids || [])]);
  if (JSON.stringify(expectedEvidence) !== JSON.stringify(sortedUnique((brief.allowed_evidence || []).map((record) => record.id)))) errors.push({ code: "GENERATION_EVIDENCE_SCOPE_MISMATCH", path: "allowed_evidence" });
  return errors;
}
