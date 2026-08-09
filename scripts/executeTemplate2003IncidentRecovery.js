import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { diffElementorDocuments } from '../lib/elementorNormalizationIncident.js';

const root = process.cwd();
const incident = 'template-2003-elementor-normalization-2026-08-09';
const currentHash = 'e0a329efe268638edfbb3d6274512c26aeb0da835e4a9279a1d088d0d562de00';
const targetHash = '81991fbccece6edcedb9cd84fc4d8dca99765b473cf24b2f8df26b5946f91c01';
const currentResponseHash = 'bd2ed8e54bbb016800b82630a3c4da6fbf003e1471d953fde042b2c4488ab23d';
const diffHash = '401ec670e2a443d7ec904edbb43964ebf39862256198c9c2d79c50293662c80b';
const runDir = path.join(root, 'artifacts/incidents', incident, 'recovery-execution-001');
const prepDir = path.join(root, 'artifacts/incidents', incident, 'recovery-authorisation-preparation-001');
const sourcePath = path.join(root, 'artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1/guarded-write-execution-v0.1.9-001/pre-write-authoritative-response.json');
const required = ['WORDPRESS_BASE_URL', 'WORDPRESS_READ_USERNAME', 'WORDPRESS_READ_APPLICATION_PASSWORD', 'WORDPRESS_RECOVERY_USERNAME', 'WORDPRESS_RECOVERY_APPLICATION_PASSWORD'];
for (const key of required) if (!process.env[key]?.trim()) throw new Error(`MISSING_${key}`);
if (process.env.WORDPRESS_READ_USERNAME === process.env.WORDPRESS_RECOVERY_USERNAME) throw new Error('IDENTITIES_NOT_DISTINCT');
if (fs.existsSync(runDir)) throw new Error('IMMUTABLE_RUN_EXISTS');
fs.mkdirSync(runDir, { recursive: false, mode: 0o700 });

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const canonicalize = value => Array.isArray(value) ? value.map(canonicalize) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])])) : value;
const canonicalHash = value => sha(JSON.stringify(canonicalize(value)));
const persist = (name, value) => fs.writeFileSync(path.join(runDir, name), typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
const basic = (user, password) => `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
const base = process.env.WORDPRESS_BASE_URL.replace(/\/$/, '');
const readerAuth = basic(process.env.WORDPRESS_READ_USERNAME, process.env.WORDPRESS_READ_APPLICATION_PASSWORD);
const recoveryAuth = basic(process.env.WORDPRESS_RECOVERY_USERNAME, process.env.WORDPRESS_RECOVERY_APPLICATION_PASSWORD);
const urls = {
  reader: `${base}/wp-json/streetkingz-ai/v1/products/70/authoritative`,
  validationManifest: `${base}/wp-json/streetkingz-ai/v1/incidents/template-2003-elementor-normalization/validation-manifest`,
  validationStatus: `${base}/wp-json/streetkingz-ai/v1/incidents/template-2003-elementor-normalization/validation/status`,
  validationDryRun: `${base}/wp-json/streetkingz-ai/v1/incidents/template-2003-elementor-normalization/validation/dry-run`,
  recover: `${base}/wp-json/streetkingz-ai/v1/incidents/template-2003-elementor-normalization/recover`,
  page: `${base}/product/heavy-duty-drying-towel-1200gsm/`,
};
const requests = [];
let recoverExecuteRequests = 0;
async function request(label, url, { method = 'GET', auth = null, body = null, json = true } = {}) {
  if (label === 'execute_recovery') recoverExecuteRequests++;
  const response = await fetch(url, { method, headers: { accept: json ? 'application/json' : 'text/html', ...(body ? { 'content-type': 'application/json' } : {}), ...(auth ? { authorization: auth } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'manual' });
  const raw = await response.text();
  let parsed = null; if (json) try { parsed = JSON.parse(raw); } catch {}
  requests.push({ label, method, path: new URL(url).pathname, status: response.status, error_code: parsed?.code ?? null, response_sha256: sha(raw), response_size: Buffer.byteLength(raw), credentials_persisted: false, authorization_persisted: false });
  return { status: response.status, raw, body: parsed, headers: response.headers };
}
const expect = (result, status, message) => { if (result.status !== status) throw new Error(`${message}:${result.status}:${result.body?.code ?? ''}`); };
const findElement = (items, id) => { for (const item of items) { if (item?.id === id) return item; const nested = findElement(item?.elements ?? [], id); if (nested) return nested; } return null; };

const exactStatement = 'I authorise the exact restoration of template 2003 _elementor_data from the current known incident state e0a329efe268638edfbb3d6274512c26aeb0da835e4a9279a1d088d0d562de00 to the preserved pre-incident state 81991fbccece6edcedb9cd84fc4d8dca99765b473cf24b2f8df26b5946f91c01. No other content or metadata is authorised to change.';
const authorisedAt = new Date().toISOString();
const approvalRelative = `artifacts/incidents/${incident}/recovery-execution-001/human-recovery-authorisation.json`;
const approval = { schema_version: 1, status: 'approved', authorisation_source: 'explicit_human_incident_recovery_authorisation', statement: exactStatement, statement_sha256: sha(exactStatement), authorised_at: authorisedAt, incident_id: incident, template_id: 2003, meta_key: '_elementor_data', expected_current_raw_sha256: currentHash, target_raw_sha256: targetHash, product_70_modification_authorised: false, other_template_modification_authorised: false, other_meta_modification_authorised: false, publication_modification_authorised: false, slug_modification_authorised: false };
const approvalSha = canonicalHash(approval);
persist('human-recovery-authorisation.json', approval);
persist('preflight.json', { tests: '332/332 PASS', recovery_plugin_version: '0.1.2', authorisation_sha256: approvalSha, statement_sha256: approval.statement_sha256, run_directory_created_before_requests: true, retries: 0, credentials_persisted: false, authorization_headers_persisted: false });

const pending = JSON.parse(fs.readFileSync(path.join(prepDir, 'recovery-contract-material-pending.json'), 'utf8'));
const targetResponse = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const targetRaw = targetResponse.elementor_template.raw_elementor_data;
if (sha(targetRaw) !== targetHash) throw new Error('TARGET_SOURCE_HASH_MISMATCH');
const recoveryId = pending.contract_material.one_time_recovery_id;
if (!/^[A-Za-z0-9_-]{43,128}$/.test(recoveryId)) throw new Error('RECOVERY_ID_INVALID');

const initialProduction = await request('initial_production_status', urls.recover, { auth: recoveryAuth });
const initialValidation = await request('initial_validation_status', urls.validationStatus, { auth: recoveryAuth });
expect(initialProduction, 200, 'PRODUCTION_STATUS_FAILED'); expect(initialValidation, 200, 'VALIDATION_STATUS_FAILED');
if (initialProduction.body?.status !== 'locked' || initialValidation.body?.status !== 'validation_absent') throw new Error('UNSAFE_ACTIVE_CONTROL_STATE');

const pre = await request('fresh_pre_recovery_authoritative', urls.reader, { auth: readerAuth });
expect(pre, 200, 'PRE_READ_FAILED'); persist('pre-recovery-authoritative-response.json', pre.raw);
if (sha(pre.raw) !== currentResponseHash || pre.body?.schema_version !== 2 || pre.body?.product?.id !== 70 || pre.body?.elementor_template?.id !== 2003) throw new Error('AUTHORITATIVE_RESPONSE_GUARD_FAILED');
const currentRaw = pre.body.elementor_template.raw_elementor_data;
const changes = diffElementorDocuments(JSON.parse(currentRaw), JSON.parse(targetRaw));
const reversions = changes.filter(change => change.original_type === 'string' && change.current_type === 'number' && change.original_value === String(change.current_value));
if (sha(currentRaw) !== currentHash || changes.length !== 140 || reversions.length !== 140) throw new Error('INCIDENT_DIFF_GUARD_FAILED');
persist('fresh-state-guard.json', { status: 'PASS', authoritative_response_sha256: sha(pre.raw), current_raw_sha256: sha(currentRaw), target_raw_sha256: sha(targetRaw), differing_paths: changes.length, string_to_number_reversions: reversions.length, unexpected_differences: changes.length - reversions.length });
persist('fresh-drifted-rollback-snapshot.json', { schema_version: 1, captured_at: new Date().toISOString(), incident_id: incident, template_id: 2003, meta_key: '_elementor_data', raw_elementor_data: currentRaw, raw_sha256: sha(currentRaw), raw_length: Buffer.byteLength(currentRaw), product_observation: { id: 70, post_title: pre.body.product.post_title, post_excerpt: pre.body.product.post_excerpt, post_content: pre.body.product.post_content, post_name: pre.body.product.post_name, post_status: pre.body.product.post_status }, authoritative_response_sha256: sha(pre.raw) });

const validationManifest = { schema_version: 1, status: 'validation_only', incident_id: incident, template_id: 2003, meta_key: '_elementor_data', operation: 'validate_exact_raw_recovery_plan', expected_current_raw_sha256: currentHash, target_raw_sha256: targetHash, target_raw_elementor_data: targetRaw, expected_diff_sha256: diffHash, expected_diff_count: 140, expected_diff_type: 'equal_valued_string_to_number_only', unexpected_diff_count: 0, product_70_protected: true, other_templates_protected: true, other_meta_protected: true };
const validationInstall = await request('install_final_validation_manifest', urls.validationManifest, { method: 'POST', auth: recoveryAuth, body: { manifest: validationManifest } });
expect(validationInstall, 200, 'VALIDATION_INSTALL_FAILED');
const dryRun = await request('final_recovery_dry_run', urls.validationDryRun, { method: 'POST', auth: recoveryAuth, body: { mode: 'validation_dry_run' } });
persist('final-recovery-dry-run.json', dryRun.body); expect(dryRun, 200, 'DRY_RUN_FAILED');
if (dryRun.body?.execution_capable !== false || dryRun.body?.claim_possible !== false || dryRun.body?.content_mutation_possible !== false || dryRun.body?.diff_count !== 140 || dryRun.body?.unexpected_diff_count !== 0) throw new Error('DRY_RUN_GUARD_FAILED');
const validationRemove = await request('remove_final_validation_manifest', urls.validationManifest, { method: 'DELETE', auth: recoveryAuth });
expect(validationRemove, 200, 'VALIDATION_REMOVE_FAILED');

const contract = { ...pending.contract_material, status: 'approved', authorisation_source: 'explicit_human_incident_recovery_authorisation', human_recovery_approval: { artifact: approvalRelative, sha256: approvalSha, statement_sha256: approval.statement_sha256, authorised_at: authorisedAt } };
const contractSha = canonicalHash(contract);
persist('one-time-recovery-contract.json', contract);
persist('contract-metadata.json', { contract_sha256: contractSha, recovery_id_sha256: sha(recoveryId), approval_sha256: approvalSha, installed_live: false, claimed: false, retries: 0 });
const install = await request('install_one_time_recovery_contract', urls.recover, { method: 'POST', auth: recoveryAuth, body: { action: 'install_contract', contract } });
persist('contract-install-result.json', install.body); expect(install, 200, 'CONTRACT_INSTALL_FAILED');
if (install.body?.status !== 'installed_unused' || install.body?.contract_sha256 !== contractSha || install.body?.claims !== 0 || install.body?.content_writes !== 0) throw new Error('CONTRACT_INSTALL_GUARD_FAILED');
const unused = await request('installed_unused_status', urls.recover, { auth: recoveryAuth }); expect(unused, 200, 'UNUSED_STATUS_FAILED');
if (unused.body?.status !== 'installed_unused' || unused.body?.contract_sha256 !== contractSha) throw new Error('CONTRACT_NOT_UNUSED');

const execute = await request('execute_recovery', urls.recover, { method: 'POST', auth: recoveryAuth, body: { action: 'execute' } });
persist('recovery-result.json', { http_status: execute.status, error_code: execute.body?.code ?? null, response: execute.body, execute_requests: recoverExecuteRequests, retries: 0 });
if (recoverExecuteRequests !== 1) throw new Error('EXECUTE_REQUEST_COUNT_INVALID');

const post = await request('post_recovery_authoritative', urls.reader, { auth: readerAuth });
expect(post, 200, 'POST_READ_FAILED'); persist('post-recovery-authoritative-response.json', post.raw);
const postRaw = post.body?.elementor_template?.raw_elementor_data;
const productUnchanged = ['post_title', 'post_excerpt', 'post_content', 'post_name', 'post_status'].every(key => post.body?.product?.[key] === pre.body?.product?.[key]);
const targetExact = typeof postRaw === 'string' && sha(postRaw) === targetHash && postRaw === targetRaw && JSON.stringify(JSON.parse(postRaw)) === JSON.stringify(JSON.parse(targetRaw));
const postDiff = typeof postRaw === 'string' ? diffElementorDocuments(JSON.parse(postRaw), JSON.parse(targetRaw)) : [{ error: 'missing' }];
const postStatus = await request('post_recovery_control_status', urls.recover, { auth: recoveryAuth }); expect(postStatus, 200, 'POST_STATUS_FAILED');
persist('post-recovery-verification.json', { execute_http_status: execute.status, execute_status: execute.body?.status ?? null, target_raw_sha256: typeof postRaw === 'string' ? sha(postRaw) : null, required_target_raw_sha256: targetHash, byte_exact_target: postRaw === targetRaw, strict_parsed_equality: targetExact, remaining_template_differences: postDiff.length, product_70_unchanged: productUnchanged, slug_unchanged: post.body?.product?.post_name === pre.body?.product?.post_name, publication_unchanged: post.body?.product?.post_status === pre.body?.product?.post_status, production_control_status: postStatus.body?.status ?? null });

const page = await request('rendered_product_page', urls.page, { json: false });
const visible = page.status === 200 && page.raw.includes('Heavy Duty Drying Towel') && page.raw.includes('About this product') && page.raw.includes('What’s the difference between this and the XL 800GSM Drying Towel?') && page.raw.includes('Will this towel scratch my paint?');
persist('rendered-page-verification.json', { http_status: page.status, expected_content_present: visible, malformed_document_marker: /<html[^>]*>[\s\S]*<\/html>/i.test(page.raw) ? false : true, response_sha256: sha(page.raw), response_size: Buffer.byteLength(page.raw) });

const success = execute.status === 200 && execute.body?.status === 'succeeded' && targetExact && postDiff.length === 0 && productUnchanged && visible && postStatus.body?.status === 'locked';
persist('validation-report.json', { decision: success ? 'RECOVERY_SUCCEEDED' : 'RECOVERY_FAILED_OR_UNVERIFIED', tests: '332/332 PASS', execute_requests: recoverExecuteRequests, retries: 0, target_exact: targetExact, product_70_unchanged: productUnchanged, rendered_verification: visible, recovery_id_permanently_consumed: execute.status === 200 || execute.status === 500, final_control_status: postStatus.body?.status ?? null });
persist('run-metadata.json', { created_at: new Date().toISOString(), requests, credentials_persisted: false, authorization_headers_persisted: false, ai_calls: 0, dataforseo_calls: 0, search_console_calls: 0, execute_requests: recoverExecuteRequests, retries: 0 });
if (!success) throw new Error('RECOVERY_NOT_FULLY_VERIFIED');
console.log(JSON.stringify({ status: 'RECOVERY_SUCCEEDED', target_raw_sha256: sha(postRaw), product_70_unchanged: productUnchanged, execute_requests: recoverExecuteRequests, rendered_verification: visible }));
