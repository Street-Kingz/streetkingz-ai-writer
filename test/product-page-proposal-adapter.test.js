import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { mapProductPageProposal, prepareProductPageImplementationDryRun, readAuthoritativeImplementationRepresentation, renderCanonicalShortDescription, renderImplementationReview, validateEditableDescriptionStructure } from "../cms/productPageProposalAdapter.js";
import { sha256 } from "../research/core/canonical.js";
import { GUARDED_WRITER_SCOPE, validateBoundedWriterApproval } from "../cms/guardedWriter.js";

const proposalPath = "artifacts/editorial-product-page/heavy-duty-drying-towel-1200gsm/2026-08-15T16-30-00.000Z/product-page-proposal.json";
const authoritativePath = "artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1/authoritative-read-2026-08-08-v1.1.2-001/authoritative-cms-read.json";
const proposal = JSON.parse(fs.readFileSync(proposalPath));
const authoritative = JSON.parse(fs.readFileSync(authoritativePath));
const clone = (value) => structuredClone(value);

test("implementation representation uses Elementor for main description and keeps post_content as discovery content", () => {
  const current = readAuthoritativeImplementationRepresentation(authoritative);
  assert.equal(current.elementor.template_id, GUARDED_WRITER_SCOPE.template_id);
  assert.equal(current.elementor.description, authoritative.elementor_widgets.description.exact_stored_value);
  assert.equal(current.product.discovery_content, authoritative.fields.post_content);
  assert.notEqual(current.elementor.description, current.product.discovery_content);
  assert.equal(current.elementor.widgets.description.element_id, GUARDED_WRITER_SCOPE.elementor_targets.description.id);
});

test("short bullets use the existing canonical post_excerpt representation", () => {
  const html = renderCanonicalShortDescription(["One supported reason", "Another supported reason", "A third supported reason"]);
  assert.match(html, /a-unordered-list/);
  assert.match(html, /<li>One supported reason<\/li>/);
});

test("mapping keeps title and comparison, maps excerpt and Elementor description, and blocks safety", () => {
  const mapped = mapProductPageProposal({ proposal, authoritative, proposalArtifact: proposalPath, createdAt: "2026-08-15T00:00:00.000Z" });
  assert.equal(mapped.candidate_approval.status, "candidate");
  assert.equal(mapped.candidate_approval.runtime_installable, false);
  assert.equal(mapped.mapped_targets.find((f) => f.field_id === "post_title").change, false);
  assert.equal(mapped.mapped_targets.find((f) => f.field_id === "comparison").change, false);
  assert.equal(mapped.mapped_targets.find((f) => f.field_id === "post_excerpt").cms_target.field, "post_excerpt");
  assert.equal(mapped.mapped_targets.find((f) => f.field_id === "description").cms_target.element_id, "c80e718");
  assert.equal(mapped.blocked_targets[0].target, "43d7d6f0.settings.editor");
  assert.ok(mapped.preserved_targets.some((item) => item.target === "post_content"));
  assert.ok(mapped.preserved_targets.some((item) => item.target === "elementor:36512385"));
  assert.ok(mapped.preserved_targets.some((item) => item.target === "elementor:4691e088"));
});

test("proposal lineage is carried through candidate approval and dry-run", async () => {
  const hash = sha256(fs.readFileSync(proposalPath, "utf8"));
  const mapped = mapProductPageProposal({ proposal, authoritative, proposalArtifact: proposalPath, proposalArtifactSha256: hash });
  assert.equal(mapped.proposal_lineage.sha256, hash);
  assert.equal(mapped.candidate_approval.proposal_lineage.sha256, hash);
  const result = await prepareProductPageImplementationDryRun({ proposal, authoritative, proposalArtifact: proposalPath, proposalArtifactSha256: hash });
  assert.equal(result.dry_run.proposal_lineage.sha256, hash);
  assert.match(renderImplementationReview(result), /Source proposal: 2026-08-15T16-30-00\.000Z/);
  assert.doesNotMatch(renderImplementationReview(result), new RegExp(hash));
});

test("mismatched proposal artifact lineage fails closed", async () => {
  await assert.rejects(() => prepareProductPageImplementationDryRun({ proposal, authoritative, proposalArtifact: proposalPath, proposalArtifactSha256: "0".repeat(64) }), (error) => error.code === "PROPOSAL_LINEAGE_HASH_MISMATCH");
});

test("protected or unsupported substructure fails closed before candidate preparation", () => {
  assert.deepEqual(validateEditableDescriptionStructure("<p>Simple paragraph</p>"), []);
  assert.ok(validateEditableDescriptionStructure("<p>Text</p><details><summary>FAQ</summary><p>Answer</p></details>").includes("PROTECTED_OR_UNSUPPORTED_DESCRIPTION_SUBSTRUCTURE"));
  const source = clone(authoritative);
  const document = JSON.parse(source.template.raw_elementor_data);
  const visit = (items) => { for (const item of items) { if (item.id === "c80e718") item.settings.editor += "<details><summary>FAQ</summary><p>Answer</p></details>"; visit(item.elements || []); } };
  visit(document); source.template.raw_elementor_data = JSON.stringify(document); source.meta._elementor_data = source.template.raw_elementor_data;
  assert.throws(() => mapProductPageProposal({ proposal, authoritative: source }), (error) => error.code === "PROTECTED_OR_UNSUPPORTED_DESCRIPTION_SUBSTRUCTURE");
});

test("post_content FAQ markup cannot create an implementation FAQ target", () => {
  const source = clone(authoritative); source.fields.post_content += "<details><summary>FAQ</summary><p>Answer</p></details>";
  const mapped = mapProductPageProposal({ proposal, authoritative: source });
  assert.equal(mapped.unsupported_targets.some((item) => item.section === "faq"), false);
  assert.ok(mapped.preserved_targets.some((item) => item.target === "elementor:4691e088"));
});

test("unsupported sections are reported without widening bounded writer scope", () => {
  const source = clone(proposal); source.sections.push({ section: "faq", decision: "ADD", proposed: "Question" });
  const mapped = mapProductPageProposal({ proposal: source, authoritative });
  assert.deepEqual(mapped.unsupported_targets, [{ section: "faq", status: "NOT_IMPLEMENTABLE_BY_CURRENT_BOUNDED_WRITER" }]);
});

test("existing Guarded Writer dry-run accepts the candidate and performs no writes", async () => {
  let persisted = 0;
  const result = await prepareProductPageImplementationDryRun({ proposal, authoritative, proposalArtifact: proposalPath, createdAt: "2026-08-15T00:00:00.000Z" });
  assert.equal(result.validation.status, "PASS");
  assert.equal(result.dry_run.status, "PASS");
  assert.deepEqual(result.dry_run.product_diff.map((item) => item.path), ["post_excerpt"]);
  assert.equal(result.dry_run.elementor_semantic_diff.length, 1);
  assert.match(result.dry_run.elementor_semantic_diff[0].path, /c80e718.*settings\.editor$/);
  assert.equal(persisted, 0);
  assert.ok(result.rollback_snapshot_persisted_in_memory);
});

test("candidate targets cannot be redirected to another product, template, widget, metadata, price, stock or status", () => {
  const mapped = mapProductPageProposal({ proposal, authoritative });
  const fields = mapped.candidate_approval.approved_fields;
  fields[0].cms_target.post_id = 71;
  assert.throws(() => validateBoundedWriterApproval(mapped.candidate_approval), (error) => error.code === "CANDIDATE_APPROVAL_INVALID");
  assert.equal(fields.some((field) => ["metadata", "price", "stock", "post_status"].includes(field.field_id)), false);
});

test("technical traceability is retained while the human review hides hashes and internal metadata", () => {
  const mapped = mapProductPageProposal({ proposal, authoritative });
  const review = renderImplementationReview({ ...mapped, dry_run: { status: "PASS" } });
  assert.doesNotMatch(review, /[a-f0-9]{64}/);
  assert.doesNotMatch(review, /current_state_guards|approved_target_hashes|c80e718/);
  assert.equal(mapped.candidate_approval.current_state_guards.description_widget.length, 64);
  assert.equal(mapped.candidate_approval.approved_target_hashes.description.length, 64);
});
