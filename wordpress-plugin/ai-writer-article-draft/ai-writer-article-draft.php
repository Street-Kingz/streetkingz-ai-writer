<?php
/**
 * Plugin Name: AI Writer Article Draft
 * Description: Bounded, approval-bound creation of one new draft post from exact Gutenberg content.
 * Version: 0.1.7
 */

defined('ABSPATH') || exit;

const AI_WRITER_DRAFT_CAPABILITY = 'streetkingz_ai_create_article_draft';
const AI_WRITER_DRAFT_ROLE = 'streetkingz_ai_article_draft_writer';
const AI_WRITER_DRAFT_ROLE_VERSION = '1';
const AI_WRITER_DRAFT_ROLE_VERSION_OPTION = 'ai_writer_draft_role_version';
const AI_WRITER_DRAFT_CONTRACT_OPTION = 'ai_writer_draft_active_contract_v1';
const AI_WRITER_DRAFT_EXECUTION_PREFIX = 'ai_writer_draft_execution_';
const AI_WRITER_DRAFT_ROLLOVER_LOCK_PREFIX = 'ai_writer_draft_rollover_lock_';
const AI_WRITER_DRAFT_ROLLOVER_HISTORY_PREFIX = 'ai_writer_draft_rollover_history_';
const AI_WRITER_DRAFT_ROLLOVER_ARCHIVE_PREFIX = 'ai_writer_draft_rollover_archive_';
const AI_WRITER_DRAFT_ROLLOVER_SCHEMA = '1.0.0';
const AI_WRITER_DRAFT_MAX_BYTES = 250000;
const AI_WRITER_DRAFT_MAX_TITLE = 200;
const AI_WRITER_DRAFT_MAX_EXCERPT = 500;
// Plugin release version and persisted DraftCreateContract schema version are independent.
const AI_WRITER_DRAFT_VERSION = '1.0.0';

function ai_writer_draft_ensure_role(): void {
    $allowed = ['read' => true, AI_WRITER_DRAFT_CAPABILITY => true];
    $role = get_role(AI_WRITER_DRAFT_ROLE);
    if (!$role) add_role(AI_WRITER_DRAFT_ROLE, 'AI Writer Article Draft Writer', $allowed);
    else {
        foreach (array_keys($role->capabilities) as $capability) if (!array_key_exists($capability, $allowed)) $role->remove_cap($capability);
        foreach ($allowed as $capability => $grant) $role->add_cap($capability, $grant);
    }
    update_option(AI_WRITER_DRAFT_ROLE_VERSION_OPTION, AI_WRITER_DRAFT_ROLE_VERSION, false);
}
register_activation_hook(__FILE__, 'ai_writer_draft_ensure_role');
add_action('init', static function (): void {
    if (get_option(AI_WRITER_DRAFT_ROLE_VERSION_OPTION) !== AI_WRITER_DRAFT_ROLE_VERSION) ai_writer_draft_ensure_role();
}, 1);

function ai_writer_draft_nocache(): void {
    if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
    if (!defined('LSCACHE_NO_CACHE')) define('LSCACHE_NO_CACHE', true);
    do_action('litespeed_control_set_nocache', 'AI Writer article draft control plane');
}
function ai_writer_draft_protected_route(WP_REST_Request $request): bool {
    return preg_match('#^/ai-writer/v1/article-draft(?:/|$)#D', $request->get_route()) === 1;
}
add_filter('rest_pre_dispatch', static function ($result, WP_REST_Server $server, WP_REST_Request $request) { if (ai_writer_draft_protected_route($request)) ai_writer_draft_nocache(); return $result; }, 1, 3);
add_filter('rest_post_dispatch', static function ($response, WP_REST_Server $server, WP_REST_Request $request) {
    if (ai_writer_draft_protected_route($request) && $response instanceof WP_HTTP_Response) {
        $response->header('Cache-Control', 'no-cache, must-revalidate, max-age=0, no-store, private');
        $response->header('X-LiteSpeed-Cache-Control', 'no-cache');
    }
    return $response;
}, 999, 3);

function ai_writer_draft_permission() {
    if (!is_user_logged_in() || !current_user_can(AI_WRITER_DRAFT_CAPABILITY)) return new WP_Error('ai_writer_draft_forbidden', 'This account cannot manage article draft contracts.', ['status' => 403]);
    return true;
}
function ai_writer_draft_exact_keys(array $value, array $expected): bool { $actual = array_keys($value); sort($actual); sort($expected); return $actual === $expected; }
function ai_writer_draft_canonical($value) {
    if (!is_array($value)) return $value;
    $list = array_keys($value) === [] || array_keys($value) === range(0, count($value) - 1);
    if ($list) return array_map('ai_writer_draft_canonical', $value);
    ksort($value, SORT_STRING); foreach ($value as $key => $item) $value[$key] = ai_writer_draft_canonical($item); return $value;
}
function ai_writer_draft_hash($value): string { return hash('sha256', is_string($value) ? $value : wp_json_encode(ai_writer_draft_canonical($value), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)); }
function ai_writer_draft_record(string $option): ?array { $value = get_option($option, null); return is_array($value) ? $value : null; }
function ai_writer_draft_execution_option(string $execution_id): string { return AI_WRITER_DRAFT_EXECUTION_PREFIX . hash('sha256', $execution_id); }
function ai_writer_draft_valid_content(string $content, array $allowed_blocks) {
    if ($content === '' || strlen($content) > AI_WRITER_DRAFT_MAX_BYTES) return new WP_Error('ai_writer_draft_content_invalid', 'Content is empty or exceeds the bounded size.', ['status' => 409]);
    if (preg_match('/<script\b|<iframe\b|\son[a-z]+\s*=|\[[^\]]+\]|data-elementor-|elementor-|_elementor_data|<h1\b|<!--\s*wp:(?!paragraph(?:\s|--))(?!(?:heading|list|group|columns|column|buttons|button|image)(?:\s|--))/i', $content)) return new WP_Error('ai_writer_draft_content_forbidden', 'Content contains forbidden markup, blocks, or a content H1.', ['status' => 409]);
    if (substr_count($content, '<!-- wp:') !== substr_count($content, '<!-- /wp:')) return new WP_Error('ai_writer_draft_blocks_malformed', 'Gutenberg block comments are not balanced.', ['status' => 409]);
    preg_match_all('/<!--\s*wp:([a-z0-9-]+)/i', $content, $matches);
    foreach ($matches[1] as $name) if (!in_array($name, $allowed_blocks, true)) return new WP_Error('ai_writer_draft_block_forbidden', 'Content contains an unapproved block.', ['status' => 409]);
    if (!$matches[1]) return new WP_Error('ai_writer_draft_blocks_missing', 'Content does not contain Gutenberg blocks.', ['status' => 409]);
    return true;
}
function ai_writer_draft_validate_contract(array $contract) {
    $keys = ['schema_version', 'operation', 'site_identity', 'execution_id', 'human_approval_fingerprint', 'title', 'excerpt', 'content', 'content_sha256', 'allowed_blocks', 'post_type', 'post_status', 'created_at'];
    if (!ai_writer_draft_exact_keys($contract, $keys)) return new WP_Error('ai_writer_draft_contract_shape', 'Contract fields are not the exact schema.', ['status' => 409]);
    if ($contract['schema_version'] !== AI_WRITER_DRAFT_VERSION || $contract['operation'] !== 'CREATE_NEW_POST' || $contract['post_type'] !== 'post' || $contract['post_status'] !== 'draft') return new WP_Error('ai_writer_draft_contract_scope', 'Contract operation, post type, or status is invalid.', ['status' => 409]);
    foreach (['site_identity', 'execution_id', 'human_approval_fingerprint', 'title', 'content_sha256', 'created_at'] as $field) if (!is_string($contract[$field]) || trim($contract[$field]) === '') return new WP_Error('ai_writer_draft_contract_field', 'A required contract binding is missing.', ['status' => 409]);
    if (strlen($contract['title']) > AI_WRITER_DRAFT_MAX_TITLE || strlen((string) $contract['excerpt']) > AI_WRITER_DRAFT_MAX_EXCERPT || !is_string($contract['excerpt'])) return new WP_Error('ai_writer_draft_contract_text', 'Title or excerpt exceeds the bounded contract.', ['status' => 409]);
    if (!preg_match('/^[a-f0-9]{64}$/D', $contract['content_sha256']) || !is_array($contract['allowed_blocks']) || !$contract['allowed_blocks']) return new WP_Error('ai_writer_draft_contract_binding', 'Content or block binding is invalid.', ['status' => 409]);
    $allowed = array_values(array_unique($contract['allowed_blocks']));
    if ($allowed !== ['paragraph', 'heading', 'list', 'group', 'columns', 'column', 'buttons', 'button', 'image']) return new WP_Error('ai_writer_draft_blocks_scope', 'Allowed blocks are not the fixed core-block set.', ['status' => 409]);
    $valid = ai_writer_draft_valid_content($contract['content'], $allowed); if (is_wp_error($valid)) return $valid;
    if (!hash_equals($contract['content_sha256'], ai_writer_draft_hash($contract['content']))) return new WP_Error('ai_writer_draft_content_hash', 'Content hash does not match the contract.', ['status' => 409]);
    if (strlen($contract['execution_id']) < 16 || strlen($contract['execution_id']) > 128 || !preg_match('/^[A-Za-z0-9._-]+$/D', $contract['execution_id'])) return new WP_Error('ai_writer_draft_execution_id', 'Execution ID is invalid.', ['status' => 409]);
    return $contract;
}
function ai_writer_draft_contract_from_store() {
    $record = ai_writer_draft_record(AI_WRITER_DRAFT_CONTRACT_OPTION);
    if (!$record || !is_array($record['contract'] ?? null) || !is_string($record['sha256'] ?? null)) return new WP_Error('ai_writer_draft_contract_missing', 'No active draft contract is installed.', ['status' => 423]);
    $valid = ai_writer_draft_validate_contract($record['contract']); if (is_wp_error($valid)) return $valid;
    if (!hash_equals($record['sha256'], ai_writer_draft_hash($record['contract']))) return new WP_Error('ai_writer_draft_contract_fingerprint', 'Stored contract fingerprint is invalid.', ['status' => 409]);
    return $record['contract'];
}
function ai_writer_draft_request_contract(WP_REST_Request $request) {
    if (strlen($request->get_body()) > AI_WRITER_DRAFT_MAX_BYTES) return new WP_Error('ai_writer_draft_payload_large', 'Contract payload is too large.', ['status' => 413]);
    $body = $request->get_json_params(); if (!is_array($body) || !ai_writer_draft_exact_keys($body, ['contract']) || !is_array($body['contract'])) return new WP_Error('ai_writer_draft_payload_shape', 'Request must contain exactly one contract.', ['status' => 400]);
    if (array_key_exists('existing_post_id', $body['contract']) || array_key_exists('post_id', $body['contract'])) return new WP_Error('ai_writer_draft_existing_target_forbidden', 'An existing post target is never accepted.', ['status' => 409]);
    return $body['contract'];
}
function ai_writer_draft_install_contract(WP_REST_Request $request) {
    $contract = ai_writer_draft_request_contract($request); if (is_wp_error($contract)) return $contract;
    $valid = ai_writer_draft_validate_contract($contract); if (is_wp_error($valid)) return $valid;
    if (ai_writer_draft_record(AI_WRITER_DRAFT_CONTRACT_OPTION)) return new WP_Error('ai_writer_draft_contract_exists', 'An active contract exists; remove it explicitly first.', ['status' => 409]);
    $record = ['schema_version' => 1, 'contract' => $contract, 'sha256' => ai_writer_draft_hash($contract), 'installed_at' => gmdate('c'), 'installed_by' => get_current_user_id()];
    if (!add_option(AI_WRITER_DRAFT_CONTRACT_OPTION, $record, '', false)) return new WP_Error('ai_writer_draft_contract_conflict', 'Contract installation was not atomic.', ['status' => 409]);
    return rest_ensure_response(['status' => 'installed', 'contract_sha256' => $record['sha256'], 'content_writes' => 0]);
}
function ai_writer_draft_rollover_request(WP_REST_Request $request) {
    if (strlen($request->get_body()) > 10000) return new WP_Error('ai_writer_draft_rollover_payload_large', 'Rollover payload is too large.', ['status' => 413]);
    $body = $request->get_json_params();
    if (!is_array($body) || !ai_writer_draft_exact_keys($body, ['rollover']) || !is_array($body['rollover'])) return new WP_Error('ai_writer_draft_rollover_payload_shape', 'Request must contain exactly one rollover object.', ['status' => 400]);
    $keys = ['execution_id', 'active_contract_sha256', 'terminal_status', 'consumed', 'replayable', 'human_authorisation_fingerprint', 'operation_id'];
    if (!ai_writer_draft_exact_keys($body['rollover'], $keys)) return new WP_Error('ai_writer_draft_rollover_shape', 'Rollover fields are not exact.', ['status' => 400]);
    return $body['rollover'];
}
function ai_writer_draft_rollover(WP_REST_Request $request) {
    $current = ai_writer_draft_record(AI_WRITER_DRAFT_CONTRACT_OPTION);
    if (!$current || !is_array($current['contract'] ?? null) || !is_string($current['sha256'] ?? null)) return new WP_Error('ai_writer_draft_rollover_no_active_contract', 'No active contract can be retired.', ['status' => 409]);
    $contract = ai_writer_draft_validate_contract($current['contract']); if (is_wp_error($contract)) return $contract;
    $rollover = ai_writer_draft_rollover_request($request); if (is_wp_error($rollover)) return $rollover;
    $claim_option = ai_writer_draft_execution_option($contract['execution_id']);
    $claim = ai_writer_draft_record($claim_option);
    $terminal = in_array($claim['status'] ?? null, ['succeeded', 'failed_after_claim'], true);
    if (!$claim || !$terminal) return new WP_Error('ai_writer_draft_rollover_not_terminal', 'Only a terminal consumed execution can be rolled over.', ['status' => 409]);
    if ($rollover['execution_id'] !== $contract['execution_id'] || !hash_equals($current['sha256'], (string) $rollover['active_contract_sha256']) || $rollover['terminal_status'] !== $claim['status'] || $rollover['consumed'] !== true || $rollover['replayable'] !== false) return new WP_Error('ai_writer_draft_rollover_binding', 'Rollover authorisation does not match the active consumed execution.', ['status' => 409]);
    foreach (['execution_id', 'active_contract_sha256', 'terminal_status', 'human_authorisation_fingerprint', 'operation_id'] as $field) if (!is_string($rollover[$field]) || trim($rollover[$field]) === '') return new WP_Error('ai_writer_draft_rollover_field', 'Rollover authorisation binding is invalid.', ['status' => 409]);
    if (!preg_match('/^[a-f0-9]{64}$/D', $rollover['active_contract_sha256']) || !preg_match('/^[A-Za-z0-9._-]{16,128}$/D', $rollover['operation_id'])) return new WP_Error('ai_writer_draft_rollover_binding', 'Rollover authorisation binding is invalid.', ['status' => 409]);
    $lock_option = AI_WRITER_DRAFT_ROLLOVER_LOCK_PREFIX . ai_writer_draft_hash($rollover['operation_id']);
    if (!add_option($lock_option, ['schema_version' => AI_WRITER_DRAFT_ROLLOVER_SCHEMA, 'claimed_at' => gmdate('c')], '', false)) return new WP_Error('ai_writer_draft_rollover_replay', 'Rollover operation was already consumed.', ['status' => 409]);
    $history_option = AI_WRITER_DRAFT_ROLLOVER_HISTORY_PREFIX . ai_writer_draft_hash($contract['execution_id']);
    $history = ['schema_version' => AI_WRITER_DRAFT_ROLLOVER_SCHEMA, 'state' => 'retiring', 'operation_id_sha256' => ai_writer_draft_hash($rollover['operation_id']), 'previous_execution_id_sha256' => ai_writer_draft_hash($contract['execution_id']), 'previous_terminal_status' => $claim['status'], 'previous_contract_sha256' => $current['sha256'], 'started_at' => gmdate('c'), 'active_contract_present' => true];
    if (!add_option($history_option, $history, '', false)) return new WP_Error('ai_writer_draft_rollover_history_conflict', 'Historical rollover record already exists.', ['status' => 409]);
    $archive_option = AI_WRITER_DRAFT_ROLLOVER_ARCHIVE_PREFIX . ai_writer_draft_hash($contract['execution_id']);
    if (!add_option($archive_option, ['schema_version' => AI_WRITER_DRAFT_ROLLOVER_SCHEMA, 'state' => 'archived', 'active_record' => $current, 'archived_at' => gmdate('c')], '', false)) return new WP_Error('ai_writer_draft_rollover_archive_conflict', 'The previous contract archive already exists.', ['status' => 409]);
    if (!delete_option(AI_WRITER_DRAFT_CONTRACT_OPTION)) { $history['state'] = 'retirement_failed'; $history['active_contract_present'] = true; update_option($history_option, $history, false); return new WP_Error('ai_writer_draft_rollover_failed', 'Active contract could not be retired.', ['status' => 500]); }
    $history['state'] = 'retired'; $history['active_contract_present'] = false; $history['previous_contract_archived'] = true; $history['retired_at'] = gmdate('c'); update_option($history_option, $history, false);
    return rest_ensure_response(['status' => 'retired', 'previous_execution_id_sha256' => $history['previous_execution_id_sha256'], 'previous_contract_sha256' => $history['previous_contract_sha256'], 'historical_execution_preserved' => true, 'previous_contract_archived' => true, 'active_contract_present' => false, 'content_writes' => 0]);
}
function ai_writer_draft_status() {
    $record = ai_writer_draft_record(AI_WRITER_DRAFT_CONTRACT_OPTION); if (!$record) return rest_ensure_response(['status' => 'absent', 'execution_claimed' => false]);
    $contract = $record['contract']; $claim = ai_writer_draft_record(ai_writer_draft_execution_option($contract['execution_id']));
    $response = ['status' => 'installed', 'contract_sha256' => $record['sha256'], 'execution_id_sha256' => ai_writer_draft_hash($contract['execution_id']), 'execution_claimed' => (bool) $claim, 'execution_terminal' => $claim['status'] ?? null, 'content_writes' => 0];
    if (($claim['status'] ?? null) === 'failed_after_claim') {
        $code = is_string($claim['error'] ?? null) && preg_match('/^[A-Za-z0-9._:-]{1,80}$/D', $claim['error']) === 1 ? $claim['error'] : null;
        $response['failure_code'] = $code;
        $response['failure_diagnostic_available'] = $code !== null;
    }
    return rest_ensure_response($response);
}
function ai_writer_draft_execution_diagnostic(WP_REST_Request $request) {
    $execution_id = (string) $request['execution_id'];
    $contract = ai_writer_draft_contract_from_store();
    if (is_wp_error($contract)) {
        $history = ai_writer_draft_record(AI_WRITER_DRAFT_ROLLOVER_HISTORY_PREFIX . ai_writer_draft_hash($execution_id));
        if (!$history || ($history['state'] ?? null) !== 'retired' || !hash_equals((string) ($history['previous_execution_id_sha256'] ?? ''), ai_writer_draft_hash($execution_id))) return $contract;
    } elseif (!hash_equals(ai_writer_draft_hash($contract['execution_id']), ai_writer_draft_hash($execution_id))) return new WP_Error('ai_writer_draft_diagnostic_execution_mismatch', 'Execution diagnostic is not bound to the active contract.', ['status' => 404]);
    $claim = ai_writer_draft_record(ai_writer_draft_execution_option($execution_id));
    if (!$claim) return new WP_Error('ai_writer_draft_diagnostic_missing', 'No claim exists for this execution.', ['status' => 404]);
    $state = is_string($claim['status'] ?? null) ? $claim['status'] : 'unknown';
    $has_error = array_key_exists('error', $claim) && is_string($claim['error']) && $claim['error'] !== '';
    $has_created_post_id = array_key_exists('created_post_id', $claim) && is_int($claim['created_post_id']) && $claim['created_post_id'] > 0;
    $has_cleanup_verified = array_key_exists('cleanup_verified', $claim) && is_bool($claim['cleanup_verified']);
    $cleanup_verified = $has_cleanup_verified ? $claim['cleanup_verified'] : null;
    $failure_stage = null;
    if ($state === 'failed_after_claim') {
        if ($has_error && !$has_created_post_id) $failure_stage = 'insert_error';
        elseif ($has_created_post_id && $has_cleanup_verified && $cleanup_verified === false) $failure_stage = 'cleanup_failure';
        elseif ($has_created_post_id && $has_cleanup_verified && $cleanup_verified === true) $failure_stage = 'verification_failure';
        else $failure_stage = 'unknown_post_claim_failure';
    }
    $checks = is_array($claim['verification_checks'] ?? null) ? $claim['verification_checks'] : null;
    $bounded_checks = null;
    if ($checks !== null) {
        $bounded_checks = [];
        foreach (['post_id_match', 'type_match', 'status_match', 'title_match', 'content_match', 'template_match', 'taxonomy_match', 'hashes_match', 'unexpected_template_present', 'unexpected_taxonomy_present', 'default_category_present'] as $key) if (array_key_exists($key, $checks)) $bounded_checks[$key] = (bool) $checks[$key];
        if (array_key_exists('unexpected_term_count', $checks) && is_int($checks['unexpected_term_count']) && $checks['unexpected_term_count'] >= 0) $bounded_checks['unexpected_term_count'] = $checks['unexpected_term_count'];
    }
    $expected_hash = is_string($claim['expected_content_hash'] ?? null) && preg_match('/^[a-f0-9]{64}$/D', $claim['expected_content_hash']) === 1 ? $claim['expected_content_hash'] : null;
    $observed_hash = is_string($claim['observed_content_hash'] ?? null) && preg_match('/^[a-f0-9]{64}$/D', $claim['observed_content_hash']) === 1 ? $claim['observed_content_hash'] : null;
    $allowed_fields = ['post_id', 'post_type', 'post_status', 'post_title', 'post_content', 'template', 'taxonomy'];
    $mismatch_field = in_array($claim['verification_mismatch_field'] ?? null, $allowed_fields, true) ? $claim['verification_mismatch_field'] : null;
    $verification_stage = ($claim['verification_failure_stage'] ?? null) === 'verification_failure' || ($claim['verification_failure_stage'] ?? null) === 'cleanup_failure' ? $claim['verification_failure_stage'] : null;
    return rest_ensure_response(['status' => $state, 'consumed' => true, 'replayable' => false, 'has_error' => $has_error, 'has_created_post_id' => $has_created_post_id, 'has_cleanup_verified' => $has_cleanup_verified, 'cleanup_verified' => $cleanup_verified, 'failure_stage' => $failure_stage, 'verification_failure_stage' => $verification_stage, 'verification_mismatch_field' => $mismatch_field, 'verification_checks' => $bounded_checks, 'expected_content_hash' => $expected_hash, 'observed_content_hash' => $observed_hash, 'content_hashes_match' => $expected_hash !== null && $observed_hash !== null && hash_equals($expected_hash, $observed_hash), 'content_writes' => 0]);
}
function ai_writer_draft_remove_contract() {
    $contract = ai_writer_draft_contract_from_store(); if (is_wp_error($contract)) return $contract;
    if (ai_writer_draft_record(ai_writer_draft_execution_option($contract['execution_id']))) return new WP_Error('ai_writer_draft_contract_locked', 'Executed contracts cannot be removed.', ['status' => 409]);
    if (!delete_option(AI_WRITER_DRAFT_CONTRACT_OPTION)) return new WP_Error('ai_writer_draft_contract_remove', 'Contract could not be removed.', ['status' => 500]);
    return rest_ensure_response(['status' => 'removed', 'content_writes' => 0]);
}
function ai_writer_draft_dry_run() {
    $contract = ai_writer_draft_contract_from_store(); if (is_wp_error($contract)) return $contract;
    $claim = ai_writer_draft_record(ai_writer_draft_execution_option($contract['execution_id']));
    return rest_ensure_response(['status' => 'valid', 'title' => $contract['title'], 'content_sha256' => $contract['content_sha256'], 'post_type' => 'post', 'post_status' => 'draft', 'h1_count' => 0, 'approved_blocks' => $contract['allowed_blocks'], 'forbidden_content_checks' => 'PASS', 'execution_id_state' => $claim ? 'claimed' : 'unclaimed', 'contract_binding' => 'PASS', 'create_capable' => true, 'mutation_performed' => false, 'claim_performed' => false, 'content_writes' => 0]);
}
function ai_writer_draft_created_draft_readback(WP_REST_Request $request) {
    $contract = ai_writer_draft_contract_from_store();
    if (is_wp_error($contract)) return $contract;
    $execution_id = (string) $request['execution_id'];
    $claim = ai_writer_draft_record(ai_writer_draft_execution_option($execution_id));
    if (!$claim || ($claim['status'] ?? null) !== 'succeeded' || !is_int($claim['created_post_id'] ?? null) || $claim['created_post_id'] < 1) return new WP_Error('ai_writer_draft_readback_unavailable', 'No successfully created draft is bound to this execution.', ['status' => 404]);
    if (($claim['execution_id_sha256'] ?? '') !== ai_writer_draft_hash($execution_id) || ($claim['contract_sha256'] ?? '') !== ai_writer_draft_hash($contract)) return new WP_Error('ai_writer_draft_readback_binding', 'Execution and contract bindings do not match.', ['status' => 409]);
    $post = get_post((int) $claim['created_post_id']);
    if (!$post || (int) $post->ID !== (int) $claim['created_post_id'] || $post->post_type !== 'post' || $post->post_status !== 'draft' || $post->post_title !== $contract['title']) return new WP_Error('ai_writer_draft_readback_mismatch', 'The created draft no longer matches its bounded contract.', ['status' => 409]);
    if (!hash_equals($contract['content_sha256'], ai_writer_draft_hash($post->post_content))) return new WP_Error('ai_writer_draft_readback_content', 'Persisted draft content does not match its bounded contract.', ['status' => 409]);
    if ((string) get_post_meta((int) $post->ID, '_wp_page_template', true) !== '') return new WP_Error('ai_writer_draft_readback_template', 'Unexpected template assignment detected.', ['status' => 409]);
    $default_category_id = (int) get_option('default_category');
    foreach (get_object_taxonomies('post') as $taxonomy) {
        $terms = wp_get_object_terms((int) $post->ID, $taxonomy, ['fields' => 'ids']);
        $ids = is_wp_error($terms) ? [] : array_map('intval', (array) $terms);
        if ($taxonomy === 'category') $ids = array_values(array_diff($ids, [$default_category_id]));
        if ($ids) return new WP_Error('ai_writer_draft_readback_taxonomy', 'Unexpected taxonomy assignment detected.', ['status' => 409]);
    }
    return rest_ensure_response(['status' => 'verified', 'post_id' => (int) $post->ID, 'post_type' => $post->post_type, 'post_status' => $post->post_status, 'post_title' => $post->post_title, 'post_name' => $post->post_name, 'content_sha256' => ai_writer_draft_hash($post->post_content), 'template_assignment' => '', 'taxonomy_state' => 'default_category_only', 'metadata_state' => 'bounded', 'content_writes' => 0]);
}
function ai_writer_draft_verification_error(string $field, array $checks, ?string $expected_hash = null, ?string $observed_hash = null): WP_Error {
    $allowed = ['post_id', 'post_type', 'post_status', 'post_title', 'post_content', 'template', 'taxonomy'];
    if (!in_array($field, $allowed, true)) $field = 'unknown';
    $data = ['status' => 500, 'verification_failure_stage' => 'verification_failure', 'verification_mismatch_field' => $field, 'verification_checks' => $checks];
    if ($expected_hash !== null) $data['expected_content_hash'] = $expected_hash;
    if ($observed_hash !== null) $data['observed_content_hash'] = $observed_hash;
    return new WP_Error('ai_writer_draft_readback_mismatch', 'Fresh persisted draft state does not exactly match.', $data);
}
function ai_writer_draft_readback(int $post_id, array $contract) {
    $post = get_post($post_id);
    $checks = ['post_id_match' => false, 'type_match' => false, 'status_match' => false, 'title_match' => false, 'content_match' => false, 'hashes_match' => false, 'template_match' => false, 'taxonomy_match' => false, 'unexpected_template_present' => false, 'unexpected_taxonomy_present' => false, 'default_category_present' => false, 'unexpected_term_count' => 0];
    $expected_hash = $contract['content_sha256'];
    if (!$post) return ai_writer_draft_verification_error('post_id', $checks, $expected_hash);
    $checks['post_id_match'] = (int) $post->ID === $post_id;
    $checks['type_match'] = $post->post_type === 'post';
    $checks['status_match'] = $post->post_status === 'draft';
    $checks['title_match'] = $post->post_title === $contract['title'];
    $observed_hash = ai_writer_draft_hash($post->post_content);
    $checks['hashes_match'] = hash_equals($expected_hash, $observed_hash);
    $checks['content_match'] = $checks['hashes_match'] && $post->post_content === $contract['content'];
    if (!$checks['post_id_match']) return ai_writer_draft_verification_error('post_id', $checks, $expected_hash, $observed_hash);
    if (!$checks['type_match']) return ai_writer_draft_verification_error('post_type', $checks, $expected_hash, $observed_hash);
    if (!$checks['status_match']) return ai_writer_draft_verification_error('post_status', $checks, $expected_hash, $observed_hash);
    if (!$checks['title_match']) return ai_writer_draft_verification_error('post_title', $checks, $expected_hash, $observed_hash);
    if (!$checks['content_match']) return ai_writer_draft_verification_error('post_content', $checks, $expected_hash, $observed_hash);
    $checks['template_match'] = (string) get_post_meta($post_id, '_wp_page_template', true) === '';
    $checks['unexpected_template_present'] = !$checks['template_match'];
    if (!$checks['template_match']) return ai_writer_draft_verification_error('template', $checks, $expected_hash, $observed_hash);
    $default_category_id = (int) get_option('default_category');
    foreach (get_object_taxonomies('post') as $taxonomy) {
        $terms = wp_get_object_terms($post_id, $taxonomy, ['fields' => 'ids']);
        $ids = is_wp_error($terms) ? [] : array_map('intval', (array) $terms);
        if ($taxonomy === 'category') {
            $checks['default_category_present'] = in_array($default_category_id, $ids, true);
            $ids = array_values(array_diff($ids, [$default_category_id]));
        }
        if ($ids) { $checks['unexpected_taxonomy_present'] = true; $checks['unexpected_term_count'] += count($ids); }
    }
    $checks['taxonomy_match'] = !$checks['unexpected_taxonomy_present'];
    if (!$checks['taxonomy_match']) return ai_writer_draft_verification_error('taxonomy', $checks, $expected_hash, $observed_hash);
    return ['id' => $post_id, 'post_type' => 'post', 'status' => 'draft', 'title' => $post->post_title, 'content_sha256' => ai_writer_draft_hash($post->post_content), 'admin_edit_url' => get_edit_post_link($post_id, 'raw'), 'preview_url' => get_preview_post_link($post)];
}
function ai_writer_draft_execute() {
    $contract = ai_writer_draft_contract_from_store(); if (is_wp_error($contract)) return $contract;
    $claim_option = ai_writer_draft_execution_option($contract['execution_id']);
    if (!add_option($claim_option, ['schema_version' => 1, 'execution_id_sha256' => ai_writer_draft_hash($contract['execution_id']), 'contract_sha256' => ai_writer_draft_hash($contract), 'status' => 'claimed', 'claimed_at' => gmdate('c')], '', false)) return new WP_Error('ai_writer_draft_execution_replay', 'Execution ID is already consumed.', ['status' => 409]);
    $post_id = wp_insert_post(['post_title' => $contract['title'], 'post_excerpt' => $contract['excerpt'], 'post_content' => $contract['content'], 'post_type' => 'post', 'post_status' => 'draft', 'post_category' => []], true);
    if (is_wp_error($post_id)) { update_option($claim_option, ['schema_version' => 1, 'status' => 'failed_after_claim', 'error' => $post_id->get_error_code(), 'completed_at' => gmdate('c')], false); return $post_id; }
    $verification = ai_writer_draft_readback((int) $post_id, $contract);
    if (is_wp_error($verification)) {
        $diagnostics = is_array($verification->get_error_data()) ? $verification->get_error_data() : [];
        $failure_state = ['schema_version' => 1, 'status' => 'failed_after_claim', 'created_post_id' => (int) $post_id, 'cleanup_verified' => null, 'verification_failure_stage' => $diagnostics['verification_failure_stage'] ?? 'verification_failure', 'verification_mismatch_field' => $diagnostics['verification_mismatch_field'] ?? 'unknown', 'verification_checks' => $diagnostics['verification_checks'] ?? [], 'expected_content_hash' => $diagnostics['expected_content_hash'] ?? null, 'observed_content_hash' => $diagnostics['observed_content_hash'] ?? null, 'completed_at' => null];
        update_option($claim_option, $failure_state, false);
        wp_trash_post((int) $post_id);
        $trashed = get_post((int) $post_id); $cleanup_ok = $trashed && $trashed->post_status === 'trash';
        $failure_state['cleanup_verified'] = (bool) $cleanup_ok;
        $failure_state['completed_at'] = gmdate('c');
        if (!$cleanup_ok) $failure_state['verification_failure_stage'] = 'cleanup_failure';
        update_option($claim_option, $failure_state, false);
        return new WP_Error('ai_writer_draft_verification_failed', 'Draft verification failed; exact created draft was trashed.', ['status' => 500]);
    }
    update_option($claim_option, ['schema_version' => 1, 'execution_id_sha256' => ai_writer_draft_hash($contract['execution_id']), 'contract_sha256' => ai_writer_draft_hash($contract), 'status' => 'succeeded', 'consumed' => true, 'replayable' => false, 'created_post_id' => (int) $post_id, 'completed_at' => gmdate('c')], false);
    return rest_ensure_response($verification + ['status' => 'succeeded', 'content_writes' => 1, 'publication_attempts' => 0]);
}

add_action('rest_api_init', static function (): void {
    register_rest_route('ai-writer/v1', '/article-draft/contract', [
        ['methods' => WP_REST_Server::CREATABLE, 'permission_callback' => 'ai_writer_draft_permission', 'callback' => 'ai_writer_draft_install_contract'],
        ['methods' => WP_REST_Server::DELETABLE, 'permission_callback' => 'ai_writer_draft_permission', 'callback' => 'ai_writer_draft_remove_contract'],
    ]);
    register_rest_route('ai-writer/v1', '/article-draft/contract/rollover', ['methods' => WP_REST_Server::CREATABLE, 'permission_callback' => 'ai_writer_draft_permission', 'callback' => 'ai_writer_draft_rollover']);
    register_rest_route('ai-writer/v1', '/article-draft/status', ['methods' => WP_REST_Server::READABLE, 'permission_callback' => 'ai_writer_draft_permission', 'callback' => 'ai_writer_draft_status']);
    register_rest_route('ai-writer/v1', '/article-draft/diagnostic/(?P<execution_id>[A-Za-z0-9._-]+)', ['methods' => WP_REST_Server::READABLE, 'permission_callback' => 'ai_writer_draft_permission', 'callback' => 'ai_writer_draft_execution_diagnostic']);
    register_rest_route('ai-writer/v1', '/article-draft/dry-run', ['methods' => WP_REST_Server::READABLE, 'permission_callback' => 'ai_writer_draft_permission', 'callback' => 'ai_writer_draft_dry_run']);
    register_rest_route('ai-writer/v1', '/article-draft/created-draft/(?P<execution_id>[A-Za-z0-9._-]+)', ['methods' => WP_REST_Server::READABLE, 'permission_callback' => 'ai_writer_draft_permission', 'callback' => 'ai_writer_draft_created_draft_readback']);
    register_rest_route('ai-writer/v1', '/article-draft/execute', ['methods' => WP_REST_Server::CREATABLE, 'permission_callback' => 'ai_writer_draft_permission', 'callback' => 'ai_writer_draft_execute']);
});
