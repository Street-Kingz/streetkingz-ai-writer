import test from "node:test";
import assert from "node:assert/strict";
import { buildDraftProofPackage, GUTENBERG_DRAFT_PROOF, validateGutenbergDraftContent } from "../rendering/wordpress-draft-proof.js";

test("draft proof is create-only, draft-only and has no content H1", () => {
  const pkg = buildDraftProofPackage();
  assert.equal(pkg.contract.operation, "CREATE_NEW_POST");
  assert.equal(pkg.contract.target.post_type, "post");
  assert.equal(pkg.contract.target.post_status, "draft");
  assert.equal(pkg.contract.authority.publish, false);
  assert.equal(pkg.contract.authority.edit_existing_posts, false);
  assert.equal(pkg.validation.h1_count, 0);
  assert.equal(pkg.contract.live_execution, false);
});

test("only approved core blocks are accepted", () => {
  const result = validateGutenbergDraftContent(GUTENBERG_DRAFT_PROOF.content);
  assert.equal(result.status, "PASS");
  assert.ok(result.block_names.includes("columns"));
  assert.ok(result.block_names.includes("image"));
});

test("scripts, iframes, shortcodes and Elementor markers fail closed", () => {
  for (const unsafe of ["<script>alert(1)</script>", "<iframe src=\"x\"></iframe>", "[gallery]", "data-elementor-id=\"1\"", "<!-- wp:custom/block -->"]) {
    assert.equal(validateGutenbergDraftContent(unsafe).status, "FAIL");
  }
});

test("H1 blocks are forbidden because the post title owns H1", () => {
  const result = validateGutenbergDraftContent("<!-- wp:heading {\"level\":1} --><h1>Bad</h1><!-- /wp:heading -->");
  assert.ok(result.errors.includes("CONTENT_H1_FORBIDDEN"));
});

test("exact hash and bounded cleanup are included without live execution", () => {
  const pkg = buildDraftProofPackage();
  assert.match(pkg.content_hash, /^[a-f0-9]{64}$/);
  assert.equal(pkg.contract.cleanup.require_exact_created_post_id, true);
  assert.equal(pkg.contract.cleanup.never_touch_existing_posts, true);
  assert.equal(pkg.contract.wordpress_writes, 0);
  assert.equal(pkg.contract.ai_calls, 0);
});

test("content cannot be replaced with invalid or empty draft", () => {
  assert.throws(() => buildDraftProofPackage({ content: "" }), /Invalid Gutenberg draft/);
  assert.throws(() => buildDraftProofPackage({ content: "<!-- wp:heading {\"level\":1} --><h1>x</h1><!-- /wp:heading -->" }), /Invalid Gutenberg draft/);
});
