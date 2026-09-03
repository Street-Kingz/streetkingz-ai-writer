import test from "node:test";
import assert from "node:assert/strict";
import { acquireB2SearchAnalytics, acquireSearchAnalyticsGrain, b2DateRanges, normalizeSearchAnalyticsRow, pageWithinBoundary, SEARCH_ANALYTICS_ROW_LIMIT } from "../product-kernel/googleSearchConsoleEvidence.js";
import { createGscTransport } from "../product-kernel/googleSearchConsoleOAuth.js";

const PROPERTY = "https://streetkingz.co.uk/";
const NOW = () => new Date("2026-09-03T12:00:00.000Z");
const row = (keys, values = {}) => ({ keys, clicks: 1, impressions: 2, ctr: 0.5, position: 3, ...values });

test("B2 requests two finalized horizons and four separate grains", async () => {
  const calls = [];
  const transport = { async searchAnalytics(_token, site, body) { calls.push({ site, body }); return { rows: body.dimensions[0] === "date" ? [row(["2026-09-03"])] : [row(body.dimensions.map(d => d === "query" ? "synthetic query" : "https://streetkingz.co.uk/product/one/"))] }; } };
  const result = await acquireB2SearchAnalytics({ transport, accessToken: "memory-only", property: PROPERTY, now: NOW, limits: { rowLimit: 10, maxRequests: 2 } });
  assert.equal(calls.length, 4);
  assert.deepEqual(calls.map(call => call.body.dimensions), [["date"], ["query"], ["page"], ["query", "page"]]);
  assert.ok(calls.every(call => call.site === PROPERTY && call.body.dataState === "final" && call.body.rowLimit === 10));
  assert.deepEqual(result.ranges, { trend: { startDate: "2025-09-04", endDate: "2026-09-03" }, detail: { startDate: "2026-06-06", endDate: "2026-09-03" } });
});

test("trend rows validate date and preserve actual finalized date; detailed rows are provider-limited", async () => {
  const counters = { total: 0 };
  const trend = await acquireSearchAnalyticsGrain({ transport: { async searchAnalytics() { return { rows: [row(["2026-01-02"], { clicks: 0 })] }; } }, accessToken: "x", property: PROPERTY, grain: "trend", request: { startDate: "2026-01-01", endDate: "2026-01-31" }, counters, rowLimit: 10, maxRequests: 2 });
  assert.equal(trend.completeness, "complete"); assert.equal(trend.latest_observed_date, "2026-01-02"); assert.equal(trend.rows[0].clicks, 0);
  const detail = await acquireSearchAnalyticsGrain({ transport: { async searchAnalytics() { return { rows: [row(["q"]) ] }; } }, accessToken: "x", property: PROPERTY, grain: "query", request: { startDate: "2026-01-01", endDate: "2026-01-31" }, counters: { total: 0 }, rowLimit: 10, maxRequests: 2 });
  assert.equal(detail.completeness, "provider_limited"); assert.deepEqual(detail.limitations, ["provider_limited"]);
});

test("pagination advances startRow, stops at provider end, deduplicates overlaps, and reports caps", async () => {
  const calls = [];
  const transport = { async searchAnalytics(_token, _property, body) { calls.push(body); return { rows: body.startRow === 0 ? [row(["q1"]), row(["q2"])] : [row(["q2"]), row(["q3"])] }; } };
  const result = await acquireSearchAnalyticsGrain({ transport, accessToken: "x", property: PROPERTY, grain: "query", request: { startDate: "2026-01-01", endDate: "2026-01-31" }, counters: { total: 0 }, rowLimit: 2, maxRows: 3, maxRequests: 4 });
  assert.deepEqual(calls.map(call => call.startRow), [0, 2]); assert.equal(result.rows.length, 3); assert.equal(result.cap_hit, true); assert.ok(result.limitations.includes("implementation_cap_reached"));
});

test("empty responses are honest and do not manufacture evidence dates", async () => {
  const result = await acquireB2SearchAnalytics({ transport: { async searchAnalytics() { return { rows: [] }; } }, accessToken: "x", property: PROPERTY, now: NOW, limits: { rowLimit: 10, maxRequests: 2 } });
  assert.equal(result.latest_finalized_observed_date, null); assert.ok(Object.values(result.grains).every(grain => grain.completeness === "empty")); assert.ok(Object.values(result.grains).every(grain => grain.rows.length === 0));
});

test("page boundary rejects protocol, host, port, sibling and malformed URLs", () => {
  assert.equal(pageWithinBoundary("https://streetkingz.co.uk/product/one/", PROPERTY), true);
  for (const page of ["http://streetkingz.co.uk/product/one/", "https://www.streetkingz.co.uk/product/one/", "https://blog.streetkingz.co.uk/", "https://other.example/", "not-a-url"]) assert.equal(pageWithinBoundary(page, PROPERTY), false, page);
});

test("normalization rejects malformed dimensions, dates, metrics, queries and foreign pages", () => {
  const request = { startDate: "2026-01-01", endDate: "2026-01-31" };
  assert.throws(() => normalizeSearchAnalyticsRow({ grain: "trend", row: row(["2026-02-01"]), request, property: PROPERTY, retrievedAt: NOW().toISOString(), completeness: "complete", limitations: [] }), /invalid date/i);
  assert.throws(() => normalizeSearchAnalyticsRow({ grain: "page", row: row(["https://other.example/"]), request, property: PROPERTY, retrievedAt: NOW().toISOString(), completeness: "provider_limited", limitations: ["provider_limited"] }), /boundary/i);
  assert.throws(() => normalizeSearchAnalyticsRow({ grain: "query", row: row(["q"], { ctr: Number.NaN }), request, property: PROPERTY, retrievedAt: NOW().toISOString(), completeness: "provider_limited", limitations: [] }), /CTR|metric/i);
  assert.throws(() => normalizeSearchAnalyticsRow({ grain: "query", row: row(["q"], { clicks: -1 }), request, property: PROPERTY, retrievedAt: NOW().toISOString(), completeness: "provider_limited", limitations: [] }), /metric/i);
});

test("transport sends only POST Search Analytics requests with bounded response handling", async () => {
  const calls = [];
  const env = { GOOGLE_SEARCH_CONSOLE_CLIENT_ID: "client", GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET: "secret", GOOGLE_SEARCH_CONSOLE_CALLBACK_URL: "https://product.example/callback" };
  const transport = createGscTransport({ env, fetchImpl: async (url, options) => { calls.push({ url, options }); return { ok: true, status: 200, body: { getReader() { let done = false; return { async read() { if (done) return { done: true }; done = true; return { done: false, value: new TextEncoder().encode(JSON.stringify({ access_token: "token", rows: [] })) }; }, async cancel() {} }; } } }; } });
  const body = { startDate: "2026-01-01", endDate: "2026-01-31", dimensions: ["query"], dataState: "final", rowLimit: SEARCH_ANALYTICS_ROW_LIMIT, startRow: 0 };
  await transport.searchAnalytics("token", PROPERTY, body);
  assert.equal(calls[0].options.method, "POST"); assert.match(calls[0].url, /searchAnalytics\/query$/); assert.equal(JSON.parse(calls[0].options.body).dataState, "final"); assert.match(calls[0].options.headers.authorization, /^Bearer /);
});
