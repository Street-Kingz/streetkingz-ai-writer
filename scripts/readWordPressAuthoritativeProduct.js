import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createWordPressAuthoritativeReader, mapRequiredElementorWidgets, wordpressReadConfig } from "../cms/wordpressAuthoritativeReader.js";
import { buildAuthoritativeCmsFieldMap, validateAuthoritativeCmsFieldMap } from "../cms/wordpressAuthoritativeMap.js";
import { renderAuthoritativeWritePlan } from "../cms/renderAuthoritativeWritePlan.js";
import { parseFinalReviewMarkdown } from "../verification/currentPage.js";

const postId = 70;
const runId = process.env.WORDPRESS_READ_RUN_ID || new Date().toISOString().replace(/[:.]/g, "-");
const runDirectory = path.resolve("artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1", `authoritative-read-${runId}`);
const config = wordpressReadConfig();
await mkdir(runDirectory, { recursive: false });
const rawDirectory = path.join(runDirectory, "raw");
await mkdir(rawDirectory, { recursive: false });
const writeImmutable = (filePath, value) => writeFile(filePath, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
const reader = createWordPressAuthoritativeReader({
  config,
  persistRawResponse: async ({ body, provenance }) => {
    await writeImmutable(path.join(rawDirectory, "authenticated-response.json"), body);
    await writeImmutable(path.join(rawDirectory, "retrieval.json"), { ...provenance, credentials_persisted: false, request_headers_persisted: false, write_capability: false });
  }
});
const authoritativePost = await reader.readPost(postId);
const widgets = mapRequiredElementorWidgets(authoritativePost);
const [finalReviewMarkdown, verification] = await Promise.all([
  readFile("artifacts/human-review/heavy-duty-drying-towel-1200gsm/generation-final-review.md", "utf8"),
  readFile("artifacts/live-validation/current-page-verification-2026-08-08/heavy-duty-drying-towel-1200gsm/retrieval_001/current-page-verification.json", "utf8").then(JSON.parse)
]);
const finalReview = parseFinalReviewMarkdown(finalReviewMarkdown);
const fieldMap = buildAuthoritativeCmsFieldMap({ authoritativePost, widgets, finalReview, verification });
const errors = validateAuthoritativeCmsFieldMap(fieldMap);
const artifact = {
  ...authoritativePost,
  elementor_widgets: widgets,
  verified_live_content_hash: "a5db743344a3c3bd732fa0acddb20df1bbe9a4097d9ba1f9070264e1f93b8c5f",
  blocked_fields: ["slug", "metadata", "schema", "images", "pricing", "inventory", "product_attributes", "layout", "specifications", "care_usage", "internal_links", "additional_faqs", "differentiation"],
  approval_state: "awaiting_human_implementation_approval",
  write_operations_performed: 0,
  publication_allowed: false
};
await Promise.all([
  writeImmutable(path.join(runDirectory, "authoritative-cms-read.json"), artifact),
  writeImmutable(path.join(runDirectory, "cms-field-map.json"), fieldMap),
  writeImmutable(path.join(runDirectory, "write-plan.md"), renderAuthoritativeWritePlan(fieldMap)),
  writeImmutable(path.join(runDirectory, "run-metadata.json"), { schema_version: "1.0.0", artifact_type: "wordpress_authoritative_read_run", post_id: postId, authenticated_read_requests: 1, retries: 0, write_operations: 0, credentials_persisted: false, publication_allowed: false, validation: errors.length ? "invalid" : "valid", errors })
]);
console.log(JSON.stringify({ run_directory: runDirectory, post_id: postId, authenticated_read_requests: 1, widget_ids: Object.values(widgets).map((item) => item.element_id), mapping_statuses: Object.fromEntries(Object.entries(fieldMap.mappings).map(([area, item]) => [area, item.implementation_status])), validation_errors: errors, writes: 0 }, null, 2));
if (errors.length) process.exitCode = 1;
