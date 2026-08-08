import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SCHEMA_VERSION } from "../contracts/schemas.js";
import { createEvidenceId, createRequestFingerprint, sha256, stableId } from "../core/canonical.js";
import { assertValid, validateEvidenceRecord, validateProviderRequest, validateProviderResult } from "../validation/evidence.js";
import { DataForSeoProviderError } from "./dataForSeoKeywordIdeas.js";

export const DATAFORSEO_SERP_ADVANCED_ENDPOINT = "/v3/serp/google/organic/live/advanced";
const PROVIDER_ID = "dataforseo_google_organic_serp_advanced";
const PROVIDER_VERSION = "1.0.0";
const NORMALISER_VERSION = "1.0.0";
const DEFAULT_MAX_KEYWORDS = 5;
const ESTIMATED_COST_PER_TASK_USD = 0.002;
const DISTINCTIVE_PRODUCT_TERMS = new Set(["dry", "drying", "microfiber", "towel"]);
const OUT_OF_MARKET_MODIFIERS = new Set(["australia", "canada", "india", "ireland", "nz", "usa"]);
const HANDLED_TYPES = new Set([
  "organic", "people_also_ask", "related_searches", "featured_snippet", "video", "images",
  "discussions_and_forums", "shopping", "popular_products", "product_considerations", "refine_products",
  "ai_overview", "answer_box", "knowledge_graph", "local_pack", "top_stories", "short_videos", "perspectives"
]);

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

function normaliseText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll("microfibre", "microfiber")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularToken(token) {
  if (token === "towels" || token === "cars") return token.slice(0, -1);
  return token;
}

function tokens(value) {
  return normaliseText(value).split(" ").filter(Boolean).map(singularToken);
}

function duplicateSignature(keyword) {
  return [...new Set(tokens(keyword).filter((token) => !["for", "the", "a", "of"].includes(token)))]
    .sort()
    .join(" ");
}

function nearDuplicate(first, second) {
  const a = new Set(first);
  const b = new Set(second);
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 && intersection / union >= 0.8;
}

function numericDescending(value) {
  return Number.isFinite(Number(value)) ? Number(value) : -1;
}

function numericAscending(value) {
  return Number.isFinite(Number(value)) ? Number(value) : Number.MAX_SAFE_INTEGER;
}

function candidateRank(a, b) {
  return b.product_term_matches.length - a.product_term_matches.length ||
    Number(b.exact_seed) - Number(a.exact_seed) ||
    numericDescending(b.metrics.monthly_search_volume) - numericDescending(a.metrics.monthly_search_volume) ||
    numericAscending(a.metrics.keyword_difficulty) - numericAscending(b.metrics.keyword_difficulty) ||
    a.keyword.localeCompare(b.keyword, "en") ||
    a.source_evidence_id.localeCompare(b.source_evidence_id, "en");
}

export function selectSerpShortlist({ evidence, maximum = DEFAULT_MAX_KEYWORDS }) {
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > DEFAULT_MAX_KEYWORDS) {
    throw new DataForSeoProviderError(`SERP shortlist maximum must be an integer from 1 to ${DEFAULT_MAX_KEYWORDS}.`, "CONFIGURATION");
  }
  const productRecords = evidence.records.filter((record) => record.evidence_type === "product_fact");
  const seedTexts = productRecords
    .filter((record) => ["product.name", "product.category_type"].includes(record.value?.field_path))
    .map((record) => normaliseText(record.value.value));
  const productTerms = new Set(seedTexts.flatMap(tokens).filter((token) => DISTINCTIVE_PRODUCT_TERMS.has(token)));
  const candidates = evidence.records
    .filter((record) => record.evidence_type === "keyword_idea" && typeof record.value?.keyword === "string")
    .map((record) => {
      const keyword = normaliseText(record.value.keyword);
      const keywordTokens = new Set(tokens(keyword));
      const productTermMatches = [...productTerms].filter((term) => keywordTokens.has(term)).sort();
      return {
        keyword,
        source_evidence_id: record.evidence_id,
        product_term_matches: productTermMatches,
        exact_seed: seedTexts.includes(keyword),
        duplicate_signature: duplicateSignature(keyword),
        canonical_tokens: duplicateSignature(keyword).split(" ").filter(Boolean),
        out_of_market_modifiers: [...keywordTokens].filter((term) => OUT_OF_MARKET_MODIFIERS.has(term)).sort(),
        metrics: {
          monthly_search_volume: record.value.monthly_search_volume ?? null,
          keyword_difficulty: record.value.keyword_difficulty ?? null,
          search_intent: record.value.search_intent ?? record.value.search_intent_info?.main_intent ?? null,
          cpc_usd: record.value.cpc_usd ?? null,
          paid_competition_level: record.value.paid_competition_level ?? null
        }
      };
    })
    .sort(candidateRank);

  const retained = [];
  const decisions = [];
  for (const candidate of candidates) {
    let status = "excluded";
    let reason;
    const duplicate = retained.find((entry) => nearDuplicate(candidate.canonical_tokens, entry.canonical_tokens));
    if (candidate.out_of_market_modifiers.length) {
      reason = `Excluded because it contains an out-of-market modifier (${candidate.out_of_market_modifiers.join(", ")}) for the United Kingdom request.`;
    } else if (!candidate.product_term_matches.length && !candidate.exact_seed) {
      reason = "Excluded because it has no distinctive product-term relationship to the source product.";
    } else if (duplicate) {
      reason = `Excluded as a near-duplicate of “${duplicate.keyword}”.`;
    } else if (retained.length >= maximum) {
      reason = `Excluded because the deterministic shortlist maximum of ${maximum} was reached by higher-ranked relevant candidates.`;
    } else {
      status = "retained";
      reason = `Retained for its product-term relationship (${candidate.product_term_matches.join(", ") || "exact seed"})` +
        ` with available demand${candidate.metrics.monthly_search_volume === null ? " unavailable" : ` ${candidate.metrics.monthly_search_volume}`}` +
        ` and difficulty${candidate.metrics.keyword_difficulty === null ? " unavailable" : ` ${candidate.metrics.keyword_difficulty}`}.`;
      retained.push(candidate);
    }
    decisions.push({ ...candidate, status, reason });
  }

  return {
    schema_version: SCHEMA_VERSION,
    artifact_type: "serp_keyword_shortlist",
    selection_version: "1.0.0",
    maximum,
    candidates_available: candidates.length,
    selection_method: "Distinctive product-term eligibility; exact seed relationship; product-term coverage; search volume descending; keyword difficulty ascending as a tie-breaker; lexical stability; near-duplicate collapse.",
    selected: decisions.filter((decision) => decision.status === "retained"),
    decisions
  };
}

function parseResponse(rawBody, keyword) {
  let response;
  try {
    response = JSON.parse(rawBody);
  } catch (error) {
    throw new DataForSeoProviderError(`DataForSEO SERP response for “${keyword}” is malformed JSON: ${error.message}`, "MALFORMED_RESPONSE");
  }
  if (!response || response.status_code !== 20000 || !Array.isArray(response.tasks) || response.tasks.length !== 1) {
    throw new DataForSeoProviderError(`DataForSEO SERP response for “${keyword}” has an invalid top-level result.`, "MALFORMED_RESPONSE");
  }
  const task = response.tasks[0];
  if (task.status_code !== 20000) {
    throw new DataForSeoProviderError(`DataForSEO SERP task failed for “${keyword}”: ${task.status_message || task.status_code}.`, "TASK_ERROR", {
      task_id: task.id,
      cost_usd: task.cost,
      keyword
    });
  }
  if (!Array.isArray(task.result)) {
    throw new DataForSeoProviderError(`DataForSEO SERP task result for “${keyword}” must be an array.`, "MALFORMED_RESPONSE");
  }
  const result = task.result[0] || { keyword, items: [], item_types: [] };
  if (!Array.isArray(result.items)) {
    throw new DataForSeoProviderError(`DataForSEO SERP items for “${keyword}” must be an array.`, "MALFORMED_RESPONSE");
  }
  return { response, task, result };
}

function confidence() {
  return {
    scoring_version: "1.0.0",
    score: 0.765,
    components: { source_reliability: 0.9, directness: 1, corroboration: 0, freshness: 1, extraction_integrity: 1 },
    rationale: "Structured SERP observation returned by the DataForSEO official API."
  };
}

function evidenceType(type) {
  if (type === "organic") return "serp_organic_result";
  if (type === "people_also_ask") return "serp_people_also_ask";
  if (type === "related_searches") return "serp_related_search";
  if (type === "featured_snippet") return "serp_featured_snippet";
  if (type === "video" || type === "short_videos") return "serp_video";
  if (type === "images") return "serp_images";
  if (type === "discussions_and_forums") return "serp_discussion";
  if (["shopping", "popular_products", "product_considerations", "refine_products"].includes(type)) return "serp_product_element";
  if (type === "ai_overview") return "serp_ai_overview";
  return "serp_feature";
}

function flattenItem(item, itemIndex) {
  if (["people_also_ask", "related_searches"].includes(item.type) && Array.isArray(item.items)) {
    return item.items.map((child, childIndex) => ({ item: child, type: item.type, locator: `/tasks/0/result/0/items/${itemIndex}/items/${childIndex}` }));
  }
  return [{ item, type: item.type, locator: `/tasks/0/result/0/items/${itemIndex}` }];
}

function itemValue(type, item, keyword) {
  const common = {
    keyword,
    serp_item_type: type,
    title: item.title ?? item.question ?? null,
    description: item.description ?? item.text ?? null,
    url: item.url ?? null,
    domain: item.domain ?? null,
    rank_group: item.rank_group ?? null,
    rank_absolute: item.rank_absolute ?? null
  };
  if (type === "people_also_ask") return { ...common, question: item.title ?? item.question ?? null };
  if (type === "related_searches") return { ...common, related_query: item.title ?? item.keyword ?? null };
  return common;
}

function normaliseTask({ task, result, request, shortlistEntry, providerRunId, retrievedAt, rawReference }) {
  const keyword = shortlistEntry.keyword;
  const unknownTypes = [...new Set(result.items.map((item) => item?.type).filter((type) => typeof type === "string" && !HANDLED_TYPES.has(type)))].sort();
  const records = [];
  for (const [itemIndex, parent] of result.items.entries()) {
    if (!HANDLED_TYPES.has(parent?.type)) continue;
    for (const flattened of flattenItem(parent, itemIndex)) {
      const value = itemValue(flattened.type, flattened.item, keyword);
      const sourceRecordId = `${keyword}:${flattened.locator}:${flattened.type}`;
      const record = {
        evidence_id: createEvidenceId({ providerId: PROVIDER_ID, evidenceType: evidenceType(flattened.type), subjectId: request.subject_id, sourceRecordId, value }),
        provider_id: PROVIDER_ID,
        provider_run_id: providerRunId,
        evidence_type: evidenceType(flattened.type),
        subject_id: request.subject_id,
        seed_ids: [stableId("seed", { kind: "serp_keyword", text: keyword, origin_evidence_ids: [shortlistEntry.source_evidence_id] })],
        query_or_question: keyword,
        value,
        context: {
          market: request.scope.market,
          language: request.scope.language,
          location_code: request.parameters.location_code,
          language_code: request.parameters.language_code,
          device: request.parameters.device,
          search_engine: request.parameters.search_engine,
          check_url: result.check_url ?? null
        },
        observed_at: result.datetime || retrievedAt,
        retrieved_at: retrievedAt,
        provenance: {
          provider_id: PROVIDER_ID,
          provider_version: PROVIDER_VERSION,
          source_owner: "DataForSEO",
          source_url: `https://api.dataforseo.com${DATAFORSEO_SERP_ADVANCED_ENDPOINT}`,
          source_record_id: sourceRecordId,
          source_task_id: task.id,
          query_seed: keyword,
          market: request.scope.market,
          language: request.scope.language,
          observed_at: result.datetime || retrievedAt,
          retrieved_at: retrievedAt,
          raw_artifact: rawReference,
          locator: { type: "json_pointer", value: flattened.locator },
          extraction_method: "official_api",
          normaliser_version: NORMALISER_VERSION,
          parent_evidence_ids: [shortlistEntry.source_evidence_id],
          terms_classification: "paid_api_response"
        },
        confidence: confidence(),
        raw_ref: rawReference,
        normaliser_version: NORMALISER_VERSION,
        status: "active"
      };
      records.push(assertValid(`DataForSEO SERP evidence ${sourceRecordId}`, record, validateEvidenceRecord));
    }
  }
  const types = new Set(result.items.map((item) => item?.type).filter(Boolean));
  const categories = {
    demand_metrics: true,
    difficulty: shortlistEntry.metrics.keyword_difficulty !== null,
    organic_competitors: types.has("organic"),
    people_also_ask: types.has("people_also_ask"),
    related_searches: types.has("related_searches"),
    serp_features: [...types].filter((type) => type !== "organic").sort()
  };
  return { records: records.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id)), unknownTypes, categories };
}

export function createDataForSeoSerpAdvancedProvider({ client, maxKeywords = DEFAULT_MAX_KEYWORDS, maxCostUsd } = {}) {
  return {
    id: PROVIDER_ID,
    version: PROVIDER_VERSION,
    evidenceTypes: ["serp_organic_result", "serp_people_also_ask", "serp_related_search", "serp_feature"],
    cachePolicy: { owner: PROVIDER_ID, freshness: "7_days" },

    async createRequest({ productFactsPath, evidenceArtifactPath, scope, approval }) {
      if (approval?.status !== "approved") throw new DataForSeoProviderError("Approved inputs are required.", "CONFIGURATION");
      if (!evidenceArtifactPath) throw new DataForSeoProviderError("Keyword Ideas evidence is required.", "CONFIGURATION");
      const absoluteFactsPath = path.resolve(productFactsPath);
      const absoluteEvidencePath = path.resolve(evidenceArtifactPath);
      const [factsRaw, evidenceRaw] = await Promise.all([readFile(absoluteFactsPath, "utf8"), readFile(absoluteEvidencePath, "utf8")]);
      const facts = await readJson(absoluteFactsPath, "Product facts artifact");
      const evidence = await readJson(absoluteEvidencePath, "Keyword Ideas evidence artifact");
      if (facts.artifact_type !== "product_facts" || evidence.artifact_type !== "research_evidence") {
        throw new DataForSeoProviderError("Phase 2 facts and research evidence artifacts are required.", "INVALID_INPUT");
      }
      if (evidence.subject?.product_facts_sha256 !== sha256(factsRaw)) {
        throw new DataForSeoProviderError("Evidence artifact does not reference the supplied product facts.", "INVALID_INPUT");
      }
      const maximum = Number(maxKeywords);
      const shortlist = selectSerpShortlist({ evidence, maximum });
      if (!shortlist.selected.length) throw new DataForSeoProviderError("No product-relevant Keyword Ideas were available for SERP inspection.", "INVALID_INPUT");
      const request = {
        schema_version: SCHEMA_VERSION,
        artifact_type: "provider_request",
        provider_id: PROVIDER_ID,
        subject_id: evidence.subject.subject_id,
        product_facts_ref: { path: portablePath(absoluteFactsPath), sha256: sha256(factsRaw), artifact_type: facts.artifact_type, schema_version: facts.schema_version },
        evidence_ref: { path: portablePath(absoluteEvidencePath), sha256: sha256(evidenceRaw) },
        scope: { market: scope?.market || "GB", language: scope?.language || "en-GB" },
        approval: { status: "approved", asserted_by: approval.asserted_by || "local_user" },
        endpoint: DATAFORSEO_SERP_ADVANCED_ENDPOINT,
        parameters: { location_code: 2840, language_code: "en", device: "desktop", os: "windows", search_engine: "google", search_type: "organic", response_format: "advanced", depth: 10 },
        shortlist
      };
      assertValid("DataForSEO SERP Advanced request", request, validateProviderRequest);
      return { request, facts, evidence, shortlist };
    },

    requestFingerprint(request) {
      return createRequestFingerprint({
        provider_id: PROVIDER_ID,
        provider_version: PROVIDER_VERSION,
        normaliser_version: NORMALISER_VERSION,
        endpoint: request.endpoint,
        keywords: request.shortlist.selected.map((entry) => entry.keyword),
        parameters: request.parameters
      });
    },

    keywordFingerprint(request, keyword) {
      return createRequestFingerprint({
        provider_id: PROVIDER_ID,
        provider_version: PROVIDER_VERSION,
        normaliser_version: NORMALISER_VERSION,
        endpoint: request.endpoint,
        keyword,
        parameters: request.parameters
      });
    },

    async run({ preparedRequest, cacheRoot, now }) {
      const { request, shortlist } = preparedRequest;
      const requestFingerprint = this.requestFingerprint(request);
      const providerRoot = path.join(path.resolve(cacheRoot), PROVIDER_ID);
      const aggregateDirectory = path.join(providerRoot, "runs", requestFingerprint);
      const shortlistPath = path.join(aggregateDirectory, "shortlist.json");
      const normalisedPath = path.join(aggregateDirectory, "normalised.json");
      const runPath = path.join(aggregateDirectory, "run.json");
      await mkdir(aggregateDirectory, { recursive: true });
      const shortlistText = `${JSON.stringify(shortlist, null, 2)}\n`;
      await writeFile(shortlistPath, shortlistText, "utf8");

      const cachedTasks = [];
      const misses = [];
      for (const entry of shortlist.selected) {
        const fingerprint = this.keywordFingerprint(request, entry.keyword);
        const directory = path.join(providerRoot, "keywords", fingerprint);
        const normalised = await readJsonIfPresent(path.join(directory, "normalised.json"));
        const taskRun = await readJsonIfPresent(path.join(directory, "run.json"));
        if (normalised && taskRun) cachedTasks.push({ entry, directory, normalised, taskRun });
        else misses.push({ entry, directory, fingerprint });
      }

      const costLimit = Number(maxCostUsd ?? client?.config?.maxCostUsd);
      if (!Number.isFinite(costLimit) || costLimit <= 0) throw new DataForSeoProviderError("DataForSEO maximum cost must be positive.", "CONFIGURATION");
      const estimatedMaximum = Number((misses.length * ESTIMATED_COST_PER_TASK_USD).toFixed(6));
      if (estimatedMaximum > costLimit) {
        throw new DataForSeoProviderError(`SERP cache misses require up to $${estimatedMaximum.toFixed(4)}, above the configured maximum $${costLimit.toFixed(4)}.`, "COST_LIMIT");
      }
      if (misses.length && !client) throw new DataForSeoProviderError("DataForSEO client is not configured for SERP cache misses.", "CONFIGURATION");

      const retrievedAt = now().toISOString();
      const providerRunId = stableId("provider_run", { provider_id: PROVIDER_ID, request_fingerprint: requestFingerprint });
      const taskExecutions = [...cachedTasks];
      for (const miss of misses) {
        const payload = [{
          keyword: miss.entry.keyword,
          location_code: request.parameters.location_code,
          language_code: request.parameters.language_code,
          device: request.parameters.device,
          os: request.parameters.os,
          depth: request.parameters.depth,
          tag: miss.entry.source_evidence_id
        }];
        const transport = await client.post(request.endpoint, payload);
        const rawPath = path.join(miss.directory, "raw", "response.json");
        await mkdir(path.dirname(rawPath), { recursive: true });
        await writeFile(rawPath, transport.rawBody, "utf8");
        const rawReference = { path: `provider-cache://${PROVIDER_ID}/keywords/${miss.fingerprint}/raw/response.json`, local_path: portablePath(rawPath), sha256: sha256(transport.rawBody) };
        let parsed;
        try {
          parsed = parseResponse(transport.rawBody, miss.entry.keyword);
        } catch (error) {
          error.providerMetadata = {
            rawArtifacts: [rawReference],
            rateLimit: transport.rateLimit,
            cost: error.details?.cost_usd === undefined ? null : { currency: "USD", actual: Number(error.details.cost_usd), configured_maximum: costLimit }
          };
          throw error;
        }
        const normalisedTask = normaliseTask({ ...parsed, request, shortlistEntry: miss.entry, providerRunId, retrievedAt, rawReference });
        const taskCost = Number(parsed.task.cost ?? parsed.response.cost ?? 0);
        const taskNormalised = { keyword: miss.entry.keyword, task_id: parsed.task.id, raw_artifact: rawReference, records: normalisedTask.records, unknown_item_types: normalisedTask.unknownTypes, evidence_categories: normalisedTask.categories };
        const taskRun = { keyword: miss.entry.keyword, task_id: parsed.task.id, cost_usd: taskCost, rate_limit: transport.rateLimit, raw_artifact: rawReference, retrieved_at: retrievedAt };
        await writeFile(path.join(miss.directory, "normalised.json"), `${JSON.stringify(taskNormalised, null, 2)}\n`, "utf8");
        await writeFile(path.join(miss.directory, "run.json"), `${JSON.stringify(taskRun, null, 2)}\n`, "utf8");
        taskExecutions.push({ entry: miss.entry, directory: miss.directory, normalised: taskNormalised, taskRun });
      }

      taskExecutions.sort((a, b) => a.entry.keyword.localeCompare(b.entry.keyword, "en"));
      const records = taskExecutions.flatMap((execution) => execution.normalised.records).sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
      const rawArtifacts = taskExecutions.map((execution) => execution.taskRun.raw_artifact);
      const unknownTypes = [...new Set(taskExecutions.flatMap((execution) => execution.normalised.unknown_item_types || []))].sort();
      const totalCost = Number(taskExecutions.reduce((sum, execution) => sum + Number(execution.taskRun.cost_usd || 0), 0).toFixed(6));
      const additionalCost = Number(taskExecutions.filter((execution) => misses.some((miss) => miss.entry.keyword === execution.entry.keyword)).reduce((sum, execution) => sum + Number(execution.taskRun.cost_usd || 0), 0).toFixed(6));
      const normalised = { schema_version: SCHEMA_VERSION, artifact_type: "normalised_provider_evidence", provider_id: PROVIDER_ID, provider_version: PROVIDER_VERSION, provider_run_id: providerRunId, request_fingerprint: requestFingerprint, shortlist_ref: portablePath(shortlistPath), evidence_categories: Object.fromEntries(taskExecutions.map((execution) => [execution.entry.keyword, execution.normalised.evidence_categories])), unknown_item_types: unknownTypes, records };
      const normalisedText = `${JSON.stringify(normalised, null, 2)}\n`;
      const providerResult = {
        schema_version: SCHEMA_VERSION,
        artifact_type: "provider_result",
        provider_id: PROVIDER_ID,
        provider_version: PROVIDER_VERSION,
        provider_run_id: providerRunId,
        request_fingerprint: requestFingerprint,
        status: "complete",
        cache: { owner: PROVIDER_ID, hit: misses.length === 0, directory: portablePath(providerRoot), policy: "7_days", hits: cachedTasks.length, misses: misses.length },
        raw_artifacts: rawArtifacts,
        normalised_artifact: { path: `provider-cache://${PROVIDER_ID}/runs/${requestFingerprint}/normalised.json`, local_path: portablePath(normalisedPath), sha256: sha256(normalisedText) },
        shortlist_artifact: { path: `provider-cache://${PROVIDER_ID}/runs/${requestFingerprint}/shortlist.json`, local_path: portablePath(shortlistPath), sha256: sha256(shortlistText) },
        evidence_record_ids: records.map((record) => record.evidence_id),
        started_at: retrievedAt,
        completed_at: retrievedAt,
        rate_limit: taskExecutions.map((execution) => execution.taskRun.rate_limit).filter(Boolean).at(-1) || null,
        cost: { currency: "USD", actual: totalCost, additional: additionalCost, configured_maximum: costLimit, deterministic_request_maximum: estimatedMaximum, estimated_per_task: ESTIMATED_COST_PER_TASK_USD },
        paid_requests: misses.length,
        source_tasks: taskExecutions.map((execution) => ({ keyword: execution.entry.keyword, id: execution.taskRun.task_id, cost_usd: execution.taskRun.cost_usd })),
        evidence_categories: normalised.evidence_categories,
        unknown_item_types: unknownTypes,
        errors: [],
        warnings: unknownTypes.map((type) => `Unhandled SERP item type preserved in raw evidence: ${type}`)
      };
      assertValid("DataForSEO SERP Advanced provider result", providerResult, validateProviderResult);
      await writeFile(normalisedPath, normalisedText, "utf8");
      await writeFile(runPath, `${JSON.stringify(providerResult, null, 2)}\n`, "utf8");
      return { result: providerResult, records, request, cacheDirectory: providerRoot, shortlist };
    }
  };
}
