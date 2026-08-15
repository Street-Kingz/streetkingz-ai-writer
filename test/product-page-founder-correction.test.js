import assert from "node:assert/strict";
import { test } from "node:test";
import { applyProductPageFounderCorrection } from "../editorial/productPageFounderCorrection.js";

test("founder product-page correction creates a new lineage without mutating the parent", () => {
  const parent = { sections: [{ section: "main_description", current: "old", proposed: "AI wording", decision: "EDIT" }] };
  const corrected = applyProductPageFounderCorrection({ proposal: parent, parentProposalPath: "proposal.json", parentProposalSha256: "a".repeat(64), field: "main_description", originalValue: "AI wording", correctedValue: "Human wording", reason: "Founder preference", createdAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(parent.sections[0].proposed, "AI wording");
  assert.equal(corrected.sections[0].proposed, "Human wording");
  assert.equal(corrected.provenance.founder_correction.source, "human_review");
  assert.equal(corrected.provenance.founder_correction.parent_proposal_sha256, "a".repeat(64));
});

test("founder correction fails closed when the parent value is not exact", () => {
  assert.throws(() => applyProductPageFounderCorrection({ proposal: { sections: [{ section: "main_description", proposed: "different" }] }, parentProposalPath: "proposal.json", parentProposalSha256: "a".repeat(64), field: "main_description", originalValue: "expected", correctedValue: "Human wording" }), /CORRECTION_ORIGINAL_VALUE_MISMATCH/);
});
