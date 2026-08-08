<?php
/**
 * Plugin Name: Street Kingz AI Guarded Writer
 * Description: Approval-bound writer for one reviewed product-copy change set. Inactive unless a separate write capability is deliberately assigned.
 * Version: 0.1.2
 */

defined('ABSPATH') || exit;

const STREETKINGZ_AI_WRITE_CAPABILITY = 'streetkingz_ai_write_approved_product_copy';
const STREETKINGZ_AI_WRITE_PRODUCT_ID = 70;
const STREETKINGZ_AI_WRITE_TEMPLATE_ID = 2003;
const STREETKINGZ_AI_WRITE_DESCRIPTION_ID = 'c80e718';
const STREETKINGZ_AI_WRITE_ACCORDION_ID = '4691e088';
const STREETKINGZ_AI_WRITE_COMPARISON_ID = '40869c27';
const STREETKINGZ_AI_WRITE_SAFETY_ID = '43d7d6f0';

/* Intentionally no activation hook, role creation, user lookup, or capability assignment. */
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
});

function streetkingz_ai_writer_manifest() {
    $path = __DIR__ . '/human-implementation-approval.json';
    if (!is_readable($path)) return new WP_Error('streetkingz_ai_approval_missing', 'Packaged human approval is unavailable.', ['status' => 500]);
    $raw = file_get_contents($path);
    $manifest = json_decode($raw, true);
    if (!is_array($manifest)) return new WP_Error('streetkingz_ai_approval_invalid', 'Packaged human approval is invalid.', ['status' => 500]);
    return ['raw' => $raw, 'sha256' => hash('sha256', $raw), 'manifest' => $manifest];
}

function streetkingz_ai_writer_validate_request(WP_REST_Request $request, array $packaged) {
    $body = $request->get_json_params();
    if (!is_array($body) || array_keys($body) !== ['approval_artifact_sha256']) return new WP_Error('streetkingz_ai_write_payload_invalid', 'Only the packaged approval fingerprint is accepted.', ['status' => 400]);
    if (!is_string($body['approval_artifact_sha256']) || !hash_equals($packaged['sha256'], $body['approval_artifact_sha256'])) return new WP_Error('streetkingz_ai_approval_fingerprint_mismatch', 'Approval fingerprint does not match.', ['status' => 409]);
    $approval = $packaged['manifest'];
    $required = ['post_title', 'description', 'comparison', 'post_excerpt'];
    if (($approval['product_id'] ?? null) !== STREETKINGZ_AI_WRITE_PRODUCT_ID || ($approval['template_id'] ?? null) !== STREETKINGZ_AI_WRITE_TEMPLATE_ID || ($approval['status'] ?? null) !== 'approved' || ($approval['approval_source'] ?? null) !== 'explicit_user_approval') return new WP_Error('streetkingz_ai_approval_scope_invalid', 'Approval identity or state is invalid.', ['status' => 409]);
    foreach (($approval['authorisation'] ?? []) as $allowed) if ($allowed !== false) return new WP_Error('streetkingz_ai_approval_broad', 'Approval includes a forbidden authorisation.', ['status' => 409]);
    $fields = $approval['approved_fields'] ?? [];
    if (count($fields) !== 4 || array_values(array_column($fields, 'field_id')) !== $required) return new WP_Error('streetkingz_ai_approval_targets_invalid', 'Approval targets are not the exact allowlist.', ['status' => 409]);
    foreach ($fields as $field) if (!hash_equals($field['approved_target_sha256'] ?? '', hash('sha256', $field['exact_cms_value'] ?? ''))) return new WP_Error('streetkingz_ai_target_hash_mismatch', 'An approved target value has changed.', ['status' => 409]);
    return $approval;
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

function streetkingz_ai_writer_save_elementor(array $elements) {
    if (!class_exists('\\Elementor\\Plugin')) return new WP_Error('streetkingz_ai_elementor_api_unavailable', 'Elementor document API is unavailable.', ['status' => 500]);
    $document = \Elementor\Plugin::$instance->documents->get(STREETKINGZ_AI_WRITE_TEMPLATE_ID);
    if (!$document) return new WP_Error('streetkingz_ai_elementor_document_unavailable', 'Elementor document is unavailable.', ['status' => 500]);
    return $document->save(['elements' => $elements]);
}

function streetkingz_ai_writer_verify_state(array $expected, bool $targets = false): bool {
    $approval = $expected['approval'];
    $source = streetkingz_ai_writer_source($approval);
    if (is_wp_error($source)) return false;
    $title = $targets ? $expected['targets']['post_title'] : $expected['original']['product']['post_title'];
    $excerpt = $targets ? $expected['targets']['post_excerpt'] : $expected['original']['product']['post_excerpt'];
    if ($source['product']['post_title'] !== $title || $source['product']['post_excerpt'] !== $excerpt || $source['product']['post_content'] !== $expected['original']['product']['post_content'] || $source['product']['post_name'] !== $expected['original']['product']['post_name'] || $source['product']['post_status'] !== $expected['original']['product']['post_status']) return false;
    $document = json_decode($source['template']['raw_elementor_data'], true);
    if (!is_array($document)) return false;
    foreach ([STREETKINGZ_AI_WRITE_DESCRIPTION_ID, STREETKINGZ_AI_WRITE_COMPARISON_ID, STREETKINGZ_AI_WRITE_SAFETY_ID] as $id) {
        $matches = streetkingz_ai_writer_find_elements($document, $id);
        if (count($matches) !== 1) return false;
        $actual = $matches[0]['element']['settings']['editor'] ?? null;
        $wanted = $id === STREETKINGZ_AI_WRITE_DESCRIPTION_ID && $targets ? $expected['targets']['description'] : ($id === STREETKINGZ_AI_WRITE_COMPARISON_ID && $targets ? $expected['targets']['comparison'] : $expected['original']['widget_values'][$id]);
        if ($actual !== $wanted) return false;
    }
    return $targets || hash_equals(hash('sha256', $expected['original']['template_raw']), hash('sha256', $source['template']['raw_elementor_data']));
}

function streetkingz_ai_writer_rollback(array $prepared): bool {
    $product = wp_update_post(['ID' => STREETKINGZ_AI_WRITE_PRODUCT_ID, 'post_title' => $prepared['original']['product']['post_title'], 'post_excerpt' => $prepared['original']['product']['post_excerpt']], true);
    $elementor = streetkingz_ai_writer_save_elementor($prepared['original']['document']);
    return !is_wp_error($product) && !is_wp_error($elementor) && $elementor !== false && streetkingz_ai_writer_verify_state($prepared, false);
}

function streetkingz_ai_guarded_writer_request(WP_REST_Request $request) {
    $packaged = streetkingz_ai_writer_manifest();
    if (is_wp_error($packaged)) return $packaged;
    $approval = streetkingz_ai_writer_validate_request($request, $packaged);
    if (is_wp_error($approval)) return $approval;
    $source = streetkingz_ai_writer_source($approval);
    if (is_wp_error($source)) return $source;
    $prepared = streetkingz_ai_writer_prepare($source);
    if (is_wp_error($prepared)) return $prepared;
    $prepared['approval'] = $approval;
    if ($request['mode'] === 'dry-run') return rest_ensure_response(['status' => 'dry_run_pass', 'product_id' => 70, 'template_id' => 2003, 'approval_artifact_sha256' => $packaged['sha256'], 'mutations' => ['post_title', 'post_excerpt', 'c80e718.settings.editor', '40869c27.settings.editor'], 'writes_performed' => 0]);
    $snapshot = streetkingz_ai_writer_persist_snapshot($prepared);
    if (is_wp_error($snapshot)) return $snapshot;
    $product_result = wp_update_post(['ID' => STREETKINGZ_AI_WRITE_PRODUCT_ID, 'post_title' => $prepared['targets']['post_title'], 'post_excerpt' => $prepared['targets']['post_excerpt']], true);
    if (is_wp_error($product_result)) return $product_result;
    $elementor_result = streetkingz_ai_writer_save_elementor($prepared['patched_document']);
    if (is_wp_error($elementor_result) || $elementor_result === false) {
        if (!streetkingz_ai_writer_rollback($prepared)) return new WP_Error('streetkingz_ai_rollback_verification_failed', 'Elementor write failed and rollback could not be verified.', ['status' => 500]);
        return new WP_Error('streetkingz_ai_write_rolled_back', 'Elementor write failed; compensating rollback completed and was verified.', ['status' => 500]);
    }
    if (!streetkingz_ai_writer_verify_state($prepared, true)) {
        if (!streetkingz_ai_writer_rollback($prepared)) return new WP_Error('streetkingz_ai_post_write_and_rollback_verification_failed', 'Post-write verification failed and rollback could not be verified.', ['status' => 500]);
        return new WP_Error('streetkingz_ai_post_write_verification_failed_rolled_back', 'Post-write verification failed; rollback completed and was verified.', ['status' => 500]);
    }
    return rest_ensure_response(['status' => 'write_complete_requires_post_write_verification', 'snapshot_sha256' => $snapshot['sha256']]);
}
