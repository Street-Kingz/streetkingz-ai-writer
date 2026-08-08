import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plugin = await readFile("wordpress-plugin/streetkingz-ai-authoritative-reader/streetkingz-ai-authoritative-reader.php", "utf8");

test("plugin registers one GET-only product route with custom-capability authorisation", () => {
  assert.match(plugin, /streetkingz-ai\/v1/);
  assert.match(plugin, /products\/\(\?P<id>/);
  assert.match(plugin, /WP_REST_Server::READABLE/);
  assert.match(plugin, /streetkingz_ai_read_product_source/);
  assert.match(plugin, /current_user_can\(STREETKINGZ_AI_READ_CAPABILITY\)/);
  assert.match(plugin, /post_type'\] !== 'product'/);
  assert.doesNotMatch(plugin, /WP_REST_Server::(?:CREATABLE|EDITABLE|DELETABLE)/);
});

test("plugin exposes only allowlisted product and Elementor keys", () => {
  for (const key of ["post_title", "post_excerpt", "post_content", "post_name", "permalink", "raw_elementor_data", "edit_mode", "template_type", "elementor_version", "applicability"]) assert.match(plugin, new RegExp(`'${key}'`));
  assert.doesNotMatch(plugin, /get_post_meta\s*\(\s*\$post_id\s*\)/);
});

test("template access is fixed, product-associated and cannot accept injected template IDs", () => {
  assert.match(plugin, /STREETKINGZ_AI_PRODUCT_TEMPLATE_ID = 2003/);
  assert.match(plugin, /streetkingz_ai_condition_applies_to_product/);
  assert.match(plugin, /_elementor_conditions/);
  assert.match(plugin, /elementor_library/);
  assert.doesNotMatch(plugin, /\$request\[['"]template/i);
});

test("plugin contains no WordPress, Elementor or WooCommerce mutation calls", () => {
  for (const forbidden of ["wp_update_post", "wp_insert_post", "update_post_meta", "delete_post_meta", "add_post_meta", "wp_delete_post", "set_stock", "set_price", "save_document", "update_option"]) assert.doesNotMatch(plugin, new RegExp(`\\b${forbidden}\\s*\\(`, "i"));
});

test("role creation is narrow and does not assign or elevate arbitrary users", () => {
  assert.match(plugin, /add_role\('streetkingz_ai_reader'/);
  assert.doesNotMatch(plugin, /edit_products|publish_products|delete_products|administrator|shop_manager/i);
  assert.doesNotMatch(plugin, /add_cap\s*\(|set_role\s*\(|get_user_by\s*\(/);
});
