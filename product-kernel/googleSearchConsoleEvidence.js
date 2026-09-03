import crypto from "node:crypto";
import { ProductError } from "./errors.js";

export const SEARCH_ANALYTICS_ROW_LIMIT = 25000;
export const MAX_ROWS_PER_DETAIL_GRAIN = 100000;
export const MAX_REQUESTS_PER_DETAIL_GRAIN = 4;
export const MAX_TOTAL_REQUESTS_PER_B2_RUN = 13;
export const B2_RUN_DEADLINE_MS = 90000;
export const GSC_EVIDENCE_PROVIDER_VERSION = "2.0.0";
export const GSC_EVIDENCE_SOURCE_VERSION = "v1-04-b2";

const GRAINS = Object.freeze({
  trend: ["date"],
  query: ["query"],
  page: ["page"],
  query_page: ["query", "page"]
});

const isoDate = value => value.toISOString().slice(0, 10);
const addDays = (value, days) => { const next = new Date(value); next.setUTCDate(next.getUTCDate() + days); return next; };

export function b2DateRanges(now = new Date()) {
  const today = new Date(now);
  return {
    trend: { startDate: isoDate(addDays(today, -364)), endDate: isoDate(today) },
    detail: { startDate: isoDate(addDays(today, -89)), endDate: isoDate(today) }
  };
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && isoDate(date) === value;
}

function metric(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new ProductError("GSC_PROVIDER_MALFORMED", `Google Search Console returned an invalid ${name}.`, 502);
  if ((name === "clicks" || name === "impressions" || name === "position") && value < 0) throw new ProductError("GSC_PROVIDER_MALFORMED", "Google Search Console returned an invalid metric.", 502);
  if (name === "ctr" && (value < 0 || value > 1)) throw new ProductError("GSC_PROVIDER_MALFORMED", "Google Search Console returned an invalid CTR.", 502);
  return value;
}

export function pageWithinBoundary(page, boundary) {
  if (typeof page !== "string") return false;
  try {
    const candidate = new URL(page); const base = new URL(boundary);
    if (candidate.protocol !== base.protocol || candidate.hostname !== base.hostname || candidate.port !== base.port || candidate.username || candidate.password) return false;
    const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
    return candidate.pathname === base.pathname || candidate.pathname.startsWith(basePath);
  } catch { return false; }
}

function rowIdentity({ grain, row, request }) {
  return crypto.createHash("sha256").update(JSON.stringify({ grain, keys: row.keys, start_date: request.startDate, end_date: request.endDate })).digest("hex");
}

export function normalizeSearchAnalyticsRow({ grain, row, request, property, retrievedAt, completeness, limitations }) {
  const dimensions = GRAINS[grain];
  if (!dimensions || !Array.isArray(row?.keys) || row.keys.length !== dimensions.length) throw new ProductError("GSC_PROVIDER_MALFORMED", "Google Search Console returned an invalid row.", 502);
  const values = Object.fromEntries(dimensions.map((dimension, index) => [dimension, row.keys[index]]));
  if (grain === "trend" && (!validDate(values.date) || values.date < request.startDate || values.date > request.endDate)) throw new ProductError("GSC_PROVIDER_MALFORMED", "Google Search Console returned an invalid date row.", 502);
  if (grain === "query" || grain === "query_page") {
    if (typeof values.query !== "string" || values.query.length > 1000) throw new ProductError("GSC_PROVIDER_MALFORMED", "Google Search Console returned an invalid query row.", 502);
  }
  if (grain === "page" || grain === "query_page") {
    if (!pageWithinBoundary(values.page, property)) throw new ProductError("GSC_PAGE_BOUNDARY_REJECTED", "Google Search Console returned a page outside the Business boundary.", 502);
  }
  const normalized = {
    provider: "google_search_console",
    property_identity: property,
    grain,
    observed_date: grain === "trend" ? values.date : null,
    query: values.query ?? null,
    page_url: values.page ?? null,
    clicks: metric(row.clicks, "clicks"),
    impressions: metric(row.impressions, "impressions"),
    ctr: metric(row.ctr, "ctr"),
    average_position: metric(row.position, "position"),
    requested_start_date: request.startDate,
    requested_end_date: request.endDate,
    observed_start_date: grain === "trend" ? values.date : null,
    observed_end_date: grain === "trend" ? values.date : null,
    retrieved_at: retrievedAt,
    evidence_as_of: null,
    completeness,
    provider_limitations: limitations,
    direct_or_derived: "direct",
    provider_version: GSC_EVIDENCE_PROVIDER_VERSION,
    source_version: GSC_EVIDENCE_SOURCE_VERSION,
    observation_identity: rowIdentity({ grain, row, request })
  };
  return normalized;
}

function responseRows(response) {
  if (!response || typeof response !== "object" || Array.isArray(response) || (response.rows !== undefined && !Array.isArray(response.rows))) throw new ProductError("GSC_PROVIDER_MALFORMED", "Google Search Console returned an invalid result.", 502);
  return response.rows || [];
}

export async function acquireSearchAnalyticsGrain({ transport, accessToken, property, grain, request, counters, now = () => new Date(), rowLimit = SEARCH_ANALYTICS_ROW_LIMIT, maxRows = MAX_ROWS_PER_DETAIL_GRAIN, maxRequests = MAX_REQUESTS_PER_DETAIL_GRAIN, deadline = Date.now() + B2_RUN_DEADLINE_MS }) {
  const dimensions = GRAINS[grain];
  if (!dimensions) throw new ProductError("GSC_CONFIGURATION", "Search Console grain is not supported.", 500);
  const rows = []; const identities = new Set(); const pages = new Set(); const initialRequestCount = counters.total;
  let startRow = 0; let providerEnd = false; let capHit = false; let duplicatePage = false;
  for (let requestNumber = 0; requestNumber < maxRequests; requestNumber += 1) {
    if (Date.now() >= deadline || counters.total >= MAX_TOTAL_REQUESTS_PER_B2_RUN) { capHit = true; break; }
    counters.total += 1;
    const body = { startDate: request.startDate, endDate: request.endDate, dimensions, type: "web", dataState: "final", aggregationType: "auto", rowLimit, startRow };
    const response = await transport.searchAnalytics(accessToken, property, body);
    const pageRows = responseRows(response);
    const pageKey = crypto.createHash("sha256").update(JSON.stringify(pageRows)).digest("hex");
    if (pages.has(pageKey) && pageRows.length) { duplicatePage = true; break; }
    pages.add(pageKey);
    for (const row of pageRows) {
      const identity = rowIdentity({ grain, row, request });
      if (identities.has(identity)) continue;
      if (rows.length >= maxRows) { capHit = true; break; }
      identities.add(identity); rows.push(row);
    }
    if (rows.length >= maxRows) { capHit = true; break; }
    if (pageRows.length < rowLimit) { providerEnd = true; break; }
    startRow += rowLimit;
  }
  if (!providerEnd && !capHit && !duplicatePage) capHit = true;
  const limitations = [];
  if (grain !== "trend") limitations.push("provider_limited");
  if (capHit) limitations.push("implementation_cap_reached");
  if (duplicatePage) limitations.push("repeated_provider_page");
  const completeness = rows.length === 0 ? "empty" : capHit ? "partial" : grain === "trend" ? "complete" : "provider_limited";
  const retrievedAt = now().toISOString();
  const normalized = rows.map(row => normalizeSearchAnalyticsRow({ grain, row, request, property, retrievedAt, completeness, limitations }));
  const latest = normalized.filter(row => row.observed_date).map(row => row.observed_date).sort().at(-1) || null;
  const earliest = normalized.filter(row => row.observed_date).map(row => row.observed_date).sort()[0] || null;
  return { grain, rows: normalized, request_count: counters.total - initialRequestCount, row_count: normalized.length, provider_end: providerEnd, cap_hit: capHit, completeness, limitations, earliest_observed_date: earliest, latest_observed_date: latest };
}

export async function acquireB2SearchAnalytics({ transport, accessToken, property, now = () => new Date(), limits = {}, counters = { total: 0 } } = {}) {
  if (!transport || typeof transport.searchAnalytics !== "function") throw new ProductError("GSC_CONFIGURATION", "Search Console transport is not configured.", 503);
  const ranges = b2DateRanges(now()); const deadline = Date.now() + (limits.deadlineMs || B2_RUN_DEADLINE_MS);
  const rowLimit = limits.rowLimit || SEARCH_ANALYTICS_ROW_LIMIT;
  const detail = { maxRows: limits.maxRows || MAX_ROWS_PER_DETAIL_GRAIN, maxRequests: limits.maxRequests || MAX_REQUESTS_PER_DETAIL_GRAIN };
  const trend = await acquireSearchAnalyticsGrain({ transport, accessToken, property, grain: "trend", request: ranges.trend, counters, now, rowLimit, maxRows: Math.max(365, detail.maxRows), maxRequests: detail.maxRequests, deadline });
  const results = { trend };
  for (const grain of ["query", "page", "query_page"]) results[grain] = await acquireSearchAnalyticsGrain({ transport, accessToken, property, grain, request: ranges.detail, counters, now, rowLimit, ...detail, deadline });
  const latest = trend.latest_observed_date;
  for (const result of Object.values(results)) for (const row of result.rows) row.evidence_as_of = latest;
  return { ranges, grains: results, total_request_count: counters.total, latest_finalized_observed_date: latest };
}
