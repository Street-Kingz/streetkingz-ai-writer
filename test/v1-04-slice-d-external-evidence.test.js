import test from "node:test";
import assert from "node:assert/strict";
import {
  DATAFORSEO_KEYWORD_IDEAS_ENDPOINT, DATAFORSEO_SERP_ENDPOINT, EXTERNAL_LIMITS,
  createDataForSeoTransport, deriveDirectSeeds, normalizeKeywordResponse,
  normalizeSerpResponse, requestIdentity, ExternalEvidenceError, isReusable
} from "../product-kernel/externalEvidence.js";

const run = { business_id: "business-a", source_id: "source-a", run_id: 1, seed_id: 99 };

function response(status, body) { return { ok: status >= 200 && status < 300, status, async text() { return body; } }; }
function task(items = [], extra = {}) { return { status_code: 20000, tasks: [{ id: "task-1", status_code: 20000, cost: 0.002, result: [{ items, ...extra }] }] }; }

test("direct seeds use governed source priority, round robin, stable dedupe, and exact caps", () => {
  const seeds = deriveDirectSeeds({
    products: [{ id: "p2", name: "Beta" }, { id: "p1", name: "Alpha" }],
    categories: [{ id: "c1", name: "Category" }],
    pages: [{ id: "page-1", title: "Title", h1: ["Heading"] }],
    gscQueries: [{ id: "q1", query: "Query" }]
  });
  assert.deepEqual(seeds.map(seed => seed.source_class), ["woo_product", "woo_category", "site_title", "site_h1", "gsc_query"]);
  assert.equal(seeds.length, 5);
  assert.equal(seeds.every(seed => seed.locale === "GB" && seed.language_code === "en" && seed.direct_or_derived === "direct"), true);
  assert.equal(deriveDirectSeeds({ products: [{ id: "a", name: "Same" }], categories: [{ id: "b", name: "same" }] }).length, 1);
});

test("Keyword Ideas normalization preserves one parent and genuine zero demand", () => {
  const seed = { seed_id: "seed-1", source_text: "Alpha", normalized_text: "alpha" };
  const result = normalizeKeywordResponse(task([{ keyword: "alpha idea", keyword_info: { search_volume: 0, monthly_searches: [{ year: 2026, month: 8, search_volume: 0 }] } }, { keyword: "alpha idea", keyword_info: { search_volume: 4 } }, { keyword: "", keyword_info: { search_volume: 3 } }]), seed, run, "2026-09-03T10:00:00.000Z");
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].search_volume, 0);
  assert.equal(result.rows[0].seed_id, 99);
  assert.equal(result.rows[0].provenance.parent_seed_id, "seed-1");
  assert.equal(Object.hasOwn(result.rows[0], "keyword_difficulty"), false);
});

test("SERP normalization retains organic rows only and deduplicates exact results", () => {
  const seed = { seed_id: "seed-1", source_text: "Alpha", normalized_text: "alpha" };
  const result = normalizeSerpResponse(task([
    { type: "organic", rank_group: 1, rank_absolute: 1, url: "https://example.test/a", domain: "example.test", title: "A" },
    { type: "paid", rank_group: 1, rank_absolute: 1, url: "https://ads.test/a" },
    { type: "organic", rank_group: 1, rank_absolute: 1, url: "https://example.test/a", domain: "example.test", title: "A" }
  ]), seed, run, "2026-09-03T10:00:00.000Z");
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].device, "desktop");
});

test("transport is limited to approved HTTPS endpoints and sanitizes failures", async () => {
  let request;
  const transport = createDataForSeoTransport({ login: "login", password: "password", fetchImpl: async (url, options) => { request = { url: String(url), options }; return response(200, JSON.stringify(task([]))); } });
  await transport.post(DATAFORSEO_KEYWORD_IDEAS_ENDPOINT, [{ keywords: ["Alpha"], location_code: 2826, language_code: "en" }]);
  assert.equal(request.options.method, "POST");
  assert.match(request.options.headers.authorization, /^Basic /);
  assert.match(request.url, /api\.dataforseo\.com\/v3\/dataforseo_labs/);
  await assert.rejects(() => transport.post("/v3/other", []), error => error.code === "PROVIDER_ENDPOINT_INVALID");
  const failures = [400, 401, 403, 429, 500];
  for (const status of failures) await assert.rejects(() => createDataForSeoTransport({ login: "l", password: "p", fetchImpl: async () => response(status, "provider secret body") }).post(DATAFORSEO_SERP_ENDPOINT, []), error => error instanceof ExternalEvidenceError && !error.message.includes("provider secret"));
});

test("transport uses the caller's bounded remaining deadline and maps provider live timeout", async () => {
  let observedSignal;
  const slow = createDataForSeoTransport({ login: "login", password: "password", timeoutMs: 120000, fetchImpl: async (_url, options) => {
    observedSignal = options.signal;
    await new Promise(resolve => setTimeout(resolve, 25));
    return response(200, JSON.stringify(task([])));
  } });
  await slow.post(DATAFORSEO_SERP_ENDPOINT, [], { timeoutMs: 100 });
  assert.equal(observedSignal.aborted, false);
  const providerTimeout = JSON.stringify({ status_code: 20000, tasks: [{ status_code: 50401, cost: null, result: [] }] });
  const fast = createDataForSeoTransport({ login: "l", password: "p", fetchImpl: async () => response(200, providerTimeout) });
  const taskResult = await fast.post(DATAFORSEO_SERP_ENDPOINT, []);
  assert.throws(() => normalizeSerpResponse(taskResult.body, { seed_id: "seed-1", source_text: "Alpha", normalized_text: "alpha" }, run, "2026-09-03T10:00:00.000Z"), error => error.code === "PROVIDER_TIMEOUT" && error.details.actualCost === null);
});

test("request fingerprint changes with endpoint/seed scope and bounded cost is explicit", () => {
  const seed = { seed_id: "seed-1", normalized_text: "alpha" };
  const first = requestIdentity({ businessId: "business-a", endpoint: DATAFORSEO_KEYWORD_IDEAS_ENDPOINT, seed, limit: 20 });
  const second = requestIdentity({ businessId: "business-a", endpoint: DATAFORSEO_SERP_ENDPOINT, seed, depth: 10 });
  assert.notEqual(first, second);
  assert.equal(EXTERNAL_LIMITS.MAX_DIRECT_SEEDS_PER_BUSINESS_RUN, 5);
  assert.equal(EXTERNAL_LIMITS.MAX_PROVIDER_COST_USD_PER_RUN, 0.1);
  assert.equal(EXTERNAL_LIMITS.MAX_CONCURRENCY, 2);
});

test("freshness windows are source-specific", () => {
  const now = Date.parse("2026-09-03T00:00:00.000Z");
  const daysAgo = days => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(isReusable(daysAgo(6), DATAFORSEO_KEYWORD_IDEAS_ENDPOINT, now), true);
  assert.equal(isReusable(daysAgo(6), DATAFORSEO_SERP_ENDPOINT, now), true);
  assert.equal(isReusable(daysAgo(8), DATAFORSEO_KEYWORD_IDEAS_ENDPOINT, now), true);
  assert.equal(isReusable(daysAgo(8), DATAFORSEO_SERP_ENDPOINT, now), false);
  assert.equal(isReusable(daysAgo(31), DATAFORSEO_KEYWORD_IDEAS_ENDPOINT, now), false);
});
