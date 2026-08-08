import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { validateInterpretationOutput } from "../interpretation/validation.js";
import { createApprovalArtifact } from "../generation/approval.js";
import { buildGenerationBrief } from "../generation/brief.js";

const runRoot = path.resolve("artifacts/live-validation/interpretation-sol-production-validation-2026-08-08");
const rawPath = path.join(runRoot, "gpt-5.6-sol/call_001/raw-response.json");
const contextPath = path.resolve("artifacts/live-validation/interpretation-final-2026-08-08/heavy-duty-drying-towel-1200gsm/improve_existing_product_page/interpretation_run_2026-08-08T08-46-52-571Z_022e7eed/interpretation-context.json");
const outputDirectory = path.resolve("artifacts/fixtures/generation/heavy-duty-drying-towel-1200gsm");
const [rawBytes, context] = await Promise.all([readFile(rawPath), readFile(contextPath, "utf8").then(JSON.parse)]);
const rawArtifact = JSON.parse(rawBytes);
const envelope = JSON.parse(rawArtifact.raw_body);
const rawText = envelope.output_text || envelope.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
if (!rawText) throw new Error("The preserved response contains no structured output text.");
const interpretation = JSON.parse(rawText);
const validationErrors = validateInterpretationOutput(interpretation, context);
if (validationErrors.length) throw Object.assign(new Error("The preserved interpretation is not valid."), { validationErrors });

const approval = createApprovalArtifact({
  interpretation,
  fixtureOnly: true,
  createdAt: "2026-08-08T12:00:00.000Z",
  reviewer: "fixture-reviewer-not-a-real-approval",
  decisions: {
    search_positioning: { state: "approved", reason: "Fixture coverage for a directly approved action." },
    comparisons: {
      state: "modified",
      human_modification: "Create a compact Heavy Duty 1200GSM versus XL 800GSM choice-aid structure using only the verified distinctions already cited, and consolidate rather than duplicate the existing FAQ comparison.",
      reason: "Fixture coverage for a human-narrowed implementation instruction."
    },
    faqs_questions: { state: "rejected", reason: "Fixture coverage only; this is not a real editorial rejection." },
    metadata: { state: "pending" }
  }
});

const generationBrief = buildGenerationBrief({
  interpretation,
  approvalArtifact: approval,
  context,
  generationObjectives: { comparisons: "create_approved_comparison_presentation" },
  brandConstraints: {
    customer_id: "streetkingz",
    locale: "en-GB",
    spelling: "UK English",
    direction: ["buyer-intent", "practical", "helpful and specific"],
    prohibited: ["author sign-off", "unsupported product or performance claims"],
    source: "existing project writing constraints"
  }
});

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDirectory, "approved-decisions.json"), `${JSON.stringify(approval, null, 2)}\n`, "utf8"),
  writeFile(path.join(outputDirectory, "generation-brief.json"), `${JSON.stringify(generationBrief, null, 2)}\n`, "utf8"),
  writeFile(path.join(outputDirectory, "fixture-metadata.json"), `${JSON.stringify({ fixture_only: true, ai_calls: 0, external_provider_calls: 0, preserved_raw_response_ref: path.relative(outputDirectory, rawPath), preserved_raw_response_sha256: sha256(rawBytes), source_interpretation_sha256: approval.source_interpretation_sha256, approval_artifact_id: approval.approval_artifact_id, generation_brief_id: generationBrief.generation_brief_id }, null, 2)}\n`, "utf8")
]);
console.log(JSON.stringify({ output_directory: outputDirectory, fixture_only: true, approved_actions: generationBrief.approved_actions.length }, null, 2));
