import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const writer = fs.readFileSync("wordpress-plugin/streetkingz-ai-guarded-writer/streetkingz-ai-guarded-writer.php", "utf8");
const reader = fs.readFileSync("wordpress-plugin/streetkingz-ai-authoritative-reader/streetkingz-ai-authoritative-reader.php", "utf8");

test("dedicated writer role has exactly read plus the writer capability", () => {
  assert.match(writer, /STREETKINGZ_AI_WRITER_ROLE = 'streetkingz_ai_writer'/);
  assert.match(writer, /add_role\(STREETKINGZ_AI_WRITER_ROLE, 'Street Kingz AI Writer', \$allowed\)/);
  assert.match(writer, /\$allowed = \['read' => true, STREETKINGZ_AI_WRITE_CAPABILITY => true\]/);
  assert.match(writer, /remove_cap\(\$capability\)/);
  assert.doesNotMatch(writer, /['"]streetkingz_ai_read_product_source['"]/);
});

test("writer role includes no broad CMS, WooCommerce, publication or plugin capabilities", () => {
  const roleFunction = writer.slice(writer.indexOf("function streetkingz_ai_writer_ensure_role"), writer.indexOf("register_activation_hook"));
  for (const capability of ["edit_posts", "edit_pages", "edit_products", "edit_others_posts", "publish_posts", "publish_pages", "publish_products", "delete_posts", "delete_products", "upload_files", "manage_options", "manage_woocommerce", "edit_theme_options", "install_plugins", "activate_plugins", "update_plugins"]) assert.doesNotMatch(roleFunction, new RegExp(capability));
});

test("reader role retains only read plus reader capability and never gains writer capability", () => {
  assert.match(reader, /add_role\('streetkingz_ai_reader'/);
  assert.match(reader, /STREETKINGZ_AI_READ_CAPABILITY => true/);
  assert.doesNotMatch(reader, /streetkingz_ai_write_approved_product_copy/);
});

test("activation creates the role without assigning users, creating accounts or application passwords", () => {
  assert.match(writer, /register_activation_hook\(__FILE__, 'streetkingz_ai_writer_ensure_role'\)/);
  for (const forbidden of ["get_user_by", "wp_create_user", "wp_insert_user", "set_role", "add_role_to_user", "WP_Application_Passwords", "create_new_application_password"]) assert.doesNotMatch(writer, new RegExp(`\\b${forbidden}\\b`, "i"));
});

test("activation and migration cannot mutate content or create execution authorisation", () => {
  for (const forbidden of ["wp_update_post", "wp_insert_post", "update_post_meta", "delete_post_meta", "add_post_meta", "wp_set_object_terms", "execution-authorisation.json'"] ) {
    const roleCode = writer.slice(writer.indexOf("function streetkingz_ai_writer_ensure_role"), writer.indexOf("add_action('rest_api_init'"));
    assert.doesNotMatch(roleCode, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("versioned init migration reliably creates the role after active-plugin replacement", () => {
  assert.match(writer, /STREETKINGZ_AI_WRITER_ROLE_VERSION = '1'/);
  assert.match(writer, /get_option\(STREETKINGZ_AI_WRITER_ROLE_VERSION_OPTION\) !== STREETKINGZ_AI_WRITER_ROLE_VERSION/);
  assert.match(writer, /streetkingz_ai_writer_ensure_role\(\)/);
  assert.match(writer, /update_option\(STREETKINGZ_AI_WRITER_ROLE_VERSION_OPTION, STREETKINGZ_AI_WRITER_ROLE_VERSION, false\)/);
});

test("role lifecycle never deletes users, roles or assignments on deactivation/uninstall", () => {
  assert.doesNotMatch(writer, /register_deactivation_hook|register_uninstall_hook|remove_role\s*\(|wp_delete_user|remove_user_from_blog/);
});

test("writer capability remains insufficient for execute without separate authorisation", () => {
  assert.match(writer, /current_user_can\(STREETKINGZ_AI_WRITE_CAPABILITY\)/);
  assert.match(writer, /streetkingz_ai_writer_execution_authorisation/);
  assert.match(writer, /streetkingz_ai_execution_locked/);
  assert.match(writer, /explicit_user_live_write_authorisation/);
});
