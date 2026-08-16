import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildArticleEvidencePack, renderArticleEvidenceReview, validateArticleEvidencePack } from "../research/articleEvidence.js";
import { enrichEvidencePackWithLivePages, fetchResearchPage } from "../research/articleLiveEvidence.js";
import { sha256 } from "../research/core/canonical.js";

const root = path.resolve(process.env.M4A1_PROOF_ROOT || "artifacts/workflows/create-seo-article/m4a1-proof");
const oldPack = JSON.parse(await readFile(path.resolve("artifacts/workflows/create-seo-article/m4a-proof/article-editorial-evidence-pack.json"), "utf8"));
const m4Input = JSON.parse(await readFile(path.resolve("artifacts/workflows/create-seo-article/m4-proof-v5/gpt-5.6-sol/call_001/m4-input.json"), "utf8"));
const m3 = JSON.parse(await readFile(path.resolve("artifacts/workflows/create-seo-article/m3-research-opportunity-proof.json"), "utf8"));
const serpPacket = JSON.parse(await readFile(path.resolve("artifacts/cornerstone/best-car-drying-towel/fixture-v1/research-packet.json"), "utf8"));
const productFacts = JSON.parse(await readFile(path.resolve("artifacts/evidence/cache/product_facts/cb8ad78af1c615b3187325d08932c20799603ddb695b81373a11ffde4b2a572b/normalised.json"), "utf8")).records;
const opportunity = { ...m3.decision, outcome: "ARTICLE_RECOMMENDED" };
const candidates = serpPacket.serp.observed_results.slice(0, 5).map((result) => ({ url: result.url, sourceClass: result.page_type === "discussion" ? "COMMUNITY_CUSTOMER" : result.page_type === "editorial_guide" ? "INDEPENDENT_EXPERT" : /chemicalguys|theragcompany|autogeek/i.test(result.domain || "") ? "MANUFACTURER_BRAND" : "SERP_COMPETITOR", reason: `Selected from the existing SERP for ${opportunity.primary_query}.` }));
const researchState = { serp_feature_observations: serpPacket.serp.recurring_questions.map((x) => ({ questions: [x] })) };
const basePack = buildArticleEvidencePack({ opportunity, m4Input, researchState, serpPacket, productFacts, now: new Date().toISOString() });
let pages; let reusedManifest = true;
try { pages = JSON.parse(await readFile(path.join(root, "live-fetch-manifest.json"), "utf8")).pages; }
catch { reusedManifest = false; pages = []; for (const candidate of candidates) pages.push(await fetchResearchPage(candidate.url, { sourceClass: candidate.sourceClass, discoveryReason: candidate.reason, now: new Date().toISOString() })); }
const pack = enrichEvidencePackWithLivePages(basePack, pages);
const errors = validateArticleEvidencePack(pack, { opportunity, m4Input });
if (errors.length) throw new Error(JSON.stringify(errors));
await mkdir(root, { recursive: true });
await writeFile(path.join(root, "article-editorial-evidence-pack.json"), `${JSON.stringify(pack, null, 2)}\n`, { flag: "wx" });
await writeFile(path.join(root, "m4a1-live-research-review.md"), renderArticleEvidenceReview(pack), { flag: "wx" });
const comparison = { artifact_type: "m4a_vs_m4a1_comparison", old: { id: oldPack.evidence_pack_id, sha256: oldPack.evidence_pack_sha256, freshness: oldPack.freshness_status, sources: oldPack.sources.length, page_level_sources: 0, terminology: oldPack.market_terminology.length, questions: oldPack.research_questions.length, subject_depth: "INSUFFICIENT" }, live: { id: pack.evidence_pack_id, sha256: pack.evidence_pack_sha256, freshness: pack.freshness_status, sources: pack.sources.length, live_pages_attempted: pack.page_level_coverage.attempted, live_pages_successful: pack.page_level_coverage.successful, live_pages_failed: pack.page_level_coverage.failed, terminology: pack.market_terminology.length, questions: pack.research_questions.length, partially_answered: pack.question_coverage.filter((q) => q.status === "PARTIALLY_ANSWERED").length, unanswered: pack.question_coverage.filter((q) => q.status === "UNANSWERED").length, subject_depth: pack.subject_depth.status }, calls: { dataforseo: 0, search_console: 0, other_live_web: pack.page_level_coverage.attempted } };
await writeFile(path.join(root, "m4a-vs-m4a1-comparison.json"), `${JSON.stringify(comparison, null, 2)}\n`, { flag: "wx" });
if (!reusedManifest) await writeFile(path.join(root, "live-fetch-manifest.json"), `${JSON.stringify({ artifact_type: "bounded_live_research_fetch_manifest", page_budget: 10, candidates, pages: pages.map(({ content, ...summary }) => summary) }, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ evidence_pack_id: pack.evidence_pack_id, evidence_pack_sha256: pack.evidence_pack_sha256, freshness: pack.freshness_status, subject_depth: pack.subject_depth, pages: pack.page_level_coverage, calls: comparison.calls, input_sha256: sha256({ opportunity, candidates }) }, null, 2));
