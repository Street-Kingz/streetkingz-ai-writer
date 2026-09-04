import express from "express";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { privilegedClient } from "../product-kernel/privileged.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { correlationMiddleware } from "../product-kernel/correlation.js";
import { buildSnapshot, usableEvidenceKind } from "../product-kernel/organicEvidenceSnapshot.js";

const router = express.Router();
router.use(correlationMiddleware);

async function context(req) {
  const token = parseBearer(req.get("authorization"));
  const identity = await verifyIdentity(token);
  const client = callerClient(token);
  const account = await resolveAccount(client, identity.authUserId);
  if (!account || account.status !== "active") throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  return { client, account };
}

function handle(next) {
  return (req, res) => Promise.resolve(next(req, res)).catch(error => {
    const safe = safeError(error, req.correlationId);
    res.status(safe.status).json(safe.body);
  });
}

router.get("/api/product/organic-evidence/status", handle(async (req, res) => {
  const { client, account } = await context(req);
  const businesses = await client.from("businesses").select("id").eq("account_id", account.id).eq("status", "active");
  if (businesses.error) throw businesses.error;
  const businessIds = (businesses.data || []).map(row => row.id);
  if (!businessIds.length) return res.json({ sources: [] });
  const result = await client.from("organic_evidence_sources")
    .select("source_kind,source_class,provider_id,connection_id,evidence_state,last_attempted_at,last_successful_at,evidence_as_of,current_complete_run,current_completeness_state,active_run")
    .in("business_id", businessIds)
    .order("source_kind", { ascending: true });
  if (result.error) throw result.error;
  const gscIds = (result.data || []).map(source => source.connection_id).filter(Boolean);
  const gsc = gscIds.length ? await privilegedClient().from("gsc_connections").select("connection_id,connection_state,selected_site_url,property_type,permission_level").in("connection_id", gscIds).eq("business_id", businessIds[0]) : { data: [], error: null };
  if (gsc.error) throw gsc.error;
  res.json({ sources: (result.data || []).map(source => ({
    source_kind: source.source_kind,
    source_class: source.source_class,
    provider_id: source.provider_id,
    evidence_state: source.evidence_state,
    last_attempted_at: source.last_attempted_at,
    last_successful_at: source.last_successful_at,
    evidence_as_of: source.evidence_as_of,
    has_current_complete_evidence: Boolean(source.current_complete_run),
    current_completeness_state: source.current_complete_run ? source.current_completeness_state : null,
    collecting: Boolean(source.active_run)
    ,connection_state: gsc.data?.find(item => item.connection_id === source.connection_id)?.connection_state || null
    ,selected_property: gsc.data?.find(item => item.connection_id === source.connection_id)?.selected_site_url || null
    ,property_type: gsc.data?.find(item => item.connection_id === source.connection_id)?.property_type || null
    ,permission_level: gsc.data?.find(item => item.connection_id === source.connection_id)?.permission_level || null
  })) });
}));

async function runFor(admin, source, runId) {
  if (!runId) return null;
  const result = await admin.from("organic_evidence_runs")
    .select("id,state,completeness_state,retrieved_at,evidence_period_start,evidence_period_end,completed_at,error_code")
    .eq("id", runId).eq("source_id", source.id).eq("business_id", source.business_id).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

async function latestRun(admin, source) {
  const result = await admin.from("organic_evidence_runs")
    .select("id,state,completeness_state,retrieved_at,evidence_period_start,evidence_period_end,completed_at,error_code")
    .eq("source_id", source.id).eq("business_id", source.business_id)
    .order("id", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

async function rowCount(admin, table, businessId, runId, extra = {}) {
  if (!runId) return 0;
  let query = admin.from(table).select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("run_id", runId);
  for (const [key, value] of Object.entries(extra)) query = query.eq(key, value);
  const result = await query;
  if (result.error) throw result.error;
  return result.count || 0;
}

async function filteredCount(admin, table, filters) {
  let query = admin.from(table).select("id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const result = await query;
  if (result.error) throw result.error;
  return result.count || 0;
}

function runView(source, run, count) {
  const selected = usableEvidenceKind(source, run, count);
  return {
    reference: run?.id || source?.current_complete_run || null,
    selection: selected,
    state: run?.state || null,
    completeness: run?.completeness_state || null,
    evidence_as_of: source?.evidence_as_of || null,
    retrieved_at: run?.retrieved_at || null,
    completed_at: run?.completed_at || null,
    limitation: run?.error_code || null,
    row_count: count
  };
}

router.get("/api/product/organic-evidence/snapshot", handle(async (req, res) => {
  const { client, account } = await context(req);
  const businessResult = await client.from("businesses").select("id").eq("account_id", account.id).eq("status", "active").maybeSingle();
  if (businessResult.error) throw businessResult.error;
  if (!businessResult.data) throw new ProductError("BUSINESS_NOT_FOUND", "Business is not provisioned.", 404);
  const businessId = businessResult.data.id;
  const admin = privilegedClient();
  const [storeResult, sourcesResult] = await Promise.all([
    admin.from("commerce_stores").select("id,connection_id,provider,canonical_base_url,current_generation,sync_state,last_attempted_at,last_successful_at").eq("business_id", businessId).eq("provider", "woocommerce").maybeSingle(),
    admin.from("organic_evidence_sources").select("id,business_id,source_class,source_kind,provider_id,connection_id,evidence_state,current_complete_run,current_completeness_state,evidence_as_of,last_successful_at,last_attempted_at,active_run").eq("business_id", businessId)
  ]);
  if (storeResult.error || sourcesResult.error) throw storeResult.error || sourcesResult.error;
  const sourceByKind = Object.fromEntries((sourcesResult.data || []).map(source => [source.source_kind, source]));
  const store = storeResult.data;
  const generation = store?.current_generation ? await admin.from("commerce_sync_generations").select("id,state,started_at,completed_at").eq("id", store.current_generation).eq("store_id", store.id).maybeSingle() : { data: null, error: null };
  if (generation.error) throw generation.error;
  const [productCount, categoryCount] = store?.current_generation ? await Promise.all([
    filteredCount(admin, "commerce_products", { business_id: businessId, store_id: store.id, generation_id: store.current_generation }),
    filteredCount(admin, "commerce_categories", { business_id: businessId, store_id: store.id, generation_id: store.current_generation })
  ]) : [0, 0];
  const siteSource = sourceByKind.site;
  const gscSource = sourceByKind.search_console;
  const externalSource = sourceByKind.external_search;
  const [sitePrimary, siteLatest, gscPrimary, gscLatest, externalPrimary, externalLatest] = await Promise.all([
    siteSource ? runFor(admin, siteSource, siteSource.current_complete_run) : null,
    siteSource ? latestRun(admin, siteSource) : null,
    gscSource ? runFor(admin, gscSource, gscSource.current_complete_run) : null,
    gscSource ? latestRun(admin, gscSource) : null,
    externalSource ? runFor(admin, externalSource, externalSource.current_complete_run) : null,
    externalSource ? latestRun(admin, externalSource) : null
  ]);
  const [sitePrimaryCount, siteLatestCount, gscQueryCount, gscPageCount, gscTrendCount, externalKeywordCount, externalSerpCount] = await Promise.all([
    rowCount(admin, "organic_site_inspected_pages", businessId, sitePrimary?.id),
    rowCount(admin, "organic_site_inspected_pages", businessId, siteLatest?.id),
    rowCount(admin, "organic_search_console_observations", businessId, gscPrimary?.id, { grain: "query" }),
    rowCount(admin, "organic_search_console_observations", businessId, gscPrimary?.id, { grain: "page" }),
    rowCount(admin, "organic_search_console_observations", businessId, gscPrimary?.id, { grain: "trend" }),
    rowCount(admin, "organic_external_observations", businessId, externalLatest?.id, { observation_type: "keyword_idea" }),
    rowCount(admin, "organic_external_observations", businessId, externalLatest?.id, { observation_type: "serp_organic_result" })
  ]);
  const gscConnection = gscSource?.connection_id ? await admin.from("gsc_connections").select("connection_state,selected_site_url,property_type,permission_level").eq("connection_id", gscSource.connection_id).eq("business_id", businessId).maybeSingle() : { data: null, error: null };
  if (gscConnection.error) throw gscConnection.error;
  const siteView = runView(siteSource, sitePrimary, sitePrimaryCount);
  const externalView = runView(externalSource, externalPrimary, externalKeywordCount + externalSerpCount);
  externalView.selection = externalPrimary?.state === "complete" ? externalView.selection : (externalKeywordCount + externalSerpCount ? "usable_partial" : "none");
  const snapshot = buildSnapshot({
    business: businessResult.data,
    commerce: { selected_evidence: store?.sync_state === "complete" && generation.data?.state === "complete" ? "usable" : "none", store: store ? { reference: store.id, provider: store.provider, canonical_base_url: store.canonical_base_url, sync_state: store.sync_state, current_generation: store.current_generation, last_successful_at: store.last_successful_at } : null, generation: generation.data, counts: { products: productCount, categories: categoryCount }, limitations: store ? [] : ["commerce_unavailable"] },
    site: { source_state: siteSource?.evidence_state || "unavailable", primary: siteView, latest_attempt: siteLatest && siteLatest.id !== sitePrimary?.id ? runView(siteSource, siteLatest, siteLatestCount) : null, limitations: siteSource?.evidence_state === "partial" ? ["latest_attempt_partial_primary_complete_or_lkg_preserved"] : [] },
    searchConsole: { source_state: gscSource?.evidence_state || "not_connected", connection_state: gscConnection.data?.connection_state || "not_connected", property: gscConnection.data ? { identity: gscConnection.data.selected_site_url, type: gscConnection.data.property_type, permission: gscConnection.data.permission_level } : null, primary: runView(gscSource, gscPrimary, gscQueryCount + gscPageCount + gscTrendCount), grains: { query: gscQueryCount, page: gscPageCount, trend: gscTrendCount }, limitations: gscSource ? ["provider_limited_detail"] : ["not_connected"] },
    external: { provider: externalSource?.provider_id || "dataforseo", source_state: externalSource?.evidence_state || "unavailable", primary: externalView, latest_attempt: externalLatest && externalLatest.id !== externalPrimary?.id ? runView(externalSource, externalLatest, externalKeywordCount + externalSerpCount) : null, counts: { keyword_ideas: externalKeywordCount, serp_organic: externalSerpCount }, limitations: externalSource?.evidence_state === "partial" ? ["provider_malformed_response_partial_run"] : ["not_collected"] },
    snapshotGeneratedAt: new Date().toISOString()
  });
  res.json(snapshot);
}));

export default router;
