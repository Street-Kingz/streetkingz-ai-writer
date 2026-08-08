import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createApprovalArtifact, validateApprovalArtifact } from "../generation/approval.js";
import { buildGenerationBrief } from "../generation/brief.js";
import { generationOutputJsonSchema } from "../generation/contracts.js";
import { validateGenerationOutput } from "../generation/validation.js";

const RAW_PATH = "artifacts/live-validation/interpretation-sol-production-validation-2026-08-08/gpt-5.6-sol/call_001/raw-response.json";
const CONTEXT_PATH = "artifacts/live-validation/interpretation-final-2026-08-08/heavy-duty-drying-towel-1200gsm/improve_existing_product_page/interpretation_run_2026-08-08T08-46-52-571Z_022e7eed/interpretation-context.json";

async function fixtureInputs() {
  const [raw, context] = await Promise.all([readFile(RAW_PATH, "utf8").then(JSON.parse), readFile(CONTEXT_PATH, "utf8").then(JSON.parse)]);
  const envelope = JSON.parse(raw.raw_body);
  const rawText = envelope.output_text || envelope.output.flatMap((item) => item.content || []).find((item) => item.type === "output_text").text;
  return { interpretation: JSON.parse(rawText), context };
}

function fixtureApproval(interpretation) {
  return createApprovalArtifact({
    interpretation,
    fixtureOnly: true,
    createdAt: "2026-08-08T12:00:00.000Z",
    decisions: {
      search_positioning: { state: "approved" },
      comparisons: { state: "modified", human_modification: "Create a compact verified choice aid and consolidate the existing FAQ comparison.", reason: "Narrowed fixture scope." },
      faqs_questions: { state: "rejected" },
      metadata: { state: "pending" }
    }
  });
}

test("individual approval preserves the interpretation and filters generation eligibility", async () => {
  const { interpretation, context } = await fixtureInputs();
  const before = structuredClone(interpretation);
  const approval = fixtureApproval(interpretation);
  assert.deepEqual(validateApprovalArtifact(approval, interpretation), []);
  const brief = buildGenerationBrief({ interpretation, approvalArtifact: approval, context });
  assert.deepEqual(interpretation, before);
  assert.deepEqual(brief.approved_actions.map((item) => item.decision_area), ["search_positioning", "comparisons"]);
  assert.equal(brief.approved_actions.some((item) => ["faqs_questions", "metadata"].includes(item.decision_area)), false);
  assert.equal(brief.approved_actions.find((item) => item.decision_area === "comparisons").approved_instruction, "Create a compact verified choice aid and consolidate the existing FAQ comparison.");
});

test("generation brief is deterministic and includes only evidence required by approved actions", async () => {
  const { interpretation, context } = await fixtureInputs();
  const approval = fixtureApproval(interpretation);
  const first = buildGenerationBrief({ interpretation, approvalArtifact: approval, context, brandConstraints: { locale: "en-GB" } });
  const second = buildGenerationBrief({ interpretation, approvalArtifact: approval, context, brandConstraints: { locale: "en-GB" } });
  assert.deepEqual(second, first);
  const expected = new Set(first.approved_actions.flatMap((action) => action.allowed_evidence_ids));
  assert.deepEqual(new Set(first.allowed_evidence.map((item) => item.id)), expected);
  assert.ok(first.allowed_evidence.length < context.citation_registry.records.length);
  assert.ok(first.approved_actions.every((action) => action.factual_evidence_ids.every((id) => first.allowed_evidence.find((item) => item.id === id)?.category === "product_facts")));
  assert.deepEqual(new Set(first.product_facts.evidence_ids), new Set(first.allowed_evidence.filter((item) => item.category === "product_facts").map((item) => item.id)));
  assert.equal(first.search_constraints.independent_keyword_selection_allowed, false);
});

test("page state, add versus improve, and comparison constraints remain explicit", async () => {
  const { interpretation, context } = await fixtureInputs();
  const approval = createApprovalArtifact({ interpretation, fixtureOnly: true, decisions: { product_description_benefits: { state: "approved" }, comparisons: { state: "approved" } } });
  const brief = buildGenerationBrief({ interpretation, approvalArtifact: approval, context });
  const improve = brief.approved_actions.find((item) => item.decision_area === "product_description_benefits");
  const comparison = brief.approved_actions.find((item) => item.decision_area === "comparisons");
  assert.equal(improve.current_state, "present");
  assert.equal(improve.allowed_operations.includes("insert"), false);
  assert.equal(comparison.current_state, "absent");
  assert.deepEqual(comparison.allowed_operations, ["insert", "no_output"]);
  assert.ok(comparison.page_state_detail.comparison_content_elsewhere === "present");
  assert.ok(comparison.implementation_constraints.some((item) => /superiority|comparison facts/i.test(item)));
});

test("unknown metadata and non-action decisions cannot leak into generation", async () => {
  const { interpretation, context } = await fixtureInputs();
  const approval = createApprovalArtifact({ interpretation, fixtureOnly: true, decisions: { metadata: { state: "approved" }, specifications: { state: "approved" } } });
  const brief = buildGenerationBrief({ interpretation, approvalArtifact: approval, context });
  assert.equal(brief.approved_actions.some((item) => ["metadata", "specifications"].includes(item.decision_area)), false);
  const fakeOutput = { schema_version: "1.0.0", generation_brief_id: brief.generation_brief_id, changes: [{ action_id: "metadata_fake", decision_area: "metadata", operation: "replace", existing_content: null, proposed_content: "Fixture", factual_evidence_ids: [], search_evidence_ids: [], implementation_notes: [], limitations: [] }], limitations: [], human_review_state: "awaiting_human_review" };
  assert.ok(validateGenerationOutput(fakeOutput, brief).some((error) => error.code === "UNAPPROVED_ACTION"));
});

test("generation output contract is strict and generated state always awaits human review", () => {
  const schema = generationOutputJsonSchema();
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.human_review_state.enum, ["awaiting_human_review"]);
  assert.equal("publication" in schema.properties, false);
});

test("generation validation enforces approval, evidence, operations, limitations and bounded claims", async () => {
  const { interpretation, context } = await fixtureInputs();
  const approval = fixtureApproval(interpretation);
  const brief = buildGenerationBrief({ interpretation, approvalArtifact: approval, context });
  const valid = { schema_version: "1.0.0", generation_brief_id: brief.generation_brief_id, changes: brief.approved_actions.map((action) => ({ action_id: action.action_id, decision_area: action.decision_area, operation: "no_output", existing_content: null, proposed_content: null, factual_evidence_ids: [], search_evidence_ids: [], implementation_notes: ["Fixture-only validation; no copy generated."], limitations: [...action.required_limitations] })), limitations: ["Fixture only."], human_review_state: "awaiting_human_review" };
  assert.deepEqual(validateGenerationOutput(valid, brief), []);
  const invalidEvidence = structuredClone(valid); invalidEvidence.changes[0].factual_evidence_ids = ["ev_not_allowed"];
  assert.ok(validateGenerationOutput(invalidEvidence, brief).some((error) => error.code === "INVALID_EVIDENCE_ID"));
  const duplicate = structuredClone(valid); duplicate.changes.push(structuredClone(duplicate.changes[0]));
  assert.ok(validateGenerationOutput(duplicate, brief).some((error) => error.code === "DUPLICATE_ACTION_ID"));
  const unsupported = structuredClone(valid); Object.assign(unsupported.changes[0], { operation: "replace", proposed_content: "This is better than every competitor and guaranteed to rank higher." });
  const codes = validateGenerationOutput(unsupported, brief).map((error) => error.code);
  assert.ok(codes.includes("UNSUPPORTED_SUPERIORITY_LANGUAGE"));
  assert.ok(codes.includes("UNSUPPORTED_RANKING_LANGUAGE"));
  assert.ok(codes.includes("MISSING_FACTUAL_SUPPORT"));
  assert.ok(codes.includes("MISSING_EXISTING_CONTENT"));
  const omitted = structuredClone(valid); omitted.changes.pop();
  assert.ok(validateGenerationOutput(omitted, brief).some((error) => error.code === "MISSING_APPROVED_ACTION"));
});

test("approval rejects mutation, unsupported decisions and duplicate action provenance", async () => {
  const { interpretation } = await fixtureInputs();
  const approval = fixtureApproval(interpretation);
  approval.decisions[0].original_interpretation.recommendation = "Silently changed.";
  assert.ok(validateApprovalArtifact(approval, interpretation).some((error) => error.code === "ORIGINAL_DECISION_MUTATED"));
  const unknown = fixtureApproval(interpretation);
  unknown.decisions[0].decision_area = "unsupported_area";
  assert.ok(validateApprovalArtifact(unknown, interpretation).some((error) => error.code === "UNKNOWN_DECISION"));
  const duplicate = fixtureApproval(interpretation);
  duplicate.decisions[1].decision_area = duplicate.decisions[0].decision_area;
  assert.ok(validateApprovalArtifact(duplicate, interpretation).some((error) => error.code === "DUPLICATE_APPROVAL"));
});
