import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createM5Approval, runCreateSeoArticleM5 } from "../workflows/createSeoArticleM5.js";
import { sha256 } from "../research/core/canonical.js";

const root = path.resolve("artifacts/workflows/create-seo-article/m5-proof/gpt-5.6-sol/call_001");
const m4Root = path.resolve("artifacts/workflows/create-seo-article/m4-proof-v5/gpt-5.6-sol/call_001");
const read = (file) => readFile(path.join(m4Root, file), "utf8").then(JSON.parse);

const m4Input = await read("m4-input.json");
const brief = await read("article-brief.json");
const pagePlan = await read("editorial-page-plan.json");
const approval = createM5Approval({ objective: m4Input.objective, workflow_run_id: m4Input.workflow.workflow_run_id, opportunity: m4Input.opportunity, brief, pagePlan, approvedAt: "2026-08-16T12:00:00.000Z" });
await mkdir(path.resolve("artifacts/workflows/create-seo-article/m5-proof"), { recursive: true });
await writeFile(path.resolve("artifacts/workflows/create-seo-article/m5-proof/m5-approval.json"), `${JSON.stringify(approval, null, 2)}\n`, { flag: "w" });

const evidence = m4Input.research.relevant_evidence_ids.slice(0, 4);
const product = m4Input.registries.products[0];
const slots = pagePlan.components;
const page = {
  schema_version: "1.0.0", artifact_type: "structured_semantic_editorial_page", page_type: pagePlan.page_type,
  topic: pagePlan.primary_query, search_intent: { primary: pagePlan.search_intent.primary, secondary: null },
  title: pagePlan.title_direction, h1: pagePlan.h1_direction,
  introduction_deck: "Choosing a car drying towel is less about chasing one headline specification and more about matching absorbency, handling and finish to the way you wash your vehicle.",
  components: [
    { component_id: slots[0].component_id, component_type: "criteria_cards", evidence_ids: evidence, product_ids: [], internal_link_ids: [], media_requirements: [], conversion_role: "education", data: { heading: "What matters when choosing a car drying towel", cards: [
      { title: "Absorbency and coverage", explanation: "Look for a towel that can take on water efficiently while covering a useful area of the vehicle. That helps reduce the number of passes without asking you to drag a saturated cloth across the paint.", evidence_ids: evidence.slice(0, 2) },
      { title: "Handling and size", explanation: "A towel needs to be large enough to make progress but manageable around mirrors, edges and smaller panels. The right balance depends on the vehicle and how you prefer to work.", evidence_ids: evidence.slice(1, 3) },
      { title: "Construction and finish", explanation: "Pile, edge treatment and overall construction affect how confidently the towel can be used on delicate painted surfaces. Treat these as part of the decision rather than relying on GSM alone.", evidence_ids: evidence.slice(2, 4) }
    ] } },
    { component_id: slots[1].component_id, component_type: "comparison_table", evidence_ids: evidence, product_ids: [], internal_link_ids: [], media_requirements: [], conversion_role: "education", data: { heading: "Compare the main towel options", columns: ["Criterion", "What to look for", "Why it matters"], rows: [
      { label: "Water handling", cells: ["A useful absorbent surface", "Fewer repeated passes"], evidence_ids: evidence.slice(0, 2) },
      { label: "Coverage", cells: ["A size you can control", "Efficient work on larger panels"], evidence_ids: evidence.slice(1, 3) },
      { label: "Finish", cells: ["A construction suited to paintwork", "More confidence around the vehicle"], evidence_ids: evidence.slice(2, 4) }
    ], limitations: ["Search evidence describes the decision landscape; it does not replace checking a towel's own validated product information."] } },
    { component_id: slots[2].component_id, component_type: "product_recommendation", evidence_ids: evidence, product_ids: [product.product_id], internal_link_ids: [], media_requirements: [], conversion_role: "product_discovery", data: { heading: "A practical next step", product_id: product.product_id, recommendation_context: "Once you know which balance of coverage, handling and construction suits your wash routine, you can assess a towel against those criteria rather than buying on a single number.", relevance_reason: "The validated Heavy Duty Drying Towel is a relevant example for a reader looking for a dedicated car-drying product; it is presented after the decision guidance, not as a substitute for it.", cta_direction: "Invite the reader to review the product details against the criteria above.", cta_label: "View the Heavy Duty Drying Towel" } }
  ], conclusion: "The best microfibre car drying towel is the one whose absorbency, coverage and handling fit your vehicle and routine. Use those criteria first, then check the product evidence before deciding.",
  validation_metadata: { packet_id: pagePlan.packet_id, strategy_id: pagePlan.strategy_id, page_plan_id: pagePlan.plan_id, page_plan_hash: pagePlan.deterministic_content_sha256 }
};
const provider = { id: "offline-fixture", model: "gpt-5.6-sol", settings: { reasoning: "high" }, generate: async () => ({ provider: "offline-fixture", model: "gpt-5.6-sol", response_id: "offline-m5-proof", rawText: JSON.stringify(page), usage: { input_tokens: 0, output_tokens: 0, reasoning_tokens: 0 } }) };
const result = await runCreateSeoArticleM5({ m4Input, brief, pagePlan, approval, provider, outputDirectory: path.resolve("artifacts/workflows/create-seo-article/m5-proof"), now: () => new Date("2026-08-16T12:00:00.000Z") });
if (result.status !== "HUMAN_REVIEW_READY") throw new Error(JSON.stringify(result, null, 2));
const article = await readFile(path.join(root, "semantic-page.md"), "utf8");
const review = `# SEO Article — Founder Review\n\nARTICLE GENERATED — NOT APPROVED\n\nHUMAN REVIEW REQUIRED\n\nPrimary query: ${m4Input.opportunity.primary_query}\nArticle type: ${m4Input.opportunity.article_type}\nSearch intent: ${m4Input.opportunity.search_intent}\nActual word count: ${article.split(/\s+/).filter(Boolean).length}\nValidation: ${result.validation.status}\nQuality: ${result.quality.status}\n\n## Article\n\n${article}\n\n## Supporting context\n\nProduct featured: ${product.product_name}\nCTA: View the Heavy Duty Drying Towel\nFAQs: None approved in the M4 plan\nMedia: optional demonstration image placeholder remains outstanding\nInternal links: none supplied; coverage partial\nKnown limitations: ${m4Input.research.unknowns.join(" ")}\nSEO guidance snapshot: ${m4Input.seo_guidance.snapshot_id} (${m4Input.seo_guidance.freshness_status})\n`;
await writeFile(path.join(root, "m5-review.md"), review, { flag: "w" });
const summary = { artifact_type: "create_seo_article_m5_proof", merchant_input: { product_url: m4Input.intelligence.product.product_url }, approval_id: approval.approval_id, approval_sha256: sha256(approval), ...result, page: undefined };
delete summary.page;
await writeFile(path.resolve("artifacts/workflows/create-seo-article/m5-generation-proof.json"), `${JSON.stringify({ ...summary, call_directory: "m5-proof/gpt-5.6-sol/call_001" }, null, 2)}\n`, { flag: "w" });
console.log(JSON.stringify({ status: result.status, approval_id: approval.approval_id, call_directory: root, semantic_article_id: result.metadata.semantic_article_id, semantic_article_sha256: result.metadata.semantic_article_sha256, quality: result.quality.status }, null, 2));
