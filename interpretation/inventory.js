import { stableId } from "../research/core/canonical.js";
import { DECISION_AREAS } from "./contracts.js";

const INVENTORY_VERSION = "1.0.0";
const GAP_MATRIX_VERSION = "1.0.0";

const AREA_RULES = Object.freeze({
  search_positioning: { present: [/^product\.(?:name|category_type|intended_use|claims|features)/], limitation: "Presence shows product positioning signals exist; it does not determine whether they are prominent or effective." },
  title_headings: { present: [/^product\.name$/], limitation: "The extracted product name establishes title presence; heading hierarchy and visual prominence are not determined." },
  differentiation: { present: [/^product\.(?:features|benefits|limitations|claims)/], includeRelated: (record) => /^product\.(?:faqs|objections_or_buying_questions)/.test(record.value?.field_path || "") && /(?:XL\s*800GSM|difference between)/i.test(String(record.value?.value || "")), limitation: "Distinctive claims, features and an XL 800GSM comparison are present, but relative differentiation versus external competitors is not established by page facts alone." },
  product_description_benefits: { present: [/^product\.(?:benefits|features|claims|intended_use)/], limitation: "Benefits or descriptive facts are present; completeness, ordering and persuasive quality require review." },
  specifications: { present: [/^product\.specifications/], limitation: "Structured specification facts are present; extraction does not judge their display quality." },
  faqs_questions: { present: [/^product\.faqs/], limitation: "FAQ content is present; visibility, schema markup and usefulness are not determined." },
  comparisons: { present: [/^product\.comparisons/], includeRelated: (record) => /^product\.(?:faqs|limitations|objections_or_buying_questions)/.test(record.value?.field_path || "") && /(?:XL\s*800GSM|difference between|compared with)/i.test(String(record.value?.value || "")), absenceDeterminable: true, limitation: "No dedicated comparison section was extracted. Existing XL 800GSM comparison content is present inside the FAQ and limitation facts and must not be treated as absent comparison content." },
  care_usage_guidance: { present: [/^product\.(?:care_instructions|how_to_use)/], limitation: "Care or usage guidance is present; placement and prominence are not determined." },
  internal_linking: { present: [/^product\.internal_links\[\d+\]\.url$/, /^product\.related_products\[\d+\]\.url$/], includeRelated: (record, facts) => {
    const match = String(record.value?.field_path || "").match(/^product\.(internal_links|related_products)\[(\d+)\]/);
    return Boolean(match && facts.some((candidate) => candidate.value?.field_path === `product.${match[1]}[${match[2]}].url`));
  }, limitation: "The Origin Shampoo is confirmed by extracted internal and related-product URLs. Microfibre Wash Mitt has an extracted related-product name but no extracted URL, so it is not counted as a confirmed link. Placement and crawl treatment are not determined." },
  metadata: { present: [/^product\.(?:meta_title|meta_description|metadata)/], limitation: "The current extraction artifact does not reliably capture page metadata, so absence cannot be concluded." },
  clarity_trust: { present: [/^product\.(?:claims|limitations|objections_or_buying_questions|faqs)/], limitation: "Deterministically observable claims, limitations or objection-handling elements exist; trust impact is not measured." }
});

function sourceRef(record) {
  return { evidence_id: record.evidence_id, field_path: record.value?.field_path, label: record.value?.label, value: record.value?.value, source_record_id: record.provenance?.source_record_id || null };
}

export function buildCurrentPageInventory({ researchState, evidence }) {
  const facts = evidence.records.filter((record) => researchState.source_evidence.evidence_ids.includes(record.evidence_id) && record.evidence_type === "product_fact");
  const areas = DECISION_AREAS.map((decisionArea) => {
    const rule = AREA_RULES[decisionArea];
    const direct = facts.filter((record) => rule.present.some((pattern) => pattern.test(record.value?.field_path || "")));
    const related = rule.includeRelated ? facts.filter((record) => rule.includeRelated(record, facts) && !direct.includes(record)) : [];
    const matching = [...direct, ...related];
    const presence = direct.length ? "present" : rule.absenceDeterminable ? "absent" : "unknown";
    return {
      decision_area: decisionArea,
      presence,
      current_evidence_ids: matching.map((record) => record.evidence_id).sort(),
      current_page_fact_refs: matching.map(sourceRef).sort((a, b) => a.evidence_id.localeCompare(b.evidence_id, "en")),
      direct_presence_evidence_ids: direct.map((record) => record.evidence_id).sort(),
      related_existing_content_evidence_ids: related.map((record) => record.evidence_id).sort(),
      component_states: decisionArea === "comparisons" ? {
        dedicated_comparison_section: presence,
        comparison_content_elsewhere: related.length ? "present" : "absent",
        comparison_content_location: related.length ? "FAQ and extracted comparison/limitation facts" : "none deterministically observed"
      } : null,
      limitations: [rule.limitation],
      source_provenance: {
        evidence_artifact_id: evidence.evidence_artifact_id,
        research_state_id: researchState.research_state_id,
        provider_id: "product_facts",
        source_evidence_ids: matching.map((record) => record.evidence_id).sort()
      }
    };
  });
  const identity = { version: INVENTORY_VERSION, research_state_id: researchState.research_state_id, evidence_artifact_id: evidence.evidence_artifact_id, areas: areas.map(({ decision_area, presence, current_evidence_ids }) => ({ decision_area, presence, current_evidence_ids })) };
  return { schema_version: "1.0.0", artifact_type: "current_page_inventory", inventory_version: INVENTORY_VERSION, inventory_id: stableId("page_inventory", identity), objective: researchState.objective.type, source_product: structuredClone(researchState.subject), source_evidence: { evidence_artifact_id: evidence.evidence_artifact_id, research_state_id: researchState.research_state_id }, decision_areas: areas };
}

const EXTERNAL_AREA_CATEGORIES = Object.freeze({
  search_positioning: ["keyword_ideas", "serp_advanced", "search_console"],
  title_headings: ["keyword_ideas", "serp_advanced", "search_console"],
  differentiation: ["serp_advanced"],
  product_description_benefits: ["keyword_ideas", "serp_advanced", "search_console"],
  specifications: ["serp_advanced"],
  faqs_questions: ["serp_advanced"],
  comparisons: ["serp_advanced"],
  care_usage_guidance: ["serp_advanced"],
  internal_linking: [],
  metadata: ["keyword_ideas", "search_console"],
  clarity_trust: ["serp_advanced"]
});

function observationText(record) {
  const value = record.observation || {};
  return [value.keyword, value.title, value.description, value.question, value.related_query, value.url].filter(Boolean).join(" ").toLowerCase();
}

function serpRelevantToArea(area, record) {
  if (record.evidence_category !== "serp_advanced") return true;
  const text = observationText(record);
  const question = ["serp_people_also_ask", "serp_related_search"].includes(record.evidence_type);
  const organic = record.evidence_type === "serp_organic_result";
  if (["search_positioning", "title_headings", "product_description_benefits"].includes(area)) return organic || question || ["serp_product_element", "serp_ai_overview"].includes(record.evidence_type);
  if (area === "differentiation") return (organic || question) && /(?:waffle|twist|plush|professional|best|versus|\bvs\b|difference|type)/i.test(text);
  if (area === "specifications") return (organic || question) && /(?:gsm|fibre|fiber|size|\bcm\b|edge|plush|waffle|twist|absorb|dry faster)/i.test(text);
  if (area === "faqs_questions") return question;
  if (area === "comparisons") return (organic || question) && /(?:waffle|twist|plush|professional|best|versus|\bvs\b|difference|compare|type)/i.test(text);
  if (area === "care_usage_guidance") return question && /(?:wash|care|clean|detergent|softener|bleach|store|how to use|dry faster)/i.test(text);
  if (area === "clarity_trust") return question && /(?:scratch|safe|paint|coating|streak|lint|how many|heavy when wet)/i.test(text);
  return false;
}

function reasons(entry, external, firstParty) {
  const result = [entry.presence === "present" ? "information already exists on page" : entry.presence === "absent" ? "page element is deterministically absent" : "current page state is unknown"];
  if (external.some((record) => record.evidence_category === "keyword_ideas")) result.push("relevant search demand exists");
  if (external.some((record) => record.evidence_category === "serp_advanced" && ["serp_people_also_ask", "serp_related_search"].includes(record.evidence_type))) result.push("PAA or related-search questions exist");
  if (external.some((record) => record.evidence_category === "serp_advanced" && record.evidence_type === "serp_organic_result")) result.push("SERP ranking pages provide external format or topic observations");
  if (firstParty.length) result.push("relevant Search Console visibility exists");
  if (!external.length && !firstParty.length) result.push("no external evidence suggests a change");
  return result;
}

export function buildGapMatrix({ inventory, contextEvidence }) {
  const matrix = inventory.decision_areas.map((entry) => {
    const allowed = EXTERNAL_AREA_CATEGORIES[entry.decision_area];
    const keywordEvidence = contextEvidence.filter((record) => allowed.includes("keyword_ideas") && record.evidence_category === "keyword_ideas").slice(0, 8);
    const serpEvidence = contextEvidence.filter((record) => allowed.includes("serp_advanced") && record.evidence_category === "serp_advanced" && serpRelevantToArea(entry.decision_area, record)).slice(0, 12);
    const external = [...keywordEvidence, ...serpEvidence];
    const firstParty = allowed.includes("search_console") ? contextEvidence.filter((record) => record.evidence_category === "search_console").slice(0, 8) : [];
    return {
      decision_area: entry.decision_area,
      current_state: entry.presence,
      external_evidence_available: external.length > 0,
      first_party_performance_evidence_available: firstParty.length > 0,
      current_evidence_ids: [...entry.current_evidence_ids],
      external_evidence_ids: external.map((record) => record.evidence_id).sort(),
      first_party_evidence_ids: firstParty.map((record) => record.evidence_id).sort(),
      relevant_evidence_ids: [...new Set([...entry.current_evidence_ids, ...external.map((record) => record.evidence_id), ...firstParty.map((record) => record.evidence_id)])].sort(),
      potential_review_reason: reasons(entry, external, firstParty),
      limitations: [...entry.limitations, "This deterministic matrix identifies review inputs only; it does not recommend a change or calculate an opportunity score."]
    };
  });
  const identity = { version: GAP_MATRIX_VERSION, inventory_id: inventory.inventory_id, areas: matrix.map(({ decision_area, current_state, relevant_evidence_ids }) => ({ decision_area, current_state, relevant_evidence_ids })) };
  return { schema_version: "1.0.0", artifact_type: "product_page_gap_matrix", gap_matrix_version: GAP_MATRIX_VERSION, gap_matrix_id: stableId("gap_matrix", identity), inventory_id: inventory.inventory_id, objective: inventory.objective, source_product: structuredClone(inventory.source_product), decision_areas: matrix };
}
