import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SCHEMA_VERSION } from "../contracts/schemas.js";
import { createEvidenceId, createRequestFingerprint, sha256, stableId } from "../core/canonical.js";
import { assertValid, validateEvidenceRecord, validateProviderRequest, validateProviderResult } from "../validation/evidence.js";

export const DATAFORSEO_KEYWORD_IDEAS_ENDPOINT = "/v3/dataforseo_labs/google/keyword_ideas/live";
const PROVIDER_ID = "dataforseo_keyword_ideas";
const PROVIDER_VERSION = "1.0.0";
const NORMALISER_VERSION = "1.0.0";
const ESTIMATED_MAX_COST_USD = 0.024;

export class DataForSeoProviderError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "DataForSeoProviderError";
    this.code = code;
    this.details = details;
  }
}

function portablePath(filePath) {
  const relative = path.relative(process.cwd(), filePath);
  return relative && !relative.startsWith("..") ? relative : filePath;
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new DataForSeoProviderError(`${label} is not valid JSON: ${error.message}`, "INVALID_INPUT");
  }
}

async function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function normaliseSeedText(value) {
  return value.normalize("NFKC").replace(/[–—]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

export function deriveKeywordIdeaSeeds(evidence, { maximum = 2 } = {}) {
  const acceptedPaths = new Set(["product.name", "product.category_type"]);
  const records = evidence.records.filter((record) =>
    record.provider_id === "product_facts" && acceptedPaths.has(record.value?.field_path)
  );
  const seeds = records.map((record) => {
    const text = normaliseSeedText(String(record.value.value));
    return {
      seed_id: stableId("seed", { kind: "keyword_idea", text, origin_evidence_ids: [record.evidence_id] }),
      text,
      origin_evidence_ids: [record.evidence_id],
      origin_field_paths: [record.value.field_path]
    };
  });
  const unique = [...new Map(seeds.map((seed) => [seed.text, seed])).values()];
  return unique.sort((a, b) => a.text.localeCompare(b.text)).slice(0, maximum);
}

function confidence() {
  const components = {
    source_reliability: 0.9,
    directness: 1,
    corroboration: 0,
    freshness: 1,
    extraction_integrity: 1
  };
  return {
    scoring_version: "1.0.0",
    score: 0.765,
    components,
    rationale: "Structured keyword observation returned by the DataForSEO Labs API."
  };
}

function parseRawResponse(rawBody) {
  let response;
  try {
    response = JSON.parse(rawBody);
  } catch (error) {
    throw new DataForSeoProviderError(`DataForSEO response is malformed JSON: ${error.message}`, "MALFORMED_RESPONSE");
  }
  if (!response || response.status_code !== 20000 || !Array.isArray(response.tasks) || response.tasks.length !== 1) {
    throw new DataForSeoProviderError("DataForSEO response has an invalid top-level result.", "MALFORMED_RESPONSE", {
      status_code: response?.status_code,
      status_message: response?.status_message
    });
  }
  const task = response.tasks[0];
  if (task.status_code !== 20000) {
    throw new DataForSeoProviderError(`DataForSEO task failed: ${task.status_message || task.status_code}.`, "TASK_ERROR", {
      status_code: task.status_code,
      status_message: task.status_message,
      task_id: task.id,
      cost_usd: task.cost
    });
  }
  if (!Array.isArray(task.result)) {
    throw new DataForSeoProviderError("DataForSEO task result must be an array.", "MALFORMED_RESPONSE");
  }
  const result = task.result[0] || { items: [], items_count: 0, total_count: 0 };
  if (!Array.isArray(result.items)) {
    throw new DataForSeoProviderError("DataForSEO keyword items must be an array.", "MALFORMED_RESPONSE");
  }
  return { response, task, result };
}

function normaliseRecords({ task, result, request, providerRunId, retrievedAt, rawReference }) {
  return result.items.map((item, index) => {
    if (typeof item?.keyword !== "string" || !item.keyword.trim() || !item.keyword_info) {
      throw new DataForSeoProviderError(`Keyword item ${index} is missing required fields.`, "MALFORMED_RESPONSE");
    }
    const keyword = item.keyword.trim();
    const info = item.keyword_info;
    const sourceRecordId = `${task.id}:${keyword.toLowerCase()}`;
    const value = {
      keyword,
      monthly_search_volume: info.search_volume ?? null,
      monthly_searches: Array.isArray(info.monthly_searches) ? info.monthly_searches.slice(0, 12) : [],
      search_volume_trend: info.search_volume_trend ?? null,
      cpc_usd: info.cpc ?? null,
      paid_competition: info.competition ?? null,
      paid_competition_level: info.competition_level ?? null,
      keyword_difficulty: item.keyword_properties?.keyword_difficulty ?? null,
      source_updated_at: info.last_updated_time ?? null,
      dataforseo_task_cost_usd: task.cost ?? 0
    };
    const record = {
      evidence_id: createEvidenceId({
        providerId: PROVIDER_ID,
        evidenceType: "keyword_idea",
        subjectId: request.subject_id,
        sourceRecordId,
        value
      }),
      provider_id: PROVIDER_ID,
      provider_run_id: providerRunId,
      evidence_type: "keyword_idea",
      subject_id: request.subject_id,
      seed_ids: request.seeds.map((seed) => seed.seed_id),
      query_or_question: keyword,
      value,
      context: {
        market: request.scope.market,
        language: request.scope.language,
        location_code: request.parameters.location_code,
        language_code: request.parameters.language_code
      },
      observed_at: info.last_updated_time || retrievedAt,
      retrieved_at: retrievedAt,
      provenance: {
        provider_id: PROVIDER_ID,
        provider_version: PROVIDER_VERSION,
        source_owner: "DataForSEO",
        source_url: `https://api.dataforseo.com${DATAFORSEO_KEYWORD_IDEAS_ENDPOINT}`,
        source_record_id: sourceRecordId,
        query_seed: request.seeds.map((seed) => seed.text).join(" | "),
        market: request.scope.market,
        language: request.scope.language,
        observed_at: info.last_updated_time || retrievedAt,
        retrieved_at: retrievedAt,
        raw_artifact: rawReference,
        locator: { type: "json_pointer", value: `/tasks/0/result/0/items/${index}` },
        extraction_method: "official_api",
        normaliser_version: NORMALISER_VERSION,
        parent_evidence_ids: request.seeds.flatMap((seed) => seed.origin_evidence_ids),
        terms_classification: "paid_api_response"
      },
      confidence: confidence(),
      raw_ref: rawReference,
      normaliser_version: NORMALISER_VERSION,
      status: "active"
    };
    return assertValid(`DataForSEO evidence record ${keyword}`, record, validateEvidenceRecord);
  }).sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
}

export function createDataForSeoKeywordIdeasProvider({ client, maxCostUsd, locationCode = 2840, languageCode = "en" } = {}) {
  return {
    id: PROVIDER_ID,
    version: PROVIDER_VERSION,
    evidenceTypes: ["keyword_idea"],
    cachePolicy: { owner: PROVIDER_ID, freshness: "30_days" },

    async createRequest({ productFactsPath, evidenceArtifactPath, scope, approval }) {
      if (approval?.status !== "approved") throw new DataForSeoProviderError("Approved inputs are required.", "CONFIGURATION");
      if (!evidenceArtifactPath) throw new DataForSeoProviderError("An existing evidence artifact is required.", "CONFIGURATION");
      const absoluteFactsPath = path.resolve(productFactsPath);
      const absoluteEvidencePath = path.resolve(evidenceArtifactPath);
      const [factsRaw, evidenceRaw] = await Promise.all([
        readFile(absoluteFactsPath, "utf8"),
        readFile(absoluteEvidencePath, "utf8")
      ]);
      const facts = await readJson(absoluteFactsPath, "Product facts artifact");
      const evidence = await readJson(absoluteEvidencePath, "Evidence artifact");
      if (facts.artifact_type !== "product_facts" || evidence.artifact_type !== "research_evidence") {
        throw new DataForSeoProviderError("Phase 2 facts and existing research evidence artifacts are required.", "INVALID_INPUT");
      }
      if (evidence.subject?.product_facts_sha256 !== sha256(factsRaw)) {
        throw new DataForSeoProviderError("Evidence artifact does not reference the supplied product facts.", "INVALID_INPUT");
      }
      const seeds = deriveKeywordIdeaSeeds(evidence, { maximum: 2 });
      if (!seeds.length) throw new DataForSeoProviderError("No deterministic product-fact seeds were available.", "INVALID_INPUT");
      const request = {
        schema_version: SCHEMA_VERSION,
        artifact_type: "provider_request",
        provider_id: PROVIDER_ID,
        subject_id: evidence.subject.subject_id,
        product_facts_ref: {
          path: portablePath(absoluteFactsPath),
          sha256: sha256(factsRaw),
          artifact_type: facts.artifact_type,
          schema_version: facts.schema_version
        },
        evidence_ref: { path: portablePath(absoluteEvidencePath), sha256: sha256(evidenceRaw) },
        scope: { market: scope?.market || "GB", language: scope?.language || "en-GB" },
        approval: { status: "approved", asserted_by: approval.asserted_by || "local_user" },
        endpoint: DATAFORSEO_KEYWORD_IDEAS_ENDPOINT,
        seeds,
        parameters: {
          location_code: scope?.location_code ?? locationCode,
          language_code: scope?.language_code ?? languageCode,
          closely_variants: false,
          ignore_synonyms: false,
          include_serp_info: false,
          include_clickstream_data: false,
          limit: 100,
          order_by: ["relevance,desc", "keyword_info.search_volume,desc"]
        }
      };
      assertValid("DataForSEO keyword ideas request", request, validateProviderRequest);
      return { request, facts, evidence };
    },

    requestFingerprint(request) {
      return createRequestFingerprint({
        provider_id: PROVIDER_ID,
        provider_version: PROVIDER_VERSION,
        normaliser_version: NORMALISER_VERSION,
        endpoint: request.endpoint,
        seeds: request.seeds,
        location_code: request.parameters.location_code,
        language_code: request.parameters.language_code,
        parameters: request.parameters
      });
    },

    async run({ preparedRequest, cacheRoot, now }) {
      const { request } = preparedRequest;
      const requestFingerprint = this.requestFingerprint(request);
      const cacheDirectory = path.join(path.resolve(cacheRoot), PROVIDER_ID, requestFingerprint);
      const rawPath = path.join(cacheDirectory, "raw", "response.json");
      const normalisedPath = path.join(cacheDirectory, "normalised.json");
      const runPath = path.join(cacheDirectory, "run.json");
      const [cachedNormalised, cachedRun] = await Promise.all([
        readJsonIfPresent(normalisedPath),
        readJsonIfPresent(runPath)
      ]);
      if (cachedNormalised && cachedRun) {
        const result = { ...cachedRun, cache: { ...cachedRun.cache, hit: true } };
        assertValid("Cached DataForSEO provider result", result, validateProviderResult);
        return { result, records: cachedNormalised.records, request, cacheDirectory };
      }

      if (!client) throw new DataForSeoProviderError("DataForSEO client is not configured.", "CONFIGURATION");
      const costLimit = Number(maxCostUsd ?? client.config.maxCostUsd);
      if (!Number.isFinite(costLimit) || costLimit <= 0) {
        throw new DataForSeoProviderError("DataForSEO maximum cost must be positive.", "CONFIGURATION");
      }
      if (ESTIMATED_MAX_COST_USD > costLimit) {
        throw new DataForSeoProviderError(
          `Configured maximum cost $${costLimit.toFixed(4)} is below the conservative request estimate $${ESTIMATED_MAX_COST_USD.toFixed(4)}.`,
          "COST_LIMIT"
        );
      }

      const retrievedAt = now().toISOString();
      const providerRunId = stableId("provider_run", { provider_id: PROVIDER_ID, request_fingerprint: requestFingerprint });
      const body = [{ keywords: request.seeds.map((seed) => seed.text), ...request.parameters }];
      const transport = await client.post(request.endpoint, body);
      await mkdir(path.dirname(rawPath), { recursive: true });
      await writeFile(rawPath, transport.rawBody, "utf8");
      const rawReference = {
        path: `provider-cache://${PROVIDER_ID}/${requestFingerprint}/raw/response.json`,
        local_path: portablePath(rawPath),
        sha256: sha256(transport.rawBody)
      };
      let parsed;
      try {
        parsed = parseRawResponse(transport.rawBody);
      } catch (error) {
        error.providerMetadata = {
          rawArtifacts: [rawReference],
          rateLimit: transport.rateLimit,
          cost: error.details?.cost_usd === undefined ? null : {
            currency: "USD",
            actual: Number(error.details.cost_usd),
            configured_maximum: costLimit
          }
        };
        throw error;
      }
      const { response, task, result: apiResult } = parsed;
      const actualCostUsd = Number(task.cost ?? response.cost ?? 0);
      const records = normaliseRecords({ task, result: apiResult, request, providerRunId, retrievedAt, rawReference });
      const normalised = {
        schema_version: SCHEMA_VERSION,
        artifact_type: "normalised_provider_evidence",
        provider_id: PROVIDER_ID,
        provider_version: PROVIDER_VERSION,
        provider_run_id: providerRunId,
        request_fingerprint: requestFingerprint,
        seeds: request.seeds,
        records
      };
      const normalisedText = `${JSON.stringify(normalised, null, 2)}\n`;
      const providerResult = {
        schema_version: SCHEMA_VERSION,
        artifact_type: "provider_result",
        provider_id: PROVIDER_ID,
        provider_version: PROVIDER_VERSION,
        provider_run_id: providerRunId,
        request_fingerprint: requestFingerprint,
        status: "complete",
        cache: { owner: PROVIDER_ID, hit: false, directory: portablePath(cacheDirectory), policy: "30_days" },
        raw_artifacts: [rawReference],
        normalised_artifact: {
          path: `provider-cache://${PROVIDER_ID}/${requestFingerprint}/normalised.json`,
          local_path: portablePath(normalisedPath),
          sha256: sha256(normalisedText)
        },
        evidence_record_ids: records.map((record) => record.evidence_id),
        started_at: retrievedAt,
        completed_at: retrievedAt,
        rate_limit: transport.rateLimit,
        cost: {
          currency: "USD",
          actual: actualCostUsd,
          configured_maximum: costLimit,
          deterministic_request_maximum: ESTIMATED_MAX_COST_USD,
          response_total: Number(response.cost ?? actualCostUsd)
        },
        source_task: { id: task.id, status_code: task.status_code, result_count: task.result_count },
        errors: [],
        warnings: actualCostUsd > costLimit ? ["Actual task cost exceeded the configured preflight maximum."] : []
      };
      assertValid("DataForSEO provider result", providerResult, validateProviderResult);
      await writeFile(normalisedPath, normalisedText, "utf8");
      await writeFile(runPath, `${JSON.stringify(providerResult, null, 2)}\n`, "utf8");
      return { result: providerResult, records, request, cacheDirectory };
    }
  };
}
