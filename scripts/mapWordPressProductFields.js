import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { parseFinalReviewMarkdown } from "../verification/currentPage.js";
import { buildCmsFieldMap, resolveWordPressProductResource, validateCmsFieldMap } from "../cms/wordpressProductMap.js";
import { renderCmsWritePlan } from "../cms/renderWritePlan.js";

const verificationRoot = path.resolve("artifacts/live-validation/current-page-verification-2026-08-08/heavy-duty-drying-towel-1200gsm/retrieval_001");
const finalReviewPath = path.resolve("artifacts/human-review/heavy-duty-drying-towel-1200gsm/generation-final-review.md");
const outputDirectory = path.resolve("artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1");
const [pageBytes, verificationBytes, reviewBytes] = await Promise.all([
  readFile(path.join(verificationRoot, "raw/page.html")), readFile(path.join(verificationRoot, "current-page-verification.json")), readFile(finalReviewPath)
]);
const pageHtml = pageBytes.toString("utf8");
const verification = JSON.parse(verificationBytes);
const finalReview = parseFinalReviewMarkdown(reviewBytes.toString("utf8"));
const resource = resolveWordPressProductResource(pageHtml, verification.target_url);
await mkdir(path.dirname(outputDirectory), { recursive: true });
await mkdir(outputDirectory, { recursive: false });
const rawDirectory = path.join(outputDirectory, "raw");
await mkdir(rawDirectory, { recursive: false });
const writeImmutable = (filePath, value) => writeFile(filePath, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
await writeImmutable(path.join(outputDirectory, "preflight.json"), {
  schema_version: "1.0.0", artifact_type: "cms_mapping_preflight", state: "pass", method: "public_wordpress_rest_read_only",
  endpoint: resource.endpoint, product_post_id: resource.product_post_id, write_capability: false,
  verified_live_hash: verification.verified_content_hash, source_hashes: { page: sha256(pageBytes), verification: sha256(verificationBytes), final_review: sha256(reviewBytes) }
});

let reads = 0;
const response = await (async () => {
  if (reads >= 1) throw new Error("CMS read limit reached.");
  reads += 1;
  return fetch(resource.endpoint, { method: "GET", redirect: "follow", headers: { accept: "application/json", "User-Agent": "StreetKingzCmsMapper/1.0" } });
})();
const rawBody = await response.text();
const cmsRetrieval = {
  requested_url: resource.endpoint, final_url: response.url || resource.endpoint, http_status: response.status,
  retrieved_at: new Date().toISOString(), content_type: response.headers.get("content-type"), content_hash: sha256(rawBody),
  response_size_bytes: Buffer.byteLength(rawBody), retrieval_count: reads, method: "GET", authentication: "none_public_view", write_capability: false
};
await writeImmutable(path.join(rawDirectory, "cms-response.json"), rawBody);
await writeImmutable(path.join(rawDirectory, "cms-retrieval.json"), cmsRetrieval);
if (!response.ok) throw new Error(`WordPress REST read failed with HTTP ${response.status}.`);
const cmsResponse = JSON.parse(rawBody);
const fieldMap = buildCmsFieldMap({ cmsResponse, cmsRetrieval, resource, verification, finalReview, pageHtml });
const errors = validateCmsFieldMap(fieldMap, { cmsResponse, verification, finalReview });
const validationReport = {
  schema_version: "1.0.0", artifact_type: "cms_field_mapping_validation", state: errors.length ? "invalid" : "valid", errors,
  write_operations_performed: 0, approved_candidate_copy_unchanged: true, upstream_artifacts_immutable: true, publication_allowed: false
};
const runMetadata = {
  schema_version: "1.0.0", artifact_type: "cms_field_mapping_run", product_post_id: resource.product_post_id,
  method: "public_wordpress_rest_read_only", reads, writes: 0, endpoint: resource.endpoint, field_map_id: fieldMap.cms_field_map_id,
  approval_state: fieldMap.approval_state, publication_allowed: false
};
await Promise.all([
  writeImmutable(path.join(outputDirectory, "cms-field-map.json"), fieldMap),
  writeImmutable(path.join(outputDirectory, "write-plan.md"), renderCmsWritePlan(fieldMap)),
  writeImmutable(path.join(outputDirectory, "validation-report.json"), validationReport),
  writeImmutable(path.join(outputDirectory, "run-metadata.json"), runMetadata)
]);
console.log(JSON.stringify({ output_directory: outputDirectory, product_post_id: resource.product_post_id, retrieval: cmsRetrieval, mapping_statuses: Object.fromEntries(Object.entries(fieldMap.field_mappings).map(([area, item]) => [area, item.mapping_status])), unknown_cms_ownership: fieldMap.unknown_cms_ownership, validation: validationReport.state, errors }, null, 2));
if (errors.length) process.exitCode = 1;
