import { createRequestFingerprint, sha256, stableId } from "../research/core/canonical.js";

export const DATAFORSEO_KEYWORD_IDEAS_ENDPOINT = "/v3/dataforseo_labs/google/keyword_ideas/live";
export const DATAFORSEO_SERP_ENDPOINT = "/v3/serp/google/organic/live/advanced";
export const EXTERNAL_EVIDENCE_VERSION = "1.0.0";
export const EXTERNAL_NORMALIZER_VERSION = "1.0.0";
export const EXTERNAL_LIMITS = Object.freeze({
  MAX_DIRECT_SEEDS_PER_BUSINESS_RUN: 5,
  MAX_PROVIDER_IDEAS_PER_REQUEST: 20,
  MAX_PROVIDER_IDEAS_TOTAL: 100,
  MAX_SERP_QUERIES_PER_BUSINESS_RUN: 5,
  MAX_PROVIDER_REQUESTS_PER_RUN: 10,
  MAX_PROVIDER_COST_USD_PER_RUN: 0.10,
  MAX_PROVIDER_COST_USD_PER_BUSINESS_PER_REFRESH_WINDOW: 0.20,
  MAX_CONCURRENCY: 2,
  REQUEST_TIMEOUT_MS: 120000,
  TOTAL_RUN_DEADLINE_MS: 360000,
  MAX_PROVIDER_RESPONSE_BYTES: 2 * 1024 * 1024,
  KEYWORD_EVIDENCE_REUSE_WINDOW_MS: 30 * 24 * 60 * 60 * 1000,
  SERP_EVIDENCE_REUSE_WINDOW_MS: 7 * 24 * 60 * 60 * 1000
});

const SOURCE_PRIORITY = ["woo_product", "woo_category", "site_title", "site_h1", "gsc_query"];
const DATAFORSEO_BASE_URL = "https://api.dataforseo.com";

export class ExternalEvidenceError extends Error {
  constructor(code, message, status = 502, details = {}) { super(message); this.name = "ExternalEvidenceError"; this.code = code; this.status = status; this.details = details; }
}

export function safeDatabaseDiagnostic(error, correlationId = null) {
  const sanitize = value => String(value || "").replace(/'[^']*'/g, "'…'").replace(/[\r\n]+/g, " ").slice(0, 240) || null;
  return { event: "external_observation_persistence_failure", correlation_id: correlationId, code: sanitize(error?.code), constraint: sanitize(error?.constraint), table: sanitize(error?.table), column: sanitize(error?.column), message: sanitize(error?.message), details: sanitize(error?.details), hint: sanitize(error?.hint) };
}

export function requestReuseWindow(endpoint) {
  return endpoint === DATAFORSEO_SERP_ENDPOINT ? EXTERNAL_LIMITS.SERP_EVIDENCE_REUSE_WINDOW_MS : EXTERNAL_LIMITS.KEYWORD_EVIDENCE_REUSE_WINDOW_MS;
}

export function estimatedRequestCost(endpoint) {
  return endpoint === DATAFORSEO_SERP_ENDPOINT ? 0.002 : 0.012 + (EXTERNAL_LIMITS.MAX_PROVIDER_IDEAS_PER_REQUEST * 0.00012);
}

export function isReusable(completedAt, endpoint, now = Date.now()) {
  const completed = Date.parse(completedAt || "");
  return Number.isFinite(completed) && now >= completed && now - completed <= requestReuseWindow(endpoint);
}

function number(value, fallback = null) { if (value === null || value === undefined || value === "") return fallback; const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function normalized(value) { return String(value || "").normalize("NFKC").replace(/[–—]/g, " ").replace(/\s+/g, " ").trim().toLowerCase(); }
function boundedText(value, maximum) { return typeof value === "string" ? value.trim().slice(0, maximum) || null : null; }
function dateValue(value) { const n = Date.parse(value || ""); return Number.isFinite(n) ? new Date(n).toISOString() : null; }

export function deriveDirectSeeds({ products = [], categories = [], pages = [], gscQueries = [], maximum = EXTERNAL_LIMITS.MAX_DIRECT_SEEDS_PER_BUSINESS_RUN } = {}) {
  const groups = Object.fromEntries(SOURCE_PRIORITY.map(source => [source, []]));
  const add = (sourceClass, sourceRecordIdentity, sourceText) => {
    const text = boundedText(sourceText, 500); const normalizedText = normalized(text);
    if (!groups[sourceClass] || !normalizedText) return;
    groups[sourceClass].push({ source_class: sourceClass, source_record_identity: String(sourceRecordIdentity), source_text: text, normalized_text: normalizedText });
  };
  products.forEach(row => add("woo_product", `commerce_product:${row.id}`, row.name));
  categories.forEach(row => add("woo_category", `commerce_category:${row.id}`, row.name));
  pages.forEach(row => {
    add("site_title", `site_page_title:${row.id}`, row.title);
    (Array.isArray(row.h1) ? row.h1 : []).forEach((value, index) => add("site_h1", `site_page_h1:${row.id}:${index}`, value));
  });
  gscQueries.forEach(row => add("gsc_query", `gsc_query:${row.id}`, row.query));
  for (const source of SOURCE_PRIORITY) groups[source] = [...new Map(groups[source].map(seed => [`${seed.normalized_text}:${seed.source_record_identity}`, seed])).values()].sort((a, b) => a.normalized_text.localeCompare(b.normalized_text, "en") || a.source_record_identity.localeCompare(b.source_record_identity, "en"));
  const selected = []; let round = 0;
  while (selected.length < maximum) {
    let added = false;
    for (const source of SOURCE_PRIORITY) { const seed = groups[source][round]; if (!seed) continue; if (!selected.some(item => item.normalized_text === seed.normalized_text)) { selected.push(seed); added = true; if (selected.length === maximum) break; } }
    if (!added) break; round += 1;
  }
  return selected.map(seed => ({ ...seed, seed_id: stableId("direct_seed", { source_class: seed.source_class, source_record_identity: seed.source_record_identity, normalized_text: seed.normalized_text }), locale: "GB", language_code: "en", direct_or_derived: "direct" }));
}

function safeResponseError(status) {
  if (status === 400) return ["PROVIDER_REQUEST_INVALID", "The external evidence request was invalid.", 400];
  if (status === 401 || status === 403) return ["PROVIDER_AUTHENTICATION_FAILED", "The external evidence provider rejected authentication.", 502];
  if (status === 429) return ["PROVIDER_RATE_LIMITED", "The external evidence provider is rate limiting requests.", 429];
  if (status >= 500) return ["PROVIDER_TRANSIENT_FAILURE", "The external evidence provider is temporarily unavailable.", 502];
  return ["PROVIDER_HTTP_FAILURE", "The external evidence provider request failed.", 502];
}

export function createDataForSeoTransport({ login = process.env.DATAFORSEO_LOGIN, password = process.env.DATAFORSEO_PASSWORD, fetchImpl = globalThis.fetch, baseUrl = DATAFORSEO_BASE_URL, timeoutMs = EXTERNAL_LIMITS.REQUEST_TIMEOUT_MS, maxResponseBytes = EXTERNAL_LIMITS.MAX_PROVIDER_RESPONSE_BYTES } = {}) {
  if (!login || !password) throw new ExternalEvidenceError("PROVIDER_UNAVAILABLE", "The external evidence provider is not configured.", 503);
  if (typeof fetchImpl !== "function") throw new ExternalEvidenceError("PROVIDER_UNAVAILABLE", "The external evidence provider transport is unavailable.", 503);
  let base;
  try { base = new URL(baseUrl); } catch { throw new ExternalEvidenceError("PROVIDER_UNAVAILABLE", "The external evidence provider is not configured.", 503); }
  if (base.protocol !== "https:" || base.hostname !== "api.dataforseo.com" || base.username || base.password || base.pathname !== "/") throw new ExternalEvidenceError("PROVIDER_ENDPOINT_INVALID", "The external evidence provider endpoint is not approved.", 400);
  return {
    async post(endpoint, payload, { timeoutMs: requestTimeoutMs = timeoutMs } = {}) {
      if (![DATAFORSEO_KEYWORD_IDEAS_ENDPOINT, DATAFORSEO_SERP_ENDPOINT].includes(endpoint)) throw new ExternalEvidenceError("PROVIDER_ENDPOINT_INVALID", "The requested external evidence endpoint is not approved.", 400);
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
      let response;
      try {
        response = await fetchImpl(new URL(endpoint, base), { method: "POST", redirect: "error", headers: { authorization: `Basic ${Buffer.from(`${login}:${password}`, "utf8").toString("base64")}`, "content-type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
      } catch (error) {
        if (error?.name === "AbortError" || controller.signal.aborted) throw new ExternalEvidenceError("PROVIDER_TIMEOUT", "The external evidence provider timed out.", 504);
        throw new ExternalEvidenceError("PROVIDER_TRANSIENT_FAILURE", "The external evidence provider request failed.", 502);
      } finally { clearTimeout(timer); }
      let raw;
      try { raw = await response.text(); } catch { throw new ExternalEvidenceError("PROVIDER_TRANSIENT_FAILURE", "The external evidence provider response could not be read.", 502); }
      if (Buffer.byteLength(raw, "utf8") > maxResponseBytes) throw new ExternalEvidenceError("PROVIDER_RESPONSE_TOO_LARGE", "The external evidence provider response was too large.", 502);
      if (!response.ok) { const [code, message, status] = safeResponseError(response.status); throw new ExternalEvidenceError(code, message, status); }
      try { return { body: JSON.parse(raw), responseStatus: response.status }; } catch { throw new ExternalEvidenceError("PROVIDER_MALFORMED", "The external evidence provider returned malformed JSON.", 502); }
    }
  };
}

function providerTask(body, endpoint) {
  if (!body || body.status_code !== 20000 || !Array.isArray(body.tasks) || body.tasks.length !== 1) throw new ExternalEvidenceError("PROVIDER_MALFORMED", "The external evidence provider returned an invalid response.", 502);
  const task = body.tasks[0];
  if (task.status_code !== 20000) {
    if (Number(task.status_code) === 50401) throw new ExternalEvidenceError("PROVIDER_TIMEOUT", "The external evidence provider task timed out.", 504, { actualCost: number(task.cost) });
    throw new ExternalEvidenceError("PROVIDER_TASK_FAILED", "The external evidence provider task failed.", 502, { actualCost: number(task.cost) });
  }
  if (!Array.isArray(task.result)) throw new ExternalEvidenceError("PROVIDER_MALFORMED", "The external evidence provider returned an invalid task result.", 502);
  const result = task.result[0] || { items: [] };
  if (!Array.isArray(result.items)) throw new ExternalEvidenceError("PROVIDER_MALFORMED", "The external evidence provider returned invalid items.", 502);
  return { task, result, endpoint, actualCost: number(task.cost ?? body.cost, 0) };
}

function validateKeywordItem(item) {
  const keyword = boundedText(item?.keyword, 500); if (!keyword) return null;
  const info = item.keyword_info || {};
  const volume = info.search_volume === null || info.search_volume === undefined ? null : number(info.search_volume);
  if (volume !== null && (volume === null || volume < 0)) return null;
  const monthly = Array.isArray(info.monthly_searches) ? info.monthly_searches.slice(0, 12).map(row => ({ year: Number(row?.year), month: Number(row?.month), search_volume: number(row?.search_volume) })).filter(row => Number.isInteger(row.year) && row.year >= 2000 && row.year <= 2200 && Number.isInteger(row.month) && row.month >= 1 && row.month <= 12 && row.search_volume !== null && row.search_volume >= 0) : null;
  return { keyword, search_volume: volume, monthly_searches: monthly, observed_at: dateValue(info.last_updated_time) };
}

function validateSerpItem(item) {
  if (item?.type !== "organic") return { ignored: true };
  const rankGroup = Number(item.rank_group); const rankAbsolute = Number(item.rank_absolute); let url;
  try { url = new URL(item.url); } catch { return null; }
  if (!/^https?:$/.test(url.protocol) || !Number.isInteger(rankGroup) || rankGroup < 1 || !Number.isInteger(rankAbsolute) || rankAbsolute < 1) return null;
  return { keyword: boundedText(item.keyword, 500), rank_group: rankGroup, rank_absolute: rankAbsolute, result_url: url.href.slice(0, 2000), result_domain: boundedText(item.domain || url.hostname, 500), result_title: boundedText(item.title, 500), result_description: boundedText(item.description, 2000) };
}

export function normalizeKeywordResponse(body, seed, run, retrievedAt) {
  const { task, result, actualCost } = providerTask(body, DATAFORSEO_KEYWORD_IDEAS_ENDPOINT); const rows = []; const seen = new Set();
  for (const item of result.items) { const value = validateKeywordItem(item); if (!value) continue; const identity = `${seed.seed_id}:keyword_idea:${normalized(value.keyword)}`; if (seen.has(identity)) continue; seen.add(identity); rows.push({ business_id: run.business_id, source_id: run.source_id, run_id: run.run_id, seed_id: run.seed_id, provider: "dataforseo", observation_type: "keyword_idea", query_text: value.keyword, search_volume: value.search_volume, monthly_searches: value.monthly_searches, location_code: 2826, language_code: "en", observed_at: value.observed_at, retrieved_at: retrievedAt, completeness: "complete", limitations: [], provenance: { provider: "dataforseo", endpoint: DATAFORSEO_KEYWORD_IDEAS_ENDPOINT, task_id: task.id, parent_seed_id: seed.seed_id }, direct_or_derived: "derived", provider_version: EXTERNAL_EVIDENCE_VERSION, normalizer_version: EXTERNAL_NORMALIZER_VERSION, observation_identity: sha256({ run_id: run.run_id, seed_id: seed.seed_id, type: "keyword_idea", query: normalized(value.keyword) }) }); }
  return { rows, taskId: task.id || null, actualCost };
}

export function normalizeSerpResponse(body, seed, run, retrievedAt) {
  const { task, result, actualCost } = providerTask(body, DATAFORSEO_SERP_ENDPOINT); const rows = []; const seen = new Set();
  for (const item of result.items) { const value = validateSerpItem(item); if (value?.ignored) continue; if (!value) continue; const identity = sha256({ run_id: run.run_id, seed_id: seed.seed_id, type: "serp_organic_result", rank: value.rank_absolute, url: value.result_url }); if (seen.has(identity)) continue; seen.add(identity); rows.push({ business_id: run.business_id, source_id: run.source_id, run_id: run.run_id, seed_id: run.seed_id, provider: "dataforseo", observation_type: "serp_organic_result", query_text: seed.source_text, rank_group: value.rank_group, rank_absolute: value.rank_absolute, result_url: value.result_url, result_domain: value.result_domain, result_title: value.result_title, result_description: value.result_description, location_code: 2826, language_code: "en", device: "desktop", observed_at: retrievedAt, retrieved_at: retrievedAt, completeness: "complete", limitations: [], provenance: { provider: "dataforseo", endpoint: DATAFORSEO_SERP_ENDPOINT, task_id: task.id, parent_seed_id: seed.seed_id }, direct_or_derived: "derived", provider_version: EXTERNAL_EVIDENCE_VERSION, normalizer_version: EXTERNAL_NORMALIZER_VERSION, observation_identity: identity }); }
  return { rows, taskId: task.id || null, actualCost };
}

export function requestIdentity({ businessId, endpoint, seed, limit, depth }) { return createRequestFingerprint({ business_id: businessId, provider: "dataforseo", endpoint, seed_id: seed.seed_id, normalized_seed: seed.normalized_text, source_version: EXTERNAL_EVIDENCE_VERSION, normalizer_version: EXTERNAL_NORMALIZER_VERSION, location_code: 2826, language_code: "en", device: endpoint === DATAFORSEO_SERP_ENDPOINT ? "desktop" : null, limit, depth }); }

export { SOURCE_PRIORITY };
