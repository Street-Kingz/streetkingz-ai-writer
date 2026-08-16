import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deriveResearchGaps, deriveTargetedResearchQueries, enrichWithAdaptiveWave, ADAPTIVE_WAVE2_MAX_PAGES } from "../research/articleAdaptiveEvidence.js";
import { fetchResearchPage } from "../research/articleLiveEvidence.js";
import { validateArticleEvidencePack, renderArticleEvidenceReview } from "../research/articleEvidence.js";

const root = path.resolve(process.env.M4A2_PROOF_ROOT || "artifacts/workflows/create-seo-article/m4a2-proof");
const oldPackPath = path.resolve("artifacts/workflows/create-seo-article/m4a1-proof-v3/article-editorial-evidence-pack.json");
const m4InputPath = path.resolve("artifacts/workflows/create-seo-article/m4-proof-v5/gpt-5.6-sol/call_001/m4-input.json");
const m3Path = path.resolve("artifacts/workflows/create-seo-article/m3-research-opportunity-proof.json");

const pack = JSON.parse(await readFile(oldPackPath, "utf8"));
const m4Input = JSON.parse(await readFile(m4InputPath, "utf8"));
const m3 = JSON.parse(await readFile(m3Path, "utf8"));
const opportunity = { ...m3.decision, outcome: "ARTICLE_RECOMMENDED" };
if (pack.lineage.opportunity_id !== opportunity.decision_id || pack.lineage.primary_query !== opportunity.primary_query) throw new Error("M4A1_CANONICAL_LINEAGE_MISMATCH");

const gaps = deriveResearchGaps(pack);
const queries = deriveTargetedResearchQueries(gaps, pack);
const gapFor = (type) => gaps.find((gap) => gap.type === type)?.gap_id || gaps[0]?.gap_id;

// These are bounded candidates returned by one targeted discovery pass for the derived queries.
// They are development-proof inputs, not merchant inputs or generic runtime rules.
const discoveredCandidates = [
  ["technical_depth", "https://microfibertech.com/pages/what-is-gsm", "MANUFACTURER_BRAND"],
  ["technical_depth", "https://www.aosehometex.com/are-higher-gsm-microfiber-towels-always-better/", "MANUFACTURER_BRAND"],
  ["construction_tradeoffs", "https://www.feynlab.com/product/feynlab-twisted-logic-korean-microfiber-drying-towel-v2/", "MANUFACTURER_BRAND"],
  ["construction_tradeoffs", "https://www.lumacotextile.com/blog/articles/rag-company-drying-towel-benchmark-oem.html", "MANUFACTURER_BRAND"],
  ["market_taxonomy", "https://paragonmicrofibre.com/collections/microfibre-towels", "MANUFACTURER_BRAND"],
  ["customer_evidence", "https://carproforum.com/threads/review-carpro-dhydrate-drying-towel.5478/", "COMMUNITY_CUSTOMER"],
  ["customer_evidence", "https://www.reddit.com/r/AutoDetailing/comments/1penr51/drying_towel_advice_i_just_got_some_that_seem_way/", "COMMUNITY_CUSTOMER"],
  ["professional_practice", "https://superceramiccoating.com/product/microfiber-twisted-loop-drying-towel-1200-gsm/", "MANUFACTURER_BRAND"]
].slice(0, ADAPTIVE_WAVE2_MAX_PAGES).map(([gapType, url, sourceClass]) => ({ gap_id: gapFor(gapType), url, source_class: sourceClass, gap_type: gapType }));

const pages = [];
for (const candidate of discoveredCandidates) {
  const page = await fetchResearchPage(candidate.url, { sourceClass: candidate.source_class, discoveryReason: `Targeted gap-directed query for ${candidate.gap_type}.`, researchQuestionIds: gaps.find((gap) => gap.gap_id === candidate.gap_id)?.originating_question_ids || [] });
  pages.push({ ...page, gap_id: candidate.gap_id });
}
const next = enrichWithAdaptiveWave({ pack, wave1Pages: [], wave2Pages: pages, gaps, queries });
const validationErrors = validateArticleEvidencePack(next, { opportunity, m4Input });
if (validationErrors.length) throw new Error(JSON.stringify(validationErrors));
await mkdir(root, { recursive: true });
await writeFile(path.join(root, "targeted-discovery.json"), `${JSON.stringify({ provider: "bounded_targeted_search_development_proof", dataforseo_calls: 0, search_calls: 1, queries, candidates: discoveredCandidates }, null, 2)}\n`, { flag: "wx" });
await writeFile(path.join(root, "article-editorial-evidence-pack.json"), `${JSON.stringify(next, null, 2)}\n`, { flag: "wx" });
await writeFile(path.join(root, "adaptive-research-review.md"), renderArticleEvidenceReview(next), { flag: "wx" });
const comparison = { artifact_type: "m4a1_vs_m4a2_comparison", m4a1: { id: pack.evidence_pack_id, sha256: pack.evidence_pack_sha256, questions: pack.question_coverage, pages_attempted: pack.page_level_coverage.attempted, pages_successful: pack.page_level_coverage.successful, subject_depth: pack.subject_depth }, m4a2: { id: next.evidence_pack_id, sha256: next.evidence_pack_sha256, questions: next.question_coverage, gaps: next.research_gaps, pages_attempted: next.research_waves.wave_2.pages_attempted, pages_successful: next.research_waves.wave_2.pages_successful, subject_depth: next.subject_depth }, budget: next.research_waves, calls: { dataforseo: 0, targeted_search: 1, html_fetches: pages.length } };
await writeFile(path.join(root, "m4a1-vs-m4a2-comparison.json"), `${JSON.stringify(comparison, null, 2)}\n`, { flag: "wx" });
await writeFile(path.join(root, "wave-2-fetch-manifest.json"), `${JSON.stringify({ page_budget: ADAPTIVE_WAVE2_MAX_PAGES, pages: pages.map(({ content, ...summary }) => summary) }, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ evidence_pack_id: next.evidence_pack_id, evidence_pack_sha256: next.evidence_pack_sha256, subject_depth: next.subject_depth, gaps: next.research_gaps.map((gap) => ({ type: gap.type, status: gap.status })), pages: next.research_waves, queries: queries.map((query) => query.query), calls: { dataforseo: 0, targeted_search: 1, html_fetches: pages.length } }, null, 2));
