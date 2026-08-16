import test from "node:test";
import assert from "node:assert/strict";
import { buildArticleEvidencePack, deriveArticleResearchQuestions, validateArticleEvidencePack } from "../research/articleEvidence.js";

const opportunity = { outcome: "ARTICLE_RECOMMENDED", decision_id: "op_1", decision_sha256: "hash_1", primary_query: "best example", article_type: "supporting_article", search_intent: "commercial_investigation" };
const m4Input = { research: { research_state_id: "rs_1", evidence_artifact_id: "ea_1" }, registries: { products: [{ product_id: "prod_1" }] }, intelligence: { product: { product_id: "prod_1" } } };
const serpPacket = { serp: { observed_results: [{ title: "Example guide", description: "Absorbency and size", url: "https://example.test/guide", domain: "example.test", page_type: "editorial_guide", evidence_ids: ["ev_serp"] }], recurring_questions: [{ question: "What matters?", evidence_ids: ["ev_qa"] }], result_page_types: { editorial_guide: 1 } }, topic_model: { terminology: ["absorbency"] } };
const productFacts = [{ evidence_id: "pf_1", value: { field_path: "product.specifications[0].value", value: "1000GSM" }, retrieved_at: "2026-08-01T00:00:00Z" }];

test("M4A requires ARTICLE_RECOMMENDED and preserves opportunity lineage", () => {
  assert.throws(() => buildArticleEvidencePack({ opportunity: { ...opportunity, outcome: "NO_ARTICLE_RECOMMENDED" }, m4Input, serpPacket, productFacts }), /ARTICLE_RESEARCH_REQUIRES_ARTICLE_RECOMMENDED/);
  const pack = buildArticleEvidencePack({ opportunity, m4Input, serpPacket, productFacts, now: "2026-08-16T00:00:00Z" });
  assert.deepEqual(validateArticleEvidencePack(pack, { opportunity, m4Input }), []);
  assert.equal(pack.lineage.primary_query, opportunity.primary_query);
});

test("research questions and source/page budgets are bounded", () => {
  const questions = deriveArticleResearchQuestions({ opportunity, researchState: { serp_feature_observations: Array.from({ length: 30 }, (_, i) => ({ questions: [{ question: `Q${i}` }] })) }, productFacts });
  assert.equal(questions.length, 10);
  const pack = buildArticleEvidencePack({ opportunity, m4Input, serpPacket, productFacts });
  assert.equal(pack.competitor_coverage.pages_selected, 1);
  assert.equal(pack.sources.filter((s) => s.source_class === "FIRST_PARTY_PRODUCT_INTELLIGENCE").length, 1);
});

test("external and first-party evidence classes remain distinct and tampering fails", () => {
  const pack = buildArticleEvidencePack({ opportunity, m4Input, serpPacket, productFacts });
  assert.equal(pack.sources[0].source_class, "INDEPENDENT_EXPERT");
  assert.equal(pack.sources.at(-1).source_class, "FIRST_PARTY_PRODUCT_INTELLIGENCE");
  const tampered = structuredClone(pack); tampered.lineage.primary_query = "other query";
  assert.ok(validateArticleEvidencePack(tampered, { opportunity, m4Input }).includes("STRATEGY_DRIFT"));
  const unsafe = structuredClone(pack); unsafe.sources[0].source_url = "http://untrusted.test";
  assert.ok(validateArticleEvidencePack(unsafe, { opportunity, m4Input }).some((e) => e.startsWith("UNSAFE_SOURCE_URL")));
});
