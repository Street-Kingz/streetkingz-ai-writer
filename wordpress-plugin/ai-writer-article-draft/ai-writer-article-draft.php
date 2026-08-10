<?php
/**
 * Plugin Name: AI Writer Article Draft
 * Description: Bounded, approval-bound creation of one new draft post from exact Gutenberg content.
 * Version: 0.1.0
 */

defined('ABSPATH') || exit;

const AI_WRITER_DRAFT_CAPABILITY = 'streetkingz_ai_create_article_draft';
const AI_WRITER_DRAFT_ROLE = 'streetkingz_ai_article_draft_writer';
const AI_WRITER_DRAFT_ROLE_VERSION = '1';
const AI_WRITER_DRAFT_ROLE_VERSION_OPTION = 'ai_writer_draft_role_version';
const AI_WRITER_DRAFT_CONTRACT_OPTION = 'ai_writer_draft_active_contract_v1';
const AI_WRITER_DRAFT_EXECUTION_PREFIX = 'ai_writer_draft_execution_';
const AI_WRITER_DRAFT_MAX_BYTES = 250000;
const AI_WRITER_DRAFT_MAX_TITLE = 200;
const AI_WRITER_DRAFT_MAX_EXCERPT = 500;
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
function ai_writer_draft_status() {
    $record = ai_writer_draft_record(AI_WRITER_DRAFT_CONTRACT_OPTION); if (!$record) return rest_ensure_response(['status' => 'absent', 'execution_claimed' => false]);
    $contract = $record['contract']; $claim = ai_writer_draft_record(ai_writer_draft_execution_option($contract['execution_id']));
    return rest_ensure_response(['status' => 'installed', 'contract_sha256' => $record['sha256'], 'execution_id_sha256' => ai_writer_draft_hash($contract['execution_id']), 'execution_claimed' => (bool) $claim, 'execution_terminal' => $claim['status'] ?? null, 'content_writes' => 0]);
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
function ai_writer_draft_readback(int $post_id, array $contract) {
    $post = get_post($post_id); if (!$post || (int) $post->ID !== $post_id || $post->post_type !== 'post' || $post->post_status !== 'draft' || $post->post_title !== $contract['title'] || $post->post_content !== $contract['content']) return new WP_Error('ai_writer_draft_readback_mismatch', 'Fresh persisted draft state does not exactly match.', ['status' => 500]);
    if ((string) get_post_meta($post_id, '_wp_page_template', true) !== '') return new WP_Error('ai_writer_draft_template_unexpected', 'Unexpected template assignment detected.', ['status' => 500]);
    foreach (get_object_taxonomies('post') as $taxonomy) if (wp_get_object_terms($post_id, $taxonomy, ['fields' => 'ids'])) return new WP_Error('ai_writer_draft_taxonomy_unexpected', 'Unexpected taxonomy assignment detected.', ['status' => 500]);
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
        wp_trash_post((int) $post_id);
        $trashed = get_post((int) $post_id); $cleanup_ok = $trashed && $trashed->post_status === 'trash';
        update_option($claim_option, ['schema_version' => 1, 'status' => 'failed_after_claim', 'created_post_id' => (int) $post_id, 'cleanup_verified' => $cleanup_ok, 'completed_at' => gmdate('c')], false);
        return new WP_Error('ai_writer_draft_verification_failed', 'Draft verification failed; exact created draft was trashed.', ['status' => 500]);
    }
    update_option($claim_option, ['schema_version' => 1, 'status' => 'succeeded', 'created_post_id' => (int) $post_id, 'completed_at' => gmdate('c')], false);
    return rest_ensure_response($verification + ['status' => 'succeeded', 'content_writes' => 1, 'publication_attempts' => 0]);
}

add_action('rest_api_init', static function (): void {
    register_rest_route('ai-writer/v1', '/article-draft/contract', [
        ['methods' => WP_REST_Server::CREATABLE, 'permission_callback' => 'ai_writer_draft_permission', 'callback' => 'ai_writer_draft_install_contract'],
        ['methods' => WP_REST_Server::DELETABLE, 'permission_callback' => 'ai_writer_draft_permission', 'callback' => 'ai_writer_draft_remove_contract'],
    ]);
    register_rest_route('ai-writer/v1', '/article-draft/status', ['methods' => WP_REST_Server::READABLE, 'permission_callback' => 'ai_writer_draft_permission', 'callback' => 'ai_writer_draft_status']);
    register_rest_route('ai-writer/v1', '/article-draft/dry-run', ['methods' => WP_REST_Server::READABLE, 'permission_callback' => 'ai_writer_draft_permission', 'callback' => 'ai_writer_draft_dry_run']);
    register_rest_route('ai-writer/v1', '/article-draft/execute', ['methods' => WP_REST_Server::CREATABLE, 'permission_callback' => 'ai_writer_draft_permission', 'callback' => 'ai_writer_draft_execute']);
});
