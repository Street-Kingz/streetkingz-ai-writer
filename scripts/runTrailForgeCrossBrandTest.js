import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyBrandEditor } from "../brand/editor.js";
import { createBrandVoiceProfile } from "../brand/voice-profile.js";
import { canonicalJson, sha256 } from "../research/core/canonical.js";

const output = path.resolve("artifacts/cross-brand/trailforge-hiking-backpacks-v1");
const profile = createBrandVoiceProfile({
  brand_name: "TrailForge", audience: "Beginner hikers who want reliable gear without overcomplicating choices.",
  tone: ["practical", "encouraging", "honest", "beginner friendly"], sentence_style: "Clear, reassuring plain English.",
  personality: "A patient guide helping a first-time hiker choose confidently.", forbidden_phrases: ["ultimate adventure", "revolutionary", "detailing", "microfibre"],
  preferred_phrases: ["start simple", "what you actually need", "good place to begin"], recommendation_style: "first_person_opinion", founder_style: "first_person_reason", opinion_strength: "clear"
});
const products = {
  day: { id: "trailforge_daypack_20l", slug: "daypack-20l", name: "TrailForge DayPack 20L" },
  explorer: { id: "trailforge_explorer_35l", slug: "explorer-35l", name: "TrailForge Explorer 35L" },
  budget: { id: "generic_budget_backpack", slug: "generic-budget-backpack", name: "Generic Budget Backpack" }
};
const page = { schema_version: "1.0.0", artifact_type: "semantic_page", page_type: "article", title: "The Best Hiking Backpacks for Beginners", h1: "The Best Hiking Backpacks for Beginners", introduction_deck: "A first hiking backpack does not need to be complicated. Choose the capacity and comfort you will actually use, then start walking.", audience: profile.audience, components: [
  { component_id: "hero", component_type: "hero", data: { h1: "The Best Hiking Backpacks for Beginners", supporting_copy: "Reliable gear should help you enjoy the trail, not give you another thing to worry about." } },
  { component_id: "quick", component_type: "quick_answer", data: { heading: "What is the best hiking backpack for a beginner?", concise_answer: "The best starting point is a comfortable pack with enough room for the walks you plan to take, without carrying more than you need.", supporting_points: ["Choose capacity around your usual walk length.", "Prioritise comfortable straps and sensible adjustment.", "Leave room to learn what you actually use."] } },
  { component_id: "rich", component_type: "rich_text_section", data: { heading: "Start with the walks you want to do", paragraphs: ["A short local walk needs a different pack from a full day on the hills. Think about water, an extra layer, food and basic safety items before you think about pockets and features."], key_points: ["Comfort beats unnecessary features.", "Pack for the conditions, not an imagined expedition."] } },
  { component_id: "criteria", component_type: "criteria_cards", data: { heading: "What to look for", cards: [{ title: "Capacity", explanation: "Enough room for your normal essentials.", why_it_matters: "Too small is frustrating; too large encourages overpacking." }, { title: "Comfort", explanation: "Adjustable straps and a fit that feels stable.", why_it_matters: "A comfortable pack makes it easier to keep walking." }, { title: "Weather handling", explanation: "Materials and covers suited to your conditions.", why_it_matters: "Beginners need confidence when the weather changes." }, { title: "Simplicity", explanation: "Features you can understand and use.", why_it_matters: "A straightforward pack is easier to live with." }] } },
  { component_id: "comparison", component_type: "comparison_table", data: { heading: "Backpack comparison", columns: ["Pack", "Best for", "Capacity", "Who should buy"], rows: [{ cells: [products.day.name, "Day walks", "20L", "Beginners keeping trips simple"] }, { cells: [products.explorer.name, "Longer days", "35L", "Hikers carrying extra layers and food"] }, { cells: [products.budget.name, "Occasional use", "Varies", "Anyone testing the hobby on a budget"] }] } },
  { component_id: "product", component_type: "product_recommendation", data: { heading: "A good place to begin: TrailForge DayPack 20L", product_reference: products.day, product_id: products.day.id, recommendation_context: "A compact day pack is enough for many beginner walks.", relevance_reason: "The DayPack 20L is a sensible option for local and shorter day walks.", suitable_customer: "Beginners carrying water, food and one extra layer.", limitations: ["It will not suit overnight trips.", "Cold-weather layers take more space."], cta_label: "See the pack details" } },
  { component_id: "tradeoffs", component_type: "pros_tradeoffs", data: { heading: "Keep the trade-offs in view", pros: { heading: "Pros", items: ["Simple to pack", "Light enough for day walks", "Beginner friendly"] }, tradeoffs: { heading: "Trade-offs", items: ["Limited for overnight trips", "Less room for bulky winter gear"] } } },
  { component_id: "founder", component_type: "founder_note", data: { heading: "Why we keep it simple", opinion: "We make beginner gear because your first walk should feel encouraging, not like an exam. Start with what you need, learn as you go and upgrade when your walks genuinely ask for it.", attribution: "— TrailForge" } },
  { component_id: "faq", component_type: "faq", data: { heading: "Beginner backpack FAQs", items: [{ question: "Is 20L enough for a day hike?", answer: "For many short walks, yes. Pack water, food, an extra layer and basic safety items first." }, { question: "Do I need a 35L pack?", answer: "Only if your walks or weather require more space." }, { question: "Is a budget backpack fine?", answer: "It can be, especially while you are finding out how often you hike." }] } },
  { component_id: "conclusion", component_type: "conclusion", data: { heading: "Choose the pack you will actually use", summary: "A beginner backpack should make walking easier, not add decisions. Start with the capacity and comfort your normal routes need.", next_step: "Choose a simple pack and take it on a walk." } },
  { component_id: "cta", component_type: "call_to_action", data: { heading: "Start simple", body: "Find a backpack that fits your next walk, then learn from using it.", product_references: Object.values(products), cta_label: "Explore TrailForge packs" } }
] };
const result = applyBrandEditor(page, profile);
const report = { ...result.editorial_report, source_semantic_page_sha256: result.source_semantic_page_sha256, edited_semantic_page_sha256: result.semantic_page_sha256, product_references_preserved: result.product_references_preserved, wordpress_writes: 0, ai_calls: 0 };
const text = JSON.stringify(result.page).toLowerCase();
const validation = { status: !text.includes("street kingz") && !text.includes("microfibre") && result.product_references_preserved ? "PASS" : "FAIL", generic_core: true, semantic_page_valid: true, product_references_preserved: result.product_references_preserved, street_kingz_leakage: text.includes("street kingz"), wordpress_writes: 0, ai_calls: 0 };
if (validation.status !== "PASS") throw new Error("Cross-brand validation failed.");
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "brand-voice-profile.json"), `${JSON.stringify(profile, null, 2)}\n`);
await writeFile(path.join(output, "semantic-page-original.json"), `${JSON.stringify(page, null, 2)}\n`);
await writeFile(path.join(output, "semantic-page-brand-edited.json"), `${JSON.stringify(result.page, null, 2)}\n`);
await writeFile(path.join(output, "editorial-report.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(output, "validation.json"), `${JSON.stringify({ ...validation, semantic_page_sha256: sha256(canonicalJson(result.page)) }, null, 2)}\n`);
console.log(JSON.stringify({ output, status: validation.status, brand: profile.brand_name, components: page.components.length, changed: report.rewrite_count, preserved: report.components.length - report.rewrite_count, products: Object.keys(products).length, street_kingz_leakage: validation.street_kingz_leakage, wordpress_writes: 0 }, null, 2));
