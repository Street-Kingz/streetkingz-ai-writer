import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseFinalReviewMarkdown } from "../verification/currentPage.js";
import { buildCmsFieldMap, resolveWordPressProductResource, validateCmsFieldMap } from "../cms/wordpressProductMap.js";
import { renderCmsWritePlan } from "../cms/renderWritePlan.js";

const verificationRoot = path.resolve("artifacts/live-validation/current-page-verification-2026-08-08/heavy-duty-drying-towel-1200gsm/retrieval_001");
const finalReviewPath = path.resolve("artifacts/human-review/heavy-duty-drying-towel-1200gsm/generation-final-review.md");
const originalRun = path.resolve("artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1");
const replayDirectory = path.join(originalRun, "offline-replay-003");
const [pageBytes, verificationBytes, reviewBytes, cmsBytes, retrievalBytes] = await Promise.all([
  readFile(path.join(verificationRoot, "raw/page.html")),
  readFile(path.join(verificationRoot, "current-page-verification.json")),
  readFile(finalReviewPath),
  readFile(path.join(originalRun, "raw/cms-response.json")),
  readFile(path.join(originalRun, "raw/cms-retrieval.json"))
]);
const verification = JSON.parse(verificationBytes);
const finalReview = parseFinalReviewMarkdown(reviewBytes.toString("utf8"));
const cmsResponse = JSON.parse(cmsBytes);
const cmsRetrieval = JSON.parse(retrievalBytes);
const resource = resolveWordPressProductResource(pageBytes.toString("utf8"), verification.target_url);
const fieldMap = buildCmsFieldMap({ cmsResponse, cmsRetrieval, resource, verification, finalReview, pageHtml: pageBytes.toString("utf8") });
const errors = validateCmsFieldMap(fieldMap, { cmsResponse, verification, finalReview });
const validationReport = {
  schema_version: "1.0.0", artifact_type: "cms_field_mapping_validation", replay_of: path.relative(process.cwd(), originalRun),
  source_network_retrievals: 1, replay_network_retrievals: 0, state: errors.length ? "invalid" : "valid", errors,
  write_operations_performed: 0, approved_candidate_copy_unchanged: true, upstream_artifacts_immutable: true, publication_allowed: false
};
await mkdir(replayDirectory, { recursive: false });
const writeImmutable = (name, value) => writeFile(path.join(replayDirectory, name), typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
await Promise.all([
  writeImmutable("cms-field-map.json", fieldMap),
  writeImmutable("write-plan.md", renderCmsWritePlan(fieldMap)),
  writeImmutable("validation-report.json", validationReport),
  writeImmutable("run-metadata.json", { schema_version: "1.0.0", artifact_type: "cms_field_mapping_offline_replay", product_post_id: resource.product_post_id, network_retrievals: 0, writes: 0, approval_state: fieldMap.approval_state, publication_allowed: false })
]);
console.log(JSON.stringify({ replay_directory: replayDirectory, validation: validationReport.state, errors, mapping_statuses: Object.fromEntries(Object.entries(fieldMap.field_mappings).map(([area, item]) => [area, item.mapping_status])) }, null, 2));
if (errors.length) process.exitCode = 1;
