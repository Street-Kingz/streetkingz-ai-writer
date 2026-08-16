import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createFileCreateSeoArticleIntelligenceResolver } from "../workflows/createSeoArticleIntelligence.js";
import { createFrozenM3ResearchRunner, runCreateSeoArticleM3 } from "../workflows/createSeoArticleM3.js";
import { projectValidatedPioToProductFacts } from "../research/productFactsProjection.js";

const productUrl = "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/";
const product = "artifacts/product-intelligence-founder-validation/heavy-duty-drying-towel-1200gsm/2026-08-14T06-35-19-842Z/product-intelligence-corrected.json";
const business = "artifacts/business-intelligence/streetkingz-co-uk/2026-08-15T06-44-34-338Z/founder-validation/business-intelligence-validated.json";
const evidence = "artifacts/live-validation/dataforseo-keyword-ideas-2026-08-08/heavy-duty-drying-towel-1200gsm/run_2026-08-08T07-22-30-159Z_b9eff88a/evidence.json";
const pio = JSON.parse(await readFile(product, "utf8"));
const facts = projectValidatedPioToProductFacts({ productIntelligence: pio });
const result = await runCreateSeoArticleM3({
  input: { product_url: productUrl },
  resolveCandidates: createFileCreateSeoArticleIntelligenceResolver({ product, business }),
  runResearch: createFrozenM3ResearchRunner({ evidencePath: evidence })
});
const proof = {
  objective: "create_seo_article", merchant_inputs_received: ["product_url"], product_url: productUrl,
  product: { resolved: result.intelligence?.product || null }, business: { resolved: result.intelligence?.business || null },
  projection: { artifact_type: facts.artifact_type, product_name: facts.product.name.value, category_type: facts.product.category_type.value, source_owner: facts.source_owner },
  research_seeds: ["product.name", "product.category_type"], keyword_candidates: result.packet?.candidates || [],
  serps_inspected: [...new Set((result.packet?.serp || []).map((item) => item.query))], search_console: "OPTIONAL / NOT REQUIRED",
  research_sufficiency: result.researchState?.sufficiency?.state || null, decision: result.decision || null,
  next_stage: result.status === "article_brief_ready" ? "ARTICLE_BRIEF READY" : result.status,
  ai_calls: 0, external_provider_calls: 0, wordpress_calls: 0, publishing_attempts: 0,
  fixture: { evidence_path: evidence, product_path: product, business_path: business }
};
await mkdir("artifacts/workflows/create-seo-article", { recursive: true });
await writeFile("artifacts/workflows/create-seo-article/m3-research-opportunity-proof.json", `${JSON.stringify(proof, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: result.status, outcome: result.decision?.outcome, next_stage: proof.next_stage, artifact: "artifacts/workflows/create-seo-article/m3-research-opportunity-proof.json" }, null, 2));
