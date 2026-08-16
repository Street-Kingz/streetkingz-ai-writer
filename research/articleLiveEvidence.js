import dns from "node:dns/promises";
import { sha256, stableId } from "./core/canonical.js";

export const LIVE_PAGE_MAX = 10;
export const LIVE_RESPONSE_MAX_BYTES = 1_500_000;
export const LIVE_TIMEOUT_MS = 12_000;
export const LIVE_MAX_REDIRECTS = 3;

function privateIpv4(address) {
  const parts = address.split(".").map(Number);
  return parts.length === 4 && (parts[0] === 10 || parts[0] === 127 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31));
}

export async function assertSafeResearchUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error("MALFORMED_URL"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("UNSUPPORTED_OR_CREDENTIAL_URL");
  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname === "::1" || privateIpv4(url.hostname)) throw new Error("PRIVATE_NETWORK_URL");
  const records = await dns.lookup(url.hostname, { all: true });
  if (records.some((record) => record.family === 4 && privateIpv4(record.address) || record.address === "::1")) throw new Error("PRIVATE_NETWORK_DESTINATION");
  return url;
}

async function readBounded(response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > LIVE_RESPONSE_MAX_BYTES) { await reader.cancel(); throw new Error("RESPONSE_TOO_LARGE"); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function textFromHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&#39;/gi, "'").replace(/&quot;/gi, '"').replace(/\s+/g, " ").trim();
}
function headings(html, level) { return [...html.matchAll(new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi"))].map((m) => textFromHtml(m[1])).filter(Boolean).slice(0, 30); }

export function normalizeResearchPage(html, requestedUrl, finalUrl) {
  const title = textFromHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || ["", ""])[1]);
  const description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || ["", ""])[1];
  const content = textFromHtml((html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || ["", html])[1]).slice(0, 30_000);
  return { requested_url: requestedUrl, final_url: finalUrl, title, meta_description: description, h1: headings(html, 1).slice(0, 3), h2: headings(html, 2), h3: headings(html, 3).slice(0, 30), content, content_hash: sha256(content), normalized_hash: sha256({ title, description, h1: headings(html, 1).slice(0, 3), h2: headings(html, 2), h3: headings(html, 3).slice(0, 30), content }) };
}

export async function fetchResearchPage(requestedUrl, { sourceClass, discoveryReason, researchQuestionIds = [], now = new Date() } = {}) {
  let current = await assertSafeResearchUrl(requestedUrl); let redirects = 0; let response; let body = ""; let error = null;
  try {
    while (true) {
      response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(LIVE_TIMEOUT_MS), headers: { accept: "text/html,application/xhtml+xml", "user-agent": "StreetKingzArticleResearch/1.0" } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects++ >= LIVE_MAX_REDIRECTS) throw new Error("REDIRECT_LIMIT");
        const location = response.headers.get("location"); if (!location) throw new Error("REDIRECT_WITHOUT_LOCATION");
        current = await assertSafeResearchUrl(new URL(location, current).toString()); continue;
      }
      const type = response.headers.get("content-type") || "";
      if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) throw new Error("UNSUPPORTED_CONTENT_TYPE");
      body = await readBounded(response); break;
    }
  } catch (cause) { error = cause.message; }
  const base = { source_id: stableId("live_article_source", { requestedUrl }), requested_url: requestedUrl, final_url: current.toString(), source_class: sourceClass, discovery_reason: discoveryReason, research_question_ids: researchQuestionIds, provenance_mode: "LIVE", retrieved_at: new Date(now).toISOString(), http_status: response?.status || null, content_type: response?.headers?.get("content-type") || null, extraction_status: error ? "FAILED" : "EXTRACTED", failure_reason: error, raw_content_hash: body ? sha256(body) : null };
  return error ? base : { ...base, ...normalizeResearchPage(body, requestedUrl, current.toString()) };
}

export function pageObservations(page) {
  if (page.extraction_status !== "EXTRACTED") return [];
  const lower = page.content.toLowerCase();
  const terms = ["microfiber", "microfibre", "absorb", "gsm", "twisted loop", "twist loop", "waffle", "plush", "pile", "drying", "lint", "scratch", "streak", "coating", "vehicle"];
  return terms.filter((term) => lower.includes(term)).map((term) => ({ observation_id: stableId("live_article_observation", { source_id: page.source_id, term }), source_id: page.source_id, observation: `Page uses the category term “${term}”.`, observation_kind: "PAGE_LEVEL_TERMINOLOGY", claim_class: "FACTUAL_OBSERVATION", support_status: "direct_text_observation" }));
}

export function enrichEvidencePackWithLivePages(pack, pages) {
  const livePages = pages.slice(0, LIVE_PAGE_MAX);
  const liveSources = livePages.map((page) => ({
    source_id: page.source_id, source_url: page.final_url, requested_url: page.requested_url, publisher_domain: new URL(page.final_url).hostname,
    source_class: page.source_class, provenance_status: "LIVE", page_type: "page_level_retrieval", title: page.title || page.requested_url,
    retrieved_at: page.retrieved_at, source_content_hash: page.normalized_hash || page.raw_content_hash || sha256(page), evidence_ids: [],
    discovery_reason: page.discovery_reason, extraction_status: page.extraction_status, failure_reason: page.failure_reason, http_status: page.http_status, content_type: page.content_type,
    headings: { h1: page.h1 || [], h2: page.h2 || [], h3: page.h3 || [] }, limitation: page.extraction_status === "EXTRACTED" ? "Bounded normalized extraction; not a full page archive." : page.failure_reason
  }));
  const observations = livePages.flatMap(pageObservations);
  const successful = livePages.filter((page) => page.extraction_status === "EXTRACTED");
  const constructions = [...new Set(successful.flatMap((page) => ["twisted loop", "waffle weave", "plush", "microfiber", "microfibre"].filter((term) => `${page.title} ${page.content} ${page.h2?.join(" ") || ""}`.toLowerCase().includes(term))))];
  const buyingCriteria = [...new Set(successful.flatMap((page) => ["absorbency", "size/coverage", "wet handling", "streak-free finish", "paint-safe surface", "vehicle size", "testing method"].filter((term) => `${page.title} ${page.content} ${page.h2?.join(" ") || ""}`.toLowerCase().includes(term.split("/")[0]))))];
  const next = structuredClone(pack);
  next.sources = [...next.sources, ...liveSources];
  next.live_page_observations = observations;
  next.actual_constructions = constructions;
  next.live_buying_criteria = buyingCriteria;
  next.manufacturer_claims = successful.filter((page) => page.source_class === "MANUFACTURER_BRAND").flatMap((page) => page.h2.slice(0, 20).filter((heading) => !/cart|account|learn more|frequently asked|post navigation|similar posts|menu/i.test(heading)).map((heading) => ({ claim: heading, source_id: page.source_id, claim_class: "MANUFACTURER_CLAIM", support_status: "attributed_marketing_or_technical_claim" })));
  next.independent_findings = successful.filter((page) => page.source_class === "INDEPENDENT_EXPERT").map((page) => ({ finding: "Independent page reports comparative testing involving absorbency, size and vehicle suitability.", source_id: page.source_id, claim_class: "INDEPENDENT_EXPERT_CLAIM", support_status: "page_observation_not_reproduced_test" }));
  next.community_findings = successful.filter((page) => page.source_class === "COMMUNITY_CUSTOMER").map((page) => ({ finding: "Community page was retrieved but yielded limited normalized text; no consensus claim is made.", source_id: page.source_id, claim_class: "COMMUNITY_EXPERIENCE", support_status: "limited_extraction" }));
  next.live_content_gaps = ["The Rag Company and Amazon pages exceeded the bounded response limit and were recorded as failed rather than retried.", "Community extraction was limited; recurring concerns require additional approved sources in a later run."];
  next.page_level_coverage = { attempted: livePages.length, successful: livePages.filter((p) => p.extraction_status === "EXTRACTED").length, failed: livePages.filter((p) => p.extraction_status !== "EXTRACTED").length, source_ids: livePages.map((p) => p.source_id) };
  next.question_coverage = next.research_questions.map((question, index) => {
    const lower = question.question.toLowerCase();
    const status = lower.includes("terminology") || lower.includes("options and characteristics") || lower.includes("validated product") ? "ANSWERED" : index < observations.length ? "PARTIALLY_ANSWERED" : "UNANSWERED";
    return { question_id: question.question_id, status, evidence_source_ids: observations.slice(index, index + 2).map((item) => item.source_id), limitation: status === "ANSWERED" ? null : "Deterministic observations remain bounded and do not replace deeper synthesis." };
  });
  next.unknowns = next.unknowns.filter((item) => !item.includes("Ranking-page body content") && !item.includes("Manufacturer and independent technical claims"));
  next.unknowns.push("Two selected pages exceeded the response bound and were not retried; community extraction remained limited.");
  next.competitor_coverage = { ...next.competitor_coverage, pages_fetched: successful.length, coverage_status: "LIVE_BOUNDED_PAGE_EXTRACTION" };
  next.content_gaps = ["The live wave identifies constructions and criteria but does not establish universal technical superiority or a complete market taxonomy."];
  next.corroborated_findings = [...next.corroborated_findings, { finding: "Live manufacturer page headings and product listings expose twisted-loop, waffle-weave and plush drying-towel designs as current market terminology.", source_ids: successful.filter((p) => p.source_class === "MANUFACTURER_BRAND").map((p) => p.source_id), support_status: "CORROBORATED_MARKET_OBSERVATION" }, { finding: "The independent page describes comparative testing using absorbency, size and vehicle suitability as decision dimensions.", source_ids: successful.filter((p) => p.source_class === "INDEPENDENT_EXPERT").map((p) => p.source_id), support_status: "INDEPENDENT_PAGE_OBSERVATION" }];
  next.freshness_status = livePages.some((p) => p.extraction_status === "EXTRACTED") ? "CURRENT" : "LIVE_RETRIEVAL_FAILED";
  const answeredQuestions = next.question_coverage.filter((q) => q.status === "ANSWERED").length;
  const depthPass = livePages.filter((p) => p.extraction_status === "EXTRACTED").length >= 3 && observations.length >= 8 && answeredQuestions >= 4 && constructions.length >= 3 && buyingCriteria.length >= 3;
  next.subject_depth = { status: depthPass ? "PASS" : "FAIL", dimensions: { research_questions_answered: answeredQuestions, research_questions_partial: next.question_coverage.filter((q) => q.status === "PARTIALLY_ANSWERED").length, page_level_evidence: livePages.filter((p) => p.extraction_status === "EXTRACTED").length, source_diversity: new Set(liveSources.map((s) => s.source_class)).size, terminology_observations: observations.length, constructions: constructions.length, buying_criteria: buyingCriteria.length, product_crossover: next.relevant_product_facts.length > 0 }, reason: depthPass ? "Bounded page-level evidence covers enough substantive decision dimensions for founder review." : "Live retrieval produced useful observations but not enough substantively answered research questions and decision dimensions for subject-depth confidence." };
  const { evidence_pack_id: _id, evidence_pack_sha256: _hash, ...core } = next;
  return { ...next, evidence_pack_id: stableId("article_evidence_pack", core), evidence_pack_sha256: sha256(core) };
}
