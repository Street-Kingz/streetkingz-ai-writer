import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const incident = 'template-2003-elementor-normalization-2026-08-09';
const base = path.join(root, 'artifacts/incidents', incident);
const out = path.join(base, 'recovery-authorisation-preparation-001');
if (fs.existsSync(out)) throw new Error(`Immutable output already exists: ${out}`);
fs.mkdirSync(out, { recursive: false });

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonicalize = value => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  return value;
};
const fingerprint = value => sha256(JSON.stringify(canonicalize(value)));
const write = (name, value) => fs.writeFileSync(path.join(out, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });

const sourceRelative = 'artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1/guarded-write-execution-v0.1.9-001/pre-write-authoritative-response.json';
const source = JSON.parse(fs.readFileSync(path.join(root, sourceRelative), 'utf8'));
const targetRaw = source.elementor_template.raw_elementor_data;
const targetHash = sha256(targetRaw);
if (targetHash !== '81991fbccece6edcedb9cd84fc4d8dca99765b473cf24b2f8df26b5946f91c01') throw new Error('Preserved recovery target hash mismatch');

const statement = 'I authorise the exact restoration of template 2003 `_elementor_data` from the current known incident state e0a329efe268638edfbb3d6274512c26aeb0da835e4a9279a1d088d0d562de00 to the preserved pre-incident state 81991fbccece6edcedb9cd84fc4d8dca99765b473cf24b2f8df26b5946f91c01. No other content or metadata is authorised to change.';
const approvalPath = `artifacts/incidents/${incident}/recovery-authorisation-preparation-001/recovery-approval-pending.json`;
const approval = {
  schema_version: 1,
  status: 'pending_human_recovery_approval',
  incident_id: incident,
  allowed_post_id: 2003,
  allowed_meta_key: '_elementor_data',
  expected_current_raw_sha256: 'e0a329efe268638edfbb3d6274512c26aeb0da835e4a9279a1d088d0d562de00',
  target_raw_sha256: targetHash,
  expected_diff_count: 140,
  expected_diff_type: 'equal_valued_string_to_number_only',
  unexpected_diff_count: 0,
  product_70_writable: false,
  other_templates_writable: false,
  other_meta_writable: false,
  slug_change_authorised: false,
  publication_change_authorised: false,
  normal_writer_execution_authorised: false,
  human_recovery_approval: 'PENDING',
  required_statement_sha256: sha256(statement),
};
approval.pending_approval_fingerprint_sha256 = fingerprint(approval);

const recoveryId = crypto.randomBytes(48).toString('base64url');
const contractMaterial = {
  schema_version: 1,
  status: 'pending_human_approval',
  authorisation_source: 'pending_explicit_human_incident_recovery_authorisation',
  human_recovery_approval: {
    artifact: approvalPath,
    sha256: null,
    statement_sha256: sha256(statement),
    authorised_at: null,
  },
  incident_id: incident,
  template_id: 2003,
  meta_key: '_elementor_data',
  operation: 'restore_exact_raw_elementor_data',
  expected_current_raw_sha256: 'e0a329efe268638edfbb3d6274512c26aeb0da835e4a9279a1d088d0d562de00',
  expected_current_authoritative_response_sha256: 'bd2ed8e54bbb016800b82630a3c4da6fbf003e1471d953fde042b2c4488ab23d',
  expected_diff_sha256: '401ec670e2a443d7ec904edbb43964ebf39862256198c9c2d79c50293662c80b',
  expected_diff_count: 140,
  target_raw_sha256: targetHash,
  target_raw_elementor_data: targetRaw,
  product_70_title_sha256: '70d2740df079f126b15fac1a79dbb579accf5cc9b3b8c0f69f2ab8d89496326a',
  product_70_excerpt_sha256: '42403585f01631a26e0ab3139ad11ad40874882d46dc70a94e756fc24e653675',
  product_70_content_sha256: '2914f1e1185e6a6c8e737ff7c29d9eb80e165d5ea401da0b080ce2f75d548a48',
  description_sha256: '72f9f609c59de983f61e8305d6cea67d8ae07d5743ca77e0d0efcd5fea2169b7',
  comparison_sha256: '019780f33556ba09df132a4a92e473f2523fe41615c7f058916b96ebec31ba07',
  safety_sha256: 'bcf0b42d978be2f9caf218bfd55bab0bd902f05532e00868eae40fa06dc74bb6',
  product_70_modification_authorised: false,
  other_template_modification_authorised: false,
  other_meta_modification_authorised: false,
  publication_modification_authorised: false,
  slug_modification_authorised: false,
  one_time_recovery_id: recoveryId,
};

write('recovery-approval-pending.json', approval);
write('recovery-contract-material-pending.json', {
  installable: false,
  installed_live: false,
  reason: 'Human recovery approval has not been recorded. Finalisation must set the exact production status/authorisation source, bind the immutable approval artifact fingerprint, and add the approval timestamp.',
  candidate_recovery_id_sha256: sha256(recoveryId),
  candidate_recovery_id_state: 'offline_uninstalled_unclaimed',
  zero_retries: true,
  rollback_required: true,
  contract_material: contractMaterial,
});
write('target-source-fingerprints.json', {
  incident_id: incident,
  source_artifact: sourceRelative,
  template_id: 2003,
  meta_key: '_elementor_data',
  target_raw_length: Buffer.byteLength(targetRaw),
  target_raw_sha256: targetHash,
  target_parsed_canonical_sha256: fingerprint(JSON.parse(targetRaw)),
  expected_current_raw_sha256: contractMaterial.expected_current_raw_sha256,
  expected_current_authoritative_response_sha256: contractMaterial.expected_current_authoritative_response_sha256,
  expected_diff_sha256: contractMaterial.expected_diff_sha256,
  expected_diff_count: 140,
});
write('planned-operation.json', {
  mode: 'recover',
  retries: 0,
  exact_operation: 'one fixed WordPress update_metadata operation',
  post_id: 2003,
  meta_key: '_elementor_data',
  elementor_document_save_used: false,
  allowed_mutations: ['template_2003._elementor_data'],
  blocked_mutations: ['product_70', 'other_posts', 'other_templates', 'other_meta', 'slug', 'publication'],
  candidate_recovery_id_sha256: sha256(recoveryId),
  live_installation: false,
  claim_state: 'unclaimed',
});
write('rollback-plan.json', {
  before_claim: 'capture fresh exact current drifted raw _elementor_data and persist immutable rollback snapshot',
  trigger: 'any post-claim recovery or verification failure',
  restore: 'directly restore the exact fresh drifted raw snapshot to post 2003 / _elementor_data',
  required_restored_sha256: contractMaterial.expected_current_raw_sha256,
  terminal_state: 'failed_after_claim',
  recovery_id_consumed_permanently: true,
  retries: 0,
});
write('verification-plan.json', {
  preflight: ['fresh authoritative Reader GET', 'current raw hash exact', '140-path diff exact', 'fresh rollback snapshot persisted', 'final dry run pass'],
  post_recovery: ['fresh authoritative Reader GET', 'target raw hash exact', 'strict parsed equality with preserved source', 'Product 70 unchanged', 'description/comparison/safety content unchanged', 'rendered page healthy'],
  target_raw_sha256: targetHash,
  rollback_verification: 'fresh authoritative raw hash equals captured drifted rollback source',
});
write('user-authorisation-text.json', {
  status: 'not_authorised',
  required_exact_statement: `“${statement}”`,
  statement_sha256: sha256(statement),
  prompt_does_not_constitute_approval: true,
});
write('run-metadata.json', {
  created_at: new Date().toISOString(),
  task: 'offline incident-recovery authorisation preparation',
  recovery_plugin_version: '0.1.2',
  artifact_directory: path.relative(root, out),
  live_requests: 0,
  live_writes: 0,
  recovery_attempted: false,
  recovery_contract_installed: false,
  recovery_id_claimed: false,
  credentials_stored: false,
  authorization_headers_stored: false,
  ai_calls: 0,
  dataforseo_calls: 0,
  search_console_calls: 0,
});

console.log(JSON.stringify({ output: path.relative(root, out), targetHash, pendingApprovalFingerprint: approval.pending_approval_fingerprint_sha256, candidateRecoveryIdSha256: sha256(recoveryId) }));
