import { sha256, stableId } from "../research/core/canonical.js";
import { assertValid, validateEvidenceArtifact, validateResearchState } from "../research/validation/evidence.js";
import { EVIDENCE_CATEGORIES } from "./contracts.js";
import { buildCurrentPageInventory, buildGapMatrix } from "./inventory.js";
import { buildDecisionBrief } from "./brief.js";

export const INTERPRETATION_CONTEXT_VERSION = "1.0.0";
export const DEFAULT_CONTEXT_MAX_RECORDS = 96;
export const DEFAULT_CONTEXT_MAX_CHARACTERS = 120000;

export const CONTEXT_CATEGORIES = EVIDENCE_CATEGORIES;
const SELECTION_STRATA = Object.freeze([
  "product_truth",
  "market_demand",
  "serp_landscape",
  "serp_questions_related",
  "external_ranking_pages",
  "first_party_search_console"
]);

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "en"));
}

function categoryFor(record) {
  if (record.evidence_type === "product_fact") return "product_facts";
  if (record.evidence_type === "keyword_idea") return "keyword_ideas";
  if (record.evidence_type.startsWith("serp_")) return "serp_advanced";
  if (record.evidence_type.startsWith("search_console_")) return "search_console";
  return null;
}

function stratumFor(record) {
  if (record.evidence_type === "product_fact") return "product_truth";
  if (record.evidence_type === "keyword_idea") return "market_demand";
  if (["serp_people_also_ask", "serp_related_search"].includes(record.evidence_type)) return "serp_questions_related";
  if (record.evidence_type === "serp_organic_result") return "external_ranking_pages";
  if (record.evidence_type.startsWith("serp_")) return "serp_landscape";
  if (record.evidence_type.startsWith("search_console_")) return "first_party_search_console";
  return null;
}

function usefulValue(record) {
  const value = record.value || {};
  if (record.evidence_type === "product_fact") return { field_path: value.field_path, label: value.label, value: value.value };
  if (record.evidence_type === "keyword_idea") return {
    keyword: value.keyword,
    monthly_search_volume: value.monthly_search_volume,
    keyword_difficulty: value.keyword_difficulty,
    cpc_usd: value.cpc_usd,
    paid_competition_level: value.paid_competition_level
  };
  if (record.evidence_type.startsWith("search_console_")) return {
    query: value.query,
    page: value.page,
    clicks: value.clicks,
    impressions: value.impressions,
    ctr: value.ctr,
    average_position: value.average_position,
    keyword_relationship_count: value.keyword_relationships?.length || 0,
    page_relationship_count: value.page_relationships?.length || 0
  };
  return {
    keyword: value.keyword,
    serp_item_type: value.serp_item_type,
    title: value.title,
    description: value.description,
    url: value.url,
    domain: value.domain,
    rank_group: value.rank_group,
    rank_absolute: value.rank_absolute,
    question: value.question,
    related_query: value.related_query
  };
}

function numeric(value, fallback = -1) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function factPriority(record) {
  const path = record.value?.field_path || "";
  const priorities = [
    /^product\.name$/,
    /^product\.category_type$/,
    /specifications\[\d+\]\.value$/,
    /specification|feature|benefit/,
    /faq|question|how_to|usage|care/,
    /description|audience|problem|objection/,
    /url|link/
  ];
  const index = priorities.findIndex((pattern) => pattern.test(path));
  return index < 0 ? priorities.length : index;
}

function compareCandidates(a, b) {
  if (a.stratum !== b.stratum) return SELECTION_STRATA.indexOf(a.stratum) - SELECTION_STRATA.indexOf(b.stratum);
  const ar = a.record;
  const br = b.record;
  if (a.stratum === "product_truth") {
    return factPriority(ar) - factPriority(br) || ar.evidence_id.localeCompare(br.evidence_id, "en");
  }
  if (a.stratum === "market_demand") {
    return relevanceScore(br) - relevanceScore(ar) || numeric(br.value?.monthly_search_volume) - numeric(ar.value?.monthly_search_volume) ||
      numeric(ar.value?.keyword_difficulty, Number.MAX_SAFE_INTEGER) - numeric(br.value?.keyword_difficulty, Number.MAX_SAFE_INTEGER) ||
      ar.evidence_id.localeCompare(br.evidence_id, "en");
  }
  if (a.stratum === "first_party_search_console") {
    const aRelated = (ar.value?.page_relationships?.length || 0) + (ar.value?.keyword_relationships?.length || 0);
    const bRelated = (br.value?.page_relationships?.length || 0) + (br.value?.keyword_relationships?.length || 0);
    return relevanceScore(br) - relevanceScore(ar) || bRelated - aRelated || numeric(br.value?.impressions) - numeric(ar.value?.impressions) || numeric(br.value?.clicks) - numeric(ar.value?.clicks) || ar.evidence_id.localeCompare(br.evidence_id, "en");
  }
  return numeric(ar.value?.rank_absolute, Number.MAX_SAFE_INTEGER) - numeric(br.value?.rank_absolute, Number.MAX_SAFE_INTEGER) || ar.evidence_id.localeCompare(br.evidence_id, "en");
}

const RELEVANT_TERMS = Object.freeze(["drying towel", "car drying", "microfiber towel", "microfibre towel", "1200gsm", "1200 gsm", "waffle weave", "drying cloth"]);

function relevanceScore(record) {
  const text = `${record.value?.keyword || ""} ${record.value?.query || ""} ${record.query_or_question || ""}`.toLowerCase();
  return RELEVANT_TERMS.reduce((score, term) => score + (text.includes(term) ? term.split(" ").length : 0), 0);
}

function summaryItem(record) {
  const observation = record.observation;
  if (record.evidence_category === "product_facts") return { evidence_ids: [record.evidence_id], evidence_category: record.evidence_category, content: `${observation.label || observation.field_path}: ${observation.value}`, field_path: observation.field_path };
  if (record.evidence_category === "keyword_ideas") return { evidence_ids: [record.evidence_id], evidence_category: record.evidence_category, search_term: observation.keyword, monthly_search_volume: observation.monthly_search_volume, keyword_difficulty: observation.keyword_difficulty, cpc_usd: observation.cpc_usd, paid_competition_level: observation.paid_competition_level };
  if (record.evidence_category === "search_console") return { evidence_ids: [record.evidence_id], evidence_category: record.evidence_category, query: observation.query, page: observation.page, impressions: observation.impressions, clicks: observation.clicks, ctr: observation.ctr, average_position: observation.average_position };
  return { evidence_ids: [record.evidence_id], evidence_category: record.evidence_category, search_term: observation.keyword, result_type: observation.serp_item_type, title: observation.title, description: observation.description, url: observation.url, domain: observation.domain, rank: observation.rank_absolute, question: observation.question, related_search: observation.related_query };
}

function semanticKey(candidate) {
  const record = candidate.record;
  const value = record.value || {};
  if (candidate.stratum === "product_truth") return `${candidate.stratum}:${value.field_path}`;
  if (candidate.stratum === "market_demand") return `${candidate.stratum}:${String(value.keyword || "").toLowerCase()}`;
  if (candidate.stratum === "first_party_search_console") return `${candidate.stratum}:${record.evidence_type}:${value.query || ""}:${value.page || ""}`;
  return `${candidate.stratum}:${record.evidence_type}:${value.keyword || ""}:${value.question || value.related_query || value.url || value.title || record.evidence_id}`;
}

function contextRecord(candidate) {
  const { record, category } = candidate;
  return {
    evidence_id: record.evidence_id,
    evidence_category: category,
    evidence_type: record.evidence_type,
    provider_id: record.provider_id,
    observation: usefulValue(record),
    query_or_question: record.query_or_question,
    observed_at: record.observed_at,
    source_record_id: record.provenance?.source_record_id,
    parent_evidence_ids: sortedUnique(record.provenance?.parent_evidence_ids || [])
  };
}

function citationRegistry({ selected, inventory, gapMatrix, sourceById }) {
  const entryPaths = new Map();
  const add = (id, path) => {
    if (!sourceById.has(id)) throw new Error(`Citable evidence ${id} is not in the permitted source evidence set.`);
    if (!entryPaths.has(id)) entryPaths.set(id, new Set());
    entryPaths.get(id).add(path);
  };
  for (const record of selected) add(record.evidence_id, "context");
  for (const area of inventory.decision_areas) for (const id of area.current_evidence_ids) add(id, "inventory");
  for (const area of gapMatrix.decision_areas) for (const id of area.relevant_evidence_ids) add(id, "gap_matrix");

  const records = [...entryPaths.entries()].map(([evidenceId, paths]) => {
    const source = sourceById.get(evidenceId);
    const evidenceCategory = categoryFor(source);
    if (!evidenceCategory) throw new Error(`Citable evidence ${evidenceId} has no canonical interpretation category.`);
    return {
      evidence_id: evidenceId,
      evidence_category: evidenceCategory,
      evidence_type: source.evidence_type,
      provider_id: source.provider_id,
      observation: usefulValue(source),
      query_or_question: source.query_or_question,
      observed_at: source.observed_at,
      provenance: {
        source_record_id: source.provenance?.source_record_id || null,
        parent_evidence_ids: sortedUnique(source.provenance?.parent_evidence_ids || []),
        source_url: source.provenance?.source_url || source.value?.url || null
      },
      interpretation_input_paths: [...paths].sort((a, b) => a.localeCompare(b, "en"))
    };
  }).sort((a, b) => a.evidence_id.localeCompare(b.evidence_id, "en"));
  const inventoryIds = new Set(inventory.decision_areas.flatMap((area) => area.current_evidence_ids));
  const gapIds = new Set(gapMatrix.decision_areas.flatMap((area) => area.relevant_evidence_ids));
  const identity = { records: records.map(({ evidence_id, evidence_category, interpretation_input_paths }) => ({ evidence_id, evidence_category, interpretation_input_paths })) };
  return {
    schema_version: "1.0.0",
    artifact_type: "interpretation_citation_registry",
    citation_registry_id: stableId("interpretation_citation_registry", identity),
    counts: {
      budgeted_research_records: selected.length,
      deterministic_inventory_records: inventoryIds.size,
      gap_matrix_references: gapIds.size,
      total_unique_citable_evidence_ids: records.length
    },
    records
  };
}

export function buildInterpretationContext({
  researchState,
  evidence,
  maxRecords = DEFAULT_CONTEXT_MAX_RECORDS,
  maxCharacters = DEFAULT_CONTEXT_MAX_CHARACTERS
}) {
  assertValid("Research state", researchState, validateResearchState);
  assertValid("Source evidence", evidence, validateEvidenceArtifact);
  if (researchState.objective.type !== "improve_existing_product_page") throw new Error("The first interpretation context supports only improve_existing_product_page.");
  if (researchState.sufficiency.interpretation_may_proceed !== true) throw new Error(`Interpretation blocked: research state is ${researchState.sufficiency.state}.`);
  if (researchState.source_evidence.evidence_artifact_id !== evidence.evidence_artifact_id) throw new Error("Research state and source evidence artifact IDs do not match.");
  if (!Number.isInteger(Number(maxRecords)) || Number(maxRecords) < CONTEXT_CATEGORIES.length) throw new Error(`Context maxRecords must be an integer of at least ${CONTEXT_CATEGORIES.length}.`);
  if (!Number.isInteger(Number(maxCharacters)) || Number(maxCharacters) < 1000) throw new Error("Context maxCharacters must be an integer of at least 1000.");

  const permittedIds = new Set(researchState.source_evidence.evidence_ids);
  const currentPageInventory = buildCurrentPageInventory({ researchState, evidence });
  const sourceById = new Map(evidence.records.filter((record) => permittedIds.has(record.evidence_id)).map((record) => [record.evidence_id, record]));
  const conflictIds = new Set(researchState.conflicts.flatMap((conflict) => conflict.evidence_ids));
  const candidates = [...sourceById.values()].flatMap((record) => {
    const category = categoryFor(record);
    const stratum = stratumFor(record);
    return category && stratum ? [{ record, category, stratum, conflict: conflictIds.has(record.evidence_id) }] : [];
  }).sort(compareCandidates);

  const selected = [];
  const selectedIds = new Set();
  const seenSemantic = new Set();
  const exclusions = new Map();
  let usedCharacters = 0;

  function include(candidate, required = false) {
    if (selectedIds.has(candidate.record.evidence_id)) return true;
    const item = contextRecord(candidate);
    const size = JSON.stringify(item).length;
    if (!required && selected.length >= Number(maxRecords)) return false;
    if (!required && usedCharacters + size > Number(maxCharacters)) return false;
    selected.push(item);
    selectedIds.add(candidate.record.evidence_id);
    seenSemantic.add(semanticKey(candidate));
    usedCharacters += size;
    return true;
  }

  for (const category of EVIDENCE_CATEGORIES) {
    const first = candidates.find((candidate) => candidate.category === category);
    if (first) include(first, true);
  }
  for (const pattern of [/^product\.name$/, /benefit/, /specifications\[\d+\]\.value$|feature/, /care_instruction/, /faq/, /internal_links|related_products/]) {
    const representative = candidates.find((candidate) => candidate.category === "product_facts" && pattern.test(candidate.record.value?.field_path || ""));
    if (representative) include(representative, true);
  }
  for (const candidate of candidates.filter((item) => item.conflict)) include(candidate, true);
  const categoryQueues = SELECTION_STRATA.map((stratum) => candidates.filter((candidate) => candidate.stratum === stratum));
  let queueIndex = 0;
  while (categoryQueues.some((queue) => queue.length)) {
    const queue = categoryQueues[queueIndex % categoryQueues.length];
    queueIndex += 1;
    const candidate = queue.shift();
    if (!candidate || selectedIds.has(candidate.record.evidence_id)) continue;
    const key = semanticKey(candidate);
    if (seenSemantic.has(key)) { exclusions.set(candidate.record.evidence_id, "redundant_semantic_observation"); continue; }
    if (!include(candidate)) exclusions.set(candidate.record.evidence_id, selected.length >= Number(maxRecords) ? "record_budget_exceeded" : "character_budget_exceeded");
  }
  for (const record of evidence.records) {
    if (!permittedIds.has(record.evidence_id)) continue;
    if (selectedIds.has(record.evidence_id) || exclusions.has(record.evidence_id)) continue;
    exclusions.set(record.evidence_id, categoryFor(record) ? "lower_deterministic_priority" : "not_relevant_to_objective_context");
  }

  selected.sort((a, b) => EVIDENCE_CATEGORIES.indexOf(a.evidence_category) - EVIDENCE_CATEGORIES.indexOf(b.evidence_category) || a.evidence_type.localeCompare(b.evidence_type, "en") || a.evidence_id.localeCompare(b.evidence_id, "en"));
  const represented = sortedUnique(selected.map((item) => item.evidence_category));
  const availableMajorCategories = sortedUnique(candidates.map((item) => item.category));
  const evidenceSummaries = Object.fromEntries(EVIDENCE_CATEGORIES.map((category) => [category, selected.filter((item) => item.evidence_category === category).map(summaryItem)]));
  const gapMatrix = buildGapMatrix({ inventory: currentPageInventory, contextEvidence: selected });
  const registry = citationRegistry({ selected, inventory: currentPageInventory, gapMatrix, sourceById });
  const missingRequired = EVIDENCE_CATEGORIES.filter((category) => candidates.some((candidate) => candidate.category === category) && !represented.includes(category));
  if (missingRequired.length) throw new Error(`Context budget removed required categories: ${missingRequired.join(", ")}.`);
  const exclusionReasonCounts = {};
  for (const reason of exclusions.values()) exclusionReasonCounts[reason] = (exclusionReasonCounts[reason] || 0) + 1;
  const identity = {
    version: INTERPRETATION_CONTEXT_VERSION,
    research_state_id: researchState.research_state_id,
    objective: researchState.objective,
    budget: { max_records: Number(maxRecords), max_characters: Number(maxCharacters) },
    included_evidence_ids: selected.map((item) => item.evidence_id)
  };
  const context = {
    schema_version: "1.0.0",
    artifact_type: "interpretation_context",
    context_version: INTERPRETATION_CONTEXT_VERSION,
    interpretation_context_id: stableId("interpretation_context", identity),
    objective: structuredClone(researchState.objective),
    source_product: structuredClone(researchState.subject),
    source_research_state: { research_state_id: researchState.research_state_id, sha256: sha256(researchState) },
    source_evidence: { evidence_artifact_id: evidence.evidence_artifact_id, sha256: researchState.source_evidence.sha256 },
    sufficiency: structuredClone(researchState.sufficiency),
    budget: {
      max_records: Number(maxRecords),
      max_characters: Number(maxCharacters),
      characters_used: usedCharacters,
      records_considered: permittedIds.size,
      records_included: selected.length,
      records_excluded: permittedIds.size - selected.length,
      budget_overflow_for_conflicts: Math.max(0, selected.length - Number(maxRecords))
    },
    evidence_categories_represented: represented,
    evidence_categories_available: availableMajorCategories,
    evidence_summaries: evidenceSummaries,
    current_page_inventory: currentPageInventory,
    gap_matrix: gapMatrix,
    citation_registry: registry,
    evidence: selected,
    excluded_evidence: [...exclusions.entries()].map(([evidence_id, reason]) => ({ evidence_id, reason })).sort((a, b) => a.evidence_id.localeCompare(b.evidence_id, "en")),
    exclusion_reason_counts: Object.fromEntries(Object.entries(exclusionReasonCounts).sort(([a], [b]) => a.localeCompare(b, "en"))),
    conflicts: structuredClone(researchState.conflicts),
    missing_evidence_categories: structuredClone(researchState.missing_evidence_categories),
    limitations: [
      "Context selection is deterministic and budgeted; excluded source evidence remains available in the research state and source evidence artifact.",
      "SERP observations describe returned search results and do not establish that competitor claims are true.",
      "Search Console observations describe the configured historical date range and are not forecasts.",
      "This context permits interpretation only; it does not authorise content generation or publication."
    ]
  };
  context.decision_brief = buildDecisionBrief(context);
  return context;
}

export function modelContext(context) {
  return { decision_brief: context.decision_brief };
}
