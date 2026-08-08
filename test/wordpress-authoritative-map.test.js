import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canonicalAuthoritativePost, mapRequiredElementorWidgets } from "../cms/wordpressAuthoritativeReader.js";
import { buildAuthoritativeCmsFieldMap, validateAuthoritativeCmsFieldMap } from "../cms/wordpressAuthoritativeMap.js";
import { renderAuthoritativeWritePlan, renderHumanMergeInput } from "../cms/renderAuthoritativeWritePlan.js";
import { parseFinalReviewMarkdown } from "../verification/currentPage.js";

async function mapped() {
  const [record, markdown, verification] = await Promise.all([
    readFile("test/fixtures/wordpress-authoritative-product-70.json", "utf8").then(JSON.parse),
    readFile("artifacts/human-review/heavy-duty-drying-towel-1200gsm/generation-final-review.md", "utf8"),
    readFile("artifacts/live-validation/current-page-verification-2026-08-08/heavy-duty-drying-towel-1200gsm/retrieval_001/current-page-verification.json", "utf8").then(JSON.parse)
  ]);
  const authoritativePost = canonicalAuthoritativePost(record, { request_count: 1 });
  const widgets = mapRequiredElementorWidgets(authoritativePost);
  return buildAuthoritativeCmsFieldMap({ authoritativePost, widgets, finalReview: parseFinalReviewMarkdown(markdown), verification });
}

test("authoritative mapping preserves exact rollback values, hashes and blocked fields", async () => {
  const map = await mapped();
  assert.deepEqual(validateAuthoritativeCmsFieldMap(map), []);
  assert.equal(map.mappings.title_headings.rollback_value, map.authoritative_fields.post_title);
  assert.equal(map.elementor_document.exact_raw_value, map.authoritative_rollback_values._elementor_data);
  for (const field of ["slug", "metadata", "schema", "differentiation"]) assert.ok(map.blocked_fields.includes(field));
});

test("description remains a human merge while comparison is bounded to its answer property", async () => {
  const map = await mapped();
  assert.equal(map.mappings.product_description_benefits.implementation_status, "REQUIRES_HUMAN_COPY_MERGE");
  assert.equal(map.mappings.comparisons.source, "wp_postmeta._elementor_data#40869c27.settings.editor");
  assert.ok(map.mappings.comparisons.content_that_survives.includes("accordion 4691e088"));
});

test("excerpt partial replacement protects additional items and detailed safety widget", async () => {
  const map = await mapped();
  assert.equal(map.mappings.clarity_trust.implementation_status, "REQUIRES_HUMAN_CHANGE");
  assert.ok(map.mappings.clarity_trust.content_that_survives.some((item) => /43d7d6f0/.test(item)));
  assert.match(renderAuthoritativeWritePlan(map), /awaiting_human_implementation_approval/);
  const mergeInput = renderHumanMergeInput(map, { evidenceIds: ["ev_test"] });
  assert.match(mergeInput, /Exact authoritative current description/);
  assert.match(mergeInput, /REQUIRES_HUMAN_COPY_MERGE/);
  assert.match(mergeInput, /`ev_test`/);
});
