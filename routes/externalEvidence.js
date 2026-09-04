import express from "express";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { privilegedClient } from "../product-kernel/privileged.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { correlationMiddleware } from "../product-kernel/correlation.js";
import {
  createDataForSeoTransport, deriveDirectSeeds, requestIdentity,
  normalizeKeywordResponse, normalizeSerpResponse,
  DATAFORSEO_KEYWORD_IDEAS_ENDPOINT, DATAFORSEO_SERP_ENDPOINT,
  EXTERNAL_EVIDENCE_VERSION, EXTERNAL_LIMITS, estimatedRequestCost, isReusable, safeDatabaseDiagnostic
} from "../product-kernel/externalEvidence.js";

const router = express.Router();
router.use(correlationMiddleware);

async function context(req) {
  const token = parseBearer(req.get("authorization"));
  const identity = await verifyIdentity(token);
  const client = callerClient(token);
  const account = await resolveAccount(client, identity.authUserId);
  if (!account || account.status !== "active") throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  const business = await client.from("businesses").select("id").eq("account_id", account.id).eq("status", "active").maybeSingle();
  if (business.error) throw business.error;
  if (!business.data) throw new ProductError("BUSINESS_NOT_FOUND", "Business is not provisioned.", 404);
  return { business: business.data, admin: privilegedClient() };
}

const handle = fn => (req, res) => Promise.resolve(fn(req, res)).catch(error => {
  const safe = safeError(error, req.correlationId);
  res.status(safe.status).json(safe.body);
});

function providerPayload(endpoint, seed) {
  if (endpoint === DATAFORSEO_KEYWORD_IDEAS_ENDPOINT) return {
    keywords: [seed.source_text], location_code: 2826, language_code: "en", limit: EXTERNAL_LIMITS.MAX_PROVIDER_IDEAS_PER_REQUEST,
    include_clickstream_data: false, include_serp_info: false
  };
  return { keyword: seed.source_text, location_code: 2826, language_code: "en", device: "desktop", depth: 10 };
}

async function readSeeds(admin, businessId) {
  const store = await admin.from("commerce_stores").select("id,current_generation,sync_state").eq("business_id", businessId).eq("provider", "woocommerce").maybeSingle();
  if (store.error || !store.data || store.data.sync_state !== "complete" || !store.data.current_generation) throw new ProductError("EXTERNAL_COMMERCE_REQUIRED", "A complete verified Business catalogue is required.", 409);
  const [products, categories, site, gsc] = await Promise.all([
    admin.from("commerce_products").select("id,name").eq("business_id", businessId).eq("store_id", store.data.id).eq("generation_id", store.data.current_generation),
    admin.from("commerce_categories").select("id,name").eq("business_id", businessId).eq("store_id", store.data.id).eq("generation_id", store.data.current_generation),
    admin.from("organic_evidence_sources").select("id,current_complete_run").eq("business_id", businessId).eq("source_kind", "site").maybeSingle(),
    admin.from("organic_evidence_sources").select("id,current_complete_run").eq("business_id", businessId).eq("source_kind", "search_console").maybeSingle()
  ]);
  if ([products, categories, site, gsc].some(result => result.error)) throw new ProductError("EXTERNAL_SEED_READ_FAILED", "Accepted Business evidence could not be read.", 503);
  const [pages, queries] = await Promise.all([
    site.data?.current_complete_run ? admin.from("organic_site_inspected_pages").select("id,title,h1").eq("business_id", businessId).eq("run_id", site.data.current_complete_run) : { data: [], error: null },
    gsc.data?.current_complete_run ? admin.from("organic_search_console_observations").select("id,query").eq("business_id", businessId).eq("run_id", gsc.data.current_complete_run).eq("grain", "query") : { data: [], error: null }
  ]);
  if (pages.error || queries.error) throw new ProductError("EXTERNAL_SEED_READ_FAILED", "Accepted Business evidence could not be read.", 503);
  return { products: products.data || [], categories: categories.data || [], pages: pages.data || [], gscQueries: queries.data || [] };
}

async function updateRequest(admin, id, values) {
  const result = await admin.from("organic_external_provider_requests").update(values).eq("id", id);
  if (result.error) throw new ProductError("EXTERNAL_LEDGER_FAILED", "External evidence request state could not be saved.", 503);
}

async function committedBusinessCost(admin, businessId) {
  const since = new Date(Date.now() - EXTERNAL_LIMITS.KEYWORD_EVIDENCE_REUSE_WINDOW_MS).toISOString();
  const result = await admin.from("organic_external_provider_requests").select("actual_cost,estimated_reserved_cost,status").eq("business_id", businessId).gte("created_at", since);
  if (result.error) throw new ProductError("EXTERNAL_LEDGER_FAILED", "External evidence cost could not be verified.", 503);
  return (result.data || []).reduce((sum, row) => sum + Number(row.actual_cost ?? row.estimated_reserved_cost ?? 0), 0);
}

async function reuseRequest(admin, previous, currentSeedDbId, currentSeed, run, retrievedAt) {
  const oldRows = await admin.from("organic_external_observations").select("*").eq("business_id", run.business_id).eq("run_id", previous.run_id).eq("seed_id", previous.seed_id).eq("observation_type", previous.request_class === "keyword_ideas" ? "keyword_idea" : "serp_organic_result");
  if (oldRows.error) throw new ProductError("EXTERNAL_REUSE_FAILED", "External evidence reuse could not be read.", 503);
  const rows = (oldRows.data || []).map(row => ({ ...row, id: undefined, run_id: run.run_id, seed_id: currentSeedDbId, retrieved_at: retrievedAt, provenance: { ...(row.provenance || {}), reused: true, reused_from_request_id: previous.id, parent_seed_id: currentSeed.seed_id }, observation_identity: `${row.observation_identity}:run:${run.run_id}` }));
  const saved = rows.length ? await admin.from("organic_external_observations").insert(rows.map(({ id, created_at, ...row }) => row)) : { error: null };
  if (saved.error) throw new ProductError("EXTERNAL_REUSE_FAILED", "External evidence reuse could not be saved.", 503);
  return rows.length;
}

router.post("/api/product/organic-evidence/external/acquire", handle(async (req, res) => {
  const { business, admin } = await context(req);
  const ensured = await admin.rpc("organic_ensure_source", { p_business_id: business.id, p_source_class: "product_connected", p_source_kind: "external_search", p_provider_id: "dataforseo", p_connection_id: null });
  if (ensured.error || !ensured.data) throw new ProductError("EXTERNAL_SOURCE_FAILED", "The external evidence source could not be prepared.", 503);
  const source = ensured.data;
  if (source.active_run) throw new ProductError("EXTERNAL_RUN_ACTIVE", "External evidence collection is already running.", 409);
  const inputs = await readSeeds(admin, business.id);
  const seeds = deriveDirectSeeds(inputs);
  const retrievedAt = new Date().toISOString();
  const begun = await admin.rpc("organic_begin_run", { p_source_id: source.id, p_correlation_id: req.correlationId, p_retrieved_at: retrievedAt, p_provider_version: EXTERNAL_EVIDENCE_VERSION, p_source_version: EXTERNAL_EVIDENCE_VERSION });
  if (begun.error || !begun.data) throw new ProductError("EXTERNAL_RUN_BEGIN_FAILED", "External evidence collection could not start.", 503);
  const run = { run_id: begun.data.id, business_id: business.id, source_id: source.id };
  const finishFailed = async error => { await admin.rpc("organic_finish_run", { p_run_id: run.run_id, p_state: "failed", p_completeness_state: "unavailable", p_error_code: String(error?.code || "EXTERNAL_COLLECTION_FAILED").replace(/[^A-Z0-9_:-]/g, "_").slice(0, 100) }); throw error instanceof ProductError ? error : new ProductError("EXTERNAL_COLLECTION_FAILED", "External evidence collection failed.", 502); };
  try {
    const seedRows = seeds.map(seed => ({ business_id: business.id, source_id: source.id, run_id: run.run_id, seed_id: seed.seed_id, source_class: seed.source_class, source_record_identity: seed.source_record_identity, source_text: seed.source_text, normalized_text: seed.normalized_text, locale: seed.locale, language_code: seed.language_code, direct_or_derived: "direct", provenance: { source_class: seed.source_class, source_record_identity: seed.source_record_identity } }));
    const insertedSeeds = seedRows.length ? await admin.from("organic_external_seeds").insert(seedRows).select("id,seed_id") : { data: [], error: null };
    if (insertedSeeds.error) throw new ProductError("EXTERNAL_SEED_PERSIST_FAILED", "External evidence seeds could not be saved.", 503);
    const seedDbIds = new Map((insertedSeeds.data || []).map(row => [row.seed_id, row.id]));
    if (!seeds.length) {
      const finish = await admin.rpc("organic_finish_run", { p_run_id: run.run_id, p_state: "complete", p_completeness_state: "empty", p_evidence_as_of: retrievedAt });
      if (finish.error) throw finish.error;
      return res.json({ status: "complete", completeness: "empty", evidence_as_of: retrievedAt, seed_count: 0, provider_requests: 0, keyword_ideas: 0, serp_results: 0 });
    }
    const transport = createDataForSeoTransport();
    let requestCount = 0; let keywordCount = 0; let serpCount = 0; let actualCost = 0; let reservedCost = 0; let failed = null; let reusedCount = 0;
    let businessCost = await committedBusinessCost(admin, business.id);
    const runDeadline = Date.now() + EXTERNAL_LIMITS.TOTAL_RUN_DEADLINE_MS;
    for (const seed of seeds) {
      for (const [endpoint, requestClass, limit, depth] of [[DATAFORSEO_KEYWORD_IDEAS_ENDPOINT, "keyword_ideas", 20, null], [DATAFORSEO_SERP_ENDPOINT, "serp_organic", null, 10]]) {
        const estimate = estimatedRequestCost(endpoint);
        const fingerprint = requestIdentity({ businessId: business.id, endpoint, seed, limit, depth });
        const reuse = await admin.from("organic_external_provider_requests").select("id,run_id,seed_id,request_class,status,completed_at").eq("business_id", business.id).eq("request_fingerprint", fingerprint).in("status", ["complete", "reused"]).order("completed_at", { ascending: false }).limit(1).maybeSingle();
        if (reuse.error) throw new ProductError("EXTERNAL_LEDGER_FAILED", "External evidence reuse could not be verified.", 503);
        if (reuse.data && isReusable(reuse.data.completed_at, endpoint)) {
          const reusedRows = await reuseRequest(admin, reuse.data, seedDbIds.get(seed.seed_id), seed, run, retrievedAt);
          const reusedLedger = await admin.from("organic_external_provider_requests").insert({ business_id: business.id, source_id: source.id, run_id: run.run_id, seed_id: seedDbIds.get(seed.seed_id), endpoint, request_class: requestClass, request_fingerprint: `${fingerprint}:run:${run.run_id}`, scope: { location_code: 2826, language_code: "en", device: endpoint === DATAFORSEO_SERP_ENDPOINT ? "desktop" : null, limit, depth }, status: "reused", estimated_reserved_cost: 0, actual_cost: 0, cache_state: "hit", provider_task_id: null, completed_at: new Date().toISOString() }).select("id").single();
          if (reusedLedger.error) throw new ProductError("EXTERNAL_LEDGER_FAILED", "External evidence reuse could not be recorded.", 503);
          requestCount += 1; reusedCount += 1; keywordCount += requestClass === "keyword_ideas" ? reusedRows : 0; serpCount += requestClass === "serp_organic" ? reusedRows : 0;
          continue;
        }
        if (Date.now() >= runDeadline || requestCount >= EXTERNAL_LIMITS.MAX_PROVIDER_REQUESTS_PER_RUN || reservedCost + estimate > EXTERNAL_LIMITS.MAX_PROVIDER_COST_USD_PER_RUN || businessCost + estimate > EXTERNAL_LIMITS.MAX_PROVIDER_COST_USD_PER_BUSINESS_PER_REFRESH_WINDOW) { failed = new ProductError("PROVIDER_COST_LIMIT", "The external evidence run reached its bounded limit.", 409); break; }
        const ledger = await admin.from("organic_external_provider_requests").insert({ business_id: business.id, source_id: source.id, run_id: run.run_id, seed_id: seedDbIds.get(seed.seed_id), endpoint, request_class: requestClass, request_fingerprint: fingerprint, scope: { location_code: 2826, language_code: "en", device: endpoint === DATAFORSEO_SERP_ENDPOINT ? "desktop" : null, limit, depth }, status: "running", estimated_reserved_cost: estimate, cache_state: "miss", started_at: new Date().toISOString() }).select("id").single();
        if (ledger.error) throw new ProductError("EXTERNAL_LEDGER_FAILED", "External evidence request could not be reserved.", 503);
        requestCount += 1;
        reservedCost += estimate;
        businessCost += estimate;
        try {
          const effectiveTimeout = Math.min(EXTERNAL_LIMITS.REQUEST_TIMEOUT_MS, Math.max(1, runDeadline - Date.now()));
          const response = await transport.post(endpoint, [providerPayload(endpoint, seed)], { timeoutMs: effectiveTimeout });
          const seedRun = { ...run, seed_id: seedDbIds.get(seed.seed_id) };
          const normalized = endpoint === DATAFORSEO_KEYWORD_IDEAS_ENDPOINT ? normalizeKeywordResponse(response.body, seed, seedRun, retrievedAt) : normalizeSerpResponse(response.body, seed, seedRun, retrievedAt);
          if (normalized.actualCost > estimate + 0.000001 || actualCost + normalized.actualCost > EXTERNAL_LIMITS.MAX_PROVIDER_COST_USD_PER_RUN || businessCost - estimate + normalized.actualCost > EXTERNAL_LIMITS.MAX_PROVIDER_COST_USD_PER_BUSINESS_PER_REFRESH_WINDOW) {
            await updateRequest(admin, ledger.data.id, { status: "failed", actual_cost: normalized.actualCost, error_code: "PROVIDER_COST_ANOMALY", completed_at: new Date().toISOString() });
            throw new ProductError("PROVIDER_COST_ANOMALY", "The external evidence provider returned an unexpected cost.", 502);
          }
          const saved = normalized.rows.length ? await admin.from("organic_external_observations").upsert(normalized.rows, { onConflict: "observation_identity", ignoreDuplicates: true }) : { error: null };
          if (saved.error) { console.error(JSON.stringify(safeDatabaseDiagnostic(saved.error, req.correlationId))); throw new ProductError("EXTERNAL_OBSERVATION_PERSIST_FAILED", "External evidence could not be saved.", 503); }
          actualCost += normalized.actualCost || 0;
          businessCost += (normalized.actualCost || 0) - estimate;
          keywordCount += endpoint === DATAFORSEO_KEYWORD_IDEAS_ENDPOINT ? normalized.rows.length : 0;
          serpCount += endpoint === DATAFORSEO_SERP_ENDPOINT ? normalized.rows.length : 0;
          await updateRequest(admin, ledger.data.id, { status: "complete", actual_cost: normalized.actualCost || 0, provider_task_id: normalized.taskId, completed_at: new Date().toISOString() });
        } catch (error) { await updateRequest(admin, ledger.data.id, { status: "failed", actual_cost: error.details?.actualCost ?? null, error_code: String(error.code || "PROVIDER_FAILURE").slice(0, 100), completed_at: new Date().toISOString() }); failed = error; break; }
      }
      if (failed) break;
    }
    if (failed) {
      if (keywordCount + serpCount > 0) {
        const partial = await admin.rpc("organic_finish_run", { p_run_id: run.run_id, p_state: "partial", p_completeness_state: "partial", p_error_code: String(failed.code || "EXTERNAL_PARTIAL").replace(/[^A-Z0-9_:-]/g, "_").slice(0, 100) });
        if (partial.error) throw partial.error;
        return res.json({ status: "partial", completeness: "partial", evidence_as_of: null, seed_count: seeds.length, provider_requests: requestCount, reused_requests: reusedCount, keyword_ideas: keywordCount, serp_results: serpCount, actual_cost_usd: Number(actualCost.toFixed(6)), limitation: failed.code || "EXTERNAL_PARTIAL" });
      }
      return finishFailed(failed);
    }
    const finish = await admin.rpc("organic_finish_run", { p_run_id: run.run_id, p_state: "complete", p_completeness_state: "complete", p_evidence_as_of: retrievedAt });
    if (finish.error) throw finish.error;
    res.json({ status: "complete", completeness: "complete", evidence_as_of: retrievedAt, seed_count: seeds.length, provider_requests: requestCount, reused_requests: reusedCount, keyword_ideas: keywordCount, serp_results: serpCount, actual_cost_usd: Number(actualCost.toFixed(6)) });
  } catch (error) { await finishFailed(error); }
}));

export default router;
