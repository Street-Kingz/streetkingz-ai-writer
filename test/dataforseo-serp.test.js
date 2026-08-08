import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDataForSeoClient, DataForSeoHttpError, DataForSeoTimeoutError } from "../research/clients/dataForSeo.js";
import { createDataForSeoSerpAdvancedProvider, selectSerpShortlist, DATAFORSEO_SERP_ADVANCED_ENDPOINT } from "../research/providers/dataForSeoSerpAdvanced.js";
import { runEvidenceEngine } from "../research/evidenceEngine.js";
import { createProductFactsProvider } from "../research/providers/productFacts.js";
import { renderEvidenceMarkdown } from "../research/renderers/evidence.js";
import { validateProvenance } from "../research/validation/evidence.js";

const FACTS_PATH = "artifacts/product-extraction/heavy-duty-drying-towel-1200gsm/2026-08-06T16-37-16-159Z/facts.json";
const BASE_EVIDENCE_PATH = "artifacts/evidence/heavy-duty-drying-towel-1200gsm/run_2026-08-06T17-03-47-035Z_b33edc2b/evidence.json";
const SERP_FIXTURE_PATH = "test/fixtures/dataforseo-serp-advanced.json";
const NOW = () => new Date("2026-08-08T07:00:00.000Z");

function headers(values = {}) {
  const map = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return { get: (name) => map.get(name.toLowerCase()) ?? null };
}

function response({ status = 200, body, responseHeaders = {} }) {
  return { ok: status >= 200 && status < 300, status, headers: headers(responseHeaders), async text() { return body; } };
}

function client(fetchImpl, maxCost = "0.05", timeout = "50") {
  return createDataForSeoClient({
    fetchImpl,
    env: { DATAFORSEO_LOGIN: "fixture-login", DATAFORSEO_PASSWORD: "fixture-password", DATAFORSEO_REQUEST_TIMEOUT_MS: timeout, DATAFORSEO_MAX_COST_USD: maxCost }
  });
}

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "streetkingz-serp-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function keywordRecord(id, keyword, volume, difficulty = 10) {
  return {
    evidence_id: id,
    evidence_type: "keyword_idea",
    value: { keyword, monthly_search_volume: volume, keyword_difficulty: difficulty, cpc_usd: 1, paid_competition_level: "HIGH" }
  };
}

async function keywordEvidencePath(t, records) {
  const directory = await temporaryDirectory(t);
  const base = JSON.parse(await readFile(BASE_EVIDENCE_PATH, "utf8"));
  base.records.push(...records);
  const filePath = path.join(directory, "keyword-evidence.json");
  await writeFile(filePath, `${JSON.stringify(base, null, 2)}\n`, "utf8");
  return filePath;
}

async function prepared(t, provider, records = [keywordRecord("kw_best", "best car drying towel", 2900, 8)]) {
  return provider.createRequest({
    productFactsPath: FACTS_PATH,
    evidenceArtifactPath: await keywordEvidencePath(t, records),
    scope: { market: "GB", language: "en-GB" },
    approval: { status: "approved", asserted_by: "test_user" }
  });
}

function fixtureForKeyword(raw, keyword, overrides = {}) {
  const data = JSON.parse(raw);
  data.tasks[0].id = `task-${keyword.replaceAll(" ", "-")}`;
  data.tasks[0].data = { keyword };
  data.tasks[0].result[0].keyword = keyword;
  Object.assign(data.tasks[0].result[0], overrides);
  return JSON.stringify(data);
}

test("shortlist selection is deterministic, bounded, and explains relevance and near-duplicates", async () => {
  const base = JSON.parse(await readFile(BASE_EVIDENCE_PATH, "utf8"));
  base.records.push(
    keywordRecord("kw_a", "microfiber towel for drying car", 5400, 8),
    keywordRecord("kw_b", "microfiber towels for car drying", 1600, 3),
    keywordRecord("kw_c", "best car drying towel", 2900, 0),
    keywordRecord("kw_d", "waffle weave car drying towel", 210, 0),
    keywordRecord("kw_e", "large drying towel for car", 70, 0),
    keywordRecord("kw_f", "car drying blade", 40, 0),
    keywordRecord("kw_g", "car wash soap", 49500, 0),
    keywordRecord("kw_h", "best automotive drying towel", 110, 0)
  );
  const first = selectSerpShortlist({ evidence: base, maximum: 5 });
  const second = selectSerpShortlist({ evidence: structuredClone(base), maximum: 5 });
  assert.deepEqual(second, first);
  assert.equal(first.selected.length, 5);
  assert.equal(first.decisions.find((item) => item.keyword === "car wash soap").reason.includes("no distinctive"), true);
  assert.match(first.decisions.find((item) => item.keyword === "microfiber towels for car drying").reason, /near-duplicate/);
  assert.ok(first.selected.every((item) => item.source_evidence_id));
});

test("normalises organic, PAA, related searches, and mixed SERP features with provenance", async (t) => {
  const raw = await readFile(SERP_FIXTURE_PATH, "utf8");
  let captured;
  const provider = createDataForSeoSerpAdvancedProvider({ client: client(async (url, options) => {
    captured = { url: String(url), body: JSON.parse(options.body) };
    return response({ body: raw, responseHeaders: { "x-ratelimit-remaining": "1999" } });
  }), maxKeywords: 1 });
  const result = await provider.run({ preparedRequest: await prepared(t, provider), cacheRoot: await temporaryDirectory(t), now: NOW });
  assert.equal(captured.url.endsWith(DATAFORSEO_SERP_ADVANCED_ENDPOINT), true);
  assert.deepEqual(captured.body[0], { keyword: "best car drying towel", location_code: 2840, language_code: "en", device: "desktop", os: "windows", depth: 10, tag: "kw_best" });
  assert.equal(result.records.filter((record) => record.evidence_type === "serp_organic_result").length, 1);
  assert.equal(result.records.filter((record) => record.evidence_type === "serp_people_also_ask").length, 2);
  assert.equal(result.records.filter((record) => record.evidence_type === "serp_related_search").length, 2);
  for (const type of ["serp_featured_snippet", "serp_video", "serp_images", "serp_discussion", "serp_product_element", "serp_ai_overview"]) {
    assert.ok(result.records.some((record) => record.evidence_type === type), type);
  }
  assert.deepEqual(result.result.unknown_item_types, ["experimental_widget"]);
  assert.match(result.result.warnings[0], /preserved in raw evidence/);
  assert.equal(result.result.cost.actual, 0.002);
  assert.equal(result.result.paid_requests, 1);
  for (const record of result.records) {
    assert.deepEqual(validateProvenance(record.provenance), []);
    assert.equal(record.provenance.source_task_id, "serp-task-fixture");
    assert.equal(record.provenance.query_seed, "best car drying towel");
    assert.match(record.provenance.locator.value, /^\/tasks\/0\/result\/0\/items\//);
  }
  assert.equal(await readFile(result.result.raw_artifacts[0].local_path, "utf8"), raw);
});

test("empty SERP completes and records unavailable evidence categories", async (t) => {
  const raw = await readFile(SERP_FIXTURE_PATH, "utf8");
  const body = fixtureForKeyword(raw, "best car drying towel", { items: [], item_types: [], items_count: 0 });
  const provider = createDataForSeoSerpAdvancedProvider({ client: client(async () => response({ body })), maxKeywords: 1 });
  const result = await provider.run({ preparedRequest: await prepared(t, provider), cacheRoot: await temporaryDirectory(t), now: NOW });
  assert.deepEqual(result.records, []);
  assert.equal(result.result.evidence_categories["best car drying towel"].organic_competitors, false);
});

test("malformed and task-level failures preserve raw responses", async (t) => {
  const malformed = "{not-json";
  const malformedProvider = createDataForSeoSerpAdvancedProvider({ client: client(async () => response({ body: malformed })), maxKeywords: 1 });
  const malformedPrepared = await prepared(t, malformedProvider);
  const malformedRoot = await temporaryDirectory(t);
  await assert.rejects(malformedProvider.run({ preparedRequest: malformedPrepared, cacheRoot: malformedRoot, now: NOW }), (error) => error.code === "MALFORMED_RESPONSE");
  const fingerprint = malformedProvider.keywordFingerprint(malformedPrepared.request, "best car drying towel");
  assert.equal(await readFile(path.join(malformedRoot, malformedProvider.id, "keywords", fingerprint, "raw", "response.json"), "utf8"), malformed);

  const failure = JSON.stringify({ status_code: 20000, tasks: [{ id: "failed", status_code: 40210, status_message: "Insufficient Funds.", cost: 0, result: [] }] });
  const failedProvider = createDataForSeoSerpAdvancedProvider({ client: client(async () => response({ body: failure })), maxKeywords: 1 });
  await assert.rejects(failedProvider.run({ preparedRequest: await prepared(t, failedProvider), cacheRoot: await temporaryDirectory(t), now: NOW }), (error) => error.code === "TASK_ERROR");
});

test("HTTP errors and timeouts propagate from the existing REST client", async (t) => {
  const httpProvider = createDataForSeoSerpAdvancedProvider({ client: client(async () => response({ status: 401, body: "unauthorized" })), maxKeywords: 1 });
  await assert.rejects(httpProvider.run({ preparedRequest: await prepared(t, httpProvider), cacheRoot: await temporaryDirectory(t), now: NOW }), DataForSeoHttpError);

  const timeoutClient = client((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))), "0.05", "5");
  const timeoutProvider = createDataForSeoSerpAdvancedProvider({ client: timeoutClient, maxKeywords: 1 });
  await assert.rejects(timeoutProvider.run({ preparedRequest: await prepared(t, timeoutProvider), cacheRoot: await temporaryDirectory(t), now: NOW }), DataForSeoTimeoutError);
});

test("per-keyword cache is deterministic and prevents repeat paid requests", async (t) => {
  const raw = await readFile(SERP_FIXTURE_PATH, "utf8");
  let calls = 0;
  const provider = createDataForSeoSerpAdvancedProvider({ client: client(async (_url, options) => {
    calls += 1;
    const keyword = JSON.parse(options.body)[0].keyword;
    return response({ body: fixtureForKeyword(raw, keyword) });
  }), maxKeywords: 2 });
  const preparedRequest = await prepared(t, provider, [
    keywordRecord("kw_a", "best car drying towel", 2900, 0),
    keywordRecord("kw_b", "waffle weave car drying towel", 210, 0)
  ]);
  const cacheRoot = await temporaryDirectory(t);
  const first = await provider.run({ preparedRequest, cacheRoot, now: NOW });
  const second = await provider.run({ preparedRequest, cacheRoot, now: NOW });
  assert.equal(calls, 2);
  assert.equal(first.result.cache.misses, 2);
  assert.equal(second.result.cache.hits, 2);
  assert.equal(second.result.cache.hit, true);
  assert.equal(second.result.paid_requests, 0);
  assert.equal(second.result.cost.additional, 0);
  assert.deepEqual(second.records.map((record) => record.evidence_id), first.records.map((record) => record.evidence_id));
  assert.equal(provider.requestFingerprint(preparedRequest.request), provider.requestFingerprint(preparedRequest.request));
  const changed = structuredClone(preparedRequest.request);
  changed.parameters.device = "mobile";
  assert.notEqual(provider.keywordFingerprint(changed, "best car drying towel"), provider.keywordFingerprint(preparedRequest.request, "best car drying towel"));
});

test("cost ceiling stops all cache misses before transport", async (t) => {
  let calls = 0;
  const provider = createDataForSeoSerpAdvancedProvider({ client: client(async () => { calls += 1; return response({ body: "{}" }); }), maxKeywords: 5, maxCostUsd: 0.009 });
  const records = [1, 2, 3, 4, 5].map((number) => keywordRecord(`kw_${number}`, `${number} drying towel for car`, 100 - number, number));
  await assert.rejects(provider.run({ preparedRequest: await prepared(t, provider, records), cacheRoot: await temporaryDirectory(t), now: NOW }), (error) => error.code === "COST_LIMIT");
  assert.equal(calls, 0);
});

test("mixed Product Facts, Keyword Ideas and SERP evidence render deterministically", async (t) => {
  const raw = await readFile(SERP_FIXTURE_PATH, "utf8");
  const keywordEvidence = await keywordEvidencePath(t, [keywordRecord("kw_best", "best car drying towel", 2900, 8)]);
  const provider = createDataForSeoSerpAdvancedProvider({ client: client(async () => response({ body: raw })), maxKeywords: 1 });
  const run = await runEvidenceEngine({ productFactsPath: FACTS_PATH, evidenceArtifactPath: keywordEvidence, approvedBy: "test_user", providers: [createProductFactsProvider(), provider], outputRoot: await temporaryDirectory(t), now: NOW });
  const keywordRecordForRender = { ...keywordRecord("kw_best", "best car drying towel", 2900, 8), confidence: { score: 0.8 }, provenance: { source_record_id: "keyword:best" }, query_or_question: "best car drying towel" };
  const combined = { ...run.evidence, records: [...run.evidence.records, keywordRecordForRender] };
  const first = renderEvidenceMarkdown(combined, { ...run.coverage, usable_record_count: combined.records.length });
  const second = renderEvidenceMarkdown({ ...combined, records: [...combined.records].reverse() }, { ...run.coverage, usable_record_count: combined.records.length });
  assert.equal(second, first);
  assert.match(first, /## Keyword Idea/);
  assert.match(first, /## Serp Organic Result/);
  assert.match(first, /Car Drying Towels Tested/);
  assert.match(first, /What towel is best for drying a car\?/);
  assert.match(first, /large car drying towel/);
  assert.match(first, /## name/);
});
