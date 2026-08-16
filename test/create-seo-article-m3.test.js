import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createFileCreateSeoArticleIntelligenceResolver } from "../workflows/createSeoArticleIntelligence.js";
import { createFrozenM3ResearchRunner, runCreateSeoArticleM3 } from "../workflows/createSeoArticleM3.js";
import { projectValidatedPioToProductFacts } from "../research/productFactsProjection.js";
import { deriveKeywordIdeaSeeds } from "../research/providers/dataForSeoKeywordIdeas.js";
import { buildArticleOpportunityAiInput } from "../workflows/createSeoArticleOpportunity.js";
import { validateArticleOpportunityAiOutput, runControlledArticleOpportunityDecision } from "../workflows/createSeoArticleOpportunityAi.js";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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
  const result = await runCreateSeoArticleM3({ input: { product_url: URL }, resolveCandidates: resolver, runResearch: async () => ({ evidencePath: EVIDENCE, decision: { outcome: "ARTICLE_RECOMMENDED", article_type: "supporting_article", search_intent: "mixed", primary_query: "microfiber towel for drying car", supporting_queries: [], reader_problem: "A practical reader problem", rationale: "Fixture decision for stage transition", evidence_ids: [] } }) });
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

test("opportunity AI input is bounded and validation rejects non-candidate or invented claims", () => {
  const input = buildArticleOpportunityAiInput({ packet: { product: { subject_id: "p", product_name: "Widget", product_url: URL, evidence_ids: ["pf"] }, candidates: [{ query: "how to use widget", metrics: { monthly_search_volume: 10 }, product_term_matches: ["widget"], evidence_ids: ["kw"], serp: [{ evidence_id: "serp", evidence_type: "serp_organic_result", query: "how to use widget", value: { title: "Guide" } }] }], serp: [], search_console: "unknown" }, researchState: { sufficiency: { state: "sufficient" } }, intelligence: null });
  assert.equal(input.objective, "create_seo_article");
  assert.equal(input.candidates.length, 1);
  assert.deepEqual(validateArticleOpportunityAiOutput({ outcome: "ARTICLE_RECOMMENDED", article_type: "supporting_article", search_intent: "informational", primary_query: "other query", supporting_queries: [], reader_problem: "x", proposed_angle: "x", rationale: "x", evidence_ids: ["kw"], alternatives_considered: [], risks: [], unknowns: [], confidence: "medium" }, input).some((error) => /candidate/.test(error)), true);
  assert.deepEqual(validateArticleOpportunityAiOutput({ outcome: "ARTICLE_RECOMMENDED", article_type: "supporting_article", search_intent: "informational", primary_query: "how to use widget", supporting_queries: [], reader_problem: "x", proposed_angle: "x", rationale: "x", evidence_ids: ["unknown"], metrics: { monthly_search_volume: 99 }, alternatives_considered: [], risks: [], unknowns: [], confidence: "medium" }, input).length > 0, true);
});

test("controlled opportunity decision performs one injected call and never volume-only falls back", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "m3-opportunity-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const input = { objective: "create_seo_article", product: { subject_id: "p", product_name: "Widget", product_url: URL, evidence_ids: ["pf"] }, candidates: [{ query: "high volume widget", metrics: { monthly_search_volume: 9000 }, product_term_matches: ["widget"], evidence_ids: ["kw1"], serp: [] }, { query: "how to use widget", metrics: { monthly_search_volume: 100 }, product_term_matches: ["widget"], evidence_ids: ["kw2"], serp: [] }], search_console: "unknown", research_sufficiency: { state: "sufficient" } };
  let calls = 0;
  const provider = { id: "fixture", model: "gpt-5.6-sol", settings: { api: "responses" }, async generate() { calls += 1; return { provider: "fixture", model: "gpt-5.6-sol", rawText: JSON.stringify({ outcome: "ARTICLE_RECOMMENDED", article_type: "how_to", search_intent: "informational", primary_query: "how to use widget", supporting_queries: [], reader_problem: "A practical question", proposed_angle: "A useful guide", rationale: "Intent and reader usefulness outweigh raw demand.", evidence_ids: ["kw2"], alternatives_considered: [{ query: "high volume widget", reason: "Less article-suitable intent." }], risks: [], unknowns: [], confidence: "medium" }), usage: { input_tokens: 10, output_tokens: 10 } }; } };
  const result = await runControlledArticleOpportunityDecision({ input, provider, outputDirectory: directory });
  assert.equal(calls, 1);
  assert.equal(result.decision.primary_query, "how to use widget");
  assert.equal(result.validation.status, "PASS");
});
