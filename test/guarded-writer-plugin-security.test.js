import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plugin = await readFile("wordpress-plugin/streetkingz-ai-guarded-writer/streetkingz-ai-guarded-writer.php", "utf8");

test("writer is separately permissioned and mutation endpoint is POST-only", () => {
  assert.match(plugin, /streetkingz_ai_write_approved_product_copy/);
  const route = plugin.slice(plugin.indexOf("register_rest_route('streetkingz-ai/v1', '/approved-product-70-copy/(?P<mode>"), plugin.indexOf("register_rest_route('streetkingz-ai/v1', '/approved-product-70-copy/approval'"));
  assert.match(route, /WP_REST_Server::CREATABLE/);
  assert.match(plugin, /current_user_can\(STREETKINGZ_AI_WRITE_CAPABILITY\)/);
  assert.doesNotMatch(route, /WP_REST_Server::READABLE|WP_REST_Server::EDITABLE|WP_REST_Server::DELETABLE/);
});

test("writer scope is compile-time fixed and request accepts no copy or arbitrary targets", () => {
  for (const literal of ["WRITE_PRODUCT_ID = 70", "WRITE_TEMPLATE_ID = 2003", "c80e718", "4691e088", "40869c27", "43d7d6f0"]) assert.match(plugin, new RegExp(literal));
  assert.match(plugin, /\$request\['mode'\] === 'execute' \? \['approval_artifact_sha256', 'execution_authorisation_sha256'\] : \['approval_artifact_sha256'\]/);
  assert.doesNotMatch(plugin, /\$request\[['"](?:product|product_id|template|template_id|widget|field|value|copy|meta|slug)/i);
});

test("execute remains locked without a separate exact user authorisation contract", () => {
  assert.match(plugin, /STREETKINGZ_AI_ACTIVE_EXECUTION_OPTION/);
  assert.match(plugin, /streetkingz_ai_execution_locked/);
  assert.match(plugin, /explicit_user_live_write_authorisation/);
  for (const binding of ["approval_artifact_sha256", "current_state_guards", "approved_target_hashes", "product_id", "template_id", "one_time_execution_id", "publication_authorised"]) assert.match(plugin, new RegExp(binding));
  assert.match(plugin, /streetkingz_ai_writer_canonical_manifest/);
});

test("runtime approval, exact target hashes and all current-state guards are enforced", () => {
  assert.match(plugin, /STREETKINGZ_AI_ACTIVE_APPROVAL_OPTION/);
  assert.doesNotMatch(plugin, /human-implementation-approval\.json/);
  assert.match(plugin, /hash_equals\(\$packaged\['sha256'\]/);
  assert.match(plugin, /approved_target_sha256/);
  for (const guard of ["post_title", "post_excerpt", "template_elementor_data", "description_widget", "comparison_widget", "safety_widget"]) assert.match(plugin, new RegExp(`guards\['${guard}'\]`));
});

test("product mutation omits slug, status, content and meta", () => {
  assert.match(plugin, /wp_update_post\(\['ID' => STREETKINGZ_AI_WRITE_PRODUCT_ID, 'post_title' => .*'post_excerpt' =>/s);
  assert.doesNotMatch(plugin, /update_post_meta\s*\(|delete_post_meta\s*\(|wp_set_object_terms\s*\(/);
  const writeLines = plugin.split("\n").filter((line) => line.includes("wp_update_post(["));
  assert.equal(writeLines.length, 2);
  for (const line of writeLines) {
    assert.match(line, /'ID' => STREETKINGZ_AI_WRITE_PRODUCT_ID/);
    assert.match(line, /'post_title' =>/);
    assert.match(line, /'post_excerpt' =>/);
    assert.doesNotMatch(line, /post_name|post_status|post_content|meta|taxonomy|price|stock/);
  }
});

test("Elementor document API, pre-write snapshot and compensating rollback are present", () => {
  assert.match(plugin, /documents->get\(STREETKINGZ_AI_WRITE_TEMPLATE_ID\)/);
  assert.match(plugin, /->save\(\['elements' => \$elements\]\)/);
  assert.match(plugin, /streetkingz_ai_writer_persist_snapshot\(\$prepared\)/);
  assert.match(plugin, /fopen\(\$path, 'x'\)/);
  for (const field of ["fresh_pre_write_rollback", "captured_at", "applicability", "authoritative_source", "post_content", "template_elementor_data", "authoritative_source_sha256"]) assert.match(plugin, new RegExp(field));
  assert.match(plugin, /streetkingz_ai_write_rolled_back/);
  assert.match(plugin, /streetkingz_ai_writer_verify_state\(\$prepared, false, \$verification\)/);
  assert.match(plugin, /streetkingz_ai_writer_verify_state\(\$prepared, true\)/);
  assert.match(plugin, /streetkingz_ai_rollback_verification_failed/);
  assert.doesNotMatch(plugin, /update_post_meta\s*\(.*_elementor_data/s);
});

test("Elementor save receives a narrowly scoped template capability without broadening the writer role", () => {
  assert.match(plugin, /Version: 0\.1\.9/);
  assert.match(plugin, /streetkingz_ai_writer_map_template_save_capability/);
  assert.match(plugin, /\$cap === \$edit_posts/);
  assert.match(plugin, /\$cap === \$edit_post/);
  assert.match(plugin, /\(int\) \(\$args\[0\] \?\? 0\) === STREETKINGZ_AI_WRITE_TEMPLATE_ID/);
  assert.match(plugin, /current_user_can\(STREETKINGZ_AI_WRITE_CAPABILITY\)/);
  assert.match(plugin, /add_filter\('map_meta_cap'.*10, 4\)/);
  assert.match(plugin, /remove_filter\('map_meta_cap'.*10\)/);
  assert.match(plugin, /finally/);
  assert.doesNotMatch(plugin, /add_cap\([^\n]*(?:edit_post|edit_posts|edit_products)/);
});

test("rollback verifies fresh persisted semantics even when the failed Elementor save changed nothing", () => {
  const rollback = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_rollback"), plugin.indexOf("function streetkingz_ai_guarded_writer_request"));
  assert.match(rollback, /streetkingz_ai_writer_clear_persisted_state_caches/);
  assert.match(rollback, /streetkingz_ai_writer_source\(\$prepared\['approval'\]\)/);
  assert.match(rollback, /if \(!hash_equals/);
  assert.match(rollback, /streetkingz_ai_writer_save_elementor\(\$prepared\['original'\]\['document'\]\)/);
  assert.match(rollback, /streetkingz_ai_writer_verify_state\(\$prepared, false, \$verification\)/);
  assert.doesNotMatch(rollback, /&&\s*streetkingz_ai_writer_verify_state/);
  assert.match(plugin, /streetkingz_ai_elementor_persisted_state_mismatch/);
  assert.match(plugin, /elementor_failure_code/);
});

test("dry-run performs no mutation and execute is an explicit separate mode", () => {
  assert.match(plugin, /dry-run\|execute/);
  const dryRunBranch = plugin.slice(plugin.indexOf("if ($request['mode'] === 'dry-run')"), plugin.indexOf("$snapshot =", plugin.indexOf("if ($request['mode'] === 'dry-run')")));
  assert.doesNotMatch(dryRunBranch, /wp_update_post|streetkingz_ai_writer_save_elementor/);
  assert.match(dryRunBranch, /'writes_performed' => 0/);
});

test("one-time execution is atomically and persistently claimed before mutation", () => {
  assert.match(plugin, /Version: 0\.1\.9/);
  assert.match(plugin, /STREETKINGZ_AI_EXECUTION_OPTION_PREFIX/);
  assert.match(plugin, /INSERT IGNORE INTO \{\$wpdb->options\}/);
  assert.match(plugin, /\$inserted !== 1/);
  assert.match(plugin, /streetkingz_ai_execution_replay_rejected/);
  assert.match(plugin, /'state' => 'claimed_executing'/);
  assert.match(plugin, /\['succeeded', 'failed_after_claim'\]/);
  assert.match(plugin, /execution_id_sha256/);
  assert.match(plugin, /contract_sha256/);
  assert.match(plugin, /approval_sha256/);
  const claimLifecycle = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_claim_execution"), plugin.indexOf("function streetkingz_ai_writer_source"));
  assert.doesNotMatch(claimLifecycle, /delete_option\s*\(/);

  const request = plugin.slice(plugin.indexOf("function streetkingz_ai_guarded_writer_request"));
  const snapshot = request.indexOf("streetkingz_ai_writer_persist_snapshot($prepared)");
  const claim = request.indexOf("streetkingz_ai_writer_claim_execution(");
  const productWrite = request.indexOf("wp_update_post([");
  assert.ok(snapshot >= 0 && snapshot < claim && claim < productWrite);
});

test("all post-claim outcomes remain consumed and dry-run never claims", () => {
  const request = plugin.slice(plugin.indexOf("function streetkingz_ai_guarded_writer_request"));
  const dryRunBranch = request.slice(request.indexOf("if ($request['mode'] === 'dry-run')"), request.indexOf("$snapshot ="));
  assert.doesNotMatch(dryRunBranch, /claim_execution|add_option|finish_execution/);
  assert.match(request, /product_write_failed/);
  assert.match(request, /elementor_write_failed_rolled_back/);
  assert.match(request, /post_write_verification_failed_rolled_back/);
  assert.match(request, /finish_execution\(\$claim, 'succeeded'/);
  assert.match(plugin, /The claim remains permanently unavailable/);
});
