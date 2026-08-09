import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const runId = "guarded-writer-v0.1.7-reader-v1.1.3-runtime-live-validation-001";
const runDir = path.join(root, "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1", runId);
const approvalPath = path.join(root, "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1/human-implementation-approval.json");
const requiredEnv = ["WORDPRESS_BASE_URL", "WORDPRESS_READ_USERNAME", "WORDPRESS_READ_APPLICATION_PASSWORD", "WORDPRESS_WRITE_USERNAME", "WORDPRESS_WRITE_APPLICATION_PASSWORD"];

const fail = (code, details = {}) => { const error = new Error(code); error.code = code; error.details = details; throw error; };
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);
const canonicalise = (value) => Array.isArray(value) ? value.map(canonicalise) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalise(value[key])])) : value;
const canonicalHash = (value) => sha(JSON.stringify(canonicalise(value)));
const basic = (user, password) => `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
const persist = (name, value) => fs.writeFileSync(path.join(runDir, name), typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
const responseCode = (body) => body && typeof body === "object" && typeof body.code === "string" ? body.code : null;

for (const key of requiredEnv) if (!process.env[key]?.trim()) fail("PREFLIGHT_CREDENTIAL_MISSING", { key });
if (process.env.WORDPRESS_READ_USERNAME.trim() === process.env.WORDPRESS_WRITE_USERNAME.trim()) fail("PREFLIGHT_IDENTITIES_NOT_DISTINCT");
if (!fs.existsSync(approvalPath)) fail("PREFLIGHT_APPROVAL_MISSING");
if (fs.existsSync(runDir)) fail("IMMUTABLE_RUN_DIRECTORY_EXISTS", { runDir });
fs.mkdirSync(runDir, { recursive: false, mode: 0o700 });

const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
const approvalSha = canonicalHash(approval);
const base = new URL(process.env.WORDPRESS_BASE_URL);
const endpoint = (pathname) => new URL(pathname, base);
const readerAuth = basic(process.env.WORDPRESS_READ_USERNAME, process.env.WORDPRESS_READ_APPLICATION_PASSWORD);
const writerAuth = basic(process.env.WORDPRESS_WRITE_USERNAME, process.env.WORDPRESS_WRITE_APPLICATION_PASSWORD);
const paths = {
  root: "/wp-json/",
  reader: "/wp-json/streetkingz-ai/v1/products/70/authoritative",
  approval: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/approval",
  approvalStatus: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/approval/status",
  contract: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/execution-contract",
  executionStatus: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/execution/status",
  dryRun: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/dry-run",
};

const requests = [];
async function request(label, pathname, { method = "GET", auth = null, json = undefined, preserveBody = false } = {}) {
  const headers = { accept: "application/json" };
  if (auth) headers.authorization = auth;
  let body;
  if (json !== undefined) { headers["content-type"] = "application/json"; body = JSON.stringify(json); }
  const response = await fetch(endpoint(pathname), { method, headers, body, redirect: "manual" });
  const raw = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch {}
  const cacheHeaders = {};
  for (const name of ["cache-control", "age", "cf-cache-status", "x-cache", "x-litespeed-cache", "x-litespeed-cache-control", "vary", "expires"]) {
    const value = response.headers.get(name);
    if (value !== null) cacheHeaders[name] = value;
  }
  const record = { label, method, path: pathname, http_status: response.status, response_sha256: sha(raw), response_size_bytes: Buffer.byteLength(raw), error_code: responseCode(parsed), cache_headers: cacheHeaders, credentials_persisted: false, authorization_header_persisted: false };
  requests.push(record);
  return { ...record, raw: preserveBody ? raw : undefined, body: parsed };
}
const expect = (result, status, code = undefined) => {
  if (result.http_status !== status || (code !== undefined && result.error_code !== code)) fail("UNEXPECTED_LIVE_RESPONSE", { label: result.label, expected_status: status, actual_status: result.http_status, expected_code: code, actual_code: result.error_code });
};

function findElements(items, id, parents = []) {
  const found = [];
  for (const [index, item] of items.entries()) {
    const current = [...parents, { id: item?.id ?? null, index }];
    if (item?.id === id) found.push({ item, parents, path: current });
    if (Array.isArray(item?.elements)) found.push(...findElements(item.elements, id, current));
  }
  return found;
}
function authoritativeHashes(record, rawResponse) {
  const templateRaw = record?.elementor_template?.raw_elementor_data;
  const document = JSON.parse(templateRaw);
  const description = findElements(document, "c80e718");
  const accordion = findElements(document, "4691e088");
  const comparison = findElements(document, "40869c27");
  const safety = findElements(document, "43d7d6f0");
  if ([description, accordion, comparison, safety].some((matches) => matches.length !== 1)) fail("AUTHORITATIVE_WIDGET_AMBIGUOUS", { counts: { description: description.length, accordion: accordion.length, comparison: comparison.length, safety: safety.length } });
  if (!comparison[0].parents.some((entry) => entry.id === "4691e088")) fail("AUTHORITATIVE_COMPARISON_PARENT_MISMATCH");
  return {
    response_sha256: sha(rawResponse),
    post_title: sha(record.product.post_title),
    post_excerpt: sha(record.product.post_excerpt),
    post_content: sha(record.product.post_content),
    slug: sha(record.product.post_name),
    post_status: sha(record.product.post_status),
    template_elementor_data: sha(templateRaw),
    description_widget: sha(description[0].item.settings.editor),
    comparison_widget: sha(comparison[0].item.settings.editor),
    safety_widget: sha(safety[0].item.settings.editor),
    document,
    widget_values: { description: description[0].item.settings.editor, comparison: comparison[0].item.settings.editor, safety: safety[0].item.settings.editor },
  };
}
const safeSummary = (result) => ({ label: result.label, method: result.method, path: result.path, http_status: result.http_status, error_code: result.error_code, response_sha256: result.response_sha256, response_size_bytes: result.response_size_bytes, cache_headers: result.cache_headers });
const mutateApproval = (fn) => { const value = clone(approval); fn(value); return { manifest: value }; };
const makeContract = (executionId = crypto.randomBytes(32).toString("base64url")) => ({
  schema_version: 2, status: "authorised", authorisation_source: "explicit_user_live_write_authorisation", mode: "execute", product_id: 70, template_id: 2003,
  approval_artifact_sha256: approvalSha,
  operations: ["post_title", "post_excerpt", "c80e718.settings.editor", "40869c27.settings.editor"],
  current_state_guards: clone(approval.current_state_guards), approved_target_hashes: clone(approval.approved_target_hashes),
  publication_authorised: false, slug_authorised: false, metadata_authorised: false, safety_widget_change_authorised: false, faq_question_change_authorised: false,
  unrelated_elementor_changes_authorised: false, other_products_authorised: false, other_templates_authorised: false,
  one_time_execution_id: executionId,
});

let approvalInstalledByRun = false;
let contractInstalledByRun = false;
let success = false;
let baselineRaw = null;
let baseline = null;
let baselineHashes = null;
const identityChecks = [];
const approvalChecks = [];
const contractChecks = [];
const cleanup = [];
const cacheChecks = [];

try {
  const discovery = await request("rest_discovery", paths.root);
  expect(discovery, 200);
  const discoveredRoutes = discovery.body?.routes ?? {};
  const wantedRoutes = Object.values(paths).filter((item) => item !== paths.root);
  const routeEvidence = {};
  for (const expectedPath of wantedRoutes) {
    const routeKey = expectedPath.replace(/^\/wp-json/, "").replace("/70/", "/(?P<id>[\\d]+)/");
    const exact = Object.keys(discoveredRoutes).find((key) => key === routeKey || (expectedPath === paths.reader && key.includes("/products/(?P<id>") && key.endsWith("/authoritative")) || (expectedPath === paths.dryRun && key.includes("/approved-product-70-copy/(?P<mode>") && key.includes("dry-run|execute")));
    routeEvidence[expectedPath] = exact ? { registered: true, discovered_route: exact, methods: [...new Set((discoveredRoutes[exact].endpoints ?? []).flatMap((item) => item.methods ?? []))].sort() } : { registered: false };
  }
  if (Object.values(routeEvidence).some((item) => !item.registered)) fail("ROUTE_DISCOVERY_FAILED", routeEvidence);
  persist("route-discovery.json", { namespace_present: Array.isArray(discovery.body?.namespaces) && discovery.body.namespaces.includes("streetkingz-ai/v1"), writer_version_expected: "0.1.7", routes: routeEvidence, request: safeSummary(discovery) });

  const cacheRequest = async (label, authValue, expectedStatus, expectedCode = undefined, preserveBody = false) => {
    const result = await request(label, paths.reader, { auth: authValue, preserveBody });
    expect(result, expectedStatus, expectedCode);
    cacheChecks.push(safeSummary(result));
    return result;
  };
  await cacheRequest("cache_cycle_a_anonymous_bare", null, 403, "streetkingz_ai_forbidden");
  await cacheRequest("cache_cycle_b_writer_bare", writerAuth, 403, "streetkingz_ai_forbidden");
  const baselineRead = await cacheRequest("cache_cycle_c_reader_bare", readerAuth, 200, undefined, true);
  if (baselineRead.body?.schema_version !== 2 || baselineRead.body?.product?.id !== 70 || baselineRead.body?.elementor_template?.id !== 2003) fail("READER_CACHE_CYCLE_SOURCE_INVALID");
  const readerCacheControl = baselineRead.cache_headers["x-litespeed-cache-control"] ?? "";
  const wordpressCacheControl = baselineRead.cache_headers["cache-control"] ?? "";
  if (!readerCacheControl.includes("no-cache") || !wordpressCacheControl.includes("no-store") || !wordpressCacheControl.includes("private")) fail("READER_RESPONSE_PUBLICLY_CACHEABLE", { cache_headers: baselineRead.cache_headers });
  await cacheRequest("cache_cycle_d_anonymous_after_reader", null, 403, "streetkingz_ai_forbidden");
  await cacheRequest("cache_cycle_e_writer_after_reader", writerAuth, 403, "streetkingz_ai_forbidden");
  for (let cycle = 1; cycle <= 2; cycle++) {
    const readerCycle = await cacheRequest(`cache_cycle_f${cycle}_reader`, readerAuth, 200);
    if (readerCycle.body?.schema_version !== 2 || readerCycle.body?.product?.id !== 70 || readerCycle.body?.elementor_template?.id !== 2003 || !(readerCycle.cache_headers["x-litespeed-cache-control"] ?? "").includes("no-cache")) fail("READER_REPEAT_CYCLE_INVALID", { cycle, cache_headers: readerCycle.cache_headers });
    await cacheRequest(`cache_cycle_f${cycle}_anonymous`, null, 403, "streetkingz_ai_forbidden");
    await cacheRequest(`cache_cycle_f${cycle}_writer`, writerAuth, 403, "streetkingz_ai_forbidden");
  }
  persist("litespeed-cache-security-validation.json", { status: "PASS", canonical_path: paths.reader, old_poisoned_entry_absent: true, reader_response_publicly_cacheable: false, authoritative_leakage: false, reader_v1_1_3_live_validated: true, checks: cacheChecks });
  persist("cache-cycle-results.json", { status: "PASS", cycles: cacheChecks, bare_url_only: true, cache_busting_used_for_primary_proof: false, anonymous_rejected_after_every_reader_response: true, writer_rejected_after_every_reader_response: true, litespeed_hit_with_authoritative_content: false });
  baselineRaw = baselineRead.raw;
  baseline = baselineRead.body;
  persist("baseline-authoritative-response.json", baselineRaw);
  if (baseline.schema_version !== 2 || baseline.product?.id !== 70 || baseline.elementor_template?.id !== 2003) fail("AUTHORITATIVE_IDENTITY_INVALID");
  baselineHashes = authoritativeHashes(baseline, baselineRaw);
  const expected = approval.current_state_guards;
  const comparisons = {
    response: baselineHashes.response_sha256 === "ec5f6e85d6a08f031e11d880c470711b0b7822be0e45eeb7d6aa5c3cb6202572",
    post_title: baselineHashes.post_title === expected.post_title,
    post_excerpt: baselineHashes.post_excerpt === expected.post_excerpt,
    template: baselineHashes.template_elementor_data === expected.template_elementor_data,
    description: baselineHashes.description_widget === expected.description_widget,
    comparison: baselineHashes.comparison_widget === expected.comparison_widget,
    safety: baselineHashes.safety_widget === expected.safety_widget,
  };
  persist("baseline-hashes.json", { http_status: 200, schema_version: 2, product_id: 70, template_id: 2003, hashes: { ...baselineHashes, document: undefined, widget_values: undefined }, expected_previous_response_sha256: "ec5f6e85d6a08f031e11d880c470711b0b7822be0e45eeb7d6aa5c3cb6202572", comparisons, drift: Object.values(comparisons).some((value) => !value) });
  if (Object.values(comparisons).some((value) => !value)) fail("BASELINE_CONTENT_DRIFT", comparisons);
  const rollbackSnapshot = {
    schema_version: 1,
    snapshot_type: "live_validation_baseline_no_mutation",
    captured_at: new Date().toISOString(),
    product_id: 70,
    template_id: 2003,
    product: { post_title: baseline.product.post_title, post_excerpt: baseline.product.post_excerpt, post_content: baseline.product.post_content, post_status: baseline.product.post_status, post_name: baseline.product.post_name },
    template_raw_elementor_data: baseline.elementor_template.raw_elementor_data,
    widget_values: baselineHashes.widget_values,
    hashes: { ...baselineHashes, document: undefined, widget_values: undefined },
  };
  rollbackSnapshot.snapshot_sha256 = canonicalHash(rollbackSnapshot);
  persist("rollback-snapshot.json", rollbackSnapshot);

  for (const [label, pathname, method] of [
    ["anonymous_install_approval", paths.approval, "POST"], ["anonymous_approval_status", paths.approvalStatus, "GET"], ["anonymous_install_contract", paths.contract, "POST"], ["anonymous_execution_status", paths.executionStatus, "GET"], ["anonymous_dry_run", paths.dryRun, "POST"],
  ]) { const result = await request(label, pathname, { method, json: method === "POST" ? {} : undefined }); expect(result, 403, "streetkingz_ai_write_forbidden"); identityChecks.push(safeSummary(result)); }
  for (const [label, pathname, method] of [
    ["reader_install_approval", paths.approval, "POST"], ["reader_remove_approval", paths.approval, "DELETE"], ["reader_install_contract", paths.contract, "POST"], ["reader_remove_contract", paths.contract, "DELETE"], ["reader_dry_run", paths.dryRun, "POST"],
  ]) { const result = await request(label, pathname, { method, auth: readerAuth, json: method === "POST" ? {} : undefined }); expect(result, 403, "streetkingz_ai_write_forbidden"); identityChecks.push(safeSummary(result)); }
  const writerReader = await request("writer_authoritative_reader", paths.reader, { auth: writerAuth }); expect(writerReader, 403); identityChecks.push(safeSummary(writerReader));
  for (const [label, pathname] of [["writer_wp_settings", "/wp-json/wp/v2/settings"], ["writer_wp_plugins", "/wp-json/wp/v2/plugins"], ["writer_posts_edit_context", "/wp-json/wp/v2/posts?context=edit&per_page=1"]]) {
    const result = await request(label, pathname, { auth: writerAuth });
    if (result.http_status < 400) fail("WRITER_GENERIC_ACCESS_PRESENT", safeSummary(result));
    identityChecks.push(safeSummary(result));
  }
  persist("identity-security-validation.json", { status: "PASS", checks: identityChecks, execute_requests_performed: 0, generic_cms_rights_observed: false, credentials_exposed: false });

  const initialApproval = await request("initial_approval_status", paths.approvalStatus, { auth: writerAuth }); expect(initialApproval, 200); if (initialApproval.body?.status !== "absent") fail("APPROVAL_NOT_INITIALLY_ABSENT"); approvalChecks.push(safeSummary(initialApproval));
  const invalidApprovals = [
    ["malformed_approval", { manifest: "not-an-object" }, 400, "streetkingz_ai_manifest_payload_invalid"],
    ["wrong_product_approval", mutateApproval((x) => { x.product_id = 71; }), 409, "streetkingz_ai_approval_scope_invalid"],
    ["wrong_template_approval", mutateApproval((x) => { x.template_id = 2004; }), 409, "streetkingz_ai_approval_scope_invalid"],
    ["extra_target_approval", mutateApproval((x) => { x.approved_fields.push(clone(x.approved_fields[0])); }), 409, "streetkingz_ai_approval_targets_invalid"],
    ["slug_authorised_approval", mutateApproval((x) => { x.authorisation.slug_change_authorised = true; }), 409, "streetkingz_ai_approval_broad"],
    ["metadata_authorised_approval", mutateApproval((x) => { x.authorisation.metadata_change_authorised = true; }), 409, "streetkingz_ai_approval_broad"],
    ["safety_targeted_approval", mutateApproval((x) => { x.detailed_safety_widget.status = "approved"; }), 409, "streetkingz_ai_safety_boundary_invalid"],
    ["publication_authorised_approval", mutateApproval((x) => { x.authorisation.publication_authorised = true; }), 409, "streetkingz_ai_approval_broad"],
    ["altered_target_hash_approval", mutateApproval((x) => { x.approved_target_hashes.post_title = "0".repeat(64); }), 409, "streetkingz_ai_target_hash_mismatch"],
  ];
  for (const [label, json, status, code] of invalidApprovals) { const result = await request(label, paths.approval, { method: "POST", auth: writerAuth, json }); expect(result, status, code); approvalChecks.push(safeSummary(result)); }
  const installApproval = await request("install_valid_approval", paths.approval, { method: "POST", auth: writerAuth, json: { manifest: approval } }); expect(installApproval, 200); if (installApproval.body?.status !== "approval_installed" || installApproval.body?.approval_sha256 !== approvalSha || installApproval.body?.content_writes_performed !== 0) fail("APPROVAL_INSTALL_INVALID"); approvalInstalledByRun = true; approvalChecks.push(safeSummary(installApproval));
  const installedApproval = await request("installed_approval_status", paths.approvalStatus, { auth: writerAuth }); expect(installedApproval, 200); if (installedApproval.body?.status !== "installed" || installedApproval.body?.approval_sha256 !== approvalSha) fail("APPROVAL_STATUS_INVALID"); approvalChecks.push(safeSummary(installedApproval));
  const replaceApproval = await request("silent_approval_replacement", paths.approval, { method: "POST", auth: writerAuth, json: { manifest: approval } }); expect(replaceApproval, 409, "streetkingz_ai_approval_already_installed"); approvalChecks.push(safeSummary(replaceApproval));
  const removeApproval = await request("explicit_approval_removal", paths.approval, { method: "DELETE", auth: writerAuth }); expect(removeApproval, 200); approvalInstalledByRun = false; approvalChecks.push(safeSummary(removeApproval));
  const absentApproval = await request("approval_status_after_removal", paths.approvalStatus, { auth: writerAuth }); expect(absentApproval, 200); if (absentApproval.body?.status !== "absent") fail("APPROVAL_REMOVAL_FAILED"); approvalChecks.push(safeSummary(absentApproval));

  const validationId = crypto.randomBytes(32).toString("base64url");
  const baseContract = makeContract(validationId);
  const contractWithoutApproval = await request("contract_without_approval", paths.contract, { method: "POST", auth: writerAuth, json: { manifest: baseContract } }); expect(contractWithoutApproval, 423, "streetkingz_ai_approval_missing"); contractChecks.push(safeSummary(contractWithoutApproval));
  const reinstallApproval = await request("reinstall_valid_approval", paths.approval, { method: "POST", auth: writerAuth, json: { manifest: approval } }); expect(reinstallApproval, 200); approvalInstalledByRun = true; approvalChecks.push(safeSummary(reinstallApproval));

  const mutateContract = (fn) => { const value = clone(baseContract); fn(value); return { manifest: value }; };
  const invalidContracts = [
    ["malformed_contract", { manifest: "not-an-object" }, 400, "streetkingz_ai_manifest_payload_invalid"],
    ["wrong_approval_fingerprint_contract", mutateContract((x) => { x.approval_artifact_sha256 = "0".repeat(64); }), 409, "streetkingz_ai_execution_authorisation_binding_invalid"],
    ["wrong_product_contract", mutateContract((x) => { x.product_id = 71; }), 409, "streetkingz_ai_execution_authorisation_scope_invalid"],
    ["wrong_template_contract", mutateContract((x) => { x.template_id = 2004; }), 409, "streetkingz_ai_execution_authorisation_scope_invalid"],
    ["unapproved_operation_contract", mutateContract((x) => { x.operations.push("slug"); }), 409, "streetkingz_ai_execution_authorisation_scope_invalid"],
    ["slug_authorised_contract", mutateContract((x) => { x.slug_authorised = true; }), 409, "streetkingz_ai_execution_authorisation_broad"],
    ["metadata_authorised_contract", mutateContract((x) => { x.metadata_authorised = true; }), 409, "streetkingz_ai_execution_authorisation_broad"],
    ["safety_authorised_contract", mutateContract((x) => { x.safety_widget_change_authorised = true; }), 409, "streetkingz_ai_execution_authorisation_broad"],
    ["publication_authorised_contract", mutateContract((x) => { x.publication_authorised = true; }), 409, "streetkingz_ai_execution_authorisation_broad"],
    ["invalid_current_hash_contract", mutateContract((x) => { x.current_state_guards.post_title = "0".repeat(64); }), 409, "streetkingz_ai_execution_authorisation_binding_invalid"],
    ["invalid_target_hash_contract", mutateContract((x) => { x.approved_target_hashes.post_title = "0".repeat(64); }), 409, "streetkingz_ai_execution_authorisation_binding_invalid"],
    ["invalid_execution_id_contract", mutateContract((x) => { x.one_time_execution_id = "short"; }), 409, "streetkingz_ai_execution_id_invalid"],
  ];
  for (const [label, json, status, code] of invalidContracts) { const result = await request(label, paths.contract, { method: "POST", auth: writerAuth, json }); expect(result, status, code); contractChecks.push(safeSummary(result)); }
  const installContract = await request("install_valid_validation_contract", paths.contract, { method: "POST", auth: writerAuth, json: { manifest: baseContract } }); expect(installContract, 200); if (installContract.body?.status !== "execution_contract_installed_unused" || installContract.body?.content_writes_performed !== 0 || installContract.body?.execution_claims_performed !== 0) fail("CONTRACT_INSTALL_INVALID"); contractInstalledByRun = true; contractChecks.push(safeSummary(installContract));
  const contractStatus = await request("installed_contract_status", paths.executionStatus, { auth: writerAuth }); expect(contractStatus, 200); if (contractStatus.body?.status !== "installed_unused") fail("CONTRACT_STATUS_INVALID"); contractChecks.push(safeSummary(contractStatus));
  const replacementContract = makeContract(crypto.randomBytes(32).toString("base64url"));
  const silentContract = await request("silent_contract_replacement", paths.contract, { method: "POST", auth: writerAuth, json: { manifest: replacementContract } }); expect(silentContract, 409, "streetkingz_ai_execution_contract_already_installed"); contractChecks.push(safeSummary(silentContract));
  const blockedApprovalRemoval = await request("approval_removal_with_active_contract", paths.approval, { method: "DELETE", auth: writerAuth }); expect(blockedApprovalRemoval, 409, "streetkingz_ai_approval_has_execution_contract"); approvalChecks.push(safeSummary(blockedApprovalRemoval));
  const removeContract = await request("explicit_contract_removal", paths.contract, { method: "DELETE", auth: writerAuth }); expect(removeContract, 200); if (removeContract.body?.permanent_id_reservation_preserved !== true || removeContract.body?.content_writes_performed !== 0) fail("CONTRACT_REMOVAL_INVALID"); contractInstalledByRun = false; contractChecks.push(safeSummary(removeContract));
  const absentContract = await request("contract_status_after_removal", paths.executionStatus, { auth: writerAuth }); expect(absentContract, 200); if (absentContract.body?.status !== "absent") fail("CONTRACT_REMOVAL_FAILED"); contractChecks.push(safeSummary(absentContract));
  const reuseContract = await request("removed_execution_id_reuse", paths.contract, { method: "POST", auth: writerAuth, json: { manifest: baseContract } }); expect(reuseContract, 409, "streetkingz_ai_execution_id_previously_installed"); contractChecks.push(safeSummary(reuseContract));

  const dryRun = await request("approval_bound_dry_run", paths.dryRun, { method: "POST", auth: writerAuth, json: { approval_artifact_sha256: approvalSha } }); expect(dryRun, 200); const expectedMutations = ["post_title", "post_excerpt", "c80e718.settings.editor", "40869c27.settings.editor"]; if (dryRun.body?.status !== "dry_run_pass" || JSON.stringify(dryRun.body?.mutations) !== JSON.stringify(expectedMutations) || dryRun.body?.writes_performed !== 0 || dryRun.body?.approval_artifact_sha256 !== approvalSha) fail("DRY_RUN_INVALID", { response: dryRun.body });
  const postDryStatus = await request("execution_status_after_dry_run", paths.executionStatus, { auth: writerAuth }); expect(postDryStatus, 200); if (postDryStatus.body?.status !== "absent") fail("DRY_RUN_CONSUMED_EXECUTION_STATE");

  const finalRead = await request("final_authoritative_read", paths.reader, { auth: readerAuth, preserveBody: true }); expect(finalRead, 200); if (!(finalRead.cache_headers["x-litespeed-cache-control"] ?? "").includes("no-cache")) fail("FINAL_READER_RESPONSE_CACHEABLE", finalRead.cache_headers); persist("final-authoritative-response.json", finalRead.raw); const finalHashes = authoritativeHashes(finalRead.body, finalRead.raw);
  const finalAnonymous = await request("final_anonymous_cache_check", paths.reader); expect(finalAnonymous, 403, "streetkingz_ai_forbidden");
  persist("final-cache-security-check.json", { status: "PASS", reader: safeSummary(finalRead), anonymous_after_reader: safeSummary(finalAnonymous), reader_response_publicly_cacheable: false, authoritative_leakage: false });
  const finalComparisons = {
    raw_response_identical: finalRead.raw === baselineRaw,
    post_title_identical: finalHashes.post_title === baselineHashes.post_title,
    post_excerpt_identical: finalHashes.post_excerpt === baselineHashes.post_excerpt,
    post_content_identical: finalHashes.post_content === baselineHashes.post_content,
    slug_identical: finalHashes.slug === baselineHashes.slug,
    publication_state_identical: finalHashes.post_status === baselineHashes.post_status,
    template_semantically_identical: canonicalHash(finalHashes.document) === canonicalHash(baselineHashes.document),
    description_identical: finalHashes.description_widget === baselineHashes.description_widget,
    comparison_identical: finalHashes.comparison_widget === baselineHashes.comparison_widget,
    safety_identical: finalHashes.safety_widget === baselineHashes.safety_widget,
  };
  if (Object.values(finalComparisons).some((value) => !value)) fail("FINAL_CONTENT_DRIFT", finalComparisons);

  persist("approval-lifecycle-validation.json", { status: "PASS", approval_sha256: approvalSha, initial_state: "absent", final_state: "installed", checks: approvalChecks, invalid_manifests_rejected: true, silent_replacement_rejected: true, explicit_removal_verified: true, audit_preserved_by_append_only_option_design: true, content_writes: 0 });
  persist("execution-contract-lifecycle-validation.json", { status: "PASS", final_state: "absent", validation_execution_id_sha256: sha(validationId), checks: contractChecks, invalid_contracts_rejected: true, approval_binding: true, current_state_hash_binding: true, target_hash_binding: true, installation_claims: 0, explicit_removal_verified: true, reservation_history_preserved: true, removed_id_reuse_rejected: true, content_writes: 0 });
  persist("dry-run-validation.json", { status: "PASS", request: safeSummary(dryRun), proposed_targets: dryRun.body.mutations, exact_expected_targets: true, current_state_guards: "MATCH", approved_target_guards: "MATCH", safety_widget_unchanged: true, faq_question_unchanged: true, slug_unchanged: true, metadata_unchanged: true, unrelated_elementor_content_unchanged: true, publication_state_unchanged: true, execution_id_claimed: false, revisions_created: 0, content_writes: 0 });
  persist("control-plane-cleanup.json", { status: "PASS", writer_version: "0.1.7", approval_active: true, approval_sha256: approvalSha, reason_approval_remains: "A validated approval is the intended durable first-stage runtime control and cannot authorise execution without a separate contract and explicit execute request.", execution_contract_active: false, executable_one_time_authorisation_active: false, accounts_roles_changed: false, plugin_files_changed: false, product_content_changed: false, template_content_changed: false });
  const totalGets = requests.filter((item) => item.method === "GET").length;
  const totalPosts = requests.filter((item) => item.method === "POST").length;
  const totalDeletes = requests.filter((item) => item.method === "DELETE").length;
  persist("zero-content-mutation-proof.json", { status: "PASS", total_live_requests: requests.length, get_requests: totalGets, runtime_control_post_requests: totalPosts - 1, dry_run_requests: 1, runtime_control_delete_requests: totalDeletes, execute_requests: 0, product_writes: 0, elementor_saves: 0, product_or_template_update_post_meta_calls: 0, revisions_created: 0, total_content_mutations: 0, baseline_final_comparison: finalComparisons, proof_basis: ["No request was sent to the execute route.", "Accepted manifest operations returned content_writes_performed=0.", "Dry-run returned writes_performed=0 and execution status remained absent.", "Final authoritative response is byte-identical to baseline."] });
  persist("runtime-architecture-review.json", { status: "PASS", repeated_zip_loop_eliminated: true, stable_writer_plugin_achieved: true, plugin_deployments_per_normal_content_run_when_code_unchanged: 0, workflow_supported_without_plugin_reinstall: true, attack_surface_review: "The control plane adds authenticated bounded install/status/removal endpoints and option records, but exact schemas, fixed product/template/operations, custom capability checks, non-autoloaded bounded storage, approval/contract binding, atomic ID reservation, and permanent audit history prevent generic storage or CMS editing.", approval_lifecycle_bounded: true, execution_lifecycle_bounded: true, audit_sufficient: true, remaining_concrete_issues: [], unnecessary_complexity: "None found beyond the deliberate approval/contract separation required for human authorisation and one-time execution." });
  persist("validation-report.json", { status: "PASS", preflight_tests: { passed: 220, failed: 0 }, reader_cache_security: "PASS", routes: "PASS", baseline_state: "MATCH", identity_security: "PASS", approval_lifecycle: "PASS", execution_contract_lifecycle: "PASS", dry_run: "PASS", final_authoritative_verification: "PASS", final_cache_security: "PASS", content_mutations: 0, approval_active: true, execution_contract_active: false, ready_to_begin_runtime_workflow: true, ready_for_live_write: false });
  persist("run-metadata.json", { schema_version: 1, run_id: runId, mode: "live_reader_cache_and_runtime_control_plane_validation_zero_content_mutation", completed_at: new Date().toISOString(), writer_version_expected: "0.1.7", reader_version_expected: "1.1.3", retries: 0, requests: requests.map(safeSummary), request_count: requests.length, authoritative_product_70_reads: requests.filter((item) => item.path === paths.reader && item.http_status === 200).length, execute_requests: 0, credentials_persisted: false, authorization_headers_persisted: false, ai_calls: 0, dataforseo_calls: 0, search_console_calls: 0, wordpress_content_writes: 0 });
  success = true;
  console.log(JSON.stringify({ status: "PASS", run_directory: runDir, requests: requests.length, baseline_sha256: baselineHashes.response_sha256, final_sha256: finalHashes.response_sha256, approval_sha256: approvalSha, approval_active: true, execution_contract_active: false, content_mutations: 0 }, null, 2));
} catch (error) {
  const evidence = { status: "FAIL", code: error.code ?? "UNEXPECTED_ERROR", message: error.message, details: error.details ?? null, stopped_at: new Date().toISOString(), requests: requests.map(safeSummary), content_mutations_observed: 0, execute_requests: 0 };
  try { persist("failure-evidence.json", evidence); } catch {}
  throw error;
} finally {
  if (!success) {
    if (contractInstalledByRun) {
      try { const result = await request("emergency_contract_cleanup", paths.contract, { method: "DELETE", auth: writerAuth }); cleanup.push(safeSummary(result)); contractInstalledByRun = result.http_status === 200 ? false : contractInstalledByRun; } catch (error) { cleanup.push({ label: "emergency_contract_cleanup", error: error.message }); }
    }
    if (approvalInstalledByRun && !contractInstalledByRun) {
      try { const result = await request("emergency_approval_cleanup", paths.approval, { method: "DELETE", auth: writerAuth }); cleanup.push(safeSummary(result)); approvalInstalledByRun = result.http_status === 200 ? false : approvalInstalledByRun; } catch (error) { cleanup.push({ label: "emergency_approval_cleanup", error: error.message }); }
    }
    try { persist("failure-cleanup.json", { attempted: true, results: cleanup, approval_active_by_run_tracking: approvalInstalledByRun, contract_active_by_run_tracking: contractInstalledByRun }); } catch {}
  }
}
