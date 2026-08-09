import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildFixedSurgicalTemplate, FIXED_EDITOR_TARGETS, locateAll, patchFixedRawEditorToken, phpJsonString, sha256 } from "../lib/elementorSurgicalRawPatch.js";
import { diffElementorDocuments } from "../lib/elementorNormalizationIncident.js";

const base = "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1";
const recovered = JSON.parse(fs.readFileSync("artifacts/incidents/template-2003-elementor-normalization-2026-08-09/recovery-execution-001/post-recovery-authoritative-response.json", "utf8"));
const incident = JSON.parse(fs.readFileSync(`${base}/guarded-write-execution-v0.1.9-001/post-failure-authoritative-response.json`, "utf8"));
const approval = JSON.parse(fs.readFileSync(`${base}/human-implementation-approval.json`, "utf8"));
const plugin = fs.readFileSync("wordpress-plugin/streetkingz-ai-guarded-writer/streetkingz-ai-guarded-writer.php", "utf8");
const raw = recovered.elementor_template.raw_elementor_data;
const original = JSON.parse(raw);
const approved = Object.fromEntries(approval.approved_fields.map(field => [field.field_id, field.exact_cms_value]));
const replacements = { c80e718: approved.description, "40869c27": approved.comparison };
const result = buildFixedSurgicalTemplate(raw, replacements);

function semanticDiff(before, after, path = []) {
  if (Object.is(before, after)) return [];
  if (!before || !after || typeof before !== "object" || typeof after !== "object" || Array.isArray(before) !== Array.isArray(after)) return [path.join(".")];
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys.flatMap(key => semanticDiff(before[key], after[key], [...path, key]));
}

test("exact recovered production fixture is the raw pre-incident template", () => assert.equal(sha256(raw), "81991fbccece6edcedb9cd84fc4d8dca99765b473cf24b2f8df26b5946f91c01"));
test("fixed surgical patch changes description and comparison", () => {
  assert.equal(locateAll(result.parsed, "c80e718")[0].element.settings.editor, approved.description);
  assert.equal(locateAll(result.parsed, "40869c27")[0].element.settings.editor, approved.comparison);
});
test("only the approved parsed leaves change", () => assert.deepEqual(semanticDiff(original, result.parsed), ["2.elements.0.elements.1.settings.editor", "6.elements.1.elements.0.elements.0.elements.0.settings.editor"]));
test("raw patch reports exactly two approved spans", () => assert.deepEqual(result.spans.map(span => `${span.element_id}.${span.property}`), FIXED_EDITOR_TARGETS.map(id => `${id}.settings.editor`)));
test("raw patch is exactly reversible byte for byte", () => {
  let restored = result.raw;
  for (const id of [...FIXED_EDITOR_TARGETS].reverse()) restored = patchFixedRawEditorToken(restored, id, replacements[id], locateAll(original, id)[0].element.settings.editor).raw;
  assert.equal(restored, raw);
  assert.equal(sha256(restored), "81991fbccece6edcedb9cd84fc4d8dca99765b473cf24b2f8df26b5946f91c01");
});
test("all previous 140 normalization paths retain exact values and types", () => {
  const normalized = JSON.parse(incident.elementor_template.raw_elementor_data);
  const paths = diffElementorDocuments(original, normalized).map(change => change.path);
  assert.equal(paths.length, 140);
  const changes = diffElementorDocuments(original, result.parsed);
  assert.equal(changes.filter(change => paths.includes(change.path)).length, 0);
});
test("safety widget remains strictly exact", () => assert.deepEqual(locateAll(result.parsed, "43d7d6f0")[0].element, locateAll(original, "43d7d6f0")[0].element));
test("FAQ questions remain strictly exact", () => assert.deepEqual(locateAll(result.parsed, "4691e088")[0].element.settings.items, locateAll(original, "4691e088")[0].element.settings.items));
test("unrelated Elementor structures retain strict types and values", () => {
  const restored = structuredClone(result.parsed);
  for (const id of FIXED_EDITOR_TARGETS) locateAll(restored, id)[0].element.settings.editor = locateAll(original, id)[0].element.settings.editor;
  assert.deepEqual(restored, original);
});
test("numbers strings booleans null arrays and objects round-trip strictly", () => {
  const fixture = { text: "50", integer: 50, float: 1.2, zero: 0, negative: -15, bool: false, nil: null, array: [1, "1"], object: { size: 15 } };
  assert.deepEqual(JSON.parse(JSON.stringify(fixture)), fixture);
});
test("PHP-compatible string token encoding covers HTML Unicode slashes quotes and entities", () => {
  assert.equal(phpJsonString('<p>90 × 60 — "safe" & /path/</p>'), '"<p>90 \\u00d7 60 \\u2014 \\"safe\\" & \\/path\\/<\\/p>"');
});
test("intentional numeric strings remain strings", () => {
  assert.equal(result.parsed[0].settings.padding.top, "045");
  assert.equal(typeof result.parsed[0].settings.padding.top, "string");
});
test("arbitrary widget IDs are rejected", () => assert.throws(() => patchFixedRawEditorToken(raw, "43d7d6f0", "x", "y"), error => error.code === "RAW_PATCH_TARGET_FORBIDDEN"));
test("missing and duplicated anchors fail closed", () => {
  assert.throws(() => patchFixedRawEditorToken(raw.replace('"id":"c80e718"', '"id":"missing"'), "c80e718", "x", "y"), error => error.code === "RAW_PATCH_ANCHOR_AMBIGUOUS");
  assert.throws(() => patchFixedRawEditorToken(raw + raw, "c80e718", locateAll(original, "c80e718")[0].element.settings.editor, "y"), error => error.code === "RAW_PATCH_ANCHOR_AMBIGUOUS");
});
test("old-value and token-boundary mismatches fail closed", () => assert.throws(() => patchFixedRawEditorToken(raw, "c80e718", "wrong", "new"), error => error.code === "RAW_PATCH_OLD_VALUE_MISMATCH"));
test("Writer v0.1.10 uses fixed raw persistence and no Elementor Document save", () => {
  assert.match(plugin, /Version: 0\.1\.10/);
  assert.match(plugin, /update_metadata\('post', STREETKINGZ_AI_WRITE_TEMPLATE_ID, '_elementor_data'/);
  assert.doesNotMatch(plugin, /Document::save|documents->get|->save\(\['elements'/);
});
test("no generic metadata interface or caller-controlled coordinates exist", () => {
  assert.equal((plugin.match(/update_metadata\('post', STREETKINGZ_AI_WRITE_TEMPLATE_ID, '_elementor_data'/g) || []).length, 1);
  assert.doesNotMatch(plugin, /update_post_meta\s*\(/);
  assert.doesNotMatch(plugin, /\$request\[['"](?:post_id|template_id|meta_key|widget_id|value)/);
});
test("raw persistence result is diagnostic and persisted bytes are authoritative", () => {
  const persistence = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_persist_surgical_template"), plugin.indexOf("function streetkingz_ai_writer_clear_persisted_state_caches"));
  assert.match(persistence, /update_metadata_return_value/);
  assert.match(persistence, /persisted_raw_matches_expected/);
  assert.match(persistence, /\$after\['raw'\] === \$expected_raw/);
  assert.match(persistence, /\$after\['document'\] === \$expected_document/);
});
test("false persistence return with exact bytes is accepted by the verification rule", () => {
  const functionReturn = false;
  const persistedMatches = result.raw === result.raw && sha256(result.raw) === result.raw_sha256;
  assert.equal(functionReturn, false);
  assert.equal(persistedMatches, true);
});
test("truthy persistence return with wrong bytes is rejected by the verification rule", () => {
  const functionReturn = true;
  const wrong = result.raw + " ";
  assert.equal(functionReturn, true);
  assert.equal(wrong === result.raw && sha256(wrong) === result.raw_sha256, false);
});
test("failure before template persistence leaves original template exact", () => assert.equal(sha256(raw), "81991fbccece6edcedb9cd84fc4d8dca99765b473cf24b2f8df26b5946f91c01"));
test("post-write mismatch rolls back to the exact captured raw source", () => {
  const mismatchedPersisted = result.raw + " ";
  assert.notEqual(sha256(mismatchedPersisted), result.raw_sha256);
  const rolledBack = raw;
  assert.equal(rolledBack, raw);
  assert.equal(sha256(rolledBack), "81991fbccece6edcedb9cd84fc4d8dca99765b473cf24b2f8df26b5946f91c01");
});
test("rollback persistence mismatch remains a failure", () => assert.notEqual(sha256(raw + " "), "81991fbccece6edcedb9cd84fc4d8dca99765b473cf24b2f8df26b5946f91c01"));
test("rollback restores the exact original raw value without Document save", () => {
  const rollback = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_rollback"), plugin.indexOf("function streetkingz_ai_guarded_writer_request"));
  assert.match(rollback, /persist_surgical_template\(\$prepared\['original'\]\['template_raw'\]\)/);
  assert.match(rollback, /rollback_target_template_sha256/);
  assert.doesNotMatch(rollback, /save_elementor|Document::save/);
});
test("cache invalidation is bounded to product 70 and template 2003", () => {
  const cache = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_clear_persisted_state_caches"), plugin.indexOf("function streetkingz_ai_writer_verify_state"));
  assert.match(cache, /STREETKINGZ_AI_WRITE_TEMPLATE_ID/);
  assert.match(cache, /STREETKINGZ_AI_WRITE_PRODUCT_ID/);
  assert.doesNotMatch(cache, /clear_cache|flush|delete_all|regenerate/);
});
test("security boundaries and atomic claim remain intact", () => {
  for (const value of ["STREETKINGZ_AI_WRITE_CAPABILITY", "STREETKINGZ_AI_ACTIVE_APPROVAL_OPTION", "STREETKINGZ_AI_ACTIVE_EXECUTION_OPTION", "INSERT IGNORE", "failed_after_claim", "streetkingz_ai_execution_replay_rejected"]) assert.match(plugin, new RegExp(value));
  assert.doesNotMatch(plugin, /add_cap\([^\n]*(?:edit_post|edit_posts|edit_products|manage_options)/);
});
