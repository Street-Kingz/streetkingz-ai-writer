import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import {
  buildCurrentPageVerification, parseFinalReviewMarkdown, resolveTargetUrl,
  prepareImmutableRunDirectory, retrieveCurrentPage, validateCurrentPageVerification
} from "../verification/currentPage.js";
import { renderImplementationDiff } from "../verification/render.js";

const finalReviewPath = path.resolve(process.env.FINAL_GENERATION_REVIEW || "artifacts/human-review/heavy-duty-drying-towel-1200gsm/generation-final-review.md");
const generationPath = path.resolve(process.env.VALIDATED_GENERATION || "artifacts/live-validation/generation-sol-production-validation-2026-08-08/gpt-5.6-sol/call_001/generation.json");
const briefPath = path.resolve(process.env.GENERATION_BRIEF || "artifacts/generation/heavy-duty-drying-towel-1200gsm/production-v1/generation-brief.json");
const outputRoot = path.resolve(process.env.CURRENT_PAGE_VERIFICATION_OUTPUT || "artifacts/live-validation/current-page-verification-2026-08-08");

const [finalReviewBytes, generationBytes, briefBytes] = await Promise.all([readFile(finalReviewPath), readFile(generationPath), readFile(briefPath)]);
const sourceHashesBefore = { final_review: sha256(finalReviewBytes), generation: sha256(generationBytes), generation_brief: sha256(briefBytes) };
const finalReview = parseFinalReviewMarkdown(finalReviewBytes.toString("utf8"));
const frozenGeneration = JSON.parse(generationBytes);
const generationBrief = JSON.parse(briefBytes);
const targetUrl = resolveTargetUrl({ generationBrief });
const slug = new URL(targetUrl).pathname.split("/").filter(Boolean).at(-1);
const runDirectory = path.join(outputRoot, slug, "retrieval_001");
const { rawDirectory } = await prepareImmutableRunDirectory(runDirectory);
const writeImmutable = (filePath, value) => writeFile(filePath, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
await writeImmutable(path.join(runDirectory, "preflight.json"), {
  schema_version: "1.0.0",
  artifact_type: "current_page_verification_preflight",
  state: "pass",
  target_url: targetUrl,
  authorised_retrievals: 1,
  retry_capability: false,
  run_directory_created_before_retrieval: true,
  response_persistence_before_extraction: true,
  source_hashes: sourceHashesBefore
});

let retrievals = 0;
const fetchOnce = async (...args) => {
  if (retrievals >= 1) throw Object.assign(new Error("Controlled current-page retrieval limit reached."), { code: "RETRIEVAL_LIMIT_REACHED" });
  retrievals += 1;
  return fetch(...args);
};
const retrieved = await retrieveCurrentPage(targetUrl, { fetchImpl: fetchOnce });
await writeImmutable(path.join(rawDirectory, "page.html"), retrieved.html);
await writeImmutable(path.join(rawDirectory, "retrieval.json"), retrieved.metadata);
if (retrieved.metadata.http_status < 200 || retrieved.metadata.http_status >= 300) throw new Error(`Current product page retrieval failed with HTTP ${retrieved.metadata.http_status}.`);
const verification = buildCurrentPageVerification({ targetUrl, retrieval: retrieved.metadata, html: retrieved.html, finalReview, frozenGeneration, generationBrief });
const errors = validateCurrentPageVerification(verification, { html: retrieved.html, finalReview, frozenGeneration, generationBrief });
const sourceHashesAfter = {
  final_review: sha256(await readFile(finalReviewPath)), generation: sha256(await readFile(generationPath)), generation_brief: sha256(await readFile(briefPath))
};
const sourcesImmutable = JSON.stringify(sourceHashesBefore) === JSON.stringify(sourceHashesAfter);
if (!sourcesImmutable) errors.push({ code: "UPSTREAM_ARTIFACT_MUTATED", path: "$" });
const validationReport = {
  schema_version: "1.0.0", artifact_type: "current_page_verification_report", state: errors.length ? "invalid" : "valid", errors,
  raw_page_preserved: true, approved_candidate_copy_unchanged: true, upstream_artifacts_immutable: sourcesImmutable,
  comparison_duplication_prevented: true, safety_guidance_preserved: true, publication_allowed: false
};
const runMetadata = {
  schema_version: "1.0.0", artifact_type: "current_page_verification_run", verification_id: verification.verification_id,
  target_url: targetUrl, retrievals, source_hashes: sourceHashesBefore, output_directory: runDirectory,
  files: { raw_page: "raw/page.html", verification: "current-page-verification.json", implementation_diff: "implementation-diff.md", validation_report: "validation-report.json" },
  external_calls: { page_retrievals: retrievals, ai: 0, dataforseo: 0, search_console: 0 }, publication_allowed: false
};
await Promise.all([
  writeImmutable(path.join(runDirectory, "current-page-verification.json"), verification),
  writeImmutable(path.join(runDirectory, "implementation-diff.md"), renderImplementationDiff(verification)),
  writeImmutable(path.join(runDirectory, "validation-report.json"), validationReport),
  writeImmutable(path.join(runDirectory, "run-metadata.json"), runMetadata)
]);

console.log(JSON.stringify({ output_directory: runDirectory, retrieval: retrieved.metadata, verification_id: verification.verification_id, baseline: verification.frozen_baseline_comparison, mappings: Object.fromEntries(verification.implementation_mappings.map((item) => [item.decision_area, item.operation])), validation: validationReport.state, errors }, null, 2));
if (errors.length) process.exitCode = 1;
