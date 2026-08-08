import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { validateInterpretationOutput } from "../interpretation/validation.js";
import { createApprovalArtifact, validateApprovalArtifact } from "../generation/approval.js";
import { resolveExecution, validateExecutionResolution } from "../generation/execution.js";
import { buildGenerationBrief, validateGenerationBrief } from "../generation/brief.js";

const root = path.resolve("artifacts/live-validation/interpretation-sol-production-validation-2026-08-08");
const rawPath = path.join(root, "gpt-5.6-sol/call_001/raw-response.json");
const reviewPath = path.resolve("artifacts/human-review/heavy-duty-drying-towel-1200gsm/interpretation-review.md");
const contextPath = path.resolve("artifacts/live-validation/interpretation-final-2026-08-08/heavy-duty-drying-towel-1200gsm/improve_existing_product_page/interpretation_run_2026-08-08T08-46-52-571Z_022e7eed/interpretation-context.json");
const outputDirectory = path.resolve("artifacts/generation/heavy-duty-drying-towel-1200gsm/production-v1");
const [rawBytes, reviewBytes, context] = await Promise.all([readFile(rawPath), readFile(reviewPath), readFile(contextPath, "utf8").then(JSON.parse)]);
const raw = JSON.parse(rawBytes);
const envelope = JSON.parse(raw.raw_body);
const rawText = envelope.output_text || envelope.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
const interpretation = JSON.parse(rawText);
const sourceInterpretationHash = sha256(interpretation);
const sourceReviewHash = sha256(reviewBytes);
const interpretationErrors = validateInterpretationOutput(interpretation, context);
if (interpretationErrors.length) throw Object.assign(new Error("Source interpretation failed validation."), { interpretationErrors });

const conditions = {
  search: ["Apply only within other authorised copy changes.", "Use car drying towel as the primary category signal where natural.", "Preserve Heavy Duty and 1200GSM.", "Do not stuff variants, use best or waffle-weave claims, or imply ranking causation."],
  title: ["Change visible product-title/H1 wording only.", "Do not alter hierarchy, metadata, structure or add SEO headings.", "Return no output if the existing visible target cannot be identified."],
  differentiation: ["Copy improvement only; no placement, prominence, above-fold or visual-block decision.", "Retain the saturated-weight trade-off and avoid superiority or invented metrics."],
  description: ["Improve copy only; do not decide rendered order, placement or layout.", "Use only verified benefits and retain the clean-paint condition."],
  faq: ["Question opportunity does not authorise an inferred answer.", "Require explicit product-specific side-selection evidence before generation.", "Do not duplicate existing FAQ topics."],
  comparison: ["Generate bounded comparison copy only; no table, card, block, location or visual treatment.", "Consolidate or replace existing FAQ comparison rather than duplicate it.", "Use only entity-owned verified facts and make no superiority claim."],
  clarity: ["Clarify wording only; do not infer poor proximity or issue placement instructions.", "Retain correct-use, clean-paint and saturated-weight qualifications."]
};

const approval = createApprovalArtifact({
  interpretation,
  fixtureOnly: false,
  createdAt: "2026-08-08",
  reviewer: "explicit-human-decisions",
  humanReviewArtifact: { ref: path.relative(outputDirectory, reviewPath), sha256: sourceReviewHash },
  decisions: {
    search_positioning: {
      state: "approved",
      reason: "Approved as a shared execution constraint, not standalone generated content.",
      implementation_conditions: conditions.search,
      execution_directive: {
        type: "shared_constraint",
        evidence_ids: ["ev_0070937601532c2a501db22b", "ev_b77f17bcbbd291179ba662ee", "ev_3bb78e5c67db6cd015977f6b", "ev_e8632f3e030a416fa9a31f69", "ev_22f176f73ebb5516944bfdc3", "ev_386c0d66a38af9541621e08c"],
        constraint: { primary_category_signal: "car drying towel", preserve_terms: ["Heavy Duty", "1200GSM"], natural_terms: ["microfibre"], applies_to: ["title_headings", "differentiation", "product_description_benefits", "comparisons", "clarity_trust"], prohibited: ["keyword stuffing", "unnecessary close variants", "best claims", "waffle-weave insertion", "ranking claims", "causal claims from Search Console visibility"] }
      }
    },
    title_headings: {
      state: "modified",
      human_modification: "Propose improved wording for the existing visible product title/H1 so the product category is clearer while preserving Heavy Duty and 1200GSM. The phrase car drying towel may be used naturally. Do not alter heading hierarchy, add headings, modify metadata, invent structure or force microfibre into another heading.",
      reason: "Human approval narrows the model recommendation to identifiable visible title copy only.",
      implementation_conditions: conditions.title,
      execution_directive: { type: "copy_change", operation: "replace", required_product_facts: [{ label: "current product name", patterns: ["product.name", "Heavy Duty Drying Towel"] }, { label: "product category", patterns: ["category_type", "car drying towel"] }], required_current_content: [{ label: "visible product title", patterns: ["product.name", "Heavy Duty Drying Towel"] }] }
    },
    differentiation: {
      state: "modified",
      human_modification: "Improve or consolidate copy around verified 1200GSM dual-layer construction, double-sided plush microfibre, soft edging, verified water holding and heavier feel when saturated. This is copy improvement only, not a layout or repositioning instruction.",
      reason: "Rendered prominence is unknown, so the human approval removes placement authority.",
      implementation_conditions: conditions.differentiation,
      execution_directive: { type: "copy_change", operation: "replace", required_product_facts: [{ label: "1200GSM construction", patterns: ["1200GSM", "dual-layer"] }, { label: "double-sided plush", patterns: ["Double-sided", "plush microfibre"] }, { label: "soft edging", patterns: ["Soft microfibre edging"] }, { label: "water-holding proposition", patterns: ["Holds a serious amount of water"] }, { label: "saturated-weight trade-off", patterns: ["heavier", "saturated"] }], required_current_content: [{ label: "existing differentiation facts", patterns: ["product.(?:features|benefits|limitations)"] }] }
    },
    product_description_benefits: {
      state: "modified",
      human_modification: "Improve the existing description copy so it clearly connects product category to verified construction, verified benefits and intended use. It may naturally identify the product as a microfibre car drying towel. Do not make layout or final rendered-order decisions.",
      reason: "Human approval permits copy improvement while excluding unobserved layout and ordering assumptions.",
      implementation_conditions: conditions.description,
      execution_directive: { type: "copy_change", operation: "replace", required_product_facts: [{ label: "double-sided construction", patterns: ["Double-sided", "plush microfibre"] }, { label: "fewer passes and faster drying", patterns: ["Fewer passes", "faster drying"] }, { label: "reduced paint contact", patterns: ["Less contact with paint"] }, { label: "intended vehicle and surface use", patterns: ["Cars, SUVs, vans"] }, { label: "clean-paint condition", patterns: ["clean, shampooed paint"] }], required_current_content: [{ label: "existing description and benefit facts", patterns: ["product.(?:features|benefits|intended_use|limitations)"] }] }
    },
    specifications: { state: "approved", reason: "NO_CHANGE; existing verified specifications remain unchanged.", implementation_conditions: ["No generation work authorised."], execution_directive: { type: "no_output" } },
    faqs_questions: {
      state: "modified",
      human_modification: "Treat the surfaced towel-side question as a conditional FAQ opportunity only. Authorise generation only if Product Facts explicitly support a useful side-selection answer without inferring identical sides, a preferred side, side order, different purposes, pile orientation or side-specific safety.",
      reason: "Human approval of the opportunity does not supply product-answer evidence.",
      implementation_conditions: conditions.faq,
      execution_directive: { type: "faq_answer", question_evidence_ids: ["ev_16217359f215673368a8c63d"], answer_requirements: [{ label: "explicit product-specific evidence stating which side to use, whether either side is preferred, or how the sides differ", patterns: ["(?:which|either|both|preferred|first|different)[^.]{0,50}side|side[^.]{0,50}(?:preferred|first|different|either|both)"] }] }
    },
    comparisons: {
      state: "modified",
      human_modification: "Create compact textual Heavy Duty 1200GSM versus XL 800GSM choice copy using only verified Street Kingz Product Facts. Do not prescribe a table, block, location or visual treatment. Replace, consolidate or cross-reference the existing FAQ comparison rather than duplicate it.",
      reason: "The content distinction is approved while format and placement remain unapproved.",
      implementation_conditions: conditions.comparison,
      execution_directive: { type: "comparison_copy", entities: [
        { entity_id: "source_product", entity_name: "Heavy Duty 1200GSM", ownership: "source_product", attributes: [
          { name: "thicker", patterns: ["Heavy Duty towel is thicker"], evidence_ids: ["ev_2bc48197465b65346af179ed"] },
          { name: "double-sided", patterns: ["Heavy Duty towel", "double-sided"], evidence_ids: ["ev_2bc48197465b65346af179ed"] },
          { name: "smaller", patterns: ["smaller"], evidence_ids: ["ev_97b719bee372c6f804006026"] },
          { name: "heavier", patterns: ["heavier"], evidence_ids: ["ev_97b719bee372c6f804006026"] },
          { name: "more substantial", patterns: ["more substantial"], evidence_ids: ["ev_97b719bee372c6f804006026"] }
        ] },
        { entity_id: "xl_800gsm", entity_name: "XL 800GSM", ownership: "named_entity", aliases: ["XL 800GSM"], attributes: [
          { name: "larger", patterns: ["XL 800GSM", "larger"], evidence_ids: ["ev_2bc48197465b65346af179ed"] },
          { name: "lighter", patterns: ["XL 800GSM", "lighter"], evidence_ids: ["ev_2bc48197465b65346af179ed"] },
          { name: "easier-gliding", patterns: ["XL 800GSM", "glides a bit easier"], evidence_ids: ["ev_2bc48197465b65346af179ed"] }
        ] }
      ] }
    },
    care_usage_guidance: { state: "approved", reason: "NO_CHANGE; existing care and usage remains.", implementation_conditions: ["No generation work authorised.", "Do not add waffle-weave guidance."], execution_directive: { type: "no_output" } },
    internal_linking: { state: "approved", reason: "NO_CHANGE; retain the confirmed Origin Shampoo link.", implementation_conditions: ["No generation work authorised.", "Do not infer a Microfibre Wash Mitt URL."], execution_directive: { type: "no_output" } },
    metadata: { state: "approved", reason: "INSUFFICIENT_EVIDENCE; metadata remains unknown and no generation is authorised.", implementation_conditions: ["Do not generate or criticise metadata until actual title tag and meta description are captured."], execution_directive: { type: "no_output" } },
    clarity_trust: {
      state: "modified",
      human_modification: "Improve wording so paint-safety and absorbency statements retain verified clean/shampooed-paint, correct-use and saturated-weight qualifications. Do not issue placement instructions or claim current proximity is poor.",
      reason: "Human approval permits bounded wording clarification but excludes rendered-layout assumptions.",
      implementation_conditions: conditions.clarity,
      execution_directive: { type: "copy_change", operation: "replace", required_product_facts: [{ label: "safe-on-paint claim", patterns: ["Safe on all paint"] }, { label: "clean-paint condition", patterns: ["clean, shampooed paint"] }, { label: "correct-use qualification", patterns: ["used correctly"] }, { label: "saturated-weight qualification", patterns: ["heavier", "saturated"] }], required_current_content: [{ label: "existing safety and qualification statements", patterns: ["product.(?:claims|limitations|faqs)"] }] }
    }
  }
});

const approvalErrors = validateApprovalArtifact(approval, interpretation);
const resolution = resolveExecution({ interpretation, approvalArtifact: approval, context });
const resolutionErrors = validateExecutionResolution(resolution, approval, context);
const brief = buildGenerationBrief({ interpretation, approvalArtifact: approval, executionResolution: resolution, context, brandConstraints: { customer_id: "streetkingz", locale: "en-GB", spelling: "UK English", direction: ["buyer-intent", "practical", "helpful and specific"], prohibited: ["author sign-off", "unsupported product or performance claims"], source: "existing project writing constraints" } });
const briefErrors = validateGenerationBrief(brief, { interpretation, approvalArtifact: approval, executionResolution: resolution, context });
if (approvalErrors.length || resolutionErrors.length || briefErrors.length) throw Object.assign(new Error("Production generation artifacts failed validation."), { approvalErrors, resolutionErrors, briefErrors });
if (sha256(interpretation) !== sourceInterpretationHash || sha256(reviewBytes) !== sourceReviewHash) throw new Error("An immutable upstream artifact changed during resolution.");

const serializedBrief = `${JSON.stringify(brief, null, 2)}\n`;
const report = {
  schema_version: "1.0.0",
  artifact_type: "generation_foundation_validation_report",
  state: "valid",
  approval_errors: approvalErrors,
  execution_resolution_errors: resolutionErrors,
  generation_brief_errors: briefErrors,
  source_interpretation_immutable: true,
  human_review_immutable: true,
  publication_allowed: false,
  counts: {
    human_statuses: Object.fromEntries(["approved", "modified", "rejected", "pending"].map((status) => [status, approval.decisions.filter((item) => item.approval_state === status).length])),
    execution_statuses: Object.fromEntries(["authorised", "no_output", "insufficient_evidence", "requires_page_state"].map((status) => [status, resolution.decisions.filter((item) => item.execution_status === status).length])),
    model_facing_actions: brief.authorised_actions.length,
    shared_constraints: brief.shared_constraints.length,
    evidence_ids: brief.allowed_evidence.length
  },
  size: { serialized_characters: serializedBrief.length, estimated_tokens: Math.ceil(serializedBrief.length / 4), estimator: "characters/4" }
};

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDirectory, "approved-decisions.json"), `${JSON.stringify(approval, null, 2)}\n`, "utf8"),
  writeFile(path.join(outputDirectory, "execution-resolution.json"), `${JSON.stringify(resolution, null, 2)}\n`, "utf8"),
  writeFile(path.join(outputDirectory, "generation-brief.json"), serializedBrief, "utf8"),
  writeFile(path.join(outputDirectory, "validation-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8")
]);
console.log(JSON.stringify({ output_directory: outputDirectory, approval_artifact_id: approval.approval_artifact_id, execution_resolution_id: resolution.execution_resolution_id, generation_brief_id: brief.generation_brief_id, generation_brief_sha256: brief.generation_brief_sha256, ...report.counts, ...report.size }, null, 2));
