import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { authorityRankFor } from "../product-intelligence/authority.js";
import { createSourceEvidence, deduplicateEvidence } from "../product-intelligence/evidence.js";
import { detectDeterministicConflicts, ingestProductEvidence, validateStreetKingzProductUrl } from "../product-intelligence/ingestion.js";
import { extractRenderedPageEvidence } from "../product-intelligence/renderedPageEvidence.js";
import { extractAuthoritativeProductEvidence } from "../product-intelligence/woocommerceEvidence.js";

const PRODUCT_URL = "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/";
const NOW = "2026-08-13T12:00:00.000Z";
const fixture = await readFile(new globalThis.URL("./fixtures/product-page.html", import.meta.url), "utf8");
const html = fixture.replace("<body>", '<body class="single-product postid-70">').replace("<main>", '<nav><a href="https://streetkingz.co.uk/product/unrelated/">Shop product</a><a href="/my-account/">Account</a></nav><main>');

function authoritative(overrides = {}) {
  const { fields: fieldOverrides = {}, ...topLevelOverrides } = overrides;
  return {
    schema_version: "2.0.0",
    artifact_type: "wordpress_authoritative_post_and_template_read",
    post_id: 70,
    post_type: "product",
    status: "publish",
    fields: {
      post_title: "Heavy Duty Drying Towel – 1200gsm",
      post_excerpt: "<ul>\n <li>1200GSM dual layer thickness</li> </ul>",
      post_content: "Legacy product content",
      slug: "heavy-duty-drying-towel-1200gsm",
      permalink: PRODUCT_URL,
      ...fieldOverrides
    },
    meta: { _elementor_data: "[]" },
    provenance: { final_url: "https://streetkingz.co.uk/wp-json/streetkingz-ai/v1/products/70/authoritative", request_count: 1, write_capability: false },
    ...topLevelOverrides
  };
}

function dependencies({ page = html, product = authoritative() } = {}) {
  let renderedReads = 0;
  let authoritativeReads = 0;
  return {
    get counts() { return { renderedReads, authoritativeReads }; },
    readRenderedPage: async () => {
      renderedReads += 1;
      return { html: page, retrieval: { request_count: 1, method: "GET" } };
    },
    readAuthoritativeProduct: async ({ productId }) => {
      authoritativeReads += 1;
      assert.equal(productId, 70);
      return { authoritativePost: product, raw: { product: { id: 70, title: product.fields.post_title } }, retrieval: { request_count: 1, method: "GET" } };
    }
  };
}

test("single valid Street Kingz product URL is accepted at the adapter boundary", () => {
  assert.equal(validateStreetKingzProductUrl(PRODUCT_URL), PRODUCT_URL);
  assert.throws(() => validateStreetKingzProductUrl("https://example.test/product/towel/"), /Street Kingz/);
});

test("authoritative adapter produces WooCommerce evidence", () => {
  const evidence = extractAuthoritativeProductEvidence(authoritative(), PRODUCT_URL, NOW);
  assert.ok(evidence.length >= 7);
  assert.ok(evidence.every((record) => record.source_type === "woocommerce"));
  assert.equal(evidence.find((record) => record.source_field === "product.id").normalised_value, "70");
});

test("rendered page produces literal customer-facing evidence", () => {
  const evidence = extractRenderedPageEvidence(html, PRODUCT_URL, NOW);
  assert.ok(evidence.some((record) => record.source_field === "product.name"));
  assert.ok(evidence.some((record) => record.source_field === "commercial.price"));
  assert.ok(evidence.some((record) => record.source_field === "content.section.about_this_product"));
  assert.ok(evidence.some((record) => record.source_field === "specification.size" && record.normalised_value === "90 × 60 cm"));
  assert.equal(evidence.some((record) => record.source_field === "content.section.you_may_also_like"), false);
});

test("FAQ records have faq authority and retain question and answer", () => {
  const faqs = extractRenderedPageEvidence(html, PRODUCT_URL, NOW).filter((record) => record.source_type === "faq");
  assert.equal(faqs.length, 2);
  assert.match(faqs[0].normalised_value.question, /scratch/i);
  assert.match(faqs[0].normalised_value.answer, /clean, shampooed paint/i);
});

test("bounded product-content links use internal_link source type", () => {
  const links = extractRenderedPageEvidence(html, PRODUCT_URL, NOW).filter((record) => record.source_type === "internal_link");
  assert.deepEqual(links.map((record) => record.normalised_value), [{ label: "Origin Shampoo", destination_url: "https://streetkingz.co.uk/product/the-origin-shampoo/" }]);
});

test("all authority ranks come from the centralized hierarchy", () => {
  const records = [...extractAuthoritativeProductEvidence(authoritative(), PRODUCT_URL, NOW), ...extractRenderedPageEvidence(html, PRODUCT_URL, NOW)];
  for (const record of records) assert.equal(record.authority_rank, authorityRankFor(record.source_type));
});

test("evidence IDs are stable for identical evidence independent of retrieval time", () => {
  const input = { sourceType: "woocommerce", sourceUriOrLocation: PRODUCT_URL, sourceField: "product.name", rawValue: "Towel" };
  assert.equal(createSourceEvidence({ ...input, retrievedAt: NOW }).id, createSourceEvidence({ ...input, retrievedAt: "2027-01-01T00:00:00Z" }).id);
});

test("evidence IDs differ for materially different evidence", () => {
  const input = { sourceType: "woocommerce", sourceUriOrLocation: PRODUCT_URL, sourceField: "product.name", retrievedAt: NOW };
  assert.notEqual(createSourceEvidence({ ...input, rawValue: "Towel" }).id, createSourceEvidence({ ...input, rawValue: "Mitt" }).id);
});

test("content fingerprints are deterministic and content-sensitive", () => {
  const input = { sourceType: "faq", sourceUriOrLocation: PRODUCT_URL, sourceField: "faq.item", retrievedAt: NOW };
  const first = createSourceEvidence({ ...input, rawValue: "Question A" });
  assert.equal(first.content_fingerprint, createSourceEvidence({ ...input, rawValue: "Question A" }).content_fingerprint);
  assert.notEqual(first.content_fingerprint, createSourceEvidence({ ...input, rawValue: "Question B" }).content_fingerprint);
  assert.match(first.content_fingerprint, /^[a-f0-9]{64}$/);
});

test("raw source formatting remains distinct from normalized values", () => {
  const evidence = extractAuthoritativeProductEvidence(authoritative(), PRODUCT_URL, NOW).find((record) => record.source_field === "content.short_description");
  assert.match(evidence.raw_value, /<ul>/);
  assert.equal(evidence.normalised_value, "1200GSM dual layer thickness");
});

test("missing optional authoritative commerce fields do not fail ingestion", async () => {
  const deps = dependencies();
  const result = await ingestProductEvidence(PRODUCT_URL, { ...deps, now: () => new Date(NOW), writeArtifacts: false });
  assert.ok(result.artifact.evidence.length > 0);
  assert.equal(result.artifact.evidence.some((record) => record.source_field === "commercial.sku"), false);
});

test("matching WooCommerce and rendered facts create no conflict", () => {
  const evidence = [...extractAuthoritativeProductEvidence(authoritative(), PRODUCT_URL, NOW), ...extractRenderedPageEvidence(html, PRODUCT_URL, NOW)];
  assert.deepEqual(detectDeterministicConflicts(evidence), []);
});

test("differing comparable WooCommerce and rendered facts create a conflict", () => {
  const evidence = [...extractAuthoritativeProductEvidence(authoritative({ fields: { post_title: "Different Product Name" } }), PRODUCT_URL, NOW), ...extractRenderedPageEvidence(html, PRODUCT_URL, NOW)];
  const conflicts = detectDeterministicConflicts(evidence);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].field, "product.name");
});

test("higher-authority evidence is provisionally selected", () => {
  const evidence = [...extractAuthoritativeProductEvidence(authoritative({ fields: { post_title: "Authoritative Name" } }), PRODUCT_URL, NOW), ...extractRenderedPageEvidence(html, PRODUCT_URL, NOW)];
  const conflict = detectDeterministicConflicts(evidence)[0];
  const woo = evidence.find((record) => record.source_type === "woocommerce" && record.source_field === "product.name");
  assert.equal(conflict.provisional_evidence_ref, woo.id);
  assert.equal(conflict.provisional_value, "Authoritative Name");
});

test("both sides of a conflict remain preserved in source evidence", async () => {
  const deps = dependencies({ product: authoritative({ fields: { post_title: "Authoritative Name" } }) });
  const result = await ingestProductEvidence(PRODUCT_URL, { ...deps, now: () => new Date(NOW), writeArtifacts: false });
  const refs = result.artifact.conflict_candidates[0].evidence_refs;
  assert.equal(refs.length, 2);
  assert.ok(refs.every((id) => result.artifact.evidence.some((record) => record.id === id)));
});

test("deduplication removes only genuinely identical evidence", () => {
  const base = { sourceType: "internal_link", sourceUriOrLocation: PRODUCT_URL, sourceField: "internal_link", retrievedAt: NOW };
  const first = createSourceEvidence({ ...base, rawValue: '<a href="/a">A</a>' });
  const identical = createSourceEvidence({ ...base, rawValue: '<a href="/a">A</a>' });
  const different = createSourceEvidence({ ...base, rawValue: '<a href="/b">B</a>' });
  assert.deepEqual(deduplicateEvidence([first, identical, different]).map((item) => item.id), [first.id, different.id]);
});

test("global, account, cart and unrelated recommendation links are ignored", () => {
  const links = extractRenderedPageEvidence(html, PRODUCT_URL, NOW).filter((record) => record.source_type === "internal_link");
  const serialized = JSON.stringify(links);
  assert.doesNotMatch(serialized, /unrelated|my-account|add-to-cart|microfibre-scrub-pads/);
});

test("generic ingestion code contains no Heavy Duty towel conclusions", async () => {
  const files = ["product-intelligence/ingestion.js", "product-intelligence/renderedPageEvidence.js", "product-intelligence/woocommerceEvidence.js"];
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(source, /faster drying|ideal customer|fewer passes|heavy duty drying towel|1200gsm dual/i);
});

test("execution metadata reports zero AI calls and two GET/read requests", async () => {
  const deps = dependencies();
  const result = await ingestProductEvidence(PRODUCT_URL, { ...deps, now: () => new Date(NOW), writeArtifacts: false });
  assert.equal(result.artifact.execution_metadata.ai_calls, 0);
  assert.equal(result.artifact.execution_metadata.input_tokens, 0);
  assert.equal(result.artifact.execution_metadata.output_tokens, 0);
  assert.equal(result.artifact.execution_metadata.external_api_call_count, 2);
});

test("ingestion uses only injected reads in tests and writes separate raw artifacts", async () => {
  const deps = dependencies();
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "product-intelligence-ingestion-"));
  const result = await ingestProductEvidence(PRODUCT_URL, { ...deps, now: () => new Date(NOW), outputRoot });
  assert.deepEqual(deps.counts, { renderedReads: 1, authoritativeReads: 1 });
  assert.match(await readFile(result.paths.rawRenderedPage, "utf8"), /product_title/);
  assert.equal(JSON.parse(await readFile(result.paths.rawWooCommerce, "utf8")).product.id, 70);
  assert.equal(JSON.parse(await readFile(result.paths.evidence, "utf8")).artifact_type, "product_intelligence_raw_evidence");
  assert.equal(result.paths.runDirectory.includes("artifacts/product-extraction"), false);
});
