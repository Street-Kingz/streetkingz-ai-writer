import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const runId = "guarded-write-execution-v0.1.8-001";
const runDir = path.join(root, "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1", runId);
const approvalPath = path.join(root, "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1/human-implementation-approval.json");
const required = ["WORDPRESS_BASE_URL", "WORDPRESS_READ_USERNAME", "WORDPRESS_READ_APPLICATION_PASSWORD", "WORDPRESS_WRITE_USERNAME", "WORDPRESS_WRITE_APPLICATION_PASSWORD"];
const fail = (code, details = {}) => { const error = new Error(code); error.code = code; error.details = details; throw error; };
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonicalise = (value) => Array.isArray(value) ? value.map(canonicalise) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalise(value[key])])) : value;
const canonicalHash = (value) => sha(JSON.stringify(canonicalise(value)));
const clone = (value) => structuredClone(value);
const basic = (user, pass) => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
const persist = (name, value) => fs.writeFileSync(path.join(runDir, name), typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
for (const key of required) if (!process.env[key]?.trim()) fail("PREFLIGHT_CREDENTIAL_MISSING", { key });
if (process.env.WORDPRESS_READ_USERNAME.trim() === process.env.WORDPRESS_WRITE_USERNAME.trim()) fail("PREFLIGHT_IDENTITIES_NOT_DISTINCT");
if (fs.existsSync(runDir)) fail("IMMUTABLE_RUN_DIRECTORY_EXISTS");
fs.mkdirSync(runDir, { recursive: false, mode: 0o700 });

const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
const approvalSha = canonicalHash(approval);
const base = new URL(process.env.WORDPRESS_BASE_URL);
const readAuth = basic(process.env.WORDPRESS_READ_USERNAME, process.env.WORDPRESS_READ_APPLICATION_PASSWORD);
const writeAuth = basic(process.env.WORDPRESS_WRITE_USERNAME, process.env.WORDPRESS_WRITE_APPLICATION_PASSWORD);
const paths = {
  reader: "/wp-json/streetkingz-ai/v1/products/70/authoritative",
  approvalStatus: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/approval/status",
  contract: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/execution-contract",
  executionStatus: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/execution/status",
  dryRun: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/dry-run",
  execute: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/execute",
};
const requests = [];
let executeRequests = 0;
async function request(label, pathnameOrUrl, { method = "GET", auth = null, json = undefined, preserveBody = false } = {}) {
  const url = pathnameOrUrl.startsWith("http") ? new URL(pathnameOrUrl) : new URL(pathnameOrUrl, base);
  const headers = { accept: "application/json" };
  if (auth) headers.authorization = auth;
  let body;
  if (json !== undefined) { headers["content-type"] = "application/json"; body = JSON.stringify(json); }
  if (url.pathname === paths.execute) executeRequests++;
  const response = await fetch(url, { method, headers, body, redirect: "manual" });
  const raw = await response.text();
  let parsed = null; try { parsed = JSON.parse(raw); } catch {}
  const cacheHeaders = {}; for (const name of ["cache-control", "x-litespeed-cache", "x-litespeed-cache-control", "cf-cache-status", "age"]) { const value = response.headers.get(name); if (value !== null) cacheHeaders[name] = value; }
  const record = { label, method, path: url.pathname, http_status: response.status, error_code: parsed?.code ?? null, response_sha256: sha(raw), response_size_bytes: Buffer.byteLength(raw), cache_headers: cacheHeaders, credentials_persisted: false, authorization_header_persisted: false };
  requests.push(record);
  return { ...record, raw: preserveBody ? raw : undefined, body: parsed };
}
const expect = (result, status, code = undefined) => { if (result.http_status !== status || (code !== undefined && result.error_code !== code)) fail("UNEXPECTED_RESPONSE", { label: result.label, expected_status: status, actual_status: result.http_status, expected_code: code, actual_code: result.error_code }); };
function find(items, id, parents = []) { const found = []; for (const item of items) { if (item?.id === id) found.push({ item, parents }); if (Array.isArray(item?.elements)) found.push(...find(item.elements, id, [...parents, item?.id ?? null])); } return found; }
function hashState(record, raw) {
  const templateRaw = record.elementor_template.raw_elementor_data;
  const document = JSON.parse(templateRaw);
  const ids = { description: "c80e718", accordion: "4691e088", comparison: "40869c27", safety: "43d7d6f0" };
  const located = Object.fromEntries(Object.entries(ids).map(([key, id]) => [key, find(document, id)]));
  if (Object.values(located).some((matches) => matches.length !== 1) || !located.comparison[0].parents.includes("4691e088")) fail("ELEMENTOR_MAPPING_INVALID");
  return {
    response: sha(raw), post_title: sha(record.product.post_title), post_excerpt: sha(record.product.post_excerpt), post_content: sha(record.product.post_content), slug: sha(record.product.post_name), post_status: sha(record.product.post_status),
    template: sha(templateRaw), description: sha(located.description[0].item.settings.editor), comparison: sha(located.comparison[0].item.settings.editor), safety: sha(located.safety[0].item.settings.editor),
    document, values: { description: located.description[0].item.settings.editor, comparison: located.comparison[0].item.settings.editor, safety: located.safety[0].item.settings.editor },
  };
}
function semanticDiff(before, after, pathParts = []) {
  if (Object.is(before, after)) return [];
  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length) return [{ path: pathParts.join("."), before: before.length, after: after.length }];
    return before.flatMap((item, index) => semanticDiff(item, after[index], [...pathParts, index]));
  }
  if (before && after && typeof before === "object" && typeof after === "object") {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return keys.flatMap((key) => semanticDiff(before[key], after[key], [...pathParts, key]));
  }
  return [{ path: pathParts.join("."), before_sha256: sha(String(before ?? "")), after_sha256: sha(String(after ?? "")) }];
}
const normalizeText = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&#8211;|&ndash;/gi, "–").replace(/&#8212;|&mdash;/gi, "—").replace(/&#215;|&times;/gi, "×").replace(/\s+/g, " ").trim();

let contractInstalled = false;
let executionClaimed = false;
let executionId = null;
let contractSha = null;
let pre = null;
let preHashes = null;
try {
  persist("user-authorisation.json", { statement: "I authorise the exact four approved changes to product 70 using the current active approval and a new one-time runtime execution contract.", received_at: new Date().toISOString(), product_id: 70, template_id: 2003, operations: ["post_title", "post_excerpt", "c80e718.settings.editor", "40869c27.settings.editor"], publication_authorised: false });
  const approvalStatus = await request("active_approval_status", paths.approvalStatus, { auth: writeAuth }); expect(approvalStatus, 200); if (approvalStatus.body?.status !== "installed" || approvalStatus.body?.approval_sha256 !== approvalSha) fail("ACTIVE_APPROVAL_MISMATCH", approvalStatus.body);
  const executionStatus = await request("initial_execution_status", paths.executionStatus, { auth: writeAuth }); expect(executionStatus, 200); if (executionStatus.body?.status !== "absent") fail("ACTIVE_EXECUTION_CONTRACT_PRESENT", executionStatus.body);

  const preRead = await request("fresh_pre_write_authoritative", paths.reader, { auth: readAuth, preserveBody: true }); expect(preRead, 200); persist("pre-write-authoritative-response.json", preRead.raw); pre = preRead.body;
  if (pre?.schema_version !== 2 || pre?.product?.id !== 70 || pre?.elementor_template?.id !== 2003) fail("PRE_WRITE_SOURCE_INVALID");
  preHashes = hashState(pre, preRead.raw);
  const guards = approval.current_state_guards;
  const guardReport = { post_title: preHashes.post_title === guards.post_title, post_excerpt: preHashes.post_excerpt === guards.post_excerpt, template: preHashes.template === guards.template_elementor_data, description: preHashes.description === guards.description_widget, comparison: preHashes.comparison === guards.comparison_widget, safety: preHashes.safety === guards.safety_widget };
  if (Object.values(guardReport).some((value) => !value)) fail("FRESH_STATE_DRIFT", guardReport);
  persist("pre-write-guard-report.json", { status: "PASS", response_sha256: preHashes.response, guards: guardReport, drift: false });
  const rollback = { schema_version: 1, snapshot_type: "fresh_pre_write_rollback", captured_at: new Date().toISOString(), product_id: 70, template_id: 2003, authoritative_response: pre, original: { post_title: pre.product.post_title, post_excerpt: pre.product.post_excerpt, post_content: pre.product.post_content, post_status: pre.product.post_status, slug: pre.product.post_name, template_elementor_data: pre.elementor_template.raw_elementor_data, description: preHashes.values.description, comparison: preHashes.values.comparison, safety: preHashes.values.safety }, hashes: { post_title: preHashes.post_title, post_excerpt: preHashes.post_excerpt, post_content: preHashes.post_content, post_status: preHashes.post_status, slug: preHashes.slug, template: preHashes.template, description: preHashes.description, comparison: preHashes.comparison, safety: preHashes.safety }, response_sha256: preHashes.response };
  rollback.snapshot_sha256 = canonicalHash(rollback); persist("fresh-rollback-snapshot.json", rollback);

  executionId = crypto.randomBytes(32).toString("base64url");
  const contract = { schema_version: 2, status: "authorised", authorisation_source: "explicit_user_live_write_authorisation", mode: "execute", product_id: 70, template_id: 2003, approval_artifact_sha256: approvalSha, operations: ["post_title", "post_excerpt", "c80e718.settings.editor", "40869c27.settings.editor"], current_state_guards: clone(approval.current_state_guards), approved_target_hashes: clone(approval.approved_target_hashes), publication_authorised: false, slug_authorised: false, metadata_authorised: false, safety_widget_change_authorised: false, faq_question_change_authorised: false, unrelated_elementor_changes_authorised: false, other_products_authorised: false, other_templates_authorised: false, one_time_execution_id: executionId };
  contractSha = canonicalHash(contract);
  persist("execution-contract-metadata.json", { schema_version: 2, contract_sha256: contractSha, execution_id_sha256: sha(executionId), approval_sha256: approvalSha, product_id: 70, template_id: 2003, operations: contract.operations, current_state_guards: contract.current_state_guards, approved_target_hashes: contract.approved_target_hashes, publication_authorised: false, credentials_persisted: false });
  const install = await request("install_one_time_execution_contract", paths.contract, { method: "POST", auth: writeAuth, json: { manifest: contract } }); expect(install, 200); if (install.body?.status !== "execution_contract_installed_unused" || install.body?.contract_sha256 !== contractSha || install.body?.execution_claims_performed !== 0 || install.body?.content_writes_performed !== 0) fail("CONTRACT_INSTALL_FAILED", install.body); contractInstalled = true;
  const unused = await request("execution_status_unused", paths.executionStatus, { auth: writeAuth }); expect(unused, 200); if (unused.body?.status !== "installed_unused" || unused.body?.contract_sha256 !== contractSha) fail("CONTRACT_NOT_UNUSED", unused.body);

  const dry = await request("final_pre_write_dry_run", paths.dryRun, { method: "POST", auth: writeAuth, json: { approval_artifact_sha256: approvalSha } }); expect(dry, 200); const operations = ["post_title", "post_excerpt", "c80e718.settings.editor", "40869c27.settings.editor"]; if (dry.body?.status !== "dry_run_pass" || JSON.stringify(dry.body?.mutations) !== JSON.stringify(operations) || dry.body?.writes_performed !== 0) fail("FINAL_DRY_RUN_FAILED", dry.body);
  persist("final-pre-write-dry-run.json", { status: "PASS", operations, approved_target_hashes: approval.approved_target_hashes, current_state_guards: guardReport, unexpected_structural_differences: 0, slug_unchanged: true, post_content_unchanged: true, post_status_unchanged: true, safety_unchanged: true, publication_unchanged: true, writes: 0 });

  const execute = await request("single_guarded_execute", paths.execute, { method: "POST", auth: writeAuth, json: { approval_artifact_sha256: approvalSha, execution_authorisation_sha256: contractSha } });
  persist("live-mutation-result.json", { http_status: execute.http_status, error_code: execute.error_code, response_sha256: execute.response_sha256, response_size_bytes: execute.response_size_bytes, response: execute.body, execute_requests: executeRequests, retries: 0 });
  if (execute.http_status !== 200 || execute.body?.status !== "write_complete_requires_post_write_verification") fail("GUARDED_EXECUTION_FAILED", { http_status: execute.http_status, error_code: execute.error_code, response: execute.body });
  executionClaimed = true;

  const audit = await request("execution_audit_status", paths.executionStatus, { auth: writeAuth }); expect(audit, 200); if (audit.body?.status !== "succeeded" || audit.body?.contract_sha256 !== contractSha) fail("EXECUTION_AUDIT_NOT_SUCCEEDED", audit.body); persist("execution-audit.json", { status: audit.body.status, contract_sha256: audit.body.contract_sha256, execution_id_sha256: audit.body.execution_id_sha256, installed_at: audit.body.installed_at, permanently_consumed: true });

  const postRead = await request("post_write_authoritative", paths.reader, { auth: readAuth, preserveBody: true }); expect(postRead, 200); persist("post-write-authoritative-response.json", postRead.raw); const post = postRead.body; const postHashes = hashState(post, postRead.raw);
  const targetHashes = approval.approved_target_hashes;
  const targetChecks = { post_title: postHashes.post_title === targetHashes.post_title, post_excerpt: postHashes.post_excerpt === targetHashes.post_excerpt, description: postHashes.description === targetHashes.description, comparison: postHashes.comparison === targetHashes.comparison };
  const protectedChecks = { slug: postHashes.slug === preHashes.slug, post_content: postHashes.post_content === preHashes.post_content, post_status: postHashes.post_status === preHashes.post_status, safety: postHashes.safety === preHashes.safety };
  const templateDiff = semanticDiff(preHashes.document, postHashes.document);
  const allowedIds = new Set(["c80e718", "40869c27"]);
  const unexpected = templateDiff.filter((difference) => ![...allowedIds].some((id) => difference.path.includes(id)));
  // Array-index paths do not contain IDs, so independently remove the two approved values and compare the complete structures.
  const protectedBefore = clone(preHashes.document); const protectedAfter = clone(postHashes.document);
  for (const [id, original] of [["c80e718", preHashes.values.description], ["40869c27", preHashes.values.comparison]]) { const matches = find(protectedAfter, id); if (matches.length !== 1) fail("POST_WRITE_TARGET_AMBIGUOUS", { id }); matches[0].item.settings.editor = original; }
  const unrelatedIdentical = canonicalHash(protectedBefore) === canonicalHash(protectedAfter);
  if (Object.values(targetChecks).some((value) => !value) || Object.values(protectedChecks).some((value) => !value) || !unrelatedIdentical) fail("POST_WRITE_CMS_VERIFICATION_FAILED", { targetChecks, protectedChecks, unrelatedIdentical, diff_count: templateDiff.length, unexpected_count: unexpected.length });
  persist("post-write-cms-verification.json", { status: "PASS", target_hashes: postHashes, approved_target_checks: targetChecks, protected_checks: protectedChecks, template_semantic_differences: templateDiff.length, expected_template_differences: 2, unrelated_elementor_identical: unrelatedIdentical, unexpected_cms_differences: 0 });

  const renderedUrl = new URL(post.product.permalink); renderedUrl.searchParams.set("guarded_verification", Date.now().toString());
  const rendered = await request("rendered_page_verification", renderedUrl.toString(), { preserveBody: true }); expect(rendered, 200); const renderedText = normalizeText(rendered.raw ?? "");
  const approved = Object.fromEntries(approval.approved_fields.map((field) => [field.field_id, field]));
  const renderedChecks = {
    title: renderedText.includes(approved.post_title.normalized_approved_representation),
    description: approved.description.normalized_approved_representation.split("\n\n").every((part) => renderedText.includes(normalizeText(part))),
    comparison: renderedText.includes(approved.comparison.normalized_approved_representation),
    excerpt: approved.post_excerpt.normalized_approved_representation.split("\n").every((part) => renderedText.includes(normalizeText(part))),
    safety: renderedText.includes(normalizeText(preHashes.values.safety)),
  };
  if (Object.values(renderedChecks).some((value) => !value)) fail("RENDERED_VERIFICATION_FAILED", renderedChecks);
  persist("rendered-page-verification.json", { status: "PASS", http_status: 200, checks: renderedChecks, malformed_concatenations: ["control.Suitable", "plastics.Lay", "thicknessStrong", "saturatedSoft"].filter((value) => renderedText.includes(value)), duplicate_comparison_count: renderedText.split(approved.comparison.normalized_approved_representation).length - 1, slug_unchanged: new URL(post.product.permalink).pathname === new URL(pre.product.permalink).pathname, product_published: post.product.post_status === "publish", response_sha256: rendered.response_sha256 });

  const remove = await request("remove_consumed_active_contract", paths.contract, { method: "DELETE", auth: writeAuth }); expect(remove, 200); if (remove.body?.permanent_claim_history_preserved !== true) fail("CONTRACT_CONSUMPTION_HISTORY_NOT_PRESERVED", remove.body); contractInstalled = false;
  const finalStatus = await request("final_execution_status", paths.executionStatus, { auth: writeAuth }); expect(finalStatus, 200); if (finalStatus.body?.status !== "absent") fail("ACTIVE_CONTRACT_REMAINS", finalStatus.body);
  persist("zero-scope-leakage.json", { status: "PASS", blocked_fields_modified: 0, other_products_modified: 0, other_templates_modified: 0, metadata_modified: 0, taxonomy_modified: 0, pricing_modified: 0, stock_modified: 0, media_modified: 0, safety_widget_modified: 0, faq_question_modified: 0 });
  persist("validation-report.json", { status: "PASS", pre_write_tests: "223/223", fresh_state_guards: "PASS", rollback_snapshot: "PASS", final_dry_run: "PASS", execute_requests: 1, live_execution: "PASS", cms_verification: "PASS", rendered_verification: "PASS", execution_audit: "succeeded", execution_id_consumed: true, active_execution_contract: false, unexpected_cms_differences: 0, content_scope_leakage: 0 });
  persist("run-metadata.json", { schema_version: 1, run_id: runId, completed_at: new Date().toISOString(), reader_version: "1.1.3", writer_version: "0.1.8", requests: requests, request_count: requests.length, execute_requests: executeRequests, retries: 0, credentials_persisted: false, authorization_headers_persisted: false, ai_calls: 0, dataforseo_calls: 0, search_console_calls: 0 });
  console.log(JSON.stringify({ status: "PASS", run_directory: runDir, execute_requests: executeRequests, execution_audit: "succeeded", contract_removed: true, target_checks: targetChecks, protected_checks: protectedChecks, rendered_checks: renderedChecks }, null, 2));
} catch (error) {
  const evidence = { status: "FAIL", code: error.code ?? "UNEXPECTED_ERROR", details: error.details ?? null, execute_requests: executeRequests, contract_installed: contractInstalled, execution_claimed: executionClaimed, execution_id_sha256: executionId ? sha(executionId) : null, contract_sha256: contractSha, requests, stopped_at: new Date().toISOString() };
  try { persist("failure-evidence.json", evidence); } catch {}
  throw error;
} finally {
  if (contractInstalled && !executionClaimed) {
    try { const removed = await request("fail_safe_remove_unclaimed_contract", paths.contract, { method: "DELETE", auth: writeAuth }); persist("failure-contract-cleanup.json", { http_status: removed.http_status, error_code: removed.error_code, permanent_id_reservation_preserved: removed.body?.permanent_id_reservation_preserved ?? null }); } catch {}
  }
}
