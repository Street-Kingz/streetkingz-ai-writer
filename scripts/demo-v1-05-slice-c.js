import fs from "node:fs";
import path from "node:path";
import { upsertRecommendationRecords, projectMerchantRecommendation, RECOMMENDATION_VERSION } from "../product-kernel/recommendationEngine.js";
import { feedProjection, detailProjection, resolveTargetLabels } from "../product-kernel/recommendationRepository.js";

const root = process.cwd();
const fixturePath = path.join(root, "artifacts/planning/v1-05/slice-c-demo-fixtures.json");
const outputDir = path.join(root, "artifacts/validation/v1-05/slice-c");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const records = upsertRecommendationRecords([], fixture.candidates, { businessId: fixture.business_id, runId: fixture.run_id });
const targetOptions = { products: [{ id: "demo-product", name: "XL Drying Towel" }], categories: [{ id: "demo-category", name: "Drying towels" }], pages: [{ id: "demo-guide", name: "Drying guide" }] };
const feed = feedProjection(records, targetOptions);
const projections = records.map(record => projectMerchantRecommendation({ ...record, target_resources: resolveTargetLabels(record.target_resources, targetOptions).map(item => item.label) }));
const output = { demo_version: "v1-05-slice-c-demo-1", recommendation_version: RECOMMENDATION_VERSION, fixture_version: fixture.fixture_version, business_id: fixture.business_id, run_id: fixture.run_id, feed, recommendations: projections, outcomes: { no_action: records.some(record => record.intervention === "no_action"), insufficient_evidence: records.some(record => record.intervention === "insufficient_evidence") } };
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "merchant-recommendation-preview.json"), `${JSON.stringify(output, null, 2)}\n`);
const lines = ["# Merchant recommendation preview", "", "This development preview is evidence-backed and does not execute changes.", "", "## Current recommendations", ""];
for (const item of projections.filter(item => item.state === "current")) lines.push(...render(item));
lines.push("## Deferred or needs reassessment", "");
for (const item of projections.filter(item => item.state !== "current" && item.state !== "needs_reassessment" ? true : item.state === "deferred" || item.state === "needs_reassessment")) lines.push(...render(item));
lines.push("## No action / insufficient evidence", "");
for (const item of projections.filter(item => item.state === "current" && ["No action recommended", "More evidence needed before action"].includes(item.title))) lines.push(...render(item));
fs.writeFileSync(path.join(outputDir, "merchant-recommendation-preview.md"), `${lines.join("\n")}\n`);
console.log(`PASS demo:v1-05:slice-c: ${projections.length} bounded outcomes written; provider calls: 0`);

function render(item) {
  return [
    `### ${item.title}`, "", `- Priority: ${item.priority}`, `- State: ${item.state}`, `- Recommended action: ${item.recommended_action}`, `- Target: ${item.target}`, `- Confidence: ${item.confidence}`, `- Why this matters: ${item.why_this_matters}`, `- Limitations: ${item.limitations.join(" ") || "None recorded."}`, `- Evidence/provenance: ${item.evidence.map(e => `${e.source_kind}/${e.source_record_type}/${e.source_record_id}`).join(", ") || "None recorded."}`, "- What to do next:", ...item.what_to_do_next.flatMap(next => next.actions.map(action => `  - ${action}`)), ""
  ];
}
