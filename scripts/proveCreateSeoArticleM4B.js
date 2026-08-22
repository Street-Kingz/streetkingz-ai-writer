import { mkdir, readFile, writeFile } from "node:fs/promises";
import { buildEvidenceGroundedM4BInput, runCreateSeoArticleM4B } from "../workflows/createSeoArticleM4B.js";

const root = process.env.M4B_PROOF_ROOT || "artifacts/workflows/create-seo-article/m4b-proof-v1";
const read = async (file) => JSON.parse(await readFile(file, "utf8"));
const m4Input = await read("artifacts/workflows/create-seo-article/m4-proof-v5/gpt-5.6-sol/call_001/m4-input.json");
const evidencePack = await read("artifacts/workflows/create-seo-article/m4a2-proof-v4/article-editorial-evidence-pack.json");
const restrictionPolicy = await read("artifacts/workflows/create-seo-article/m4a2a-proof-v3/article-claim-restriction-policy.json");
const oldM4 = await read("artifacts/workflows/create-seo-article/m4-proof-v5/gpt-5.6-sol/call_001/editorial-page-plan.json");
const opportunity = m4Input.opportunity;
const seoGuidance = m4Input.seo_guidance;
const productLineage = { product_id: m4Input.intelligence.product.product_id, product_url: m4Input.intelligence.product.product_url, pio_id: m4Input.intelligence.eic.product_object_id };
const input = buildEvidenceGroundedM4BInput({ opportunity, evidencePack, restrictionPolicy, seoGuidance, productLineage, businessLineage: m4Input.intelligence.business, eicLineage: m4Input.intelligence.eic, merchantInput: { product_url: m4Input.intelligence.product.product_url } });
const source = evidencePack.sources.map((item) => item.source_id);
const facts = evidencePack.relevant_product_facts.map((item) => item.evidence_id);
const restrictions = restrictionPolicy.restrictions.map((item) => item.restriction_id);
const r = (index = 0, count = 4) => source.slice(index, index + count);
const section = (component_id, component_type, heading, purpose, reader_question, evidence_ids, restriction_ids, required_points, prohibited_claims, product_fact_ids = [], product_role = "none") => {
  // Keep the fixture readable: when a section has only product facts after
  // its required points, normalize that shorthand into the explicit fields.
  if (typeof product_fact_ids === "string") { product_role = product_fact_ids; product_fact_ids = prohibited_claims.filter((item) => /^ev_/.test(item)); prohibited_claims = prohibited_claims.filter((item) => !/^ev_/.test(item)); }
  else if (product_fact_ids.length === 0 && prohibited_claims.every((item) => /^ev_/.test(item))) { product_fact_ids = prohibited_claims; prohibited_claims = []; }
  return { component_id, component_type, heading, purpose, reader_question, evidence_ids, restriction_ids, product_fact_ids, required_points, prohibited_claims, product_role, internal_link_ids: [], media_requirements: [], conversion_role: product_role === "none" ? "education" : "product_discovery" };
};
const fixtureOutput = {
  primary_query: opportunity.primary_query,
  article_type: opportunity.article_type,
  search_intent: opportunity.search_intent,
  working_title: "How to Choose the Best Microfibre Car Drying Towel for Your Vehicle",
  thesis: "The useful answer to a best-towel search is a decision framework: compare the towel formats and handling trade-offs that matter for your vehicle, then judge any product against those needs rather than treating one specification as a universal winner.",
  reader_decision: "Which towel format, size and handling profile best fits my vehicle, drying routine and tolerance for a heavier wet towel?",
  audience: "Car owners comparing practical drying-towel options after washing a car, SUV or van.",
  commercial_objective: "Move the reader from uncertainty to an evidence-bounded product consideration without claiming universal superiority.",
  decision_framework: ["Start with vehicle coverage and handling needs.", "Compare construction and format as market options, not automatic winners.", "Treat GSM and performance relationships as qualified rather than universal.", "Use validated product facts as a concrete fit example after the decision criteria."],
  sections: [
    section("m4b_quick_answer", "quick_answer", "The short answer: match the towel to the job", "Answer the commercial question quickly and frame best as criteria-dependent.", "What should I compare before buying?", r(0, 5), [restrictions[3]], ["State that no single specification establishes a universal best towel.", "Name vehicle coverage, construction, handling and wet weight as decision dimensions."], [facts[0], facts[1]]),
    section("m4b_criteria", "criteria_cards", "The buying criteria that change the decision", "Turn researched criteria into practical buyer consequences.", "Which characteristics will I notice during drying?", r(4, 6), [restrictions[0], restrictions[1]], ["Explain size/coverage and saturated handling.", "Explain GSM as a fabric-weight measure without treating it as a standalone performance guarantee.", "Separate validated product specifications from category-level inference."], [facts[1], facts[2], facts[10], facts[21]]),
    section("m4b_comparison", "comparison_table", "Compare the main towel approaches", "Expose category-level options and qualified trade-offs without naming unsupported winners.", "How do the formats differ, and who might each suit?", r(8, 7), [restrictions[0], restrictions[1], restrictions[3]], ["Compare observed twisted-loop, waffle-weave and plush/double-sided formats only as evidenced market options.", "Show coverage versus control and capacity versus wet handling as qualified trade-offs.", "Do not convert repeated marketing language into objective superiority."], [facts[2], facts[10], facts[21]]),
    section("m4b_use_cases", "rich_text_section", "Choose for your vehicle and drying routine", "Connect researched buyer concerns and use cases to a practical choice.", "What suits a car, SUV or larger vehicle?", r(15, 6), [restrictions[2], restrictions[0]], ["Address whole-vehicle coverage, swapping towels and heavier saturated handling.", "Use community/practitioner material as recurring concerns, not universal practice.", "Use first-party intended-use facts for the Street Kingz example only."], [facts[4], facts[5], facts[22]]),
    section("m4b_customer_questions", "faq", "Questions buyers commonly ask", "Answer genuine product/category questions selected from research and Product Intelligence.", "Will a towel feel heavy, and how should I think about care and coverage?", r(20, 5), [restrictions[0], restrictions[2]], ["Answer only approved questions with bounded evidence.", "Keep care and coverage practical; avoid invented guarantees or consensus claims."], [facts[3], facts[7], facts[15], facts[16]]),
    section("m4b_product_fit", "product_recommendation", "Where the Heavy Duty Drying Towel may fit", "Use validated product facts as a concrete example after the reader has the decision framework.", "Would this validated product profile suit my priorities?", r(0, 5), [restrictions[0], restrictions[1], restrictions[3]], ["Present the 1200GSM dual-layer/double-sided profile, dimensions and heavier saturated feel as validated facts.", "Explain which reader priorities the profile may suit without claiming it is universally best.", "Keep the recommendation proportionate and evidence-bound."], [facts[0], facts[1], facts[2], facts[10], facts[21], facts[22]], "qualified_product_example"),
    section("m4b_conclusion", "conclusion", "Make the choice against your own priorities", "Close with a useful decision summary and proportionate next step.", "What should I do next?", r(0, 4), [restrictions[3]], ["Reinforce criteria-dependent choice.", "Offer the validated product as an optional next step, not an objective winner.", "Do not restate the introduction mechanically."], [facts[0]], "qualified_next_step")
  ],
  product_fact_ids: facts.slice(0, 7),
  product_role: "Use the Heavy Duty Drying Towel as a qualified concrete example after category guidance, connecting validated dimensions, construction, intended uses and wet-handling limitation to reader priorities without forced repetition.",
  claim_boundaries: { safe: ["observed category terminology", "validated first-party product specifications", "bounded buyer questions"], qualify: ["GSM, absorbency and construction-performance relationships", "coverage and wet-handling consequences"], attribute: ["manufacturer descriptions", "community/practitioner experience"], avoid: ["universal best, superiority or guaranteed performance"] },
  coverage_depth: { mode: "STANDARD", rationale: "The plan must explain the researched decision dimensions and trade-offs fully enough to support commercial investigation, then stop when coverage is complete." },
  cta_strategy: { role: "qualified_product_consideration", placement: "after criteria, comparison and product-fit explanation", pressure: "proportionate" },
  faq_plan: [{ question: "How should I think about a towel feeling heavier when wet?", evidence_ids: [facts[1], facts[21]], restriction_ids: [restrictions[0]] }],
  media_plan: [{ kind: "comparison_visual", purpose: "Show towel formats or drying coverage without implying unsupported performance superiority.", status: "optional_missing", alt_text_direction: "Describe the visible towel format and drying context accurately." }],
  structured_data: { recommendation: "Defer production schema selection to rendering/handoff review; do not add FAQ schema automatically.", rationale: "Inherited SEO guidance distinguishes vocabulary from search-feature eligibility." },
  explicit_exclusions: ["No competitor superiority claims", "No universal GSM or construction-performance claim", "No new keyword research", "No arbitrary internal URLs", "No article prose in the plan"]
};
const oldM4Weaknesses = ["Only three generic components", "No research-question coverage", "Checklist-style comparison rather than evidenced trade-offs", "No machine-readable claim restrictions", "Generic product placement", "No customer-concern treatment", "No Product Intelligence crossover at section level"];
const provider = { id: "fixture-m4b", model: "gpt-5.6-sol", settings: { api: "responses", reasoning: { effort: "high" } }, async generate() { return { provider: this.id, model: this.model, rawText: JSON.stringify(fixtureOutput), usage: { input_tokens: 3100, output_tokens: 1450, reasoning_tokens: 0 } }; } };
const result = await runCreateSeoArticleM4B({ input, provider, oldM4Weaknesses, outputDirectory: root });
const comparison = { artifact_type: "m4_vs_m4b_comparison", historical_m4: { brief_id: "article_brief_248d2d96feff88a83be38999", page_plan_id: "editorial_page_plan_109d5a7553798979dc21fbb3", components: oldM4.components.length, evidence_granularity: "global/component-shared", restrictions: 0, customer_concerns: 0, product_fact_crossover: 0, weaknesses: oldM4Weaknesses }, m4b: { brief_id: result.brief?.brief_id, brief_sha256: result.brief?.brief_sha256, page_plan_id: result.plan?.plan_id, page_plan_sha256: result.plan?.deterministic_content_sha256, components: result.plan?.components?.length || 0, evidence_granularity: "section-level", restrictions: restrictionPolicy.restrictions.length, product_fact_crossover: facts.length, quality: result.quality?.status || "FAILED" }, lineage: { opportunity_id: opportunity.decision_id, opportunity_sha256: opportunity.decision_sha256, evidence_pack_id: evidencePack.evidence_pack_id, evidence_pack_sha256: evidencePack.evidence_pack_sha256 } };
await mkdir(root, { recursive: true });
await writeFile(`${root}/old-m4-weaknesses.json`, `${JSON.stringify({ artifact_type: "old_m4_weaknesses", historical_plan_id: oldM4.plan_id, historical_plan_sha256: oldM4.deterministic_content_sha256, weaknesses: oldM4Weaknesses, immutable: true }, null, 2)}\n`, "utf8");
await writeFile(`${root}/old-m4-vs-m4b-comparison.json`, `${JSON.stringify(comparison, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: result.status, failure: result.failure || null, brief_id: result.brief?.brief_id, brief_sha256: result.brief?.brief_sha256, page_plan_id: result.plan?.plan_id, page_plan_sha256: result.plan?.deterministic_content_sha256, quality: result.quality?.status, call_count: result.metadata?.ai_calls || 0 }, null, 2));
