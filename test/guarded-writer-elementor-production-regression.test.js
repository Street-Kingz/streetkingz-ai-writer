import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const base = "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1";
const production = JSON.parse(fs.readFileSync(`${base}/authoritative-read-2026-08-08-v1.1.2-001/authoritative-cms-read.json`, "utf8"));
const approval = JSON.parse(fs.readFileSync(`${base}/human-implementation-approval.json`, "utf8"));
const plugin = fs.readFileSync("wordpress-plugin/streetkingz-ai-guarded-writer/streetkingz-ai-guarded-writer.php", "utf8");
const original = JSON.parse(production.template.raw_elementor_data);
const clone = (value) => structuredClone(value);

function locateAll(items, id, parents = [], output = []) {
  for (const item of items) {
    if (item.id === id) output.push({ element: item, parents });
    locateAll(item.elements || [], id, [...parents, item.id], output);
  }
  return output;
}

function patch(document, id, value) {
  const matches = locateAll(document, id);
  assert.equal(matches.length, 1);
  assert.equal(typeof matches[0].element.settings.editor, "string");
  matches[0].element.settings.editor = value;
}

function diffs(before, after, path = []) {
  if (Object.is(before, after)) return [];
  if (typeof before !== typeof after || before === null || after === null || typeof before !== "object") return [path.join(".")];
  if (Array.isArray(before)) return before.flatMap((item, index) => diffs(item, after[index], [...path, `id:${item.id || index}`]));
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((key) => diffs(before[key], after[key], [...path, key]));
}

function approved(fieldId) {
  return approval.approved_fields.find((field) => field.field_id === fieldId).exact_cms_value;
}

test("preserved production template 2003 has the exact bounded document shape", () => {
  assert.equal(production.template.id, 2003);
  assert.equal(production.template.template_type, "product");
  assert.equal(production.template.elementor_version, "3.32.5");
  for (const id of ["c80e718", "4691e088", "40869c27", "43d7d6f0"]) assert.equal(locateAll(original, id).length, 1);
  assert.ok(locateAll(original, "40869c27")[0].parents.includes("4691e088"));
});

test("production document patches description and comparison only", () => {
  const patched = clone(original);
  const safety = locateAll(original, "43d7d6f0")[0].element.settings.editor;
  patch(patched, "c80e718", approved("description"));
  patch(patched, "40869c27", approved("comparison"));
  assert.deepEqual(diffs(original, patched), [
    "id:684db2f5.elements.id:7c792880.elements.id:c80e718.settings.editor",
    "id:2906391e.elements.id:efc0f2f.elements.id:4691e088.elements.id:1ac287a8.elements.id:40869c27.settings.editor"
  ]);
  assert.equal(locateAll(patched, "43d7d6f0")[0].element.settings.editor, safety);
});

test("Elementor Document save payload is decoded elements, not raw stored JSON", () => {
  const patched = clone(original);
  patch(patched, "c80e718", approved("description"));
  patch(patched, "40869c27", approved("comparison"));
  const payload = { elements: patched };
  assert.ok(Array.isArray(payload.elements));
  assert.equal(payload.elements[0].elType, "container");
  assert.match(plugin, /\$document->save\(\['elements' => \$elements\]\)/);
  assert.doesNotMatch(plugin, /update_post_meta\s*\(.*_elementor_data/s);
});

test("production locator does not retain PHP references into the rollback document", () => {
  const locator = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_find_elements"), plugin.indexOf("function streetkingz_ai_writer_patch_element"));
  assert.match(locator, /function streetkingz_ai_writer_find_elements\(array \$items/);
  assert.doesNotMatch(locator, /array &\$items|foreach \(\$items as \$index => &\$item\)|'element' => &\$item/);
});

test("bounded capability bridge covers Elementor's plural and per-post checks", () => {
  const bridge = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_map_template_save_capability"), plugin.indexOf("function streetkingz_ai_writer_canonical_document_hash"));
  assert.match(bridge, /\$cap === \$edit_posts && empty\(\$args\)/);
  assert.match(bridge, /\$cap === \$edit_post && \(int\) \(\$args\[0\]/);
  assert.match(bridge, /STREETKINGZ_AI_WRITE_TEMPLATE_ID/);
  assert.doesNotMatch(bridge, /add_cap|edit_products|manage_options/);
});

test("capability bridge is installed before document acquisition and removed in finally", () => {
  const save = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_save_elementor"), plugin.indexOf("function streetkingz_ai_writer_clear_persisted_state_caches"));
  assert.ok(save.indexOf("add_filter('map_meta_cap'") < save.indexOf("documents->get(STREETKINGZ_AI_WRITE_TEMPLATE_ID)"));
  assert.match(save, /finally[\s\S]*remove_filter\('map_meta_cap'/);
  assert.match(save, /unset\(\$GLOBALS\['streetkingz_ai_writer_template_save_scope'\]\)/);
});

test("save outcome records return semantics but trusts exact persisted state", () => {
  const save = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_save_elementor"), plugin.indexOf("function streetkingz_ai_writer_clear_persisted_state_caches"));
  assert.match(save, /save_return_type/);
  assert.match(save, /save_return_value/);
  assert.match(save, /post_save_persisted_template_sha256/);
  assert.match(save, /persisted_state_matches_expected/);
  assert.match(plugin, /\$elementor_persisted = .*persisted_matches_expected/);
});

test("truthy API return cannot override wrong persistence", () => {
  const request = plugin.slice(plugin.indexOf("function streetkingz_ai_guarded_writer_request"));
  assert.match(request, /if \(!\$elementor_persisted\)/);
  assert.doesNotMatch(request, /if \(\$elementor_result\)/);
});

test("false API return with exact persistence is not falsely failed", () => {
  const request = plugin.slice(plugin.indexOf("function streetkingz_ai_guarded_writer_request"));
  assert.match(request, /!empty\(\$elementor_result\['persisted_matches_expected'\]\)/);
  assert.doesNotMatch(request, /\$elementor_result === false/);
});

test("rollback skips a restore call when persisted template is already original", () => {
  const rollback = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_rollback"), plugin.indexOf("function streetkingz_ai_guarded_writer_request"));
  assert.match(rollback, /if \(!hash_equals\(\$diagnostics\['rollback_target_template_sha256'\], \$diagnostics\['pre_restore_persisted_template_sha256'\]\)\)/);
  assert.match(rollback, /'template_restore_called' => false/);
});

test("rollback judges restore by fresh persisted verification, not restore return", () => {
  const rollback = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_rollback"), plugin.indexOf("function streetkingz_ai_guarded_writer_request"));
  assert.match(rollback, /streetkingz_ai_writer_verify_state\(\$prepared, false, \$verification\)/);
  assert.doesNotMatch(rollback, /\$elementor === false/);
});

test("bounded diagnostics contain hashes and types but no content or credentials", () => {
  const save = plugin.slice(plugin.indexOf("function streetkingz_ai_writer_save_elementor"), plugin.indexOf("function streetkingz_ai_writer_clear_persisted_state_caches"));
  for (const field of ["elementor_version", "document_class", "document_type", "template_id", "save_return_type", "save_return_value", "pre_save_persisted_template_sha256", "expected_post_save_template_sha256", "post_save_persisted_template_sha256"]) assert.match(save, new RegExp(field));
  assert.doesNotMatch(save, /Authorization|Application Password|api_key|exact_cms_value/);
});

test("approved HTML survives the production save transformation", () => {
  const patched = clone(original);
  patch(patched, "c80e718", approved("description"));
  patch(patched, "40869c27", approved("comparison"));
  const roundTrip = JSON.parse(JSON.stringify(patched));
  assert.equal(locateAll(roundTrip, "c80e718")[0].element.settings.editor, approved("description"));
  assert.equal(locateAll(roundTrip, "40869c27")[0].element.settings.editor, approved("comparison"));
  assert.match(approved("description"), /<p>/);
});

test("semantic rollback of the production fixture restores every element", () => {
  const patched = clone(original);
  patch(patched, "c80e718", approved("description"));
  patch(patched, "40869c27", approved("comparison"));
  const restored = clone(original);
  assert.notDeepEqual(patched, original);
  assert.deepEqual(restored, original);
  assert.equal(diffs(original, restored).length, 0);
});
