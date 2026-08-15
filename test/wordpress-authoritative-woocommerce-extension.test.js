import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("wordpress-plugin/streetkingz-ai-authoritative-reader/streetkingz-ai-authoritative-reader.php", "utf8");
const route = source.match(/register_rest_route\('streetkingz-ai\/v1',[\s\S]*?\n\s*}\);/)?.[0] || "";
const response = source.match(/return rest_ensure_response\(\[[\s\S]*?\n\s*\]\);/)?.[0] || "";
const woo = source.match(/function streetkingz_ai_read_woocommerce_product[\s\S]*?\n}/)?.[0] || "";

test("existing authoritative endpoint still exists", () => assert.match(route, /products\/\(\?P<id>\\d\+\)\/authoritative/));

test("route remains GET-only", () => {
  assert.match(route, /'methods' => WP_REST_Server::READABLE/);
  assert.doesNotMatch(route, /CREATABLE|EDITABLE|DELETABLE|POST|PUT|PATCH|DELETE/);
});

test("existing authentication remains required", () => {
  assert.match(route, /!is_user_logged_in\(\)/);
  assert.match(route, /streetkingz_ai_forbidden/);
});

test("invalid or insufficient credentials remain rejected", () => {
  assert.match(route, /!current_user_can\(STREETKINGZ_AI_READ_CAPABILITY\)/);
  assert.match(route, /\['status' => 403\]/);
});

test("permission requirement did not broaden", () => {
  assert.match(source, /STREETKINGZ_AI_READ_CAPABILITY = 'streetkingz_ai_read_product_source'/);
  assert.doesNotMatch(route, /edit_products|manage_woocommerce|administrator|shop_manager/);
});

test("product ID is returned", () => assert.match(woo, /'product_id' => \$product->get_id\(\)/));
test("SKU is returned", () => assert.match(woo, /'sku' => \$product->get_sku\(\)/));
test("simple product type is returned from WooCommerce", () => assert.match(woo, /'product_type' => \$product->get_type\(\)/));

test("variable product type can be represented", () => {
  assert.match(source, /\$product->is_type\('variable'\)/);
  assert.match(source, /array_slice\(\$all_ids, 0, 100\)/);
});

test("regular price is returned", () => assert.match(woo, /'regular_price' => \$product->get_regular_price\(\)/));
test("sale price is returned", () => assert.match(woo, /'sale_price' => \$product->get_sale_price\(\)/));
test("current price is returned", () => assert.match(woo, /'current_price' => \$product->get_price\(\)/));
test("stock status is returned", () => assert.match(source, /'stock_status' => \$product->get_stock_status\(\)/));

test("manage_stock is returned as a boolean", () => {
  assert.match(source, /\$manage_stock = \$product->get_manage_stock\(\) === true/);
  assert.match(source, /'manage_stock' => \$manage_stock/);
});

test("quantity is returned when managed", () => assert.match(source, /\$manage_stock \? \$product->get_stock_quantity\(\) : null/));
test("quantity is null when unmanaged", () => assert.match(source, /'stock_quantity' => \$manage_stock \? [^\n]+ : null/));

test("categories are safely bounded to product_cat assignments", () => {
  assert.match(source, /get_category_ids\(\), 100/);
  assert.match(source, /get_term\(\$term_id, 'product_cat'\)/);
  for (const key of ["id", "name", "slug"]) assert.match(source, new RegExp(`'${key}' =>`));
});

test("attributes are structurally represented", () => {
  assert.match(source, /WC_Product_Attribute/);
  for (const key of ["name", "slug", "options", "visible", "variation"]) assert.match(source, new RegExp(`'${key}' =>`));
});

test("simple products have empty variation arrays", () => assert.match(source, /return \['variation_ids' => \[\], 'variations' => \[\], 'truncated' => false\]/));

test("bounded variable-product variation data works", () => {
  assert.match(source, /function streetkingz_ai_variation_record/);
  assert.match(source, /WC_Product_Variation/);
  for (const key of ["id", "sku", "pricing", "inventory", "attributes", "image_id"]) assert.match(source, new RegExp(`'${key}' =>`));
  assert.match(source, /variations_truncated/);
});

test("upsell IDs are returned", () => assert.match(woo, /'upsell_ids' => streetkingz_ai_bounded_ids\(\$product->get_upsell_ids\(\)\)/));
test("cross-sell IDs are returned", () => assert.match(woo, /'cross_sell_ids' => streetkingz_ai_bounded_ids\(\$product->get_cross_sell_ids\(\)\)/));

test("dynamic related-product recommendations are explicitly omitted", () => {
  assert.doesNotMatch(source, /wc_get_related_products/);
  assert.doesNotMatch(woo, /related_product_ids/);
});

test("featured image ID is returned", () => assert.match(woo, /'image_id' => \$product->get_image_id\(\) \?: null/));
test("gallery IDs are bounded and returned", () => assert.match(woo, /'gallery_image_ids' => streetkingz_ai_bounded_ids\(\$product->get_gallery_image_ids\(\)\)/));

test("arbitrary product meta is not present", () => assert.doesNotMatch(woo, /get_meta|get_post_meta|postmeta|meta_data|get_data\(/));
test("secret or internal metadata is not exposed", () => assert.doesNotMatch(response, /password|secret|token|credential|authorization|api_key/i));

test("existing response fields remain backward compatible", () => {
  for (const key of ["schema_version", "product", "elementor_template"]) assert.match(response, new RegExp(`'${key}'`));
  assert.match(response, /'woocommerce' => \$woocommerce/);
});

test("nonexistent products fail safely", () => {
  assert.match(source, /streetkingz_ai_product_not_found/);
  assert.match(source, /\['status' => 404\]/);
});

test("non-product posts fail safely", () => {
  assert.match(source, /streetkingz_ai_not_product/);
  assert.match(source, /streetkingz_ai_not_woocommerce_product/);
  assert.doesNotMatch(source, /getTrace|debug_backtrace|stack trace/i);
});

test("no-cache behavior remains intact", () => {
  assert.match(source, /rest_pre_dispatch/);
  assert.match(source, /DONOTCACHEPAGE/);
  assert.match(source, /LSCACHE_NO_CACHE/);
  assert.match(source, /no-store, private/);
});

test("no write or mutation functionality exists", () => {
  for (const call of ["wp_update_post", "wp_insert_post", "update_post_meta", "delete_post_meta", "add_post_meta", "wp_delete_post", "set_stock", "set_price", "save"]) {
    assert.doesNotMatch(source, new RegExp(`\\b${call}\\s*\\(`, "i"));
  }
  assert.doesNotMatch(source, /WP_REST_Server::(?:CREATABLE|EDITABLE|DELETABLE)/);
});

