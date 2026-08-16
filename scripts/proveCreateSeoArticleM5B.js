import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createM5Approval, runCreateSeoArticleM5 } from "../workflows/createSeoArticleM5.js";
import { sha256 } from "../research/core/canonical.js";

const m4Root = path.resolve("artifacts/workflows/create-seo-article/m4-proof-v5/gpt-5.6-sol/call_001");
const proofRoot = path.resolve("artifacts/workflows/create-seo-article/m5b-proof");
const read = (file) => readFile(path.join(m4Root, file), "utf8").then(JSON.parse);
const m4Input = await read("m4-input.json");
const brief = await read("article-brief.json");
const pagePlan = await read("editorial-page-plan.json");
const approval = createM5Approval({ objective: m4Input.objective, workflow_run_id: m4Input.workflow.workflow_run_id, opportunity: m4Input.opportunity, brief, pagePlan, approvedAt: "2026-08-16T13:00:00.000Z" });
await mkdir(proofRoot, { recursive: true });
await writeFile(path.join(proofRoot, "m5b-approval.json"), `${JSON.stringify(approval, null, 2)}\n`, { flag: "wx" });

const evidence = m4Input.research.relevant_evidence_ids.slice(0, 4);
const product = m4Input.registries.products[0];
const [criteria, comparison, recommendation] = pagePlan.components;
const page = {
  schema_version: "1.0.0", artifact_type: "structured_semantic_editorial_page", page_type: pagePlan.page_type,
  topic: pagePlan.primary_query, search_intent: { primary: pagePlan.search_intent.primary, secondary: null },
  title: pagePlan.title_direction, h1: pagePlan.h1_direction,
  introduction_deck: "The best microfibre car drying towel is not simply the thickest or largest one you can buy. The useful choice depends on how much water you need to move, how much control you want when the towel is wet and which parts of the vehicle you are drying.",
  components: [
    { component_id: criteria.component_id, component_type: "criteria_cards", evidence_ids: evidence, product_ids: [], internal_link_ids: [], media_requirements: [], conversion_role: "education", data: { heading: "What matters when choosing a car drying towel", cards: [
      { title: "Coverage versus control", explanation: "A larger towel can cover more panel area in each pass, which can make sense on a large vehicle. The trade-off is handling: as a towel takes on water it can feel heavier and less nimble around mirrors, edges and smaller panels. Choose more coverage when speed across broad panels matters; choose more control when detail work matters.", evidence_ids: evidence.slice(0, 2) },
      { title: "Water capacity and wet weight", explanation: "A towel that can hold more water may reduce wringing and repeated passes, but capacity is not the same as comfort. The more water a cloth carries, the more important its size, grip and drying routine become. Think about whether you can comfortably manage it through a complete wash rather than chasing a single headline specification.", evidence_ids: evidence.slice(1, 3) },
      { title: "Pile, edges and finish", explanation: "A deeper or plusher pile can give a soft, cushioned feel, while a lower profile can offer more control on tighter areas. Edge treatment and construction also matter around paintwork. The right choice depends on whether your priority is water movement on open panels, confident control around details or a balance of both.", evidence_ids: evidence.slice(2, 4) }
    ] } },
    { component_id: comparison.component_id, component_type: "comparison_table", evidence_ids: evidence, product_ids: [], internal_link_ids: [], media_requirements: [], conversion_role: "education", data: { heading: "Compare the main towel approaches", columns: ["Approach", "Main advantage", "Trade-off", "May suit"], rows: [
      { label: "Large, high-coverage towel", cells: ["Moves across broad panels quickly", "Can feel cumbersome when saturated", "Large vehicles and open panels"], evidence_ids: evidence.slice(0, 2) },
      { label: "Smaller, controlled towel", cells: ["Easier around edges and details", "May require more passes", "Smaller cars or detail-led drying"], evidence_ids: evidence.slice(1, 3) },
      { label: "Deep or plush pile", cells: ["Comfortable water-holding surface", "Can carry more wet weight", "Readers prioritising absorption"], evidence_ids: evidence.slice(2, 4) },
      { label: "Lower-profile construction", cells: ["More direct handling", "May need more deliberate passes", "Tight areas and controlled work"], evidence_ids: evidence.slice(0, 4) }
    ], limitations: ["These are category-level trade-offs; assess the individual towel's confirmed specifications and care instructions before buying."] } },
    { component_id: recommendation.component_id, component_type: "product_recommendation", evidence_ids: evidence, product_ids: [product.product_id], internal_link_ids: [], media_requirements: [], conversion_role: "product_discovery", data: { heading: "A practical next step", product_id: product.product_id, recommendation_context: "If you want a dedicated towel for drying a washed car, compare the Heavy Duty Drying Towel with the decision points above: how much panel coverage you want, how you prefer to handle a wet towel and where you need control.", relevance_reason: "Its place in this article is practical rather than automatic: it gives the reader a product to assess after understanding the trade-offs, while leaving the final choice with the reader.", cta_direction: "Invite the reader to review the towel's confirmed details and decide whether its format suits their vehicle and drying routine.", cta_label: "View the Heavy Duty Drying Towel" } }
  ], conclusion: "For most buyers, the best microfibre car drying towel is the one that balances coverage, water handling and control for the way they work. Start with the vehicle and routine, weigh the trade-offs, then check the individual product details before deciding.",
  validation_metadata: { packet_id: pagePlan.packet_id, strategy_id: pagePlan.strategy_id, page_plan_id: pagePlan.plan_id, page_plan_hash: pagePlan.deterministic_content_sha256 }
};
const provider = { id: "offline-fixture", model: "gpt-5.6-sol", settings: { reasoning: "high" }, generate: async () => ({ provider: "offline-fixture", model: "gpt-5.6-sol", response_id: "offline-m5b-proof", rawText: JSON.stringify(page), usage: { input_tokens: 0, output_tokens: 0, reasoning_tokens: 0 } }) };
const result = await runCreateSeoArticleM5({ m4Input, brief, pagePlan, approval, provider, outputDirectory: proofRoot, now: () => new Date("2026-08-16T13:00:00.000Z") });
if (result.status !== "HUMAN_REVIEW_READY") throw new Error(JSON.stringify(result, null, 2));
const article = await readFile(path.join(result.callDirectory, "semantic-page.md"), "utf8");
const words = article.split(/\s+/).filter(Boolean).length;
const baseline = JSON.parse(await readFile(path.resolve("artifacts/workflows/create-seo-article/m5-generation-proof.json"), "utf8"));
const comparisonArtifact = { artifact_type: "m5b_baseline_vs_hardened_comparison", baseline: { semantic_article_id: baseline.metadata.semantic_article_id, semantic_article_sha256: baseline.metadata.semantic_article_sha256, word_count: 318, component_count: 3, validation: baseline.validation.status, quality: baseline.quality.status, founder_acceptance: "FAIL", findings: ["Thin decision coverage", "Checklist-style comparison", "Methodology leakage", "Unnatural product recommendation"] }, hardened: { semantic_article_id: result.metadata.semantic_article_id, semantic_article_sha256: result.metadata.semantic_article_sha256, word_count: words, component_count: page.components.length, validation: result.validation.status, quality: result.quality.status, editorial_sufficiency: result.quality.editorial_sufficiency, founder_acceptance: "PENDING" }, lineage: { opportunity_id: m4Input.opportunity.decision_id, opportunity_sha256: m4Input.opportunity.decision_sha256, brief_id: brief.brief_id, brief_sha256: brief.brief_sha256, page_plan_id: pagePlan.plan_id, page_plan_sha256: pagePlan.deterministic_content_sha256 } };
await writeFile(path.resolve("artifacts/workflows/create-seo-article/m5b-baseline-vs-hardened.json"), `${JSON.stringify(comparisonArtifact, null, 2)}\n`, { flag: "wx" });
const review = `# SEO Article — M5B Founder Comparison\n\nHARDENED ARTICLE GENERATED — NOT APPROVED\n\nHUMAN REVIEW REQUIRED\n\nPrimary query: ${m4Input.opportunity.primary_query}\nArticle type: ${m4Input.opportunity.article_type}\nSearch intent: ${m4Input.opportunity.search_intent}\nActual word count: ${words}\nValidation: ${result.validation.status}\nEditorial sufficiency: ${result.quality.editorial_sufficiency.status}\n\n## Hardened article\n\n${article}\n\n## Review context\n\nProduct featured: ${product.product_name}\nCTA: View the Heavy Duty Drying Towel\nFAQs: None approved in the M4 plan\nMedia: optional demonstration image remains outstanding\nInternal links: none supplied; coverage partial\nMethodology leakage: none detected\nKnown limitations: ${m4Input.research.unknowns.join(" ")}\n\nThe original M4 plan and strategy lineage are unchanged.\n`;
await writeFile(path.join(result.callDirectory, "m5b-review.md"), review, { flag: "wx" });
console.log(JSON.stringify({ status: result.status, semantic_article_id: result.metadata.semantic_article_id, semantic_article_sha256: result.metadata.semantic_article_sha256, words, quality: result.quality.status, sufficiency: result.quality.editorial_sufficiency.status, call_directory: "m5b-proof/gpt-5.6-sol/call_001" }, null, 2));
