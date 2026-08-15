import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256, stableId } from "../research/core/canonical.js";
import { extractBusinessPageEvidence, extractLinks, extractNavigationEvidence, extractProductCandidates } from "./websiteEvidence.js";
import { planDiscoveredPages, selectRepresentativeProducts, validateBusinessUrl } from "./planning.js";

export const RAW_BUSINESS_EVIDENCE_ARTIFACT_TYPE = "business_intelligence_raw_evidence";

function safeTimestamp(value) { return value.replace(/[:.]/g, "-"); }
function businessSlug(url) { return new URL(url).hostname.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function pageFilename(url) { return `${stableId("page", url)}.html`; }
async function writeJson(filePath, value) { await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" }); }
function resultParts(result) { return typeof result === "string" ? { html: result, retrieval: {} } : { html: result?.html, retrieval: result?.retrieval || {} }; }

export async function ingestBusinessEvidence(businessUrl, {
  readPage, now = () => new Date(), outputRoot = "artifacts/business-intelligence", writeArtifacts = true
} = {}) {
  const homeUrl = validateBusinessUrl(businessUrl);
  if (typeof readPage !== "function") throw new Error("An injected read-only page reader is required.");
  const createdAt = now().toISOString();
  const pages = [];
  const read = async (descriptor) => {
    const { html, retrieval } = resultParts(await readPage(descriptor.url));
    if (!String(html || "").trim()) throw new Error(`Empty HTML returned for ${descriptor.url}.`);
    const page = { ...descriptor, html, retrieval: { ...retrieval, method: retrieval.method || "GET", request_count: retrieval.request_count ?? 1 }, content_fingerprint: sha256(html) };
    pages.push(page);
    return page;
  };

  const homepage = await read({ url: homeUrl, page_type: "homepage", reason: "business_entry_point" });
  const navigationLinks = extractLinks(homepage.html, homeUrl, { navigationOnly: true });
  const plan = planDiscoveredPages(homeUrl, navigationLinks);
  const supportingPages = [];
  for (const descriptor of plan.included) supportingPages.push(await read(descriptor));

  const categoryPages = supportingPages.filter((page) => page.page_type === "category_page");
  const categoryCandidates = categoryPages.map((page) => ({
    url: page.url, label: page.label, products: extractProductCandidates(page.html, page.url)
  }));
  const sampling = selectRepresentativeProducts(categoryCandidates);
  const productPages = [];
  for (const sample of sampling.selected) productPages.push(await read({ ...sample, page_type: "product_sample" }));

  let evidence = [
    ...extractBusinessPageEvidence({ html: homepage.html, url: homepage.url, pageType: "homepage", retrievedAt: createdAt }),
    ...extractNavigationEvidence(homepage.html, homepage.url, createdAt)
  ];
  for (const page of [...supportingPages, ...productPages]) {
    evidence.push(...extractBusinessPageEvidence({ html: page.html, url: page.url, pageType: page.page_type, retrievedAt: createdAt }));
  }
  evidence = [...new Map(evidence.map((record) => [record.id, record])).values()];

  const sourceCounts = Object.fromEntries([...new Set(evidence.map((item) => item.source_type))].sort().map((type) => [type, evidence.filter((item) => item.source_type === type).length]));
  const pagesChecked = pages.map((page) => ({ url: page.url, page_type: page.page_type, reason: page.reason, content_fingerprint: page.content_fingerprint, http_status: page.retrieval.http_status ?? null }));
  const sourceFingerprint = sha256(pages.map((page) => ({ url: page.url, content_fingerprint: page.content_fingerprint })).sort((a, b) => a.url.localeCompare(b.url)));
  const requestCount = pages.reduce((sum, page) => sum + page.retrieval.request_count, 0);
  const artifact = {
    schema_version: "1.0.0", artifact_type: RAW_BUSINESS_EVIDENCE_ARTIFACT_TYPE,
    business_url: homeUrl, created_at: createdAt, evidence,
    source_summary: { evidence_counts: sourceCounts, pages_by_type: Object.fromEntries([...new Set(pages.map((page) => page.page_type))].sort().map((type) => [type, pages.filter((page) => page.page_type === type).length])) },
    ingestion_metadata: { pages_checked: pagesChecked, pages_included: pagesChecked, pages_excluded: plan.excluded, http_read_request_count: requestCount },
    sampling_summary: { limit: sampling.maximum, products_sampled: sampling.selected, products_excluded: sampling.excluded, category_candidates: categoryCandidates.map((category) => ({ url: category.url, label: category.label, candidate_count: category.products.length })) },
    source_fingerprint: sourceFingerprint,
    execution_metadata: { deterministic_steps: ["validate_business_url", "read_homepage", "extract_primary_navigation", "plan_bounded_sources", "read_supporting_pages", "select_representative_products", "read_product_sample", "extract_literal_business_evidence", "write_raw_artifacts"], external_api_call_count: requestCount, ai_calls: 0, input_tokens: 0, output_tokens: 0, estimated_ai_cost: 0, write_operations: 0 }
  };
  if (!writeArtifacts) return { artifact, paths: null, raw: { pages } };

  const runDirectory = path.resolve(outputRoot, businessSlug(homeUrl), safeTimestamp(createdAt));
  const rawDirectory = path.join(runDirectory, "raw", "pages");
  await mkdir(path.dirname(runDirectory), { recursive: true });
  await mkdir(runDirectory, { recursive: false });
  await mkdir(path.join(runDirectory, "raw"), { recursive: false });
  await mkdir(rawDirectory, { recursive: false });
  const rawManifest = pages.map((page) => ({ url: page.url, page_type: page.page_type, reason: page.reason, file: `pages/${pageFilename(page.url)}`, content_fingerprint: page.content_fingerprint, retrieval: page.retrieval }));
  const paths = { runDirectory, rawDirectory, rawManifest: path.join(runDirectory, "raw", "retrieval-metadata.json"), evidence: path.join(runDirectory, "raw-business-evidence.json"), runMetadata: path.join(runDirectory, "run-metadata.json") };
  await Promise.all([
    ...pages.map((page) => writeFile(path.join(rawDirectory, pageFilename(page.url)), page.html, { encoding: "utf8", flag: "wx" })),
    writeJson(paths.rawManifest, { pages: rawManifest, credentials_persisted: false, request_headers_persisted: false, methods_used: ["GET"] }),
    writeJson(paths.evidence, artifact),
    writeJson(paths.runMetadata, { artifact_type: "business_intelligence_evidence_run", schema_version: "1.0.0", business_url: homeUrl, created_at: createdAt, source_fingerprint: sourceFingerprint, evidence_count: evidence.length, pages_retrieved: pages.length, products_sampled: sampling.selected.length, execution_metadata: artifact.execution_metadata })
  ]);
  return { artifact, paths, raw: { pages } };
}
