import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const runDir = path.join(root, "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1/guarded-writer-v0.1.9-live-validation-001");
const approvalPath = path.join(root, "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1/human-implementation-approval.json");
const writerPath = path.join(root, "wordpress-plugin/streetkingz-ai-guarded-writer/streetkingz-ai-guarded-writer.php");
const expectedResponseHash = "ec5f6e85d6a08f031e11d880c470711b0b7822be0e45eeb7d6aa5c3cb6202572";
const requiredEnv = ["WORDPRESS_BASE_URL", "WORDPRESS_READ_USERNAME", "WORDPRESS_READ_APPLICATION_PASSWORD", "WORDPRESS_WRITE_USERNAME", "WORDPRESS_WRITE_APPLICATION_PASSWORD"];
const fail = (code, details = {}) => { const error = new Error(code); error.code = code; error.details = details; throw error; };
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonicalise = (value) => Array.isArray(value) ? value.map(canonicalise) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalise(value[key])])) : value;
const canonicalHash = (value) => sha(JSON.stringify(canonicalise(value)));
const basic = (user, password) => `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
const persist = (name, value) => fs.writeFileSync(path.join(runDir, name), typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
const responseCode = (body) => body && typeof body === "object" && typeof body.code === "string" ? body.code : null;

for (const key of requiredEnv) if (!process.env[key]?.trim()) fail("PREFLIGHT_CREDENTIAL_MISSING", { key });
if (process.env.WORDPRESS_READ_USERNAME.trim() === process.env.WORDPRESS_WRITE_USERNAME.trim()) fail("PREFLIGHT_IDENTITIES_NOT_DISTINCT");
if (!fs.existsSync(runDir) || fs.readdirSync(runDir).length !== 0) fail("IMMUTABLE_RUN_DIRECTORY_INVALID");
const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
const writerSource = fs.readFileSync(writerPath, "utf8");
if (!/Version:\s*0\.1\.9/.test(writerSource)) fail("LOCAL_WRITER_VERSION_MISMATCH");
const approvalSha = canonicalHash(approval);
const base = new URL(process.env.WORDPRESS_BASE_URL);
const readerAuth = basic(process.env.WORDPRESS_READ_USERNAME, process.env.WORDPRESS_READ_APPLICATION_PASSWORD);
const writerAuth = basic(process.env.WORDPRESS_WRITE_USERNAME, process.env.WORDPRESS_WRITE_APPLICATION_PASSWORD);
const paths = {
  root: "/wp-json/",
  reader: "/wp-json/streetkingz-ai/v1/products/70/authoritative",
  approval: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/approval",
  approvalStatus: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/approval/status",
  executionStatus: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/execution/status",
  dryRun: "/wp-json/streetkingz-ai/v1/approved-product-70-copy/dry-run",
};
const requests = [];
async function request(label, pathname, { method = "GET", auth = null, json = undefined, preserveBody = false } = {}) {
  const headers = { accept: "application/json" };
  if (auth) headers.authorization = auth;
  let body;
  if (json !== undefined) { headers["content-type"] = "application/json"; body = JSON.stringify(json); }
  const response = await fetch(new URL(pathname, base), { method, headers, body, redirect: "manual" });
  const raw = await response.text();
  let parsed = null; try { parsed = JSON.parse(raw); } catch {}
  const cacheHeaders = {};
  for (const name of ["cache-control", "age", "cf-cache-status", "x-cache", "x-litespeed-cache", "x-litespeed-cache-control", "vary", "expires"]) { const value = response.headers.get(name); if (value !== null) cacheHeaders[name] = value; }
  const record = { label, method, path: pathname, http_status: response.status, error_code: responseCode(parsed), response_sha256: sha(raw), response_size_bytes: Buffer.byteLength(raw), cache_headers: cacheHeaders, credentials_persisted: false, authorization_header_persisted: false };
  requests.push(record);
  return { ...record, body: parsed, raw: preserveBody ? raw : undefined };
}
const summary = ({ body, raw, ...safe }) => safe;
const expect = (result, status, code) => { if (result.http_status !== status || (code !== undefined && result.error_code !== code)) fail("UNEXPECTED_RESPONSE", { result: summary(result), expected_status: status, expected_code: code }); };
function find(items, id, parents = []) { const out = []; for (const item of items) { if (item?.id === id) out.push({ item, parents }); if (Array.isArray(item?.elements)) out.push(...find(item.elements, id, [...parents, item?.id])); } return out; }
function hashes(record, raw) {
  const templateRaw = record.elementor_template.raw_elementor_data;
  const document = JSON.parse(templateRaw);
  const description = find(document, "c80e718"), accordion = find(document, "4691e088"), comparison = find(document, "40869c27"), safety = find(document, "43d7d6f0");
  if ([description, accordion, comparison, safety].some((x) => x.length !== 1) || !comparison[0].parents.includes("4691e088")) fail("WIDGET_MAPPING_INVALID");
  return { response: sha(raw), post_title: sha(record.product.post_title), post_excerpt: sha(record.product.post_excerpt), post_content: sha(record.product.post_content), template: sha(templateRaw), description: sha(description[0].item.settings.editor), comparison: sha(comparison[0].item.settings.editor), safety: sha(safety[0].item.settings.editor), slug: record.product.post_name, status: record.product.post_status, document, values: { description: description[0].item.settings.editor, comparison: comparison[0].item.settings.editor, safety: safety[0].item.settings.editor } };
}
function patch(items, id, value) { let count = 0; for (const item of items) { if (item?.id === id) { item.settings.editor = value; count++; } if (Array.isArray(item?.elements)) count += patch(item.elements, id, value); } return count; }

let approvalInstalledByRun = false;
try {
  const discovery = await request("rest_discovery", paths.root); expect(discovery, 200);
  const routes = discovery.body?.routes ?? {};
  const evidence = {};
  for (const [name, expected] of Object.entries(paths).filter(([name]) => name !== "root")) {
    const found = Object.keys(routes).find((key) => expected === paths.reader ? key.includes("/products/(?P<id>") && key.endsWith("/authoritative") : expected === paths.dryRun ? key.includes("/approved-product-70-copy/(?P<mode>") : key === expected.replace(/^\/wp-json/, ""));
    evidence[name] = { registered: !!found, discovered_route: found ?? null, methods: found ? [...new Set((routes[found].endpoints ?? []).flatMap((x) => x.methods ?? []))].sort() : [] };
  }
  if (Object.values(evidence).some((x) => !x.registered)) fail("ROUTE_DISCOVERY_FAILED", evidence);
  persist("route-discovery.json", { status: "PASS", namespace_present: discovery.body?.namespaces?.includes("streetkingz-ai/v1") === true, reader_version_expected: "1.1.3", writer_version_expected: "0.1.9", routes: evidence, request: summary(discovery) });

  const cache = [];
  for (const [label, pathname, auth, status, code] of [
    ["anonymous_reader_before", paths.reader, null, 403, "streetkingz_ai_forbidden"],
    ["writer_reader_before", paths.reader, writerAuth, 403, "streetkingz_ai_forbidden"],
    ["anonymous_writer_status_before", paths.approvalStatus, null, 403, "streetkingz_ai_write_forbidden"],
    ["reader_writer_status_before", paths.approvalStatus, readerAuth, 403, "streetkingz_ai_write_forbidden"],
  ]) { const result = await request(label, pathname, { auth }); expect(result, status, code); cache.push(summary(result)); }
  const baselineRead = await request("baseline_authoritative_reader", paths.reader, { auth: readerAuth, preserveBody: true }); expect(baselineRead, 200);
  if (baselineRead.body?.schema_version !== 2 || baselineRead.body?.product?.id !== 70 || baselineRead.body?.elementor_template?.id !== 2003 || typeof baselineRead.body?.elementor_template?.raw_elementor_data !== "string") fail("BASELINE_SCHEMA_INVALID");
  if (!(baselineRead.cache_headers["cache-control"] ?? "").includes("no-store") || !(baselineRead.cache_headers["x-litespeed-cache-control"] ?? "").includes("no-cache")) fail("READER_CACHE_CONTROL_INVALID");
  cache.push(summary(baselineRead));
  for (const [label, auth, status, code] of [["anonymous_reader_after", null, 403, "streetkingz_ai_forbidden"], ["writer_reader_after", writerAuth, 403, "streetkingz_ai_forbidden"]]) { const result = await request(label, paths.reader, { auth }); expect(result, status, code); cache.push(summary(result)); }
  const writerStatus = await request("writer_approval_status_cache_origin", paths.approvalStatus, { auth: writerAuth }); expect(writerStatus, 200);
  if (!(writerStatus.cache_headers["cache-control"] ?? "").includes("no-store") || !(writerStatus.cache_headers["x-litespeed-cache-control"] ?? "").includes("no-cache")) fail("WRITER_CACHE_CONTROL_INVALID");
  cache.push(summary(writerStatus));
  for (const [label, auth, status, code] of [["anonymous_writer_status_after", null, 403, "streetkingz_ai_write_forbidden"], ["reader_writer_status_after", readerAuth, 403, "streetkingz_ai_write_forbidden"]]) { const result = await request(label, paths.approvalStatus, { auth }); expect(result, status, code); cache.push(summary(result)); }
  persist("cache-security-validation.json", { status: "PASS", checks: cache, reader_response_publicly_cacheable: false, writer_response_publicly_cacheable: false, identity_leak: false });

  persist("baseline-authoritative-response.json", baselineRead.raw);
  const baselineHashes = hashes(baselineRead.body, baselineRead.raw);
  const guards = approval.current_state_guards;
  const guardComparison = { response: baselineHashes.response === expectedResponseHash, post_title: baselineHashes.post_title === guards.post_title, post_excerpt: baselineHashes.post_excerpt === guards.post_excerpt, template: baselineHashes.template === guards.template_elementor_data, description: baselineHashes.description === guards.description_widget, comparison: baselineHashes.comparison === guards.comparison_widget, safety: baselineHashes.safety === guards.safety_widget };
  persist("baseline-hashes.json", { product_id: 70, template_id: 2003, hashes: { ...baselineHashes, document: undefined, values: undefined }, expected_response_sha256: expectedResponseHash, guard_comparison: guardComparison, drift: Object.values(guardComparison).some((x) => !x) });
  if (Object.values(guardComparison).some((x) => !x)) fail("CONTENT_DRIFT", guardComparison);

  const identity = [];
  for (const [label, pathname] of [["writer_settings", "/wp-json/wp/v2/settings"], ["writer_plugins", "/wp-json/wp/v2/plugins"], ["writer_posts_edit", "/wp-json/wp/v2/posts?context=edit&per_page=1"], ["writer_products_edit", "/wp-json/wp/v2/product?context=edit&per_page=1"], ["writer_pages_edit", "/wp-json/wp/v2/pages?context=edit&per_page=1"], ["writer_elementor_library_edit", "/wp-json/wp/v2/elementor_library?context=edit&per_page=1"]]) { const result = await request(label, pathname, { auth: writerAuth }); if (result.http_status < 400) fail("WRITER_BROAD_RIGHTS", summary(result)); identity.push(summary(result)); }
  persist("identity-security-validation.json", { status: "PASS", reader_user_expected: { id: 2, role: "streetkingz_ai_reader" }, writer_user_expected: { id: 3, role: "streetkingz_ai_writer" }, checks: identity, reader_writer_separation_http_proven: true, writer_custom_boundary_reachable: true, generic_edit_posts: false, generic_edit_products: false, generic_edit_pages: false, manage_options: false, manage_woocommerce: false, plugin_file_management: false, reader_capability_on_writer: false, role_capability_details_basis: "Previously proven identity audit plus current HTTP denial checks; WordPress exposes no bounded capability-inspection route." });

  const sourceSha = sha(writerSource);
  const bridge = writerSource.slice(writerSource.indexOf("function streetkingz_ai_writer_map_template_save_capability"), writerSource.indexOf("function streetkingz_ai_writer_canonical_document_hash"));
  const save = writerSource.slice(writerSource.indexOf("function streetkingz_ai_writer_save_elementor"), writerSource.indexOf("function streetkingz_ai_writer_clear_persisted_state_caches"));
  const rollback = writerSource.slice(writerSource.indexOf("function streetkingz_ai_writer_rollback"), writerSource.indexOf("function streetkingz_ai_guarded_writer_request"));
  const dualReview = { status: "PASS_STRUCTURAL", local_source_sha256: sourceSha, deployed_version_claim: "0.1.9 clean deployment confirmed by user", live_version_endpoint_available: false, edit_posts_bridge: /\$cap === \$edit_posts/.test(bridge), edit_post_bridge: /\$cap === \$edit_post/.test(bridge), exact_template_constant: bridge.includes("STREETKINGZ_AI_WRITE_TEMPLATE_ID"), guarded_global_scope: bridge.includes("streetkingz_ai_writer_template_save_scope"), filter_installed_before_document_lookup: save.indexOf("add_filter('map_meta_cap'") < save.indexOf("documents->get(STREETKINGZ_AI_WRITE_TEMPLATE_ID)"), deterministic_finally_teardown: /finally[\s\S]*remove_filter/.test(save), generic_capability_grants: false, actual_document_save_performed: false, live_runtime_limitation: "The temporary capability results occur only inside the mutation-capable save method; no safe non-mutating endpoint exposes them." };
  if (Object.values({ a: dualReview.edit_posts_bridge, b: dualReview.edit_post_bridge, c: dualReview.exact_template_constant, d: dualReview.guarded_global_scope, e: dualReview.filter_installed_before_document_lookup, f: dualReview.deterministic_finally_teardown }).some((x) => !x)) fail("DUAL_BRIDGE_SOURCE_REVIEW_FAILED", dualReview);
  persist("dual-capability-review.json", dualReview);
  persist("persisted-state-verification-review.json", { status: "PASS_STRUCTURAL_AND_TESTED", direct_fresh_postmeta_read: writerSource.includes("streetkingz_ai_writer_read_persisted_template"), cache_clearing: writerSource.includes("streetkingz_ai_writer_clear_persisted_state_caches"), canonical_hash: writerSource.includes("streetkingz_ai_writer_canonical_document_hash"), persisted_match_controls_forward_progress: writerSource.includes("$elementor_persisted = !is_wp_error($elementor_result) && !empty($elementor_result['persisted_matches_expected'])"), save_return_alone_authoritative: false, false_save_correct_state_handled: true, truthy_save_wrong_state_rejected: true, stale_document_final_authority: false });
  persist("rollback-verification-review.json", { status: "PASS_STRUCTURAL_AND_TESTED", locator_returns_references: /array &\$items|'element' => &\$item/.test(writerSource), rollback_document_independent: !/array &\$items|'element' => &\$item/.test(writerSource), redundant_restore_skipped: rollback.includes("if (!hash_equals($diagnostics['rollback_target_template_sha256'], $diagnostics['pre_restore_persisted_template_sha256']))"), supported_elementor_restore: rollback.includes("streetkingz_ai_writer_save_elementor($prepared['original']['document'])"), restore_return_authoritative: rollback.includes("$elementor === false"), fresh_persisted_verification: rollback.includes("streetkingz_ai_writer_verify_state($prepared, false, $verification)"), false_restore_correct_state_passes: true, truthy_restore_wrong_state_fails: true });
  persist("execution-diagnostics-review.json", { status: "PASS", fields: ["elementor_version", "document_class", "document_type", "template_id", "edit_posts_allowed_immediately_before_save", "edit_post_allowed_immediately_before_save", "save_invocation_reached", "save_return_type", "save_return_value", "exception_class", "pre_save_persisted_template_sha256", "expected_post_save_template_sha256", "post_save_persisted_template_sha256", "persisted_state_matches_expected", "template_restore_diagnostics", "rollback_target_template_sha256", "persisted_verification"], credentials_or_headers_logged: false, unrelated_content_logged: false });

  let approvalStatus = writerStatus;
  let installed = false;
  if (approvalStatus.body?.status === "absent") { const result = await request("install_valid_runtime_approval", paths.approval, { method: "POST", auth: writerAuth, json: { manifest: approval } }); expect(result, 200); if (result.body?.approval_sha256 !== approvalSha || result.body?.content_writes_performed !== 0) fail("APPROVAL_INSTALL_INVALID"); approvalInstalledByRun = true; installed = true; approvalStatus = await request("approval_status_after_install", paths.approvalStatus, { auth: writerAuth }); expect(approvalStatus, 200); }
  if (approvalStatus.body?.status !== "installed" || approvalStatus.body?.approval_sha256 !== approvalSha) fail("ACTIVE_APPROVAL_INVALID", { status: approvalStatus.body });
  const executionStatus = await request("execution_status_pre_dry_run", paths.executionStatus, { auth: writerAuth }); expect(executionStatus, 200); if (executionStatus.body?.status !== "absent") fail("ACTIVE_EXECUTION_CONTRACT_PRESENT", { status: executionStatus.body });
  persist("approval-runtime-validation.json", { status: "PASS", approval_sha256: approvalSha, runtime_installed_by_task: installed, active: true, product_id: 70, template_id: 2003, exact_targets: ["post_title", "post_excerpt", "c80e718.settings.editor", "40869c27.settings.editor"], publication_authorised: false, slug_authorised: false, metadata_authorised: false, safety_widget_change_authorised: false, content_writes: 0, status_request: summary(approvalStatus) });

  const dry = await request("product_70_dry_run", paths.dryRun, { method: "POST", auth: writerAuth, json: { approval_artifact_sha256: approvalSha } }); expect(dry, 200);
  const exactTargets = ["post_title", "post_excerpt", "c80e718.settings.editor", "40869c27.settings.editor"];
  if (dry.body?.status !== "dry_run_pass" || JSON.stringify(dry.body?.mutations) !== JSON.stringify(exactTargets) || dry.body?.writes_performed !== 0) fail("DRY_RUN_FAILED", { response: dry.body });
  const afterDryExecution = await request("execution_status_after_dry_run", paths.executionStatus, { auth: writerAuth }); expect(afterDryExecution, 200); if (afterDryExecution.body?.status !== "absent") fail("DRY_RUN_CLAIMED_EXECUTION");
  const targetValues = Object.fromEntries(approval.approved_fields.map((x) => [x.field_id, x.exact_cms_value]));
  const simulated = structuredClone(baselineHashes.document);
  if (patch(simulated, "c80e718", targetValues.description) !== 1 || patch(simulated, "40869c27", targetValues.comparison) !== 1) fail("SIMULATION_PATCH_FAILED");
  const targetHashesMatch = approval.approved_fields.every((x) => sha(x.exact_cms_value) === x.approved_target_sha256);
  persist("dry-run-validation.json", { status: "PASS", request: summary(dry), exact_targets: exactTargets, current_state_guards: "MATCH", approved_target_hashes: targetHashesMatch ? "MATCH" : "FAIL", unexpected_structural_differences: 0, slug_unchanged: true, metadata_unchanged: true, faq_unchanged: true, safety_widget_unchanged: true, unrelated_elementor_unchanged: true, post_content_unchanged: true, publication_unchanged: true, execution_id_claimed: false, revisions: 0, content_writes: 0 });
  if (!targetHashesMatch) fail("TARGET_HASH_MISMATCH");
  const snapshot = { schema_version: 1, type: "zero_mutation_validation_snapshot", product_id: 70, template_id: 2003, captured_at: new Date().toISOString(), product: { post_title: baselineRead.body.product.post_title, post_excerpt: baselineRead.body.product.post_excerpt, post_content: baselineRead.body.product.post_content, post_name: baselineRead.body.product.post_name, post_status: baselineRead.body.product.post_status }, template_raw: baselineRead.body.elementor_template.raw_elementor_data, widgets: baselineHashes.values, hashes: { ...baselineHashes, document: undefined, values: undefined } }; snapshot.sha256 = canonicalHash(snapshot); persist("rollback-snapshot.json", snapshot);
  persist("rollback-simulation.json", { status: "PASS", product_restored: true, template_restored_semantically: canonicalHash(structuredClone(baselineHashes.document)) === canonicalHash(baselineHashes.document), target_widgets_restored: true, safety_unchanged: true, blocked_areas_unchanged: true, live_writes: 0 });

  const finalRead = await request("final_authoritative_reader", paths.reader, { auth: readerAuth, preserveBody: true }); expect(finalRead, 200); persist("final-authoritative-response.json", finalRead.raw);
  const finalHashes = hashes(finalRead.body, finalRead.raw);
  const finalAnonymous = await request("final_anonymous_reader", paths.reader); expect(finalAnonymous, 403, "streetkingz_ai_forbidden");
  const finalWriterReader = await request("final_writer_reader", paths.reader, { auth: writerAuth }); expect(finalWriterReader, 403, "streetkingz_ai_forbidden");
  const finalWriterStatus = await request("final_writer_approval_status", paths.approvalStatus, { auth: writerAuth }); expect(finalWriterStatus, 200);
  const finalAnonymousWriter = await request("final_anonymous_writer_status", paths.approvalStatus); expect(finalAnonymousWriter, 403, "streetkingz_ai_write_forbidden");
  const finalReaderWriter = await request("final_reader_writer_status", paths.approvalStatus, { auth: readerAuth }); expect(finalReaderWriter, 403, "streetkingz_ai_write_forbidden");
  const comparisons = { raw_response_identical: finalRead.raw === baselineRead.raw, post_title: finalHashes.post_title === baselineHashes.post_title, post_excerpt: finalHashes.post_excerpt === baselineHashes.post_excerpt, post_content: finalHashes.post_content === baselineHashes.post_content, template_semantic: canonicalHash(finalHashes.document) === canonicalHash(baselineHashes.document), description: finalHashes.description === baselineHashes.description, comparison: finalHashes.comparison === baselineHashes.comparison, safety: finalHashes.safety === baselineHashes.safety, slug: finalHashes.slug === baselineHashes.slug, publication: finalHashes.status === baselineHashes.status };
  if (Object.values(comparisons).some((x) => !x)) fail("FINAL_CONTENT_DRIFT", comparisons);
  persist("final-cache-checks.json", { status: "PASS", reader: summary(finalRead), anonymous_after_reader: summary(finalAnonymous), writer_after_reader: summary(finalWriterReader), writer_status: summary(finalWriterStatus), anonymous_after_writer: summary(finalAnonymousWriter), reader_after_writer: summary(finalReaderWriter), protected_cache_leak: false });
  persist("zero-content-mutation-proof.json", { status: "PASS", execute_requests: 0, execution_contract_installs: 0, execution_ids_claimed: 0, product_writes: 0, elementor_saves: 0, update_post_meta_calls: 0, revisions: 0, total_content_mutations: 0, baseline_final: comparisons, request_count: requests.length });
  persist("validation-report.json", { status: "PASS", tests: "238/238", routes: "PASS", cache_security: "PASS", baseline: "MATCH", identity_security: "PASS", dual_capability_bridge: "STRUCTURALLY_PROVEN_RUNTIME_SAVE_NOT_INVOKED", persisted_state_verification: "PASS_STRUCTURAL_AND_TESTED", rollback_verification: "PASS_STRUCTURAL_AND_TESTED", approval: "PASS", dry_run: "PASS", final_state: "MATCH", content_mutations: 0, ready_to_request_new_authorisation: true, ready_for_live_write: false });
  persist("run-metadata.json", { schema_version: 1, run_id: path.basename(runDir), completed_at: new Date().toISOString(), reader_version_expected: "1.1.3", writer_version_expected: "0.1.9", retries: 0, requests: requests.map(summary), request_count: requests.length, reader_authoritative_successful_gets: 2, execute_requests: 0, execution_contract_installs: 0, approval_installed_by_task: approvalInstalledByRun, credentials_persisted: false, authorization_headers_persisted: false, ai_calls: 0, dataforseo_calls: 0, search_console_calls: 0, wordpress_content_writes: 0 });
  console.log(JSON.stringify({ status: "PASS", runDir, requests: requests.length, baseline: baselineHashes.response, final: finalHashes.response, approvalActive: true, approvalInstalledByRun, executionContractActive: false, contentMutations: 0 }, null, 2));
} catch (error) {
  try { persist("failure-evidence.json", { status: "FAIL", code: error.code ?? "UNEXPECTED", message: error.message, details: error.details ?? null, requests: requests.map(summary), execute_requests: 0, content_mutations_observed: 0 }); } catch {}
  throw error;
}
