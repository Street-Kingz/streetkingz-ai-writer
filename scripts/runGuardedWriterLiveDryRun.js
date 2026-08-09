import fs from "node:fs";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { canonicalAuthoritativePost, mapRequiredElementorWidgets } from "../cms/wordpressAuthoritativeReader.js";
import { prepareGuardedDryRun, simulateRollback } from "../cms/guardedWriter.js";
import { validateHumanImplementationApproval } from "../cms/humanImplementationApproval.js";

const root = process.cwd();
const base = path.join(root, "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1");
const runName = process.env.GUARDED_WRITER_LIVE_RUN_ID || "guarded-writer-live-dry-run-v0.1.4-001";
const runDir = path.join(base, runName);
const approvalPath = path.join(base, "human-implementation-approval.json");
const pluginPath = path.join(root, "wordpress-plugin/streetkingz-ai-guarded-writer/streetkingz-ai-guarded-writer.php");
const executionPath = path.join(root, "wordpress-plugin/streetkingz-ai-guarded-writer/execution-authorisation.json");

function stop(code, details = {}) { throw Object.assign(new Error(code), { code, details }); }
function writeJson(name, value) {
  const target = path.join(runDir, name);
  if (fs.existsSync(target)) stop("IMMUTABLE_ARTIFACT_EXISTS", { target });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return target;
}
function basic(username, password) { return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`; }
function safeResponse(response, body, label, method, endpoint) {
  let parsed = null;
  try { parsed = JSON.parse(body); } catch {}
  return { label, method, endpoint, http_status: response.status, response_size_bytes: Buffer.byteLength(body), response_sha256: sha256(body), response_body: parsed ?? body, credentials_persisted: false, authorization_header_persisted: false };
}

const requiredEnv = ["WORDPRESS_BASE_URL", "WORDPRESS_READ_USERNAME", "WORDPRESS_READ_APPLICATION_PASSWORD", "WORDPRESS_WRITE_USERNAME", "WORDPRESS_WRITE_APPLICATION_PASSWORD"];
const missing = requiredEnv.filter((key) => !String(process.env[key] || "").trim());
if (missing.length) stop("CREDENTIALS_MISSING", { missing });
if (process.env.WORDPRESS_READ_USERNAME.trim() === process.env.WORDPRESS_WRITE_USERNAME.trim()) stop("IDENTITIES_NOT_DISTINCT");
if (fs.existsSync(executionPath)) stop("EXECUTION_AUTHORISATION_PRESENT");
if (!/Version:\s*0\.1\.4\b/.test(fs.readFileSync(pluginPath, "utf8"))) stop("LOCAL_PLUGIN_VERSION_MISMATCH");
if (fs.existsSync(runDir)) stop("IMMUTABLE_RUN_DIRECTORY_EXISTS", { runDir });
fs.mkdirSync(runDir, { recursive: false, mode: 0o700 });

const approvalRaw = fs.readFileSync(approvalPath, "utf8");
const approval = JSON.parse(approvalRaw);
const approvalValidation = validateHumanImplementationApproval(approval);
if (!approvalValidation.valid) stop("APPROVAL_INVALID", { errors: approvalValidation.errors });
const approvalHash = sha256(approvalRaw);
const baseUrl = new URL(process.env.WORDPRESS_BASE_URL);
if (baseUrl.protocol !== "https:") stop("HTTPS_REQUIRED");
const writerPath = "/wp-json/streetkingz-ai/v1/approved-product-70-copy";
const readerPath = "/wp-json/streetkingz-ai/v1/products/70/authoritative";
const writerDryUrl = new URL(`${writerPath}/dry-run`, baseUrl);
const writerExecuteUrl = new URL(`${writerPath}/execute`, baseUrl);
const readerUrl = new URL(readerPath, baseUrl);
const headers = { "content-type": "application/json", accept: "application/json" };
const readAuth = basic(process.env.WORDPRESS_READ_USERNAME, process.env.WORDPRESS_READ_APPLICATION_PASSWORD);
const writeAuth = basic(process.env.WORDPRESS_WRITE_USERNAME, process.env.WORDPRESS_WRITE_APPLICATION_PASSWORD);
const requests = [];

async function request(label, url, { auth = null, body = null, method = "POST" } = {}) {
  const response = await fetch(url, { method, redirect: "follow", headers: { ...headers, ...(auth ? { authorization: auth } : {}) }, ...(body === null ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  const record = safeResponse(response, text, label, method, new URL(url).pathname);
  requests.push(record);
  return record;
}
function errorCode(record) { return record.response_body && typeof record.response_body === "object" ? record.response_body.code : null; }
function requireRejected(record, label) { if (record.http_status < 400) stop("SECURITY_CHECK_UNEXPECTEDLY_ACCEPTED", { label, status: record.http_status }); }

try {
  const exactBody = { approval_artifact_sha256: approvalHash };
  const anonymous = await request("anonymous_dry_run", writerDryUrl, { body: exactBody });
  requireRejected(anonymous, anonymous.label);
  const readerOnly = await request("reader_identity_dry_run", writerDryUrl, { auth: readAuth, body: exactBody });
  requireRejected(readerOnly, readerOnly.label);
  const writerReader = await request("writer_identity_authoritative_read", readerUrl, { auth: writeAuth, method: "GET" });
  requireRejected(writerReader, writerReader.label);
  const executeLocked = await request("execute_without_contract", writerExecuteUrl, { auth: writeAuth, body: { approval_artifact_sha256: approvalHash, execution_authorisation_sha256: "0".repeat(64) } });
  requireRejected(executeLocked, executeLocked.label);
  if (errorCode(executeLocked) !== "streetkingz_ai_execution_locked") stop("EXECUTION_BOUNDARY_NOT_PROVEN", { code: errorCode(executeLocked) });

  const negativePayloads = [
    ["wrong_product", { ...exactBody, product_id: 71 }],
    ["wrong_template", { ...exactBody, template_id: 2004 }],
    ["arbitrary_widget", { ...exactBody, widget_id: "deadbeef" }],
    ["safety_widget", { ...exactBody, widget_id: "43d7d6f0" }],
    ["slug", { ...exactBody, post_name: "changed" }],
    ["metadata", { ...exactBody, meta_description: "changed" }],
    ["faq_question", { ...exactBody, faq_question: "changed" }],
    ["extra_payload", { ...exactBody, unexpected: true }]
  ];
  for (const [label, body] of negativePayloads) {
    const result = await request(label, writerDryUrl, { auth: writeAuth, body });
    requireRejected(result, label);
    if (errorCode(result) !== "streetkingz_ai_write_payload_invalid") stop("BOUNDED_PAYLOAD_REJECTION_UNEXPECTED", { label, code: errorCode(result) });
  }

  const readResponse = await fetch(readerUrl, { method: "GET", redirect: "follow", headers: { accept: "application/json", authorization: readAuth } });
  const readBody = await readResponse.text();
  const readProvenance = { requested_url: readerUrl.href, final_url: readResponse.url || readerUrl.href, http_status: readResponse.status, retrieved_at: new Date().toISOString(), response_size_bytes: Buffer.byteLength(readBody), response_sha256: sha256(readBody), request_count: 1 };
  const rawRead = { ...readProvenance, response_body: (() => { try { return JSON.parse(readBody); } catch { return readBody; } })(), credentials_persisted: false, authorization_header_persisted: false };
  writeJson("fresh-authoritative-source.json", rawRead);
  requests.push({ label: "fresh_authoritative_product_70", method: "GET", endpoint: readerPath, ...readProvenance, credentials_persisted: false, authorization_header_persisted: false });
  if (!readResponse.ok) stop("AUTHORITATIVE_READ_FAILED", { status: readResponse.status });
  const rawRecord = JSON.parse(readBody);
  const authoritative = canonicalAuthoritativePost(rawRecord, readProvenance);
  authoritative.raw_authoritative_response = rawRecord;
  const widgets = mapRequiredElementorWidgets(authoritative);

  const freshGuards = {
    post_title: authoritative.hashes.post_title,
    post_excerpt: authoritative.hashes.post_excerpt,
    template_elementor_data: authoritative.hashes._elementor_data,
    description_widget: widgets.description.authoritative_value_sha256,
    comparison_widget: widgets.comparison_answer.authoritative_value_sha256,
    safety_widget: widgets.detailed_safety_answer.authoritative_value_sha256
  };
  const guardComparison = Object.fromEntries(Object.entries(freshGuards).map(([key, actual]) => [key, { expected: approval.current_state_guards[key], actual, matches: actual === approval.current_state_guards[key] }]));
  const drift = Object.values(guardComparison).some((item) => !item.matches);
  writeJson("fresh-state-guards.json", { product_id: 70, template_id: 2003, guards: guardComparison, drift_detected: drift });
  if (drift) stop("CURRENT_STATE_DRIFT", { guardComparison });

  let rollbackSnapshot;
  const dryRun = await prepareGuardedDryRun({ approval, authoritative, persistRollbackSnapshot: async (snapshot) => {
    rollbackSnapshot = structuredClone(snapshot);
    writeJson("fresh-rollback-snapshot.json", rollbackSnapshot);
  } });
  if (!rollbackSnapshot) stop("ROLLBACK_SNAPSHOT_NOT_PERSISTED");

  const writerDry = await request("writer_authorised_live_state_dry_run", writerDryUrl, { auth: writeAuth, body: exactBody });
  if (writerDry.http_status !== 200 || writerDry.response_body?.status !== "dry_run_pass" || writerDry.response_body?.writes_performed !== 0) stop("WRITER_DRY_RUN_FAILED", { status: writerDry.http_status, body: writerDry.response_body });
  const expectedMutations = ["post_title", "post_excerpt", "c80e718.settings.editor", "40869c27.settings.editor"];
  if (JSON.stringify(writerDry.response_body.mutations) !== JSON.stringify(expectedMutations)) stop("WRITER_MUTATION_SCOPE_MISMATCH", { mutations: writerDry.response_body.mutations });

  const rollback = simulateRollback(dryRun);
  if (rollback.status !== "PASS") stop("ROLLBACK_SIMULATION_FAILED", { rollback });
  const targetHashValidation = Object.fromEntries(approval.approved_fields.map((field) => [field.field_id, { expected: field.approved_target_sha256, actual: sha256(field.exact_cms_value), matches: field.approved_target_sha256 === sha256(field.exact_cms_value) }]));
  const unexpected = [...dryRun.product_diff.filter((item) => !["post_title", "post_excerpt"].includes(item.path)), ...dryRun.elementor_semantic_diff.filter((item) => !item.path.endsWith("id:c80e718.settings.editor") && !item.path.endsWith("id:40869c27.settings.editor"))];
  if (unexpected.length) stop("UNEXPECTED_STRUCTURAL_DIFF", { unexpected });

  const security = {
    plugin_version_expected: "0.1.4",
    deployed_behavior_consistent_with_version: writerDry.http_status === 200,
    identities_distinct: true,
    checks: Object.fromEntries(requests.filter((item) => item.label !== "fresh_authoritative_product_70").map((item) => [item.label, { http_status: item.http_status, error_code: errorCode(item), accepted: item.http_status < 400 }])),
    execution_authorisation_present: false,
    credentials_persisted: false,
    content_mutation_requests: 0
  };
  writeJson("security-validation.json", security);
  writeJson("dry-run-request.json", { endpoint: writerDryUrl.pathname, method: "POST", body: exactBody, credentials_included: false, mode: "dry-run" });
  writeJson("dry-run-mutation-plan.json", { server_response: writerDry.response_body, product_diff: dryRun.product_diff, elementor_diff: dryRun.elementor_semantic_diff, approved_targets: approval.approved_fields.map(({ field_id, cms_target, approved_target_sha256 }) => ({ field_id, cms_target, approved_target_sha256 })) });
  writeJson("target-hash-validation.json", { targets: targetHashValidation, all_match: Object.values(targetHashValidation).every((item) => item.matches) });
  writeJson("structural-diff.json", { product: dryRun.product_diff, elementor: dryRun.elementor_semantic_diff, unexpected_differences: unexpected, blocked_area_verification: dryRun.blocked_area_verification });
  writeJson("rollback-simulation.json", rollback);
  writeJson("zero-write-proof.json", { total_live_requests: requests.length, authoritative_get_requests: 1, security_and_dry_run_requests: requests.length - 1, real_execution_requests: 0, wp_update_post_calls: 0, update_post_meta_calls: 0, elementor_save_calls: 0, revisions_created: 0, live_wordpress_content_writes: 0, proof_basis: ["execute request rejected with streetkingz_ai_execution_locked before source preparation or mutation", "all accepted writer activity used dry-run route whose response reports writes_performed=0", "negative payloads rejected by permission or exact payload validation before source preparation"] });
  writeJson("validation-report.json", { status: "PASS", product_id: 70, template_id: 2003, current_state_guards_match: true, dry_run_pass: true, unexpected_structural_differences: 0, rollback_simulation: rollback.status, execution_authorisation_absent: true, live_content_mutation: false });
  writeJson("run-metadata.json", { schema_version: 1, run_id: runName, created_at: new Date().toISOString(), mode: "live_state_dry_run_zero_mutation", plugin_version_expected: "0.1.4", retries: 0, requests: requests.map(({ label, method, endpoint, http_status, response_size_bytes, response_sha256 }) => ({ label, method, endpoint, http_status, response_size_bytes, response_sha256 })), request_count: requests.length, credentials_persisted: false, ai_calls: 0, dataforseo_calls: 0, search_console_calls: 0, wordpress_content_writes: 0 });
  console.log(JSON.stringify({ status: "PASS", run_directory: runDir, request_count: requests.length, authoritative_reads: 1, security_and_dry_run_requests: requests.length - 1, fresh_guards: guardComparison, product_diff: dryRun.product_diff.map((item) => item.path), elementor_diff: dryRun.elementor_semantic_diff.map((item) => item.path), rollback: rollback.status, writer_response: writerDry.response_body }, null, 2));
} catch (error) {
  const failure = { status: "FAIL", code: error.code || "UNEXPECTED_ERROR", message: error.message, details: error.details || null, requests: requests.map(({ label, method, endpoint, http_status, response_size_bytes, response_sha256 }) => ({ label, method, endpoint, http_status, response_size_bytes, response_sha256 })), request_count: requests.length, retries: 0, wordpress_content_writes: 0, credentials_persisted: false };
  try { writeJson("validation-report.json", failure); } catch {}
  try { writeJson("run-metadata.json", { schema_version: 1, run_id: runName, created_at: new Date().toISOString(), mode: "live_state_dry_run_zero_mutation", plugin_version_expected: "0.1.4", ...failure }); } catch {}
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
}
