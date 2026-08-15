import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ingestBusinessEvidence } from "../business-intelligence/ingestion.js";
import { planDiscoveredPages, selectRepresentativeProducts, validateBusinessUrl } from "../business-intelligence/planning.js";
import { extractBusinessPageEvidence, extractLinks, extractNavigationEvidence } from "../business-intelligence/websiteEvidence.js";

const ROOT = "https://example.test/";
const WHEN = "2026-08-14T09:00:00.000Z";
const page = (title, content, extra = "") => `<!doctype html><html><head><title>${title}</title></head><body>${extra}<main>${content}</main><footer><p>Copyright Example</p><a href="/privacy/">Privacy</a></footer><div class="cookie-banner">Accept cookies</div></body></html>`;
const HOME = page("Northstar Supply", `<h1>Tools for better outdoor projects</h1><p>Carefully selected equipment, backed by practical support.</p><p>Trusted by customers who work outdoors.</p>`, `<header><nav><a href="/about/">Our Story</a><a href="/product-category/tools/">Tools</a><a href="/product-category/storage/">Storage</a><a href="/faq/">FAQ</a><a href="/cart/">Cart</a><a href="https://outside.test/">External</a></nav></header>`);
const ABOUT = page("About Northstar", `<h1>Our Story</h1><p>We started by selecting dependable workshop equipment.</p>`);
const FAQ = page("Help", `<h1>Frequently Asked Questions</h1><details><summary>When will my order arrive?</summary><p>Orders normally leave within two working days.</p></details>`);
const category = (name, start) => page(name, `<h1>${name}</h1><p>${name} selected for practical everyday work.</p><ul>${Array.from({ length: 6 }, (_, index) => `<li><a class="product" href="/product/item-${start + index}/">Item ${start + index}</a></li>`).join("")}</ul>`);
const PRODUCT = (number) => page(`Item ${number}`, `<h1>Item ${number}</h1><p>Powder-coated steel construction.</p>`);

function fixtureReader({ unexpected = true } = {}) {
  const map = new Map([[ROOT, HOME], [`${ROOT}about/`, ABOUT], [`${ROOT}faq/`, FAQ], [`${ROOT}product-category/tools/`, category("Tools", 1)], [`${ROOT}product-category/storage/`, category("Storage", 7)]]);
  for (let number = 1; number <= 12; number += 1) map.set(`${ROOT}product/item-${number}/`, PRODUCT(number));
  const calls = [];
  return { calls, async readPage(url) { calls.push(url); if (!map.has(url) && unexpected) throw new Error(`Unexpected read: ${url}`); return { html: map.get(url), retrieval: { method: "GET", request_count: 1, http_status: 200 } }; } };
}

test("accepts one valid absolute business URL", () => assert.equal(validateBusinessUrl(`${ROOT}#top`), ROOT));
test("homepage extraction preserves literal communication and source context", () => {
  const evidence = extractBusinessPageEvidence({ html: HOME, url: ROOT, pageType: "homepage", retrievedAt: WHEN });
  const record = evidence.find((item) => item.normalised_value === "Tools for better outdoor projects");
  assert.equal(record.raw_value, "Tools for better outdoor projects");
  assert.deepEqual(record.context, { locator: "h1[0]", page_type: "homepage" });
});
test("about-page extraction uses the bounded source type", () => assert.ok(extractBusinessPageEvidence({ html: ABOUT, url: `${ROOT}about/`, pageType: "about_page", retrievedAt: WHEN }).every((item) => item.source_type === "about_page")));
test("primary navigation is observable structure", () => {
  const evidence = extractNavigationEvidence(HOME, ROOT, WHEN);
  assert.ok(evidence.some((item) => item.normalised_value.label === "Tools"));
  assert.ok(evidence.every((item) => item.claim_classification === "observed_fact" && item.source_role === "observed_structure"));
});
test("page planning includes categories and excludes global transaction links", () => {
  const plan = planDiscoveredPages(ROOT, extractLinks(HOME, ROOT, { navigationOnly: true }));
  assert.equal(plan.included.filter((item) => item.page_type === "category_page").length, 2);
  assert.ok(plan.excluded.some((item) => item.reason === "global_or_transactional"));
});
test("FAQ questions and exact answers become FAQ evidence", () => {
  const evidence = extractBusinessPageEvidence({ html: FAQ, url: `${ROOT}faq/`, pageType: "faq", retrievedAt: WHEN });
  const item = evidence.find((record) => record.source_field === "faq.item");
  assert.deepEqual(item.normalised_value, { question: "When will my order arrive?", answer: "Orders normally leave within two working days." });
});
test("claims remain claims rather than becoming objective facts", () => {
  const evidence = extractBusinessPageEvidence({ html: HOME, url: ROOT, pageType: "homepage", retrievedAt: WHEN });
  assert.equal(evidence.find((item) => String(item.normalised_value).startsWith("Trusted by")).claim_classification, "customer_claim");
  assert.equal(evidence.find((item) => item.normalised_value === "Carefully selected equipment, backed by practical support.").claim_classification, "positioning_claim");
});
test("evidence IDs and content fingerprints are stable", () => {
  const one = extractBusinessPageEvidence({ html: ABOUT, url: `${ROOT}about/`, pageType: "about_page", retrievedAt: WHEN });
  const two = extractBusinessPageEvidence({ html: ABOUT, url: `${ROOT}about/`, pageType: "about_page", retrievedAt: "2027-01-01T00:00:00.000Z" });
  assert.deepEqual(one.map((item) => item.id), two.map((item) => item.id));
  assert.deepEqual(one.map((item) => item.content_fingerprint), two.map((item) => item.content_fingerprint));
});
test("boilerplate footer and cookie text are excluded", () => {
  const values = extractBusinessPageEvidence({ html: HOME, url: ROOT, pageType: "homepage", retrievedAt: WHEN }).map((item) => item.normalised_value);
  assert.ok(!values.includes("Copyright Example") && !values.includes("Accept cookies"));
});
test("representative products are bounded and distributed across categories", () => {
  const selection = selectRepresentativeProducts([{ url: "a", label: "A", products: Array.from({ length: 8 }, (_, i) => ({ url: `${ROOT}product/a${i}`, label: `A${i}` })) }, { url: "b", label: "B", products: Array.from({ length: 8 }, (_, i) => ({ url: `${ROOT}product/b${i}`, label: `B${i}` })) }]);
  assert.equal(selection.selected.length, 8);
  assert.deepEqual(selection.selected.slice(0, 2).map((item) => item.category_label), ["A", "B"]);
  assert.ok(selection.excluded.every((item) => item.reason === "representative_product_limit"));
});
test("ingestion extracts homepage, about, category, FAQ and representative product evidence", async () => {
  const fixture = fixtureReader();
  const { artifact } = await ingestBusinessEvidence(ROOT, { readPage: fixture.readPage, now: () => new Date(WHEN), writeArtifacts: false });
  for (const type of ["homepage", "navigation", "about_page", "category_page", "faq", "product_sample"]) assert.ok(artifact.source_summary.evidence_counts[type] > 0, type);
  assert.equal(artifact.sampling_summary.products_sampled.length, 8);
});
test("ingestion never fetches the full catalogue", async () => {
  const fixture = fixtureReader();
  const { artifact } = await ingestBusinessEvidence(ROOT, { readPage: fixture.readPage, now: () => new Date(WHEN), writeArtifacts: false });
  const productReads = fixture.calls.filter((url) => url.includes("/product/item-"));
  assert.equal(productReads.length, 8);
  assert.ok(artifact.sampling_summary.products_excluded.length > 0);
  for (const excluded of artifact.sampling_summary.products_excluded) assert.ok(!productReads.includes(excluded.url));
});
test("ingestion is network-independent and reports zero AI calls", async () => {
  const fixture = fixtureReader();
  const { artifact } = await ingestBusinessEvidence(ROOT, { readPage: fixture.readPage, now: () => new Date(WHEN), writeArtifacts: false });
  assert.equal(artifact.execution_metadata.ai_calls, 0);
  assert.equal(artifact.execution_metadata.external_api_call_count, fixture.calls.length);
});
test("raw evidence artifact and raw pages are written separately", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "business-evidence-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const fixture = fixtureReader();
  const result = await ingestBusinessEvidence(ROOT, { readPage: fixture.readPage, now: () => new Date(WHEN), outputRoot: root });
  const artifact = JSON.parse(await readFile(result.paths.evidence, "utf8"));
  const manifest = JSON.parse(await readFile(result.paths.rawManifest, "utf8"));
  assert.equal(artifact.artifact_type, "business_intelligence_raw_evidence");
  assert.equal(manifest.methods_used[0], "GET");
  assert.equal(manifest.pages.length, fixture.calls.length);
});
test("source context remains suitable for later communication alignment review without adding conclusions", async () => {
  const fixture = fixtureReader();
  const { artifact } = await ingestBusinessEvidence(ROOT, { readPage: fixture.readPage, now: () => new Date(WHEN), writeArtifacts: false });
  const claim = artifact.evidence.find((item) => item.claim_classification === "customer_claim");
  assert.equal(claim.source_uri_or_location, ROOT);
  assert.ok(claim.raw_value && claim.context.locator);
  assert.equal("audience" in artifact, false);
  assert.equal("business_intelligence" in artifact, false);
});
