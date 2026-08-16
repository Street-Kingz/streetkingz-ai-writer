import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createFileCreateSeoArticleIntelligenceResolver } from "../workflows/createSeoArticleIntelligence.js";
import { createFrozenM3ResearchRunner, runCreateSeoArticleM3 } from "../workflows/createSeoArticleM3.js";
import { projectValidatedPioToProductFacts } from "../research/productFactsProjection.js";
import { streetKingzGuidanceSnapshot } from "../seo-guidance/fixtures/streetkingzSnapshot.js";

const productUrl = "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/";
const product = "artifacts/product-intelligence-founder-validation/heavy-duty-drying-towel-1200gsm/2026-08-14T06-35-19-842Z/product-intelligence-corrected.json";
const business = "artifacts/business-intelligence/streetkingz-co-uk/2026-08-15T06-44-34-338Z/founder-validation/business-intelligence-validated.json";
const evidence = "artifacts/live-validation/dataforseo-keyword-ideas-2026-08-08/heavy-duty-drying-towel-1200gsm/run_2026-08-08T07-22-30-159Z_b9eff88a/evidence.json";
const pio = JSON.parse(await readFile(product, "utf8"));
const facts = projectValidatedPioToProductFacts({ productIntelligence: pio });
const decisionProvider = {
  id: "fixture-controlled-provider", model: "gpt-5.6-sol", settings: { api: "responses", reasoning: { effort: "high" }, strict_structured_output: true },
  requestPayload({ systemPrompt, userPrompt, responseSchema }) { return { model: this.model, reasoning: this.settings.reasoning, text: { format: { type: "json_schema", strict: true, schema: responseSchema } }, input: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }; },
  async generate({ responseSchema, userPrompt }) {
    const input = JSON.parse(userPrompt.split("INPUT:\n").at(-1));
    const primary = input.candidates.toSorted((a, b) => (b.product_term_matches.length - a.product_term_matches.length) || (b.serp.length - a.serp.length) || ((b.metrics.monthly_search_volume ?? -1) - (a.metrics.monthly_search_volume ?? -1)) || a.query.localeCompare(b.query, "en"))[0];
    const candidate = primary.query;
    return { provider: this.id, model: this.model, response_id: "fixture-response-001", rawText: JSON.stringify({ outcome: "ARTICLE_RECOMMENDED", article_type: "supporting_article", search_intent: "commercial_investigation", primary_query: candidate, supporting_queries: responseSchema.properties.supporting_queries.items.enum.filter((query) => query !== candidate).slice(0, 3), reader_problem: "Readers need practical guidance choosing a suitable car-drying towel.", proposed_angle: "Compare reader-relevant drying criteria and constructions using the observed mixed SERP intent.", rationale: "This candidate combines strong observed demand with a clear product-relevant reader problem and an article-suitable SERP; volume is considered alongside intent, usefulness and fit.", evidence_ids: [...primary.evidence_ids, ...primary.serp.slice(0, 2).map((item) => item.evidence_id)], alternatives_considered: input.candidates.filter((item) => item.query !== candidate).slice(0, 3).map((item) => ({ query: item.query, reason: "Retained as an alternative; the selected direction had stronger combined intent, usefulness and fit evidence." })), risks: ["Page-level competitor coverage was not fetched."], unknowns: ["Search Console coverage is optional and was not required for this decision."], confidence: "medium" }), usage: { input_tokens: 1200, output_tokens: 220 }};
  }
};
const result = await runCreateSeoArticleM3({
  input: { product_url: productUrl },
  resolveCandidates: createFileCreateSeoArticleIntelligenceResolver({ product, business }),
  runResearch: createFrozenM3ResearchRunner({ evidencePath: evidence }), decisionProvider,
  decisionOutputDirectory: "artifacts/workflows/create-seo-article/m3-opportunity-proof-v7", guidanceSnapshot: streetKingzGuidanceSnapshot
});
const proof = {
  objective: "create_seo_article", merchant_inputs_received: ["product_url"], product_url: productUrl,
  product: { resolved: result.intelligence?.product || null }, business: { resolved: result.intelligence?.business || null },
  projection: { artifact_type: facts.artifact_type, product_name: facts.product.name.value, category_type: facts.product.category_type.value, source_owner: facts.source_owner },
  research_seeds: ["product.name", "product.category_type"], keyword_candidates: result.packet?.candidates || [],
  serps_inspected: [...new Set((result.packet?.serp || []).map((item) => item.query))], search_console: "OPTIONAL / NOT REQUIRED",
  research_sufficiency: result.researchState?.sufficiency?.state || null, seo_guidance: { snapshot_id: streetKingzGuidanceSnapshot.snapshot_id, snapshot_sha256: streetKingzGuidanceSnapshot.snapshot_sha256, freshness_status: "CURRENT", sources: streetKingzGuidanceSnapshot.sources.map((source) => ({ id: source.id, url: source.url, authority_class: source.authority_class, category: source.category, content_hash: source.content_hash })) }, decision: result.decision || null,
  ai_decision: { model: result.aiRun?.metadata?.model || null, api: result.aiRun?.metadata?.api || null, reasoning: result.aiRun?.metadata?.reasoning || null, calls: result.aiRun?.metadata?.ai_calls || 0, usage: result.aiRun?.metadata?.usage || null, evidence_candidate_count: result.aiRun?.metadata?.evidence_count || null, validation: result.aiRun?.validation?.status || null, technical_artifact_directory: result.aiRun?.callDirectory ? result.aiRun.callDirectory.replace(`${process.cwd()}/`, "") : null, human_review_artifact: result.aiRun?.callDirectory ? `${result.aiRun.callDirectory.replace(`${process.cwd()}/`, "")}/opportunity-review.md` : null },
  next_stage: result.status === "article_brief_ready" ? "ARTICLE_BRIEF READY" : result.status, failure: result.failure || null,
  ai_calls: 0, external_provider_calls: 0, wordpress_calls: 0, publishing_attempts: 0,
  fixture: { evidence_path: evidence, product_path: product, business_path: business }
};
await mkdir("artifacts/workflows/create-seo-article", { recursive: true });
await writeFile("artifacts/workflows/create-seo-article/m3-seo-guidance-snapshot-v2.json", `${JSON.stringify(streetKingzGuidanceSnapshot, null, 2)}\n`, "utf8");
await writeFile("artifacts/workflows/create-seo-article/m3-research-opportunity-proof.json", `${JSON.stringify(proof, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: result.status, outcome: result.decision?.outcome, next_stage: proof.next_stage, artifact: "artifacts/workflows/create-seo-article/m3-research-opportunity-proof.json" }, null, 2));
