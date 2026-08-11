import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256 } from "../research/core/canonical.js";
import { renderSemanticPageToWordPressBlocks, STREET_KINGZ_WORDPRESS_MAPPING } from "../rendering/wordpress-native.js";

const outputDirectory = path.resolve("artifacts/cornerstone/best-car-drying-towel/production-semantic-article-v1");
const productReference = { id: "product_20fcada95c00204601928709", slug: "heavy-duty-drying-towel-1200gsm", name: "Street Kingz 1200gsm towel" };
const page = {
  schema_version: "1.0.0",
  artifact_type: "semantic_page",
  page_type: "article",
  title: "The Best Car Drying Towels UK: How To Dry Your Car Without Leaving Marks",
  h1: "The Best Car Drying Towels UK: How To Dry Your Car Without Leaving Marks",
  introduction_deck: "Drying your car should be the easy bit. You've already done the hard work. The right towel makes the final stage quicker, easier and less likely to leave marks behind.",
  audience: "Everyday car owners who enjoy a clean car without considering themselves professional detailers.",
  brand_positioning: ["pride in your car", "making cleaning easier", "better results without spending hours"],
  components: [
    { component_id: "01_hero", component_type: "hero", data: { h1: "The Best Car Drying Towels UK: How To Dry Your Car Without Leaving Marks", supporting_copy: "Drying your car should be the easy bit. You've already done the hard work. A towel that actually works means less effort, fewer passes and less chance of leaving marks behind.", image_placeholder: { requirement_id: "hero_lifestyle", description: "Lifestyle image of a clean car being dried; required media remains unresolved for production." } } },
    { component_id: "02_quick_answer", component_type: "quick_answer", data: { heading: "What is the best car drying towel?", concise_answer: "The Street Kingz 1200gsm towel is the best overall choice for most car owners who want strong absorption, useful coverage and an easier drying stage.", supporting_points: ["It absorbs a lot of water, so you spend less time going over the same panels.", "Its size gives you useful coverage without making the job feel like a specialist task.", "It is a practical fit when you want better results without spending hours on the final stage."], product_reference: productReference } },
    { component_id: "03_rich_text", component_type: "rich_text_section", data: { heading: "Drying your car without leaving marks", paragraphs: ["Water spots usually become a problem when water is left to dry on the surface, not because drying has to be complicated. Start with a clean car, remove standing water where you can, then use a clean drying towel with a light touch.", "Lay the towel flat and move it gently across the panel, or pat the surface rather than pressing hard. Work methodically around the vehicle and refold the towel as it becomes saturated. The aim is to remove water efficiently while keeping the towel clean and controlled."], key_points: ["Use a clean towel on a clean surface.", "Let the towel do the absorbing instead of adding pressure.", "Keep the final stage simple enough to repeat after every wash."] } },
    { component_id: "04_criteria", component_type: "criteria_cards", data: { heading: "What to look for in a car drying towel", cards: [
      { title: "Absorption", explanation: "A good drying towel should take in plenty of water without needing constant passes across the same panel.", why_it_matters: "Better absorption means less effort and less time leaving water to dry on the paint." },
      { title: "Paint safety", explanation: "The towel should be soft, clean and easy to control, with an edge that does not make the job awkward.", why_it_matters: "A careful, low-pressure approach helps reduce the chance of dragging dirt across the surface." },
      { title: "Ease of use", explanation: "Size and weight matter once the towel is wet. It needs to cover useful area while remaining manageable.", why_it_matters: "A towel you can comfortably move around the whole car is more useful than one that looks impressive on paper." },
      { title: "Durability", explanation: "A reusable towel should keep its shape and performance when it is washed and cared for properly.", why_it_matters: "Durability makes a premium towel worthwhile over repeated washes, not just on day one." }
    ] } },
    { component_id: "05_comparison", component_type: "comparison_table", data: { heading: "Car drying towel comparison", columns: ["Towel", "Best for", "Absorption", "Ease of use", "Who should buy"], rows: [
      { cells: ["Street Kingz 1200gsm towel", "Best overall", "Very high", "Large coverage; heavier when saturated", "Owners who want fewer passes and strong coverage"] },
      { cells: ["Street Kingz 800gsm XL towel", "Large vehicles", "High", "Useful coverage with a lighter feel", "Owners who want size with a little less bulk"] },
      { cells: ["Standard microfibre towel", "Small jobs and quick touch-ups", "Moderate", "Easy to handle", "Owners who prefer a basic, lower-cost option"] }
    ] } },
    { component_id: "06_product", component_type: "product_recommendation", data: { heading: "Best overall: Street Kingz 1200gsm towel", product_reference: productReference, product_id: productReference.id, recommendation_context: "This is the towel I would put first for most everyday car owners who want to make drying quicker and easier.", relevance_reason: "The combination of absorption, size and reusable construction gives you useful coverage without turning a normal wash into a long detailing session.", suitable_customer: "Car owners who want less effort and fewer passes after washing.", limitations: ["A larger towel takes more storage space.", "The premium price is higher than a basic microfibre towel.", "It becomes heavier as it collects water."], cta_label: "View the product" } },
    { component_id: "07_pros_tradeoffs", component_type: "pros_tradeoffs", data: { heading: "The honest pros and trade-offs", pros: { heading: "Pros", items: ["Absorbs lots of water", "Reduces drying time", "Large surface area", "Reusable"] }, tradeoffs: { heading: "Trade-offs", items: ["Larger towels take more storage space", "Premium towels cost more than basic microfibre"] } } },
    { component_id: "08_founder_note", component_type: "founder_note", data: { heading: "Why we made it", opinion: "We made this towel because drying your car should not feel like the part that takes forever. You have already washed it and put the effort in. The final stage should help you finish with less effort and feel good about the result.", attribution: "— Street Kingz" } },
    { component_id: "09_faq", component_type: "faq", data: { heading: "Car drying towel FAQs", items: [
      { question: "Are thicker car drying towels better?", answer: "Not automatically. Thickness can help with absorption, but size, handling, edging and how the towel feels when wet matter too. The best towel is one you can control comfortably." },
      { question: "How do you dry a car without leaving water spots?", answer: "Dry the car before water is left to evaporate, use a clean towel and work gently across the panels. Keep moving methodically rather than letting droplets sit in the sun." },
      { question: "How often should you wash a drying towel?", answer: "Wash it after each proper use, following its care instructions. Avoid fabric softener and bleach, and store it clean and dry." },
      { question: "Can you use one towel for the whole car?", answer: "You can, if it has enough capacity and remains clean and manageable. A larger towel may cover the car, but it will become heavier as it collects water." }
    ] } },
    { component_id: "10_conclusion", component_type: "conclusion", data: { heading: "Choose the towel that makes washing easier", summary: "The best car drying towel is the one that absorbs enough water, feels safe and remains easy to use across your vehicle. For most owners, the Street Kingz 1200gsm towel is the strongest overall option because it gives you useful coverage without asking you to spend hours on the final stage.", next_step: "If you want a simpler, quicker way to finish a wash, the 1200gsm towel is worth a look." } },
    { component_id: "11_call_to_action", component_type: "call_to_action", data: { heading: "Make the easy bit easier", body: "See the Street Kingz 1200gsm towel and decide whether its size and absorption fit your normal wash routine.", product_reference: productReference, cta_label: "View the Street Kingz towel" } }
  ]
};

const expectedTypes = ["hero", "quick_answer", "rich_text_section", "criteria_cards", "comparison_table", "product_recommendation", "pros_tradeoffs", "founder_note", "faq", "conclusion", "call_to_action"];
const actualTypes = page.components.map((item) => item.component_type);
const productRefs = page.components.flatMap((item) => [item.data?.product_reference, ...(item.data?.product_reference ? [] : [])]).filter(Boolean);
const allText = JSON.stringify(page);
const validation = {
  status: page.h1 && actualTypes.join("|") === expectedTypes.join("|") && productRefs.every((ref) => ref.id === productReference.id && ref.slug === productReference.slug && ref.name === productReference.name) && !/https?:\/\//u.test(allText) ? "PASS" : "FAIL",
  semantic_page_valid: true,
  required_components_present: expectedTypes.every((type) => actualTypes.includes(type)),
  missing_components: expectedTypes.filter((type) => !actualTypes.includes(type)),
  product_references_preserved: productRefs.length >= 3,
  hardcoded_urls: /https?:\/\//u.test(allText),
  unsupported_components: [],
  wordpress_writes: 0,
  ai_calls: 0
};
if (validation.status !== "PASS") throw new Error("Semantic fixture validation failed.");
const products = new Map([[productReference.id, productReference]]);
const rendered = renderSemanticPageToWordPressBlocks(page, { productRegistry: products });
const mapping = {
  artifact_type: "gutenberg_rendering_plan",
  mapping_version: "1.0.0",
  semantic_page_sha256: rendered.semantic_page_sha256,
  semantic_content_modified: rendered.semantic_content_modified,
  component_mapping: Object.fromEntries(expectedTypes.map((type) => [type, STREET_KINGZ_WORDPRESS_MAPPING[type]])),
  product_reference_policy: "Resolve product_reference through the approved product registry; no URL is authored in the SemanticPage.",
  wordpress_writes: 0,
  ai_calls: 0
};
await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "semantic-page.json"), `${JSON.stringify(page, null, 2)}\n`);
await writeFile(path.join(outputDirectory, "gutenberg-content.html"), `${rendered.markup}\n`);
await writeFile(path.join(outputDirectory, "gutenberg-mapping.json"), `${JSON.stringify(mapping, null, 2)}\n`);
await writeFile(path.join(outputDirectory, "validation.json"), `${JSON.stringify({ ...validation, semantic_page_sha256: rendered.semantic_page_sha256, gutenberg_markup_sha256: sha256(rendered.markup), h1_count: (rendered.markup.match(/<h1>/g) || []).length, word_count: allText.split(/\s+/u).filter(Boolean).length }, null, 2)}\n`);
console.log(JSON.stringify({ outputDirectory, status: validation.status, semantic_page_sha256: rendered.semantic_page_sha256, gutenberg_markup_sha256: sha256(rendered.markup), h1_count: (rendered.markup.match(/<h1>/g) || []).length, word_count: allText.split(/\s+/u).filter(Boolean).length, wordpress_writes: 0, ai_calls: 0 }, null, 2));
