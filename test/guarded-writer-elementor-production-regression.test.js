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
