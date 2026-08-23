import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { STREET_KINGZ_PRODUCTS } from "../../catalogue/products.js";
import { CLUSTERS, clusterForQuery, cleanKeywordItems, cleanGscRows, baselineAndTrend, validateEntityNames, diyQueryValid } from "./evidence-hygiene.js";

const raw = name => JSON.parse(fs.readFileSync(`artifacts/private/v1-01/progressive-004-fresh-evidence/raw/${name}`, "utf8"));
const mapped = STREET_KINGZ_PRODUCTS.map((p, i) => ({ ...p, primary_cluster: i === 14 ? "contact_washing" : undefined }));

test("off-intent Keyword Ideas terms are rejected with reasons", () => {
  const result = cleanKeywordItems({ status_code: 20000, tasks: [{ result: [{ items: [
    { keyword: "wheel paint", keyword_info: { search_volume: 100 } },
    { keyword: "snow foam lance", keyword_info: { search_volume: 100 } },
    { keyword: "paint protection film", keyword_info: { search_volume: 100 } }
  ] }] }] });
  assert.deepEqual(result.accepted.map(x => x.query), ["snow foam lance"]);
  assert.equal(result.rejected.length, 2);
  assert.ok(result.rejected.every(x => x.rejection_reason));
});

test("off-intent Search Console rows are excluded and branded evidence remains separate", () => {
  const rows = cleanGscRows({ rows: [
    { keys: ["graffiti stubby gun", "https://streetkingz.co.uk/product/stubby-gun-bundle/"] , clicks: 2, impressions: 30 },
    { keys: ["stubby pressure washer gun with foam cannon", "https://streetkingz.co.uk/product/stubby-gun-bundle/"] , clicks: 5, impressions: 81 },
    { keys: ["street kingz", "https://streetkingz.co.uk/"] , clicks: 2, impressions: 30 }
  ] }, [{ name: "Stubby Gun + Foam Lance Bundle", primary_cluster: "prewash_pressure", url: "https://streetkingz.co.uk/product/stubby-gun-bundle/" }], "365d");
  assert.equal(rows.accepted.length, 1);
  assert.equal(rows.rejected.length, 2);
  assert.equal(rows.rejected.find(x => x.branded).branded, true);
});

test("365-day baseline and 90-day trend windows are not summed", () => {
  const result = baselineAndTrend({ "365d": [{ cluster: "car_drying", clicks: 10, impressions: 100, branded: false, query: "car drying towel" }], latest90: [{ cluster: "car_drying", clicks: 4, impressions: 40, branded: false, query: "car drying towel" }], prior90: [{ cluster: "car_drying", clicks: 3, impressions: 30, branded: false, query: "car drying towel" }] });
  assert.equal(result.baseline_365d.car_drying.impressions, 100);
  assert.equal(result.trend_latest90.car_drying.impressions, 40);
  assert.equal(result.trend_prior90.car_drying.impressions, 30);
});

test("query relevance is customer-job specific", () => {
  assert.equal(clusterForQuery("wheel repair").accepted, false);
  assert.equal(clusterForQuery("car glass cleaner").cluster, "glass_cleaning");
  assert.equal(clusterForQuery("tyre foam").accepted, false);
  assert.equal(clusterForQuery("snow foam lance").cluster, "prewash_pressure");
  assert.equal(diyQueryValid("snow foam lance", "prewash_pressure"), true);
  assert.equal(diyQueryValid("tyre foam", "prewash_pressure"), false);
});

test("internal customer-job labels cannot become product or bundle names", () => {
  const invalid = validateEntityNames("Improve the pre-wash bundle");
  assert.equal(invalid.valid, false);
  const valid = validateEntityNames("Improve the Stubby Gun + Foam Lance Bundle");
  assert.equal(valid.valid, true);
  assert.equal(CLUSTERS.find(x => x[0] === "prewash_pressure")[1], "Pre-wash and pressure-washer equipment");
});

test("real captured Keyword Ideas and Search Console evidence are cleanable", () => {
  const keywords = cleanKeywordItems(raw("keyword-ideas.raw.json"));
  assert.equal(keywords.task_succeeded, true);
  assert.ok(keywords.rejected.length > 0);
  const gsc = cleanGscRows(raw("search-console-365d.raw.json"), mapped, "365d");
  assert.ok(gsc.accepted.length + gsc.rejected.length > 0);
});

test("previous progressive-005 artefacts remain present", () => {
  assert.ok(fs.existsSync("artifacts/validation/v1-01/attempts/progressive-005-decision-quality/strategic-decision-output.sanitised.json"));
});
