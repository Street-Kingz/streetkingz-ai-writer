import { OBJECTIVE_TYPES, SCHEMA_VERSION } from "../contracts/schemas.js";
import { canonicalJson, sha256, stableId } from "../core/canonical.js";
import { assertValid, validateEvidenceArtifact, validateResearchState } from "../validation/evidence.js";

export const AGGREGATION_VERSION = "1.0.0";
export const OBJECTIVE_CONTRACT_VERSION = "1.0.0";

export const OBJECTIVE_CONTRACTS = Object.freeze({
  improve_existing_product_page: Object.freeze([
    "reliable_product_facts",
    "relevant_market_query_evidence",
    "relevant_serp_evidence",
    "first_party_product_page_assessment"
  ]),
  create_supporting_content: Object.freeze([
    "reliable_product_topic_facts",
    "market_demand_query_evidence",
    "serp_intent_content_shape_evidence",
    "existing_site_duplication_assessment"
  ]),
  identify_content_opportunities: Object.freeze([
    "market_demand_evidence",
    "serp_landscape_evidence",
    "existing_site_coverage_assessment"
  ]),
  create_seo_article: Object.freeze([
    "reliable_product_topic_facts",
    "market_demand_query_evidence",
    "serp_intent_content_shape_evidence"
  ])
});

function normaliseText(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replaceAll("microfibre", "microfiber").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function canonicalUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch { return null; }
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "en"));
}

function addToSetMap(map, key, value) {
  if (!key || !value) return;
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

function byProviderAndType(records) {
  const providers = {};
  const types = {};
  for (const record of records) {
    providers[record.provider_id] = (providers[record.provider_id] || 0) + 1;
    types[record.evidence_type] = (types[record.evidence_type] || 0) + 1;
  }
  return {
    total: records.length,
    by_provider: Object.fromEntries(Object.entries(providers).sort(([a], [b]) => a.localeCompare(b, "en"))),
    by_type: Object.fromEntries(Object.entries(types).sort(([a], [b]) => a.localeCompare(b, "en")))
  };
}

function ensureTopicGroup(groups, phrase) {
  const normalised = normaliseText(phrase);
  if (!normalised) return null;
  if (!groups.has(normalised)) groups.set(normalised, {
    normalised_phrase: normalised,
    phrases: new Set(),
    source_evidence_ids: new Set(),
    product_evidence_ids: new Set(),
    keyword_idea_evidence_ids: new Set(),
    serp_evidence_ids: new Set(),
    search_console_evidence_ids: new Set(),
    questions: new Set(),
    related_phrases: new Set(),
    relationship_methods: new Set(),
    evidence_types: new Map()
  });
  const group = groups.get(normalised);
  group.phrases.add(String(phrase).trim());
  return group;
}

function productFacts(records) {
  return records.filter((record) => record.evidence_type === "product_fact");
}

function buildTopicGroups(records) {
  const groups = new Map();
  let rawRelationshipCount = 0;
  const canonicalRelationshipKeys = new Set();
  const unmatchedSearchConsole = new Set();

  for (const record of records) {
    const phrase = record.evidence_type === "keyword_idea" ? record.value?.keyword : record.evidence_type.startsWith("serp_") ? record.value?.keyword : null;
    if (!phrase) continue;
    const group = ensureTopicGroup(groups, phrase);
    if (!group) continue;
    group.source_evidence_ids.add(record.evidence_id);
    addToSetMap(group.evidence_types, record.evidence_type, record.evidence_id);
    if (record.evidence_type === "keyword_idea") {
      group.keyword_idea_evidence_ids.add(record.evidence_id);
      for (const id of record.provenance?.parent_evidence_ids || []) group.product_evidence_ids.add(id);
    } else {
      group.serp_evidence_ids.add(record.evidence_id);
      if (record.value?.question) group.questions.add(record.value.question);
      if (record.value?.related_query) group.related_phrases.add(record.value.related_query);
      for (const id of record.provenance?.parent_evidence_ids || []) group.keyword_idea_evidence_ids.add(id);
    }
  }

  for (const record of records.filter((item) => item.evidence_type.startsWith("search_console_"))) {
    const relationships = Array.isArray(record.value?.keyword_relationships) ? record.value.keyword_relationships : [];
    rawRelationshipCount += relationships.length;
    if (!relationships.length) unmatchedSearchConsole.add(record.evidence_id);
    for (const relationship of relationships) {
      const group = ensureTopicGroup(groups, relationship.target);
      if (!group) continue;
      group.source_evidence_ids.add(record.evidence_id);
      group.search_console_evidence_ids.add(record.evidence_id);
      group.relationship_methods.add(relationship.method || "existing_provider_relationship");
      addToSetMap(group.evidence_types, record.evidence_type, record.evidence_id);
      canonicalRelationshipKeys.add(`${record.evidence_id}:${group.normalised_phrase}:${relationship.method || "existing_provider_relationship"}`);
    }
  }

  const output = [...groups.values()].map((group) => {
    const evidenceByType = Object.fromEntries([...group.evidence_types.entries()].sort(([a], [b]) => a.localeCompare(b, "en")).map(([type, ids]) => [type, sortedUnique([...ids])]));
    const identity = { normalised_phrase: group.normalised_phrase, source_evidence_ids: sortedUnique([...group.source_evidence_ids]) };
    return {
      group_id: stableId("topic", identity),
      normalised_phrase: group.normalised_phrase,
      display_phrase: sortedUnique([...group.phrases]).sort((a, b) => a.length - b.length || a.localeCompare(b, "en"))[0] || group.normalised_phrase,
      phrases: sortedUnique([...group.phrases]),
      evidence_by_type: evidenceByType,
      source_evidence_ids: identity.source_evidence_ids,
      product_evidence_ids: sortedUnique([...group.product_evidence_ids]),
      keyword_idea_evidence_ids: sortedUnique([...group.keyword_idea_evidence_ids]),
      serp_evidence_ids: sortedUnique([...group.serp_evidence_ids]),
      search_console_evidence_ids: sortedUnique([...group.search_console_evidence_ids]),
      questions: sortedUnique([...group.questions]),
      related_phrases: sortedUnique([...group.related_phrases]),
      relationship_methods: sortedUnique([...group.relationship_methods])
    };
  }).sort((a, b) => a.normalised_phrase.localeCompare(b.normalised_phrase, "en"));

  return {
    groups: output,
    relationshipSummary: {
      raw_relationship_count: rawRelationshipCount,
      canonical_relationship_count: canonicalRelationshipKeys.size,
      duplicate_relationships_collapsed: Math.max(0, rawRelationshipCount - canonicalRelationshipKeys.size),
      matched_evidence_ids: sortedUnique(output.flatMap((group) => group.search_console_evidence_ids)),
      unmatched_evidence_ids: sortedUnique([...unmatchedSearchConsole])
    }
  };
}

function buildSitePages(records, subject) {
  const pages = new Map();
  for (const record of records.filter((item) => item.evidence_type.startsWith("search_console_"))) {
    const page = canonicalUrl(record.value?.page);
    if (!page) continue;
    if (!pages.has(page)) pages.set(page, { evidenceIds: new Set(), queryEvidenceIds: new Set(), relationshipMethods: new Set() });
    const entry = pages.get(page);
    entry.evidenceIds.add(record.evidence_id);
    if (record.value?.query) entry.queryEvidenceIds.add(record.evidence_id);
    for (const relationship of record.value?.page_relationships || []) entry.relationshipMethods.add(relationship.method);
  }
  const productUrl = canonicalUrl(subject.product_url);
  return [...pages.entries()].map(([url, entry]) => ({
    page_id: stableId("site_page", { url }),
    url,
    is_source_product_page: url === productUrl,
    evidence_ids: sortedUnique([...entry.evidenceIds]),
    query_relationship_evidence_ids: sortedUnique([...entry.queryEvidenceIds]),
    relationship_methods: sortedUnique([...entry.relationshipMethods])
  })).sort((a, b) => a.url.localeCompare(b.url, "en"));
}

function buildExternalLandscape(records) {
  const pages = new Map();
  const domains = new Map();
  for (const record of records.filter((item) => item.evidence_type === "serp_organic_result")) {
    const url = canonicalUrl(record.value?.url);
    const domain = String(record.value?.domain || (url ? new URL(url).hostname : "")).toLowerCase();
    if (url) addToSetMap(pages, url, record.evidence_id);
    if (domain) addToSetMap(domains, domain, record.evidence_id);
  }
  return {
    pages: [...pages.entries()].map(([url, ids]) => ({ page_id: stableId("external_page", { url }), url, domain: new URL(url).hostname, evidence_ids: sortedUnique([...ids]) })).sort((a, b) => a.url.localeCompare(b.url, "en")),
    domains: [...domains.entries()].map(([domain, ids]) => ({ domain_id: stableId("external_domain", { domain }), domain, evidence_ids: sortedUnique([...ids]) })).sort((a, b) => a.domain.localeCompare(b.domain, "en"))
  };
}

function buildSerpFeatures(records) {
  const features = new Map();
  for (const record of records.filter((item) => item.evidence_type.startsWith("serp_") && item.evidence_type !== "serp_organic_result")) {
    const keyword = normaliseText(record.value?.keyword);
    const key = `${record.evidence_type}:${keyword}`;
    if (!features.has(key)) features.set(key, { evidenceType: record.evidence_type, keyword, evidenceIds: new Set() });
    features.get(key).evidenceIds.add(record.evidence_id);
  }
  return [...features.values()].map((feature) => ({
    observation_id: stableId("serp_observation", { evidence_type: feature.evidenceType, keyword: feature.keyword }),
    evidence_type: feature.evidenceType,
    keyword: feature.keyword,
    evidence_ids: sortedUnique([...feature.evidenceIds])
  })).sort((a, b) => a.evidence_type.localeCompare(b.evidence_type, "en") || a.keyword.localeCompare(b.keyword, "en"));
}

function detectConflicts(records) {
  const candidates = new Map();
  for (const record of records) {
    let key;
    let value;
    if (record.evidence_type === "product_fact") {
      key = `product_fact:${record.value?.field_path}`;
      value = record.value?.value;
    } else if (record.evidence_type === "keyword_idea") {
      key = `keyword_idea:${normaliseText(record.value?.keyword)}`;
      value = {
        monthly_search_volume: record.value?.monthly_search_volume ?? null,
        keyword_difficulty: record.value?.keyword_difficulty ?? null
      };
    } else continue;
    if (!candidates.has(key)) candidates.set(key, []);
    candidates.get(key).push({ evidence_id: record.evidence_id, value });
  }
  return [...candidates.entries()].flatMap(([key, observations]) => {
    const values = new Map(observations.map((observation) => [canonicalJson(observation.value), observation.value]));
    if (values.size < 2) return [];
    return [{
      conflict_id: stableId("conflict", { key, evidence_ids: sortedUnique(observations.map((item) => item.evidence_id)) }),
      semantic_key: key,
      evidence_ids: sortedUnique(observations.map((item) => item.evidence_id)),
      observed_values: [...values.values()].sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b), "en")),
      resolution: "unresolved",
      reason: "Source evidence contains distinct values for the same deterministic semantic key; aggregation preserves every observation."
    }];
  }).sort((a, b) => a.semantic_key.localeCompare(b.semantic_key, "en"));
}

function requirementResult(id, context) {
  const { records, topicGroups, sitePages, providerStatus, subject } = context;
  const facts = productFacts(records);
  const keywordGroups = topicGroups.filter((group) => group.keyword_idea_evidence_ids.length);
  const serpGroups = topicGroups.filter((group) => group.serp_evidence_ids.length);
  const serpOrganic = records.filter((record) => record.evidence_type === "serp_organic_result");
  const serpFeatures = records.filter((record) => record.evidence_type.startsWith("serp_") && record.evidence_type !== "serp_organic_result");
  const searchConsole = records.filter((record) => record.evidence_type.startsWith("search_console_"));
  const searchConsoleAssessed = ["complete", "partial"].includes(providerStatus.get("google_search_console")) && searchConsole.length > 0;
  const evidenceIds = (values) => sortedUnique(values).slice(0, 25);
  const definitions = {
    reliable_product_facts: [facts.length > 0, facts.map((record) => record.evidence_id), "Active, provenance-backed Product Facts are available."],
    reliable_product_topic_facts: [facts.length > 0, facts.map((record) => record.evidence_id), "Active, provenance-backed product/topic facts are available."],
    relevant_market_query_evidence: [keywordGroups.length > 0, keywordGroups.flatMap((group) => group.keyword_idea_evidence_ids), "Product-seeded market/query evidence is represented in deterministic topic groups."],
    market_demand_query_evidence: [keywordGroups.length > 0, keywordGroups.flatMap((group) => group.keyword_idea_evidence_ids), "Market-demand query evidence is represented in deterministic topic groups."],
    market_demand_evidence: [keywordGroups.length > 0, keywordGroups.flatMap((group) => group.keyword_idea_evidence_ids), "Market-demand evidence is available; no metric cutoff is applied."],
    relevant_serp_evidence: [serpGroups.length > 0, serpGroups.flatMap((group) => group.serp_evidence_ids), "SERP evidence is linked to relevant keyword/topic groups."],
    serp_intent_content_shape_evidence: [serpOrganic.length > 0 && serpFeatures.length > 0, [...serpOrganic, ...serpFeatures].map((record) => record.evidence_id), "Organic results and observed SERP feature types provide inspectable intent/content-shape evidence."],
    serp_landscape_evidence: [serpGroups.length > 0, serpGroups.flatMap((group) => group.serp_evidence_ids), "The SERP landscape is represented for deterministic keyword/topic groups."],
    first_party_product_page_assessment: [searchConsoleAssessed && Boolean(subject.product_url), [...searchConsole.map((record) => record.evidence_id), ...facts.filter((record) => record.value?.field_path === "product.name").map((record) => record.evidence_id)], sitePages.some((page) => page.is_source_product_page) ? "Search Console contains performance evidence for the source product page." : "Search Console coverage was assessed for the configured property; no source-product-page match is preserved as a meaningful absence."],
    existing_site_duplication_assessment: [searchConsoleAssessed, searchConsole.map((record) => record.evidence_id), "First-party query/page coverage is available to assess existing-site overlap; unmatched topics remain explicit."],
    existing_site_coverage_assessment: [searchConsoleAssessed, searchConsole.map((record) => record.evidence_id), "First-party Search Console coverage is available, including zero-click observations." ]
  };
  const [satisfied, allIds, reason] = definitions[id];
  const relevantProvider = id.includes("product") && !id.includes("page_assessment") ? "product_facts"
    : id.includes("market") || id.includes("query_evidence") ? "dataforseo_keyword_ideas"
      : id.includes("serp") ? "dataforseo_google_organic_serp_advanced"
        : "google_search_console";
  const unavailable = !providerStatus.has(relevantProvider) || ["failed", "unavailable", "skipped"].includes(providerStatus.get(relevantProvider));
  return {
    requirement: id,
    status: satisfied ? "satisfied" : unavailable ? "unavailable" : "missing",
    supporting_evidence_ids: satisfied ? evidenceIds(allIds) : [],
    supporting_evidence_count: satisfied ? sortedUnique(allIds).length : 0,
    reason: satisfied ? reason : unavailable ? `${relevantProvider} is unavailable, so this evidence category could not be assessed.` : `No usable evidence relationship satisfied ${id.replaceAll("_", " ")}.`
  };
}

function evaluateSufficiency(objectiveType, context) {
  const checks = OBJECTIVE_CONTRACTS[objectiveType].map((id) => requirementResult(id, context));
  const satisfied = checks.filter((check) => check.status === "satisfied");
  const missing = checks.filter((check) => check.status !== "satisfied");
  const state = context.records.length === 0 || checks.every((check) => check.status === "unavailable")
    ? "unavailable"
    : missing.length === 0
      ? "sufficient"
      : satisfied.length === 0
        ? "insufficient"
        : "partial";
  const reason = state === "sufficient"
    ? `All ${checks.length} evidence-type and relationship requirements for ${objectiveType} are satisfied; no SEO metric thresholds or strategy judgments were applied.`
    : state === "unavailable"
      ? `Evidence required for ${objectiveType} is unavailable.`
      : `${satisfied.length} of ${checks.length} requirements are satisfied; missing or unavailable requirements must be resolved before interpretation.`;
  return {
    state,
    requirements_checked: checks,
    requirements_satisfied: satisfied.map((check) => check.requirement),
    requirements_missing: missing.map((check) => check.requirement),
    interpretation_may_proceed: state === "sufficient",
    reason
  };
}

export function aggregateResearchEvidence({ evidence, objective }) {
  assertValid("Source evidence artifact", evidence, validateEvidenceArtifact);
  if (!OBJECTIVE_TYPES.includes(objective)) throw new Error(`Unsupported research objective: ${objective}.`);
  const records = evidence.records.filter((record) => record.status === "active").toSorted((a, b) => a.evidence_id.localeCompare(b.evidence_id, "en"));
  const sourceEvidenceIds = records.map((record) => record.evidence_id);
  const sourceEvidenceHash = sha256({
    evidence_artifact_id: evidence.evidence_artifact_id,
    subject: evidence.subject,
    scope: evidence.scope,
    provider_runs: evidence.provider_runs.toSorted((a, b) => a.provider_id.localeCompare(b.provider_id, "en")),
    records
  });
  const providerStatus = new Map(evidence.provider_runs.map((provider) => [provider.provider_id, provider.status]));
  const topics = buildTopicGroups(records);
  const sitePages = buildSitePages(records, evidence.subject);
  const external = buildExternalLandscape(records);
  const serpFeatures = buildSerpFeatures(records);
  const conflicts = detectConflicts(records);
  const categoryPresence = {
    product_truth: records.some((record) => record.evidence_type === "product_fact"),
    market_demand: records.some((record) => record.evidence_type === "keyword_idea"),
    serp_landscape: records.some((record) => record.evidence_type.startsWith("serp_")),
    first_party_search_console: records.some((record) => record.evidence_type.startsWith("search_console_"))
  };
  const sufficiency = evaluateSufficiency(objective, { records, topicGroups: topics.groups, sitePages, providerStatus, subject: evidence.subject });
  const identity = {
    aggregation_version: AGGREGATION_VERSION,
    objective: { type: objective, contract_version: OBJECTIVE_CONTRACT_VERSION },
    source_evidence_artifact_id: evidence.evidence_artifact_id,
    source_evidence_hash: sourceEvidenceHash,
    source_evidence_ids: sourceEvidenceIds
  };
  const researchStateId = stableId("research_state", identity);
  const state = {
    schema_version: SCHEMA_VERSION,
    artifact_type: "research_state",
    aggregation_version: AGGREGATION_VERSION,
    research_state_id: researchStateId,
    research_run_id: stableId("research_run", { research_state_id: researchStateId, objective }),
    objective: { type: objective, contract_version: OBJECTIVE_CONTRACT_VERSION },
    source_evidence: {
      evidence_artifact_id: evidence.evidence_artifact_id,
      evidence_run_id: evidence.evidence_run_id,
      sha256: sourceEvidenceHash,
      evidence_ids: sourceEvidenceIds,
      record_count: records.length
    },
    subject: structuredClone(evidence.subject),
    scope: structuredClone(evidence.scope),
    providers: evidence.provider_runs.map((provider) => ({ provider_id: provider.provider_id, status: provider.status, evidence_record_count: provider.evidence_record_count })).sort((a, b) => a.provider_id.localeCompare(b.provider_id, "en")),
    evidence_counts: byProviderAndType(records),
    keyword_topic_groups: topics.groups,
    site_pages: sitePages,
    external_pages: external.pages,
    external_domains: external.domains,
    serp_feature_observations: serpFeatures,
    search_console_relationships: topics.relationshipSummary,
    conflicts,
    missing_evidence_categories: Object.entries(categoryPresence).filter(([, present]) => !present).map(([category]) => category),
    sufficiency
  };
  return assertValid("Research state", state, validateResearchState);
}
