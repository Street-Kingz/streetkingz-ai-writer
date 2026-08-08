import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SCHEMA_VERSION } from "../contracts/schemas.js";
import { createEvidenceId, createRequestFingerprint, sha256, stableId } from "../core/canonical.js";
import { assertValid, validateEvidenceRecord, validateProviderRequest, validateProviderResult } from "../validation/evidence.js";
import { SearchConsoleConfigurationError } from "../clients/googleSearchConsole.js";

export const SEARCH_CONSOLE_SEARCH_ANALYTICS_PATH = "/sites/{siteUrl}/searchAnalytics/query";
const PROVIDER_ID = "google_search_console";
const PROVIDER_VERSION = "1.0.0";
const NORMALISER_VERSION = "1.0.0";
const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_FINALISATION_LAG_DAYS = 3;
const DEFAULT_ROW_LIMIT = 25000;
const DEFAULT_MAX_ROWS_PER_DIMENSION = 50000;
const DIMENSION_SETS = [["query"], ["page"], ["query", "page"]];

export class SearchConsoleProviderError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "SearchConsoleProviderError";
    this.code = code;
    this.details = details;
  }
}

function portablePath(filePath) {
  const relative = path.relative(process.cwd(), filePath);
  return relative && !relative.startsWith("..") ? relative : filePath;
}

async function readJson(filePath, label) {
  try { return JSON.parse(await readFile(filePath, "utf8")); }
  catch (error) { throw new SearchConsoleProviderError(`${label} is not valid JSON: ${error.message}`, "INVALID_INPUT"); }
}

async function readJsonIfPresent(filePath) {
  try { return JSON.parse(await readFile(filePath, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function resolveSearchConsoleDateRange({ startDate, endDate, lookbackDays = DEFAULT_LOOKBACK_DAYS, now = () => new Date() } = {}) {
  if ((startDate && !endDate) || (!startDate && endDate)) throw new SearchConsoleConfigurationError("Search Console start and end dates must be configured together.");
  if (startDate && endDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
      throw new SearchConsoleConfigurationError("Search Console dates must be a valid inclusive YYYY-MM-DD range.");
    }
    return { startDate, endDate };
  }
  const days = Number(lookbackDays);
  if (!Number.isInteger(days) || days < 1) throw new SearchConsoleConfigurationError("Search Console lookback days must be a positive integer.");
  const end = addUtcDays(now(), -DEFAULT_FINALISATION_LAG_DAYS);
  return { startDate: isoDate(addUtcDays(end, -(days - 1))), endDate: isoDate(end) };
}

function normaliseText(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replaceAll("microfibre", "microfiber").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function textTokens(value) {
  return normaliseText(value).split(" ").filter((token) => token.length > 1 && !["a", "an", "for", "of", "the", "to"].includes(token));
}

function canonicalUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch { return null; }
}

function queryRelationship(query, target) {
  const queryText = normaliseText(query);
  const targetText = normaliseText(target);
  if (!queryText || !targetText) return null;
  if (queryText === targetText) return { method: "normalised_exact", rationale: "Normalised query text exactly matches the existing evidence keyword." };
  const shorter = queryText.length <= targetText.length ? queryText : targetText;
  const longer = queryText.length > targetText.length ? queryText : targetText;
  if (textTokens(shorter).length >= 2 && (` ${longer} `).includes(` ${shorter} `)) {
    return { method: "normalised_phrase", rationale: "One normalised query is a complete multi-token phrase within the other." };
  }
  const queryTokens = new Set(textTokens(queryText));
  const targetTokens = new Set(textTokens(targetText));
  const intersection = [...queryTokens].filter((token) => targetTokens.has(token)).length;
  const denominator = Math.min(queryTokens.size, targetTokens.size);
  if (denominator >= 2 && intersection / denominator >= 0.75) {
    return { method: "token_containment_75", rationale: "At least 75% of the smaller deterministic token set appears in the larger query." };
  }
  return null;
}

export function buildSearchConsoleJoinTargets(evidence) {
  const keywordTargets = [];
  const pageTargets = [];
  for (const record of evidence.records) {
    if (record.evidence_type === "keyword_idea" && record.value?.keyword) keywordTargets.push({ text: record.value.keyword, evidence_id: record.evidence_id, origin: "keyword_idea" });
    if (record.provider_id === "dataforseo_google_organic_serp_advanced" && record.query_or_question) keywordTargets.push({ text: record.query_or_question, evidence_id: record.evidence_id, origin: "serp_shortlist" });
    if (record.evidence_type === "product_fact" && typeof record.value?.value === "string" && canonicalUrl(record.value.value)) {
      pageTargets.push({ url: canonicalUrl(record.value.value), evidence_id: record.evidence_id, origin: record.value.field_path });
    }
  }
  if (evidence.subject?.product_url) {
    const productIdentityEvidence = evidence.records.find((record) => record.evidence_type === "product_fact" && record.value?.field_path === "product.name")?.evidence_id;
    pageTargets.push({ url: canonicalUrl(evidence.subject.product_url), evidence_id: productIdentityEvidence || evidence.subject.subject_id, origin: "subject.product_url" });
  }
  const dedupe = (items, key) => [...new Map(items.sort((a, b) => a[key].localeCompare(b[key], "en") || a.evidence_id.localeCompare(b.evidence_id, "en")).map((item) => [`${item[key]}:${item.evidence_id}`, item])).values()];
  return { keywordTargets: dedupe(keywordTargets, "text"), pageTargets: dedupe(pageTargets.filter((item) => item.url), "url") };
}

export function joinSearchConsoleRow({ query, page, targets }) {
  const keywordRelationships = query ? targets.keywordTargets.flatMap((target) => {
    const relationship = queryRelationship(query, target.text);
    return relationship ? [{ target: target.text, source_evidence_id: target.evidence_id, origin: target.origin, ...relationship }] : [];
  }) : [];
  const pageUrl = page ? canonicalUrl(page) : null;
  const pageRelationships = pageUrl ? targets.pageTargets.filter((target) => target.url === pageUrl).map((target) => ({
    target: target.url,
    source_evidence_id: target.evidence_id,
    origin: target.origin,
    method: "canonical_url_exact",
    rationale: "The Search Console page and existing evidence page have the same canonical URL after query, fragment and trailing-slash removal."
  })) : [];
  return { keyword_relationships: keywordRelationships, page_relationships: pageRelationships };
}

function parseRaw(rawBody, dimensions) {
  let response;
  try { response = JSON.parse(rawBody); }
  catch (error) { throw new SearchConsoleProviderError(`Search Console response for ${dimensions.join("+")} is malformed JSON: ${error.message}`, "MALFORMED_RESPONSE"); }
  if (!response || typeof response !== "object" || Array.isArray(response) || (response.rows !== undefined && !Array.isArray(response.rows))) {
    throw new SearchConsoleProviderError(`Search Console response for ${dimensions.join("+")} has an invalid result.`, "MALFORMED_RESPONSE");
  }
  const rows = response.rows || [];
  for (const [index, row] of rows.entries()) {
    if (!Array.isArray(row?.keys) || row.keys.length !== dimensions.length || ![row.clicks, row.impressions, row.ctr, row.position].every((value) => Number.isFinite(Number(value)))) {
      throw new SearchConsoleProviderError(`Search Console row ${index} for ${dimensions.join("+")} is malformed.`, "MALFORMED_RESPONSE");
    }
  }
  return { response, rows };
}

function confidence() {
  return {
    scoring_version: "1.0.0",
    score: 0.8,
    components: { source_reliability: 1, directness: 1, corroboration: 0, freshness: 1, extraction_integrity: 1 },
    rationale: "First-party search performance observation returned by the official Google Search Console API."
  };
}

function recordType(dimensions) {
  if (dimensions.length === 1 && dimensions[0] === "query") return "search_console_query_performance";
  if (dimensions.length === 1 && dimensions[0] === "page") return "search_console_page_performance";
  return "search_console_query_page_performance";
}

function normalisePage({ pageResult, request, providerRunId, retrievedAt, rawReference, targets }) {
  const { dimensions, startRow, parsed } = pageResult;
  return parsed.rows.map((row, index) => {
    const values = Object.fromEntries(dimensions.map((dimension, dimensionIndex) => [dimension, row.keys[dimensionIndex]]));
    const relationships = joinSearchConsoleRow({ ...values, targets });
    const value = {
      ...values,
      display_label: values.query && values.page ? `${values.query} → ${values.page}` : values.query || values.page,
      clicks: Number(row.clicks),
      impressions: Number(row.impressions),
      ctr: Number(row.ctr),
      average_position: Number(row.position),
      keyword_relationships: relationships.keyword_relationships,
      page_relationships: relationships.page_relationships
    };
    const sourceRecordId = `${request.site_url}:${request.date_range.start_date}:${request.date_range.end_date}:${dimensions.join("+")}:${row.keys.join("|")}`;
    const type = recordType(dimensions);
    const record = {
      evidence_id: createEvidenceId({ providerId: PROVIDER_ID, evidenceType: type, subjectId: request.subject_id, sourceRecordId, value }),
      provider_id: PROVIDER_ID,
      provider_run_id: providerRunId,
      evidence_type: type,
      subject_id: request.subject_id,
      seed_ids: [...new Set([...relationships.keyword_relationships, ...relationships.page_relationships].map((relationship) =>
        stableId("seed", { kind: "search_console_relationship", source_evidence_id: relationship.source_evidence_id, method: relationship.method })
      ))].sort(),
      query_or_question: values.query || null,
      value,
      context: { market: request.scope.market, language: request.scope.language, property: request.site_url, dimensions, date_range: request.date_range, search_type: request.parameters.type },
      observed_at: `${request.date_range.end_date}T23:59:59.000Z`,
      retrieved_at: retrievedAt,
      provenance: {
        provider_id: PROVIDER_ID,
        provider_version: PROVIDER_VERSION,
        source_owner: "Google Search Console",
        source_url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(request.site_url)}/searchAnalytics/query`,
        source_record_id: sourceRecordId,
        query_seed: values.query || request.site_url,
        market: request.scope.market,
        language: request.scope.language,
        observed_at: `${request.date_range.end_date}T23:59:59.000Z`,
        retrieved_at: retrievedAt,
        raw_artifact: rawReference,
        locator: { type: "json_pointer", value: `/rows/${index}` },
        extraction_method: "official_api",
        normaliser_version: NORMALISER_VERSION,
        parent_evidence_ids: [...new Set([...relationships.keyword_relationships, ...relationships.page_relationships].map((relationship) => relationship.source_evidence_id))].sort(),
        terms_classification: "first_party_api_response",
        search_console_property: request.site_url,
        requested_dimensions: dimensions,
        requested_date_range: request.date_range,
        request_start_row: startRow
      },
      confidence: confidence(),
      raw_ref: rawReference,
      normaliser_version: NORMALISER_VERSION,
      status: "active"
    };
    return assertValid(`Search Console ${type} record`, record, validateEvidenceRecord);
  });
}

export function createGoogleSearchConsoleProvider({
  client,
  siteUrl,
  startDate,
  endDate,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
  rowLimit = DEFAULT_ROW_LIMIT,
  maxRowsPerDimension = DEFAULT_MAX_ROWS_PER_DIMENSION,
  filters = [],
  now = () => new Date()
} = {}) {
  return {
    id: PROVIDER_ID,
    version: PROVIDER_VERSION,
    evidenceTypes: ["search_console_query_performance", "search_console_page_performance", "search_console_query_page_performance"],
    cachePolicy: { owner: PROVIDER_ID, freshness: "1_day" },

    async createRequest({ productFactsPath, evidenceArtifactPath, scope, approval }) {
      if (approval?.status !== "approved") throw new SearchConsoleProviderError("Approved inputs are required.", "CONFIGURATION");
      if (!evidenceArtifactPath) throw new SearchConsoleProviderError("Existing research evidence is required.", "CONFIGURATION");
      const property = siteUrl || client?.config?.siteUrl;
      if (!property) throw new SearchConsoleProviderError("A Google Search Console property/site URL is required.", "CONFIGURATION");
      if (!Number.isInteger(Number(rowLimit)) || Number(rowLimit) < 1 || Number(rowLimit) > 25000) throw new SearchConsoleProviderError("Search Console row limit must be from 1 to 25000.", "CONFIGURATION");
      if (!Number.isInteger(Number(maxRowsPerDimension)) || Number(maxRowsPerDimension) < Number(rowLimit)) throw new SearchConsoleProviderError("Search Console maximum rows must be an integer at least as large as row limit.", "CONFIGURATION");
      const absoluteFactsPath = path.resolve(productFactsPath);
      const absoluteEvidencePath = path.resolve(evidenceArtifactPath);
      const [factsRaw, evidenceRaw] = await Promise.all([readFile(absoluteFactsPath, "utf8"), readFile(absoluteEvidencePath, "utf8")]);
      const facts = await readJson(absoluteFactsPath, "Product facts artifact");
      const evidence = await readJson(absoluteEvidencePath, "Research evidence artifact");
      if (facts.artifact_type !== "product_facts" || evidence.artifact_type !== "research_evidence" || evidence.subject?.product_facts_sha256 !== sha256(factsRaw)) {
        throw new SearchConsoleProviderError("Compatible Phase 2 facts and research evidence artifacts are required.", "INVALID_INPUT");
      }
      const range = resolveSearchConsoleDateRange({ startDate, endDate, lookbackDays, now });
      const request = {
        schema_version: SCHEMA_VERSION,
        artifact_type: "provider_request",
        provider_id: PROVIDER_ID,
        subject_id: evidence.subject.subject_id,
        product_facts_ref: { path: portablePath(absoluteFactsPath), sha256: sha256(factsRaw), artifact_type: facts.artifact_type, schema_version: facts.schema_version },
        evidence_ref: { path: portablePath(absoluteEvidencePath), sha256: sha256(evidenceRaw) },
        scope: { market: scope?.market || "GB", language: scope?.language || "en-GB" },
        approval: { status: "approved", asserted_by: approval.asserted_by || "local_user" },
        endpoint: SEARCH_CONSOLE_SEARCH_ANALYTICS_PATH,
        site_url: property,
        date_range: { start_date: range.startDate, end_date: range.endDate },
        dimension_sets: DIMENSION_SETS,
        parameters: { type: "web", data_state: "final", aggregation_type: "auto", row_limit: Number(rowLimit), max_rows_per_dimension: Number(maxRowsPerDimension), filters }
      };
      assertValid("Google Search Console request", request, validateProviderRequest);
      return { request, facts, evidence, joinTargets: buildSearchConsoleJoinTargets(evidence) };
    },

    requestFingerprint(request) {
      return createRequestFingerprint({ provider_id: PROVIDER_ID, provider_version: PROVIDER_VERSION, normaliser_version: NORMALISER_VERSION, endpoint: request.endpoint, site_url: request.site_url, date_range: request.date_range, dimension_sets: request.dimension_sets, parameters: request.parameters });
    },

    async run({ preparedRequest, cacheRoot, now: engineNow }) {
      const { request, joinTargets } = preparedRequest;
      const fingerprint = this.requestFingerprint(request);
      const cacheDirectory = path.join(path.resolve(cacheRoot), PROVIDER_ID, fingerprint);
      const normalisedPath = path.join(cacheDirectory, "normalised.json");
      const runPath = path.join(cacheDirectory, "run.json");
      const [cachedNormalised, cachedRun] = await Promise.all([readJsonIfPresent(normalisedPath), readJsonIfPresent(runPath)]);
      if (cachedNormalised && cachedRun) {
        const result = { ...cachedRun, cache: { ...cachedRun.cache, hit: true, hits: 1, misses: 0 }, api_requests: 0 };
        assertValid("Cached Search Console result", result, validateProviderResult);
        return { result, records: cachedNormalised.records, request, cacheDirectory };
      }
      if (!client) throw new SearchConsoleProviderError("Google Search Console client is not configured.", "CONFIGURATION");
      const retrievedAt = engineNow().toISOString();
      const providerRunId = stableId("provider_run", { provider_id: PROVIDER_ID, request_fingerprint: fingerprint });
      const rawArtifacts = [];
      const pageResults = [];
      let apiRequests = 0;
      for (const dimensions of request.dimension_sets) {
        for (let startRow = 0; startRow < request.parameters.max_rows_per_dimension; startRow += request.parameters.row_limit) {
          const body = {
            startDate: request.date_range.start_date,
            endDate: request.date_range.end_date,
            dimensions,
            type: request.parameters.type,
            dataState: request.parameters.data_state,
            aggregationType: request.parameters.aggregation_type,
            rowLimit: Math.min(request.parameters.row_limit, request.parameters.max_rows_per_dimension - startRow),
            startRow
          };
          if (request.parameters.filters.length) body.dimensionFilterGroups = request.parameters.filters;
          const transport = await client.querySearchAnalytics(body);
          apiRequests += 1;
          const key = dimensions.join("_");
          const rawPath = path.join(cacheDirectory, "raw", key, `response_${String(startRow).padStart(6, "0")}.json`);
          await mkdir(path.dirname(rawPath), { recursive: true });
          await writeFile(rawPath, transport.rawBody, "utf8");
          const rawReference = { path: `provider-cache://${PROVIDER_ID}/${fingerprint}/raw/${key}/response_${String(startRow).padStart(6, "0")}.json`, local_path: portablePath(rawPath), sha256: sha256(transport.rawBody) };
          rawArtifacts.push(rawReference);
          let parsed;
          try { parsed = parseRaw(transport.rawBody, dimensions); }
          catch (error) { error.providerMetadata = { rawArtifacts: [...rawArtifacts] }; throw error; }
          pageResults.push({ dimensions, startRow, parsed, rawReference });
          if (parsed.rows.length < body.rowLimit) break;
        }
      }
      const records = pageResults.flatMap((pageResult) => normalisePage({ pageResult, request, providerRunId, retrievedAt, rawReference: pageResult.rawReference, targets: joinTargets })).sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
      const counts = Object.fromEntries(this.evidenceTypes.map((type) => [type, records.filter((record) => record.evidence_type === type).length]));
      const relationshipCounts = {
        keyword: records.reduce((sum, record) => sum + record.value.keyword_relationships.length, 0),
        page: records.reduce((sum, record) => sum + record.value.page_relationships.length, 0),
        unmatched_records: records.filter((record) => !record.value.keyword_relationships.length && !record.value.page_relationships.length).length
      };
      const normalised = { schema_version: SCHEMA_VERSION, artifact_type: "normalised_provider_evidence", provider_id: PROVIDER_ID, provider_version: PROVIDER_VERSION, provider_run_id: providerRunId, request_fingerprint: fingerprint, site_url: request.site_url, date_range: request.date_range, dimensions: request.dimension_sets, evidence_type_counts: counts, relationship_counts: relationshipCounts, records };
      const normalisedText = `${JSON.stringify(normalised, null, 2)}\n`;
      const result = {
        schema_version: SCHEMA_VERSION,
        artifact_type: "provider_result",
        provider_id: PROVIDER_ID,
        provider_version: PROVIDER_VERSION,
        provider_run_id: providerRunId,
        request_fingerprint: fingerprint,
        status: "complete",
        cache: { owner: PROVIDER_ID, hit: false, directory: portablePath(cacheDirectory), policy: "1_day", hits: 0, misses: 1 },
        raw_artifacts: rawArtifacts,
        normalised_artifact: { path: `provider-cache://${PROVIDER_ID}/${fingerprint}/normalised.json`, local_path: portablePath(normalisedPath), sha256: sha256(normalisedText) },
        evidence_record_ids: records.map((record) => record.evidence_id),
        started_at: retrievedAt,
        completed_at: retrievedAt,
        rate_limit: null,
        cost: null,
        api_requests: apiRequests,
        rows_returned: records.length,
        evidence_type_counts: counts,
        relationship_counts: relationshipCounts,
        errors: [],
        warnings: []
      };
      assertValid("Google Search Console provider result", result, validateProviderResult);
      await writeFile(normalisedPath, normalisedText, "utf8");
      await writeFile(runPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
      return { result, records, request, cacheDirectory };
    }
  };
}
