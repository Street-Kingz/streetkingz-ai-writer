import test from "node:test";
import assert from "node:assert/strict";
import { runCreateSeoArticleM5 } from "../workflows/createSeoArticleM5.js";
import { renderSemanticPageHtml } from "../rendering/html.js";
import { reviewEditorialDraftQuality } from "../editorial/draft-quality.js";

const base = { objective: "create_seo_article", workflow: { workflow_run_id: "run_1" }, opportunity: { decision_id: "op_1", decision_sha256: "op_hash", primary_query: "query", article_type: "supporting_article", search_intent: "commercial_investigation", supporting_queries: [] }, intelligence: { product: { product_id: "prod_1", product_url: "https://example.test/p", evidence_ids: ["ev_1"] }, business: {}, eic: {} }, research: { research_state_id: "rs", evidence_artifact_id: "ea", relevant_evidence_ids: ["ev_1"], unknowns: [] }, seo_guidance: { snapshot_id: "sg", snapshot_sha256: "sg_hash", freshness_status: "CURRENT", records: [] }, registries: { products: [{ product_id: "prod_1", product_url: "https://example.test/p", product_name: "Example" }], internal_links: [] } };
const brief = { brief_id: "brief_1", brief_sha256: "", primary_query: "query", article_type: "supporting_article", search_intent: "commercial_investigation" };
const plan = { plan_id: "plan_1", deterministic_content_sha256: "", brief_id: "brief_1", brief_sha256: "", primary_query: "query", search_intent: { primary: "commercial_investigation" }, strategy_id: "op_1", packet_id: "ea", components: [{ component_id: "c1", component_type: "criteria_cards", evidence_ids: ["ev_1"], product_ids: [], internal_link_ids: [], media_requirements: [] }], component_sequence: ["c1"], component_requirements: { required_component_types: ["criteria_cards"], ordering_rules: [] }, provenance: { opportunity_decision_sha256: "op_hash", seo_guidance_snapshot_id: "sg", seo_guidance_snapshot_sha256: "sg_hash", freshness_status: "CURRENT" } };
const provider = { model: "gpt-5.6-sol", generate: async () => ({ provider: "fixture", model: "gpt-5.6-sol", rawText: "{}", usage: {} }) };

test("M5 blocks before AI when approval is not exact", async () => {
  const result = await runCreateSeoArticleM5({ m4Input: base, brief, pagePlan: plan, approval: {}, provider, outputDirectory: "/tmp/m5-test-no-call" });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.ai_calls, 0);
});

test("renderer resolves CTA internal links through the registry", () => {
  const page = { h1: "Test", introduction_deck: "Intro", components: [{ component_id: "c", component_type: "call_to_action", evidence_ids: [], product_ids: [], internal_link_ids: ["link_1"], media_requirements: [], conversion_role: "education", data: { heading: "Next", body: "Read on", cta_direction: "Read", product_id: null, internal_link_id: "link_1" } }] };
  const html = renderSemanticPageHtml(page, { allowlists: { products: [], internal_links: [{ link_id: "link_1", destination_url: "https://example.test/guide", anchor_label: "Guide" }] } });
  assert.ok(html.includes('href="https://example.test/guide"'));
  assert.doesNotMatch(html, /undefined/);
});

test("commercial-investigation quality rejects checklist-only comparison and methodology leakage", () => {
  const page = { components: [
    { component_type: "criteria_cards", data: { cards: [{ explanation: "Look for absorbency and coverage when choosing a towel." }, { explanation: "Size and construction matter for handling." }] } },
    { component_type: "comparison_table", data: { rows: [{ cells: ["A useful surface", "Fewer passes"] }, { cells: ["A controllable size", "Larger panels"] }, { cells: ["A suitable finish", "More confidence"] }] } },
    { component_type: "product_recommendation", data: { recommendation_context: "The validated product is a relevant example." } }
  ] };
  const result = reviewEditorialDraftQuality(page, { plan: { search_intent: { primary: "commercial_investigation" } } });
  assert.equal(result.status, "FAIL");
  assert.ok(result.editorial_sufficiency.issues.some((item) => item.code === "COMPARISON_TOO_GENERIC"));
  assert.ok(result.editorial_sufficiency.issues.some((item) => item.code === "METHODOLOGY_LEAKAGE"));
});

test("safe category explanation can pass without a fixed word-count rule", () => {
  const page = { components: [
    { component_type: "criteria_cards", data: { cards: [
      { explanation: "A larger towel can cover more panel area, but it may become less manageable as it takes on water. That can suit someone working across a large vehicle, while a smaller towel may offer more control around edges." },
      { explanation: "A deeper pile can hold more water, while a lower profile may feel easier to control on smaller panels. The useful choice depends on the vehicle and the way you prefer to dry it." }
    ] } },
    { component_type: "comparison_table", data: { rows: [
      { cells: ["Larger coverage", "More area per pass, but less control when wet", "Suits larger panels"] },
      { cells: ["Smaller control", "Easier around edges, but may need more passes", "Suits detail work"] },
      { cells: ["Deeper pile", "Holds more water, while adding wet weight", "Suits water-heavy drying"] }
    ] } }
  ] };
  const result = reviewEditorialDraftQuality(page, { plan: { search_intent: { primary: "commercial_investigation" } } });
  assert.equal(result.editorial_sufficiency.status, "PASS");
});

test("product intelligence utilisation is measured without requiring a fixed fact count", () => {
  const page = { components: [
    { component_type: "criteria_cards", data: { cards: [{ explanation: "A larger towel covers more area, but can be harder to handle when wet. That suits broad panels, while a smaller towel gives more control around edges." }, { explanation: "A dense towel can hold more water, while adding saturated weight. Choose the balance that fits your vehicle and routine." }], evidence_ids: ["pf_size", "pf_gsm"] } },
    { component_type: "comparison_table", data: { rows: [{ cells: ["More capacity", "Heavier when wet", "Large panels"] }, { cells: ["More control", "Less coverage", "Detail work"] }, { cells: ["Plush construction", "Softer feel", "Careful drying"] }] } },
    { component_type: "product_recommendation", data: { recommendation_context: "A dense towel may suit a larger vehicle when capacity matters." } }
  ] };
  const result = reviewEditorialDraftQuality(page, { plan: { search_intent: { primary: "commercial_investigation" } }, productFactEvidence: [{ evidence_id: "pf_size" }, { evidence_id: "pf_gsm" }, { evidence_id: "pf_unused" }] });
  assert.equal(result.product_intelligence_utilisation.status, "PASS");
  assert.equal(result.product_intelligence_utilisation.facts_used, 2);
});

test("customer prose cannot narrate editorial selection or evidence policy", () => {
  const page = { components: [{ component_type: "product_recommendation", data: { recommendation_context: "Its place in this article is practical rather than automatic; according to the evidence, it is a relevant example." } }] };
  const result = reviewEditorialDraftQuality(page, { plan: { search_intent: { primary: "commercial_investigation" } } });
  assert.equal(result.status, "FAIL");
  assert.ok(result.issues.some((item) => item.code === "METHODOLOGY_LEAKAGE"));
});
