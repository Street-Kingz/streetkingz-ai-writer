import { sha256, stableId } from "../research/core/canonical.js";
import { assertValid, validateEvidenceArtifact, validateResearchState } from "../research/validation/evidence.js";
import {
  CORNERSTONE_BRIEF_VERSION,
  CORNERSTONE_PACKET_VERSION,
  CORNERSTONE_SCHEMA_VERSION
} from "./contracts.js";

const STOP = new Set("a an and are as at be by discover for from how in is it more of on or our rated read the their to up what when which with your".split(" "));
const COMMERCIAL = /\b(best|review|reviews|top|vs|versus|compare|comparison|which)\b/i;
const TRANSACTIONAL = /\b(buy|price|cheap|deal|shop|for sale)\b/i;
const INFORMATIONAL = /\b(how|why|what|when|guide|tips|properly|without)\b/i;

const text = (value) => String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
const normalise = (value) => text(value).toLowerCase().replaceAll("microfibre", "microfiber").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const unique = (values) => [...new Set(values.filter(Boolean).map(text))].sort((a, b) => a.localeCompare(b, "en"));
const evidenceIds = (records) => unique(records.map((record) => record.evidence_id));
const tokens = (value) => normalise(value).split(" ").filter((token) => token && !STOP.has(token));
const overlap = (a, b) => {
  const aa = new Set(tokens(a)); const bb = new Set(tokens(b));
  if (!aa.size || !bb.size) return 0;
  return [...aa].filter((token) => bb.has(token)).length / Math.min(aa.size, bb.size);
};
const queryCoverage = (candidate, primary) => {
  const candidateTokens = new Set(tokens(candidate)); const primaryTokens = new Set(tokens(primary));
  if (!primaryTokens.size) return 0;
  return [...primaryTokens].filter((token) => candidateTokens.has(token)).length / primaryTokens.size;
};
const canonicalUrl = (value) => { try { const url = new URL(value); url.hash = ""; url.search = ""; url.pathname = url.pathname.replace(/\/+$/, "") || "/"; return url.toString(); } catch { return null; } };
const classifyPageType = (record) => {
  const haystack = `${record.value?.title || ""} ${record.value?.description || ""} ${record.value?.url || ""}`;
  if (/youtube|video/i.test(haystack)) return "video";
  if (/reddit|forum|discussion/i.test(haystack)) return "discussion";
  if (/collections?|category|shop|products?/i.test(haystack)) return "commercial_listing";
  if (/best|guide|how|review|what/i.test(haystack)) return "editorial_guide";
  return "unclassified_page";
};

function trace(kind, statement, records = [], limitation = null) {
  return { kind, statement, evidence_ids: evidenceIds(records), limitation };
}

function selectTopicRecords(records, primaryQuery) {
  const exact = normalise(primaryQuery);
  return records.filter((record) => {
    const query = record.value?.keyword ?? record.value?.query ?? record.query_or_question;
    return normalise(query) === exact;
  });
}

function inferIntent(primaryQuery, serpRecords) {
  const types = serpRecords.filter((r) => r.evidence_type === "serp_organic_result").map(classifyPageType);
  const commercialPages = types.filter((type) => type === "commercial_listing").length;
  const editorialPages = types.filter((type) => type === "editorial_guide" || type === "discussion" || type === "video").length;
  let primary = "unclear";
  if (TRANSACTIONAL.test(primaryQuery)) primary = "transactional";
  else if (COMMERCIAL.test(primaryQuery)) primary = "commercial_investigation";
  else if (INFORMATIONAL.test(primaryQuery)) primary = "informational";
  else if (commercialPages && editorialPages) primary = "mixed";
  const secondary = primary === "commercial_investigation" && editorialPages ? "informational" : primary === "informational" && commercialPages ? "commercial_investigation" : null;
  const supporting = serpRecords.filter((r) => r.evidence_type === "serp_organic_result" || r.evidence_type === "serp_people_also_ask");
  return {
    primary,
    secondary,
    confidence: supporting.length >= 5 ? "high" : supporting.length >= 2 ? "medium" : "low",
    trace: trace("deterministic_derivation", `Query wording and ${types.length} classified organic results indicate ${primary} intent${secondary ? ` with ${secondary} support` : ""}.`, supporting, types.length ? null : "No organic result evidence was available; intent remains provisional.")
  };
}

function supportingQueries(records, primaryQuery) {
  return records.filter((r) => r.evidence_type === "keyword_idea" && normalise(r.value?.keyword) !== normalise(primaryQuery) && overlap(r.value?.keyword, primaryQuery) >= 0.6)
    .map((r) => ({ query: r.value.keyword, metrics: { monthly_search_volume: r.value.monthly_search_volume ?? null, cpc_usd: r.value.cpc_usd ?? null, paid_competition_level: r.value.paid_competition_level ?? null, keyword_difficulty: r.value.keyword_difficulty ?? null }, evidence_ids: [r.evidence_id] }))
    .sort((a, b) => (b.metrics.monthly_search_volume ?? -1) - (a.metrics.monthly_search_volume ?? -1) || a.query.localeCompare(b.query, "en")).slice(0, 8);
}

function recurringTerms(serpRecords, primaryQuery) {
  const primaryTokens = new Set(tokens(primaryQuery));
  const counts = new Map(); const ids = new Map();
  for (const record of serpRecords.filter((r) => r.evidence_type === "serp_organic_result")) {
    for (const token of new Set(tokens(`${record.value?.title || ""} ${record.value?.description || ""}`).filter((item) => /^[a-z]{4,}$/.test(item) && !primaryTokens.has(item)))) {
      counts.set(token, (counts.get(token) || 0) + 1);
      if (!ids.has(token)) ids.set(token, []); ids.get(token).push(record.evidence_id);
    }
  }
  return [...counts.entries()].filter(([, count]) => count >= 2).map(([term, count]) => ({ term, observed_result_count: count, evidence_ids: unique(ids.get(term)) })).sort((a, b) => b.observed_result_count - a.observed_result_count || a.term.localeCompare(b.term, "en")).slice(0, 15);
}

function siteCandidates(evidence, researchState, primaryQuery, proposedUrl) {
  const records = evidence.records.filter((r) => r.status === "active" && r.evidence_type.startsWith("search_console_") && r.value?.page);
  const byUrl = new Map();
  for (const record of records) {
    const queryRelevance = queryCoverage(record.value?.query, primaryQuery);
    const pageRelevance = queryCoverage(record.value?.page, primaryQuery);
    if (queryRelevance < 0.75 || pageRelevance < 0.5) continue;
    const url = record.value.page;
    if (!byUrl.has(url)) byUrl.set(url, { records: [], relevance: 0 });
    byUrl.get(url).records.push(record); byUrl.get(url).relevance = Math.max(byUrl.get(url).relevance, Math.min(queryRelevance, pageRelevance));
  }
  const known = new Set(researchState.site_pages.map((page) => canonicalUrl(page.url)));
  return [...byUrl.entries()].filter(([url]) => known.has(canonicalUrl(url)) && !/\/page\/\d+\/?$|\/product-tag\//i.test(url)).map(([url, item]) => ({
    source_page: proposedUrl || "proposed_cornerstone_page",
    destination_page: url,
    relationship: "Existing Street Kingz page has observed query/page relevance to the cornerstone topic.",
    suggested_anchor_direction: `Use descriptive natural language about ${primaryQuery}; exact-match wording is not required.`,
    confidence: item.relevance >= 0.75 ? "high" : "medium",
    evidence_ids: evidenceIds(item.records).slice(0, 12)
  })).sort((a, b) => a.destination_page.localeCompare(b.destination_page, "en")).slice(0, 8);
}

function relevantProducts(evidence, primaryQuery) {
  const facts = evidence.records.filter((r) => r.status === "active" && r.evidence_type === "product_fact");
  const identityFacts = facts.filter((r) => /product\.(name|type|category)/.test(r.value?.field_path || ""));
  const score = Math.max(...identityFacts.map((r) => overlap(r.value?.value, primaryQuery)), 0);
  if (score < 0.35) return [];
  return [{
    subject_id: evidence.subject.subject_id,
    name: evidence.subject.product_name,
    url: evidence.subject.product_url,
    relevance: "The first-party product type/name directly overlaps the requested topic; inclusion must remain helpful rather than forced.",
    confidence: score >= 0.75 ? "high" : "medium",
    evidence_ids: evidenceIds(identityFacts)
  }];
}

function cannibalisation(evidence, primaryQuery) {
  const records = evidence.records.filter((r) => r.status === "active" && r.evidence_type.startsWith("search_console_") && r.value?.page && r.value?.query && queryCoverage(r.value.query, primaryQuery) >= 0.75 && queryCoverage(r.value.page, primaryQuery) >= 0.5);
  const pages = new Map();
  for (const record of records) { if (!pages.has(record.value.page)) pages.set(record.value.page, []); pages.get(record.value.page).push(record); }
  const conflicts = [...pages.entries()].map(([url, rs]) => ({ conflicting_url: url, overlap_reason: "The existing page has Search Console query evidence with strong token overlap to the proposed primary query.", severity: "medium", recommended_action: "differentiate_intent", evidence_ids: evidenceIds(rs).slice(0, 12) })).sort((a, b) => a.conflicting_url.localeCompare(b.conflicting_url, "en"));
  return { conflicts, overall_risk: conflicts.length ? "medium" : "low", recommended_action: conflicts.length ? "human_review_required" : "proceed", limitation: records.length ? null : "No strong Search Console query/page overlap was observed; this is not proof that no overlapping page exists." };
}

export function buildCornerstoneResearchPacket({ evidence, researchState, topic, primaryQuery, proposedUrl = null, generatedAt }) {
  assertValid("Cornerstone source evidence", evidence, validateEvidenceArtifact);
  assertValid("Cornerstone source research state", researchState, validateResearchState);
  if (researchState.source_evidence.evidence_artifact_id !== evidence.evidence_artifact_id) throw new Error("Research state does not reference the supplied evidence artifact.");
  if (!text(topic) || !text(primaryQuery) || !text(generatedAt)) throw new Error("topic, primaryQuery and generatedAt are required.");
  const active = evidence.records.filter((r) => r.status === "active").toSorted((a, b) => a.evidence_id.localeCompare(b.evidence_id, "en"));
  const topicRecords = selectTopicRecords(active, primaryQuery);
  const keyword = topicRecords.find((r) => r.evidence_type === "keyword_idea");
  const serpRecords = topicRecords.filter((r) => r.evidence_type.startsWith("serp_"));
  const organic = serpRecords.filter((r) => r.evidence_type === "serp_organic_result");
  const questions = unique(serpRecords.map((r) => r.value?.question)).map((question) => ({ question, evidence_ids: evidenceIds(serpRecords.filter((r) => text(r.value?.question) === question)) }));
  const support = supportingQueries(active, primaryQuery);
  const terms = recurringTerms(serpRecords, primaryQuery);
  const intent = inferIntent(primaryQuery, serpRecords);
  const links = siteCandidates(evidence, researchState, primaryQuery, proposedUrl);
  const products = relevantProducts(evidence, primaryQuery);
  const cannibal = cannibalisation(evidence, primaryQuery);
  const pageTypes = organic.map((r) => classifyPageType(r));
  const pageTypeCounts = Object.fromEntries(unique(pageTypes).map((type) => [type, pageTypes.filter((item) => item === type).length]));
  const sourceRefs = active.filter((r) => topicRecords.includes(r) || support.some((q) => q.evidence_ids.includes(r.evidence_id)) || links.some((l) => l.evidence_ids.includes(r.evidence_id)) || products.some((p) => p.evidence_ids.includes(r.evidence_id))).map((r) => ({ evidence_id: r.evidence_id, source_type: r.evidence_type, provider_id: r.provider_id, observed_at: r.observed_at, retrieved_at: r.retrieved_at, source_url: r.provenance?.source_url || null, supports: r.evidence_type === "keyword_idea" ? "search demand metrics" : r.evidence_type.startsWith("serp_") ? "SERP observation" : r.evidence_type.startsWith("search_console_") ? "first-party search/page observation" : "first-party product relevance" }));
  const unsupported = [];
  if (!organic.length) unsupported.push("What currently ranks for the primary query is unavailable because no organic SERP records were supplied.");
  unsupported.push("Ranking-page section coverage and omissions are not known because page-level competitor documents were not collected.");
  const newestObserved = unique(sourceRefs.map((r) => r.observed_at)).at(-1) || null;
  const staleEvidence = newestObserved ? (Date.parse(generatedAt) - Date.parse(newestObserved)) / 86400000 > 180 : true;
  const content = {
    identity: { topic: text(topic), primary_query: text(primaryQuery), proposed_url: proposedUrl, fixture_provenance: { evidence_artifact_id: evidence.evidence_artifact_id, evidence_sha256: sha256(evidence), research_state_id: researchState.research_state_id, research_state_sha256: sha256(researchState) } },
    search_demand: { primary_keyword: { query: text(primaryQuery), metrics: keyword ? { monthly_search_volume: keyword.value.monthly_search_volume ?? null, cpc_usd: keyword.value.cpc_usd ?? null, paid_competition_level: keyword.value.paid_competition_level ?? null, keyword_difficulty: keyword.value.keyword_difficulty ?? null, source_updated_at: keyword.value.source_updated_at ?? null } : null, evidence_ids: keyword ? [keyword.evidence_id] : [] }, supporting_queries: support, search_console_evidence: links.flatMap((link) => link.evidence_ids) },
    intent,
    serp: { observed_results: organic.map((r) => ({ title: r.value.title, description: r.value.description, url: r.value.url, domain: r.value.domain, rank: r.value.rank_absolute, page_type: classifyPageType(r), evidence_ids: [r.evidence_id] })).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.url.localeCompare(b.url, "en")), result_page_types: pageTypeCounts, recurring_themes: terms, recurring_questions: questions, commercial_vs_informational_balance: { commercial_result_count: pageTypes.filter((t) => t === "commercial_listing").length, informational_result_count: pageTypes.filter((t) => ["editorial_guide", "discussion", "video"].includes(t)).length, classification: pageTypes.includes("commercial_listing") && pageTypes.some((t) => ["editorial_guide", "discussion", "video"].includes(t)) ? "mixed" : pageTypes.includes("commercial_listing") ? "commercial" : pageTypes.length ? "informational_or_other" : "unknown" }, notable_features: unique(serpRecords.filter((r) => r.evidence_type !== "serp_organic_result").map((r) => r.evidence_type)) },
    competitor_coverage: { observed_from_snippets: terms.map((item) => ({ ...item, trace_kind: "observed_evidence" })), important_differences: organic.map((r) => ({ page: r.value.url, observed_page_type: classifyPageType(r), snippet_only: true, evidence_ids: [r.evidence_id] })), weak_or_missing_coverage: [trace("judgement_required", "Page-level competitor coverage gaps cannot be asserted from titles/snippets alone.", organic, "Fetch and inspect explicit ranking pages before claiming competitors omit a subject.")], claims_requiring_evidence: ["Performance, scratch-safety, absorbency and material comparisons require first-party or authoritative supporting evidence."] },
    topic_model: { entities_concepts: terms.map((item) => ({ name: item.term, kind: "observed_serp_term", evidence_ids: item.evidence_ids })), subtopics: questions.map((item) => ({ name: item.question, basis: "observed question", evidence_ids: item.evidence_ids })), questions, terminology: unique([primaryQuery, ...support.map((q) => q.query)]), relationships: products.map((p) => ({ from: topic, to: p.name, relationship: "genuinely relevant product candidate", evidence_ids: p.evidence_ids })) },
    streetkingz_relevance: { relevant_products: products, relevant_categories_pages: links.map((l) => ({ url: l.destination_page, evidence_ids: l.evidence_ids })), possible_internal_links: links, commercial_connection: products.length ? "A relevant Street Kingz product may be offered as an optional solution after the reader's problem is answered." : "No evidence-backed product insertion is available; omit a forced product CTA." },
    evidence: { source_references: sourceRefs.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id, "en")), unsupported_areas: unsupported, freshness: { oldest_observed_at: unique(sourceRefs.map((r) => r.observed_at))[0] || null, newest_retrieved_at: unique(sourceRefs.map((r) => r.retrieved_at)).at(-1) || null } },
    risks: { cannibalisation: cannibal, insufficient_evidence: unsupported, unclear_intent: intent.primary === "unclear", stale_evidence: staleEvidence, weak_commercial_relevance: products.length === 0, uncertainty: ["Content-gap conclusions require human or AI judgement after page-level evidence is available."] },
    model_handoff: { deterministic_system_provides: ["validated evidence references", "keyword metrics", "observed SERP results and questions", "provisional intent", "site overlap candidates", "product relevance candidates", "explicit unknowns"], future_model_receives: "This packet plus a strict output schema and approved brand rules; not raw provider payloads.", future_model_responsibilities: ["nuanced intent interpretation", "SERP synthesis without inventing page coverage", "information-gap judgement", "article strategy", "natural structure refinement", "drafting after human brief approval"] }
  };
  const packetId = stableId("cornerstone_packet", { version: CORNERSTONE_PACKET_VERSION, content });
  return { schema_version: CORNERSTONE_SCHEMA_VERSION, artifact_type: "cornerstone_research_packet", packet_version: CORNERSTONE_PACKET_VERSION, packet_id: packetId, generated_at: generatedAt, deterministic_content_sha256: sha256(content), ...content };
}

export function buildCornerstoneBrief(packet) {
  const primary = packet.search_demand.primary_keyword;
  const questions = packet.serp.recurring_questions;
  const sections = [
    { section: "Answer the core choice", purpose: `Resolve what “${packet.identity.primary_query}” means for this reader before discussing products.`, trace_kind: "deterministic_derivation", evidence_ids: primary.evidence_ids },
    ...questions.map((item) => ({ section: item.question, purpose: "Answer an observed searcher question directly and practically.", trace_kind: "observed_evidence", evidence_ids: item.evidence_ids }))
  ];
  if (packet.streetkingz_relevance.relevant_products.length) sections.push({ section: "How to choose a suitable option", purpose: "Explain decision criteria before presenting any genuinely relevant Street Kingz option.", trace_kind: "deterministic_derivation", evidence_ids: packet.streetkingz_relevance.relevant_products.flatMap((p) => p.evidence_ids) });
  const gaps = packet.competitor_coverage.weak_or_missing_coverage.map((item) => ({ gap: item.statement, status: "unverified", trace_kind: item.kind, evidence_ids: item.evidence_ids, limitation: item.limitation }));
  const doCover = unique(["Directly resolve the primary query and its decision criteria.", ...questions.map((q) => q.question), ...packet.serp.recurring_themes.slice(0, 6).map((t) => `Explain the relevance of ${t.term} where evidence supports it.`)]);
  const doNotCover = ["Unsupported claims about what ranking competitor pages omit.", "Forced product mentions unrelated to the reader's decision.", "Keyword-density targets or repetitive query variants.", "Performance or safety claims without cited evidence."];
  const content = {
    packet_id: packet.packet_id,
    topic: packet.identity.topic,
    primary_query: packet.identity.primary_query,
    search_intent: packet.intent,
    target_reader: "A vehicle owner comparing safe and effective options and wanting a practical, evidence-aware choice.",
    reader_problem: `The reader needs to understand the criteria behind ${packet.identity.primary_query} and choose an approach without relying on unsupported superlatives.`,
    search_opportunity: { summary: primary.metrics ? `Cached evidence records demand for “${primary.query}” and a ${packet.serp.commercial_vs_informational_balance.classification} SERP.` : `The topic has SERP evidence but no recorded primary keyword metric.`, metrics: primary.metrics, evidence_ids: primary.evidence_ids, trace_kind: primary.metrics ? "observed_evidence" : "judgement_required" },
    serp_observations: packet.serp,
    competitor_coverage: packet.competitor_coverage,
    content_gaps: gaps,
    supporting_queries: packet.search_demand.supporting_queries,
    entities_concepts: packet.topic_model.entities_concepts,
    required_questions: questions,
    relevant_streetkingz_products: packet.streetkingz_relevance.relevant_products,
    internal_link_opportunities: packet.streetkingz_relevance.possible_internal_links,
    evidence_requirements: ["Cite first-party product facts for Street Kingz product characteristics.", "Use authoritative evidence for general safety or performance claims.", "Collect explicit page-level competitor evidence before asserting coverage gaps."],
    claims_requiring_caution: packet.competitor_coverage.claims_requiring_evidence,
    title_direction: `Use a clear reader-first title aligned to ${packet.intent.primary} intent; avoid an unqualified “best” claim unless criteria are explicit.`,
    h1_direction: `State the topic and practical decision being answered for “${packet.identity.primary_query}”.`,
    recommended_article_structure: sections,
    conversion_opportunity: packet.streetkingz_relevance.relevant_products.length ? "Answer the problem first, then offer relevant Street Kingz products as optional next steps tied to stated selection criteria." : "No evidence-backed commercial insertion; prefer a useful non-commercial conclusion.",
    cannibalisation_assessment: packet.risks.cannibalisation,
    confidence: { level: packet.intent.confidence === "high" && primary.metrics ? "high" : "medium", rationale: "Demand, SERP and first-party evidence are deterministic; page-level competitor coverage remains unavailable." },
    freshness_requirements: { review_serp_after_days: 90, review_keyword_metrics_after_days: 90, review_product_facts_on_source_change: true },
    do_cover: doCover,
    do_not_cover: doNotCover,
    open_questions: ["Which explicit ranking pages should be inspected before finalising information-gap claims?", "Does the human reviewer want a comparison-led guide or a method-led guide within the observed mixed intent?", "Which internal links are editorially natural once the final article URL and surrounding copy exist?"],
    human_review_state: "awaiting_human_review"
  };
  return { schema_version: CORNERSTONE_SCHEMA_VERSION, artifact_type: "cornerstone_content_brief", brief_version: CORNERSTONE_BRIEF_VERSION, brief_id: stableId("cornerstone_brief", { version: CORNERSTONE_BRIEF_VERSION, content }), deterministic_content_sha256: sha256(content), ...content };
}
