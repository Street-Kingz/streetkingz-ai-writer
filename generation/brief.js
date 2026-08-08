import { sha256, stableId } from "../research/core/canonical.js";
import { validateApprovalArtifact } from "./approval.js";
import { ACTIONABLE_DECISION_OUTCOMES, DEFAULT_OBJECTIVE_BY_OUTCOME, GENERATION_BRIEF_SCHEMA_VERSION, GENERATION_OBJECTIVES, OPERATIONS_BY_OUTCOME } from "./contracts.js";

const sortedUnique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "en"));

function inventoryArea(context, area) {
  return context.current_page_inventory?.decision_areas.find((item) => item.decision_area === area);
}

function objectiveFor(decision, requested) {
  if (requested) {
    if (!GENERATION_OBJECTIVES.includes(requested)) throw new Error(`Unsupported generation objective ${requested}.`);
    return requested;
  }
  if (decision.area === "faqs_questions" && decision.outcome === "add") return "create_approved_faq_answer";
  if (decision.area === "comparisons" && decision.outcome === "add") return "create_approved_comparison_presentation";
  if (decision.area === "title_headings") return "produce_approved_title_heading_wording";
  if (decision.area === "metadata") return "produce_approved_metadata";
  if (decision.area === "internal_linking") return "propose_approved_internal_link_anchor";
  return DEFAULT_OBJECTIVE_BY_OUTCOME[decision.outcome];
}

export function buildGenerationBrief({ interpretation, approvalArtifact, context, brandConstraints = {}, generationObjectives = {} }) {
  const approvalErrors = validateApprovalArtifact(approvalArtifact, interpretation);
  if (approvalErrors.length) throw Object.assign(new Error("Approval artifact is invalid."), { code: "INVALID_APPROVAL_ARTIFACT", errors: approvalErrors });
  const evidenceById = new Map((context.citation_registry?.records || []).map((record) => [record.evidence_id, record]));
  const approvedActions = [];
  for (const approval of approvalArtifact.decisions) {
    if (!["approved", "modified"].includes(approval.approval_state)) continue;
    const decision = approval.original_interpretation;
    if (!ACTIONABLE_DECISION_OUTCOMES.includes(decision.outcome)) continue;
    const inventory = inventoryArea(context, decision.area);
    if (!inventory || inventory.presence !== decision.current_state) throw new Error(`Page state mismatch for ${decision.area}.`);
    if (decision.area === "metadata" && inventory.presence === "unknown") throw Object.assign(new Error("Unknown metadata cannot enter generation."), { code: "UNKNOWN_METADATA_GENERATION_BLOCKED" });
    const evidenceIds = sortedUnique(decision.evidence_ids);
    const missing = evidenceIds.filter((id) => !evidenceById.has(id));
    if (missing.length) throw Object.assign(new Error(`Approved decision cites unavailable evidence: ${missing.join(", ")}`), { code: "INVALID_APPROVED_EVIDENCE" });
    const records = evidenceIds.map((id) => evidenceById.get(id));
    approvedActions.push({
      action_id: approval.action_id,
      decision_area: decision.area,
      approval_state: approval.approval_state,
      generation_objective: objectiveFor(decision, generationObjectives[decision.area]),
      approved_instruction: approval.approval_state === "modified" ? approval.human_modification : decision.recommendation,
      original_interpretation: decision.recommendation,
      human_modification_reason: approval.reason,
      interpretation_outcome: decision.outcome,
      current_state: decision.current_state,
      allowed_operations: [...OPERATIONS_BY_OUTCOME[decision.outcome]],
      allowed_evidence_ids: evidenceIds,
      factual_evidence_ids: records.filter((record) => record.evidence_category === "product_facts").map((record) => record.evidence_id),
      search_evidence_ids: records.filter((record) => record.evidence_category !== "product_facts").map((record) => record.evidence_id),
      search_execution_authorized: records.some((record) => ["keyword_ideas", "search_console"].includes(record.evidence_category)),
      current_content: (inventory.current_page_fact_refs || []).map((ref) => ({ evidence_id: ref.evidence_id, field_path: ref.field_path, value: ref.value })),
      page_state_detail: inventory.component_states || {},
      required_limitations: [...decision.limitations],
      implementation_constraints: [
        "Implement only this approved instruction; do not introduce a new strategy.",
        "Use factual claims only when supported by allowed factual evidence IDs.",
        ...(decision.area === "comparisons" ? ["Use only verified comparison facts; do not claim superiority or invent competitor attributes."] : []),
        ...(decision.outcome === "add" ? ["Create a genuinely distinct element and do not duplicate existing content."] : []),
        ...(decision.outcome === "reposition" ? ["Preserve supported meaning while changing placement or presentation."] : [])
      ]
    });
  }
  const allowedIds = sortedUnique(approvedActions.flatMap((action) => action.allowed_evidence_ids));
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
    objective: interpretation.objective,
    product: structuredClone(interpretation.source_product),
    approved_actions: approvedActions,
    allowed_evidence: allowedEvidence,
    product_facts: {
      evidence_ids: allowedEvidence.filter((record) => record.category === "product_facts").map((record) => record.id)
    },
    search_constraints: {
      independent_keyword_selection_allowed: false,
      authorised_actions: approvedActions.filter((action) => action.search_execution_authorized).map((action) => ({ action_id: action.action_id, evidence_ids: [...action.search_evidence_ids] }))
    },
    brand_constraints: structuredClone(brandConstraints),
    prohibited_claims: [
      "unsupported best or superiority claims",
      "unsupported ranking or Google-preference claims",
      "invented product, competitor, performance, safety or comparison facts",
      "keyword variants not explicitly authorised by an approved action"
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
