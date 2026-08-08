import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createGoogleSearchConsoleClient,
  SearchConsoleAuthenticationError,
  SearchConsoleConfigurationError,
  SearchConsoleHttpError,
  SearchConsoleTimeoutError
} from "../research/clients/googleSearchConsole.js";
import {
  buildSearchConsoleJoinTargets,
  createGoogleSearchConsoleProvider,
  joinSearchConsoleRow,
  resolveSearchConsoleDateRange
} from "../research/providers/googleSearchConsole.js";
import { runEvidenceEngine } from "../research/evidenceEngine.js";
import { createProductFactsProvider } from "../research/providers/productFacts.js";
import { renderEvidenceMarkdown } from "../research/renderers/evidence.js";
import { validateProvenance } from "../research/validation/evidence.js";

const FACTS_PATH = "artifacts/product-extraction/heavy-duty-drying-towel-1200gsm/2026-08-06T16-37-16-159Z/facts.json";
const BASE_EVIDENCE_PATH = "artifacts/evidence/heavy-duty-drying-towel-1200gsm/run_2026-08-06T17-03-47-035Z_b33edc2b/evidence.json";
const FIXTURE_PATH = "test/fixtures/google-search-console.json";
const NOW = () => new Date("2026-08-08T12:00:00.000Z");
const SITE = "sc-domain:streetkingz.co.uk";

function headers() { return { get: () => null }; }
function response(status, body) { return { ok: status >= 200 && status < 300, status, headers: headers(), async text() { return body; } }; }
function env(overrides = {}) {
  return {
    GOOGLE_SEARCH_CONSOLE_SITE_URL: SITE,
    GOOGLE_SEARCH_CONSOLE_CLIENT_ID: "fixture-client-id",
    GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET: "fixture-client-secret",
    GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN: "fixture-refresh-token",
    GOOGLE_SEARCH_CONSOLE_REQUEST_TIMEOUT_MS: "50",
    ...overrides
  };
}

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "search-console-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function evidencePath(t) {
  const base = JSON.parse(await readFile(BASE_EVIDENCE_PATH, "utf8"));
  base.records.push(
    { evidence_id: "kw_best", provider_id: "dataforseo_keyword_ideas", evidence_type: "keyword_idea", query_or_question: "best car drying towel", value: { keyword: "best car drying towel" } },
    { evidence_id: "serp_microfibre", provider_id: "dataforseo_google_organic_serp_advanced", evidence_type: "serp_organic_result", query_or_question: "microfiber towel for drying car", value: { keyword: "microfiber towel for drying car" } }
  );
  const directory = await temporaryDirectory(t);
  const filePath = path.join(directory, "evidence.json");
  await writeFile(filePath, `${JSON.stringify(base, null, 2)}\n`, "utf8");
  return filePath;
}

async function fixtureClient() {
  const fixture = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  let calls = 0;
  return {
    config: { siteUrl: SITE, timeoutMs: 50 },
    get calls() { return calls; },
    async querySearchAnalytics(body) {
      calls += 1;
      const key = body.dimensions.join("_");
      return { status: 200, rawBody: JSON.stringify(fixture[key]) };
    }
  };
}

async function prepared(t, provider) {
  return provider.createRequest({ productFactsPath: FACTS_PATH, evidenceArtifactPath: await evidencePath(t), scope: { market: "GB", language: "en-GB" }, approval: { status: "approved", asserted_by: "test_user" } });
}

test("validates OAuth configuration without exposing secrets", () => {
  assert.throws(() => createGoogleSearchConsoleClient({ env: {}, fetchImpl: async () => {} }), SearchConsoleConfigurationError);
  const client = createGoogleSearchConsoleClient({ env: env(), fetchImpl: async () => response(200, "{}") });
  assert.deepEqual(client.config, { siteUrl: SITE, timeoutMs: 50 });
  assert.equal(JSON.stringify(client).includes("fixture-refresh-token"), false);
});

test("uses a deterministic finalized 90-day default or an explicit date range", () => {
  assert.deepEqual(resolveSearchConsoleDateRange({ now: NOW }), { startDate: "2026-05-08", endDate: "2026-08-05" });
  assert.deepEqual(resolveSearchConsoleDateRange({ startDate: "2026-01-01", endDate: "2026-03-31" }), { startDate: "2026-01-01", endDate: "2026-03-31" });
  assert.throws(() => resolveSearchConsoleDateRange({ startDate: "2026-01-01" }), SearchConsoleConfigurationError);
});

test("normalises query, page, and query-page evidence including zero-click visibility", async (t) => {
  const client = await fixtureClient();
  const provider = createGoogleSearchConsoleProvider({ client, now: NOW });
  const result = await provider.run({ preparedRequest: await prepared(t, provider), cacheRoot: await temporaryDirectory(t), now: NOW });
  assert.equal(client.calls, 3);
  assert.deepEqual(result.result.evidence_type_counts, {
    search_console_query_performance: 3,
    search_console_page_performance: 2,
    search_console_query_page_performance: 3
  });
  const zeroClick = result.records.find((record) => record.evidence_type === "search_console_query_performance" && record.value.query === "best car drying towel");
  assert.equal(zeroClick.value.clicks, 0);
  assert.equal(zeroClick.value.impressions, 1200);
  assert.equal(zeroClick.value.average_position, 11.4);
  assert.ok(zeroClick.value.keyword_relationships.some((relationship) => relationship.method === "normalised_exact"));
  const productPage = result.records.find((record) => record.evidence_type === "search_console_page_performance" && record.value.page.includes("heavy-duty"));
  assert.ok(productPage.value.page_relationships.some((relationship) => relationship.method === "canonical_url_exact"));
  const unmatched = result.records.find((record) => record.value.query === "unmatched detailing query");
  assert.deepEqual(unmatched.value.keyword_relationships, []);
  assert.deepEqual(unmatched.value.page_relationships, []);
  assert.equal(result.result.relationship_counts.unmatched_records > 0, true);
  for (const record of result.records) {
    assert.deepEqual(validateProvenance(record.provenance), []);
    assert.deepEqual(record.provenance.requested_date_range, { start_date: "2026-05-08", end_date: "2026-08-05" });
    assert.equal(record.provenance.search_console_property, SITE);
  }
});

test("deterministic joins cover phrase/token relationships and relevant site pages", async (t) => {
  const evidence = JSON.parse(await readFile(await evidencePath(t), "utf8"));
  const targets = buildSearchConsoleJoinTargets(evidence);
  const joins = joinSearchConsoleRow({ query: "best microfibre car drying towel", page: "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/?ref=gsc", targets });
  assert.ok(joins.keyword_relationships.some((relationship) => ["normalised_phrase", "token_containment_75"].includes(relationship.method)));
  assert.ok(joins.page_relationships.some((relationship) => relationship.method === "canonical_url_exact"));
  assert.deepEqual(joinSearchConsoleRow({ query: "ceramic coating", page: "https://streetkingz.co.uk/blog/unmatched/", targets }), { keyword_relationships: [], page_relationships: [] });
});

test("raw responses are unchanged, evidence IDs stable, and cache prevents another API request", async (t) => {
  const client = await fixtureClient();
  const provider = createGoogleSearchConsoleProvider({ client, now: NOW });
  const preparedRequest = await prepared(t, provider);
  const cacheRoot = await temporaryDirectory(t);
  const first = await provider.run({ preparedRequest, cacheRoot, now: NOW });
  const second = await provider.run({ preparedRequest, cacheRoot, now: NOW });
  assert.equal(client.calls, 3);
  assert.equal(first.result.cache.hit, false);
  assert.equal(second.result.cache.hit, true);
  assert.equal(second.result.api_requests, 0);
  assert.deepEqual(second.records.map((record) => record.evidence_id), first.records.map((record) => record.evidence_id));
  const fixture = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  for (const raw of first.result.raw_artifacts) {
    const dimensionKey = raw.local_path.includes("query_page") ? "query_page" : raw.local_path.includes("/query/") ? "query" : "page";
    assert.equal(await readFile(raw.local_path, "utf8"), JSON.stringify(fixture[dimensionKey]));
  }
});

test("zero-result responses complete and pagination respects row limits", async (t) => {
  let calls = 0;
  const client = {
    config: { siteUrl: SITE, timeoutMs: 50 },
    async querySearchAnalytics(body) {
      calls += 1;
      const rows = body.startRow === 0 ? [
        { keys: body.dimensions.map((dimension) => dimension === "query" ? `query-${body.startRow}` : `https://example.com/${body.startRow}`), clicks: 1, impressions: 2, ctr: 0.5, position: 3 },
        { keys: body.dimensions.map((dimension) => dimension === "query" ? `query-${body.startRow + 1}` : `https://example.com/${body.startRow + 1}`), clicks: 0, impressions: 2, ctr: 0, position: 4 }
      ] : [];
      return { status: 200, rawBody: JSON.stringify({ rows }) };
    }
  };
  const provider = createGoogleSearchConsoleProvider({ client, now: NOW, rowLimit: 2, maxRowsPerDimension: 4 });
  const result = await provider.run({ preparedRequest: await prepared(t, provider), cacheRoot: await temporaryDirectory(t), now: NOW });
  assert.equal(calls, 6);
  assert.equal(result.records.length, 6);

  const zeroClient = { config: { siteUrl: SITE }, async querySearchAnalytics() { return { status: 200, rawBody: "{}" }; } };
  const zeroProvider = createGoogleSearchConsoleProvider({ client: zeroClient, now: NOW });
  const zero = await zeroProvider.run({ preparedRequest: await prepared(t, zeroProvider), cacheRoot: await temporaryDirectory(t), now: NOW });
  assert.equal(zero.result.rows_returned, 0);
  assert.deepEqual(zero.records, []);
});

test("OAuth, API, malformed response, and timeout errors are classified", async (t) => {
  const authClient = createGoogleSearchConsoleClient({ env: env(), fetchImpl: async () => response(400, JSON.stringify({ error: "invalid_grant" })) });
  await assert.rejects(authClient.querySearchAnalytics({}), SearchConsoleAuthenticationError);

  let calls = 0;
  const httpClient = createGoogleSearchConsoleClient({ env: env(), fetchImpl: async () => {
    calls += 1;
    return calls === 1 ? response(200, JSON.stringify({ access_token: "token" })) : response(403, JSON.stringify({ error: { message: "forbidden" } }));
  } });
  await assert.rejects(httpClient.querySearchAnalytics({}), SearchConsoleHttpError);

  const malformedClient = { config: { siteUrl: SITE }, async querySearchAnalytics() { return { status: 200, rawBody: "{bad-json" }; } };
  const malformedProvider = createGoogleSearchConsoleProvider({ client: malformedClient, now: NOW });
  const malformedPrepared = await prepared(t, malformedProvider);
  const malformedRoot = await temporaryDirectory(t);
  await assert.rejects(malformedProvider.run({ preparedRequest: malformedPrepared, cacheRoot: malformedRoot, now: NOW }), (error) => error.code === "MALFORMED_RESPONSE" && error.providerMetadata.rawArtifacts.length === 1);

  const timeoutClient = createGoogleSearchConsoleClient({ env: env({ GOOGLE_SEARCH_CONSOLE_REQUEST_TIMEOUT_MS: "5" }), fetchImpl: (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))) });
  await assert.rejects(timeoutClient.querySearchAnalytics({}), SearchConsoleTimeoutError);
});

test("Search Console failure is isolated and descriptive coverage preserves other evidence", async (t) => {
  const failed = createGoogleSearchConsoleProvider({ client: { config: { siteUrl: SITE }, async querySearchAnalytics() { throw new Error("unavailable"); } }, now: NOW });
  const run = await runEvidenceEngine({ productFactsPath: FACTS_PATH, evidenceArtifactPath: await evidencePath(t), approvedBy: "test_user", providers: [createProductFactsProvider(), failed], outputRoot: await temporaryDirectory(t), now: NOW });
  assert.equal(run.coverage.status, "partial");
  assert.equal(run.coverage.evidence_categories.product_truth.available, true);
  assert.equal(run.coverage.evidence_categories.first_party_search_console_evidence.available, false);
  assert.ok(run.evidence.records.every((record) => record.provider_id === "product_facts"));
});

test("mixed Product Facts, Keyword Ideas, SERP, and Search Console evidence renders deterministically", async (t) => {
  const client = await fixtureClient();
  const provider = createGoogleSearchConsoleProvider({ client, now: NOW });
  const preparedRequest = await prepared(t, provider);
  const result = await provider.run({ preparedRequest, cacheRoot: await temporaryDirectory(t), now: NOW });
  const base = preparedRequest.evidence;
  const records = [...base.records, ...result.records].map((record) => {
    if (record.confidence && record.provenance) return record;
    return { ...record, confidence: { score: 0.8 }, provenance: { source_record_id: record.evidence_id } };
  });
  const evidence = { ...base, records };
  const coverage = { status: "complete", usable_record_count: records.length, provider_statuses: [{ provider_id: "product_facts", status: "complete" }, { provider_id: "dataforseo_keyword_ideas", status: "complete" }, { provider_id: "dataforseo_google_organic_serp_advanced", status: "complete" }, { provider_id: "google_search_console", status: "complete" }] };
  const first = renderEvidenceMarkdown(evidence, coverage);
  const second = renderEvidenceMarkdown({ ...evidence, records: [...records].reverse() }, coverage);
  assert.equal(second, first);
  assert.match(first, /## Search Console Query Performance/);
  assert.match(first, /best car drying towel → https:\/\/streetkingz\.co\.uk/);
});
