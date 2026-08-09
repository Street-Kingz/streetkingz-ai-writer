<?php
/**
 * Plugin Name: Street Kingz AI Template 2003 Incident Recovery
 * Description: One-time, fixed-scope recovery for the 2026-08-09 Elementor normalization incident.
 * Version: 0.1.2
 */
if (!defined('ABSPATH')) exit;

const SKAI_RECOVERY_VERSION = '0.1.2';
const SKAI_RECOVERY_INCIDENT = 'template-2003-elementor-normalization-2026-08-09';
const SKAI_RECOVERY_TEMPLATE_ID = 2003;
const SKAI_RECOVERY_PRODUCT_ID = 70;
const SKAI_RECOVERY_META_KEY = '_elementor_data';
const SKAI_RECOVERY_CAP = 'streetkingz_ai_recover_template_2003';
const SKAI_RECOVERY_ROLE = 'streetkingz_ai_template_2003_recovery';
const SKAI_RECOVERY_CURRENT_HASH = 'e0a329efe268638edfbb3d6274512c26aeb0da835e4a9279a1d088d0d562de00';
const SKAI_RECOVERY_TARGET_HASH = '81991fbccece6edcedb9cd84fc4d8dca99765b473cf24b2f8df26b5946f91c01';
const SKAI_RECOVERY_CURRENT_RESPONSE_HASH = 'bd2ed8e54bbb016800b82630a3c4da6fbf003e1471d953fde042b2c4488ab23d';
const SKAI_RECOVERY_DIFF_HASH = '401ec670e2a443d7ec904edbb43964ebf39862256198c9c2d79c50293662c80b';
const SKAI_RECOVERY_PRODUCT_TITLE_HASH = '70d2740df079f126b15fac1a79dbb579accf5cc9b3b8c0f69f2ab8d89496326a';
const SKAI_RECOVERY_PRODUCT_EXCERPT_HASH = '42403585f01631a26e0ab3139ad11ad40874882d46dc70a94e756fc24e653675';
const SKAI_RECOVERY_PRODUCT_CONTENT_HASH = '2914f1e1185e6a6c8e737ff7c29d9eb80e165d5ea401da0b080ce2f75d548a48';
const SKAI_RECOVERY_DIFF_COUNT = 140;
const SKAI_RECOVERY_ACTIVE_OPTION = 'streetkingz_ai_template_2003_recovery_active_v1';
const SKAI_RECOVERY_VALIDATION_OPTION = 'streetkingz_ai_template_2003_recovery_validation_v1';
const SKAI_RECOVERY_RESERVATION_PREFIX = 'streetkingz_ai_template_2003_recovery_reserved_';
const SKAI_RECOVERY_CLAIM_PREFIX = 'streetkingz_ai_template_2003_recovery_claim_';
const SKAI_RECOVERY_AUDIT_PREFIX = 'streetkingz_ai_template_2003_recovery_audit_';
const SKAI_RECOVERY_MAX_BYTES = 80000;

function skai_recovery_activate(): void {
    add_role(SKAI_RECOVERY_ROLE, 'Street Kingz AI Template 2003 Recovery', ['read' => true, SKAI_RECOVERY_CAP => true]);
}
register_activation_hook(__FILE__, 'skai_recovery_activate');

function skai_recovery_is_protected_rest_request(WP_REST_Request $request): bool {
    return preg_match('#^/streetkingz-ai/v1/incidents/template-2003-elementor-normalization/(?:recover|validation-manifest|validation/status|validation/dry-run)$#D', $request->get_route()) === 1;
}

/*
 * Every method on this fixed incident resource is capability-protected. Mark
 * it non-cacheable before REST permission dispatch so LiteSpeed cannot replay
 * an authenticated status or dry-run response to another identity.
 */
function skai_recovery_disable_protected_rest_cache(): void {
    if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
    if (!defined('LSCACHE_NO_CACHE')) define('LSCACHE_NO_CACHE', true);
    do_action('litespeed_control_set_nocache', 'Street Kingz template-2003 incident Recovery control plane');
}

add_filter('rest_pre_dispatch', static function ($result, WP_REST_Server $server, WP_REST_Request $request) {
    if (skai_recovery_is_protected_rest_request($request)) skai_recovery_disable_protected_rest_cache();
    return $result;
}, 1, 3);

add_filter('rest_post_dispatch', static function ($response, WP_REST_Server $server, WP_REST_Request $request) {
    if (skai_recovery_is_protected_rest_request($request) && $response instanceof WP_HTTP_Response) {
        $response->header('Cache-Control', 'no-cache, must-revalidate, max-age=0, no-store, private');
        $response->header('X-LiteSpeed-Cache-Control', 'no-cache');
    }
    return $response;
}, 999, 3);

add_action('rest_api_init', function (): void {
    register_rest_route('streetkingz-ai/v1', '/incidents/template-2003-elementor-normalization/recover', [
        ['methods' => WP_REST_Server::READABLE, 'permission_callback' => 'skai_recovery_permission', 'callback' => 'skai_recovery_status'],
        ['methods' => WP_REST_Server::CREATABLE, 'permission_callback' => 'skai_recovery_permission', 'callback' => 'skai_recovery_post'],
        ['methods' => WP_REST_Server::DELETABLE, 'permission_callback' => 'skai_recovery_permission', 'callback' => 'skai_recovery_remove'],
    ]);
    register_rest_route('streetkingz-ai/v1', '/incidents/template-2003-elementor-normalization/validation-manifest', [
        ['methods' => WP_REST_Server::CREATABLE, 'permission_callback' => 'skai_recovery_permission', 'callback' => 'skai_recovery_install_validation_manifest'],
        ['methods' => WP_REST_Server::DELETABLE, 'permission_callback' => 'skai_recovery_permission', 'callback' => 'skai_recovery_remove_validation_manifest'],
    ]);
    register_rest_route('streetkingz-ai/v1', '/incidents/template-2003-elementor-normalization/validation/status', [
        'methods' => WP_REST_Server::READABLE, 'permission_callback' => 'skai_recovery_permission', 'callback' => 'skai_recovery_validation_status',
    ]);
    register_rest_route('streetkingz-ai/v1', '/incidents/template-2003-elementor-normalization/validation/dry-run', [
        'methods' => WP_REST_Server::CREATABLE, 'permission_callback' => 'skai_recovery_permission', 'callback' => 'skai_recovery_validation_dry_run',
    ]);
});

function skai_recovery_permission() {
    if (!is_user_logged_in() || !current_user_can(SKAI_RECOVERY_CAP)) return new WP_Error('streetkingz_ai_recovery_forbidden', 'This account cannot perform the fixed template-2003 incident recovery.', ['status' => 403]);
    return true;
}
function skai_recovery_exact_keys(array $value, array $expected): bool { sort($expected); $keys = array_keys($value); sort($keys); return $keys === $expected; }
function skai_recovery_hash_valid($value): bool { return is_string($value) && preg_match('/^[a-f0-9]{64}$/D', $value) === 1; }
function skai_recovery_id_name(string $prefix, string $id): string { return $prefix . hash('sha256', $id); }
function skai_recovery_audit(string $event, array $details): bool {
    return add_option(SKAI_RECOVERY_AUDIT_PREFIX . gmdate('YmdHis') . '_' . wp_generate_uuid4(), ['schema_version' => 1, 'incident' => SKAI_RECOVERY_INCIDENT, 'event' => $event, 'recorded_at' => gmdate('c'), 'details' => $details], '', false);
}
function skai_recovery_canonical(array $value): array {
    $sort = function ($item) use (&$sort) { if (!is_array($item)) return $item; $keys = array_keys($item); if ($keys === range(0, count($item) - 1)) return array_map($sort, $item); ksort($item); foreach ($item as $key => $child) $item[$key] = $sort($child); return $item; };
    $json = wp_json_encode($sort($value), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    return ['json' => $json, 'sha256' => hash('sha256', $json)];
}

function skai_recovery_validate_validation_manifest(array $manifest) {
    $keys = ['schema_version','status','incident_id','template_id','meta_key','operation','expected_current_raw_sha256','target_raw_sha256','target_raw_elementor_data','expected_diff_sha256','expected_diff_count','expected_diff_type','unexpected_diff_count','product_70_protected','other_templates_protected','other_meta_protected'];
    if (!skai_recovery_exact_keys($manifest, $keys)) return new WP_Error('streetkingz_ai_recovery_validation_shape_invalid', 'Validation manifest does not match the exact non-executable schema.', ['status' => 409]);
    if (($manifest['schema_version'] ?? null) !== 1 || ($manifest['status'] ?? null) !== 'validation_only' || ($manifest['incident_id'] ?? null) !== SKAI_RECOVERY_INCIDENT || ($manifest['template_id'] ?? null) !== SKAI_RECOVERY_TEMPLATE_ID || ($manifest['meta_key'] ?? null) !== SKAI_RECOVERY_META_KEY || ($manifest['operation'] ?? null) !== 'validate_exact_raw_recovery_plan') return new WP_Error('streetkingz_ai_recovery_validation_scope_invalid', 'Validation is fixed to the template-2003 normalization incident.', ['status' => 409]);
    if (($manifest['expected_current_raw_sha256'] ?? null) !== SKAI_RECOVERY_CURRENT_HASH || ($manifest['target_raw_sha256'] ?? null) !== SKAI_RECOVERY_TARGET_HASH || ($manifest['expected_diff_sha256'] ?? null) !== SKAI_RECOVERY_DIFF_HASH || ($manifest['expected_diff_count'] ?? null) !== SKAI_RECOVERY_DIFF_COUNT || ($manifest['expected_diff_type'] ?? null) !== 'equal_valued_string_to_number_only' || ($manifest['unexpected_diff_count'] ?? null) !== 0) return new WP_Error('streetkingz_ai_recovery_validation_guards_invalid', 'Validation hashes or diff expectations do not match the fixed incident.', ['status' => 409]);
    foreach (['product_70_protected','other_templates_protected','other_meta_protected'] as $flag) if (($manifest[$flag] ?? null) !== true) return new WP_Error('streetkingz_ai_recovery_validation_protection_invalid', 'Every protected area must remain non-writable.', ['status' => 409]);
    $raw = $manifest['target_raw_elementor_data'] ?? null;
    if (!is_string($raw) || strlen($raw) > SKAI_RECOVERY_MAX_BYTES || hash('sha256', $raw) !== SKAI_RECOVERY_TARGET_HASH || !is_array(json_decode($raw, true))) return new WP_Error('streetkingz_ai_recovery_validation_target_invalid', 'The exact preserved validation target is missing or invalid.', ['status' => 409]);
    return true;
}

function skai_recovery_validation_record() {
    $record = get_option(SKAI_RECOVERY_VALIDATION_OPTION, null);
    return is_array($record) && is_array($record['manifest'] ?? null) ? $record : new WP_Error('streetkingz_ai_recovery_validation_missing', 'No non-executable validation manifest is installed.', ['status' => 423]);
}

function skai_recovery_install_validation_manifest(WP_REST_Request $request) {
    $body = $request->get_json_params();
    if (!is_array($body) || !skai_recovery_exact_keys($body, ['manifest']) || !is_array($body['manifest'])) return new WP_Error('streetkingz_ai_recovery_validation_request_invalid', 'Request must contain exactly one validation manifest.', ['status' => 400]);
    $valid = skai_recovery_validate_validation_manifest($body['manifest']); if (is_wp_error($valid)) return $valid;
    if (get_option(SKAI_RECOVERY_ACTIVE_OPTION, null) !== null) return new WP_Error('streetkingz_ai_recovery_contract_active', 'Validation cannot be installed while a production recovery contract is active.', ['status' => 409]);
    if (get_option(SKAI_RECOVERY_VALIDATION_OPTION, null) !== null) return new WP_Error('streetkingz_ai_recovery_validation_active', 'Explicit removal is required before validation replacement.', ['status' => 409]);
    $canonical = skai_recovery_canonical($body['manifest']);
    $record = ['manifest' => $body['manifest'], 'sha256' => $canonical['sha256'], 'installed_at' => gmdate('c'), 'execution_capable' => false];
    if (!add_option(SKAI_RECOVERY_VALIDATION_OPTION, $record, '', false)) return new WP_Error('streetkingz_ai_recovery_validation_install_conflict', 'Validation manifest could not be atomically installed.', ['status' => 409]);
    if (!skai_recovery_audit('validation_manifest_installed', ['validation_sha256' => $canonical['sha256'], 'template_id' => 2003])) { delete_option(SKAI_RECOVERY_VALIDATION_OPTION); return new WP_Error('streetkingz_ai_recovery_audit_failed', 'Validation audit failed.', ['status' => 500]); }
    return rest_ensure_response(['status' => 'validation_installed', 'validation_sha256' => $canonical['sha256'], 'execution_capable' => false, 'recovery_id_present' => false, 'claim_possible' => false, 'content_mutations' => 0]);
}

function skai_recovery_validation_status() {
    $record = skai_recovery_validation_record();
    if (is_wp_error($record)) return rest_ensure_response(['status' => 'validation_absent', 'execution_capable' => false, 'recovery_id_present' => false, 'claim_possible' => false]);
    return rest_ensure_response(['status' => 'validation_installed', 'validation_sha256' => $record['sha256'], 'incident_id' => SKAI_RECOVERY_INCIDENT, 'template_id' => 2003, 'meta_key' => SKAI_RECOVERY_META_KEY, 'installed_at' => $record['installed_at'], 'execution_capable' => false, 'recovery_id_present' => false, 'claim_possible' => false]);
}

function skai_recovery_remove_validation_manifest() {
    $record = skai_recovery_validation_record(); if (is_wp_error($record)) return $record;
    if (!skai_recovery_audit('validation_manifest_removed', ['validation_sha256' => $record['sha256'], 'template_id' => 2003])) return new WP_Error('streetkingz_ai_recovery_audit_failed', 'Validation removal audit failed.', ['status' => 500]);
    delete_option(SKAI_RECOVERY_VALIDATION_OPTION);
    return rest_ensure_response(['status' => 'validation_removed', 'execution_capable' => false, 'recovery_id_present' => false, 'claim_possible' => false, 'content_mutations' => 0]);
}

function skai_recovery_validation_dry_run(WP_REST_Request $request) {
    $body = $request->get_json_params();
    if (!is_array($body) || !skai_recovery_exact_keys($body, ['mode']) || ($body['mode'] ?? null) !== 'validation_dry_run') return new WP_Error('streetkingz_ai_recovery_validation_dry_run_request_invalid', 'Validation dry-run requires exactly the non-executable validation mode.', ['status' => 400]);
    $record = skai_recovery_validation_record(); if (is_wp_error($record)) return $record;
    $valid = skai_recovery_validate_validation_manifest($record['manifest']); if (is_wp_error($valid)) return $valid;
    $preflight = skai_recovery_preflight($record['manifest']); if (is_wp_error($preflight)) return $preflight;
    return rest_ensure_response(['status'=>'validation_dry_run_passed','incident_id'=>SKAI_RECOVERY_INCIDENT,'post_id'=>2003,'meta_key'=>SKAI_RECOVERY_META_KEY,'observed_current_raw_sha256'=>SKAI_RECOVERY_CURRENT_HASH,'expected_current_raw_sha256'=>SKAI_RECOVERY_CURRENT_HASH,'target_raw_sha256'=>SKAI_RECOVERY_TARGET_HASH,'current_raw_length'=>$preflight['current_length'],'target_raw_length'=>$preflight['target_length'],'diff_count'=>140,'diff_classification'=>'equal_valued_string_to_number_only','unexpected_diff_count'=>0,'product_70_protected'=>true,'other_templates_protected'=>true,'other_meta_protected'=>true,'cache_invalidation_plan'=>['template_2003_post_cache','template_2003_post_meta_cache','litespeed_template_2003','litespeed_product_70'],'post_recovery_verification_plan'=>'fresh_authoritative_raw_hash_and_strict_parsed_equality','rollback_plan'=>'exact_captured_drifted_raw_restore','execution_capable'=>false,'recovery_id_present'=>false,'claim_possible'=>false,'content_mutation_possible'=>false,'content_mutations'=>0]);
}

function skai_recovery_validate_contract(array $contract) {
    $keys = ['schema_version','status','authorisation_source','human_recovery_approval','incident_id','template_id','meta_key','operation','expected_current_raw_sha256','expected_current_authoritative_response_sha256','expected_diff_sha256','expected_diff_count','target_raw_sha256','target_raw_elementor_data','product_70_title_sha256','product_70_excerpt_sha256','product_70_content_sha256','description_sha256','comparison_sha256','safety_sha256','product_70_modification_authorised','other_template_modification_authorised','other_meta_modification_authorised','publication_modification_authorised','slug_modification_authorised','one_time_recovery_id'];
    if (!skai_recovery_exact_keys($contract, $keys)) return new WP_Error('streetkingz_ai_recovery_contract_shape_invalid', 'Recovery contract does not match the exact incident schema.', ['status' => 409]);
    if (($contract['schema_version'] ?? null) !== 1 || ($contract['status'] ?? null) !== 'approved' || ($contract['authorisation_source'] ?? null) !== 'explicit_human_incident_recovery_authorisation') return new WP_Error('streetkingz_ai_recovery_authorisation_missing', 'Separate explicit incident-recovery authorisation is required.', ['status' => 409]);
    $approval = $contract['human_recovery_approval'] ?? null;
    if (!is_array($approval) || !skai_recovery_exact_keys($approval, ['artifact','sha256','statement_sha256','authorised_at']) || !is_string($approval['artifact'] ?? null) || $approval['artifact'] === '' || !skai_recovery_hash_valid($approval['sha256'] ?? null) || !skai_recovery_hash_valid($approval['statement_sha256'] ?? null) || !is_string($approval['authorised_at'] ?? null) || $approval['authorised_at'] === '') return new WP_Error('streetkingz_ai_recovery_approval_binding_invalid', 'The separate human recovery approval fingerprint is invalid.', ['status' => 409]);
    if (($contract['incident_id'] ?? null) !== SKAI_RECOVERY_INCIDENT || ($contract['template_id'] ?? null) !== SKAI_RECOVERY_TEMPLATE_ID || ($contract['meta_key'] ?? null) !== SKAI_RECOVERY_META_KEY || ($contract['operation'] ?? null) !== 'restore_exact_raw_elementor_data') return new WP_Error('streetkingz_ai_recovery_scope_invalid', 'Only the fixed template-2003 raw Elementor recovery is permitted.', ['status' => 409]);
    foreach (['product_70_modification_authorised','other_template_modification_authorised','other_meta_modification_authorised','publication_modification_authorised','slug_modification_authorised'] as $flag) if (($contract[$flag] ?? null) !== false) return new WP_Error('streetkingz_ai_recovery_scope_broadened', 'The recovery contract attempts to broaden incident scope.', ['status' => 409]);
    foreach (['expected_current_raw_sha256','expected_current_authoritative_response_sha256','expected_diff_sha256','target_raw_sha256','product_70_title_sha256','product_70_excerpt_sha256','product_70_content_sha256','description_sha256','comparison_sha256','safety_sha256'] as $field) if (!skai_recovery_hash_valid($contract[$field] ?? null)) return new WP_Error('streetkingz_ai_recovery_hash_invalid', 'A recovery hash is invalid.', ['status' => 409]);
    if ($contract['expected_current_raw_sha256'] !== SKAI_RECOVERY_CURRENT_HASH || $contract['expected_current_authoritative_response_sha256'] !== SKAI_RECOVERY_CURRENT_RESPONSE_HASH || $contract['expected_diff_sha256'] !== SKAI_RECOVERY_DIFF_HASH || $contract['target_raw_sha256'] !== SKAI_RECOVERY_TARGET_HASH || $contract['expected_diff_count'] !== SKAI_RECOVERY_DIFF_COUNT || $contract['product_70_title_sha256'] !== SKAI_RECOVERY_PRODUCT_TITLE_HASH || $contract['product_70_excerpt_sha256'] !== SKAI_RECOVERY_PRODUCT_EXCERPT_HASH || $contract['product_70_content_sha256'] !== SKAI_RECOVERY_PRODUCT_CONTENT_HASH) return new WP_Error('streetkingz_ai_recovery_guard_invalid', 'Recovery hashes do not bind the known incident state, protected product, and preserved target.', ['status' => 409]);
    $id = $contract['one_time_recovery_id'] ?? null;
    if (!is_string($id) || preg_match('/^[A-Za-z0-9_-]{43,128}$/D', $id) !== 1) return new WP_Error('streetkingz_ai_recovery_id_invalid', 'Recovery ID does not meet the high-entropy format.', ['status' => 409]);
    $raw = $contract['target_raw_elementor_data'] ?? null;
    if (!is_string($raw) || strlen($raw) > SKAI_RECOVERY_MAX_BYTES || hash('sha256', $raw) !== SKAI_RECOVERY_TARGET_HASH || !is_array(json_decode($raw, true))) return new WP_Error('streetkingz_ai_recovery_target_invalid', 'The exact preserved target is missing or invalid.', ['status' => 409]);
    return true;
}

function skai_recovery_read_raw() {
    global $wpdb;
    $rows = $wpdb->get_col($wpdb->prepare("SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = %s", SKAI_RECOVERY_TEMPLATE_ID, SKAI_RECOVERY_META_KEY));
    if (count($rows) !== 1 || !is_string($rows[0])) return new WP_Error('streetkingz_ai_recovery_meta_ambiguous', 'Template 2003 must have exactly one raw Elementor data value.', ['status' => 409]);
    return $rows[0];
}
function skai_recovery_diff($before, $after, string $path = ''): array {
    if (gettype($before) === gettype($after) && $before === $after) return [];
    if (is_array($before) && is_array($after) && array_keys($before) === array_keys($after)) { $out = []; foreach ($before as $key => $value) $out = array_merge($out, skai_recovery_diff($value, $after[$key], $path . '/' . str_replace(['~','/'], ['~0','~1'], (string)$key))); return $out; }
    return [['path' => $path, 'before_type' => gettype($before), 'after_type' => gettype($after), 'before' => $before, 'after' => $after]];
}
function skai_recovery_preflight(array $contract) {
    global $wpdb;
    $product = $wpdb->get_row($wpdb->prepare("SELECT post_title, post_excerpt, post_content FROM {$wpdb->posts} WHERE ID = %d", SKAI_RECOVERY_PRODUCT_ID), ARRAY_A);
    if (!is_array($product) || hash('sha256', (string)$product['post_title']) !== SKAI_RECOVERY_PRODUCT_TITLE_HASH || hash('sha256', (string)$product['post_excerpt']) !== SKAI_RECOVERY_PRODUCT_EXCERPT_HASH || hash('sha256', (string)$product['post_content']) !== SKAI_RECOVERY_PRODUCT_CONTENT_HASH) return new WP_Error('streetkingz_ai_recovery_product_guard_drift', 'Protected Product 70 fields no longer match the incident state.', ['status' => 409]);
    $raw = skai_recovery_read_raw(); if (is_wp_error($raw)) return $raw;
    if (hash('sha256', $raw) !== SKAI_RECOVERY_CURRENT_HASH) return new WP_Error('streetkingz_ai_recovery_current_state_drift', 'Template 2003 is not in the exact known incident state.', ['status' => 409]);
    $current = json_decode($raw, true); $target = json_decode($contract['target_raw_elementor_data'], true);
    $diff = skai_recovery_diff($current, $target);
    $valid = count($diff) === SKAI_RECOVERY_DIFF_COUNT;
    foreach ($diff as $change) $valid = $valid && $change['before_type'] === 'string' && in_array($change['after_type'], ['integer','double'], true) && (string)$change['after'] === $change['before'];
    $fingerprint = hash('sha256', wp_json_encode($diff, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    if (!$valid || !hash_equals($contract['expected_diff_sha256'], $fingerprint)) return new WP_Error('streetkingz_ai_recovery_diff_invalid', 'Observed incident diff is not the exact approved 140-path reversal.', ['status' => 409]);
    return ['current_raw' => $raw, 'current_length' => strlen($raw), 'target_length' => strlen($contract['target_raw_elementor_data']), 'diff_count' => count($diff), 'diff_sha256' => $fingerprint];
}

function skai_recovery_install(array $contract) {
    $valid = skai_recovery_validate_contract($contract); if (is_wp_error($valid)) return $valid;
    if (get_option(SKAI_RECOVERY_VALIDATION_OPTION, null) !== null) return new WP_Error('streetkingz_ai_recovery_validation_active', 'Remove the non-executable validation manifest before installing a production recovery contract.', ['status' => 409]);
    if (get_option(SKAI_RECOVERY_ACTIVE_OPTION, null) !== null) return new WP_Error('streetkingz_ai_recovery_contract_active', 'Explicit removal is required before another contract can be installed.', ['status' => 409]);
    $canonical = skai_recovery_canonical($contract); $id_hash = hash('sha256', $contract['one_time_recovery_id']);
    $reservation = ['state' => 'installed_unused', 'recovery_id_sha256' => $id_hash, 'contract_sha256' => $canonical['sha256'], 'human_recovery_approval_sha256' => $contract['human_recovery_approval']['sha256'], 'installed_at' => gmdate('c')];
    if (!add_option(skai_recovery_id_name(SKAI_RECOVERY_RESERVATION_PREFIX, $contract['one_time_recovery_id']), $reservation, '', false)) return new WP_Error('streetkingz_ai_recovery_id_reused', 'Recovery ID was previously installed.', ['status' => 409]);
    if (!add_option(SKAI_RECOVERY_ACTIVE_OPTION, ['contract' => $contract, 'sha256' => $canonical['sha256'], 'installed_at' => gmdate('c')], '', false)) return new WP_Error('streetkingz_ai_recovery_install_conflict', 'Contract install failed; ID remains permanently reserved.', ['status' => 409]);
    if (!skai_recovery_audit('contract_installed', ['contract_sha256' => $canonical['sha256'], 'recovery_id_sha256' => $id_hash])) { delete_option(SKAI_RECOVERY_ACTIVE_OPTION); return new WP_Error('streetkingz_ai_recovery_audit_failed', 'Audit persistence failed; ID remains reserved.', ['status' => 500]); }
    return ['status' => 'installed_unused', 'contract_sha256' => $canonical['sha256'], 'recovery_id_sha256' => $id_hash, 'content_writes' => 0, 'claims' => 0];
}
function skai_recovery_contract() { $record = get_option(SKAI_RECOVERY_ACTIVE_OPTION, null); return is_array($record) && is_array($record['contract'] ?? null) ? $record : new WP_Error('streetkingz_ai_recovery_contract_missing', 'No incident recovery contract is installed.', ['status' => 423]); }
function skai_recovery_status() { $record = skai_recovery_contract(); if (is_wp_error($record)) return rest_ensure_response(['status' => 'locked', 'incident' => SKAI_RECOVERY_INCIDENT, 'template_id' => 2003]); $id = $record['contract']['one_time_recovery_id']; $claim = get_option(skai_recovery_id_name(SKAI_RECOVERY_CLAIM_PREFIX, $id), null); return rest_ensure_response(['status' => is_array($claim) ? ($claim['state'] ?? 'claimed') : 'installed_unused', 'incident' => SKAI_RECOVERY_INCIDENT, 'template_id' => 2003, 'meta_key' => SKAI_RECOVERY_META_KEY, 'contract_sha256' => $record['sha256'], 'recovery_id_sha256' => hash('sha256', $id)]); }
function skai_recovery_post(WP_REST_Request $request) {
    $body = $request->get_json_params(); if (!is_array($body) || !isset($body['action']) || !in_array($body['action'], ['install_contract','execute'], true)) return new WP_Error('streetkingz_ai_recovery_request_invalid', 'Only production contract installation or explicit execute are supported on this resource.', ['status' => 400]);
    if ($body['action'] === 'install_contract') { if (!skai_recovery_exact_keys($body, ['action','contract']) || !is_array($body['contract'])) return new WP_Error('streetkingz_ai_recovery_request_invalid', 'Install requires exactly action and contract.', ['status' => 400]); return rest_ensure_response(skai_recovery_install($body['contract'])); }
    if (!skai_recovery_exact_keys($body, ['action'])) return new WP_Error('streetkingz_ai_recovery_request_invalid', 'Execute accepts no caller-supplied target.', ['status' => 400]);
    $record = skai_recovery_contract(); if (is_wp_error($record)) return $record; $valid = skai_recovery_validate_contract($record['contract']); if (is_wp_error($valid)) return $valid;
    $preflight = skai_recovery_preflight($record['contract']); if (is_wp_error($preflight)) return $preflight;
    return skai_recovery_execute($record, $preflight);
}

function skai_recovery_claim(array $record) {
    global $wpdb; $id = $record['contract']['one_time_recovery_id']; $name = skai_recovery_id_name(SKAI_RECOVERY_CLAIM_PREFIX, $id);
    $audit = ['state' => 'claimed_executing','recovery_id_sha256' => hash('sha256',$id),'contract_sha256' => $record['sha256'],'incident' => SKAI_RECOVERY_INCIDENT,'template_id' => 2003,'claimed_at' => gmdate('c'),'completed_at' => null];
    $inserted = $wpdb->query($wpdb->prepare("INSERT IGNORE INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, %s)", $name, maybe_serialize($audit), 'no'));
    return $inserted === 1 ? ['name' => $name, 'record' => $audit] : new WP_Error('streetkingz_ai_recovery_replay_rejected', 'This recovery ID is already claimed.', ['status' => 409]);
}
function skai_recovery_write_exact(string $raw) {
    $result = update_metadata('post', SKAI_RECOVERY_TEMPLATE_ID, SKAI_RECOVERY_META_KEY, wp_slash($raw));
    return $result === true ? true : new WP_Error('streetkingz_ai_recovery_raw_write_failed', 'Exact fixed metadata restoration did not update the protected value.', ['status' => 500]);
}
function skai_recovery_clear_caches(): void { clean_post_cache(SKAI_RECOVERY_TEMPLATE_ID); wp_cache_delete(SKAI_RECOVERY_TEMPLATE_ID, 'post_meta'); do_action('litespeed_purge_post', SKAI_RECOVERY_TEMPLATE_ID); do_action('litespeed_purge_post', SKAI_RECOVERY_PRODUCT_ID); }
function skai_recovery_finish(array $claim, string $state, string $result): bool { $record = $claim['record']; $record['state']=$state; $record['result']=$result; $record['completed_at']=gmdate('c'); return update_option($claim['name'],$record,false); }
function skai_recovery_execute(array $record, array $preflight) {
    $claim = skai_recovery_claim($record); if (is_wp_error($claim)) return $claim;
    $target = $record['contract']['target_raw_elementor_data']; $write = skai_recovery_write_exact($target); skai_recovery_clear_caches(); $persisted = skai_recovery_read_raw();
    if (!is_wp_error($write) && is_string($persisted) && hash('sha256',$persisted) === SKAI_RECOVERY_TARGET_HASH && json_decode($persisted,true) === json_decode($target,true)) { skai_recovery_finish($claim,'succeeded','exact_target_verified'); skai_recovery_audit('recovery_succeeded',['contract_sha256'=>$record['sha256'],'recovery_id_sha256'=>$claim['record']['recovery_id_sha256']]); delete_option(SKAI_RECOVERY_ACTIVE_OPTION); return rest_ensure_response(['status'=>'succeeded','target_sha256'=>SKAI_RECOVERY_TARGET_HASH]); }
    $rollback = skai_recovery_write_exact($preflight['current_raw']); skai_recovery_clear_caches(); $rolled = skai_recovery_read_raw(); $rollback_ok = !is_wp_error($rollback) && is_string($rolled) && hash('sha256',$rolled) === SKAI_RECOVERY_CURRENT_HASH;
    skai_recovery_finish($claim,'failed_after_claim',$rollback_ok ? 'target_unverified_drifted_state_restored' : 'critical_rollback_unverified');
    return new WP_Error($rollback_ok ? 'streetkingz_ai_recovery_failed_rolled_back' : 'streetkingz_ai_recovery_critical_failure', $rollback_ok ? 'Recovery target was not verified; exact incident state was restored.' : 'Recovery and compensating rollback could not be verified.', ['status'=>500]);
}
function skai_recovery_remove() { $record = skai_recovery_contract(); if (is_wp_error($record)) return $record; $id=$record['contract']['one_time_recovery_id']; $claim=get_option(skai_recovery_id_name(SKAI_RECOVERY_CLAIM_PREFIX,$id),null); if (is_array($claim)&&($claim['state']??'')==='claimed_executing') return new WP_Error('streetkingz_ai_recovery_in_progress','Claimed recovery cannot be removed while executing.',['status'=>409]); if (!skai_recovery_audit('contract_removed',['contract_sha256'=>$record['sha256'],'recovery_id_sha256'=>hash('sha256',$id),'claim_state'=>is_array($claim)?($claim['state']??null):'unused'])) return new WP_Error('streetkingz_ai_recovery_audit_failed','Removal audit failed.',['status'=>500]); delete_option(SKAI_RECOVERY_ACTIVE_OPTION); return rest_ensure_response(['status'=>'removed','reservation_preserved'=>true,'claim_history_preserved'=>true]); }
