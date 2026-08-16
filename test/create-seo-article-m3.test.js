import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createFileCreateSeoArticleIntelligenceResolver } from "../workflows/createSeoArticleIntelligence.js";
import { createFrozenM3ResearchRunner, runCreateSeoArticleM3 } from "../workflows/createSeoArticleM3.js";
import { projectValidatedPioToProductFacts } from "../research/productFactsProjection.js";
import { deriveKeywordIdeaSeeds } from "../research/providers/dataForSeoKeywordIdeas.js";

const URL = "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/";
const PRODUCT = "artifacts/product-intelligence-founder-validation/heavy-duty-drying-towel-1200gsm/2026-08-14T06-35-19-842Z/product-intelligence-corrected.json";
const BUSINESS = "artifacts/business-intelligence/streetkingz-co-uk/2026-08-15T06-44-34-338Z/founder-validation/business-intelligence-validated.json";
const EVIDENCE = "artifacts/live-validation/dataforseo-keyword-ideas-2026-08-08/heavy-duty-drying-towel-1200gsm/run_2026-08-08T07-22-30-159Z_b9eff88a/evidence.json";
const resolver = createFileCreateSeoArticleIntelligenceResolver({ product: PRODUCT, business: BUSINESS });

test("validated PIO projects deterministically and preserves merchant-neutral provenance", async () => {
  const pio = JSON.parse(await readFile(PRODUCT, "utf8"));
  const first = projectValidatedPioToProductFacts({ productIntelligence: pio });
  const second = projectValidatedPioToProductFacts({ productIntelligence: pio });
  assert.deepEqual(first, second);
  assert.equal(first.product.name.value, pio.product_intelligence_object.product_identity.product_name.value);
  assert.notEqual(first.source_owner, "Street Kingz");
  const evidence = { records: [{ provider_id: "product_facts", evidence_type: "product_fact", value: { field_path: "product.name", value: first.product.name.value }, evidence_id: "a" }, { provider_id: "product_facts", evidence_type: "product_fact", value: { field_path: "product.category_type", value: first.product.category_type.value }, evidence_id: "b" }] };
  assert.equal(deriveKeywordIdeaSeeds(evidence).length, 2);
});

test("M3 automatically researches frozen evidence and makes article_brief READY", async () => {
  const result = await runCreateSeoArticleM3({ input: { product_url: URL }, resolveCandidates: resolver, runResearch: createFrozenM3ResearchRunner({ evidencePath: EVIDENCE }) });
  assert.equal(result.status, "article_brief_ready");
  assert.equal(result.decision.outcome, "ARTICLE_RECOMMENDED");
  assert.equal(result.plan.current_stage, "article_brief");
  assert.equal(result.plan.stages[2].state, "complete");
  assert.equal(result.plan.stages[3].state, "complete");
  assert.equal(result.plan.stages[4].state, "ready");
  assert.equal(result.plan.workflow_input.product_url, URL.slice(0, -1));
  assert.equal(Object.hasOwn(result.plan.workflow_input, "keyword"), false);
});

test("insufficient research is distinct and does not advance to article brief", async () => {
  const result = await runCreateSeoArticleM3({ input: { product_url: URL }, resolveCandidates: resolver, runResearch: async () => ({ evidence: JSON.parse(await readFile(EVIDENCE, "utf8")), researchState: { objective: { type: "create_seo_article", contract_version: "1.0.0" }, sufficiency: { state: "insufficient" } } }) });
  assert.equal(result.status, "failed");
  assert.notEqual(result.plan.current_stage, "article_brief");
});

test("M3 is bounded and refuses absent research execution rather than pretending success", async () => {
  const result = await runCreateSeoArticleM3({ input: { product_url: URL }, resolveCandidates: resolver });
  assert.equal(result.status, "paused");
  assert.equal(result.plan.pause.required_stage, "research");
  assert.equal(result.plan.stages[3].state, "blocked");
});
