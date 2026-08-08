import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildHumanImplementationApproval, validateHumanImplementationApproval } from "../cms/humanImplementationApproval.js";
import { sha256 } from "../research/core/canonical.js";

function validApproval() {
  return buildHumanImplementationApproval({ approvedAt: "2026-08-08T12:00:00.000Z", reviewArtifact: "final-human-implementation-review-v2.md", reviewArtifactSha256: "a".repeat(64) });
}

test("exact approved values validate with separate current-state and target hashes", () => {
  const approval = validApproval();
  assert.deepEqual(validateHumanImplementationApproval(approval), { valid: true, errors: [] });
  assert.notEqual(approval.current_state_guards.post_title, approval.approved_target_hashes.post_title);
  assert.notEqual(approval.current_state_guards.post_excerpt, approval.approved_target_hashes.post_excerpt);
});

test("persisted human approval artifact validates and remains bound to its immutable review", () => {
  const artifactPath = "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1/human-implementation-approval.json";
  const approval = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  assert.deepEqual(validateHumanImplementationApproval(approval), { valid: true, errors: [] });
  assert.equal(sha256(fs.readFileSync(approval.source_review.artifact)), approval.source_review.sha256);
});

test("altering an exact target after approval is rejected", () => {
  const approval = structuredClone(validApproval());
  approval.approved_fields.find((field) => field.field_id === "description").exact_cms_value += " ";
  const result = validateHumanImplementationApproval(approval);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("APPROVED_VALUE_CHANGED:description"));
  assert.ok(result.errors.includes("TARGET_HASH_MISMATCH:description"));
});

test("blocked fields and targets outside the exact allowlist are rejected", () => {
  const blocked = structuredClone(validApproval());
  blocked.approved_fields.push({ field_id: "post_name", exact_cms_value: "new-slug" });
  assert.ok(validateHumanImplementationApproval(blocked).errors.includes("BLOCKED_OR_UNKNOWN_FIELD:post_name"));
  const retargeted = structuredClone(validApproval());
  retargeted.approved_fields.find((field) => field.field_id === "comparison").cms_target.element_id = "43d7d6f0";
  assert.ok(validateHumanImplementationApproval(retargeted).errors.includes("TARGET_OUTSIDE_ALLOWLIST:comparison"));
});

test("publication and safety-widget authorisation are rejected", () => {
  const approval = structuredClone(validApproval());
  approval.authorisation.publication_authorised = true;
  approval.detailed_safety_widget.status = "approved";
  const result = validateHumanImplementationApproval(approval);
  assert.ok(result.errors.includes("FORBIDDEN_AUTHORISATION:publication_authorised"));
  assert.ok(result.errors.includes("SAFETY_WIDGET_NOT_BLOCKED"));
});

test("malformed approved HTML fails semantic and structural validation", () => {
  const approval = structuredClone(validApproval());
  const excerpt = approval.approved_fields.find((field) => field.field_id === "post_excerpt");
  excerpt.exact_cms_value = excerpt.exact_cms_value.replace("</li>", "");
  excerpt.approved_target_sha256 = "0".repeat(64);
  const result = validateHumanImplementationApproval(approval);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith("post_excerpt:")));
});
