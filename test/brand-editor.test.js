import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeBrandPage, applyBrandEditor } from "../brand/editor.js";
import { createBrandVoiceProfile } from "../brand/voice-profile.js";
import { STREET_KINGZ_BRAND_VOICE } from "../brand/street-kingz.js";

const page = JSON.parse(await readFile("artifacts/cornerstone/best-car-drying-towel/production-semantic-article-v1/semantic-page.json", "utf8"));

test("BrandVoiceProfile loads and generic editor works without Street Kingz", () => {
  const profile = createBrandVoiceProfile({ brand_name: "North Star Bakery", audience: "Home bakers", tone: ["warm"], sentence_style: "plain", personality: "helpful", forbidden_phrases: ["unlock"], preferred_phrases: ["keep it simple"], recommendation_style: "direct", founder_style: "first_person_reason", opinion_strength: "clear" });
  const input = { components: [{ component_id: "x", component_type: "rich_text_section", data: { paragraphs: ["Unlock a better bake."] } }] };
  const output = applyBrandEditor(input, profile);
  assert.equal(output.page.components[0].data.paragraphs[0], "a better bake.");
  assert.equal(output.product_references_preserved, true);
});

test("Street Kingz editor preserves meaning anchors and product references", () => {
  const beforeRefs = page.components.map((item) => item.data?.product_reference);
  const output = applyBrandEditor(page, STREET_KINGZ_BRAND_VOICE);
  assert.equal(output.product_references_preserved, true);
  assert.deepEqual(output.page.components.map((item) => item.component_id), page.components.map((item) => item.component_id));
  assert.deepEqual(output.page.components.map((item) => item.data?.product_reference), beforeRefs);
  assert.match(output.page.components.find((item) => item.component_type === "product_recommendation").data.relevance_reason, /^My pick is simple:/);
  assert.match(output.page.components.find((item) => item.component_type === "founder_note").data.opinion, /\bWe made this\b|^The reason we made this:/);
});

test("good content is preserved while weak recommendations are selectively improved", () => {
  const report = analyzeBrandPage(page, STREET_KINGZ_BRAND_VOICE);
  assert.ok(report.components.find((item) => item.component === "product_recommendation"));
  assert.equal(report.components.find((item) => item.component === "founder_note").rewrite_required, false);
  const weak = structuredClone(page);
  const product = weak.components.find((item) => item.component_type === "product_recommendation");
  product.data.relevance_reason = "The towel has useful absorption.";
  const edited = applyBrandEditor(weak, STREET_KINGZ_BRAND_VOICE);
  assert.match(edited.page.components.find((item) => item.component_type === "product_recommendation").data.relevance_reason, /^My pick is simple:/);
  assert.equal(edited.product_references_preserved, true);
});

test("unsupported claims are rejected rather than rewritten", () => {
  const invalid = { components: [{ component_id: "x", component_type: "rich_text_section", data: { paragraphs: ["This towel is guaranteed to work every time."] } }] };
  assert.throws(() => applyBrandEditor(invalid, STREET_KINGZ_BRAND_VOICE), /Unsupported claim/);
});

test("forbidden brand phrases are removed without changing Gutenberg adapter code", async () => {
  const output = applyBrandEditor({ components: [{ component_id: "x", component_type: "rich_text_section", data: { paragraphs: ["This is the ultimate solution and a game changer."] } }] }, STREET_KINGZ_BRAND_VOICE);
  assert.doesNotMatch(JSON.stringify(output.page), /ultimate solution|game changer/i);
  const adapter = await readFile("rendering/wordpress-native.js", "utf8");
  assert.doesNotMatch(adapter, /BrandVoiceProfile|forbidden_phrases|Street Kingz voice/i);
});
