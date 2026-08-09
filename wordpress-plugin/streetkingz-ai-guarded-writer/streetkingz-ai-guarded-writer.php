<?php
/**
 * Plugin Name: Street Kingz AI Guarded Writer
 * Description: Approval-bound writer for one reviewed product-copy change set. Inactive unless a separate write capability is deliberately assigned.
 * Version: 0.1.8
 */

defined('ABSPATH') || exit;

const STREETKINGZ_AI_WRITE_CAPABILITY = 'streetkingz_ai_write_approved_product_copy';
const STREETKINGZ_AI_WRITER_ROLE = 'streetkingz_ai_writer';
const STREETKINGZ_AI_WRITER_ROLE_VERSION = '1';
const STREETKINGZ_AI_WRITER_ROLE_VERSION_OPTION = 'streetkingz_ai_writer_role_version';
const STREETKINGZ_AI_EXECUTION_OPTION_PREFIX = 'streetkingz_ai_exec_';
const STREETKINGZ_AI_EXECUTION_RESERVATION_PREFIX = 'streetkingz_ai_exec_reservation_';
const STREETKINGZ_AI_ACTIVE_APPROVAL_OPTION = 'streetkingz_ai_writer_active_approval_v1';
const STREETKINGZ_AI_ACTIVE_EXECUTION_OPTION = 'streetkingz_ai_writer_active_execution_v1';
const STREETKINGZ_AI_MANIFEST_AUDIT_PREFIX = 'streetkingz_ai_writer_manifest_audit_';
const STREETKINGZ_AI_APPROVAL_MAX_BYTES = 200000;
const STREETKINGZ_AI_EXECUTION_MAX_BYTES = 50000;
const STREETKINGZ_AI_WRITE_PRODUCT_ID = 70;
const STREETKINGZ_AI_WRITE_TEMPLATE_ID = 2003;
const STREETKINGZ_AI_WRITE_DESCRIPTION_ID = 'c80e718';
const STREETKINGZ_AI_WRITE_ACCORDION_ID = '4691e088';
const STREETKINGZ_AI_WRITE_COMPARISON_ID = '40869c27';
const STREETKINGZ_AI_WRITE_SAFETY_ID = '43d7d6f0';

function streetkingz_ai_writer_ensure_role(): void {
    $allowed = ['read' => true, STREETKINGZ_AI_WRITE_CAPABILITY => true];
    $role = get_role(STREETKINGZ_AI_WRITER_ROLE);
    if (!$role) {
        add_role(STREETKINGZ_AI_WRITER_ROLE, 'Street Kingz AI Writer', $allowed);
    } else {
        foreach (array_keys($role->capabilities) as $capability) {
            if (!array_key_exists($capability, $allowed)) $role->remove_cap($capability);
        }
        foreach ($allowed as $capability => $grant) $role->add_cap($capability, $grant);
    }
    update_option(STREETKINGZ_AI_WRITER_ROLE_VERSION_OPTION, STREETKINGZ_AI_WRITER_ROLE_VERSION, false);
}

register_activation_hook(__FILE__, 'streetkingz_ai_writer_ensure_role');

function streetkingz_ai_writer_is_protected_rest_request(WP_REST_Request $request): bool {
    return preg_match('#^/streetkingz-ai/v1/approved-product-70-copy/(?:approval(?:/status)?|execution-contract|execution/status|dry-run|execute)$#D', $request->get_route()) === 1;
}

/* Protected control-plane state and dry-run results must always reach WordPress. */
function streetkingz_ai_writer_disable_protected_rest_cache(): void {
    if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
    if (!defined('LSCACHE_NO_CACHE')) define('LSCACHE_NO_CACHE', true);
    do_action('litespeed_control_set_nocache', 'Street Kingz guarded Writer control plane');
}

add_filter('rest_pre_dispatch', static function ($result, WP_REST_Server $server, WP_REST_Request $request) {
    if (streetkingz_ai_writer_is_protected_rest_request($request)) streetkingz_ai_writer_disable_protected_rest_cache();
    return $result;
}, 1, 3);

add_filter('rest_post_dispatch', static function ($response, WP_REST_Server $server, WP_REST_Request $request) {
    if (streetkingz_ai_writer_is_protected_rest_request($request) && $response instanceof WP_HTTP_Response) {
        $response->header('Cache-Control', 'no-cache, must-revalidate, max-age=0, no-store, private');
        $response->header('X-LiteSpeed-Cache-Control', 'no-cache');
    }
    return $response;
}, 999, 3);

/* Activation hooks do not run when an active plugin is replaced. This bounded migration creates/reconciles only the named writer role. */
add_action('init', static function (): void {
    if (get_option(STREETKINGZ_AI_WRITER_ROLE_VERSION_OPTION) !== STREETKINGZ_AI_WRITER_ROLE_VERSION) streetkingz_ai_writer_ensure_role();
}, 1);

/* Deliberately no deactivation/uninstall role removal: users and their role assignments are never changed implicitly. */
add_action('rest_api_init', static function (): void {
    register_rest_route('streetkingz-ai/v1', '/approved-product-70-copy/(?P<mode>dry-run|execute)', [
        'methods' => WP_REST_Server::CREATABLE,
        'permission_callback' => static function () {
            if (!is_user_logged_in() || !current_user_can(STREETKINGZ_AI_WRITE_CAPABILITY)) {
                return new WP_Error('streetkingz_ai_write_forbidden', 'This account cannot execute approved product copy changes.', ['status' => 403]);
            }
            return true;
        },
        'callback' => 'streetkingz_ai_guarded_writer_request',
        'args' => ['mode' => ['required' => true, 'enum' => ['dry-run', 'execute']]],
    ]);
    register_rest_route('streetkingz-ai/v1', '/approved-product-70-copy/approval', [
        ['methods' => WP_REST_Server::CREATABLE, 'permission_callback' => 'streetkingz_ai_writer_permission', 'callback' => 'streetkingz_ai_writer_install_approval'],
        ['methods' => WP_REST_Server::DELETABLE, 'permission_callback' => 'streetkingz_ai_writer_permission', 'callback' => 'streetkingz_ai_writer_remove_approval'],
    ]);
    register_rest_route('streetkingz-ai/v1', '/approved-product-70-copy/approval/status', [
        'methods' => WP_REST_Server::READABLE,
        'permission_callback' => 'streetkingz_ai_writer_permission',
        'callback' => 'streetkingz_ai_writer_approval_status',
    ]);
    register_rest_route('streetkingz-ai/v1', '/approved-product-70-copy/execution-contract', [
        ['methods' => WP_REST_Server::CREATABLE, 'permission_callback' => 'streetkingz_ai_writer_permission', 'callback' => 'streetkingz_ai_writer_install_execution_contract'],
        ['methods' => WP_REST_Server::DELETABLE, 'permission_callback' => 'streetkingz_ai_writer_permission', 'callback' => 'streetkingz_ai_writer_remove_execution_contract'],
    ]);
    register_rest_route('streetkingz-ai/v1', '/approved-product-70-copy/execution/status', [
        'methods' => WP_REST_Server::READABLE,
        'permission_callback' => 'streetkingz_ai_writer_permission',
        'callback' => 'streetkingz_ai_writer_execution_status',
    ]);
});

function streetkingz_ai_writer_permission() {
    if (!is_user_logged_in() || !current_user_can(STREETKINGZ_AI_WRITE_CAPABILITY)) return new WP_Error('streetkingz_ai_write_forbidden', 'This account cannot manage or execute approved product copy changes.', ['status' => 403]);
    return true;
}

function streetkingz_ai_writer_exact_keys(array $value, array $expected): bool {
    $actual = array_keys($value);
    sort($actual, SORT_STRING);
    sort($expected, SORT_STRING);
    return $actual === $expected;
}

function streetkingz_ai_writer_is_list(array $value): bool {
    if ($value === []) return true;
    return array_keys($value) === range(0, count($value) - 1);
}

function streetkingz_ai_writer_canonicalise($value) {
    if (!is_array($value)) return $value;
    if (streetkingz_ai_writer_is_list($value)) return array_map('streetkingz_ai_writer_canonicalise', $value);
    ksort($value, SORT_STRING);
    foreach ($value as $key => $item) $value[$key] = streetkingz_ai_writer_canonicalise($item);
    return $value;
}

function streetkingz_ai_writer_canonical_manifest(array $manifest) {
    $json = wp_json_encode(streetkingz_ai_writer_canonicalise($manifest), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($json)) return new WP_Error('streetkingz_ai_manifest_encoding_failed', 'Manifest could not be encoded deterministically.', ['status' => 500]);
    return ['raw' => $json, 'sha256' => hash('sha256', $json), 'manifest' => $manifest];
}

function streetkingz_ai_writer_hash_valid($value): bool {
    return is_string($value) && preg_match('/^[a-f0-9]{64}$/D', $value) === 1;
}

function streetkingz_ai_writer_validate_approval_manifest(array $approval) {
    $top = ['schema_version', 'product_id', 'template_id', 'status', 'approval_timestamp', 'approval_source', 'source_review', 'approved_fields', 'current_state_guards', 'approved_target_hashes', 'authorisation', 'detailed_safety_widget', 'future_write_requires_fresh_pre_write_snapshot'];
    if (!streetkingz_ai_writer_exact_keys($approval, $top)) return new WP_Error('streetkingz_ai_approval_shape_invalid', 'Approval fields are not the exact schema.', ['status' => 409]);
    if (($approval['schema_version'] ?? null) !== 1 || ($approval['product_id'] ?? null) !== STREETKINGZ_AI_WRITE_PRODUCT_ID || ($approval['template_id'] ?? null) !== STREETKINGZ_AI_WRITE_TEMPLATE_ID || ($approval['status'] ?? null) !== 'approved' || ($approval['approval_source'] ?? null) !== 'explicit_user_approval' || ($approval['future_write_requires_fresh_pre_write_snapshot'] ?? null) !== true) return new WP_Error('streetkingz_ai_approval_scope_invalid', 'Approval identity or state is invalid.', ['status' => 409]);
    if (!is_string($approval['approval_timestamp'] ?? null) || strtotime($approval['approval_timestamp']) === false) return new WP_Error('streetkingz_ai_approval_timestamp_invalid', 'Approval timestamp is invalid.', ['status' => 409]);
    if (!is_array($approval['source_review'] ?? null) || !streetkingz_ai_writer_exact_keys($approval['source_review'], ['artifact', 'sha256']) || !is_string($approval['source_review']['artifact']) || !streetkingz_ai_writer_hash_valid($approval['source_review']['sha256'])) return new WP_Error('streetkingz_ai_approval_source_invalid', 'Approval source review is invalid.', ['status' => 409]);
    $authorisation_keys = ['slug_change_authorised', 'metadata_change_authorised', 'unrelated_elementor_changes_authorised', 'detailed_safety_widget_change_authorised', 'publication_authorised'];
    if (!is_array($approval['authorisation'] ?? null) || !streetkingz_ai_writer_exact_keys($approval['authorisation'], $authorisation_keys)) return new WP_Error('streetkingz_ai_approval_authorisation_invalid', 'Approval authorisation shape is invalid.', ['status' => 409]);
    foreach ($approval['authorisation'] as $allowed) if ($allowed !== false) return new WP_Error('streetkingz_ai_approval_broad', 'Approval includes a forbidden authorisation.', ['status' => 409]);
    $guards = $approval['current_state_guards'] ?? null;
    $guard_keys = ['post_title', 'post_excerpt', 'template_elementor_data', 'description_widget', 'comparison_widget', 'safety_widget', 'rendered_page'];
    if (!is_array($guards) || !streetkingz_ai_writer_exact_keys($guards, $guard_keys)) return new WP_Error('streetkingz_ai_approval_guards_invalid', 'Approval current-state guards are invalid.', ['status' => 409]);
    foreach ($guards as $hash) if (!streetkingz_ai_writer_hash_valid($hash)) return new WP_Error('streetkingz_ai_approval_guards_invalid', 'Approval contains an invalid current-state hash.', ['status' => 409]);
    $target_hashes = $approval['approved_target_hashes'] ?? null;
    $required = ['post_title', 'description', 'comparison', 'post_excerpt'];
    if (!is_array($target_hashes) || !streetkingz_ai_writer_exact_keys($target_hashes, $required)) return new WP_Error('streetkingz_ai_target_hashes_invalid', 'Approved-target hashes are invalid.', ['status' => 409]);
    $fields = $approval['approved_fields'] ?? [];
    if (!is_array($fields) || count($fields) !== 4 || array_values(array_column($fields, 'field_id')) !== $required) return new WP_Error('streetkingz_ai_approval_targets_invalid', 'Approval targets are not the exact allowlist.', ['status' => 409]);
    $expected_targets = [
        'post_title' => ['post_id' => 70, 'field' => 'post_title'],
        'description' => ['template_id' => 2003, 'meta_key' => '_elementor_data', 'element_id' => 'c80e718', 'property' => 'settings.editor'],
        'comparison' => ['template_id' => 2003, 'meta_key' => '_elementor_data', 'element_id' => '40869c27', 'property' => 'settings.editor', 'parent_element_id' => '4691e088'],
        'post_excerpt' => ['post_id' => 70, 'field' => 'post_excerpt'],
    ];
    foreach ($fields as $field) {
        $id = $field['field_id'] ?? '';
        $field_keys = ['field_id', 'status', 'cms_target', 'exact_cms_value', 'normalized_approved_representation', 'current_state_guard_sha256', 'approved_target_sha256'];
        if (!streetkingz_ai_writer_exact_keys($field, $field_keys) || !isset($expected_targets[$id]) || ($field['status'] ?? null) !== 'approved' || ($field['cms_target'] ?? null) !== $expected_targets[$id] || !is_string($field['exact_cms_value'] ?? null) || !is_string($field['normalized_approved_representation'] ?? null)) return new WP_Error('streetkingz_ai_approval_targets_invalid', 'Approval target structure is invalid.', ['status' => 409]);
        $target_hash = hash('sha256', $field['exact_cms_value']);
        if (!hash_equals($field['approved_target_sha256'] ?? '', $target_hash) || !hash_equals($target_hashes[$id] ?? '', $target_hash)) return new WP_Error('streetkingz_ai_target_hash_mismatch', 'An approved target value has changed.', ['status' => 409]);
        if (!hash_equals($field['current_state_guard_sha256'] ?? '', $guards[$id === 'description' ? 'description_widget' : ($id === 'comparison' ? 'comparison_widget' : $id)] ?? '')) return new WP_Error('streetkingz_ai_field_guard_mismatch', 'A field guard is not bound to the approval state.', ['status' => 409]);
    }
    if (($approval['detailed_safety_widget'] ?? null) !== ['template_id' => 2003, 'element_id' => '43d7d6f0', 'status' => 'blocked_unchanged']) return new WP_Error('streetkingz_ai_safety_boundary_invalid', 'Detailed safety boundary is invalid.', ['status' => 409]);
    return $approval;
}

function streetkingz_ai_writer_runtime_record(string $option_name) {
    $record = get_option($option_name, null);
    return is_array($record) ? $record : null;
}

function streetkingz_ai_writer_audit(string $event, array $details): bool {
    $record = ['schema_version' => 1, 'event' => $event, 'recorded_at' => gmdate('c'), 'actor_user_id' => get_current_user_id(), 'details' => $details];
    $name = STREETKINGZ_AI_MANIFEST_AUDIT_PREFIX . str_replace('-', '', wp_generate_uuid4());
    return add_option($name, $record, '', false);
}

function streetkingz_ai_writer_manifest() {
    $record = streetkingz_ai_writer_runtime_record(STREETKINGZ_AI_ACTIVE_APPROVAL_OPTION);
    if (!$record || !is_array($record['manifest'] ?? null) || !streetkingz_ai_writer_hash_valid($record['sha256'] ?? null)) return new WP_Error('streetkingz_ai_approval_missing', 'No validated runtime human approval is installed.', ['status' => 423]);
    $validated = streetkingz_ai_writer_validate_approval_manifest($record['manifest']);
    if (is_wp_error($validated)) return $validated;
    $canonical = streetkingz_ai_writer_canonical_manifest($record['manifest']);
    if (is_wp_error($canonical) || !hash_equals($record['sha256'], $canonical['sha256'])) return new WP_Error('streetkingz_ai_approval_store_invalid', 'Stored approval fingerprint is invalid.', ['status' => 409]);
    return $canonical + ['installed_at' => $record['installed_at'] ?? null];
}

function streetkingz_ai_writer_manifest_request(WP_REST_Request $request, int $max_bytes) {
    if (strlen($request->get_body()) > $max_bytes) return new WP_Error('streetkingz_ai_manifest_too_large', 'Runtime manifest exceeds the bounded size limit.', ['status' => 413]);
    $body = $request->get_json_params();
    if (!is_array($body) || !streetkingz_ai_writer_exact_keys($body, ['manifest']) || !is_array($body['manifest'])) return new WP_Error('streetkingz_ai_manifest_payload_invalid', 'Request must contain exactly one manifest object.', ['status' => 400]);
    return $body['manifest'];
}

function streetkingz_ai_writer_install_approval(WP_REST_Request $request) {
    $manifest = streetkingz_ai_writer_manifest_request($request, STREETKINGZ_AI_APPROVAL_MAX_BYTES);
    if (is_wp_error($manifest)) return $manifest;
    $validated = streetkingz_ai_writer_validate_approval_manifest($manifest);
    if (is_wp_error($validated)) return $validated;
    if (streetkingz_ai_writer_runtime_record(STREETKINGZ_AI_ACTIVE_APPROVAL_OPTION)) return new WP_Error('streetkingz_ai_approval_already_installed', 'An approval is already installed; explicit removal is required before replacement.', ['status' => 409]);
    $canonical = streetkingz_ai_writer_canonical_manifest($manifest);
    if (is_wp_error($canonical)) return $canonical;
    $record = ['schema_version' => 1, 'manifest' => $manifest, 'sha256' => $canonical['sha256'], 'installed_at' => gmdate('c'), 'installed_by_user_id' => get_current_user_id()];
    if (!add_option(STREETKINGZ_AI_ACTIVE_APPROVAL_OPTION, $record, '', false)) return new WP_Error('streetkingz_ai_approval_install_conflict', 'Approval could not be atomically installed.', ['status' => 409]);
    if (!streetkingz_ai_writer_audit('approval_installed', ['approval_sha256' => $canonical['sha256'], 'product_id' => 70, 'template_id' => 2003])) {
        delete_option(STREETKINGZ_AI_ACTIVE_APPROVAL_OPTION);
        return new WP_Error('streetkingz_ai_manifest_audit_failed', 'Approval installation audit could not be persisted.', ['status' => 500]);
    }
    return rest_ensure_response(['status' => 'approval_installed', 'approval_sha256' => $canonical['sha256'], 'product_id' => 70, 'template_id' => 2003, 'content_writes_performed' => 0]);
}

function streetkingz_ai_writer_approval_status() {
    $record = streetkingz_ai_writer_runtime_record(STREETKINGZ_AI_ACTIVE_APPROVAL_OPTION);
    if (!$record) return rest_ensure_response(['status' => 'absent', 'product_id' => 70, 'template_id' => 2003]);
    return rest_ensure_response(['status' => 'installed', 'approval_sha256' => $record['sha256'] ?? null, 'installed_at' => $record['installed_at'] ?? null, 'product_id' => 70, 'template_id' => 2003]);
}

function streetkingz_ai_writer_remove_approval(WP_REST_Request $request) {
    if (trim($request->get_body()) !== '') return new WP_Error('streetkingz_ai_manifest_payload_invalid', 'Approval removal accepts no payload.', ['status' => 400]);
    $record = streetkingz_ai_writer_runtime_record(STREETKINGZ_AI_ACTIVE_APPROVAL_OPTION);
    if (!$record) return new WP_Error('streetkingz_ai_approval_missing', 'No runtime approval is installed.', ['status' => 404]);
    if (streetkingz_ai_writer_runtime_record(STREETKINGZ_AI_ACTIVE_EXECUTION_OPTION)) return new WP_Error('streetkingz_ai_approval_has_execution_contract', 'Remove the active execution contract before removing its approval.', ['status' => 409]);
    if (!streetkingz_ai_writer_audit('approval_removed', ['approval_sha256' => $record['sha256'] ?? null, 'product_id' => 70, 'template_id' => 2003])) return new WP_Error('streetkingz_ai_manifest_audit_failed', 'Approval removal audit could not be persisted.', ['status' => 500]);
    if (!delete_option(STREETKINGZ_AI_ACTIVE_APPROVAL_OPTION)) return new WP_Error('streetkingz_ai_approval_remove_failed', 'Approval could not be removed.', ['status' => 500]);
    return rest_ensure_response(['status' => 'approval_removed', 'content_writes_performed' => 0]);
}

function streetkingz_ai_writer_validate_execution_manifest(array $contract, array $approval_record) {
    $expected_keys = ['schema_version', 'status', 'authorisation_source', 'mode', 'product_id', 'template_id', 'approval_artifact_sha256', 'operations', 'current_state_guards', 'approved_target_hashes', 'publication_authorised', 'slug_authorised', 'metadata_authorised', 'safety_widget_change_authorised', 'faq_question_change_authorised', 'unrelated_elementor_changes_authorised', 'other_products_authorised', 'other_templates_authorised', 'one_time_execution_id'];
    if (!streetkingz_ai_writer_exact_keys($contract, $expected_keys)) return new WP_Error('streetkingz_ai_execution_authorisation_invalid', 'Execution contract fields are not the exact schema.', ['status' => 409]);
    $operations = ['post_title', 'post_excerpt', 'c80e718.settings.editor', '40869c27.settings.editor'];
    if (($contract['schema_version'] ?? null) !== 2 || ($contract['status'] ?? null) !== 'authorised' || ($contract['authorisation_source'] ?? null) !== 'explicit_user_live_write_authorisation' || ($contract['mode'] ?? null) !== 'execute' || ($contract['product_id'] ?? null) !== 70 || ($contract['template_id'] ?? null) !== 2003 || ($contract['operations'] ?? null) !== $operations) return new WP_Error('streetkingz_ai_execution_authorisation_scope_invalid', 'Execution contract identity or operation scope is invalid.', ['status' => 409]);
    foreach (['publication_authorised', 'slug_authorised', 'metadata_authorised', 'safety_widget_change_authorised', 'faq_question_change_authorised', 'unrelated_elementor_changes_authorised', 'other_products_authorised', 'other_templates_authorised'] as $flag) if (($contract[$flag] ?? null) !== false) return new WP_Error('streetkingz_ai_execution_authorisation_broad', 'Execution contract authorises a forbidden area.', ['status' => 409]);
    $execution_id = $contract['one_time_execution_id'] ?? null;
    if (!is_string($execution_id) || preg_match('/^[A-Za-z0-9_-]{43,128}$/D', $execution_id) !== 1) return new WP_Error('streetkingz_ai_execution_id_invalid', 'Execution ID does not meet the bounded high-entropy format.', ['status' => 409]);
    $approval = $approval_record['manifest'];
    if (!hash_equals($contract['approval_artifact_sha256'] ?? '', $approval_record['sha256']) || ($contract['current_state_guards'] ?? null) !== ($approval['current_state_guards'] ?? null) || ($contract['approved_target_hashes'] ?? null) !== ($approval['approved_target_hashes'] ?? null)) return new WP_Error('streetkingz_ai_execution_authorisation_binding_invalid', 'Execution contract is not bound to the active approval.', ['status' => 409]);
    if (get_option(streetkingz_ai_writer_execution_option_name($execution_id), null) !== null) return new WP_Error('streetkingz_ai_execution_replay_rejected', 'Execution ID is already present in permanent audit history.', ['status' => 409]);
    return $contract;
}

function streetkingz_ai_writer_install_execution_contract(WP_REST_Request $request) {
    $manifest = streetkingz_ai_writer_manifest_request($request, STREETKINGZ_AI_EXECUTION_MAX_BYTES);
    if (is_wp_error($manifest)) return $manifest;
    $active_approval = streetkingz_ai_writer_manifest();
    if (is_wp_error($active_approval)) return new WP_Error('streetkingz_ai_approval_missing', 'Install a validated approval before an execution contract.', ['status' => 423]);
    $approval = ['manifest' => $active_approval['manifest'], 'sha256' => $active_approval['sha256']];
    $validated = streetkingz_ai_writer_validate_execution_manifest($manifest, $approval);
    if (is_wp_error($validated)) return $validated;
    if (streetkingz_ai_writer_runtime_record(STREETKINGZ_AI_ACTIVE_EXECUTION_OPTION)) return new WP_Error('streetkingz_ai_execution_contract_already_installed', 'An execution contract is already installed; explicit removal is required.', ['status' => 409]);
    $canonical = streetkingz_ai_writer_canonical_manifest($manifest);
    if (is_wp_error($canonical)) return $canonical;
    $reservation_name = streetkingz_ai_writer_execution_reservation_name($manifest['one_time_execution_id']);
    $reservation = ['schema_version' => 1, 'state' => 'installed_unused', 'execution_id_sha256' => hash('sha256', $manifest['one_time_execution_id']), 'contract_sha256' => $canonical['sha256'], 'approval_sha256' => $approval['sha256'], 'reserved_at' => gmdate('c')];
    if (!add_option($reservation_name, $reservation, '', false)) return new WP_Error('streetkingz_ai_execution_id_previously_installed', 'Execution ID has already been installed and cannot be reused.', ['status' => 409]);
    $record = ['schema_version' => 1, 'manifest' => $manifest, 'sha256' => $canonical['sha256'], 'installed_at' => gmdate('c'), 'installed_by_user_id' => get_current_user_id()];
    if (!add_option(STREETKINGZ_AI_ACTIVE_EXECUTION_OPTION, $record, '', false)) return new WP_Error('streetkingz_ai_execution_contract_install_conflict', 'Execution contract could not be atomically installed; its execution ID remains permanently reserved.', ['status' => 409]);
    if (!streetkingz_ai_writer_audit('execution_contract_installed', ['contract_sha256' => $canonical['sha256'], 'approval_sha256' => $approval['sha256'], 'execution_id_sha256' => hash('sha256', $manifest['one_time_execution_id']), 'product_id' => 70, 'template_id' => 2003])) {
        delete_option(STREETKINGZ_AI_ACTIVE_EXECUTION_OPTION);
        return new WP_Error('streetkingz_ai_manifest_audit_failed', 'Execution-contract installation audit could not be persisted.', ['status' => 500]);
    }
    return rest_ensure_response(['status' => 'execution_contract_installed_unused', 'contract_sha256' => $canonical['sha256'], 'execution_id_sha256' => hash('sha256', $manifest['one_time_execution_id']), 'content_writes_performed' => 0, 'execution_claims_performed' => 0]);
}

function streetkingz_ai_writer_execution_status() {
    $record = streetkingz_ai_writer_runtime_record(STREETKINGZ_AI_ACTIVE_EXECUTION_OPTION);
    if (!$record) return rest_ensure_response(['status' => 'absent', 'product_id' => 70, 'template_id' => 2003]);
    $execution_id = $record['manifest']['one_time_execution_id'] ?? '';
    $claim = $execution_id !== '' ? get_option(streetkingz_ai_writer_execution_option_name($execution_id), null) : null;
    return rest_ensure_response(['status' => is_array($claim) ? ($claim['state'] ?? 'claimed') : 'installed_unused', 'contract_sha256' => $record['sha256'] ?? null, 'execution_id_sha256' => $execution_id !== '' ? hash('sha256', $execution_id) : null, 'installed_at' => $record['installed_at'] ?? null, 'product_id' => 70, 'template_id' => 2003]);
}

function streetkingz_ai_writer_remove_execution_contract(WP_REST_Request $request) {
    if (trim($request->get_body()) !== '') return new WP_Error('streetkingz_ai_manifest_payload_invalid', 'Execution-contract removal accepts no payload.', ['status' => 400]);
    $record = streetkingz_ai_writer_runtime_record(STREETKINGZ_AI_ACTIVE_EXECUTION_OPTION);
    if (!$record) return new WP_Error('streetkingz_ai_execution_locked', 'No runtime execution contract is installed.', ['status' => 404]);
    $execution_id = $record['manifest']['one_time_execution_id'] ?? '';
    $claim = $execution_id !== '' ? get_option(streetkingz_ai_writer_execution_option_name($execution_id), null) : null;
    if (is_array($claim) && ($claim['state'] ?? null) === 'claimed_executing') return new WP_Error('streetkingz_ai_execution_in_progress', 'A claimed execution cannot be removed while executing.', ['status' => 409]);
    if (!streetkingz_ai_writer_audit('execution_contract_removed', ['contract_sha256' => $record['sha256'] ?? null, 'execution_id_sha256' => $execution_id !== '' ? hash('sha256', $execution_id) : null, 'claim_state' => is_array($claim) ? ($claim['state'] ?? null) : 'unused'])) return new WP_Error('streetkingz_ai_manifest_audit_failed', 'Execution-contract removal audit could not be persisted.', ['status' => 500]);
    if (!delete_option(STREETKINGZ_AI_ACTIVE_EXECUTION_OPTION)) return new WP_Error('streetkingz_ai_execution_contract_remove_failed', 'Execution contract could not be removed.', ['status' => 500]);
    return rest_ensure_response(['status' => 'execution_contract_removed', 'permanent_id_reservation_preserved' => true, 'permanent_claim_history_preserved' => is_array($claim), 'content_writes_performed' => 0]);
}

function streetkingz_ai_writer_validate_request(WP_REST_Request $request, array $packaged) {
    $body = $request->get_json_params();
    $expected_keys = $request['mode'] === 'execute' ? ['approval_artifact_sha256', 'execution_authorisation_sha256'] : ['approval_artifact_sha256'];
    if (!is_array($body) || array_keys($body) !== $expected_keys) return new WP_Error('streetkingz_ai_write_payload_invalid', 'The request does not match the bounded mode contract.', ['status' => 400]);
    if (!is_string($body['approval_artifact_sha256']) || !hash_equals($packaged['sha256'], $body['approval_artifact_sha256'])) return new WP_Error('streetkingz_ai_approval_fingerprint_mismatch', 'Approval fingerprint does not match.', ['status' => 409]);
    return streetkingz_ai_writer_validate_approval_manifest($packaged['manifest']);
}

function streetkingz_ai_writer_execution_authorisation(WP_REST_Request $request, array $packaged, array $approval) {
    $record = streetkingz_ai_writer_runtime_record(STREETKINGZ_AI_ACTIVE_EXECUTION_OPTION);
    if (!$record || !is_array($record['manifest'] ?? null) || !streetkingz_ai_writer_hash_valid($record['sha256'] ?? null)) return new WP_Error('streetkingz_ai_execution_locked', 'No validated runtime live-write authorisation is installed.', ['status' => 423]);
    $approval_record = ['manifest' => $approval, 'sha256' => $packaged['sha256']];
    $validated = streetkingz_ai_writer_validate_execution_manifest($record['manifest'], $approval_record);
    if (is_wp_error($validated)) return $validated;
    $canonical = streetkingz_ai_writer_canonical_manifest($record['manifest']);
    if (is_wp_error($canonical) || !hash_equals($record['sha256'], $canonical['sha256'])) return new WP_Error('streetkingz_ai_execution_store_invalid', 'Stored execution-contract fingerprint is invalid.', ['status' => 409]);
    if (!hash_equals($record['sha256'], $request->get_json_params()['execution_authorisation_sha256'] ?? '')) return new WP_Error('streetkingz_ai_execution_authorisation_hash_mismatch', 'Execution authorisation fingerprint does not match.', ['status' => 409]);
    return ['contract' => $record['manifest'], 'sha256' => $record['sha256']];
}

function streetkingz_ai_writer_execution_option_name(string $execution_id): string {
    return STREETKINGZ_AI_EXECUTION_OPTION_PREFIX . hash('sha256', $execution_id);
}

function streetkingz_ai_writer_execution_reservation_name(string $execution_id): string {
    return STREETKINGZ_AI_EXECUTION_RESERVATION_PREFIX . hash('sha256', $execution_id);
}

/*
 * One INSERT IGNORE is the atomic boundary. WordPress's options table has a unique
 * option_name index, so concurrent attempts for one hashed execution ID have one
 * winner. This avoids a check-then-write race and no cleanup path removes records.
 */
function streetkingz_ai_writer_claim_execution(array $execution_authorisation, string $approval_sha256) {
    global $wpdb;
    $contract = $execution_authorisation['contract'];
    $execution_id = $contract['one_time_execution_id'];
    $record = [
        'schema_version' => 1,
        'state' => 'claimed_executing',
        'execution_id_sha256' => hash('sha256', $execution_id),
        'contract_sha256' => $execution_authorisation['sha256'],
        'approval_sha256' => $approval_sha256,
        'product_id' => STREETKINGZ_AI_WRITE_PRODUCT_ID,
        'template_id' => STREETKINGZ_AI_WRITE_TEMPLATE_ID,
        'claimed_at' => gmdate('c'),
        'completed_at' => null,
    ];
    $option_name = streetkingz_ai_writer_execution_option_name($execution_id);
    $inserted = $wpdb->query($wpdb->prepare("INSERT IGNORE INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, %s)", $option_name, maybe_serialize($record), 'no'));
    if ($inserted !== 1) {
        return new WP_Error('streetkingz_ai_execution_replay_rejected', 'This one-time execution authorisation has already been claimed.', ['status' => 409]);
    }
    wp_cache_delete($option_name, 'options');
    wp_cache_delete('notoptions', 'options');
    return ['option_name' => $option_name, 'record' => $record];
}

function streetkingz_ai_writer_finish_execution(array $claim, string $state, string $result): bool {
    if (!in_array($state, ['succeeded', 'failed_after_claim'], true)) return false;
    $record = $claim['record'];
    $record['state'] = $state;
    $record['result'] = $result;
    $record['completed_at'] = gmdate('c');
    return update_option($claim['option_name'], $record, false);
}

function streetkingz_ai_writer_failed_after_claim(array $claim, string $result, WP_Error $error): WP_Error {
    if (!streetkingz_ai_writer_finish_execution($claim, 'failed_after_claim', $result)) {
        return new WP_Error('streetkingz_ai_execution_audit_update_failed', 'Execution failed after its one-time authorisation was claimed, and final audit-state persistence failed. The claim remains permanently unavailable.', ['status' => 500, 'original_error' => $error->get_error_code()]);
    }
    return $error;
}

function streetkingz_ai_writer_source(array $approval) {
    global $wpdb;
    $product = $wpdb->get_row($wpdb->prepare("SELECT ID, post_type, post_status, post_title, post_excerpt, post_content, post_name FROM {$wpdb->posts} WHERE ID = %d LIMIT 1", STREETKINGZ_AI_WRITE_PRODUCT_ID), ARRAY_A);
    if (!$product || $product['post_type'] !== 'product') return new WP_Error('streetkingz_ai_product_guard_failed', 'Approved product is unavailable.', ['status' => 409]);
    if (!function_exists('streetkingz_ai_resolve_product_template')) return new WP_Error('streetkingz_ai_reader_required', 'Authoritative reader is required for applicability verification.', ['status' => 409]);
    $template = streetkingz_ai_resolve_product_template(STREETKINGZ_AI_WRITE_PRODUCT_ID);
    if (is_wp_error($template) || ($template['id'] ?? null) !== STREETKINGZ_AI_WRITE_TEMPLATE_ID) return new WP_Error('streetkingz_ai_template_guard_failed', 'Approved template is not currently applicable.', ['status' => 409]);
    return ['product' => $product, 'template' => $template, 'approval' => $approval];
}

function streetkingz_ai_writer_find_elements(array &$items, string $id, array $path = []): array {
    $found = [];
    foreach ($items as $index => &$item) {
        $current = array_merge($path, [$index]);
        if (($item['id'] ?? null) === $id) $found[] = ['path' => $current, 'element' => &$item];
        if (!empty($item['elements']) && is_array($item['elements'])) $found = array_merge($found, streetkingz_ai_writer_find_elements($item['elements'], $id, array_merge($current, ['elements'])));
    }
    return $found;
}

function streetkingz_ai_writer_patch_element(array &$items, string $id, string $value): int {
    $patched = 0;
    foreach ($items as &$item) {
        if (($item['id'] ?? null) === $id) {
            if (!isset($item['settings']) || !is_array($item['settings']) || !array_key_exists('editor', $item['settings']) || !is_string($item['settings']['editor'])) return -1;
            $item['settings']['editor'] = $value;
            $patched++;
        }
        if (!empty($item['elements']) && is_array($item['elements'])) $patched += streetkingz_ai_writer_patch_element($item['elements'], $id, $value);
    }
    return $patched;
}

function streetkingz_ai_writer_prepare(array $source) {
    $approval = $source['approval'];
    $guards = $approval['current_state_guards'];
    $raw = $source['template']['raw_elementor_data'];
    if (!hash_equals($guards['post_title'], hash('sha256', $source['product']['post_title'])) || !hash_equals($guards['post_excerpt'], hash('sha256', $source['product']['post_excerpt'])) || !hash_equals($guards['template_elementor_data'], hash('sha256', $raw))) return new WP_Error('streetkingz_ai_current_state_stale', 'Authoritative current state has changed.', ['status' => 409]);
    $document = json_decode($raw, true);
    if (!is_array($document)) return new WP_Error('streetkingz_ai_elementor_invalid', 'Elementor document is invalid.', ['status' => 409]);
    $ids = [STREETKINGZ_AI_WRITE_DESCRIPTION_ID, STREETKINGZ_AI_WRITE_ACCORDION_ID, STREETKINGZ_AI_WRITE_COMPARISON_ID, STREETKINGZ_AI_WRITE_SAFETY_ID];
    $located = [];
    foreach ($ids as $id) {
        $matches = streetkingz_ai_writer_find_elements($document, $id);
        if (count($matches) !== 1) return new WP_Error('streetkingz_ai_elementor_target_ambiguous', 'Required Elementor target is missing or duplicated.', ['status' => 409, 'element_id' => $id]);
        $located[$id] = $matches[0];
    }
    if (!in_array(STREETKINGZ_AI_WRITE_ACCORDION_ID, array_map(static fn($part) => is_string($part) ? $part : null, $located[STREETKINGZ_AI_WRITE_COMPARISON_ID]['path']), true)) {
        /* Paths use indexes, so parent identity is proven by a bounded tree walk below. */
        $accordion_json = wp_json_encode($located[STREETKINGZ_AI_WRITE_ACCORDION_ID]['element']);
        if (substr_count($accordion_json, '"id":"' . STREETKINGZ_AI_WRITE_COMPARISON_ID . '"') !== 1) return new WP_Error('streetkingz_ai_comparison_parent_mismatch', 'Comparison is outside its approved accordion.', ['status' => 409]);
    }
    $values = [];
    foreach ($approval['approved_fields'] as $field) $values[$field['field_id']] = $field['exact_cms_value'];
    $widget_guards = ['description_widget' => STREETKINGZ_AI_WRITE_DESCRIPTION_ID, 'comparison_widget' => STREETKINGZ_AI_WRITE_COMPARISON_ID, 'safety_widget' => STREETKINGZ_AI_WRITE_SAFETY_ID];
    foreach ($widget_guards as $guard => $id) if (!hash_equals($guards[$guard], hash('sha256', $located[$id]['element']['settings']['editor'] ?? ''))) return new WP_Error('streetkingz_ai_widget_stale', 'A protected Elementor widget changed.', ['status' => 409, 'element_id' => $id]);
    $original = ['product' => $source['product'], 'template_raw' => $raw, 'document' => $document, 'widget_values' => array_map(static fn($item) => $item['element']['settings']['editor'] ?? null, $located)];
    if (streetkingz_ai_writer_patch_element($document, STREETKINGZ_AI_WRITE_DESCRIPTION_ID, $values['description']) !== 1 || streetkingz_ai_writer_patch_element($document, STREETKINGZ_AI_WRITE_COMPARISON_ID, $values['comparison']) !== 1) return new WP_Error('streetkingz_ai_elementor_patch_failed', 'Approved Elementor properties could not be patched exactly once.', ['status' => 409]);
    $fresh_snapshot = [
        'schema_version' => 1,
        'snapshot_type' => 'fresh_pre_write_rollback',
        'captured_at' => gmdate('c'),
        'product_id' => STREETKINGZ_AI_WRITE_PRODUCT_ID,
        'template_id' => STREETKINGZ_AI_WRITE_TEMPLATE_ID,
        'applicability' => $source['template']['applicability'],
        'authoritative_source' => ['product' => $source['product'], 'template' => $source['template']],
        'original' => $original,
        'hashes' => [
            'post_title' => hash('sha256', $source['product']['post_title']),
            'post_excerpt' => hash('sha256', $source['product']['post_excerpt']),
            'post_content' => hash('sha256', $source['product']['post_content']),
            'template_elementor_data' => hash('sha256', $raw),
            'description_widget' => hash('sha256', $original['widget_values'][STREETKINGZ_AI_WRITE_DESCRIPTION_ID]),
            'comparison_widget' => hash('sha256', $original['widget_values'][STREETKINGZ_AI_WRITE_COMPARISON_ID]),
            'safety_widget' => hash('sha256', $original['widget_values'][STREETKINGZ_AI_WRITE_SAFETY_ID]),
        ],
    ];
    $fresh_snapshot['authoritative_source_sha256'] = hash('sha256', wp_json_encode($fresh_snapshot['authoritative_source'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    return ['original' => $original, 'fresh_snapshot' => $fresh_snapshot, 'patched_document' => $document, 'targets' => $values, 'guards' => $guards];
}

function streetkingz_ai_writer_persist_snapshot(array $prepared) {
    $uploads = wp_upload_dir();
    if (!empty($uploads['error'])) return new WP_Error('streetkingz_ai_snapshot_unavailable', 'Rollback storage is unavailable.', ['status' => 500]);
    $directory = trailingslashit($uploads['basedir']) . 'streetkingz-ai-rollback';
    if (!wp_mkdir_p($directory)) return new WP_Error('streetkingz_ai_snapshot_unavailable', 'Rollback directory could not be created.', ['status' => 500]);
    $path = trailingslashit($directory) . 'product-70-' . gmdate('Ymd-His') . '-' . wp_generate_uuid4() . '.json';
    $handle = @fopen($path, 'x');
    if (!$handle) return new WP_Error('streetkingz_ai_snapshot_unavailable', 'Rollback snapshot could not be created.', ['status' => 500]);
    $encoded = wp_json_encode($prepared['fresh_snapshot'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $written = fwrite($handle, $encoded);
    fclose($handle);
    if ($written !== strlen($encoded)) return new WP_Error('streetkingz_ai_snapshot_incomplete', 'Rollback snapshot was incomplete.', ['status' => 500]);
    return ['path' => $path, 'sha256' => hash('sha256', $encoded)];
}

/*
 * Elementor's public Document::save() performs an edit_post capability check.
 * The dedicated writer role intentionally has no generic post-edit capability,
 * so grant that one meta capability only while this fixed template is saved by
 * the already-authorised, bounded writer path. Nothing is persisted on the role.
 */
function streetkingz_ai_writer_map_template_save_capability(array $caps, string $cap, int $user_id, array $args): array {
    if (
        !empty($GLOBALS['streetkingz_ai_writer_template_save_scope']) &&
        $cap === 'edit_post' &&
        (int) ($args[0] ?? 0) === STREETKINGZ_AI_WRITE_TEMPLATE_ID &&
        $user_id === get_current_user_id() &&
        current_user_can(STREETKINGZ_AI_WRITE_CAPABILITY)
    ) return ['read'];
    return $caps;
}

function streetkingz_ai_writer_save_elementor(array $elements) {
    if (!class_exists('\\Elementor\\Plugin')) return new WP_Error('streetkingz_ai_elementor_api_unavailable', 'Elementor document API is unavailable.', ['status' => 500]);
    $document = \Elementor\Plugin::$instance->documents->get(STREETKINGZ_AI_WRITE_TEMPLATE_ID);
    if (!$document) return new WP_Error('streetkingz_ai_elementor_document_unavailable', 'Elementor document is unavailable.', ['status' => 500]);
    if (!current_user_can(STREETKINGZ_AI_WRITE_CAPABILITY)) return new WP_Error('streetkingz_ai_elementor_save_forbidden', 'The bounded writer capability is required for the Elementor save.', ['status' => 403]);
    $GLOBALS['streetkingz_ai_writer_template_save_scope'] = true;
    add_filter('map_meta_cap', 'streetkingz_ai_writer_map_template_save_capability', 10, 4);
    try {
        /* Document::save expects decoded element data under the elements key. */
        $result = $document->save(['elements' => $elements]);
    } catch (Throwable $error) {
        $result = new WP_Error('streetkingz_ai_elementor_save_exception', 'Elementor document save raised an exception.', ['status' => 500, 'exception_class' => get_class($error)]);
    } finally {
        remove_filter('map_meta_cap', 'streetkingz_ai_writer_map_template_save_capability', 10);
        unset($GLOBALS['streetkingz_ai_writer_template_save_scope']);
    }
    return $result;
}

function streetkingz_ai_writer_clear_persisted_state_caches(): void {
    clean_post_cache(STREETKINGZ_AI_WRITE_PRODUCT_ID);
    clean_post_cache(STREETKINGZ_AI_WRITE_TEMPLATE_ID);
    wp_cache_delete(STREETKINGZ_AI_WRITE_TEMPLATE_ID, 'post_meta');
}

function streetkingz_ai_writer_verify_state(array $expected, bool $targets = false): bool {
    streetkingz_ai_writer_clear_persisted_state_caches();
    $approval = $expected['approval'];
    $source = streetkingz_ai_writer_source($approval);
    if (is_wp_error($source)) return false;
    $title = $targets ? $expected['targets']['post_title'] : $expected['original']['product']['post_title'];
    $excerpt = $targets ? $expected['targets']['post_excerpt'] : $expected['original']['product']['post_excerpt'];
    if ($source['product']['post_title'] !== $title || $source['product']['post_excerpt'] !== $excerpt || $source['product']['post_content'] !== $expected['original']['product']['post_content'] || $source['product']['post_name'] !== $expected['original']['product']['post_name'] || $source['product']['post_status'] !== $expected['original']['product']['post_status']) return false;
    $document = json_decode($source['template']['raw_elementor_data'], true);
    if (!is_array($document)) return false;
    $expected_document = $targets ? $expected['patched_document'] : $expected['original']['document'];
    $actual_semantic = wp_json_encode($document, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $expected_semantic = wp_json_encode($expected_document, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($actual_semantic) || !is_string($expected_semantic) || !hash_equals(hash('sha256', $expected_semantic), hash('sha256', $actual_semantic))) return false;
    foreach ([STREETKINGZ_AI_WRITE_DESCRIPTION_ID, STREETKINGZ_AI_WRITE_COMPARISON_ID, STREETKINGZ_AI_WRITE_SAFETY_ID] as $id) {
        $matches = streetkingz_ai_writer_find_elements($document, $id);
        if (count($matches) !== 1) return false;
        $actual = $matches[0]['element']['settings']['editor'] ?? null;
        $wanted = $id === STREETKINGZ_AI_WRITE_DESCRIPTION_ID && $targets ? $expected['targets']['description'] : ($id === STREETKINGZ_AI_WRITE_COMPARISON_ID && $targets ? $expected['targets']['comparison'] : $expected['original']['widget_values'][$id]);
        if ($actual !== $wanted) return false;
    }
    return true;
}

function streetkingz_ai_writer_rollback(array $prepared): bool {
    $product = wp_update_post(['ID' => STREETKINGZ_AI_WRITE_PRODUCT_ID, 'post_title' => $prepared['original']['product']['post_title'], 'post_excerpt' => $prepared['original']['product']['post_excerpt']], true);
    if (is_wp_error($product)) return false;
    streetkingz_ai_writer_clear_persisted_state_caches();
    $persisted = streetkingz_ai_writer_source($prepared['approval']);
    if (is_wp_error($persisted)) return false;
    $persisted_document = json_decode($persisted['template']['raw_elementor_data'], true);
    if (!is_array($persisted_document)) return false;
    $persisted_semantic = wp_json_encode($persisted_document, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $original_semantic = wp_json_encode($prepared['original']['document'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($persisted_semantic) || !is_string($original_semantic)) return false;
    if (!hash_equals(hash('sha256', $original_semantic), hash('sha256', $persisted_semantic))) {
        $elementor = streetkingz_ai_writer_save_elementor($prepared['original']['document']);
        if (is_wp_error($elementor) || $elementor === false) return false;
    }
    /* Always verify freshly persisted state, including when the failed save never changed the template. */
    return streetkingz_ai_writer_verify_state($prepared, false);
}

function streetkingz_ai_guarded_writer_request(WP_REST_Request $request) {
    $packaged = streetkingz_ai_writer_manifest();
    if (is_wp_error($packaged)) return $packaged;
    $approval = streetkingz_ai_writer_validate_request($request, $packaged);
    if (is_wp_error($approval)) return $approval;
    if ($request['mode'] === 'execute') {
        $execution_authorisation = streetkingz_ai_writer_execution_authorisation($request, $packaged, $approval);
        if (is_wp_error($execution_authorisation)) return $execution_authorisation;
    }
    $source = streetkingz_ai_writer_source($approval);
    if (is_wp_error($source)) return $source;
    $prepared = streetkingz_ai_writer_prepare($source);
    if (is_wp_error($prepared)) return $prepared;
    $prepared['approval'] = $approval;
    if ($request['mode'] === 'dry-run') return rest_ensure_response(['status' => 'dry_run_pass', 'product_id' => 70, 'template_id' => 2003, 'approval_artifact_sha256' => $packaged['sha256'], 'mutations' => ['post_title', 'post_excerpt', 'c80e718.settings.editor', '40869c27.settings.editor'], 'writes_performed' => 0]);
    $snapshot = streetkingz_ai_writer_persist_snapshot($prepared);
    if (is_wp_error($snapshot)) return $snapshot;
    /* Revalidate all bindings and authoritative guards at the last boundary before claiming. */
    $approval = streetkingz_ai_writer_validate_request($request, $packaged);
    if (is_wp_error($approval)) return $approval;
    $execution_authorisation = streetkingz_ai_writer_execution_authorisation($request, $packaged, $approval);
    if (is_wp_error($execution_authorisation)) return $execution_authorisation;
    $fresh_source = streetkingz_ai_writer_source($approval);
    if (is_wp_error($fresh_source)) return $fresh_source;
    $fresh_prepared = streetkingz_ai_writer_prepare($fresh_source);
    if (is_wp_error($fresh_prepared)) return $fresh_prepared;
    if (($fresh_prepared['fresh_snapshot']['hashes'] ?? null) !== ($prepared['fresh_snapshot']['hashes'] ?? null)) return new WP_Error('streetkingz_ai_preclaim_state_changed', 'Authoritative state changed after rollback capture.', ['status' => 409]);
    $claim = streetkingz_ai_writer_claim_execution($execution_authorisation, $packaged['sha256']);
    if (is_wp_error($claim)) return $claim;
    $product_result = wp_update_post(['ID' => STREETKINGZ_AI_WRITE_PRODUCT_ID, 'post_title' => $prepared['targets']['post_title'], 'post_excerpt' => $prepared['targets']['post_excerpt']], true);
    if (is_wp_error($product_result)) return streetkingz_ai_writer_failed_after_claim($claim, 'product_write_failed', $product_result);
    $elementor_result = streetkingz_ai_writer_save_elementor($prepared['patched_document']);
    if (is_wp_error($elementor_result) || $elementor_result === false) {
        $elementor_failure_code = is_wp_error($elementor_result) ? $elementor_result->get_error_code() : 'streetkingz_ai_elementor_save_returned_false';
        if (!streetkingz_ai_writer_rollback($prepared)) return streetkingz_ai_writer_failed_after_claim($claim, 'elementor_write_failed_rollback_unverified', new WP_Error('streetkingz_ai_rollback_verification_failed', 'Elementor write failed and rollback could not be verified.', ['status' => 500, 'elementor_failure_code' => $elementor_failure_code]));
        return streetkingz_ai_writer_failed_after_claim($claim, 'elementor_write_failed_rolled_back', new WP_Error('streetkingz_ai_write_rolled_back', 'Elementor write failed; compensating rollback completed and was verified.', ['status' => 500, 'elementor_failure_code' => $elementor_failure_code]));
    }
    if (!streetkingz_ai_writer_verify_state($prepared, true)) {
        if (!streetkingz_ai_writer_rollback($prepared)) return streetkingz_ai_writer_failed_after_claim($claim, 'post_write_verification_failed_rollback_unverified', new WP_Error('streetkingz_ai_post_write_and_rollback_verification_failed', 'Post-write verification failed and rollback could not be verified.', ['status' => 500]));
        return streetkingz_ai_writer_failed_after_claim($claim, 'post_write_verification_failed_rolled_back', new WP_Error('streetkingz_ai_post_write_verification_failed_rolled_back', 'Post-write verification failed; rollback completed and was verified.', ['status' => 500]));
    }
    if (!streetkingz_ai_writer_finish_execution($claim, 'succeeded', 'approved_mutations_verified')) return new WP_Error('streetkingz_ai_execution_audit_update_failed', 'Approved mutations were verified, but the permanent execution audit state could not be marked succeeded. The claim remains unavailable.', ['status' => 500]);
    return rest_ensure_response(['status' => 'write_complete_requires_post_write_verification', 'snapshot_sha256' => $snapshot['sha256']]);
}
