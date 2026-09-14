import { buildInputHash, buildSnapshotFingerprint } from "./decisionDiscovery.js";

const EVIDENCE_READ_LIMIT = 2000;
const EVIDENCE_PAGE_SIZE = 1000;

async function one(query, label) { const result = await query; if (result.error) throw new Error(`${label} read failed`); return result.data; }
function idAfter(previous, next) {
  const before = String(previous);
  const after = String(next);
  if (/^\d+$/.test(before) && /^\d+$/.test(after)) return BigInt(after) > BigInt(before);
  return after > before;
}
async function readBoundedEvidenceRows({ admin, table, columns, businessId, runId, label }) {
  const countQuery = () => admin.from(table).select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("run_id", runId);
  const countResult = await countQuery();
  if (countResult.error) throw new Error(`${label} count read failed`);
  if (!Number.isSafeInteger(countResult.count) || countResult.count < 0) throw new Error(`${label} count unavailable`);

  const expectedRows = Math.min(countResult.count, EVIDENCE_READ_LIMIT);
  const rows = [];
  const seen = new Set();
  let cursor = null;
  while (rows.length < expectedRows) {
    const pageLimit = Math.min(EVIDENCE_PAGE_SIZE, expectedRows - rows.length);
    let query = admin.from(table).select(columns).eq("business_id", businessId).eq("run_id", runId);
    if (cursor !== null) query = query.gt("id", cursor);
    const result = await query.order("id", { ascending: true }).limit(pageLimit);
    if (result.error) throw new Error(`${label} page read failed`);
    if (!Array.isArray(result.data)) throw new Error(`${label} page response invalid`);
    if (result.data.length === 0) throw new Error(`${label} unexpected empty page`);
    if (result.data.length > pageLimit) throw new Error(`${label} page exceeded requested limit`);
    if (result.data.length < pageLimit && rows.length + result.data.length < expectedRows) throw new Error(`${label} page truncated`);
    for (const row of result.data) {
      if (row.id === null || row.id === undefined) throw new Error(`${label} row identity missing`);
      const identity = String(row.id);
      if (seen.has(identity)) throw new Error(`${label} duplicate row identity`);
      if (cursor !== null && !idAfter(cursor, row.id)) throw new Error(`${label} row ordering invalid`);
      seen.add(identity);
      rows.push(row);
      cursor = row.id;
    }
  }
  if (rows.length !== expectedRows) throw new Error(`${label} selected count mismatch`);

  const finalCount = await countQuery();
  if (finalCount.error) throw new Error(`${label} final count read failed`);
  if (finalCount.count !== countResult.count) throw new Error(`${label} source count changed during read`);
  return {
    rows,
    coverage: {
      stored_count: countResult.count,
      selected_count: rows.length,
      record_limit: EVIDENCE_READ_LIMIT,
      truncated: countResult.count > EVIDENCE_READ_LIMIT,
      exhaustive: countResult.count <= EVIDENCE_READ_LIMIT
    }
  };
}
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
    one(admin.from("businesses").select("id,status,name,ecommerce_platform,primary_market,primary_language").eq("id", businessId).maybeSingle(), "business"),
    one(admin.from("commerce_stores").select("id,provider,canonical_base_url,current_generation,sync_state,last_successful_at").eq("business_id", businessId).eq("provider", "woocommerce").maybeSingle(), "commerce store"),
    source(admin, businessId, "site"), source(admin, businessId, "search_console"), source(admin, businessId, "external_search")
  ]);
  if (!business || business.status !== "active") throw new Error("business unavailable");
  const [siteRun, siteLatest, gscRun, externalRun, externalLatest] = await Promise.all([
    run(admin, businessId, siteSource, siteSource?.current_complete_run), latest(admin, businessId, siteSource), run(admin, businessId, gscSource, gscSource?.current_complete_run), run(admin, businessId, externalSource, externalSource?.current_complete_run), latest(admin, businessId, externalSource)
  ]);
  const generation = store?.current_generation ? await one(admin.from("commerce_sync_generations").select("id,state,started_at,completed_at,snapshot_kind").eq("id", store.current_generation).eq("store_id", store.id).maybeSingle(), "commerce generation") : null;
  const [products, categories, links, pages, gscRead, externalRead] = await Promise.all([
    store?.current_generation ? one(admin.from("commerce_products").select("id,name,slug,canonical_url,regular_price,current_price,sale_price,stock_quantity,stock_status").eq("business_id", businessId).eq("store_id", store.id).eq("generation_id", store.current_generation), "products") : [],
    store?.current_generation ? one(admin.from("commerce_categories").select("id,name,slug,parent_source_id").eq("business_id", businessId).eq("store_id", store.id).eq("generation_id", store.current_generation), "categories") : [],
    store?.current_generation ? one(admin.from("commerce_product_categories").select("product_id,category_id").eq("store_id", store.id).eq("generation_id", store.current_generation), "commerce links") : [],
    siteRun ? one(admin.from("organic_site_inspected_pages").select("id,requested_url,final_url,http_status,canonical_state,robots_allowed,meta_noindex,page_type,title,meta_description,h1,internal_links,retrieved_at,limitation,status").eq("business_id", businessId).eq("run_id", siteRun.id).order("id"), "site pages") : [],
    gscRun ? readBoundedEvidenceRows({ admin, table: "organic_search_console_observations", columns: "id,grain,query,page_url,clicks,impressions,ctr,average_position,observed_date,observed_start_date,observed_end_date,retrieved_at,evidence_as_of,completeness,provider_limitations", businessId, runId: gscRun.id, label: "GSC observations" }) : { rows: [], coverage: null },
    externalLatest ? readBoundedEvidenceRows({ admin, table: "organic_external_observations", columns: "id,observation_type,query_text,search_volume,rank_group,rank_absolute,result_url,result_domain,result_title,result_description,location_code,language_code,device,observed_at,retrieved_at,completeness,limitations,seed_id", businessId, runId: externalLatest.id, label: "external observations" }) : { rows: [], coverage: null }
  ]);
  const gscRows = gscRead.rows;
  const externalRows = externalRead.rows;
  const sitePageRows = pages.map(row => ({ id: String(row.id), url: row.final_url || row.requested_url, type: row.page_type, title: row.title, h1: Array.isArray(row.h1) ? row.h1[0] || null : row.h1, canonical: row.canonical_state, indexable: row.status === "inspected" && row.meta_noindex !== true && row.robots_allowed !== false, internal_links: Array.isArray(row.internal_links) ? row.internal_links : [], retrieved_at: row.retrieved_at, limitation: row.limitation, source_run_or_generation_reference: String(siteRun?.id || "") }));
  const pageIdsByUrl = new Map(sitePageRows.map(p => [p.url, p.id]));
  const providerLocaleSupported = business.primary_market === "GB" && business.primary_language === "en";
  const packet = {
    snapshot_id: null,
    business: { id: business.id, name: business.name, ecommerce_platform: business.ecommerce_platform, market: business.primary_market || null, language: business.primary_language || null },
    commerce: { state: store?.sync_state === "complete" && generation?.state === "complete" ? "available" : "unavailable", store_id: store?.id || null, generation_id: generation?.id || null, products, categories, relations: links.map(link => ({ ...link, id: String(generation?.id || store?.current_generation) + ":" + link.product_id + ":" + link.category_id, source_run_or_generation_reference: generation?.id || store?.current_generation || null })) },
    site: { state: siteRun?.state === "complete" ? "available" : siteLatest?.state === "partial" ? "partial" : "missing", selected_run_id: siteRun?.id || null, pages: sitePageRows, limitations: siteSource?.evidence_state === "partial" ? ["latest_attempt_partial_primary_complete_or_lkg_preserved"] : [] },
    search_console: { state: gscRun?.state === "complete" ? "available" : "missing", selected_run_id: gscRun?.id || null, observation_coverage: gscRead.coverage, limitations: gscRead.coverage?.truncated ? ["product_evidence_record_limit_reached"] : [], rows: gscRows.map(row => ({ ...row, source_record_id: String(row.id), source_run_or_generation_reference: String(gscRun?.id || ""), page_id: row.page_url ? pageIdsByUrl.get(row.page_url) || null : null })) },
    external: { state: !providerLocaleSupported ? "unsupported_locale" : externalRun?.state === "complete" ? "available" : externalLatest?.state === "partial" ? "partial" : "missing", selected_run_id: externalRun?.id || externalLatest?.id || null, supported_locale: { market: "GB", language: "en" }, observation_coverage: externalRead.coverage, limitations: [...(!providerLocaleSupported ? ["external_locale_unsupported"] : []), ...(externalRead.coverage?.truncated ? ["product_evidence_record_limit_reached"] : [])], rows: providerLocaleSupported ? Array.from(externalRows.reduce((groups, row) => { const key = String(row.seed_id) + ":" + String(row.query_text); let group = groups.get(key); if (!group) { group = { query: row.query_text, market: "GB", language: "en", search_volume: row.search_volume, observed_at: row.observed_at, source_record_ids: [], source_run_or_generation_reference: String(externalLatest?.id || ""), serp: [] }; groups.set(key, group); } group.source_record_ids.push(String(row.id)); if (row.observation_type === "serp_organic_result") group.serp.push({ rank: row.rank_absolute || row.rank_group, url: row.result_url, domain: row.result_domain, title: row.result_title, description: row.result_description, source_record_id: String(row.id) }); return groups; }, new Map()).values()).map(group => ({ ...group, source_record_id: group.source_record_ids[0] || null })) : [] }
  };
  const sourceReferences = [store?.current_generation && { source_kind: "commerce", reference: String(store.current_generation) }, siteRun && { source_kind: "site", reference: String(siteRun.id) }, gscRun && { source_kind: "search_console", reference: String(gscRun.id) }, externalLatest && { source_kind: "external_search", reference: String(externalLatest.id) }].filter(Boolean);
  const fingerprintInput = { business_id: business.id, commerce: { store_id: store?.id, generation_id: generation?.id }, site: { selected_run_id: siteRun?.id, latest_attempt_id: siteLatest?.id, state: packet.site.state }, search_console: { selected_run_id: gscRun?.id, state: packet.search_console.state, observation_coverage: gscRead.coverage }, external: { selected_run_id: externalRun?.id, latest_attempt_id: externalLatest?.id, state: packet.external.state, supported_locale: packet.external.supported_locale, observation_coverage: externalRead.coverage }, limitations: [...packet.site.limitations, ...(packet.search_console.limitations || []), ...(packet.external.limitations || [])] };
  return { packet: { ...packet, snapshot_id: buildSnapshotFingerprint(fingerprintInput) }, snapshotFingerprint: buildSnapshotFingerprint(fingerprintInput), inputHash: buildInputHash(packet), sourceReferences };
}
