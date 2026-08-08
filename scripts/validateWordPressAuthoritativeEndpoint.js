import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createWordPressAuthoritativeReader, mapRequiredElementorWidgets, wordpressReadConfig } from "../cms/wordpressAuthoritativeReader.js";
import { buildAuthoritativeCmsFieldMap, validateAuthoritativeCmsFieldMap } from "../cms/wordpressAuthoritativeMap.js";
import { renderAuthoritativeWritePlan } from "../cms/renderAuthoritativeWritePlan.js";
import { parseFinalReviewMarkdown } from "../verification/currentPage.js";

const postId = 70;
const runId = process.env.WORDPRESS_READ_RUN_ID || "2026-08-08-001";
const runDirectory = path.resolve("artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1", `authoritative-live-${runId}`);
const config = wordpressReadConfig();
const endpoint = new URL(`/wp-json/streetkingz-ai/v1/products/${postId}/authoritative`, config.baseUrl);
await mkdir(runDirectory, { recursive: false });
const securityDirectory = path.join(runDirectory, "security");
await mkdir(securityDirectory, { recursive: false });
const writeImmutable = (target, value) => writeFile(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });

const safeRequest = async (method, name) => {
  const response = await fetch(endpoint, { method, redirect: "follow", headers: { accept: "application/json" } });
  const body = await response.text();
  const result = { method, http_status: response.status, rejected: response.status >= 400, response_body: body };
  await writeImmutable(path.join(securityDirectory, `${name}.json`), result);
  return result;
};
const anonymous = await safeRequest("GET", "anonymous-get");
const methods = {};
for (const method of ["POST", "PUT", "PATCH", "DELETE"]) methods[method] = await safeRequest(method, `${method.toLowerCase()}-probe`);
const securityValidation = {
  schema_version: "1.0.0", artifact_type: "wordpress_authoritative_endpoint_security_validation",
  route: endpoint.pathname, anonymous_rejected: anonymous.rejected, unsupported_methods: Object.fromEntries(Object.entries(methods).map(([method, result]) => [method, { http_status: result.http_status, rejected: result.rejected }])),
  authenticated_unauthorised_user: "NOT_RUN_NO_SECOND_CREDENTIAL", non_product_restriction: "NOT_RUN_TO_MINIMISE_AUTHENTICATED_READS",
  product_content_modifications: 0, capability_or_role_modifications: 0, credentials_persisted: false
};
await writeImmutable(path.join(runDirectory, "security-validation.json"), securityValidation);
if (!anonymous.rejected || Object.values(methods).some((result) => !result.rejected)) throw Object.assign(new Error("Live endpoint security validation failed before the authorised product read."), { code: "ENDPOINT_SECURITY_VALIDATION_FAILED" });

const reader = createWordPressAuthoritativeReader({
  config,
  persistRawResponse: async ({ body, provenance }) => {
    await writeImmutable(path.join(runDirectory, "raw-authoritative-response.json"), body);
    await writeImmutable(path.join(runDirectory, "authoritative-retrieval.json"), { ...provenance, credentials_persisted: false, request_headers_persisted: false, retries: 0, write_capability: false });
  }
});
const authoritativePost = await reader.readPost(postId);
const widgets = mapRequiredElementorWidgets(authoritativePost);
const [finalReviewMarkdown, verification] = await Promise.all([
  readFile("artifacts/human-review/heavy-duty-drying-towel-1200gsm/generation-final-review.md", "utf8"),
  readFile("artifacts/live-validation/current-page-verification-2026-08-08/heavy-duty-drying-towel-1200gsm/retrieval_001/current-page-verification.json", "utf8").then(JSON.parse)
]);
const fieldMap = buildAuthoritativeCmsFieldMap({ authoritativePost, widgets, finalReview: parseFinalReviewMarkdown(finalReviewMarkdown), verification });
const errors = validateAuthoritativeCmsFieldMap(fieldMap);
const authoritativeArtifact = { ...authoritativePost, elementor_widgets: widgets, verified_live_content_hash: fieldMap.drift_guards.verified_live_hash, approval_state: fieldMap.approval_state, write_operations_performed: 0, publication_allowed: false };
const runMetadata = { schema_version: "1.0.0", artifact_type: "wordpress_authoritative_live_validation", post_id: postId, security_requests: 5, authorised_product_get_requests: 1, product_70_get_requests: 1, retries: 0, write_operations: 0, role_or_capability_changes: 0, credentials_persisted: false, validation: errors.length ? "invalid" : "valid", errors };
await Promise.all([
  writeImmutable(path.join(runDirectory, "authoritative-cms-read.json"), authoritativeArtifact),
  writeImmutable(path.join(runDirectory, "cms-field-map.json"), fieldMap),
  writeImmutable(path.join(runDirectory, "write-plan.md"), renderAuthoritativeWritePlan(fieldMap)),
  writeImmutable(path.join(runDirectory, "run-metadata.json"), runMetadata)
]);
console.log(JSON.stringify({ run_directory: runDirectory, security: securityValidation, authenticated_http_status: authoritativePost.provenance.http_status, response_size: authoritativePost.provenance.response_size_bytes, response_hash: authoritativePost.provenance.response_sha256, mapping_statuses: Object.fromEntries(Object.entries(fieldMap.mappings).map(([area, item]) => [area, item.implementation_status])), validation_errors: errors }, null, 2));
if (errors.length) process.exitCode = 1;
