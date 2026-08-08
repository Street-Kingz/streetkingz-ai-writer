import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plugin = await readFile("wordpress-plugin/streetkingz-ai-authoritative-reader/streetkingz-ai-authoritative-reader.php", "utf8");
const conditionCases = JSON.parse(await readFile("test/fixtures/elementor-product-condition-cases.json", "utf8"));

function fixtureApplicability(testCase) {
  const flatten = (value) => Array.isArray(value) ? value.flatMap(flatten) : [value];
  let included = false;
  let excluded = false;
  let unknown = false;
  for (const original of flatten(testCase.value)) {
    const rule = String(original).replace(/\/$/, "");
    let match = rule.match(/^(include|exclude)\/product\/in_product_tag\/(\d+)$/);
    if (match) {
      const members = testCase.terms?.product_tag?.[match[2]];
      const membership = Array.isArray(members) && members.includes(testCase.product_id);
      if (match[1] === "include" && membership) included = true;
      if (match[1] === "exclude" && membership) excluded = true;
      continue;
    }
    if (["include/woocommerce/product", "include/woocommerce/products", "include/singular/product"].includes(rule)) { included = true; continue; }
    if (["exclude/woocommerce/product", "exclude/woocommerce/products", "exclude/singular/product"].includes(rule)) { excluded = true; continue; }
    match = rule.match(/^(include|exclude)\/(?:woocommerce\/product|singular\/product)\/(\d+)$/);
    if (match) {
      const applies = Number(match[2]) === testCase.product_id;
      if (match[1] === "include" && applies) included = true;
      if (match[1] === "exclude" && applies) excluded = true;
      continue;
    }
    unknown = true;
  }
  return !unknown && included && !excluded;
}

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

test("applicability parser handles bounded real-shaped encodings and fails closed", () => {
  assert.match(plugin, /streetkingz_ai_condition_tokens/);
  assert.match(plugin, /maybe_unserialize/);
  assert.match(plugin, /json_decode/);
  assert.match(plugin, /rtrim\(\$trimmed, '\/'\)/);
  assert.match(plugin, /exclude\/woocommerce\/product/);
  assert.match(plugin, /unknown_rules/);
  assert.match(plugin, /'fail_closed' => !\$applicable/);
  assert.match(plugin, /\$excluded =/);
  assert.match(plugin, /\$applicable = \$parsed\['valid'\] && !\$unknown && \$included && !\$excluded/);
});

test("condition diagnostics remain bounded to the fixed associated template", () => {
  assert.match(plugin, /'condition_diagnostic' => \$condition_analysis/);
  assert.doesNotMatch(plugin, /get_post_meta\s*\(\s*\$template_id\s*\)/);
  assert.doesNotMatch(plugin, /\$request\[['"](?:template|template_id)/i);
});

test("product-tag fixtures preserve membership, taxonomy, malformed and exclusion behavior", () => {
  for (const testCase of conditionCases.filter((item) => item.name.includes("tag") || ["wrong_taxonomy", "missing_term", "unknown_taxonomy_exclusion"].includes(item.name))) {
    assert.equal(fixtureApplicability(testCase), testCase.applicable, testCase.name);
  }
  assert.match(plugin, /term_exists\(\$term_id, 'product_tag'\)/);
  assert.match(plugin, /has_term\(\(int\) \$term_id, 'product_tag', \$product_id\)/);
  assert.match(plugin, /'rule_type' => 'product_tag_membership'/);
  assert.match(plugin, /'rule_diagnostics' => \$rule_diagnostics/);
});

test("taxonomy support cannot be controlled through endpoint parameters or expose arbitrary taxonomy data", () => {
  assert.doesNotMatch(plugin, /\$request\[['"](?:term|term_id|taxonomy|template|template_id)/i);
  assert.doesNotMatch(plugin, /get_terms\s*\(|wp_get_object_terms\s*\(/);
});

test("plugin contains no WordPress, Elementor or WooCommerce mutation calls", () => {
  for (const forbidden of ["wp_update_post", "wp_insert_post", "update_post_meta", "delete_post_meta", "add_post_meta", "wp_delete_post", "set_stock", "set_price", "save_document", "update_option"]) assert.doesNotMatch(plugin, new RegExp(`\\b${forbidden}\\s*\\(`, "i"));
});

test("role creation is narrow and does not assign or elevate arbitrary users", () => {
  assert.match(plugin, /add_role\('streetkingz_ai_reader'/);
  assert.doesNotMatch(plugin, /edit_products|publish_products|delete_products|administrator|shop_manager/i);
  assert.doesNotMatch(plugin, /add_cap\s*\(|set_role\s*\(|get_user_by\s*\(/);
});
