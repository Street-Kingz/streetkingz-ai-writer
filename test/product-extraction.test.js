import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  ProductPageExtractionError,
  extractProductPage
} from "../extractors/productPage.js";
import { extractProductFromUrl } from "../services/productExtraction.js";

const PRODUCT_URL = "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/";
const fixturePath = new URL("./fixtures/product-page.html", import.meta.url);
const fixtureHtml = await readFile(fixturePath, "utf8");

function responseWith(html) {
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=UTF-8" }
  });
}

function assertFact(value, expected, extractionMethod = "deterministic_html") {
  assert.equal(value.value, expected);
  assert.equal(value.provenance.source_url, PRODUCT_URL);
  assert.equal(value.provenance.source_artifact, "raw/page.html");
  assert.equal(value.provenance.extraction_method, extractionMethod);
  assert.ok(value.provenance.selector);
  assert.ok(value.provenance.evidence);
}

function collectFacts(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (Object.hasOwn(value, "value") && Object.hasOwn(value, "provenance")) output.push(value);
  for (const child of Object.values(value)) collectFacts(child, output);
  return output;
}

test("extracts page-supported product understanding with provenance", () => {
  const facts = extractProductPage(fixtureHtml, PRODUCT_URL, {
    extractedAt: "2026-08-06T12:00:00.000Z"
  });

  assertFact(facts.product.name, "Heavy Duty Drying Towel – 1200gsm");
  assertFact(facts.product.category_type, "Microfibre car drying towel", "deterministic_derivation");
  assertFact(facts.product.commerce_category, "Exterior");
  assertFact(facts.product.price, "£18.99");
  assert.equal(facts.product.specifications.length, 4);
  assert.equal(facts.product.how_to_use.length, 4);
  assert.equal(facts.product.care_instructions.length, 3);
  assert.equal(facts.product.faqs.length, 2);
  assert.equal(facts.product.objections_or_buying_questions.length, 2);
  assert.equal(facts.product.features.length, 3);
  assert.equal(facts.product.benefits.length, 4);
  assert.equal(facts.product.intended_use.length, 2);
  assert.deepEqual(
    facts.product.claims.map((item) => item.value),
    ["Extreme absorbency", "Soft premium feel", "Safe on all paint"]
  );
  assert.ok(facts.product.claims.every((item) => item.value.length < 80));
  assert.deepEqual(
    facts.product.limitations.map((item) => item.value),
    [
      "Use only on clean, shampooed paint",
      "Feels heavier when fully saturated with water"
    ]
  );
  assert.ok(facts.product.limitations.every((item) => !/^No,/i.test(item.value)));
  assert.deepEqual(
    facts.product.internal_links.map((item) => [item.label.value, item.url.value]),
    [["Origin Shampoo", "https://streetkingz.co.uk/product/the-origin-shampoo/"]]
  );
  assert.ok(facts.product.internal_links.every((item) => !/add to cart/i.test(item.label.value)));
  assert.deepEqual(
    facts.product.related_products.map((item) => ({ name: item.name.value, url: item.url?.value || null })),
    [
      { name: "The Origin Shampoo", url: "https://streetkingz.co.uk/product/the-origin-shampoo/" },
      { name: "Microfibre Wash Mitt", url: null }
    ]
  );
  assert.ok(facts.product.related_products.every((item) => item.name.value !== "Interior Scrub Pads"));
  assert.ok(facts.product.related_products.every((item) => item.name.value !== "XL Barrel Brush"));
  const specificationValues = new Set(facts.product.specifications.map((item) => item.value.value));
  assert.ok(facts.product.intended_use.every((item) => !specificationValues.has(item.value)));
  assert.ok(facts.product.benefits.every((item) => !specificationValues.has(item.value)));

  const allFacts = collectFacts(facts.product);
  assert.ok(allFacts.length > 30);
  for (const item of allFacts) {
    assert.equal(item.provenance.source_url, PRODUCT_URL);
    assert.equal(item.provenance.source_artifact, "raw/page.html");
    assert.ok(item.provenance.evidence);
  }
});

test("writes separate raw, facts, interpretation and Markdown artifacts", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "streetkingz-extraction-artifacts-"));
  let fetchCalls = 0;
  const result = await extractProductFromUrl(PRODUCT_URL, {
    outputRoot,
    fetchImpl: async () => {
      fetchCalls += 1;
      return responseWith(fixtureHtml);
    },
    now: () => new Date("2026-08-06T12:00:00.000Z")
  });

  assert.equal(fetchCalls, 1);
  assert.equal(result.cacheHit, false);
  assert.match(await readFile(result.paths.rawHtml, "utf8"), /product_title/);
  const savedFacts = JSON.parse(await readFile(result.paths.facts, "utf8"));
  const savedInterpretation = JSON.parse(await readFile(result.paths.interpretation, "utf8"));
  const markdown = await readFile(result.paths.markdown, "utf8");
  assert.equal(savedFacts.artifact_type, "product_facts");
  assert.equal(savedInterpretation.artifact_type, "ai_interpretation");
  assert.equal(savedInterpretation.status, "not_generated");
  assert.deepEqual(savedInterpretation.items, []);
  assert.match(markdown, /# Heavy Duty Drying Towel – 1200gsm/);
  assert.match(markdown, /## Provenance/);
});

test("reuses a fresh cached page without refetching", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "streetkingz-extraction-cache-"));
  let fetchCalls = 0;
  const fetchImpl = async () => {
    fetchCalls += 1;
    return responseWith(fixtureHtml);
  };
  const times = [
    new Date("2026-08-06T12:00:00.000Z"),
    new Date("2026-08-06T12:00:01.000Z"),
    new Date("2026-08-06T12:01:00.000Z"),
    new Date("2026-08-06T12:01:01.000Z")
  ];
  const now = () => times.shift() || new Date("2026-08-06T12:01:01.000Z");

  const first = await extractProductFromUrl(PRODUCT_URL, { outputRoot, fetchImpl, now });
  const second = await extractProductFromUrl(PRODUCT_URL, { outputRoot, fetchImpl, now });

  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.equal(fetchCalls, 1);
  assert.equal(second.facts.product.name.value, first.facts.product.name.value);
});

test("rejects invalid product URLs before fetching", async () => {
  let fetchCalls = 0;
  await assert.rejects(
    extractProductFromUrl("https://example.com/product/not-street-kingz/", {
      fetchImpl: async () => {
        fetchCalls += 1;
        return responseWith(fixtureHtml);
      }
    }),
    (error) => error instanceof ProductPageExtractionError && error.code === "INVALID_URL"
  );
  assert.equal(fetchCalls, 0);
});

test("rejects missing or invalid product-page data", () => {
  assert.throws(
    () => extractProductPage("", PRODUCT_URL),
    (error) => error instanceof ProductPageExtractionError && error.code === "MISSING_PAGE_DATA"
  );
  assert.throws(
    () => extractProductPage("<html><body><h1>Not a product</h1></body></html>", PRODUCT_URL),
    (error) => error instanceof ProductPageExtractionError && error.code === "MISSING_PAGE_DATA"
  );
});

test("does not cache unsuccessful fetches", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "streetkingz-extraction-failure-"));
  await assert.rejects(
    extractProductFromUrl(PRODUCT_URL, {
      outputRoot,
      fetchImpl: async () => new Response("Not found", { status: 404 })
    }),
    /HTTP 404/
  );
});
