import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadDiscoveryEvidence } from "../../product-kernel/decisionEvidenceAdapter.js";

const DESTINATION = "/private/tmp/streetkingz-v105-input-20260914-ad9sko";
const ACQUISITION = path.join(DESTINATION, "catalogue-acquisition.json");
const REPORT = path.resolve("artifacts/validation/v1-05/genuine-streetkingz-input-preparation-2026-09-14/input-report.md");
const BUSINESS_ID = "5a23564d-45ed-4409-bd67-20c83c7d6d9b";
const ACCEPTED_DB = "supabase_db_streetkingz-ai-writer";
const PRIVATE_COPY = "/Users/ben/Library/Application Support/StreetKingz/v1-05/input-preparation-2026-09-14/catalogue-acquisition.json";
const CATALOGUE_SHA256 = "b63fd10c97f88aa7588f448e347567d5c9b1ebdb1924433d1440a154d489c4c2";
const BATCH = 200;

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...options }).trim();
}

function canonicalDecimal(value) {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value);
  if (!/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(raw)) return null;
  const negative = raw.startsWith("-");
  const [whole, fraction = ""] = raw.replace(/^-/, "").split(".");
  const cleanWhole = whole.replace(/^0+(?=\d)/, "");
  const cleanFraction = fraction.replace(/0+$/, "");
  if (cleanWhole === "0" && !cleanFraction) return "0";
  return `${negative ? "-" : ""}${cleanWhole}${cleanFraction ? `.${cleanFraction}` : ""}`;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

function sourceExport() {
  const sql = `select jsonb_build_object(
    'business',(select to_jsonb(b) from (select id,name,ecommerce_platform,primary_market,primary_language from public.businesses where id='${BUSINESS_ID}') b),
    'site_source',(select to_jsonb(s) from (select id,source_class,source_kind,provider_id,evidence_state,current_complete_run,current_completeness_state,evidence_as_of,last_successful_at,last_attempted_at from public.organic_evidence_sources where business_id='${BUSINESS_ID}' and source_kind='site') s),
    'site_run',(select to_jsonb(r) from public.organic_evidence_runs r join public.organic_evidence_sources s on s.id=r.source_id where s.business_id='${BUSINESS_ID}' and s.source_kind='site' and r.id=s.current_complete_run),
    'site_page_count',(select count(*) from public.organic_site_inspected_pages p join public.organic_evidence_sources s on s.id=p.source_id where s.business_id='${BUSINESS_ID}' and s.source_kind='site' and p.run_id=s.current_complete_run),
    'gsc_source',(select to_jsonb(s) from (select id,source_class,source_kind,provider_id,connection_id,evidence_state,current_complete_run,current_completeness_state,evidence_as_of,last_successful_at,last_attempted_at from public.organic_evidence_sources where business_id='${BUSINESS_ID}' and source_kind='search_console') s),
    'gsc_run',(select to_jsonb(r) from public.organic_evidence_runs r join public.organic_evidence_sources s on s.id=r.source_id where s.business_id='${BUSINESS_ID}' and s.source_kind='search_console' and r.id=s.current_complete_run),
    'gsc_connection',(select to_jsonb(g) from (select selected_site_url,property_type,permission_level from public.gsc_connections where business_id='${BUSINESS_ID}' and connection_id=(select connection_id from public.organic_evidence_sources where business_id='${BUSINESS_ID}' and source_kind='search_console')) g),
    'gsc_observations',(select coalesce(jsonb_agg(to_jsonb(o)-'id'-'business_id'-'connection_id'-'source_id'-'run_id'-'created_at' order by o.id),'[]'::jsonb) from public.organic_search_console_observations o join public.organic_evidence_sources s on s.id=o.source_id where s.business_id='${BUSINESS_ID}' and s.source_kind='search_console' and o.run_id=s.current_complete_run),
    'store_context',(select jsonb_build_object('currency',currency,'canonical_base_url',canonical_base_url) from public.commerce_stores where business_id='${BUSINESS_ID}' and provider='woocommerce')
  )`;
  return JSON.parse(run("docker", ["exec", ACCEPTED_DB, "psql", "-U", "postgres", "-d", "postgres", "-qAt", "-c", sql]));
}

function destinationAdmin() {
  const manifest = JSON.parse(fs.readFileSync(path.join(DESTINATION, "destination.json"), "utf8"));
  if (manifest.project_id !== "streetkingz-v105-input-20260914-ad9sko" || manifest.api_port !== 64150 || manifest.db_port !== 64151) throw new Error("DESTINATION_IDENTITY_MISMATCH");
  const config = fs.readFileSync(path.join(DESTINATION, "supabase/config.toml"), "utf8");
  if (!config.includes(`project_id = "${manifest.project_id}"`) || !/^port = 64150$/m.test(config) || !/^port = 64151$/m.test(config)) throw new Error("DESTINATION_CONFIG_MISMATCH");
  const containers = run("docker", ["ps", "--format", "{{.Names}} {{.Ports}}"]);
  if (!containers.includes("supabase_db_streetkingz-v105-input-20260914-ad9sko") || !containers.includes("0.0.0.0:64151->5432/tcp") || !containers.includes("0.0.0.0:64150->8000/tcp")) throw new Error("DESTINATION_PORT_MAPPING_MISMATCH");
  const raw = run("./node_modules/.bin/supabase", ["--workdir", DESTINATION, "status", "-o", "env"]);
  const values = Object.fromEntries(raw.split(/\r?\n/).map(line => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) return [];
    const value = match[2].trim();
    return [match[1], value.startsWith('"') && value.endsWith('"') ? JSON.parse(value) : value];
  }).filter(pair => pair.length));
  if (!values.API_URL || !values.SERVICE_ROLE_KEY) throw new Error("DESTINATION_NOT_READY");
  const api = new URL(values.API_URL);
  if (api.hostname !== "127.0.0.1" || api.port !== "64150") throw new Error("DESTINATION_API_IDENTITY_MISMATCH");
  return createClient(values.API_URL, values.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function assertDestinationEmpty(admin) {
  const tables = [
    "accounts", "businesses", "connections", "gsc_connections", "organic_evidence_sources", "organic_evidence_runs",
    "organic_search_console_observations", "commerce_stores", "commerce_sync_generations", "commerce_products",
    "commerce_categories", "commerce_variations", "commerce_product_categories"
  ];
  for (const table of tables) {
    const result = await admin.from(table).select("*", { count: "exact", head: true });
    if (result.error) {
      const kind = String(result.error.name || "ERROR").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 24);
      throw Object.assign(new Error("DESTINATION_PREFLIGHT_FAILED"), { code: `DESTINATION_PREFLIGHT_${table.toUpperCase()}_${kind}` });
    }
    if (result.count !== 0) throw new Error("DESTINATION_NOT_EMPTY_REFUSING_DUPLICATE_IMPORT");
  }
}

async function checked(result, label) {
  if (result?.error) throw Object.assign(new Error(label), { code: result.error.code || "DESTINATION_WRITE_FAILED" });
  return result.data;
}

async function fetchAll(makeQuery, label, pageSize = 1000) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await checked(await makeQuery().range(offset, offset + pageSize - 1), label);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function insertOne(admin, table, row, columns = "*") {
  return checked(await admin.from(table).insert(row).select(columns).single(), `${table} insert failed`);
}

async function insertBatches(admin, table, rows) {
  for (let offset = 0; offset < rows.length; offset += BATCH) await checked(await admin.from(table).insert(rows.slice(offset, offset + BATCH)), `${table} batch insert failed`);
}

function runEnvelope(sourceRun, sourceId, businessId, sourceReference) {
  return {
    source_id: sourceId,
    business_id: businessId,
    state: sourceRun.state,
    started_at: sourceRun.started_at,
    completed_at: sourceRun.completed_at,
    evidence_period_start: sourceRun.evidence_period_start,
    evidence_period_end: sourceRun.evidence_period_end,
    retrieved_at: sourceRun.retrieved_at,
    completeness_state: sourceRun.completeness_state,
    error_code: sourceRun.error_code,
    provider_version: sourceRun.provider_version,
    source_version: `${sourceRun.source_version || "unknown"}; source=${sourceReference}`
  };
}

async function importFirstPartyEvidence(admin, source, businessId, reportMeta) {
  const siteSource = await insertOne(admin, "organic_evidence_sources", {
    business_id: businessId, source_class: "no_separate_connection", source_kind: "site", provider_id: null, connection_id: null,
    evidence_state: source.site_source.evidence_state, current_completeness_state: source.site_source.current_completeness_state,
    evidence_as_of: source.site_source.evidence_as_of, last_successful_at: source.site_source.last_successful_at, last_attempted_at: source.site_source.last_attempted_at
  });
  const siteRun = await insertOne(admin, "organic_evidence_runs", runEnvelope(source.site_run, siteSource.id, businessId, `accepted-port-54321-run-${source.site_run.id}`));
  await checked(await admin.from("organic_evidence_sources").update({ current_complete_run: siteRun.id }).eq("id", siteSource.id), "site source selection update failed");
  reportMeta.site = { selected_source_run: Number(source.site_run.id), destination_run: siteRun.id, source_state: source.site_source.evidence_state, run_state: source.site_run.state, completeness: source.site_run.completeness_state, retrieved_at: source.site_run.retrieved_at, evidence_as_of: source.site_source.evidence_as_of, page_rows: Number(source.site_page_count) };

  const gscConnection = await insertOne(admin, "connections", { business_id: businessId, provider_type: "google_search_console", status: "disconnected", consent_state: "revoked" });
  await insertOne(admin, "gsc_connections", { connection_id: gscConnection.id, business_id: businessId, connection_state: "disconnected", selected_site_url: source.gsc_connection.selected_site_url, property_type: source.gsc_connection.property_type, permission_level: source.gsc_connection.permission_level });
  const gscSource = await insertOne(admin, "organic_evidence_sources", {
    business_id: businessId, source_class: "customer_connected", source_kind: "search_console", provider_id: source.gsc_source.provider_id,
    connection_id: gscConnection.id, evidence_state: source.gsc_source.evidence_state, current_completeness_state: source.gsc_source.current_completeness_state,
    evidence_as_of: source.gsc_source.evidence_as_of, last_successful_at: source.gsc_source.last_successful_at, last_attempted_at: source.gsc_source.last_attempted_at
  });
  const gscRun = await insertOne(admin, "organic_evidence_runs", runEnvelope(source.gsc_run, gscSource.id, businessId, `accepted-port-54321-run-${source.gsc_run.id}`));
  const gscRows = source.gsc_observations.map(row => ({ ...row, business_id: businessId, connection_id: gscConnection.id, source_id: gscSource.id, run_id: gscRun.id }));
  await insertBatches(admin, "organic_search_console_observations", gscRows);
  await checked(await admin.from("organic_evidence_sources").update({ current_complete_run: gscRun.id }).eq("id", gscSource.id), "Search Console source selection update failed");
  reportMeta.search_console = {
    source_run: Number(source.gsc_run.id), destination_run: gscRun.id, state: source.gsc_run.state,
    completeness: source.gsc_run.completeness_state, evidence_as_of: source.gsc_source.evidence_as_of,
    retrieved_at: source.gsc_run.retrieved_at, period_start: source.gsc_run.evidence_period_start, period_end: source.gsc_run.evidence_period_end,
    property: source.gsc_connection.selected_site_url, permission: source.gsc_connection.permission_level,
    counts_by_grain: Object.fromEntries(Object.entries(gscRows.reduce((counts, row) => ({ ...counts, [row.grain]: (counts[row.grain] || 0) + 1 }), {})).sort()),
    imported: gscRows.length, destination_source: gscSource.id
  };
}

async function importCatalogue(admin, catalogue, source, businessId) {
  const acquisitionTime = catalogue.source.retrieved_at;
  const wooConnection = await insertOne(admin, "connections", { business_id: businessId, provider_type: "woocommerce", status: "disconnected", consent_state: "revoked" });
  const store = await insertOne(admin, "commerce_stores", {
    business_id: businessId, connection_id: wooConnection.id, provider: "woocommerce", canonical_base_url: "https://streetkingz.co.uk/",
    source_home_url: "https://streetkingz.co.uk/", source_site_url: "https://streetkingz.co.uk/", currency: source.store_context?.currency || null,
    sync_state: "never"
  });
  const generation = await insertOne(admin, "commerce_sync_generations", { store_id: store.id, state: "pending", snapshot_kind: "complete", started_at: acquisitionTime });
  const productRows = catalogue.catalogue.products.map(row => ({ business_id: businessId, store_id: store.id, generation_id: generation.id, ...row }));
  const categoryRows = catalogue.catalogue.categories.map(row => ({ business_id: businessId, store_id: store.id, generation_id: generation.id, ...row }));
  const variationRows = catalogue.catalogue.variations.map(row => ({ business_id: businessId, store_id: store.id, generation_id: generation.id, ...row }));
  await insertBatches(admin, "commerce_products", productRows);
  await insertBatches(admin, "commerce_categories", categoryRows);
  await insertBatches(admin, "commerce_variations", variationRows);
  const productIdRows = await checked(await admin.from("commerce_products").select("id,source_id").eq("generation_id", generation.id), "product identity reconciliation failed");
  const categoryIdRows = await checked(await admin.from("commerce_categories").select("id,source_id").eq("generation_id", generation.id), "category identity reconciliation failed");
  const productsBySource = new Map(productIdRows.map(row => [row.source_id, row.id]));
  const categoriesBySource = new Map(categoryIdRows.map(row => [row.source_id, row.id]));
  const links = catalogue.catalogue.links.map(row => ({ product_id: productsBySource.get(row.product_source_id), category_id: categoriesBySource.get(row.category_source_id), store_id: store.id, generation_id: generation.id }));
  if (links.some(row => !row.product_id || !row.category_id)) throw new Error("CATALOGUE_RELATION_RECONCILIATION_FAILED");
  await insertBatches(admin, "commerce_product_categories", links);
  await checked(await admin.from("commerce_sync_generations").update({ state: "complete", completed_at: acquisitionTime }).eq("id", generation.id), "generation completion failed");
  await checked(await admin.from("commerce_stores").update({ sync_state: "complete", current_generation: generation.id, last_successful_at: acquisitionTime }).eq("id", store.id), "current generation selection failed");
  const [persistedProducts, persistedCategories, persistedVariations, persistedLinks] = await Promise.all([
    checked(await admin.from("commerce_products").select("id,source_id,name,slug,canonical_url,regular_price,current_price,sale_price,stock_quantity,stock_status").eq("store_id", store.id).eq("generation_id", generation.id), "persisted products read failed"),
    checked(await admin.from("commerce_categories").select("id,source_id,name,slug,parent_source_id").eq("store_id", store.id).eq("generation_id", generation.id), "persisted categories read failed"),
    checked(await admin.from("commerce_variations").select("source_id,parent_source_id,attributes,regular_price,current_price,sale_price,stock_quantity,stock_status").eq("store_id", store.id).eq("generation_id", generation.id), "persisted variations read failed"),
    checked(await admin.from("commerce_product_categories").select("product_id,category_id").eq("store_id", store.id).eq("generation_id", generation.id), "persisted relationships read failed")
  ]);
  const persistedProductIds = new Set(persistedProducts.map(row => row.source_id));
  const persistedCategoryIds = new Set(persistedCategories.map(row => row.source_id));
  const persistedVariationIds = new Set(persistedVariations.map(row => row.source_id));
  const expectedLinkIds = new Set(catalogue.catalogue.links.map(row => `${row.product_source_id}:${row.category_source_id}`));
  const productSourceByRow = new Map(productIdRows.map(row => [row.id, row.source_id]));
  const categorySourceByRow = new Map(categoryIdRows.map(row => [row.id, row.source_id]));
  const persistedLinkIds = new Set(persistedLinks.map(row => `${productSourceByRow.get(row.product_id)}:${categorySourceByRow.get(row.category_id)}`));
  const idsEqual = (expected, actual) => expected.size === actual.size && [...expected].every(id => actual.has(id));
  const sourceProductById = new Map(catalogue.catalogue.products.map(row => [row.source_id, row]));
  const persistedProductContentMatches = persistedProducts.every(row => {
    const sourceRow = sourceProductById.get(row.source_id);
    return sourceRow && row.name === sourceRow.name && row.slug === sourceRow.slug && row.canonical_url === sourceRow.canonical_url
      && canonicalDecimal(row.regular_price) === canonicalDecimal(sourceRow.regular_price) && canonicalDecimal(row.current_price) === canonicalDecimal(sourceRow.current_price) && canonicalDecimal(row.sale_price) === canonicalDecimal(sourceRow.sale_price)
      && canonicalDecimal(row.stock_quantity) === canonicalDecimal(sourceRow.stock_quantity) && row.stock_status === sourceRow.stock_status;
  });
  const sourceCategoryById = new Map(catalogue.catalogue.categories.map(row => [row.source_id, row]));
  const persistedCategoryContentMatches = persistedCategories.every(row => {
    const sourceRow = sourceCategoryById.get(row.source_id);
    return sourceRow && row.name === sourceRow.name && row.slug === sourceRow.slug && row.parent_source_id === sourceRow.parent_source_id;
  });
  const sourceVariationById = new Map(catalogue.catalogue.variations.map(row => [row.source_id, row]));
  const persistedVariationContentMatches = persistedVariations.every(row => {
    const sourceRow = sourceVariationById.get(row.source_id);
    return sourceRow && row.parent_source_id === sourceRow.parent_source_id && JSON.stringify(stable(row.attributes)) === JSON.stringify(stable(sourceRow.attributes))
      && canonicalDecimal(row.regular_price) === canonicalDecimal(sourceRow.regular_price) && canonicalDecimal(row.current_price) === canonicalDecimal(sourceRow.current_price)
      && canonicalDecimal(row.sale_price) === canonicalDecimal(sourceRow.sale_price) && canonicalDecimal(row.stock_quantity) === canonicalDecimal(sourceRow.stock_quantity)
      && row.stock_status === sourceRow.stock_status;
  });
  if (!idsEqual(new Set(catalogue.catalogue.products.map(row => row.source_id)), persistedProductIds)
    || !idsEqual(new Set(catalogue.catalogue.categories.map(row => row.source_id)), persistedCategoryIds)
    || !idsEqual(new Set(catalogue.catalogue.variations.map(row => row.source_id)), persistedVariationIds)
    || !idsEqual(expectedLinkIds, persistedLinkIds) || !persistedProductContentMatches || !persistedCategoryContentMatches || !persistedVariationContentMatches) throw new Error("PERSISTED_CATALOGUE_RECONCILIATION_FAILED");
  return {
    storeId: store.id, generationId: generation.id,
    products: productRows.length, categories: categoryRows.length, variations: variationRows.length, links: links.length,
    productSourceByRowId: Object.fromEntries(productIdRows.map(row => [row.id, row.source_id])),
    categorySourceByRowId: Object.fromEntries(categoryIdRows.map(row => [row.id, row.source_id])),
    persisted: { products: persistedProducts.length, categories: persistedCategories.length, variations: persistedVariations.length, links: persistedLinks.length, product_identity_and_content_match: persistedProductContentMatches, category_content_match: persistedCategoryContentMatches, variation_content_match: persistedVariationContentMatches }
  };
}

async function resumeExisting(admin, catalogue, source) {
  const business = await checked(await admin.from("businesses").select("id,name,ecommerce_platform,primary_market,primary_language").eq("id", BUSINESS_ID).single(), "existing business check failed");
  if (business.name !== source.business.name || business.ecommerce_platform !== source.business.ecommerce_platform || business.primary_market !== source.business.primary_market || business.primary_language !== source.business.primary_language) throw new Error("PARTIAL_DESTINATION_BUSINESS_MISMATCH");
  const stores = await checked(await admin.from("commerce_stores").select("id,connection_id,canonical_base_url,currency,sync_state,current_generation").eq("business_id", BUSINESS_ID).eq("provider", "woocommerce"), "existing store check failed");
  if (stores.length !== 1 || stores[0].canonical_base_url !== "https://streetkingz.co.uk/" || stores[0].sync_state !== "complete" || !stores[0].current_generation) throw new Error("PARTIAL_DESTINATION_STORE_MISMATCH");
  const store = stores[0];
  const generation = await checked(await admin.from("commerce_sync_generations").select("id,state,snapshot_kind,started_at,completed_at").eq("id", store.current_generation).single(), "existing generation check failed");
  if (generation.state !== "complete" || generation.snapshot_kind !== "complete") throw new Error("PARTIAL_DESTINATION_GENERATION_MISMATCH");
  const [products, categories, variations, links] = await Promise.all([
    checked(await admin.from("commerce_products").select("id,source_id,name,slug,canonical_url,regular_price,current_price,sale_price,stock_quantity,stock_status").eq("store_id", store.id).eq("generation_id", generation.id), "existing products check failed"),
    checked(await admin.from("commerce_categories").select("id,source_id,name,slug,parent_source_id").eq("store_id", store.id).eq("generation_id", generation.id), "existing categories check failed"),
    checked(await admin.from("commerce_variations").select("source_id,parent_source_id,attributes,regular_price,current_price,sale_price,stock_quantity,stock_status").eq("store_id", store.id).eq("generation_id", generation.id), "existing variations check failed"),
    checked(await admin.from("commerce_product_categories").select("product_id,category_id").eq("store_id", store.id).eq("generation_id", generation.id), "existing relationships check failed")
  ]);
  const idsEqual = (expected, actual) => expected.size === actual.size && [...expected].every(id => actual.has(id));
  const sourceProducts = new Map(catalogue.catalogue.products.map(row => [row.source_id, row]));
  const sourceCategories = new Map(catalogue.catalogue.categories.map(row => [row.source_id, row]));
  const sourceVariations = new Map(catalogue.catalogue.variations.map(row => [row.source_id, row]));
  const productContentMatches = products.length === sourceProducts.size && products.every(row => {
    const original = sourceProducts.get(row.source_id);
    return original && row.name === original.name && row.slug === original.slug && row.canonical_url === original.canonical_url
      && canonicalDecimal(row.regular_price) === canonicalDecimal(original.regular_price) && canonicalDecimal(row.current_price) === canonicalDecimal(original.current_price)
      && canonicalDecimal(row.sale_price) === canonicalDecimal(original.sale_price) && canonicalDecimal(row.stock_quantity) === canonicalDecimal(original.stock_quantity) && row.stock_status === original.stock_status;
  });
  const categoryContentMatches = categories.length === sourceCategories.size && categories.every(row => {
    const original = sourceCategories.get(row.source_id);
    return original && row.name === original.name && row.slug === original.slug && row.parent_source_id === original.parent_source_id;
  });
  const variationContentMatches = variations.length === sourceVariations.size && variations.every(row => {
    const original = sourceVariations.get(row.source_id);
    return original && row.parent_source_id === original.parent_source_id && JSON.stringify(stable(row.attributes)) === JSON.stringify(stable(original.attributes))
      && canonicalDecimal(row.regular_price) === canonicalDecimal(original.regular_price) && canonicalDecimal(row.current_price) === canonicalDecimal(original.current_price)
      && canonicalDecimal(row.sale_price) === canonicalDecimal(original.sale_price) && canonicalDecimal(row.stock_quantity) === canonicalDecimal(original.stock_quantity) && row.stock_status === original.stock_status;
  });
  const productSourceByRowId = Object.fromEntries(products.map(row => [row.id, row.source_id]));
  const categorySourceByRowId = Object.fromEntries(categories.map(row => [row.id, row.source_id]));
  const actualLinks = new Set(links.map(row => `${productSourceByRowId[row.product_id]}:${categorySourceByRowId[row.category_id]}`));
  const expectedLinks = new Set(catalogue.catalogue.links.map(row => `${row.product_source_id}:${row.category_source_id}`));
  if (!idsEqual(new Set(sourceProducts.keys()), new Set(products.map(row => row.source_id))) || !productContentMatches
    || !idsEqual(new Set(sourceCategories.keys()), new Set(categories.map(row => row.source_id))) || !categoryContentMatches
    || !idsEqual(new Set(sourceVariations.keys()), new Set(variations.map(row => row.source_id))) || !variationContentMatches
    || !idsEqual(expectedLinks, actualLinks)) throw new Error("PARTIAL_DESTINATION_CATALOGUE_RECONCILIATION_FAILED");

  const sources = await checked(await admin.from("organic_evidence_sources").select("id,source_kind,connection_id,current_complete_run,evidence_state,current_completeness_state,evidence_as_of,last_successful_at,last_attempted_at").eq("business_id", BUSINESS_ID), "existing evidence source check failed");
  const siteSource = sources.find(row => row.source_kind === "site");
  const gscSource = sources.find(row => row.source_kind === "search_console");
  if (sources.length !== 2 || !siteSource || !gscSource) throw new Error("PARTIAL_DESTINATION_EVIDENCE_SOURCE_MISMATCH");
  const [siteRun, gscRun, sitePages, gscRows, gscConnection] = await Promise.all([
    checked(await admin.from("organic_evidence_runs").select("id,state,completeness_state,retrieved_at,evidence_period_start,evidence_period_end,source_version").eq("id", siteSource.current_complete_run).single(), "existing site run check failed"),
    checked(await admin.from("organic_evidence_runs").select("id,state,completeness_state,retrieved_at,evidence_period_start,evidence_period_end,source_version").eq("id", gscSource.current_complete_run).single(), "existing Search Console run check failed"),
    checked(await admin.from("organic_site_inspected_pages").select("id").eq("source_id", siteSource.id).eq("run_id", siteSource.current_complete_run), "existing site page count check failed"),
    fetchAll(() => admin.from("organic_search_console_observations").select("grain").eq("source_id", gscSource.id).eq("run_id", gscSource.current_complete_run).order("id"), "existing Search Console count check failed"),
    checked(await admin.from("gsc_connections").select("selected_site_url,property_type,permission_level").eq("connection_id", gscSource.connection_id).single(), "existing Search Console property check failed")
  ]);
  const evidenceMismatch = [
    siteRun.state !== source.site_run.state && "SITE_STATE",
    siteRun.completeness_state !== source.site_run.completeness_state && "SITE_COMPLETENESS",
    !siteRun.source_version.includes("accepted-port-54321-run-663") && "SITE_ORIGIN",
    sitePages.length !== 0 && "SITE_PAGE_COUNT",
    gscRun.state !== source.gsc_run.state && "GSC_STATE",
    gscRun.completeness_state !== source.gsc_run.completeness_state && "GSC_COMPLETENESS",
    !gscRun.source_version.includes("accepted-port-54321-run-750") && "GSC_ORIGIN",
    gscRows.length !== 1125 && "GSC_ROW_COUNT",
    gscConnection.selected_site_url !== "https://streetkingz.co.uk/" && "GSC_PROPERTY",
    gscConnection.property_type !== "url_prefix" && "GSC_PROPERTY_TYPE",
    gscConnection.permission_level !== "siteOwner" && "GSC_PERMISSION"
  ].filter(Boolean);
  if (evidenceMismatch.length) throw new Error(`PARTIAL_DESTINATION_EVIDENCE_RECONCILIATION_FAILED_${evidenceMismatch.join("_")}`);
  const reportMeta = {
    site: { selected_source_run: 663, destination_run: siteRun.id, source_state: siteSource.evidence_state, run_state: siteRun.state, completeness: siteRun.completeness_state, retrieved_at: siteRun.retrieved_at, evidence_as_of: siteSource.evidence_as_of, page_rows: sitePages.length },
    search_console: { source_run: 750, destination_run: gscRun.id, state: gscRun.state, completeness: gscRun.completeness_state, evidence_as_of: gscSource.evidence_as_of, retrieved_at: gscRun.retrieved_at, period_start: gscRun.evidence_period_start, period_end: gscRun.evidence_period_end, property: gscConnection.selected_site_url, permission: gscConnection.permission_level, imported: gscRows.length, counts_by_grain: {} }
  };
  reportMeta.search_console.destination_source = gscSource.id;
  reportMeta.search_console.counts_by_grain = Object.fromEntries(Object.entries(gscRows.reduce((counts, row) => ({ ...counts, [row.grain]: (counts[row.grain] || 0) + 1 }), {})).sort());
  return {
    businessId: BUSINESS_ID,
    imported: { storeId: store.id, generationId: generation.id, products: products.length, categories: categories.length, variations: variations.length, links: links.length, productSourceByRowId, categorySourceByRowId, persisted: { products: products.length, categories: categories.length, variations: variations.length, links: links.length, product_identity_and_content_match: productContentMatches, category_content_match: categoryContentMatches, variation_content_match: variationContentMatches } },
    reportMeta
  };
}

function reportText({ source, catalogue, imported, loaded, selection }) {
  const money = row => [row.current_price == null ? null : `current ${row.current_price}`, row.regular_price == null ? null : `regular ${row.regular_price}`, row.sale_price == null ? null : `sale ${row.sale_price}`].filter(Boolean).join("; ") || "price unavailable";
  const stock = row => [row.stock_status, row.stock_quantity == null ? null : `quantity ${row.stock_quantity}`, row.manage_stock == null ? null : `managed ${row.manage_stock}`].filter(Boolean).join("; ") || "stock unavailable";
  const productLines = loaded.packet.commerce.products.map(row => `- **${row.name || "(name missing)"}** — ${row.canonical_url || "(URL missing)"}; ${money(row)}; ${stock(row)}; source ID ${imported.productSourceByRowId[row.id] || "unmapped"}.`).join("\n");
  const gsc = selection.search_console;
  const exact = selection.generation_id_matches && selection.site_run_id_matches && selection.gsc_run_id_matches && selection.product_ids_match && selection.product_content_matches && selection.category_ids_match && selection.category_content_matches && selection.relation_count_matches && selection.relation_ids_match && selection.search_console_count_matches && selection.search_console_ids_match && selection.site_page_count_matches;
  return `# Genuine Street Kingz Product Input Report

Prepared: ${new Date().toISOString()}

Status: ${exact ? "VERIFIED INPUT PREPARATION — NOT PRODUCT-QUALITY ACCEPTANCE" : "INCOMPLETE — LOADER SELECTION DID NOT MATCH IMPORT"}

Isolated destination: \`${DESTINATION}\` (API port 64150; DB port 64151)
Report path: \`${REPORT}\`

## Source and acquisition

- Source: ${catalogue.source.origin}; verified one-product read was confirmed by Ben as \`WOO_READ_ACCESS_VERIFIED\`.
- Catalogue acquired at ${catalogue.source.retrieved_at} UTC through \`wooCollectionRequest\`, GET only: ${catalogue.page_coverage.length} WooCommerce requests/responses, with every response page validated against WooCommerce total/page headers.
- An unchanged mode-0600 private archive is retained outside the temporary directory and Git; SHA-256: \`${CATALOGUE_SHA256}\`.
- Products: ${catalogue.counts.products}; categories: ${catalogue.counts.categories}; product/category relationships: ${catalogue.counts.product_category_relationships}; supported variations: ${catalogue.counts.variations}. Orders and customer identities requested: 0.
- Source product/category/variation IDs were checked for uniqueness; variation parents and product/category relationships were reconciled. Imported product IDs: ${imported.products}; categories: ${imported.categories}; relationships: ${imported.links}; variations: ${imported.variations}.
- Prices and stock values are source values. Currency context from the previously retained store record: ${source.store_context?.currency || "not available; no currency inferred"}.

## Normal Product loader selection

The existing \`loadDiscoveryEvidence\` Product input loader ran against the new destination after generation ${imported.generationId} was marked current. It selected ${loaded.packet.commerce.products.length}/${imported.products} products, ${loaded.packet.commerce.categories.length}/${imported.categories} categories, and ${loaded.packet.commerce.relations.length}/${imported.links} product/category relationships. Generation selection ${selection.generation_id_matches ? "PASS" : "FAIL"}; product source-ID and name/URL/price/stock match ${selection.product_ids_match && selection.product_content_matches ? "PASS" : "FAIL"}; category source-ID and name/parent match ${selection.category_ids_match && selection.category_content_matches ? "PASS" : "FAIL"}; relationship source-pair match ${selection.relation_ids_match ? "PASS" : "FAIL"}; Search Console selected identity and value match ${selection.gsc_run_id_matches && selection.search_console_ids_match ? "PASS" : "FAIL"} (${loaded.packet.search_console.rows.length}/${gsc.imported}, coverage reconciled against stored count); site page count matches the retained source ${selection.site_page_count_matches ? "PASS" : "FAIL"}.

Packet input hash: \`${loaded.inputHash}\`; snapshot fingerprint: \`${loaded.snapshotFingerprint}\`.

Variations imported: ${imported.variations}; variations selected by the normal Product input loader: 0 (the loader currently does not read \`commerce_variations\`). No hand-assembled replacement packet was used. Product names and URLs selected by the loader:

${productLines || "No products selected."}

## Retained first-party evidence

| Source | Selected evidence | Source context and dates |
|---|---:|---|
| Site | Run ${source.site_run.id}: ${source.site_page_count} inspected-page rows | Accepted environment at 127.0.0.1:54321; run state ${source.site_run.state}/${source.site_run.completeness_state}; source state ${source.site_source.evidence_state}; run retrieved ${source.site_run.retrieved_at}; run completed ${source.site_run.completed_at}; source last success ${source.site_source.last_successful_at}; evidence as of ${source.site_source.evidence_as_of}. The complete/LKG run envelope is selected, but no page records were retained at extraction time. |
| Search Console | Run ${source.gsc_run.id}: ${gsc.imported} observations (${Object.entries(gsc.counts_by_grain).map(([grain,count]) => `${grain} ${count}`).join(", ")}) | Accepted environment at 127.0.0.1:54321; ${gsc.property}, ${gsc.permission}; run retrieved ${gsc.retrieved_at}; run completed ${source.gsc_run.completed_at}; source last success ${source.gsc_source.last_successful_at}; period ${gsc.period_start} to ${gsc.period_end}; evidence as of ${gsc.evidence_as_of}; completeness ${gsc.completeness}. Provider-limited detail remains explicit. |

Historical recovery context: site run 764 in 127.0.0.1:54274 is a separate partial recovery run with 100 inspected pages (retrieved 2026-09-03 17:00 UTC, completed 17:01 UTC). It was not substituted for accepted-environment run 663 and was not selected in this Product input. Numeric run IDs are environment-scoped.

## Imported versus selected

- Commerce downloaded → persisted → selected: ${catalogue.counts.products} → ${imported.persisted.products} → ${loaded.packet.commerce.products.length} products; ${catalogue.counts.categories} → ${imported.persisted.categories} → ${loaded.packet.commerce.categories.length} categories; ${catalogue.counts.product_category_relationships} → ${imported.persisted.links} → ${loaded.packet.commerce.relations.length} relationships; ${catalogue.counts.variations} → ${imported.persisted.variations} → 0 variations.
- First-party evidence source → persisted → Product-selected: ${source.gsc_observations.length} → ${gsc.imported} → ${loaded.packet.search_console.rows.length} Search Console observations; ${source.site_page_count} → ${source.site_page_count} → ${loaded.packet.site.pages.length} inspected site pages.
- External evidence: unavailable; ${loaded.packet.external.rows.length} selected and none was imported or generated. Prior AI interpretations and placeholder-derived external evidence were not included.

## Learning Layer

The PostgREST response ceiling applies to each request, so complete evidence selection requires stable keyset pages plus exact stored-count reconciliation. The reusable reader is \`readBoundedEvidenceRows()\` in \`product-kernel/decisionEvidenceAdapter.js:13\`.

## Safe read-only experiment

The safe experiment replayed \`loadDiscoveryEvidence()\` read-only against the isolated destination and compared selected commerce/Search Console identities and values with persisted source rows. It made no database writes, live-site requests, upstream/provider calls, or AI/search calls. Result: ${exact ? "PASS" : "FAIL"}; packet identity includes every selected Search Console row.

## Limitations

- Accepted site run 663 is marked complete/LKG, but the accepted database currently contains zero inspected-page rows for it; no site-page claims are selected. The later partial run 764 remains separate.
- The normal loader does not select variations, so their source data is retained in the isolated generation but absent from the loader packet.
- The existing 2,000-record per-source Product limit remains in place. Runs exceeding it carry explicit stored/selected/truncated coverage metadata.
- No orders, customer identities, sales history, margin, conversion, paid external-search evidence, or old AI interpretations are included.
- Search Console is provider-limited and dated; missing or unmeasured data must not be treated as zero.
- Recommendation quality has not been assessed.
- The existing bounded site-acquisition path is \`POST /api/product/organic-evidence/site/acquire\` in \`routes/siteEvidence.js:27\`, with caps in \`product-kernel/siteEvidence.js:7\` (500 discovered URLs, 100 inspected pages). The next minimum collection needed for useful page evidence is a fresh bounded run retaining inspected homepage, product, and category page rows under its selected run. No crawl was performed here.
- This is an input-preparation artifact only. No AI assessment, discovery, interpretation, recommendation, or decision-engine step was run.
`;
}

async function main() {
  if (!fs.existsSync(ACQUISITION)) throw new Error("GENUINE_CATALOGUE_ACQUISITION_MISSING");
  const catalogue = JSON.parse(fs.readFileSync(ACQUISITION, "utf8"));
  if (catalogue.artifact_type !== "genuine_woocommerce_catalogue_acquisition" || catalogue.scope.orders || catalogue.scope.customer_identities) throw new Error("CATALOGUE_SCOPE_INVALID");
  const source = sourceExport();
  if (!source.business || source.business.id !== BUSINESS_ID || source.business.primary_market !== "GB" || source.business.primary_language !== "en"
    || source.site_run?.id !== 663 || source.gsc_run?.id !== 750 || source.gsc_run?.completeness_state !== "provider_limited"
    || source.gsc_observations.length !== 1125 || source.gsc_connection?.selected_site_url !== "https://streetkingz.co.uk/"
    || source.gsc_connection?.property_type !== "url_prefix" || source.gsc_connection?.permission_level !== "siteOwner"
    || source.gsc_observations.some(row => row.property_identity !== source.gsc_connection.selected_site_url)) throw new Error("ACCEPTED_EVIDENCE_CONTEXT_MISMATCH");
  if (!source.site_page_count && source.site_source.current_complete_run !== source.site_run.id) throw new Error("SITE_RUN_SELECTION_MISMATCH");
  const sourceHash = crypto.createHash("sha256").update(fs.readFileSync(ACQUISITION)).digest("hex");
  const privateHash = crypto.createHash("sha256").update(fs.readFileSync(PRIVATE_COPY)).digest("hex");
  if (sourceHash !== CATALOGUE_SHA256 || privateHash !== CATALOGUE_SHA256 || sourceHash !== privateHash) throw new Error("CATALOGUE_HASH_MISMATCH");
  if (catalogue.counts.products !== catalogue.catalogue.products.length || catalogue.counts.categories !== catalogue.catalogue.categories.length
    || catalogue.counts.product_category_relationships !== catalogue.catalogue.links.length || catalogue.counts.variations !== catalogue.catalogue.variations.length) throw new Error("CATALOGUE_COUNT_MISMATCH");
  const admin = destinationAdmin();
  let businessId;
  let imported;
  let reportMeta;
  if (process.argv.includes("--resume-existing")) {
    const resumed = await resumeExisting(admin, catalogue, source);
    businessId = resumed.businessId;
    imported = resumed.imported;
    reportMeta = resumed.reportMeta;
  } else {
    await assertDestinationEmpty(admin);
    if (process.argv.includes("--preflight-only")) {
      process.stdout.write("DESTINATION_PREFLIGHT_PASSED; all scoped destination tables are empty.\n");
      return;
    }
    const authUser = await checked(await admin.auth.admin.createUser({ email: `isolated-input-${crypto.randomUUID()}@example.invalid`, password: crypto.randomBytes(32).toString("base64url"), email_confirm: true }), "isolated loader principal creation failed");
    const account = await insertOne(admin, "accounts", { auth_user_id: authUser.user.id });
    const business = await insertOne(admin, "businesses", { id: BUSINESS_ID, account_id: account.id, name: source.business.name, ecommerce_platform: source.business.ecommerce_platform, primary_market: source.business.primary_market, primary_language: source.business.primary_language });
    businessId = business.id;
    reportMeta = {};
    await importFirstPartyEvidence(admin, source, business.id, reportMeta);
    imported = await importCatalogue(admin, catalogue, source, business.id);
  }
  const loaded = await loadDiscoveryEvidence({ admin, businessId });
  const persistedGscRows = await fetchAll(() => admin.from("organic_search_console_observations").select("id").eq("business_id", businessId).eq("run_id", reportMeta.search_console.destination_run).order("id"), "persisted Search Console identity reconciliation failed");
  const expectedLoaderGscIds = persistedGscRows.slice(0, loaded.packet.search_console.rows.length).map(row => String(row.id));
  const selectedLoaderGscIds = loaded.packet.search_console.rows.map(row => String(row.id));
  const searchConsoleIdsMatch = expectedLoaderGscIds.length === selectedLoaderGscIds.length && expectedLoaderGscIds.every((id, index) => id === selectedLoaderGscIds[index]);
  const expectedProducts = new Set(catalogue.catalogue.products.map(row => row.source_id));
  const selectedProducts = new Set(loaded.packet.commerce.products.map(row => imported.productSourceByRowId[row.id]));
  const expectedCategories = new Set(catalogue.catalogue.categories.map(row => row.source_id));
  const selectedCategories = new Set(loaded.packet.commerce.categories.map(row => imported.categorySourceByRowId[row.id]));
  const productIdsMatch = expectedProducts.size === selectedProducts.size && [...expectedProducts].every(id => selectedProducts.has(id));
  const categoryIdsMatch = expectedCategories.size === selectedCategories.size && [...expectedCategories].every(id => selectedCategories.has(id));
  const expectedRelations = new Set(catalogue.catalogue.links.map(row => `${row.product_source_id}:${row.category_source_id}`));
  const selectedRelations = new Set(loaded.packet.commerce.relations.map(row => `${imported.productSourceByRowId[row.product_id]}:${imported.categorySourceByRowId[row.category_id]}`));
  const sourceProductById = new Map(catalogue.catalogue.products.map(row => [row.source_id, row]));
  const selectedProductContentMatches = loaded.packet.commerce.products.every(row => {
    const sourceRow = sourceProductById.get(imported.productSourceByRowId[row.id]);
    return sourceRow && row.name === sourceRow.name && row.canonical_url === sourceRow.canonical_url
      && canonicalDecimal(row.regular_price) === canonicalDecimal(sourceRow.regular_price) && canonicalDecimal(row.current_price) === canonicalDecimal(sourceRow.current_price)
      && canonicalDecimal(row.sale_price) === canonicalDecimal(sourceRow.sale_price) && canonicalDecimal(row.stock_quantity) === canonicalDecimal(sourceRow.stock_quantity) && row.stock_status === sourceRow.stock_status;
  });
  const sourceCategoryById = new Map(catalogue.catalogue.categories.map(row => [row.source_id, row]));
  const selectedCategoryContentMatches = loaded.packet.commerce.categories.every(row => {
    const sourceRow = sourceCategoryById.get(imported.categorySourceByRowId[row.id]);
    return sourceRow && row.name === sourceRow.name && row.slug === sourceRow.slug && row.parent_source_id === sourceRow.parent_source_id;
  });
  const selection = {
    generation_id_matches: String(loaded.packet.commerce.generation_id) === String(imported.generationId),
    site_run_id_matches: String(loaded.packet.site.selected_run_id) === String(reportMeta.site.destination_run),
    gsc_run_id_matches: String(loaded.packet.search_console.selected_run_id) === String(reportMeta.search_console.destination_run),
    product_ids_match: productIdsMatch,
    product_content_matches: selectedProductContentMatches,
    category_ids_match: categoryIdsMatch,
    category_content_matches: selectedCategoryContentMatches,
    relation_count_matches: loaded.packet.commerce.relations.length === imported.links,
    relation_ids_match: expectedRelations.size === selectedRelations.size && [...expectedRelations].every(id => selectedRelations.has(id)),
    search_console_count_matches: loaded.packet.search_console.rows.length === Math.min(reportMeta.search_console.imported, 2000)
      && loaded.packet.search_console.observation_coverage?.stored_count === reportMeta.search_console.imported
      && loaded.packet.search_console.observation_coverage?.selected_count === loaded.packet.search_console.rows.length,
    search_console_ids_match: searchConsoleIdsMatch,
    site_page_count_matches: loaded.packet.site.pages.length === reportMeta.site.page_rows,
    search_console: reportMeta.search_console
  };
  const report = reportText({ source, catalogue, imported, loaded, selection });
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, report, { mode: 0o600, flag: "wx" });
  process.stdout.write(`${JSON.stringify({ status: selection.generation_id_matches && selection.site_run_id_matches && selection.gsc_run_id_matches && productIdsMatch && selectedProductContentMatches && categoryIdsMatch && selection.relation_count_matches && selection.relation_ids_match && selection.search_console_ids_match ? "INPUT_PREPARATION_COMPLETE" : "INPUT_PREPARATION_INCOMPLETE", report: REPORT, destination: DESTINATION, counts: { downloaded: catalogue.counts, persisted: imported.persisted, selected: { products: loaded.packet.commerce.products.length, categories: loaded.packet.commerce.categories.length, variations: 0, links: loaded.packet.commerce.relations.length, search_console: loaded.packet.search_console.rows.length, search_console_imported: reportMeta.search_console.imported } }, loader: { selected_generation: loaded.packet.commerce.generation_id, selected_site_run: loaded.packet.site.selected_run_id, selected_search_console_run: loaded.packet.search_console.selected_run_id, selected_search_console_observations: loaded.packet.search_console.rows.length, selected_site_pages: loaded.packet.site.pages.length } }, null, 2)}\n`);
}

main().catch(error => {
  const code = /^[A-Z0-9_]{1,80}$/.test(error?.code || "") ? error.code : /^[A-Z0-9_]{1,80}$/.test(error?.message || "") ? error.message : "INPUT_PREPARATION_FAILED";
  process.stderr.write(`${JSON.stringify({ status: "INPUT_PREPARATION_INCOMPLETE", safe_error_code: code })}\n`);
  process.exitCode = 1;
});
