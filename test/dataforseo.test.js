import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createDataForSeoClient,
  DataForSeoConfigurationError,
  DataForSeoHttpError,
  DataForSeoTimeoutError
} from "../research/clients/dataForSeo.js";
import { createDataForSeoKeywordIdeasProvider } from "../research/providers/dataForSeoKeywordIdeas.js";
import { runEvidenceEngine } from "../research/evidenceEngine.js";
import { createProductFactsProvider } from "../research/providers/productFacts.js";
import { validateProvenance } from "../research/validation/evidence.js";

const FACTS_PATH = "artifacts/product-extraction/heavy-duty-drying-towel-1200gsm/2026-08-06T16-37-16-159Z/facts.json";
const EVIDENCE_PATH = "artifacts/evidence/heavy-duty-drying-towel-1200gsm/run_2026-08-06T17-03-47-035Z_b33edc2b/evidence.json";
const FIXTURE_PATH = "test/fixtures/dataforseo-keyword-ideas.json";
const NOW = () => new Date("2026-08-06T18:00:00.000Z");

function headers(values = {}) {
  const normalised = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return { get: (name) => normalised.get(name.toLowerCase()) ?? null };
}

function response({ status = 200, body, responseHeaders = {} }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headers(responseHeaders),
    async text() { return body; }
  };
}

function configuredClient(fetchImpl, overrides = {}) {
  return createDataForSeoClient({
    fetchImpl,
    env: {
      DATAFORSEO_LOGIN: "fixture-login",
      DATAFORSEO_PASSWORD: "fixture-password",
      DATAFORSEO_REQUEST_TIMEOUT_MS: "50",
      DATAFORSEO_MAX_COST_USD: "0.05",
      ...overrides
    }
  });
}

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "streetkingz-dataforseo-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function preparedProvider(provider) {
  return provider.createRequest({
    productFactsPath: FACTS_PATH,
    evidenceArtifactPath: EVIDENCE_PATH,
    scope: { market: "GB", language: "en-GB" },
    approval: { status: "approved", asserted_by: "test_user" }
  });
}

test("authentication configuration is required and never exposed by the client", () => {
  assert.throws(() => createDataForSeoClient({ env: {}, fetchImpl: async () => {} }), DataForSeoConfigurationError);
  const client = configuredClient(async () => response({ body: "{}" }));
  assert.deepEqual(client.config, { timeoutMs: 50, maxCostUsd: 0.05 });
  assert.equal(JSON.stringify(client).includes("fixture-password"), false);
});

test("successful request normalises keyword metrics, rate limits, cost, and provenance", async (t) => {
  const raw = await readFile(FIXTURE_PATH, "utf8");
  let capturedRequest;
  const client = configuredClient(async (url, options) => {
    capturedRequest = { url: String(url), options };
    return response({
      body: raw,
      responseHeaders: { "x-ratelimit-limit": "2000", "x-ratelimit-remaining": "1999" }
    });
  });
  const provider = createDataForSeoKeywordIdeasProvider({ client });
  const preparedRequest = await preparedProvider(provider);
  const result = await provider.run({ preparedRequest, cacheRoot: await temporaryDirectory(t), now: NOW });

  assert.equal(result.records.length, 2);
  assert.deepEqual(preparedRequest.request.seeds.map((seed) => seed.text), [
    "heavy duty drying towel 1200gsm",
    "microfibre car drying towel"
  ]);
  assert.deepEqual(JSON.parse(capturedRequest.options.body)[0].order_by, ["relevance,desc", "keyword_info.search_volume,desc"]);
  assert.equal(capturedRequest.options.headers.authorization.startsWith("Basic "), true);
  assert.equal(JSON.stringify(result).includes("fixture-password"), false);
  assert.equal(result.records[0].seed_ids.length, 2);
  assert.equal(result.records.find((record) => record.value.keyword === "car drying towel").value.monthly_search_volume, 1900);
  assert.equal(result.records.find((record) => record.value.keyword === "car drying towel").value.keyword_difficulty, 31);
  assert.deepEqual(result.result.rate_limit, { limit_per_minute: 2000, remaining: 1999 });
  assert.deepEqual(result.result.cost, {
    currency: "USD",
    actual: 0.0103,
    configured_maximum: 0.05,
    deterministic_request_maximum: 0.024,
    response_total: 0.0103
  });
  for (const record of result.records) {
    assert.deepEqual(validateProvenance(record.provenance), []);
    assert.match(record.provenance.locator.value, /^\/tasks\/0\/result\/0\/items\//);
  }
  assert.equal(await readFile(result.result.raw_artifacts[0].local_path, "utf8"), raw);
});

test("cache reuse is deterministic and makes no second API request", async (t) => {
  const raw = await readFile(FIXTURE_PATH, "utf8");
  let calls = 0;
  const client = configuredClient(async () => {
    calls += 1;
    return response({ body: raw });
  });
  const provider = createDataForSeoKeywordIdeasProvider({ client });
  const preparedRequest = await preparedProvider(provider);
  const cacheRoot = await temporaryDirectory(t);
  const first = await provider.run({ preparedRequest, cacheRoot, now: NOW });
  const second = await provider.run({ preparedRequest, cacheRoot, now: NOW });
  assert.equal(calls, 1);
  assert.equal(first.result.cache.hit, false);
  assert.equal(second.result.cache.hit, true);
  assert.deepEqual(second.records, first.records);
  assert.deepEqual(second.records.map((record) => record.evidence_id), first.records.map((record) => record.evidence_id));
  assert.equal(provider.requestFingerprint(preparedRequest.request), provider.requestFingerprint(preparedRequest.request));
  const changedLocation = structuredClone(preparedRequest.request);
  changedLocation.parameters.location_code = 2826;
  const changedLanguage = structuredClone(preparedRequest.request);
  changedLanguage.parameters.language_code = "cy";
  const changedEndpoint = structuredClone(preparedRequest.request);
  changedEndpoint.endpoint = "/v3/different/live";
  assert.notEqual(provider.requestFingerprint(changedLocation), provider.requestFingerprint(preparedRequest.request));
  assert.notEqual(provider.requestFingerprint(changedLanguage), provider.requestFingerprint(preparedRequest.request));
  assert.notEqual(provider.requestFingerprint(changedEndpoint), provider.requestFingerprint(preparedRequest.request));
});

test("task-level errors preserve raw response and do not produce normalised evidence", async (t) => {
  const body = JSON.stringify({
    status_code: 20000,
    tasks: [{ id: "failed-task", status_code: 40210, status_message: "Insufficient Funds.", cost: 0, result: [] }]
  });
  const provider = createDataForSeoKeywordIdeasProvider({ client: configuredClient(async () => response({ body })) });
  const preparedRequest = await preparedProvider(provider);
  const cacheRoot = await temporaryDirectory(t);
  await assert.rejects(provider.run({ preparedRequest, cacheRoot, now: NOW }), (error) => error.code === "TASK_ERROR");
  const fingerprint = provider.requestFingerprint(preparedRequest.request);
  assert.equal(await readFile(path.join(cacheRoot, provider.id, fingerprint, "raw", "response.json"), "utf8"), body);
});

test("a DataForSEO task failure preserves existing product-facts evidence", async (t) => {
  const body = JSON.stringify({
    status_code: 20000,
    tasks: [{ id: "failed-task", status_code: 50301, status_message: "Service unavailable.", cost: 0, result: [] }]
  });
  const dataForSeoProvider = createDataForSeoKeywordIdeasProvider({
    client: configuredClient(async () => response({ body }))
  });
  const result = await runEvidenceEngine({
    productFactsPath: FACTS_PATH,
    evidenceArtifactPath: EVIDENCE_PATH,
    approvedBy: "test_user",
    providers: [createProductFactsProvider(), dataForSeoProvider],
    outputRoot: await temporaryDirectory(t),
    now: NOW
  });
  assert.equal(result.coverage.status, "partial");
  assert.equal(result.evidence.records.length, 62);
  assert.ok(result.evidence.records.every((record) => record.provider_id === "product_facts"));
  assert.equal(result.providerResults[1].status, "failed");
  assert.equal(result.providerResults[1].raw_artifacts.length, 1);
});

test("HTTP errors and malformed responses are classified", async (t) => {
  const httpClient = configuredClient(async () => response({
    status: 401,
    body: "unauthorized",
    responseHeaders: { "x-ratelimit-remaining": "0" }
  }));
  await assert.rejects(httpClient.post("/test", [{}]), (error) =>
    error instanceof DataForSeoHttpError && error.status === 401 && error.rateLimit.remaining === 0
  );

  const malformedProvider = createDataForSeoKeywordIdeasProvider({
    client: configuredClient(async () => response({ body: "{not-json" }))
  });
  const preparedRequest = await preparedProvider(malformedProvider);
  await assert.rejects(
    malformedProvider.run({ preparedRequest, cacheRoot: await temporaryDirectory(t), now: NOW }),
    (error) => error.code === "MALFORMED_RESPONSE"
  );
});

test("request timeout aborts safely", async () => {
  const client = configuredClient((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
  }), { DATAFORSEO_REQUEST_TIMEOUT_MS: "5" });
  await assert.rejects(client.post("/test", [{}]), DataForSeoTimeoutError);
});

test("zero-result responses complete with no records", async (t) => {
  const body = JSON.stringify({
    status_code: 20000,
    status_message: "Ok.",
    cost: 0.0103,
    tasks: [{
      id: "zero-task",
      status_code: 20000,
      status_message: "Ok.",
      cost: 0.0103,
      result_count: 1,
      result: [{ items_count: 0, total_count: 0, items: [] }]
    }]
  });
  const provider = createDataForSeoKeywordIdeasProvider({ client: configuredClient(async () => response({ body })) });
  const result = await provider.run({
    preparedRequest: await preparedProvider(provider),
    cacheRoot: await temporaryDirectory(t),
    now: NOW
  });
  assert.equal(result.result.status, "complete");
  assert.deepEqual(result.records, []);
  assert.equal(result.result.cost.actual, 0.0103);
});

test("configured cost ceiling fails before a request where deterministically possible", async (t) => {
  let called = false;
  const client = configuredClient(async () => { called = true; return response({ body: "{}" }); });
  const provider = createDataForSeoKeywordIdeasProvider({ client, maxCostUsd: 0.01 });
  await assert.rejects(
    provider.run({ preparedRequest: await preparedProvider(provider), cacheRoot: await temporaryDirectory(t), now: NOW }),
    (error) => error.code === "COST_LIMIT"
  );
  assert.equal(called, false);
});
