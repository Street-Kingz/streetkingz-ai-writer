<?php
/**
 * Plugin Name: Street Kingz AI Authoritative Reader
 * Description: Narrow, authenticated, read-only product source endpoint for the Street Kingz AI Writer.
 * Version: 1.1.0
 */

defined('ABSPATH') || exit;

const STREETKINGZ_AI_READ_CAPABILITY = 'streetkingz_ai_read_product_source';
const STREETKINGZ_AI_PRODUCT_TEMPLATE_ID = 2003;

register_activation_hook(__FILE__, static function (): void {
    if (!get_role('streetkingz_ai_reader')) {
        add_role('streetkingz_ai_reader', 'Street Kingz AI Reader', [
            'read' => true,
            STREETKINGZ_AI_READ_CAPABILITY => true,
        ]);
    }
});

add_action('rest_api_init', static function (): void {
    register_rest_route('streetkingz-ai/v1', '/products/(?P<id>\d+)/authoritative', [
        'methods' => WP_REST_Server::READABLE,
        'permission_callback' => static function () {
            if (!is_user_logged_in() || !current_user_can(STREETKINGZ_AI_READ_CAPABILITY)) {
                return new WP_Error('streetkingz_ai_forbidden', 'This account cannot read authoritative product source.', ['status' => 403]);
            }
            return true;
        },
        'callback' => 'streetkingz_ai_read_authoritative_product',
        'args' => [
            'id' => ['required' => true, 'type' => 'integer', 'minimum' => 1],
        ],
    ]);
});

function streetkingz_ai_raw_meta_value(int $post_id, string $key): array {
    global $wpdb;
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT meta_id, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = %s ORDER BY meta_id ASC",
        $post_id,
        $key
    ), ARRAY_A);
    if (!$rows) {
        return ['present' => false, 'row_count' => 0, 'raw_stored_value' => null];
    }
    return ['present' => true, 'row_count' => count($rows), 'raw_stored_value' => $rows[0]['meta_value']];
}

function streetkingz_ai_read_authoritative_product(WP_REST_Request $request) {
    global $wpdb;
    $post_id = (int) $request['id'];
    $post = $wpdb->get_row($wpdb->prepare(
        "SELECT ID, post_type, post_status, post_title, post_excerpt, post_content, post_name FROM {$wpdb->posts} WHERE ID = %d LIMIT 1",
        $post_id
    ), ARRAY_A);
    if (!$post) {
        return new WP_Error('streetkingz_ai_product_not_found', 'Product not found.', ['status' => 404]);
    }
    if ($post['post_type'] !== 'product') {
        return new WP_Error('streetkingz_ai_not_product', 'The requested post is not a product.', ['status' => 400]);
    }

    $template = streetkingz_ai_resolve_product_template($post_id);
    if (is_wp_error($template)) {
        return $template;
    }

    return rest_ensure_response([
        'schema_version' => 2,
        'product' => [
            'id' => (int) $post['ID'],
            'post_type' => $post['post_type'],
            'post_status' => $post['post_status'],
            'post_title' => $post['post_title'],
            'post_excerpt' => $post['post_excerpt'],
            'post_content' => $post['post_content'],
            'post_name' => $post['post_name'],
            'permalink' => get_permalink($post_id),
        ],
        'elementor_template' => $template,
    ]);
}

function streetkingz_ai_condition_applies_to_product($condition_value, int $product_id): bool {
    $conditions = maybe_unserialize($condition_value);
    if (!is_array($conditions)) {
        return false;
    }
    foreach ($conditions as $condition) {
        if (!is_string($condition)) {
            continue;
        }
        if ($condition === 'include/woocommerce/product' || $condition === 'include/woocommerce/products') {
            return true;
        }
        if ($condition === 'include/woocommerce/product/' . $product_id || $condition === 'include/singular/product/' . $product_id) {
            return true;
        }
    }
    return false;
}

function streetkingz_ai_resolve_product_template(int $product_id) {
    global $wpdb;
    $template_id = STREETKINGZ_AI_PRODUCT_TEMPLATE_ID;
    $template = $wpdb->get_row($wpdb->prepare(
        "SELECT ID, post_type, post_status, post_title FROM {$wpdb->posts} WHERE ID = %d LIMIT 1",
        $template_id
    ), ARRAY_A);
    if (!$template || $template['post_type'] !== 'elementor_library') {
        return new WP_Error('streetkingz_ai_template_not_found', 'Associated Elementor product template not found.', ['status' => 409]);
    }
    $template_type = streetkingz_ai_raw_meta_value($template_id, '_elementor_template_type');
    $conditions = streetkingz_ai_raw_meta_value($template_id, '_elementor_conditions');
    if (!$template_type['present'] || !in_array($template_type['raw_stored_value'], ['product', 'single-product'], true)) {
        return new WP_Error('streetkingz_ai_template_type_mismatch', 'Associated template is not an Elementor product template.', ['status' => 409]);
    }
    if (!$conditions['present'] || !streetkingz_ai_condition_applies_to_product($conditions['raw_stored_value'], $product_id)) {
        return new WP_Error('streetkingz_ai_template_not_applicable', 'Configured Elementor template is not applicable to the requested product.', ['status' => 409]);
    }
    $elementor = streetkingz_ai_raw_meta_value($template_id, '_elementor_data');
    if (!$elementor['present'] || $elementor['row_count'] !== 1) {
        return new WP_Error('streetkingz_ai_template_data_unavailable', 'Associated Elementor template data is unavailable or ambiguous.', ['status' => 409]);
    }
    $edit_mode = streetkingz_ai_raw_meta_value($template_id, '_elementor_edit_mode');
    $version = streetkingz_ai_raw_meta_value($template_id, '_elementor_version');
    return [
        'id' => (int) $template['ID'],
        'post_type' => $template['post_type'],
        'post_status' => $template['post_status'],
        'post_title' => $template['post_title'],
        'template_type' => $template_type['raw_stored_value'],
        'applicability' => [
            'verified' => true,
            'method' => 'fixed_allowlisted_template_plus_elementor_theme_builder_conditions',
            'raw_conditions' => $conditions['raw_stored_value'],
        ],
        'raw_elementor_data' => $elementor['raw_stored_value'],
        'parsed_elementor_data' => json_decode($elementor['raw_stored_value'], true),
        'edit_mode' => $edit_mode['raw_stored_value'],
        'elementor_version' => $version['raw_stored_value'],
    ];
}
