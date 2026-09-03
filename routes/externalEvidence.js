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
  EXTERNAL_EVIDENCE_VERSION, EXTERNAL_LIMITS
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

router.post("/api/product/organic-evidence/external/acquire", handle(async (req, res) => {
  const { business, admin } = await context(req);
  const ensured = await admin.rpc("organic_ensure_source", { p_business_id: business.id, p_source_class: "product_connected", p_source_kind: "external_search", p_provider_id: "dataforseo", p_connection_id: null });
  if (ensured.error || !ensured.data) throw new ProductError("EXTERNAL_SOURCE_FAILED", "The external evidence source could not be prepared.", 503);
  const source = ensured.data;
  if (source.active_run) throw new ProductError("EXTERNAL_RUN_ACTIVE", "External evidence collection is already running.", 409);
  if (source.current_complete_run && source.last_successful_at && Date.now() - Date.parse(source.last_successful_at) < EXTERNAL_LIMITS.KEYWORD_EVIDENCE_REUSE_WINDOW_MS) return res.json({ status: "reused", completeness: source.current_completeness_state, evidence_as_of: source.evidence_as_of, seed_count: 0, provider_requests: 0, keyword_ideas: 0, serp_results: 0 });
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
    let requestCount = 0; let keywordCount = 0; let serpCount = 0; let actualCost = 0; let failed = null;
    const runDeadline = Date.now() + EXTERNAL_LIMITS.TOTAL_RUN_DEADLINE_MS;
    for (const seed of seeds) {
      for (const [endpoint, requestClass, limit, depth, estimate] of [[DATAFORSEO_KEYWORD_IDEAS_ENDPOINT, "keyword_ideas", 20, null, 0.0144], [DATAFORSEO_SERP_ENDPOINT, "serp_organic", null, 10, 0.002]]) {
        if (Date.now() >= runDeadline || requestCount >= EXTERNAL_LIMITS.MAX_PROVIDER_REQUESTS_PER_RUN || actualCost + estimate > EXTERNAL_LIMITS.MAX_PROVIDER_COST_USD_PER_RUN) { failed = new ProductError("PROVIDER_COST_LIMIT", "The external evidence run reached its bounded limit.", 409); break; }
        const fingerprint = requestIdentity({ businessId: business.id, endpoint, seed, limit, depth });
        const ledger = await admin.from("organic_external_provider_requests").insert({ business_id: business.id, source_id: source.id, run_id: run.run_id, seed_id: seedDbIds.get(seed.seed_id), endpoint, request_class: requestClass, request_fingerprint: fingerprint, scope: { location_code: 2826, language_code: "en", device: endpoint === DATAFORSEO_SERP_ENDPOINT ? "desktop" : null, limit, depth }, status: "running", estimated_reserved_cost: estimate, cache_state: "miss", started_at: new Date().toISOString() }).select("id").single();
        if (ledger.error) throw new ProductError("EXTERNAL_LEDGER_FAILED", "External evidence request could not be reserved.", 503);
        requestCount += 1;
        try {
          const response = await transport.post(endpoint, [providerPayload(endpoint, seed)]);
          const normalized = endpoint === DATAFORSEO_KEYWORD_IDEAS_ENDPOINT ? normalizeKeywordResponse(response.body, seed, run, retrievedAt) : normalizeSerpResponse(response.body, seed, run, retrievedAt);
          const saved = normalized.rows.length ? await admin.from("organic_external_observations").upsert(normalized.rows, { onConflict: "observation_identity", ignoreDuplicates: true }) : { error: null };
          if (saved.error) throw new ProductError("EXTERNAL_OBSERVATION_PERSIST_FAILED", "External evidence could not be saved.", 503);
          actualCost += normalized.actualCost || 0;
          keywordCount += endpoint === DATAFORSEO_KEYWORD_IDEAS_ENDPOINT ? normalized.rows.length : 0;
          serpCount += endpoint === DATAFORSEO_SERP_ENDPOINT ? normalized.rows.length : 0;
          await updateRequest(admin, ledger.data.id, { status: "complete", actual_cost: normalized.actualCost || 0, provider_task_id: normalized.taskId, completed_at: new Date().toISOString() });
        } catch (error) { await updateRequest(admin, ledger.data.id, { status: "failed", actual_cost: error.details?.actualCost ?? null, error_code: String(error.code || "PROVIDER_FAILURE").slice(0, 100), completed_at: new Date().toISOString() }); failed = error; break; }
      }
      if (failed) break;
    }
    if (failed) { if (failed.code === "PROVIDER_COST_LIMIT") return finishFailed(failed); return finishFailed(failed); }
    const finish = await admin.rpc("organic_finish_run", { p_run_id: run.run_id, p_state: "complete", p_completeness_state: "complete", p_evidence_as_of: retrievedAt });
    if (finish.error) throw finish.error;
    res.json({ status: "complete", completeness: "complete", evidence_as_of: retrievedAt, seed_count: seeds.length, provider_requests: requestCount, keyword_ideas: keywordCount, serp_results: serpCount, actual_cost_usd: Number(actualCost.toFixed(6)) });
  } catch (error) { await finishFailed(error); }
}));

export default router;
