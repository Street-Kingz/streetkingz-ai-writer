import { stableId } from "../research/core/canonical.js";
import { DECISION_AREAS, EVIDENCE_CATEGORIES } from "./contracts.js";

export const DECISION_BRIEF_VERSION = "1.0.0";

const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "en"));
const text = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const compact = (value) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== "" && !(Array.isArray(item) && !item.length)));

function phraseFamily(keyword) {
  return text(keyword).toLowerCase().replace(/microfibre/g, "microfiber").replace(/\btowels\b/g, "towel").replace(/\bcars\b/g, "car").replace(/[^a-z0-9]+/g, " ").trim();
}

function productSignals(records) {
  return records.map((record) => ({ ids: [record.evidence_id], signal: text(`${record.observation?.label || record.observation?.field_path}: ${record.observation?.value}`) }));
}

function keywordSignals(records) {
  const groups = new Map();
  for (const record of records) {
    const key = phraseFamily(record.observation?.keyword);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "en")).map(([family, members]) => ({
    ids: unique(members.map((record) => record.evidence_id)),
    phrase_family: family,
    variants: members.map((record) => compact({
      term: record.observation?.keyword,
      volume: record.observation?.monthly_search_volume,
      difficulty: record.observation?.keyword_difficulty,
      cpc_usd: record.observation?.cpc_usd,
      paid_competition: record.observation?.paid_competition_level
    })).sort((a, b) => text(a.term).localeCompare(text(b.term), "en")),
    volume_aggregation: "none"
  }));
}

function serpSignal(record) {
  const value = record.observation || {};
  return compact({
    ids: [record.evidence_id],
    type: record.evidence_type,
    searched_term: value.keyword,
    question: value.question,
    related_search: value.related_query,
    ranking_page: value.title,
    description: value.description,
    domain: value.domain,
    url: value.url,
    rank: value.rank_absolute
  });
}

function serpSignals(records) {
  const bySignal = new Map();
  for (const record of records) {
    const signal = serpSignal(record);
    const key = JSON.stringify({ ...signal, ids: undefined });
    if (!bySignal.has(key)) bySignal.set(key, signal);
    else bySignal.get(key).ids = unique([...bySignal.get(key).ids, record.evidence_id]);
  }
  return [...bySignal.values()].sort((a, b) => `${a.type}:${a.searched_term || ""}:${a.question || a.related_search || a.url || ""}`.localeCompare(`${b.type}:${b.searched_term || ""}:${b.question || b.related_search || b.url || ""}`, "en"));
}

function searchConsoleSignals(records) {
  return records.map((record) => compact({
    ids: [record.evidence_id],
    type: record.evidence_type,
    query: record.observation?.query,
    page: record.observation?.page,
    impressions: record.observation?.impressions,
    clicks: record.observation?.clicks,
    ctr: record.observation?.ctr,
    average_position: record.observation?.average_position,
    keyword_relationship_count: record.observation?.keyword_relationship_count,
    page_relationship_count: record.observation?.page_relationship_count
  })).sort((a, b) => `${a.query || ""}:${a.page || ""}:${a.type}`.localeCompare(`${b.query || ""}:${b.page || ""}:${b.type}`, "en"));
}

export function buildDecisionBrief(context) {
  const records = context.citation_registry.records;
  const byCategory = (category) => records.filter((record) => record.evidence_category === category);
  const inventory = new Map(context.current_page_inventory.decision_areas.map((area) => [area.decision_area, area]));
  const decisionAreas = context.gap_matrix.decision_areas.map((gap) => {
    const page = inventory.get(gap.decision_area);
    return compact({
      area: gap.decision_area,
      current_state: gap.current_state,
      current_evidence_ids: gap.current_evidence_ids,
      market_serp_evidence_ids: gap.external_evidence_ids,
      first_party_evidence_ids: gap.first_party_evidence_ids,
      review_inputs: gap.potential_review_reason,
      page_state_detail: page.component_states,
      limitations: page.limitations
    });
  });
  const signals = {
    product_facts: productSignals(byCategory("product_facts")),
    keyword_ideas: keywordSignals(byCategory("keyword_ideas")),
    serp_advanced: serpSignals(byCategory("serp_advanced")),
    search_console: searchConsoleSignals(byCategory("search_console"))
  };
  const citationIndex = records.map((record) => ({ id: record.evidence_id, category: record.evidence_category }));
  const unknowns = decisionAreas.filter((area) => area.current_state === "unknown").map((area) => ({ area: area.area, limitation: area.limitations[0] }));
  const identity = { version: DECISION_BRIEF_VERSION, context_id: context.interpretation_context_id, decision_areas: decisionAreas, signals, conflicts: context.conflicts };
  return {
    schema_version: "1.0.0",
    artifact_type: "interpretation_decision_brief",
    decision_brief_version: DECISION_BRIEF_VERSION,
    decision_brief_id: stableId("interpretation_decision_brief", identity),
    objective: context.objective,
    product: context.source_product,
    evidence_categories: [...EVIDENCE_CATEGORIES],
    decision_areas: decisionAreas,
    cross_cutting_signals: signals,
    conflicts: context.conflicts,
    unknowns,
    constraints: [
      "Page current_state is authoritative; unknown is not absent.",
      "Comparisons: dedicated section absent; XL 800GSM comparison content exists elsewhere.",
      "SERP observations show surfaced results, not truth or ranking requirements.",
      "Search Console metrics are historical observations and do not establish causation.",
      "Keyword volumes are per returned term and are not aggregated."
    ],
    citation_index: citationIndex,
    citation_registry_ref: context.citation_registry.citation_registry_id,
    required_decision_areas: [...DECISION_AREAS]
  };
}
