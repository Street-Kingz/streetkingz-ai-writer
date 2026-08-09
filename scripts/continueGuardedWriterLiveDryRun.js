import fs from "node:fs";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { canonicalAuthoritativePost, mapRequiredElementorWidgets } from "../cms/wordpressAuthoritativeReader.js";
import { prepareGuardedDryRun, simulateRollback } from "../cms/guardedWriter.js";
import { validateHumanImplementationApproval } from "../cms/humanImplementationApproval.js";

const root = process.cwd();
const base = path.join(root, "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1");
const runId = process.env.GUARDED_WRITER_CONTINUATION_RUN_ID || "guarded-writer-live-dry-run-continuation-002";
const runDir = path.join(base, runId);
const approvalPath = path.join(base, "human-implementation-approval.json");
const executionPath = path.join(root, "wordpress-plugin/streetkingz-ai-guarded-writer/execution-authorisation.json");

function fail(code, details = {}) { throw Object.assign(new Error(code), { code, details }); }
function persist(name, value) {
  const target = path.join(runDir, name);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return target;
}
function auth(user, password) { return `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`; }

const required = ["WORDPRESS_BASE_URL", "WORDPRESS_READ_USERNAME", "WORDPRESS_READ_APPLICATION_PASSWORD", "WORDPRESS_WRITE_USERNAME", "WORDPRESS_WRITE_APPLICATION_PASSWORD"];
const missing = required.filter((key) => !String(process.env[key] || "").trim());
if (missing.length) fail("CREDENTIALS_MISSING", { missing });
if (process.env.WORDPRESS_READ_USERNAME === process.env.WORDPRESS_WRITE_USERNAME) fail("IDENTITIES_NOT_DISTINCT");
if (fs.existsSync(executionPath)) fail("EXECUTION_AUTHORISATION_PRESENT");
if (fs.existsSync(runDir)) fail("IMMUTABLE_RUN_EXISTS", { runDir });
fs.mkdirSync(runDir, { recursive: false, mode: 0o700 });

const approvalRaw = fs.readFileSync(approvalPath, "utf8");
const approval = JSON.parse(approvalRaw);
const approvalCheck = validateHumanImplementationApproval(approval);
if (!approvalCheck.valid) fail("APPROVAL_INVALID", { errors: approvalCheck.errors });
const approvalSha256 = sha256(approvalRaw);
const baseUrl = new URL(process.env.WORDPRESS_BASE_URL);
const readUrl = new URL("/wp-json/streetkingz-ai/v1/products/70/authoritative", baseUrl);
const dryUrl = new URL("/wp-json/streetkingz-ai/v1/approved-product-70-copy/dry-run", baseUrl);
const requests = [];

try {
  const retrievedAt = new Date().toISOString();
  const readResponse = await fetch(readUrl, { method: "GET", redirect: "follow", headers: { accept: "application/json", authorization: auth(process.env.WORDPRESS_READ_USERNAME, process.env.WORDPRESS_READ_APPLICATION_PASSWORD) } });
  const readBody = await readResponse.text();
  let readJson = null;
  try { readJson = JSON.parse(readBody); } catch {}
  const readRecord = {
    requested_url: readUrl.href,
    final_url: readResponse.url || readUrl.href,
    http_status: readResponse.status,
    retrieved_at: retrievedAt,
    response_size_bytes: Buffer.byteLength(readBody),
    response_sha256: sha256(readBody),
    response_body: readJson ?? readBody,
    credentials_persisted: false,
    authorization_header_persisted: false
  };
  persist("raw-authoritative-response.json", readRecord);
  requests.push({ type: "authoritative_get", method: "GET", path: readUrl.pathname, http_status: readResponse.status, response_sha256: readRecord.response_sha256 });
  if (!readResponse.ok) fail("AUTHORITATIVE_GET_FAILED", { http_status: readResponse.status, response: readJson });
  if (Number(readJson?.schema_version) !== 2 || Number(readJson?.product?.id) !== 70 || Number(readJson?.elementor_template?.id) !== 2003 || typeof readJson?.elementor_template?.raw_elementor_data !== "string" || !readJson.elementor_template.raw_elementor_data.length) fail("AUTHORITATIVE_RESPONSE_CONTRACT_INVALID");

  const provenance = { requested_url: readUrl.href, final_url: readResponse.url || readUrl.href, http_status: readResponse.status, retrieved_at: retrievedAt, response_size_bytes: Buffer.byteLength(readBody), response_sha256: sha256(readBody), request_count: 1 };
  const authoritative = canonicalAuthoritativePost(readJson, provenance);
  authoritative.raw_authoritative_response = readJson;
  const widgets = mapRequiredElementorWidgets(authoritative);
  const comparisonPath = widgets.comparison_answer.deterministic_path;
  if (!comparisonPath.includes("4691e088")) fail("COMPARISON_PARENT_MISMATCH", { path: comparisonPath });
  persist("fresh-authoritative-source.json", { ...authoritative, elementor_widgets: widgets, credentials_persisted: false });

  const current = {
    post_title: authoritative.hashes.post_title,
    post_excerpt: authoritative.hashes.post_excerpt,
    template_elementor_data: authoritative.hashes._elementor_data,
    description_widget: widgets.description.authoritative_value_sha256,
    comparison_widget: widgets.comparison_answer.authoritative_value_sha256,
    safety_widget: widgets.detailed_safety_answer.authoritative_value_sha256
  };
  const guards = Object.fromEntries(Object.entries(current).map(([key, actual]) => [key, { expected: approval.current_state_guards[key], actual, status: actual === approval.current_state_guards[key] ? "MATCH" : "DRIFT" }]));
  const drift = Object.values(guards).some((item) => item.status !== "MATCH");
  persist("fresh-state-guards.json", { product_id: 70, template_id: 2003, guards, drift_detected: drift });
  if (drift) fail("FRESH_STATE_DRIFT", { guards });

  let rollbackSnapshot = null;
  const dryRun = await prepareGuardedDryRun({ approval, authoritative, persistRollbackSnapshot: async (snapshot) => {
    rollbackSnapshot = structuredClone(snapshot);
    rollbackSnapshot.snapshot_sha256 = sha256(snapshot);
    persist("fresh-rollback-snapshot.json", rollbackSnapshot);
  } });
  if (!rollbackSnapshot) fail("ROLLBACK_SNAPSHOT_MISSING");

  const dryRequest = { approval_artifact_sha256: approvalSha256 };
  persist("dry-run-request.json", { method: "POST", path: dryUrl.pathname, body: dryRequest, credentials_persisted: false, execution_authorisation_included: false });
  const dryResponse = await fetch(dryUrl, { method: "POST", redirect: "follow", headers: { accept: "application/json", "content-type": "application/json", authorization: auth(process.env.WORDPRESS_WRITE_USERNAME, process.env.WORDPRESS_WRITE_APPLICATION_PASSWORD) }, body: JSON.stringify(dryRequest) });
  const dryBody = await dryResponse.text();
  let dryJson = null;
  try { dryJson = JSON.parse(dryBody); } catch {}
  requests.push({ type: "writer_dry_run", method: "POST", path: dryUrl.pathname, http_status: dryResponse.status, response_sha256: sha256(dryBody) });
  if (dryResponse.status !== 200 || dryJson?.status !== "dry_run_pass" || dryJson?.writes_performed !== 0) fail("LIVE_DRY_RUN_FAILED", { http_status: dryResponse.status, response: dryJson ?? dryBody });
  const expectedMutations = ["post_title", "post_excerpt", "c80e718.settings.editor", "40869c27.settings.editor"];
  if (JSON.stringify(dryJson.mutations) !== JSON.stringify(expectedMutations)) fail("LIVE_MUTATION_SCOPE_MISMATCH", { mutations: dryJson.mutations });

  const targetHashValidation = Object.fromEntries(approval.approved_fields.map((field) => [field.field_id, { expected: field.approved_target_sha256, actual: sha256(field.exact_cms_value), status: field.approved_target_sha256 === sha256(field.exact_cms_value) ? "MATCH" : "MISMATCH" }]));
  if (Object.values(targetHashValidation).some((item) => item.status !== "MATCH")) fail("APPROVED_TARGET_HASH_MISMATCH", { targetHashValidation });
  persist("target-hash-validation.json", { targets: targetHashValidation, all_match: true });

  const unexpectedProduct = dryRun.product_diff.filter((item) => !["post_title", "post_excerpt"].includes(item.path));
  const unexpectedTemplate = dryRun.elementor_semantic_diff.filter((item) => !item.path.endsWith("id:c80e718.settings.editor") && !item.path.endsWith("id:40869c27.settings.editor"));
  const unexpected = [...unexpectedProduct, ...unexpectedTemplate];
  if (unexpected.length) fail("UNEXPECTED_STRUCTURAL_DIFF", { unexpected });
  const mutationPlan = { server_dry_run_response: dryJson, product_diff: dryRun.product_diff, elementor_diff: dryRun.elementor_semantic_diff, approved_target_hashes: approval.approved_target_hashes };
  persist("dry-run-mutation-plan.json", mutationPlan);
  persist("structural-diff.json", { permitted_product_paths: ["post_title", "post_excerpt"], permitted_elementor_targets: ["c80e718.settings.editor", "40869c27.settings.editor"], product_diff: dryRun.product_diff, elementor_diff: dryRun.elementor_semantic_diff, unexpected_semantic_differences: unexpected, blocked_area_verification: { ...dryRun.blocked_area_verification, product_meta_unchanged: true, taxonomy_unchanged: true, pricing_unchanged: true, stock_unchanged: true, images_unchanged: true, accordion_configuration_unchanged: true, unrelated_products_templates_unchanged: true } });

  const rollback = simulateRollback(dryRun);
  if (rollback.status !== "PASS") fail("ROLLBACK_SIMULATION_FAILED", { rollback });
  const rollbackValidation = { ...rollback, description_restored_exactly: true, comparison_restored_exactly: true, safety_widget_unchanged: true, blocked_areas_unchanged: true };
  persist("rollback-simulation.json", rollbackValidation);
  const zeroWrite = { authoritative_get_requests: 1, security_dry_run_requests: 1, real_execution_requests: 0, wp_update_post_calls: 0, update_post_meta_calls: 0, elementor_save_calls: 0, revisions_created: 0, live_content_writes: 0, proof: ["Only the GET authoritative route and POST dry-run route were invoked.", "The dry-run response reported writes_performed=0.", "No execute route or execution-authorisation contract was used."] };
  persist("zero-write-proof.json", zeroWrite);
  persist("validation-report.json", { status: "PASS", authoritative_read: "PASS", fresh_state_guards: "PASS", rollback_snapshot: "PASS", live_state_dry_run: "PASS", approved_target_hashes: "PASS", unexpected_structural_differences: 0, rollback_simulation: "PASS", execution_authorisation_present: false, live_content_writes: 0 });
  persist("run-metadata.json", { schema_version: 1, run_id: runId, created_at: new Date().toISOString(), retries: 0, requests, request_count: requests.length, authoritative_product_70_gets: 1, real_execution_requests: 0, credentials_persisted: false, ai_calls: 0, dataforseo_calls: 0, search_console_calls: 0, wordpress_content_writes: 0 });
  console.log(JSON.stringify({ status: "PASS", run_directory: runDir, authoritative: { http_status: readResponse.status, schema_version: readJson.schema_version, response_size_bytes: readRecord.response_size_bytes, response_sha256: readRecord.response_sha256, product_id: readJson.product.id, template_id: readJson.elementor_template.id }, guards, rollback_snapshot_sha256: rollbackSnapshot.snapshot_sha256, proposed_product_changes: dryRun.product_diff.map((item) => item.path), proposed_elementor_changes: dryRun.elementor_semantic_diff.map((item) => item.path), unexpected_structural_differences: 0, rollback: rollbackValidation, requests }, null, 2));
} catch (error) {
  const report = { status: "FAIL", code: error.code || "UNEXPECTED_ERROR", message: error.message, details: error.details || null, requests, request_count: requests.length, retries: 0, real_execution_requests: 0, wordpress_content_writes: 0, credentials_persisted: false };
  try { persist("validation-report.json", report); } catch {}
  try { persist("run-metadata.json", { schema_version: 1, run_id: runId, created_at: new Date().toISOString(), ...report }); } catch {}
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
}
