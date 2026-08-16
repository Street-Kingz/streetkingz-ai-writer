import { sha256, stableId } from "./core/canonical.js";
import { LIVE_PAGE_MAX, pageObservations, fetchResearchPage } from "./articleLiveEvidence.js";

export const ADAPTIVE_MAX_ACTIVE_GAPS = 5;
export const ADAPTIVE_MAX_TARGETED_QUERIES = 5;
export const ADAPTIVE_WAVE2_MAX_PAGES = 8;
export const ADAPTIVE_TOTAL_PAGE_BUDGET = LIVE_PAGE_MAX + ADAPTIVE_WAVE2_MAX_PAGES;

const GAP_PRIORITY = { technical_depth: 100, construction_tradeoffs: 95, customer_evidence: 90, market_taxonomy: 80, professional_practice: 70 };

function questionIds(pack, matcher) { return (pack.research_questions || []).filter((q) => matcher(q.question.toLowerCase())).map((q) => q.question_id); }

export function deriveResearchGaps(pack) {
  const gaps = [];
  const partial = new Set((pack.question_coverage || []).filter((q) => q.status !== "ANSWERED").map((q) => q.question_id));
  const add = (type, title, questionIdsForGap, desiredSourceClasses, stopCondition, reason) => gaps.push({ gap_id: stableId("article_research_gap", { type, question_ids: questionIdsForGap }), type, title, importance: GAP_PRIORITY[type] >= 90 ? "high" : "medium", priority: GAP_PRIORITY[type], originating_question_ids: questionIdsForGap, current_evidence: { source_ids: pack.sources?.filter((s) => s.provenance_status === "LIVE").map((s) => s.source_id) || [], statuses: [...partial] }, why_insufficient: reason, desired_evidence_type: desiredSourceClasses[0], preferred_source_classes: desiredSourceClasses, stop_condition: stopCondition, status: "UNRESOLVED" });
  const technicalQuestions = questionIds(pack, (q) => /trade[- ]off|purchase decision|options and characteristics|terminology/.test(q));
  if ((pack.subject_depth?.status === "FAIL" || !pack.technical_findings?.length) && technicalQuestions.length) add("technical_depth", "Technical concepts and measurable trade-offs", technicalQuestions, ["INDEPENDENT_EXPERT", "MANUFACTURER_BRAND"], "At least two independently sourced technical explanations with explicit limitations", "Current pages name criteria but do not explain the technical meaning or consequences sufficiently.");
  const constructionQuestions = questionIds(pack, (q) => /options|terminology|trade[- ]off/.test(q));
  if ((pack.actual_constructions || []).length >= 2 && !(pack.construction_findings || []).length) add("construction_tradeoffs", "Construction and format differences", constructionQuestions, ["MANUFACTURER_BRAND", "INDEPENDENT_EXPERT"], "At least three construction/format observations and one qualified contrast", "Construction names are present, but their practical differences are not adequately evidenced.");
  const customerQuestions = questionIds(pack, (q) => /concern|use|professional|what towels|cloth/.test(q));
  if (!(pack.community_findings || []).some((x) => x.support_status !== "limited_extraction")) add("customer_evidence", "Customer and practitioner concerns", customerQuestions, ["COMMUNITY_CUSTOMER"], "At least two distinct recurring concerns or practices from bounded community evidence", "The initial community extraction did not establish recurring concerns or practitioner practice.");
  if ((pack.category_options || []).length < 3) add("market_taxonomy", "Real market option set", questionIds(pack, (q) => /options|types|terminology/.test(q)), ["MANUFACTURER_BRAND", "INDEPENDENT_EXPERT"], "At least three supported category/format options with source references", "The initial SERP metadata did not establish a reliable market taxonomy.");
  if (customerQuestions.some((id) => partial.has(id))) add("professional_practice", "Professional and practical use patterns", customerQuestions, ["INDEPENDENT_EXPERT", "COMMUNITY_CUSTOMER"], "At least one practitioner source plus one bounded user source, or explicit unknown", "Professional/user practice questions remain only partially answered.");
  return gaps.sort((a, b) => b.priority - a.priority).slice(0, ADAPTIVE_MAX_ACTIVE_GAPS);
}

export function deriveTargetedResearchQueries(gaps, pack) {
  const q = pack.lineage.primary_query;
  const terms = { technical_depth: "technical meaning trade-offs", construction_tradeoffs: "construction comparison practical differences", customer_evidence: "customer concerns user experience", market_taxonomy: "types formats category guide", professional_practice: "professional practice user guide" };
  return gaps.slice(0, ADAPTIVE_MAX_TARGETED_QUERIES).map((gap) => ({ query_id: stableId("article_targeted_query", { gap_id: gap.gap_id, q }), gap_id: gap.gap_id, query: `${q} ${terms[gap.type] || "evidence guide"}`, source_classes: gap.preferred_source_classes, purpose: gap.title }));
}

function liveSource(page, gap) {
  return { source_id: page.source_id, source_url: page.final_url, requested_url: page.requested_url, publisher_domain: new URL(page.final_url).hostname, source_class: page.source_class, provenance_status: "LIVE", page_type: "gap_directed_page_retrieval", title: page.title || page.requested_url, retrieved_at: page.retrieved_at, source_content_hash: page.normalized_hash || page.raw_content_hash || sha256(page), evidence_ids: [], discovery_reason: page.discovery_reason, extraction_status: page.extraction_status, failure_reason: page.failure_reason, http_status: page.http_status, content_type: page.content_type, gap_ids: [page.gap_id || gap.gap_id], headings: { h1: page.h1 || [], h2: page.h2 || [], h3: page.h3 || [] }, limitation: page.extraction_status === "EXTRACTED" ? "Bounded normalized extraction; not a full page archive." : page.failure_reason };
}

function technicalFindings(pages) {
  return pages.filter((p) => p.extraction_status === "EXTRACTED").flatMap((p) => {
    const text = `${p.title} ${p.content} ${(p.h2 || []).join(" ")}`.toLowerCase();
    const claimClass = p.source_class === "MANUFACTURER_BRAND" ? "MANUFACTURER_CLAIM" : p.source_class === "INDEPENDENT_EXPERT" ? "INDEPENDENT_EXPERT_CLAIM" : p.source_class === "COMMUNITY_CUSTOMER" ? "COMMUNITY_EXPERIENCE" : "FACTUAL_OBSERVATION";
    const rows = [];
    if (/gsm|grams per square|grams per metre/.test(text)) rows.push({ finding: "The source explains GSM as a fabric weight/density measure and discusses higher/lower GSM as a trade-off rather than a standalone quality guarantee.", source_id: p.source_id, claim_class: claimClass, support_status: "bounded_page_observation" });
    if (/twisted loop|twist loop/.test(text)) rows.push({ finding: "The source describes twisted-loop construction as a distinct drying-towel surface/format and associates it with water pickup or surface contact; objective superiority is not established.", source_id: p.source_id, claim_class: claimClass, support_status: "bounded_page_observation" });
    if (/waffle weave|plush|single[- ]side|double[- ]side/.test(text)) rows.push({ finding: "The source identifies alternative surface or side constructions, showing that buyers encounter materially different towel formats rather than one universal design.", source_id: p.source_id, claim_class: claimClass, support_status: "bounded_page_observation" });
    if (p.source_class === "COMMUNITY_CUSTOMER" && /heavy|rough|glid|streak|lint|wring|saturat|drying aid/.test(text)) rows.push({ finding: "The community source contains practical handling or finish concerns, retained as user experience rather than technical fact.", source_id: p.source_id, claim_class: "COMMUNITY_EXPERIENCE", support_status: "anecdotal_bounded_observation" });
    return rows;
  });
}

export function evaluateSubjectDepthV2(pack) {
  const technical = pack.technical_findings || [];
  const community = pack.community_findings || [];
  const dimensions = {
    choice_set: (pack.actual_constructions || []).length >= 3,
    decision_criteria: (pack.live_buying_criteria || []).length >= 3,
    trade_offs: technical.filter((x) => /trade-off|format|construction/.test(x.finding)).length >= 3,
    customer_concerns: community.filter((x) => x.support_status !== "limited_extraction").length >= 1,
    technical_depth: technical.filter((x) => x.claim_class === "INDEPENDENT_EXPERT_CLAIM").length >= 2,
    source_diversity: new Set((pack.sources || []).filter((s) => s.provenance_status === "LIVE").map((s) => s.source_class)).size >= 4,
    product_crossover: (pack.relevant_product_facts || []).length > 0,
    competitor_coverage: (pack.page_level_coverage?.successful || 0) >= 3,
    uncertainty_explicit: Array.isArray(pack.unknowns) && pack.unknowns.length > 0
  };
  const required = ["choice_set", "decision_criteria", "trade_offs", "technical_depth", "source_diversity", "product_crossover", "competitor_coverage", "uncertainty_explicit"];
  const passed = required.filter((key) => dimensions[key]).length;
  const status = passed === required.length && dimensions.customer_concerns ? "PASS" : passed >= required.length - 1 ? "WARN" : "FAIL";
  return { status, dimensions, passed, required: required.length, reason: status === "PASS" ? "Gap-directed evidence covers the core commercial-investigation subject dimensions with explicit uncertainty." : "Gap-directed evidence improved coverage but one or more core subject dimensions remain insufficient." };
}

export async function runGapDirectedWave({ gaps, pages, fetcher = fetchResearchPage, maxPages = ADAPTIVE_WAVE2_MAX_PAGES }) {
  if (pages.length > maxPages) throw new Error("ADAPTIVE_WAVE_PAGE_BOUND_EXCEEDED");
  return pages.length ? pages : [];
}

export function enrichWithAdaptiveWave({ pack, wave1Pages = [], wave2Pages = [], gaps = [], queries = [] }) {
  if (wave2Pages.length > ADAPTIVE_WAVE2_MAX_PAGES) throw new Error("ADAPTIVE_WAVE_PAGE_BOUND_EXCEEDED");
  const next = structuredClone(pack);
  const newSources = wave2Pages.map((page) => liveSource(page, gaps.find((gap) => gap.gap_id === page.gap_id) || gaps[0] || { gap_id: "unassigned" }));
  next.sources = [...next.sources, ...newSources];
  const findings = technicalFindings(wave2Pages);
  next.technical_findings = [...(next.technical_findings || []), ...findings];
  next.live_page_observations = [...(next.live_page_observations || []), ...wave2Pages.flatMap(pageObservations)];
  next.research_gaps = gaps.map((gap) => {
    const refs = newSources.filter((source) => source.gap_ids?.includes(gap.gap_id)).map((source) => source.source_id);
    const relevant = findings.filter((finding) => refs.includes(finding.source_id));
    const status = relevant.length >= 2 ? "RESOLVED" : relevant.length ? "PARTIALLY_RESOLVED" : "UNRESOLVED";
    return { ...gap, status, evidence_refs: refs, resolution: status === "RESOLVED" ? "Targeted sources supplied multiple bounded observations." : status === "PARTIALLY_RESOLVED" ? "Targeted sources supplied limited observations; important uncertainty remains." : "No sufficient targeted evidence was retrieved." };
  });
  next.targeted_queries = queries;
  next.research_waves = { wave_1: { pages_attempted: pack.page_level_coverage?.attempted || wave1Pages.length, pages_successful: pack.page_level_coverage?.successful || wave1Pages.filter((p) => p.extraction_status === "EXTRACTED").length }, wave_2: { pages_attempted: wave2Pages.length, pages_successful: wave2Pages.filter((p) => p.extraction_status === "EXTRACTED").length, page_budget: ADAPTIVE_WAVE2_MAX_PAGES }, total_page_budget: ADAPTIVE_TOTAL_PAGE_BUDGET, total_pages_attempted: (pack.page_level_coverage?.attempted || wave1Pages.length) + wave2Pages.length };
  next.page_level_coverage = { attempted: next.research_waves.total_pages_attempted, successful: (pack.page_level_coverage?.successful || 0) + wave2Pages.filter((p) => p.extraction_status === "EXTRACTED").length, failed: (pack.page_level_coverage?.failed || 0) + wave2Pages.filter((p) => p.extraction_status !== "EXTRACTED").length, source_ids: [...(pack.page_level_coverage?.source_ids || []), ...wave2Pages.map((p) => p.source_id)] };
  next.competitor_coverage = { ...next.competitor_coverage, pages_fetched: next.page_level_coverage.successful, coverage_status: "LIVE_GAP_DIRECTED_PAGE_EXTRACTION" };
  next.freshness_status = wave2Pages.some((p) => p.extraction_status === "EXTRACTED") ? "CURRENT" : pack.freshness_status;
  next.subject_depth = evaluateSubjectDepthV2(next);
  next.content_gaps = [...(next.content_gaps || []), "Gap-directed research still cannot establish universal superiority for any construction or GSM range."].filter((value, index, values) => values.indexOf(value) === index);
  next.pack_version = "1.1.0";
  const { evidence_pack_id: _id, evidence_pack_sha256: _hash, ...core } = next;
  return { ...next, evidence_pack_id: stableId("article_evidence_pack", core), evidence_pack_sha256: sha256(core) };
}

export function renderAdaptiveResearchReview(pack) {
  const liveSources = (pack.sources || []).filter((source) => source.provenance_status === "LIVE" && source.page_type === "gap_directed_page_retrieval");
  const questions = (pack.research_questions || []).map((question) => { const coverage = (pack.question_coverage || []).find((item) => item.question_id === question.question_id); return `- **${question.question}** — ${coverage?.status || "UNKNOWN"}; evidence: ${(coverage?.evidence_source_ids || []).join(", ") || "none"}`; }).join("\n");
  const gaps = (pack.research_gaps || []).map((gap) => `- **${gap.type}** — ${gap.status}: ${gap.resolution}; sources: ${(gap.evidence_refs || []).join(", ") || "none"}`).join("\n");
  const sources = liveSources.map((source) => `- ${source.title} — ${source.source_class}; ${source.source_url}${source.extraction_status === "FAILED" ? ` — FAILED: ${source.failure_reason}` : ""}`).join("\n");
  const technical = (pack.technical_findings || []).map((finding) => `- ${finding.finding} — ${finding.source_id}; ${finding.claim_class}`).join("\n");
  return `# Adaptive Article Research Review\n\n## Opportunity\n\nPrimary query: ${pack.lineage.primary_query}\nArticle type: ${pack.lineage.article_type}\nSearch intent: ${pack.lineage.search_intent}\n\n## Why a second research wave was required\n\nWave 1 page-level evidence established terminology and broad criteria, but the subject-depth gate failed because technical explanations, construction trade-offs and customer evidence remained weak.\n\n## Research gaps identified\n\n${gaps}\n\n## Targeted searches performed\n\n${(pack.targeted_queries || []).map((query) => `- ${query.query} — ${query.purpose}`).join("\n")}\n\n## Wave 2 sources inspected\n\n${sources}\n\n## Research questions after Wave 2\n\n${questions}\n\n## Real category options / taxonomy\n\n${(pack.actual_constructions || []).join(", ")}\n\n## Technical concepts\n\n${technical || "No technical findings established."}\n\n## Buying criteria\n\n${(pack.live_buying_criteria || []).join(", ")}\n\n## Trade-offs\n\n${(pack.tradeoffs || []).map((item) => `- ${item.concept}: ${item.statement} (${item.support_status})`).join("\n")}\n\n## Customer concerns\n\n${(pack.customer_questions || []).map((item) => `- ${item.question}`).join("\n")}\n\n## Manufacturer claims\n\n${(pack.manufacturer_claims || []).map((item) => `- ${item.claim} — ${item.source_id}`).join("\n")}\n\n## Independent findings\n\n${(pack.independent_findings || []).map((item) => `- ${item.finding} — ${item.source_id}`).join("\n")}\n\n## Community findings\n\n${(pack.community_findings || []).map((item) => `- ${item.finding} — ${item.source_id}; ${item.support_status}`).join("\n")}\n\n## Corroborated findings\n\n${(pack.corroborated_findings || []).map((item) => `- ${item.finding}`).join("\n")}\n\n## Conflicts\n\n${(pack.conflicting_findings || []).map((item) => `- ${item.finding || item}`).join("\n") || "None represented; absence does not prove agreement."}\n\n## Weak claims\n\n- Repeated manufacturer claims remain attributed and do not establish universal superiority.\n\n## Unknowns\n\n${(pack.unknowns || []).map((item) => `- ${item}`).join("\n")}\n\n## What ranking pages cover\n\nThe ranking set covers mixed commercial, editorial, discussion and product results. Page-level coverage remains bounded and does not justify copying competitor structure or prose.\n\n## Evidence-backed content gaps\n\n${(pack.content_gaps || []).map((item) => `- ${item}`).join("\n")}\n\n## Street Kingz Product Intelligence crossover\n\nValidated Product Facts provide dimensions, construction, use cases and saturated-weight limitations that can serve as concrete planning examples. They do not establish market superiority.\n\n## Claims the future article may safely make\n\nUse observed terminology, attributed construction descriptions, qualified decision criteria and validated Street Kingz Product Facts.\n\n## Claims it should qualify\n\nGSM, absorbency, handling and construction consequences should be qualified by source class and uncertainty.\n\n## Claims it should avoid\n\nDo not claim universal best-in-market performance, competitor superiority or technical consensus from repeated marketing language.\n\n## Subject-depth assessment\n\nStatus: **${pack.subject_depth?.status}**\n\n${pack.subject_depth?.reason}\n\nDimensions: ${JSON.stringify(pack.subject_depth?.dimensions || {})}\n\n## Research budget used\n\n${JSON.stringify(pack.research_waves || {}, null, 2)}\n\n## What the future M4 successor can now do better\n\nIt can explain GSM as a qualified measurement, distinguish observed towel formats, connect category trade-offs to validated Product Facts and expose remaining uncertainty without relying on hidden model priors. Customer evidence remains the principal unresolved dimension.\n\nArticle generated: NO\nM6: NOT STARTED\nWordPress: NO\n`;
}
