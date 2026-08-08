import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createApprovalArtifact, validateApprovalArtifact } from "../generation/approval.js";
import { buildGenerationBrief, validateGenerationBrief } from "../generation/brief.js";
import { generationOutputJsonSchema } from "../generation/contracts.js";
import { resolveExecution, validateExecutionResolution } from "../generation/execution.js";
import { validateGenerationOutput } from "../generation/validation.js";

const RAW_PATH = "artifacts/live-validation/interpretation-sol-production-validation-2026-08-08/gpt-5.6-sol/call_001/raw-response.json";
const CONTEXT_PATH = "artifacts/live-validation/interpretation-final-2026-08-08/heavy-duty-drying-towel-1200gsm/improve_existing_product_page/interpretation_run_2026-08-08T08-46-52-571Z_022e7eed/interpretation-context.json";
const PRODUCTION_ROOT = "artifacts/generation/heavy-duty-drying-towel-1200gsm/production-v1";

async function inputs() {
  const [raw, context, approval, resolution, brief] = await Promise.all([
    readFile(RAW_PATH, "utf8").then(JSON.parse), readFile(CONTEXT_PATH, "utf8").then(JSON.parse),
    readFile(`${PRODUCTION_ROOT}/approved-decisions.json`, "utf8").then(JSON.parse),
    readFile(`${PRODUCTION_ROOT}/execution-resolution.json`, "utf8").then(JSON.parse),
    readFile(`${PRODUCTION_ROOT}/generation-brief.json`, "utf8").then(JSON.parse)
  ]);
  const envelope = JSON.parse(raw.raw_body);
  const rawText = envelope.output_text || envelope.output.flatMap((item) => item.content || []).find((item) => item.type === "output_text").text;
  return { interpretation: JSON.parse(rawText), context, approval, resolution, brief };
}

test("production approval and execution artifacts are valid, traceable and immutable", async () => {
  const { interpretation, context, approval, resolution, brief } = await inputs();
  const before = structuredClone(interpretation);
  assert.equal(approval.fixture_only, false);
  assert.deepEqual(validateApprovalArtifact(approval, interpretation), []);
  assert.deepEqual(validateExecutionResolution(resolution, approval, context), []);
  assert.deepEqual(validateGenerationBrief(brief, { interpretation, approvalArtifact: approval, executionResolution: resolution, context }), []);
  assert.deepEqual(interpretation, before);
  assert.equal(approval.human_review_artifact.sha256.length, 64);
});

test("human strategic status is separate from deterministic execution status", async () => {
  const { approval, resolution } = await inputs();
  const human = Object.fromEntries(approval.decisions.map((item) => [item.decision_area, item.approval_state]));
  const execution = Object.fromEntries(resolution.decisions.map((item) => [item.decision_area, item.execution_status]));
  assert.equal(human.search_positioning, "approved"); assert.equal(execution.search_positioning, "authorised");
  assert.equal(human.specifications, "approved"); assert.equal(execution.specifications, "no_output");
  assert.equal(human.faqs_questions, "modified"); assert.equal(execution.faqs_questions, "insufficient_evidence");
  assert.equal(human.metadata, "approved"); assert.equal(execution.metadata, "no_output");
});

test("search positioning is a traced shared constraint and never a filler action", async () => {
  const { brief, resolution } = await inputs();
  assert.equal(brief.authorised_actions.some((item) => item.decision_area === "search_positioning"), false);
  assert.equal(brief.shared_constraints.length, 1);
  assert.equal(brief.shared_constraints[0].decision_area, "search_positioning");
  assert.equal(brief.shared_constraints[0].constraint.primary_category_signal, "car drying towel");
  assert.ok(brief.shared_constraints[0].evidence_ids.length);
  for (const action of brief.authorised_actions) {
    assert.equal(action.search_execution_authorized, true);
    assert.ok(action.search_evidence_ids.length);
    assert.ok(action.search_evidence_ids.every((id) => brief.allowed_evidence.find((item) => item.id === id).category !== "product_facts"));
    assert.ok(action.shared_constraint_action_ids.includes(brief.shared_constraints[0].source_action_id));
  }
  assert.equal(resolution.decisions.find((item) => item.decision_area === "search_positioning").execution_role, "shared_constraint");
});

test("human modifications narrow reposition and add recommendations to copy-only replacement", async () => {
  const { brief } = await inputs();
  for (const area of ["differentiation", "comparisons"]) {
    const action = brief.authorised_actions.find((item) => item.decision_area === area);
    assert.equal(action.authorised_operation, "replace");
    assert.ok(action.prohibited_operations.includes("move"));
    assert.ok(action.prohibited_operations.includes("insert"));
    assert.ok(action.human_status === "modified");
  }
});

test("missing target page content resolves to requires_page_state rather than speculative replacement", async () => {
  const { interpretation, context, approval } = await inputs();
  const alteredContext = structuredClone(context);
  alteredContext.current_page_inventory.decision_areas.find((item) => item.decision_area === "title_headings").current_page_fact_refs = [];
  const resolution = resolveExecution({ interpretation, approvalArtifact: approval, context: alteredContext });
  const title = resolution.decisions.find((item) => item.decision_area === "title_headings");
  assert.equal(title.execution_status, "requires_page_state");
  assert.equal(title.execution_role, "none");
});

test("unknown rendered position cannot authorise a move even when source text is known", async () => {
  const { interpretation, context, approval } = await inputs();
  const changed = structuredClone(approval);
  changed.decisions.find((item) => item.decision_area === "differentiation").execution_directive.operation = "move";
  const resolution = resolveExecution({ interpretation, approvalArtifact: changed, context });
  const decision = resolution.decisions.find((item) => item.decision_area === "differentiation");
  assert.equal(decision.execution_status, "requires_page_state");
  assert.match(decision.missing_requirements.join(" "), /rendered position|layout/i);
});

test("PAA question and double-sided construction do not establish a towel-side answer", async () => {
  const { resolution } = await inputs();
  const faq = resolution.decisions.find((item) => item.decision_area === "faqs_questions");
  assert.equal(faq.execution_status, "insufficient_evidence");
  assert.match(faq.execution_rationale, /do not support a useful side-selection answer/i);
  assert.ok(faq.missing_requirements.some((item) => /which side|preferred|differ/i.test(item)));
});

test("a genuinely supported product-specific FAQ answer can resolve to authorised", async () => {
  const { interpretation, context, approval } = await inputs();
  const supportedContext = structuredClone(context);
  supportedContext.citation_registry.records.push({ evidence_id: "ev_fixture_side_guidance", evidence_category: "product_facts", evidence_type: "product_fact", observation: { field_path: "product.how_to_use.side", value: "Either side may be used; neither side is preferred." } });
  const resolution = resolveExecution({ interpretation, approvalArtifact: approval, context: supportedContext });
  const faq = resolution.decisions.find((item) => item.decision_area === "faqs_questions");
  assert.equal(faq.execution_status, "authorised");
  assert.ok(faq.required_evidence_ids.includes("ev_fixture_side_guidance"));
});

test("comparison attributes resolve to the correct entity and transposed or unsupported evidence fails", async () => {
  const { interpretation, context, approval, resolution } = await inputs();
  const comparison = resolution.decisions.find((item) => item.decision_area === "comparisons");
  assert.equal(comparison.execution_status, "authorised");
  assert.equal(comparison.comparison_support.length, 8);
  assert.deepEqual(comparison.comparison_support.filter((item) => item.entity_id === "source_product").map((item) => item.attribute), ["thicker", "double-sided", "smaller", "heavier", "more substantial"]);
  assert.deepEqual(comparison.comparison_support.filter((item) => item.entity_id === "xl_800gsm").map((item) => item.attribute), ["larger", "lighter", "easier-gliding"]);
  const transposed = structuredClone(approval);
  const directive = transposed.decisions.find((item) => item.decision_area === "comparisons").execution_directive;
  directive.entities.find((item) => item.entity_id === "xl_800gsm").attributes.push({ name: "smaller", patterns: ["smaller"], evidence_ids: ["ev_97b719bee372c6f804006026"] });
  const failed = resolveExecution({ interpretation, approvalArtifact: transposed, context });
  assert.equal(failed.decisions.find((item) => item.decision_area === "comparisons").execution_status, "insufficient_evidence");
});

test("rejected and pending human decisions can never resolve to authorised", async () => {
  const { interpretation, context, approval } = await inputs();
  const changed = structuredClone(approval);
  changed.decisions.find((item) => item.decision_area === "title_headings").approval_state = "rejected";
  changed.decisions.find((item) => item.decision_area === "differentiation").approval_state = "pending";
  const resolution = resolveExecution({ interpretation, approvalArtifact: changed, context });
  assert.equal(resolution.decisions.find((item) => item.decision_area === "title_headings").execution_status, "no_output");
  assert.equal(resolution.decisions.find((item) => item.decision_area === "differentiation").execution_status, "no_output");
});

test("generation brief contains only authorised actions and minimum required evidence", async () => {
  const { interpretation, context, approval, resolution, brief } = await inputs();
  const rebuilt = buildGenerationBrief({ interpretation, approvalArtifact: approval, executionResolution: resolution, context, brandConstraints: brief.brand_constraints });
  assert.deepEqual(rebuilt, brief);
  assert.deepEqual(brief.authorised_actions.map((item) => item.decision_area), ["title_headings", "differentiation", "product_description_benefits", "comparisons", "clarity_trust"]);
  assert.equal(brief.authorised_actions.some((item) => ["specifications", "faqs_questions", "care_usage_guidance", "internal_linking", "metadata"].includes(item.decision_area)), false);
  const expectedIds = new Set([...brief.authorised_actions.flatMap((item) => item.allowed_evidence_ids), ...brief.shared_constraints.flatMap((item) => item.evidence_ids)]);
  assert.deepEqual(new Set(brief.allowed_evidence.map((item) => item.id)), expectedIds);
  assert.ok(brief.allowed_evidence.length < context.citation_registry.records.length);
  assert.equal(brief.output_requirements.publication_allowed, false);
});

test("generation output contract and validator retain bounded operations and human review", async () => {
  const { brief } = await inputs();
  const schema = generationOutputJsonSchema();
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.human_review_state.enum, ["awaiting_human_review"]);
  const valid = { schema_version: "2.0.0", generation_brief_id: brief.generation_brief_id, changes: brief.authorised_actions.map((action) => ({ action_id: action.action_id, decision_area: action.decision_area, operation: "no_output", existing_content: null, proposed_content: null, factual_evidence_ids: [], search_evidence_ids: [], comparison_claims: [], implementation_notes: ["Fixture validation only; no copy."], limitations: [...action.required_limitations] })), limitations: [], human_review_state: "awaiting_human_review" };
  assert.deepEqual(validateGenerationOutput(valid, brief), []);
  const broad = structuredClone(valid); broad.changes[0].operation = "move";
  assert.ok(validateGenerationOutput(broad, brief).some((error) => error.code === "INVALID_OPERATION"));
  const unsupported = structuredClone(valid); Object.assign(unsupported.changes[0], { operation: "replace", existing_content: "Known title", proposed_content: "The best towel, guaranteed to rank higher." });
  const codes = validateGenerationOutput(unsupported, brief).map((error) => error.code);
  assert.ok(codes.includes("UNSUPPORTED_SUPERIORITY_LANGUAGE"));
  assert.ok(codes.includes("UNSUPPORTED_RANKING_LANGUAGE"));
});

test("comparison output rejects transposed attributes and search constraints reject stuffing", async () => {
  const { brief } = await inputs();
  const comparison = brief.authorised_actions.find((item) => item.decision_area === "comparisons");
  const badComparison = { schema_version: "2.0.0", generation_brief_id: brief.generation_brief_id, changes: brief.authorised_actions.map((action) => ({ action_id: action.action_id, decision_area: action.decision_area, operation: "no_output", existing_content: null, proposed_content: null, factual_evidence_ids: [], search_evidence_ids: [], comparison_claims: [], implementation_notes: [], limitations: [...action.required_limitations] })), limitations: [], human_review_state: "awaiting_human_review" };
  const item = badComparison.changes.find((change) => change.action_id === comparison.action_id);
  Object.assign(item, { operation: "replace", existing_content: "Existing comparison", proposed_content: "The XL 800GSM towel is smaller and heavier.", factual_evidence_ids: comparison.factual_evidence_ids, comparison_claims: [{ entity_id: "xl_800gsm", attribute: "smaller", evidence_ids: comparison.factual_evidence_ids.slice(0, 1) }] });
  const codes = validateGenerationOutput(badComparison, brief).map((error) => error.code);
  assert.ok(codes.includes("UNSUPPORTED_COMPARISON_CLAIM"));
  assert.ok(codes.includes("TRANSPOSED_COMPARISON_ATTRIBUTE"));

  const title = brief.authorised_actions.find((action) => action.decision_area === "title_headings");
  const stuffed = structuredClone(badComparison);
  const titleChange = stuffed.changes.find((change) => change.action_id === title.action_id);
  Object.assign(titleChange, { operation: "replace", existing_content: "Known title", proposed_content: "Car Drying Towel — a car drying towel", factual_evidence_ids: title.factual_evidence_ids });
  assert.ok(validateGenerationOutput(stuffed, brief).some((error) => error.code === "KEYWORD_STUFFING"));
});

test("approval validation catches source mutation and unsupported decision provenance", async () => {
  const { interpretation, approval } = await inputs();
  const mutated = structuredClone(approval);
  mutated.decisions[0].original_interpretation.recommendation = "Silently changed.";
  assert.ok(validateApprovalArtifact(mutated, interpretation).some((error) => error.code === "ORIGINAL_DECISION_MUTATED"));
  const unsupported = createApprovalArtifact({ interpretation, fixtureOnly: true, decisions: {} });
  unsupported.decisions[0].decision_area = "unsupported_area";
  assert.ok(validateApprovalArtifact(unsupported, interpretation).some((error) => error.code === "UNKNOWN_DECISION"));
});
