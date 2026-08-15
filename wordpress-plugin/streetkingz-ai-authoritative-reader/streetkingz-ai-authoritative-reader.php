<?php
/**
 * Plugin Name: Street Kingz AI Authoritative Reader
 * Description: Narrow, authenticated, read-only product source endpoint for the Street Kingz AI Writer.
 * Version: 1.2.0
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

function streetkingz_ai_is_authoritative_rest_request(WP_REST_Request $request): bool {
    return preg_match('#^/streetkingz-ai/v1/products/[0-9]+/authoritative$#D', $request->get_route()) === 1;
}

/*
 * The authoritative response is capability-protected and must never enter a
 * full-page cache. LiteSpeed can otherwise cache an authenticated REST 200 and
 * replay it before WordPress executes the permission callback. Mark only this
 * fixed Reader route as non-cacheable at the earliest REST dispatch boundary.
 */
function streetkingz_ai_disable_authoritative_rest_cache(): void {
    if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
    if (!defined('LSCACHE_NO_CACHE')) define('LSCACHE_NO_CACHE', true);
    do_action('litespeed_control_set_nocache', 'Street Kingz authoritative Reader response');
}

add_filter('rest_pre_dispatch', static function ($result, WP_REST_Server $server, WP_REST_Request $request) {
    if (streetkingz_ai_is_authoritative_rest_request($request)) streetkingz_ai_disable_authoritative_rest_cache();
    return $result;
}, 1, 3);

add_filter('rest_post_dispatch', static function ($response, WP_REST_Server $server, WP_REST_Request $request) {
    if (streetkingz_ai_is_authoritative_rest_request($request) && $response instanceof WP_HTTP_Response) {
        $response->header('Cache-Control', 'no-cache, must-revalidate, max-age=0, no-store, private');
        $response->header('X-LiteSpeed-Cache-Control', 'no-cache');
    }
    return $response;
}, 999, 3);

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

    $woocommerce = streetkingz_ai_read_woocommerce_product($post_id);
    if (is_wp_error($woocommerce)) {
        return $woocommerce;
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
        'woocommerce' => $woocommerce,
        'elementor_template' => $template,
    ]);
}

function streetkingz_ai_bounded_ids(array $values, int $limit = 100): array {
    $ids = array_values(array_unique(array_filter(array_map('absint', $values), static function (int $id): bool {
        return $id > 0;
    })));
    return array_slice($ids, 0, $limit);
}

function streetkingz_ai_inventory(WC_Product $product): array {
    $manage_stock = $product->get_manage_stock() === true;
    return [
        'stock_status' => $product->get_stock_status(),
        'manage_stock' => $manage_stock,
        'stock_quantity' => $manage_stock ? $product->get_stock_quantity() : null,
    ];
}

function streetkingz_ai_product_categories(WC_Product $product): array {
    $categories = [];
    foreach (streetkingz_ai_bounded_ids($product->get_category_ids(), 100) as $term_id) {
        $term = get_term($term_id, 'product_cat');
        if (!$term || is_wp_error($term)) continue;
        $categories[] = [
            'id' => (int) $term->term_id,
            'name' => (string) $term->name,
            'slug' => (string) $term->slug,
        ];
    }
    return $categories;
}

function streetkingz_ai_attribute_options(WC_Product_Attribute $attribute): array {
    $options = [];
    foreach (array_slice($attribute->get_options(), 0, 100) as $option) {
        if ($attribute->is_taxonomy()) {
            $term = get_term((int) $option, $attribute->get_name());
            if (!$term || is_wp_error($term)) continue;
            $options[] = ['id' => (int) $term->term_id, 'name' => (string) $term->name, 'slug' => (string) $term->slug];
        } else {
            $options[] = (string) $option;
        }
    }
    return $options;
}

function streetkingz_ai_product_attributes(WC_Product $product): array {
    $attributes = [];
    foreach (array_slice($product->get_attributes(), 0, 100) as $attribute) {
        if (!$attribute instanceof WC_Product_Attribute) continue;
        $attributes[] = [
            'id' => (int) $attribute->get_id(),
            'name' => (string) $attribute->get_name(),
            'slug' => (string) $attribute->get_name(),
            'options' => streetkingz_ai_attribute_options($attribute),
            'visible' => $attribute->get_visible() === true,
            'variation' => $attribute->get_variation() === true,
        ];
    }
    return $attributes;
}

function streetkingz_ai_variation_record(WC_Product_Variation $variation): array {
    return [
        'id' => $variation->get_id(),
        'sku' => $variation->get_sku(),
        'pricing' => [
            'regular_price' => $variation->get_regular_price(),
            'sale_price' => $variation->get_sale_price(),
            'current_price' => $variation->get_price(),
        ],
        'inventory' => streetkingz_ai_inventory($variation),
        'attributes' => $variation->get_variation_attributes(),
        'image_id' => $variation->get_image_id() ?: null,
    ];
}

function streetkingz_ai_product_variations(WC_Product $product): array {
    if (!$product->is_type('variable')) {
        return ['variation_ids' => [], 'variations' => [], 'truncated' => false];
    }
    $all_ids = streetkingz_ai_bounded_ids($product->get_children(), 101);
    $truncated = count($all_ids) > 100;
    $variation_ids = array_slice($all_ids, 0, 100);
    $variations = [];
    foreach ($variation_ids as $variation_id) {
        $variation = wc_get_product($variation_id);
        if (!$variation instanceof WC_Product_Variation) continue;
        $variations[] = streetkingz_ai_variation_record($variation);
    }
    return ['variation_ids' => $variation_ids, 'variations' => $variations, 'truncated' => $truncated];
}

function streetkingz_ai_read_woocommerce_product(int $post_id) {
    if (!function_exists('wc_get_product')) {
        return new WP_Error('streetkingz_ai_woocommerce_unavailable', 'WooCommerce product data is unavailable.', ['status' => 503]);
    }
    $product = wc_get_product($post_id);
    if (!$product instanceof WC_Product) {
        return new WP_Error('streetkingz_ai_not_woocommerce_product', 'The requested post is not a WooCommerce product.', ['status' => 400]);
    }
    $variation_data = streetkingz_ai_product_variations($product);
    return [
        'product_id' => $product->get_id(),
        'sku' => $product->get_sku(),
        'product_type' => $product->get_type(),
        'pricing' => [
            'regular_price' => $product->get_regular_price(),
            'sale_price' => $product->get_sale_price(),
            'current_price' => $product->get_price(),
            'currency' => function_exists('get_woocommerce_currency') ? get_woocommerce_currency() : null,
        ],
        'inventory' => streetkingz_ai_inventory($product),
        'categories' => streetkingz_ai_product_categories($product),
        'attributes' => streetkingz_ai_product_attributes($product),
        'variation_ids' => $variation_data['variation_ids'],
        'variations' => $variation_data['variations'],
        'variations_truncated' => $variation_data['truncated'],
        'upsell_ids' => streetkingz_ai_bounded_ids($product->get_upsell_ids()),
        'cross_sell_ids' => streetkingz_ai_bounded_ids($product->get_cross_sell_ids()),
        'image_id' => $product->get_image_id() ?: null,
        'gallery_image_ids' => streetkingz_ai_bounded_ids($product->get_gallery_image_ids()),
    ];
}

function streetkingz_ai_condition_tokens($value, int $depth = 0): array {
    if ($depth > 4) {
        return ['tokens' => [], 'format' => 'unsupported_depth', 'valid' => false];
    }
    if (is_array($value)) {
        $tokens = [];
        foreach ($value as $item) {
            $parsed = streetkingz_ai_condition_tokens($item, $depth + 1);
            if (!$parsed['valid']) {
                return $parsed;
            }
            $tokens = array_merge($tokens, $parsed['tokens']);
        }
        return ['tokens' => $tokens, 'format' => $depth === 0 ? 'array' : 'nested_array', 'valid' => true];
    }
    if (!is_string($value)) {
        return ['tokens' => [], 'format' => gettype($value), 'valid' => false];
    }
    $trimmed = trim($value);
    if ($trimmed === '') {
        return ['tokens' => [], 'format' => 'empty', 'valid' => false];
    }
    $unserialized = maybe_unserialize($trimmed);
    if ($unserialized !== $trimmed) {
        $parsed = streetkingz_ai_condition_tokens($unserialized, $depth + 1);
        $parsed['format'] = 'php_serialized_' . $parsed['format'];
        return $parsed;
    }
    $json = json_decode($trimmed, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($json)) {
        $parsed = streetkingz_ai_condition_tokens($json, $depth + 1);
        $parsed['format'] = 'json_' . $parsed['format'];
        return $parsed;
    }
    return ['tokens' => [rtrim($trimmed, '/')], 'format' => 'condition_string', 'valid' => true];
}

function streetkingz_ai_condition_analysis($condition_value, int $product_id): array {
    $parsed = streetkingz_ai_condition_tokens($condition_value);
    $rules = array_values(array_unique($parsed['tokens']));
    $include_all = ['include/woocommerce/product', 'include/woocommerce/products', 'include/singular/product'];
    $exclude_all = ['exclude/woocommerce/product', 'exclude/woocommerce/products', 'exclude/singular/product'];
    $included = false;
    $excluded = false;
    $unknown = [];
    $rule_diagnostics = [];
    foreach ($rules as $rule) {
        $effect = null;
        $matched = false;
        $diagnostic = ['rule' => $rule, 'requested_product_id' => $product_id];
        if (in_array($rule, $include_all, true)) {
            $effect = 'include';
            $matched = true;
            $diagnostic['rule_type'] = 'all_products';
        } elseif (in_array($rule, $exclude_all, true)) {
            $effect = 'exclude';
            $matched = true;
            $diagnostic['rule_type'] = 'all_products';
        } elseif (preg_match('#^(include|exclude)/(?:woocommerce/product|singular/product)/(\d+)$#', $rule, $match)) {
            $effect = $match[1];
            $target_product_id = filter_var($match[2], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            $matched = $target_product_id !== false && $target_product_id === $product_id;
            $diagnostic += ['rule_type' => 'exact_product', 'target_product_id' => $target_product_id, 'membership' => $matched];
        } elseif (preg_match('#^(include|exclude)/product/in_product_tag/(\d+)$#', $rule, $match)) {
            $effect = $match[1];
            $term_id = filter_var($match[2], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            $term = $term_id === false ? false : term_exists($term_id, 'product_tag');
            $term_exists_in_taxonomy = !is_wp_error($term) && $term !== 0 && $term !== null;
            $membership = $term_exists_in_taxonomy && has_term((int) $term_id, 'product_tag', $product_id);
            $matched = $membership === true;
            $diagnostic += [
                'rule_type' => 'product_tag_membership',
                'taxonomy' => 'product_tag',
                'term_id' => $term_id,
                'term_exists' => $term_exists_in_taxonomy,
                'membership' => $matched,
            ];
        } else {
            $unknown[] = $rule;
            $diagnostic += ['rule_type' => 'unknown', 'matched' => false];
        }
        if ($effect === 'include' && $matched) {
            $included = true;
        }
        if ($effect === 'exclude' && $matched) {
            $excluded = true;
        }
        $diagnostic += ['effect' => $effect, 'matched' => $matched];
        $rule_diagnostics[] = $diagnostic;
    }
    $applicable = $parsed['valid'] && !$unknown && $included && !$excluded;
    return [
        'applicable' => $applicable,
        'storage_format' => $parsed['format'],
        'normalised_rules' => $rules,
        'unknown_rules' => $unknown,
        'include_matched' => $included,
        'exclude_matched' => $excluded,
        'rule_diagnostics' => $rule_diagnostics,
        'fail_closed' => !$applicable,
    ];
}

function streetkingz_ai_condition_applies_to_product($condition_value, int $product_id): bool {
    return streetkingz_ai_condition_analysis($condition_value, $product_id)['applicable'];
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
    $condition_analysis = $conditions['present'] ? streetkingz_ai_condition_analysis($conditions['raw_stored_value'], $product_id) : [
        'applicable' => false,
        'storage_format' => 'missing',
        'normalised_rules' => [],
        'unknown_rules' => [],
        'include_matched' => false,
        'exclude_matched' => false,
        'rule_diagnostics' => [],
        'fail_closed' => true,
    ];
    if (!$condition_analysis['applicable']) {
        return new WP_Error('streetkingz_ai_template_not_applicable', 'Configured Elementor template is not applicable to the requested product.', [
            'status' => 409,
            'condition_diagnostic' => $condition_analysis,
        ]);
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
            'condition_diagnostic' => $condition_analysis,
        ],
        'raw_elementor_data' => $elementor['raw_stored_value'],
        'parsed_elementor_data' => json_decode($elementor['raw_stored_value'], true),
        'edit_mode' => $edit_mode['raw_stored_value'],
        'elementor_version' => $version['raw_stored_value'],
    ];
}
