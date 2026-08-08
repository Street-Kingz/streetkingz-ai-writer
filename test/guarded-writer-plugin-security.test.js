import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plugin = await readFile("wordpress-plugin/streetkingz-ai-guarded-writer/streetkingz-ai-guarded-writer.php", "utf8");

test("writer is separately permissioned, POST-only and assigns no capability", () => {
  assert.match(plugin, /streetkingz_ai_write_approved_product_copy/);
  assert.match(plugin, /WP_REST_Server::CREATABLE/);
  assert.match(plugin, /current_user_can\(STREETKINGZ_AI_WRITE_CAPABILITY\)/);
  assert.doesNotMatch(plugin, /register_activation_hook|add_role\s*\(|add_cap\s*\(|set_role\s*\(/);
  assert.doesNotMatch(plugin, /WP_REST_Server::READABLE|WP_REST_Server::EDITABLE|WP_REST_Server::DELETABLE/);
});

test("writer scope is compile-time fixed and request accepts no copy or arbitrary targets", () => {
  for (const literal of ["WRITE_PRODUCT_ID = 70", "WRITE_TEMPLATE_ID = 2003", "c80e718", "4691e088", "40869c27", "43d7d6f0"]) assert.match(plugin, new RegExp(literal));
  assert.match(plugin, /\$request\['mode'\] === 'execute' \? \['approval_artifact_sha256', 'execution_authorisation_sha256'\] : \['approval_artifact_sha256'\]/);
  assert.doesNotMatch(plugin, /\$request\[['"](?:product|product_id|template|template_id|widget|field|value|copy|meta|slug)/i);
});

test("execute remains locked without a separate exact user authorisation contract", () => {
  assert.match(plugin, /execution-authorisation\.json/);
  assert.match(plugin, /streetkingz_ai_execution_locked/);
  assert.match(plugin, /explicit_user_live_write_authorisation/);
  for (const binding of ["approval_artifact_sha256", "current_state_guards", "approved_target_hashes", "product_id", "template_id", "one_time_execution_id", "publication_authorised"]) assert.match(plugin, new RegExp(binding));
  assert.match(plugin, /hash\('sha256', \$raw\)/);
});

test("packaged approval, exact target hashes and all current-state guards are enforced", () => {
  assert.match(plugin, /human-implementation-approval\.json/);
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
  assert.match(plugin, /streetkingz_ai_writer_verify_state\(\$prepared, false\)/);
  assert.match(plugin, /streetkingz_ai_writer_verify_state\(\$prepared, true\)/);
  assert.match(plugin, /streetkingz_ai_rollback_verification_failed/);
  assert.doesNotMatch(plugin, /update_post_meta\s*\(.*_elementor_data/s);
});

test("dry-run performs no mutation and execute is an explicit separate mode", () => {
  assert.match(plugin, /dry-run\|execute/);
  const dryRunBranch = plugin.slice(plugin.indexOf("if ($request['mode'] === 'dry-run')"), plugin.indexOf("$snapshot =", plugin.indexOf("if ($request['mode'] === 'dry-run')")));
  assert.doesNotMatch(dryRunBranch, /wp_update_post|streetkingz_ai_writer_save_elementor/);
  assert.match(dryRunBranch, /'writes_performed' => 0/);
});
