import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildCmsFieldMap, resolveWordPressProductResource, validateCmsFieldMap, validateCmsPreWrite } from "../cms/wordpressProductMap.js";
import { renderCmsWritePlan } from "../cms/renderWritePlan.js";
import { parseFinalReviewMarkdown } from "../verification/currentPage.js";

const ROOT = "artifacts/live-validation/current-page-verification-2026-08-08/heavy-duty-drying-towel-1200gsm/retrieval_001";
const URL = "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/";

async function inputs() {
  const [pageHtml, verification, markdown, cmsResponse] = await Promise.all([
    readFile(`${ROOT}/raw/page.html`, "utf8"), readFile(`${ROOT}/current-page-verification.json`, "utf8").then(JSON.parse),
    readFile("artifacts/human-review/heavy-duty-drying-towel-1200gsm/generation-final-review.md", "utf8"),
    readFile("test/fixtures/wordpress-product-70.json", "utf8").then(JSON.parse)
  ]);
  const finalReview = parseFinalReviewMarkdown(markdown);
  const resource = resolveWordPressProductResource(pageHtml, URL);
  const cmsRetrieval = { requested_url: resource.endpoint, final_url: resource.endpoint, http_status: 200, retrieved_at: "2026-08-08T15:00:00.000Z", content_type: "application/json", content_hash: "fixture", response_size_bytes: 1, retrieval_count: 1 };
  const fieldMap = buildCmsFieldMap({ cmsResponse, cmsRetrieval, resource, verification, finalReview, pageHtml });
  return { pageHtml, verification, finalReview, cmsResponse, resource, fieldMap };
}

test("product ID and REST resource resolve consistently from live-page signals", async () => {
  const { resource } = await inputs();
  assert.equal(resource.product_post_id, 70);
  assert.equal(resource.signals.body_class, 70);
  assert.equal(resource.signals.gtm_internal_id, 70);
  assert.equal(resource.endpoint, "https://streetkingz.co.uk/wp-json/wp/v2/product/70?context=view");
});

test("unique title maps to post_title while slug remains blocked", async () => {
  const { fieldMap } = await inputs();
  const title = fieldMap.field_mappings.title_headings;
  assert.equal(title.field_identifier, "post_title");
  assert.equal(title.mapping_status, "SAFE_TO_WRITE_AFTER_HUMAN_APPROVAL");
  assert.equal(title.current_rendered_value, "Heavy Duty Drying Towel – 1200gsm");
  assert.equal(title.side_effect_boundaries.slug_change_authorised, false);
  assert.ok(fieldMap.blocked_fields.includes("post_name"));
});

test("description spread through post_content blocks destructive replacement and requires human merge", async () => {
  const { fieldMap } = await inputs();
  const description = fieldMap.field_mappings.product_description_benefits;
  assert.equal(description.field_identifier, "widget:c80e718:text-editor");
  assert.equal(description.mapping_status, "BLOCKED");
  assert.equal(description.proposed_operation, "requires_human_copy_merge");
  assert.equal(description.content_that_would_be_removed_by_verbatim_section_replacement.length, 3);
  for (const concept of ["90 × 60 cm sizing and control", "heavy-rinse positioning", "lay / pat / glide usage", "wettest panels wording"]) assert.ok(description.current_concepts.includes(concept));
});

test("blocked description preserves its diagnostic loss list without authorising replacement", async () => {
  const { cmsResponse, verification, finalReview, resource } = await inputs();
  const mismatched = structuredClone(cmsResponse);
  mismatched.content.rendered = "<p>Different stored content.</p>";
  const cmsRetrieval = { requested_url: resource.endpoint, final_url: resource.endpoint, http_status: 200, retrieved_at: "2026-08-08T15:00:00.000Z", content_type: "application/json", content_hash: "fixture", response_size_bytes: 1, retrieval_count: 1 };
  const { pageHtml } = await inputs();
  const fieldMap = buildCmsFieldMap({ cmsResponse: mismatched, cmsRetrieval, resource, verification, finalReview, pageHtml });
  assert.equal(fieldMap.field_mappings.product_description_benefits.mapping_status, "BLOCKED");
  assert.ok(fieldMap.field_mappings.product_description_benefits.content_that_would_be_removed_by_verbatim_section_replacement.length > 0);
  assert.equal(validateCmsFieldMap(fieldMap, { cmsResponse: mismatched, verification, finalReview }).some((error) => error.code === "DESTRUCTIVE_DESCRIPTION_REPLACEMENT"), false);
});

test("comparison maps uniquely inside post_content without authorising a second FAQ", async () => {
  const { fieldMap } = await inputs();
  const comparison = fieldMap.field_mappings.comparisons;
  assert.equal(comparison.field_identifier, "nested-accordion:4691e088/answer-widget:40869c27");
  assert.equal(comparison.mapping_status, "BLOCKED");
  assert.equal(comparison.content_that_would_be_removed.length, 1);
  assert.ok(comparison.content_that_survives_unchanged.includes("all other FAQs"));
});

test("short trust claims map to post_excerpt while detailed safety FAQ remains in post_content", async () => {
  const { fieldMap } = await inputs();
  const trust = fieldMap.field_mappings.clarity_trust;
  assert.equal(trust.field_identifier, "post_excerpt");
  assert.equal(trust.mapping_status, "REQUIRES_HUMAN_CHANGE");
  assert.ok(trust.content_that_survives_unchanged.some((item) => /scratch my paint/i.test(item)));
  assert.equal(trust.detailed_safety_guidance_source, "elementor_rendered_widget:nested-accordion:4691e088/answer-widget:43d7d6f0");
});

test("blocked metadata, slug and unrelated fields never become mapped writes", async () => {
  const { fieldMap } = await inputs();
  for (const field of ["metadata", "post_name", "schema", "images", "pricing", "inventory", "product_attributes", "specifications", "care_usage", "internal_links", "additional_faqs", "differentiation"]) assert.ok(fieldMap.blocked_fields.includes(field));
  assert.deepEqual(Object.keys(fieldMap.field_mappings), ["title_headings", "product_description_benefits", "comparisons", "clarity_trust"]);
  assert.equal(fieldMap.write_operations_performed, 0);
});

test("stored current values, hashes and rollback sources validate", async () => {
  const { fieldMap, cmsResponse, verification, finalReview } = await inputs();
  assert.deepEqual(validateCmsFieldMap(fieldMap, { cmsResponse, verification, finalReview }), []);
  for (const mapping of Object.values(fieldMap.field_mappings)) {
    assert.ok(mapping.current_stored_value.length);
    assert.equal(mapping.cms_current_value_sha256.length, 64);
  }
});

test("live and CMS field drift both stop future write eligibility", async () => {
  const { fieldMap } = await inputs();
  const currentCmsValues = Object.fromEntries(Object.entries(fieldMap.field_mappings).map(([area, mapping]) => [area, mapping.current_stored_value]));
  assert.equal(validateCmsPreWrite(fieldMap, { currentLiveHash: fieldMap.verified_live_content_hash, currentCmsValues }).eligible, false);
  assert.ok(validateCmsPreWrite(fieldMap, { currentLiveHash: fieldMap.verified_live_content_hash, currentCmsValues }).errors.some((error) => error.code === "RAW_CMS_VALUE_REQUIRED"));
  const liveDrift = validateCmsPreWrite(fieldMap, { currentLiveHash: "changed", currentCmsValues });
  assert.ok(liveDrift.errors.some((error) => error.code === "LIVE_PAGE_DRIFT"));
  currentCmsValues.comparisons = "changed";
  const cmsDrift = validateCmsPreWrite(fieldMap, { currentLiveHash: fieldMap.verified_live_content_hash, currentCmsValues });
  assert.ok(cmsDrift.errors.some((error) => error.code === "CMS_FIELD_DRIFT" && error.area === "comparisons"));
});

test("write plan exposes removed content, guards and awaiting approval without invoking writes", async () => {
  const { fieldMap } = await inputs();
  const markdown = renderCmsWritePlan(fieldMap);
  assert.match(markdown, /awaiting_human_implementation_approval/);
  assert.match(markdown, /90 × 60 cm/);
  assert.match(markdown, /Observed value \(not a complete rollback source\)/);
  assert.match(markdown, /cannot serve as a lossless rollback source/);
  assert.match(markdown, /No WordPress write or publication operation was performed/);
  assert.match(markdown, /post_name/);
});
