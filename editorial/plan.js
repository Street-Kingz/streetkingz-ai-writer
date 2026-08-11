import { sha256, stableId } from "../research/core/canonical.js";
import { COMPONENT_TYPES, CONVERSION_ROLES, EDITORIAL_PLAN_VERSION, EDITORIAL_PAGE_TYPES, MEDIA_KINDS } from "./contracts.js";

const slug = (value) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 48) || "component";
const unique = (values) => [...new Set(values.filter(Boolean))];
const component = ({ type, purpose, evidenceIds = [], productIds = [], linkIds = [], media = [], conversionRole = "education", requiredContent = [] }, index) => ({
  component_id: `${String(index + 1).padStart(2, "0")}_${slug(type)}_${stableId("slot", { index, type, purpose }, 8).slice(-8)}`,
  component_type: type,
  purpose,
  evidence_ids: unique(evidenceIds).sort(),
  product_ids: unique(productIds).sort(),
  internal_link_ids: unique(linkIds).sort(),
  media_requirements: media,
  conversion_role: conversionRole,
  required_content: requiredContent
});

function allStrategyEvidence(strategy) {
  const ids = [];
  const walk = (value) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) key === "evidence_ids" && Array.isArray(item) ? ids.push(...item) : walk(item);
  };
  walk(strategy);
  return unique(ids);
}

export function buildEditorialPagePlan({ packet, strategy }) {
  if (strategy.validation_status === "FAIL" || strategy.human_review_state !== "awaiting_human_review") throw new Error("An accepted strategy awaiting human review is required.");
  const ids = allStrategyEvidence(strategy);
  const products = strategy.streetkingz_integration.genuinely_relevant_products.map((item) => item.product_id);
  const links = strategy.internal_linking.map((item) => item.link_id);
  const sequence = [];
  sequence.push({ type: "hero", purpose: "State the topic, reader promise and evidence-bounded angle immediately.", evidenceIds: strategy.decision.evidence_ids, media: [{ requirement_id: "media_hero_lifestyle", kind: "lifestyle_image", purpose: "Show the page topic in a genuine use context.", alt_text_direction: "Describe the depicted task without keyword stuffing.", status: "required_missing" }], requiredContent: ["H1 direction", "short supporting deck", "no unsupported superlative"] });
  sequence.push({ type: "quick_answer", purpose: "Answer the searcher's core decision near the top before commercial content.", evidenceIds: strategy.strategy.primary_intent_interpretation.evidence_ids, requiredContent: ["qualified direct answer", "decision depends on verified criteria"] });
  if (strategy.priorities.must_cover_topics.length) sequence.push({ type: "criteria_cards", purpose: "Make the approved selection criteria scannable and useful without a wall of text.", evidenceIds: strategy.priorities.must_cover_topics.flatMap((item) => item.evidence_ids), requiredContent: strategy.priorities.must_cover_topics.map((item) => item.statement) });
  const comparisonSection = strategy.structure.sections.find((item) => /compare|microfibre|waffle|chamois/i.test(`${item.heading_direction} ${item.purpose}`));
  if (comparisonSection) sequence.push({ type: "comparison_table", purpose: "Compare only dimensions supported by evidence and expose unknown performance claims as limitations.", evidenceIds: comparisonSection.evidence_dependencies, media: [{ requirement_id: "media_comparison_visual", kind: "comparison_visual", purpose: "Optional visual aid for the bounded comparison criteria.", alt_text_direction: "Describe compared criteria without implying unsupported performance.", status: "optional_missing" }], requiredContent: [comparisonSection.heading_direction, "explicit evidence limitations"] });
  for (const section of strategy.structure.sections.filter((item) => !/quick answer|what to look|compare|microfibre|waffle|chamois|street kingz|option|faq|frequently asked|care|wash|dry a car/i.test(item.heading_direction))) sequence.push({ type: "rich_text_section", purpose: section.purpose, evidenceIds: section.evidence_dependencies, requiredContent: [section.heading_direction] });
  if (products.length) sequence.push({ type: "product_recommendation", purpose: "Present only packet-backed products after the reader understands the decision criteria.", evidenceIds: strategy.streetkingz_integration.genuinely_relevant_products.flatMap((item) => item.evidence_ids), productIds: products, linkIds: links.slice(0, 1), conversionRole: "product_discovery", requiredContent: [strategy.streetkingz_integration.genuinely_relevant_products[0].recommended_role, strategy.streetkingz_integration.genuinely_relevant_products[0].placement_reason] });
  const practical = strategy.structure.sections.filter((item) => /how to|use|dry a car/i.test(item.heading_direction) && !/care|wash|maintain/i.test(item.heading_direction));
  for (const section of practical) sequence.push({ type: "rich_text_section", purpose: section.purpose, evidenceIds: section.evidence_dependencies, media: [{ requirement_id: `media_${slug(section.heading_direction)}`, kind: "demonstration_image", purpose: "Demonstrate the approved practical process.", alt_text_direction: "Describe the action shown accurately.", status: "optional_missing" }], requiredContent: [section.heading_direction] });
  const care = strategy.structure.sections.find((item) => /care|wash|maintain/i.test(item.heading_direction));
  if (care) sequence.push({ type: "key_takeaway", purpose: care.purpose, evidenceIds: care.evidence_dependencies, requiredContent: [care.heading_direction, "concise care restrictions"] });
  if (strategy.priorities.questions_requiring_strong_answers.length) sequence.push({ type: "faq", purpose: "Answer only approved searcher questions with claim-level evidence boundaries.", evidenceIds: strategy.priorities.questions_requiring_strong_answers.flatMap((item) => item.evidence_ids), requiredContent: strategy.priorities.questions_requiring_strong_answers.map((item) => item.statement) });
  sequence.push({ type: "conclusion", purpose: "Summarise the decision framework once and give a proportionate next step without repeating the page.", evidenceIds: ids, productIds: products, linkIds: links.slice(0, 1), conversionRole: products.length ? "consideration" : "education", requiredContent: ["decision summary", "non-repetitive next step"] });
  const components = sequence.map(component);
  const content = {
    schema_version: "1.0.0", artifact_type: "editorial_page_plan", plan_version: EDITORIAL_PLAN_VERSION,
    page_type: "cornerstone", topic: packet.identity.topic, primary_query: packet.identity.primary_query,
    search_intent: { primary: packet.intent.primary, secondary: packet.intent.secondary },
    title_direction: strategy.structure.recommended_h1_direction.statement,
    h1_direction: strategy.structure.recommended_h1_direction.statement,
    introduction_objective: strategy.strategy.reader_outcome.statement,
    packet_id: packet.packet_id, strategy_id: strategy.strategy_id,
    components,
    component_sequence: components.map((item) => item.component_id),
    component_requirements: {
      policy_id: "cornerstone_decision_page_v1",
      required_component_types: ["hero", "quick_answer", "conclusion"],
      ordering_rules: [
        { rule: "component_at_position", component_type: "hero", position: 0 },
        { rule: "component_at_position", component_type: "quick_answer", position: 1 },
        { rule: "component_last", component_type: "conclusion" },
        { rule: "component_after", component_type: "product_recommendation", after_component_type: "quick_answer" }
      ]
    },
    allowed_component_types: [...COMPONENT_TYPES],
    human_review_state: "awaiting_page_plan_approval",
    drafting_authorised: false,
    publication_authorised: false,
    renderer_state: "not_implemented"
  };
  const planHash = sha256(content);
  return { ...content, plan_id: stableId("editorial_page_plan", { packet_id: packet.packet_id, strategy_id: strategy.strategy_id, plan_hash: planHash }), deterministic_content_sha256: planHash };
}
