import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { STREET_KINGZ_PRODUCTS } from "../../catalogue/products.js";
import { buildPageAttribution, PREWASH_PRODUCTS, selectTarget } from "./target-attribution.js";

const raw = window => JSON.parse(fs.readFileSync(`artifacts/private/v1-01/progressive-004-fresh-evidence/raw/search-console-${window}.raw.json`));
const destinations = Object.fromEntries(JSON.parse(fs.readFileSync("artifacts/validation/v1-01/attempts/progressive-005-decision-quality/product-evidence-matrix.sanitised.json")).products.map(product => [product.url, product.destination]));

test("page attribution keeps the three catalogue entities distinct", () => {
  const result = buildPageAttribution({ rawByWindow: { "365d": raw("365d"), latest90: raw("latest90"), prior90: raw("prior90") }, destinations });
  assert.deepEqual(result.pages.map(page => page.name), PREWASH_PRODUCTS.map(page => page.name));
  assert.equal(result.pages.length, 3);
});

test("cluster totals cannot be attributed to one page", () => {
  const result = buildPageAttribution({ rawByWindow: { "365d": raw("365d"), latest90: raw("latest90"), prior90: raw("prior90") }, destinations });
  const total = result.pages.reduce((n, page) => n + page.baseline.clicks, 0);
  assert.ok(total >= 5);
  assert.equal(result.pages.find(page => page.name === "Stubby Gun & Nozzle Set").baseline.clicks, 0);
  assert.equal(result.pages.find(page => page.name === "Snow Foam Lance").baseline.clicks, 0);
});

test("catalogue order cannot select the target", () => {
  const result = buildPageAttribution({ rawByWindow: { "365d": raw("365d"), latest90: raw("latest90"), prior90: raw("prior90") }, destinations });
  const selected = selectTarget(result);
  assert.equal(selected.target.name, "Stubby Gun + Foam Lance Bundle");
});

test("overlapping windows remain separate and exact intent supports the bundle", () => {
  const result = buildPageAttribution({ rawByWindow: { "365d": raw("365d"), latest90: raw("latest90"), prior90: raw("prior90") }, destinations });
  const bundle = result.pages.find(page => page.name === "Stubby Gun + Foam Lance Bundle");
  assert.equal(bundle.baseline.clicks, 6);
  assert.equal(bundle.baseline.impressions, 176);
  assert.equal(bundle.latest90.clicks, 6);
  assert.equal(bundle.prior90.clicks, 0);
  assert.ok(bundle.baseline.rows.some(row => row.query === "stubby pressure washer gun with foam cannon" && row.intent === "combined gun-and-foam"));
});

test("no live write is available in the attribution module", () => {
  const source = fs.readFileSync("validation/v1-01/target-attribution.js", "utf8");
  assert.doesNotMatch(source, /fetch\s*\([^)]*method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)/i);
});

test("progressive-006 remains present", () => {
  assert.ok(fs.existsSync("artifacts/validation/v1-01/attempts/progressive-006-evidence-hygiene/storewide-recommendations.md"));
});
