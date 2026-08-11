import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyBrandEditor } from "../brand/editor.js";
import { STREET_KINGZ_BRAND_VOICE } from "../brand/street-kingz.js";
import { canonicalJson, sha256 } from "../research/core/canonical.js";

const output = path.resolve("artifacts/cornerstone/best-car-drying-towel/ecommerce-content-stress-test-v1");
const products = {
  towel_1200: { id: "product_20fcada95c00204601928709", slug: "heavy-duty-drying-towel-1200gsm", name: "Street Kingz 1200gsm towel" },
  towel_800: { id: "product_streetkingz_800gsm", slug: "street-kingz-800gsm-xl-towel", name: "Street Kingz 800gsm towel" },
  origin_shampoo: { id: "product_origin_shampoo", slug: "origin-shampoo", name: "Origin Shampoo" },
  barrel_brush: { id: "product_barrel_brush", slug: "barrel-brush", name: "Barrel Brush" },
  waffle_cloth: { id: "product_waffle_cloth", slug: "waffle-cloth", name: "Waffle Cloth" },
  multiclean: { id: "product_multiclean", slug: "multiclean", name: "MultiClean" }
};
const ref = (key) => products[key];
const page = {
  schema_version: "1.0.0", artifact_type: "semantic_page", page_type: "article",
  title: "Best Car Cleaning Products UK: The Essentials You Actually Need",
  h1: "Best Car Cleaning Products UK: The Essentials You Actually Need",
  introduction_deck: "You do not need a garage full of products to keep your car clean. The useful shortlist is smaller: a few things that solve real jobs, fit your routine and earn their place after the first wash.",
  audience: "Everyday car owners who want a clean car without buying unnecessary products.",
  positioning: "Help customers buy fewer, better products.",
  components: [
    { component_id: "01_hero", component_type: "hero", data: { h1: "Best Car Cleaning Products UK: The Essentials You Actually Need", supporting_copy: "The best car cleaning kit is not the biggest one. It is the short list of products that make washing, drying and looking after your car easier.", image_placeholder: { requirement_id: "hero_clean_car", description: "Lifestyle image placeholder; no production media supplied." } } },
    { component_id: "02_quick_answer", component_type: "quick_answer", data: { heading: "What do I actually need to clean my car properly?", concise_answer: "Start with a shampoo, wash tools, a drying towel and one or two products for the jobs your car actually needs. For most owners, that means Origin Shampoo, a Barrel Brush, a good drying towel and MultiClean, with cloths added where they solve a specific task.", supporting_points: ["Choose products around the jobs you repeat, not a long catalogue.", "A reliable drying towel is often a more noticeable upgrade than another bottle.", "Buy one product, use it properly and add another only when a real gap appears."] } },
    { component_id: "03_rich_text", component_type: "rich_text_section", data: { heading: "Build a kit around the wash you actually do", paragraphs: ["A normal car wash has a few predictable jobs: loosen dirt, wash the main surfaces, reach awkward areas, dry the car and clean the bits that need extra attention. Your kit only needs to cover those jobs well.", "That is why we would rather help you choose a small set than push every product on the shelf. If a basic cloth already handles a task, keep using it. Spend more when a product saves time, lasts longer or makes a frustrating step easier to repeat."], key_points: ["Start with the core wash and drying steps.", "Add specialist products for a specific problem.", "Fewer products usually means a simpler routine."] } },
    { component_id: "04_criteria", component_type: "criteria_cards", data: { heading: "How to choose the essentials", cards: [
      { title: "Does it solve a repeat job?", explanation: "Pick products for tasks you actually do on most washes.", why_it_matters: "A product earns its place when it gets used rather than stored." },
      { title: "Is it easy to use?", explanation: "The best kit is one you can reach for without turning a wash into a project.", why_it_matters: "Simple routines are easier to repeat and less likely to be abandoned." },
      { title: "Will it last?", explanation: "Consider how often it can be reused and how it should be cared for.", why_it_matters: "Durability matters more than an impressive first impression." },
      { title: "Is the upgrade noticeable?", explanation: "Spend more where you can see or feel a useful difference.", why_it_matters: "A premium label is not a reason to buy something you do not need." }
    ] } },
    { component_id: "05_comparison", component_type: "comparison_table", data: { heading: "The core car cleaning shortlist", columns: ["Product", "Main job", "Best for", "Priority"], rows: [
      { cells: ["Origin Shampoo", "Washing the main surfaces", "Every regular wash", "Essential"] },
      { cells: ["Street Kingz 1200gsm towel", "Drying the car", "Owners who want fewer passes", "Useful upgrade"] },
      { cells: ["Street Kingz 800gsm towel", "Drying the car", "Owners who want a lighter large towel", "Useful alternative"] },
      { cells: ["Barrel Brush", "Reaching awkward areas", "Wheels and tight spaces", "Task-dependent"] },
      { cells: ["Waffle Cloth", "Glass and light finishing", "Owners who want a dedicated cloth", "Task-dependent"] },
      { cells: ["MultiClean", "General-purpose cleaning", "Specific interior or exterior jobs", "Task-dependent"] }
    ] } },
    { component_id: "06_product", component_type: "product_recommendation", data: { heading: "Best core upgrade: Street Kingz 1200gsm towel", product_reference: ref("towel_1200"), product_id: ref("towel_1200").id, recommendation_context: "Drying is the stage where many owners lose patience, so a capable towel can make the whole routine feel easier.", relevance_reason: "The 1200gsm towel is a sensible upgrade when your current towel needs repeated passes or leaves too much water behind. It is not essential if the towel you already own works well.", suitable_customer: "Owners who wash regularly and want a quicker, less frustrating drying stage.", limitations: ["It costs more than a basic microfibre towel.", "Its larger size takes more storage space.", "It becomes heavier when saturated."], cta_label: "See the towel details" } },
    { component_id: "07_product_comparison", component_type: "product_comparison", data: { heading: "Which product fits which job?", products: [
      { product_reference: ref("towel_1200"), best_for: "Maximum drying coverage and fewer passes" },
      { product_reference: ref("towel_800"), best_for: "A large drying towel with a lighter feel" },
      { product_reference: ref("origin_shampoo"), best_for: "The main wash stage" },
      { product_reference: ref("barrel_brush"), best_for: "Wheels and awkward areas" },
      { product_reference: ref("waffle_cloth"), best_for: "Glass and light finishing" },
      { product_reference: ref("multiclean"), best_for: "A specific general-cleaning job" }
    ] } },
    { component_id: "08_pros_tradeoffs", component_type: "pros_tradeoffs", data: { heading: "The honest way to build a kit", pros: { heading: "What works", items: ["A short routine is easier to repeat", "Products have a clear job", "You can spend more where it saves time"] }, tradeoffs: { heading: "What to avoid", items: ["Buying every product before finding a real need", "Replacing tools that still work", "Assuming the most expensive option is automatically best"] } } },
    { component_id: "09_founder_note", component_type: "founder_note", data: { heading: "Why we keep the shortlist practical", opinion: "We would rather you buy one product that makes the job easier than five that sit in a cupboard. The reason Street Kingz exists is to remove the annoying bits of car care, not to make owning a clean car feel expensive or complicated.", attribution: "— Street Kingz" } },
    { component_id: "10_faq", component_type: "faq", data: { heading: "Car cleaning product FAQs", items: [
      { question: "What is the one product every car owner needs?", answer: "There is no single product for every routine, but a suitable shampoo and clean wash tools are the sensible starting point. Add a drying towel if drying is the part that causes problems." },
      { question: "Do I need both Street Kingz drying towels?", answer: "No. Choose the one that suits your preferred size and handling. They are alternatives, not a requirement to buy both." },
      { question: "Is a specialist brush necessary?", answer: "Only if you regularly clean areas that are difficult to reach with your normal tools. A Barrel Brush is useful for that job, but not everyone needs one." },
      { question: "Should I buy a full car cleaning kit?", answer: "A bundle can be convenient, but check that you will use everything in it. Buying fewer products individually can be better value." }
    ] } },
    { component_id: "11_conclusion", component_type: "conclusion", data: { heading: "Buy for the jobs you actually do", summary: "A good car cleaning kit is a small set of products that solve repeat problems. Start with the wash, drying and tools you genuinely need, then upgrade the parts that waste your time. You do not need every product to keep your car looking cared for.", next_step: "Choose one useful improvement rather than buying a catalogue." } },
    { component_id: "12_call_to_action", component_type: "call_to_action", data: { heading: "Build a better shortlist", body: "Start with the products that solve a real job in your routine, then leave the rest until you need them.", product_references: Object.values(products), cta_label: "Explore the essentials" } }
  ]
};
const edited = applyBrandEditor(page, STREET_KINGZ_BRAND_VOICE);
const report = { ...edited.editorial_report, source_semantic_page_sha256: edited.source_semantic_page_sha256, edited_semantic_page_sha256: edited.semantic_page_sha256, product_references_preserved: edited.product_references_preserved, referenced_products: Object.values(products).map((item) => item.name), wordpress_writes: 0, ai_calls: 0 };
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "semantic-page-original.json"), `${JSON.stringify(page, null, 2)}\n`);
await writeFile(path.join(output, "semantic-page-brand-edited.json"), `${JSON.stringify(edited.page, null, 2)}\n`);
await writeFile(path.join(output, "editorial-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output, semantic_page_sha256: sha256(canonicalJson(edited.page)), components: page.components.length, referenced_products: Object.values(products).length, rewritten_components: report.rewrite_count, preserved_components: report.components.length - report.rewrite_count, issues: report.issues.length, product_references_preserved: report.product_references_preserved, wordpress_writes: 0, ai_calls: 0 }, null, 2));
