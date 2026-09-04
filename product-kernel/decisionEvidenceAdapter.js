import { buildInputHash, buildSnapshotFingerprint } from "./decisionDiscovery.js";

async function one(query, label) { const result = await query; if (result.error) throw new Error(`${label} read failed`); return result.data; }
async function source(admin, businessId, kind) {
  return one(admin.from("organic_evidence_sources").select("id,source_kind,source_class,provider_id,evidence_state,current_complete_run,current_completeness_state,evidence_as_of,last_successful_at,last_attempted_at").eq("business_id", businessId).eq("source_kind", kind).maybeSingle(), `${kind} source`);
}
async function run(admin, businessId, sourceRow, runId) {
  if (!sourceRow || !runId) return null;
  return one(admin.from("organic_evidence_runs").select("id,state,completeness_state,retrieved_at,evidence_period_start,evidence_period_end,completed_at,error_code,source_version,provider_version").eq("business_id", businessId).eq("source_id", sourceRow.id).eq("id", runId).maybeSingle(), "evidence run");
}
async function latest(admin, businessId, sourceRow) {
  if (!sourceRow) return null;
  return one(admin.from("organic_evidence_runs").select("id,state,completeness_state,retrieved_at,evidence_period_start,evidence_period_end,completed_at,error_code,source_version,provider_version").eq("business_id", businessId).eq("source_id", sourceRow.id).order("id", { ascending: false }).limit(1).maybeSingle(), "latest evidence run");
}

export async function loadDiscoveryEvidence({ admin, businessId }) {
  const [business, store, siteSource, gscSource, externalSource] = await Promise.all([
    one(admin.from("businesses").select("id,status").eq("id", businessId).maybeSingle(), "business"),
    one(admin.from("commerce_stores").select("id,provider,canonical_base_url,current_generation,sync_state,last_successful_at").eq("business_id", businessId).eq("provider", "woocommerce").maybeSingle(), "commerce store"),
    source(admin, businessId, "site"), source(admin, businessId, "search_console"), source(admin, businessId, "external_search")
  ]);
  if (!business || business.status !== "active") throw new Error("business unavailable");
  const [siteRun, siteLatest, gscRun, externalRun, externalLatest] = await Promise.all([
    run(admin, businessId, siteSource, siteSource?.current_complete_run), latest(admin, businessId, siteSource), run(admin, businessId, gscSource, gscSource?.current_complete_run), run(admin, businessId, externalSource, externalSource?.current_complete_run), latest(admin, businessId, externalSource)
  ]);
  const generation = store?.current_generation ? await one(admin.from("commerce_sync_generations").select("id,state,started_at,completed_at,snapshot_kind").eq("id", store.current_generation).eq("store_id", store.id).maybeSingle(), "commerce generation") : null;
  const [products, categories, links, pages, gscRows, externalRows] = await Promise.all([
    store?.current_generation ? one(admin.from("commerce_products").select("id,name,slug,canonical_url,regular_price,current_price,sale_price,stock_quantity,stock_status").eq("business_id", businessId).eq("store_id", store.id).eq("generation_id", store.current_generation), "products") : [],
    store?.current_generation ? one(admin.from("commerce_categories").select("id,name,slug,parent_source_id").eq("business_id", businessId).eq("store_id", store.id).eq("generation_id", store.current_generation), "categories") : [],
    store?.current_generation ? one(admin.from("commerce_product_categories").select("product_id,category_id").eq("store_id", store.id).eq("generation_id", store.current_generation), "commerce links") : [],
    siteRun ? one(admin.from("organic_site_inspected_pages").select("id,requested_url,final_url,http_status,canonical_state,robots_allowed,meta_noindex,page_type,title,meta_description,h1,internal_links,retrieved_at,limitation,status").eq("business_id", businessId).eq("run_id", siteRun.id).order("id"), "site pages") : [],
    gscRun ? one(admin.from("organic_search_console_observations").select("id,grain,query,page_url,clicks,impressions,ctr,average_position,observed_date,observed_start_date,observed_end_date,retrieved_at,evidence_as_of,completeness,provider_limitations").eq("business_id", businessId).eq("run_id", gscRun.id).order("id").limit(2000), "GSC observations") : [],
    externalLatest ? one(admin.from("organic_external_observations").select("id,observation_type,query_text,search_volume,rank_group,rank_absolute,result_url,result_domain,result_title,result_description,location_code,language_code,device,observed_at,retrieved_at,completeness,limitations,seed_id").eq("business_id", businessId).eq("run_id", externalLatest.id).order("id").limit(2000), "external observations") : []
  ]);
  const sitePageRows = pages.map(row => ({ id: String(row.id), url: row.final_url || row.requested_url, type: row.page_type, title: row.title, h1: Array.isArray(row.h1) ? row.h1[0] || null : row.h1, canonical: row.canonical_state, indexable: row.status === "inspected" && row.meta_noindex !== true && row.robots_allowed !== false, internal_links: Array.isArray(row.internal_links) ? row.internal_links : [], retrieved_at: row.retrieved_at, limitation: row.limitation, source_run_or_generation_reference: String(siteRun?.id || "") }));
  const pageIdsByUrl = new Map(sitePageRows.map(p => [p.url, p.id]));
  const packet = {
    snapshot_id: null,
    business: { id: business.id, market: business.market || "GB", language: business.language || "en" },
    commerce: { state: store?.sync_state === "complete" && generation?.state === "complete" ? "available" : "unavailable", store_id: store?.id || null, generation_id: generation?.id || null, products, categories, relations: links.map(link => ({ ...link, id: String(generation?.id || store?.current_generation) + ":" + link.product_id + ":" + link.category_id, source_run_or_generation_reference: generation?.id || store?.current_generation || null })) },
    site: { state: siteRun?.state === "complete" ? "available" : siteLatest?.state === "partial" ? "partial" : "missing", selected_run_id: siteRun?.id || null, pages: sitePageRows, limitations: siteSource?.evidence_state === "partial" ? ["latest_attempt_partial_primary_complete_or_lkg_preserved"] : [] },
    search_console: { state: gscRun?.state === "complete" ? "available" : "missing", selected_run_id: gscRun?.id || null, rows: gscRows.map(row => ({ ...row, source_record_id: String(row.id), source_run_or_generation_reference: String(gscRun?.id || ""), page_id: row.page_url ? pageIdsByUrl.get(row.page_url) || null : null })) },
    external: { state: externalRun?.state === "complete" ? "available" : externalLatest?.state === "partial" ? "partial" : "missing", selected_run_id: externalRun?.id || null, rows: Array.from(externalRows.reduce((groups, row) => { const key = String(row.seed_id) + ":" + String(row.query_text); let group = groups.get(key); if (!group) { group = { query: row.query_text, market: "GB", language: "en", search_volume: row.search_volume, observed_at: row.observed_at, source_record_ids: [], source_run_or_generation_reference: String(externalLatest?.id || ""), serp: [] }; groups.set(key, group); } group.source_record_ids.push(String(row.id)); if (row.observation_type === "serp_organic_result") group.serp.push({ rank: row.rank_absolute || row.rank_group, url: row.result_url, domain: row.result_domain, title: row.result_title, description: row.result_description, source_record_id: String(row.id) }); return groups; }, new Map()).values()).map(group => ({ ...group, source_record_id: group.source_record_ids[0] || null })) }
  };
  const sourceReferences = [store?.current_generation && { source_kind: "commerce", reference: String(store.current_generation) }, siteRun && { source_kind: "site", reference: String(siteRun.id) }, gscRun && { source_kind: "search_console", reference: String(gscRun.id) }, externalLatest && { source_kind: "external_search", reference: String(externalLatest.id) }].filter(Boolean);
  const fingerprintInput = { business_id: business.id, commerce: { store_id: store?.id, generation_id: generation?.id }, site: { selected_run_id: siteRun?.id, latest_attempt_id: siteLatest?.id, state: packet.site.state }, search_console: { selected_run_id: gscRun?.id, state: packet.search_console.state }, external: { selected_run_id: externalRun?.id, latest_attempt_id: externalLatest?.id, state: packet.external.state }, limitations: packet.site.limitations };
  return { packet: { ...packet, snapshot_id: buildSnapshotFingerprint(fingerprintInput) }, snapshotFingerprint: buildSnapshotFingerprint(fingerprintInput), inputHash: buildInputHash(packet), sourceReferences };
}
