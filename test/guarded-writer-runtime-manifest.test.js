import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { DatabaseSync } from "node:sqlite";

const plugin = fs.readFileSync("wordpress-plugin/streetkingz-ai-guarded-writer/streetkingz-ai-guarded-writer.php", "utf8");

test("v0.1.8 uses one runtime option source and no bundled manifest fallback", () => {
  assert.match(plugin, /Version: 0\.1\.8/);
  assert.match(plugin, /STREETKINGZ_AI_ACTIVE_APPROVAL_OPTION = 'streetkingz_ai_writer_active_approval_v1'/);
  assert.match(plugin, /STREETKINGZ_AI_ACTIVE_EXECUTION_OPTION = 'streetkingz_ai_writer_active_execution_v1'/);
  assert.doesNotMatch(plugin, /__DIR__\s*\.\s*['"]\/(?:human-implementation-approval|execution-authorisation)\.json/);
  assert.doesNotMatch(plugin, /file_get_contents\s*\(/);
});

test("manifest REST surface is explicit and contains no generic key, file, or upload route", () => {
  for (const route of ["/approved-product-70-copy/approval", "/approved-product-70-copy/approval/status", "/approved-product-70-copy/execution-contract", "/approved-product-70-copy/execution/status"]) assert.match(plugin, new RegExp(route.replaceAll("/", "\\/")));
  assert.doesNotMatch(plugin, /manifest\/\(\?P|option\/|file\/upload|media_handle_upload|wp_handle_upload/i);
  assert.match(plugin, /streetkingz_ai_writer_permission/);
  assert.match(plugin, /current_user_can\(STREETKINGZ_AI_WRITE_CAPABILITY\)/);
});

test("approval installation is exact, bounded, non-autoloaded, and content-write free", () => {
  const code = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_install_approval"), plugin.indexOf("function streetkingz_ai_writer_approval_status"));
  assert.match(code, /STREETKINGZ_AI_APPROVAL_MAX_BYTES/);
  assert.match(code, /streetkingz_ai_writer_validate_approval_manifest/);
  assert.match(code, /add_option\(STREETKINGZ_AI_ACTIVE_APPROVAL_OPTION, \$record, '', false\)/);
  assert.match(code, /approval_already_installed/);
  assert.match(code, /content_writes_performed' => 0/);
  assert.doesNotMatch(code, /wp_update_post|update_post_meta|streetkingz_ai_writer_save_elementor|streetkingz_ai_writer_claim_execution/);
});

test("approval schema fixes product, template, targets, hashes, and blocked authorisations", () => {
  const code = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_validate_approval_manifest"), plugin.indexOf("function streetkingz_ai_writer_runtime_record"));
  for (const value of ["STREETKINGZ_AI_WRITE_PRODUCT_ID", "STREETKINGZ_AI_WRITE_TEMPLATE_ID", "post_title", "description", "comparison", "post_excerpt", "c80e718", "40869c27", "4691e088", "43d7d6f0", "slug_change_authorised", "metadata_change_authorised", "publication_authorised", "detailed_safety_widget_change_authorised"]) assert.match(code, new RegExp(value));
  assert.match(code, /streetkingz_ai_writer_exact_keys/);
  assert.match(code, /foreach \(\$approval\['authorisation'\] as \$allowed\) if \(\$allowed !== false\)/);
  assert.match(code, /approved_target_sha256/);
  assert.match(code, /current_state_guard_sha256/);
});

test("execution contract installation validates exact binding and performs neither claim nor mutation", () => {
  const validate = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_validate_execution_manifest"), plugin.indexOf("function streetkingz_ai_writer_install_execution_contract"));
  const install = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_install_execution_contract"), plugin.indexOf("function streetkingz_ai_writer_execution_status"));
  for (const value of ["approval_artifact_sha256", "current_state_guards", "approved_target_hashes", "one_time_execution_id", "explicit_user_live_write_authorisation", "post_title", "post_excerpt", "c80e718.settings.editor", "40869c27.settings.editor"]) assert.match(validate, new RegExp(value.replaceAll(".", "\\.")));
  for (const flag of ["publication_authorised", "slug_authorised", "metadata_authorised", "safety_widget_change_authorised", "faq_question_change_authorised", "unrelated_elementor_changes_authorised", "other_products_authorised", "other_templates_authorised"]) assert.match(validate, new RegExp(flag));
  assert.match(validate, /execution_replay_rejected/);
  assert.match(install, /add_option\(STREETKINGZ_AI_ACTIVE_EXECUTION_OPTION, \$record, '', false\)/);
  assert.match(install, /add_option\(\$reservation_name, \$reservation, '', false\)/);
  assert.match(install, /execution_id_previously_installed/);
  assert.match(install, /execution_claims_performed' => 0/);
  assert.match(install, /content_writes_performed' => 0/);
  assert.doesNotMatch(install, /streetkingz_ai_writer_claim_execution|wp_update_post|update_post_meta|streetkingz_ai_writer_save_elementor/);
});

test("active manifests require explicit removal and permanent claim history is never deleted", () => {
  assert.match(plugin, /explicit removal is required before replacement/);
  assert.match(plugin, /Remove the active execution contract before removing its approval/);
  assert.match(plugin, /streetkingz_ai_execution_in_progress/);
  assert.match(plugin, /permanent_claim_history_preserved/);
  assert.match(plugin, /permanent_id_reservation_preserved/);
  assert.doesNotMatch(plugin, /delete_option\s*\(\s*streetkingz_ai_writer_execution_option_name/);
  assert.doesNotMatch(plugin, /delete_option\s*\(\s*streetkingz_ai_writer_execution_reservation_name/);
});

test("status operations expose fingerprints and state rather than manifest contents", () => {
  const approval = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_approval_status"), plugin.indexOf("function streetkingz_ai_writer_remove_approval"));
  const execution = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_execution_status"), plugin.indexOf("function streetkingz_ai_writer_remove_execution_contract"));
  assert.match(approval, /approval_sha256/);
  assert.doesNotMatch(approval, /exact_cms_value|approved_fields|manifest'\s*=>/);
  assert.match(execution, /contract_sha256/);
  assert.match(execution, /execution_id_sha256/);
  assert.doesNotMatch(execution, /exact_cms_value|approved_fields|one_time_execution_id'\s*=>/);
});

test("audit history covers manifest lifecycle while execution claims retain terminal history", () => {
  for (const event of ["approval_installed", "approval_removed", "execution_contract_installed", "execution_contract_removed"]) assert.match(plugin, new RegExp(`streetkingz_ai_writer_audit\\('${event}'`));
  assert.match(plugin, /STREETKINGZ_AI_MANIFEST_AUDIT_PREFIX/);
  assert.match(plugin, /add_option\(\$name, \$record, '', false\)/);
  assert.match(plugin, /\['succeeded', 'failed_after_claim'\]/);
  assert.doesNotMatch(plugin, /delete_option\s*\(\$claim\['option_name'\]\)/);
});

test("dry run remains before snapshots, claims, and all CMS mutation", () => {
  const request = plugin.slice(plugin.indexOf("function streetkingz_ai_guarded_writer_request"));
  const dry = request.indexOf("if ($request['mode'] === 'dry-run')");
  const snapshot = request.indexOf("streetkingz_ai_writer_persist_snapshot($prepared)");
  const claim = request.indexOf("streetkingz_ai_writer_claim_execution(");
  const mutation = request.indexOf("wp_update_post([");
  assert.ok(dry >= 0 && dry < snapshot && snapshot < claim && claim < mutation);
  assert.match(request.slice(dry, snapshot), /writes_performed' => 0/);
  assert.doesNotMatch(request.slice(dry, snapshot), /claim_execution|wp_update_post|save_elementor/);
});

function concurrentInstallWorker(databasePath, optionName, value) {
  const source = `
    const { parentPort, workerData } = require('node:worker_threads');
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(workerData.databasePath);
    db.exec('PRAGMA busy_timeout=5000');
    let won = false;
    try { won = db.prepare('INSERT OR IGNORE INTO options(option_name, option_value, autoload) VALUES (?, ?, ?)').run(workerData.optionName, workerData.value, 'no').changes === 1; }
    finally { db.close(); }
    parentPort.postMessage(won);
  `;
  return new Promise((resolve, reject) => {
    const worker = new Worker(source, { eval: true, workerData: { databasePath, optionName, value } });
    worker.once("message", resolve); worker.once("error", reject);
    worker.once("exit", (code) => { if (code !== 0) reject(new Error(`worker exited ${code}`)); });
  });
}

test("fixed option uniqueness gives exactly one concurrent active-manifest installer", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "streetkingz-manifest-install-"));
  const databasePath = path.join(directory, "options.sqlite");
  try {
    const db = new DatabaseSync(databasePath);
    db.exec("PRAGMA journal_mode=WAL; CREATE TABLE options (option_name TEXT PRIMARY KEY, option_value TEXT NOT NULL, autoload TEXT NOT NULL);"); db.close();
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => concurrentInstallWorker(databasePath, "streetkingz_ai_writer_active_approval_v1", JSON.stringify({ i }))));
    assert.equal(results.filter(Boolean).length, 1);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("upgrade path creates no approval, contract, execution ID, user, or content", () => {
  const migration = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_ensure_role"), plugin.indexOf("add_action('rest_api_init'"));
  assert.doesNotMatch(migration, /ACTIVE_APPROVAL_OPTION|ACTIVE_EXECUTION_OPTION|EXECUTION_OPTION_PREFIX|wp_update_post|update_post_meta|wp_insert_user|set_role/);
});
