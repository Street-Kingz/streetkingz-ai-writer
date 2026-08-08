import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { sha256 } from "../research/core/canonical.js";
import { prepareGuardedDryRun, simulateCompensatingWrite, simulateRollback, validateWriterApproval } from "../cms/guardedWriter.js";

const base = "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1";
const approvalOriginal = JSON.parse(fs.readFileSync(`${base}/human-implementation-approval.json`));
const authoritativeOriginal = JSON.parse(fs.readFileSync(`${base}/authoritative-read-2026-08-08-v1.1.2-001/authoritative-cms-read.json`));
const clone = (value) => structuredClone(value);
const prepare = (approval = clone(approvalOriginal), authoritative = clone(authoritativeOriginal), persistRollbackSnapshot = async () => {}) => prepareGuardedDryRun({ approval, authoritative, persistRollbackSnapshot });

test("approved four-target dry run changes only two product fields and two Elementor properties", async () => {
  const result = await prepare();
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.product_diff.map((item) => item.path), ["post_excerpt", "post_title"]);
  assert.equal(result.elementor_semantic_diff.length, 2);
  assert.ok(result.elementor_semantic_diff.every((item) => /(?:c80e718|40869c27).*settings\.editor$/.test(item.path)));
  assert.ok(Object.values(result.blocked_area_verification).every(Boolean));
  assert.deepEqual(simulateRollback(result), { status: "PASS", mutation_applied: true, product_restored_exactly: true, template_restored_semantically: true, blocked_areas_restored_or_unchanged: true });
});

test("altered approval value and target hash mismatch fail closed", async () => {
  for (const mutation of [
    (approval) => { approval.approved_fields[0].exact_cms_value += " "; },
    (approval) => { approval.approved_fields[0].approved_target_sha256 = "0".repeat(64); }
  ]) {
    const approval = clone(approvalOriginal); mutation(approval);
    await assert.rejects(prepare(approval), (error) => error.code === "APPROVAL_INVALID");
  }
});

test("stale product title and excerpt hard stop without partial preparation", async () => {
  for (const field of ["post_title", "post_excerpt"]) {
    const source = clone(authoritativeOriginal); source.fields[field] += " drift";
    await assert.rejects(prepare(clone(approvalOriginal), source), (error) => error.code === `STALE_${field.toUpperCase()}`);
  }
});

test("stale full template, target widgets and protected safety widget hard stop", async () => {
  for (const id of [null, "c80e718", "40869c27", "43d7d6f0"]) {
    const source = clone(authoritativeOriginal);
    if (id === null) source.template.raw_elementor_data += " ";
    else {
      const document = JSON.parse(source.template.raw_elementor_data);
      const visit = (items) => { for (const item of items) { if (item.id === id) item.settings.editor += " drift"; visit(item.elements || []); } };
      visit(document); source.template.raw_elementor_data = JSON.stringify(document); source.meta._elementor_data = source.template.raw_elementor_data;
    }
    await assert.rejects(prepare(clone(approvalOriginal), source), (error) => error.code === "STALE_TEMPLATE_ELEMENTOR_DATA");
  }
});

test("missing and duplicate description or comparison widgets are rejected", async () => {
  for (const [id, mode] of [["c80e718", "missing"], ["c80e718", "duplicate"], ["40869c27", "missing"], ["40869c27", "duplicate"]]) {
    const source = clone(authoritativeOriginal);
    const document = JSON.parse(source.template.raw_elementor_data);
    const findParent = (items) => { for (const item of items) { const index = (item.elements || []).findIndex((child) => child.id === id); if (index >= 0) return { item, index }; const nested = findParent(item.elements || []); if (nested) return nested; } };
    const found = findParent(document);
    if (mode === "missing") found.item.elements.splice(found.index, 1); else found.item.elements.push(clone(found.item.elements[found.index]));
    const raw = JSON.stringify(document);
    source.template.raw_elementor_data = raw; source.meta._elementor_data = raw;
    const approval = clone(approvalOriginal); approval.current_state_guards.template_elementor_data = sha256(raw);
    await assert.rejects(prepare(approval, source));
  }
});

test("wrong accordion parent, product ID and template ID are rejected", async () => {
  const product = clone(authoritativeOriginal); product.post_id = 71;
  await assert.rejects(prepare(clone(approvalOriginal), product), (error) => error.code === "PRODUCT_IDENTITY_MISMATCH");
  const template = clone(authoritativeOriginal); template.template.id = 2004;
  await assert.rejects(prepare(clone(approvalOriginal), template), (error) => error.code === "TEMPLATE_IDENTITY_OR_APPLICABILITY_MISMATCH");
  const wrongParent = clone(approvalOriginal); wrongParent.approved_fields.find((field) => field.field_id === "comparison").cms_target.parent_element_id = "wrong";
  await assert.rejects(prepare(wrongParent), (error) => error.code === "APPROVAL_INVALID");
});

test("extra fields and attempted slug, metadata, FAQ, safety or third-widget changes are rejected", () => {
  for (const fieldId of ["post_name", "metadata", "faq_question", "safety_widget", "third_elementor_widget"]) {
    const approval = clone(approvalOriginal);
    approval.approved_fields.push({ field_id: fieldId, exact_cms_value: "forbidden" });
    assert.throws(() => validateWriterApproval(approval), (error) => error.code === "APPROVAL_INVALID");
  }
  for (const flag of ["slug_change_authorised", "metadata_change_authorised", "detailed_safety_widget_change_authorised", "unrelated_elementor_changes_authorised", "publication_authorised"]) {
    const approval = clone(approvalOriginal); approval.authorisation[flag] = true;
    assert.throws(() => validateWriterApproval(approval), (error) => error.code === "APPROVAL_INVALID");
  }
});

test("rollback persistence is mandatory and failure stops before mutation planning", async () => {
  await assert.rejects(prepareGuardedDryRun({ approval: clone(approvalOriginal), authoritative: clone(authoritativeOriginal) }), (error) => error.code === "ROLLBACK_PERSISTENCE_REQUIRED");
  await assert.rejects(prepare(clone(approvalOriginal), clone(authoritativeOriginal), async () => { throw new Error("disk full"); }), (error) => error.code === "ROLLBACK_PERSISTENCE_FAILED");
});

test("first and later simulated write failures invoke compensating rollback", async () => {
  const dryRun = await prepare();
  const first = await simulateCompensatingWrite({ dryRun, failAt: "product_fields" });
  assert.equal(first.rollback_verified, true);
  assert.deepEqual(first.completed_before_failure, []);
  const later = await simulateCompensatingWrite({ dryRun, failAt: "elementor_template" });
  assert.equal(later.rollback_verified, true);
  assert.deepEqual(later.completed_before_failure, ["product_fields"]);
});

test("rollback verification failure is a hard stop", async () => {
  const dryRun = await prepare();
  await assert.rejects(simulateCompensatingWrite({ dryRun, failAt: "elementor_template", rollbackVerificationFails: true }), (error) => error.code === "ROLLBACK_VERIFICATION_FAILED");
});
