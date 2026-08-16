import { sha256, stableId } from "../research/core/canonical.js";
import { assertValid, validateEvidenceArtifact, validateResearchState } from "../research/validation/evidence.js";
import { guidanceContextForAi } from "../seo-guidance/guidance.js";

export const ARTICLE_OPPORTUNITY_OUTCOMES = Object.freeze(["ARTICLE_RECOMMENDED", "NO_ARTICLE_RECOMMENDED", "RESEARCH_INSUFFICIENT"]);
export const ARTICLE_TYPES = Object.freeze(["cornerstone_guide", "supporting_article", "how_to", "comparison", "problem_solution"]);
export const ARTICLE_SEARCH_INTENTS = Object.freeze(["informational", "commercial_investigation", "transactional", "navigational", "mixed"]);

const normalise = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const overlap = (a, b) => { const x = new Set(normalise(a).split(" ").filter(Boolean)); const y = new Set(normalise(b).split(" ").filter(Boolean)); return x.size && y.size ? [...x].filter((item) => y.has(item)).length / Math.max(x.size, y.size) : 0; };

export function buildArticleCandidatePacket({ evidence, researchState, maximum = 25 }) {
  assertValid("Article evidence", evidence, validateEvidenceArtifact);
  assertValid("Article research state", researchState, validateResearchState);
  if (researchState.objective.type !== "create_seo_article") throw new Error("Article opportunity requires the create_seo_article research objective.");
  const facts = evidence.records.filter((r) => r.status === "active" && r.evidence_type === "product_fact");
  const identity = facts.filter((r) => ["product.name", "product.category_type"].includes(r.value?.field_path));
  const productText = identity.map((r) => r.value.value).join(" ");
  const productTokens = new Set(normalise(productText).split(" ").filter((token) => token.length > 3 && !["heavy", "duty", "best", "product", "type"].includes(token)));
  const keywords = evidence.records.filter((r) => r.status === "active" && r.evidence_type === "keyword_idea" && typeof r.value?.keyword === "string")
    .map((r) => { const queryTokens = new Set(normalise(r.value.keyword).split(" ")); const matches = [...productTokens].filter((token) => queryTokens.has(token)); return { query: r.value.keyword, metrics: { monthly_search_volume: r.value.monthly_search_volume ?? null, keyword_difficulty: r.value.keyword_difficulty ?? null, cpc_usd: r.value.cpc_usd ?? null, paid_competition_level: r.value.paid_competition_level ?? null }, evidence_ids: [r.evidence_id], relevance: overlap(r.value.keyword, productText), product_term_matches: matches }; })
    .filter((r) => r.product_term_matches.length >= 2)
    .sort((a, b) => (b.metrics.monthly_search_volume ?? -1) - (a.metrics.monthly_search_volume ?? -1) || b.relevance - a.relevance || a.query.localeCompare(b.query, "en"))
    .slice(0, maximum);
  const queries = new Set(keywords.map((k) => normalise(k.query)));
  const serp = evidence.records.filter((r) => r.status === "active" && r.evidence_type.startsWith("serp_") && queries.has(normalise(r.value?.keyword || r.query_or_question)));
  const primary = keywords[0] || null;
  return {
    schema_version: "1.0.0", artifact_type: "article_opportunity_candidate_packet", packet_version: "1.0.0",
    packet_id: stableId("article_candidate_packet", { research_state_id: researchState.research_state_id, candidates: keywords }),
    research_state_id: researchState.research_state_id, evidence_artifact_id: evidence.evidence_artifact_id,
    product: { subject_id: evidence.subject.subject_id, product_url: evidence.subject.product_url, product_name: evidence.subject.product_name, evidence_ids: identity.map((r) => r.evidence_id) },
    candidates: keywords, serp: serp.map((r) => ({ evidence_id: r.evidence_id, evidence_type: r.evidence_type, query: r.value?.keyword || r.query_or_question, value: r.value })),
    primary_candidate: primary?.query || null, candidate_count: keywords.length,
    search_console: evidence.records.some((r) => r.status === "active" && r.evidence_type.startsWith("search_console_")) ? "available" : "unknown",
    source_hashes: { evidence: sha256(evidence), research_state: sha256(researchState) }
  };
}

export function decideArticleOpportunity({ packet, researchState, decision = null }) {
  if (!packet || !researchState || researchState.sufficiency.state !== "sufficient") return { outcome: "RESEARCH_INSUFFICIENT", rationale: "Trustworthy product, demand and SERP evidence is not sufficient for an article decision.", evidence_ids: [] };
  const candidate = packet.candidates?.[0];
  if (!candidate) return { outcome: "NO_ARTICLE_RECOMMENDED", rationale: "Sufficient research produced no product-relevant article candidate.", evidence_ids: [] };
  const selected = decision || {};
  const articleType = selected.article_type || (normalise(candidate.query).includes("how") ? "how_to" : "supporting_article");
  if (!ARTICLE_TYPES.includes(articleType)) throw new Error("Unsupported article classification.");
  const evidenceIds = [...new Set([...(candidate.evidence_ids || []), ...packet.serp.filter((r) => normalise(r.query) === normalise(candidate.query)).map((r) => r.evidence_id), ...(packet.product?.evidence_ids || [])])];
  return {
    outcome: "ARTICLE_RECOMMENDED", article_type: articleType, primary_query: candidate.query,
    supporting_queries: packet.candidates.slice(1, 6).map((item) => ({ query: item.query, evidence_ids: item.evidence_ids })),
    search_intent: selected.search_intent || "mixed", reader_problem: selected.reader_problem || `Help readers decide about ${candidate.query}.`,
    product_relevance: "The candidate is derived from validated product facts and product-seeded demand evidence.",
    commercial_relevance: "The product is relevant to the selected search opportunity; no unsupported performance or ranking claim is made.",
    rationale: selected.rationale || `The candidate has the strongest retained demand signal among product-relevant queries and has supporting SERP evidence.`,
    evidence_ids: evidenceIds, alternatives_considered: packet.candidates.slice(1, 4).map((item) => item.query), risks: [packet.search_console === "unknown" ? "Existing-site coverage and cannibalisation are unknown without Search Console evidence." : "Page-level competitor coverage was not fetched."], confidence: "medium",
    research_state_id: researchState.research_state_id, evidence_artifact_id: packet.evidence_artifact_id
  };
}

export function buildArticleOpportunityAiInput({ packet, researchState, intelligence = null, market = "GB", language = "en-GB", guidanceSnapshot = null }) {
  if (!packet || !researchState) throw new Error("A candidate packet and research state are required.");
  return {
    schema_version: "1.0.0", artifact_type: "create_seo_article_opportunity_ai_input", objective: "create_seo_article",
    market, language,
    product: { subject_id: packet.product.subject_id, product_name: packet.product.product_name, product_url: packet.product.product_url, evidence_ids: packet.product.evidence_ids },
    business_context: intelligence?.context ? { context_id: intelligence.context.context_id, business_id: intelligence.context.business_id, product_object_id: intelligence.context.product_object_id, validation_status: intelligence.context.validation_status } : { status: "not_supplied" },
    authoritative_seo_guidance: guidanceSnapshot ? guidanceContextForAi(guidanceSnapshot) : { status: "not_supplied" },
    web_structured_data_standards: guidanceSnapshot ? guidanceContextForAi(guidanceSnapshot).records.filter((record) => record.authority_class === "WEB_STANDARD") : [],
    empirical_search_evidence: { evidence_artifact_id: packet.evidence_artifact_id || null, candidate_evidence_ids: packet.candidates.flatMap((candidate) => candidate.evidence_ids), serp_evidence_ids: packet.serp.map((item) => item.evidence_id) },
    candidates: packet.candidates.slice(0, 25).map((candidate) => ({ query: candidate.query, metrics: candidate.metrics, product_term_matches: candidate.product_term_matches, evidence_ids: candidate.evidence_ids, serp: packet.serp.filter((item) => normalise(item.query) === normalise(candidate.query)).slice(0, 30) })),
    search_console: packet.search_console,
    research_sufficiency: researchState.sufficiency,
    boundaries: { facts_are_immutable: true, browsing_allowed: false, drafting_allowed: false, publishing_allowed: false, highest_volume_is_not_a_decision_rule: true, guidance_is_context_not_keyword_selection: true }
  };
}

export function articleOpportunityJsonSchema(evidenceIds = [], candidateQueries = []) {
  return { type: "object", additionalProperties: false, required: ["outcome", "article_type", "search_intent", "primary_query", "supporting_queries", "reader_problem", "proposed_angle", "rationale", "evidence_ids", "alternatives_considered", "risks", "unknowns", "confidence"], properties: {
    outcome: { type: "string", enum: [...ARTICLE_OPPORTUNITY_OUTCOMES] }, article_type: { type: "string", enum: [...ARTICLE_TYPES] }, search_intent: { type: "string", enum: [...ARTICLE_SEARCH_INTENTS] }, primary_query: { type: "string", enum: candidateQueries }, supporting_queries: { type: "array", items: { type: "string", enum: candidateQueries }, maxItems: 5 }, reader_problem: { type: "string" }, proposed_angle: { type: "string" }, rationale: { type: "string" }, evidence_ids: { type: "array", items: { type: "string", enum: evidenceIds } }, alternatives_considered: { type: "array", items: { type: "object", additionalProperties: false, required: ["query", "reason"], properties: { query: { type: "string", enum: candidateQueries }, reason: { type: "string" } } }, maxItems: 5 }, risks: { type: "array", items: { type: "string" } }, unknowns: { type: "array", items: { type: "string" } }, confidence: { type: "string", enum: ["low", "medium", "high"] }
  } };
}

export function validateArticleOpportunityDecision(decision, { evidenceIds = [] } = {}) {
  const errors = [];
  if (!ARTICLE_OPPORTUNITY_OUTCOMES.includes(decision?.outcome)) errors.push("Unsupported article opportunity outcome.");
  if (decision?.outcome === "ARTICLE_RECOMMENDED") {
    if (!ARTICLE_TYPES.includes(decision.article_type)) errors.push("Unsupported article classification.");
    if (typeof decision.primary_query !== "string" || !decision.primary_query) errors.push("primary_query is required.");
    for (const id of decision.evidence_ids || []) if (!evidenceIds.includes(id)) errors.push(`Decision references unavailable evidence: ${id}.`);
  }
  if (decision?.outcome === "NO_ARTICLE_RECOMMENDED" && !decision?.rationale) errors.push("NO_ARTICLE_RECOMMENDED requires a rationale.");
  if (decision?.outcome === "RESEARCH_INSUFFICIENT" && !decision?.rationale) errors.push("RESEARCH_INSUFFICIENT requires a rationale.");
  if (!Array.isArray(decision?.evidence_ids)) errors.push("evidence_ids must be an array.");
  return errors;
}
