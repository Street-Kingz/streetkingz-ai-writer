import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildInputHash } from "../../product-kernel/decisionDiscovery.js";
import { loadDiscoveryEvidence } from "../../product-kernel/decisionEvidenceAdapter.js";

const ROOT = process.cwd();
const DESTINATION = "/private/tmp/streetkingz-v105-input-20260914-ad9sko";
const DESTINATION_ID = "streetkingz-v105-input-20260914-ad9sko";
const BUSINESS_ID = "5a23564d-45ed-4409-bd67-20c83c7d6d9b";
const CATALOGUE = path.join(DESTINATION, "catalogue-acquisition.json");
const PRIVATE_COPY = "/Users/ben/Library/Application Support/StreetKingz/v1-05/input-preparation-2026-09-14/catalogue-acquisition.json";
const CATALOGUE_SHA256 = "b63fd10c97f88aa7588f448e347567d5c9b1ebdb1924433d1440a154d489c4c2";
const PAGE_SIZE = 1000;
let phase = "startup";

function command(file, args, options = {}) {
  return execFileSync(file, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...options }).trim();
}
function ensure(condition, code) { if (!condition) throw new Error(code); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
async function data(result, code) {
  const response = await result;
  if (response?.error) throw new Error(code);
  return response.data;
}
async function allRows(admin, table, columns, filters, label) {
  const countQuery = () => {
    let query = admin.from(table).select("id", { count: "exact", head: true });
    for (const [column, value] of filters) query = query.eq(column, value);
    return query;
  };
  const count = await countQuery();
  ensure(!count.error && Number.isSafeInteger(count.count) && count.count >= 0, `${label}_COUNT_FAILED`);
  const rows = [];
  let cursor = null;
  while (rows.length < count.count) {
    let query = admin.from(table).select(columns);
    for (const [column, value] of filters) query = query.eq(column, value);
    if (cursor !== null) query = query.gt("id", cursor);
    const page = await query.order("id", { ascending: true }).limit(Math.min(PAGE_SIZE, count.count - rows.length));
    ensure(!page.error && Array.isArray(page.data), `${label}_PAGE_FAILED`);
    ensure(page.data.length > 0 && page.data.length <= Math.min(PAGE_SIZE, count.count - rows.length), `${label}_PAGE_SIZE_INVALID`);
    for (const row of page.data) {
      const next = String(row.id);
      const previous = cursor === null ? null : String(cursor);
      const strictlyAfter = previous === null || (/^\d+$/.test(previous) && /^\d+$/.test(next) ? BigInt(next) > BigInt(previous) : next > previous);
      ensure(row.id !== null && row.id !== undefined && strictlyAfter, `${label}_IDENTITY_ORDER_INVALID`);
      cursor = row.id;
      rows.push(row);
    }
  }
  const finalCount = await countQuery();
  ensure(!finalCount.error && finalCount.count === count.count && rows.length === count.count, `${label}_COUNT_CHANGED`);
  return rows;
}
function supabaseAdmin() {
  const output = command("./node_modules/.bin/supabase", ["--workdir", DESTINATION, "status", "-o", "env"]);
  const values = Object.fromEntries(output.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) return [];
    const value = match[2].trim();
    return [[match[1], value.startsWith('"') && value.endsWith('"') ? JSON.parse(value) : value]];
  }));
  ensure(values.API_URL && values.SERVICE_ROLE_KEY, "DESTINATION_API_CREDENTIALS_UNAVAILABLE");
  const url = new URL(values.API_URL);
  ensure(url.hostname === "127.0.0.1" && url.port === "64150", "DESTINATION_API_IDENTITY_MISMATCH");
  return createClient(values.API_URL, values.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function main() {
  phase = "destination_identity";
  const manifest = JSON.parse(fs.readFileSync(path.join(DESTINATION, "destination.json"), "utf8"));
  ensure(manifest.project_id === DESTINATION_ID && manifest.api_port === 64150 && manifest.db_port === 64151, "DESTINATION_MANIFEST_MISMATCH");
  const config = fs.readFileSync(path.join(DESTINATION, "supabase/config.toml"), "utf8");
  ensure(config.includes(`project_id = "${DESTINATION_ID}"`) && /^port = 64150$/m.test(config) && /^port = 64151$/m.test(config) && /^max_rows = 1000$/m.test(config), "DESTINATION_CONFIG_MISMATCH");
  const containers = command("docker", ["ps", "--format", "{{.Names}} {{.Ports}}"]);
  ensure(containers.includes(`supabase_db_${DESTINATION_ID}`) && containers.includes("0.0.0.0:64151->5432/tcp") && containers.includes("0.0.0.0:64150->8000/tcp"), "DESTINATION_CONTAINER_MAPPING_MISMATCH");

  phase = "private_acquisition_hash";
  const acquisitionBytes = fs.readFileSync(CATALOGUE);
  const privateBytes = fs.readFileSync(PRIVATE_COPY);
  const hash = crypto.createHash("sha256").update(acquisitionBytes).digest("hex");
  ensure(hash === CATALOGUE_SHA256 && crypto.createHash("sha256").update(privateBytes).digest("hex") === CATALOGUE_SHA256 && acquisitionBytes.equals(privateBytes), "CATALOGUE_ARCHIVE_HASH_MISMATCH");
  const catalogue = JSON.parse(acquisitionBytes.toString("utf8"));
  ensure(catalogue.counts.products === catalogue.catalogue.products.length && catalogue.counts.categories === catalogue.catalogue.categories.length && catalogue.counts.product_category_relationships === catalogue.catalogue.links.length && catalogue.counts.variations === catalogue.catalogue.variations.length, "CATALOGUE_SOURCE_COUNT_MISMATCH");

  phase = "destination_api_client";
  const admin = supabaseAdmin();
  phase = "store_api_read";
  const storeResult = await admin.from("commerce_stores").select("id,current_generation,sync_state").eq("business_id", BUSINESS_ID).eq("provider", "woocommerce").maybeSingle();
  if (storeResult.error) throw new Error("STORE_READ_FAILED");
  const store = storeResult.data;
  ensure(store, `STORE_ROW_MISSING_STATUS_${storeResult.status || 0}`);
  ensure(store.id, "STORE_ID_MISSING");
  ensure(store.current_generation !== null && store.current_generation !== undefined, "STORE_GENERATION_MISSING");
  phase = "generation_api_read";
  let generationQuery = admin.from("commerce_sync_generations").select("id,state,snapshot_kind").eq("id", store.current_generation).eq("store_id", store.id);
  ensure(typeof generationQuery.single === "function", "GENERATION_QUERY_SHAPE_INVALID");
  const generation = await data(await generationQuery.single(), "GENERATION_READ_FAILED");
  ensure(generation, "GENERATION_ROW_MISSING");
  ensure(store.sync_state === "complete" && generation.state === "complete" && generation.snapshot_kind === "complete", "GENUINE_GENERATION_NOT_CURRENT");
  phase = "persisted_catalogue";
  const [persistedProducts, persistedCategories, persistedVariations, persistedLinks] = await Promise.all([
    data(admin.from("commerce_products").select("id,source_id,name,slug,canonical_url,regular_price,current_price,sale_price,stock_quantity,stock_status").eq("business_id", BUSINESS_ID).eq("store_id", store.id).eq("generation_id", generation.id), "PRODUCT_READ_FAILED"),
    data(admin.from("commerce_categories").select("id,source_id,name,slug,parent_source_id").eq("business_id", BUSINESS_ID).eq("store_id", store.id).eq("generation_id", generation.id), "CATEGORY_READ_FAILED"),
    data(admin.from("commerce_variations").select("source_id,parent_source_id,attributes,regular_price,current_price,sale_price,stock_quantity,stock_status").eq("business_id", BUSINESS_ID).eq("store_id", store.id).eq("generation_id", generation.id), "VARIATION_READ_FAILED"),
    data(admin.from("commerce_product_categories").select("product_id,category_id").eq("store_id", store.id).eq("generation_id", generation.id), "RELATIONSHIP_READ_FAILED")
  ]);
  const productsBySource = new Map(persistedProducts.map(row => [String(row.source_id), row]));
  const categoriesBySource = new Map(persistedCategories.map(row => [String(row.source_id), row]));
  const variationsBySource = new Map(persistedVariations.map(row => [String(row.source_id), row]));
  ensure(productsBySource.size === catalogue.counts.products && persistedProducts.length === catalogue.counts.products, "PRODUCT_PERSISTED_COUNT_MISMATCH");
  ensure(categoriesBySource.size === catalogue.counts.categories && persistedCategories.length === catalogue.counts.categories, "CATEGORY_PERSISTED_COUNT_MISMATCH");
  ensure(variationsBySource.size === catalogue.counts.variations && persistedVariations.length === catalogue.counts.variations && persistedLinks.length === catalogue.counts.product_category_relationships, "CATALOGUE_PERSISTED_COUNT_MISMATCH");
  for (const source of catalogue.catalogue.products) {
    const stored = productsBySource.get(String(source.source_id));
    ensure(stored && stored.name === source.name && stored.slug === source.slug && stored.canonical_url === source.canonical_url, "PRODUCT_SOURCE_ID_OR_CONTENT_MISMATCH");
  }
  for (const source of catalogue.catalogue.categories) {
    const stored = categoriesBySource.get(String(source.source_id));
    ensure(stored && stored.name === source.name && stored.slug === source.slug && stored.parent_source_id === source.parent_source_id, "CATEGORY_SOURCE_ID_OR_CONTENT_MISMATCH");
  }
  for (const source of catalogue.catalogue.variations) {
    const stored = variationsBySource.get(String(source.source_id));
    ensure(stored && String(stored.parent_source_id) === String(source.parent_source_id) && JSON.stringify(stable(stored.attributes)) === JSON.stringify(stable(source.attributes)), "VARIATION_SOURCE_ID_OR_PARENT_MISMATCH");
  }
  const productById = new Map(persistedProducts.map(row => [row.id, String(row.source_id)]));
  const categoryById = new Map(persistedCategories.map(row => [row.id, String(row.source_id)]));
  const expectedRelationships = new Set(catalogue.catalogue.links.map(row => `${row.product_source_id}:${row.category_source_id}`));
  const persistedRelationships = new Set(persistedLinks.map(row => `${productById.get(row.product_id)}:${categoryById.get(row.category_id)}`));
  ensure(expectedRelationships.size === persistedRelationships.size && [...expectedRelationships].every(key => persistedRelationships.has(key)), "RELATIONSHIP_SOURCE_ID_MISMATCH");

  phase = "normal_product_loader";
  const loaded = await loadDiscoveryEvidence({ admin, businessId: BUSINESS_ID });
  ensure(String(loaded.packet.commerce.generation_id) === String(generation.id), "LOADER_GENERATION_MISMATCH");
  ensure(loaded.packet.commerce.products.length === catalogue.counts.products && loaded.packet.commerce.categories.length === catalogue.counts.categories && loaded.packet.commerce.relations.length === catalogue.counts.product_category_relationships, "LOADER_CATALOGUE_COUNT_MISMATCH");
  const selectedProductIds = new Set(loaded.packet.commerce.products.map(row => String(row.id)));
  ensure(selectedProductIds.size === persistedProducts.length && persistedProducts.every(row => selectedProductIds.has(String(row.id))), "LOADER_PRODUCT_IDENTITY_MISMATCH");
  const selectedProductsBySource = new Map(loaded.packet.commerce.products.map(row => [String(persistedProducts.find(item => String(item.id) === String(row.id))?.source_id), row]));
  for (const source of catalogue.catalogue.products) {
    const selected = selectedProductsBySource.get(String(source.source_id));
    ensure(selected && selected.name === source.name && selected.canonical_url === source.canonical_url && selected.current_price === productsBySource.get(String(source.source_id)).current_price && selected.stock_status === productsBySource.get(String(source.source_id)).stock_status, "LOADER_PRODUCT_CONTENT_MISMATCH");
  }
  const selectedCategoryIds = new Set(loaded.packet.commerce.categories.map(row => String(row.id)));
  ensure(selectedCategoryIds.size === persistedCategories.length && persistedCategories.every(row => selectedCategoryIds.has(String(row.id))), "LOADER_CATEGORY_IDENTITY_MISMATCH");
  const selectedRelations = new Set(loaded.packet.commerce.relations.map(row => `${productById.get(row.product_id)}:${categoryById.get(row.category_id)}`));
  ensure(selectedRelations.size === expectedRelationships.size && [...expectedRelationships].every(key => selectedRelations.has(key)), "LOADER_RELATIONSHIP_IDENTITY_MISMATCH");

  phase = "evidence_context";
  const gscSource = await data(admin.from("organic_evidence_sources").select("id,current_complete_run,evidence_state,current_completeness_state,evidence_as_of").eq("business_id", BUSINESS_ID).eq("source_kind", "search_console").single(), "GSC_SOURCE_READ_FAILED");
  const siteSource = await data(admin.from("organic_evidence_sources").select("id,current_complete_run,evidence_state,current_completeness_state,evidence_as_of").eq("business_id", BUSINESS_ID).eq("source_kind", "site").single(), "SITE_SOURCE_READ_FAILED");
  const [gscRun, siteRun] = await Promise.all([
    data(admin.from("organic_evidence_runs").select("id,state,completeness_state,retrieved_at,evidence_period_start,evidence_period_end,completed_at,source_version").eq("id", gscSource.current_complete_run).single(), "GSC_RUN_READ_FAILED"),
    data(admin.from("organic_evidence_runs").select("id,state,completeness_state,retrieved_at,completed_at,source_version").eq("id", siteSource.current_complete_run).single(), "SITE_RUN_READ_FAILED")
  ]);
  ensure(String(loaded.packet.search_console.selected_run_id) === String(gscRun.id) && String(gscRun.source_version).includes("accepted-port-54321-run-750"), "GSC_RUN_ORIGIN_MISMATCH");
  ensure(gscRun.state === "complete" && gscRun.completeness_state === "provider_limited" && gscSource.evidence_as_of === "2026-09-01T00:00:00+00:00", "GSC_LIMITATION_OR_DATE_MISMATCH");
  const storedGscRows = await allRows(admin, "organic_search_console_observations", "id,grain,query,page_url,clicks,impressions,ctr,average_position,observed_date,observed_start_date,observed_end_date,retrieved_at,evidence_as_of,completeness,provider_limitations", [["business_id", BUSINESS_ID], ["run_id", gscRun.id]], "GSC");
  const selectedGscRows = loaded.packet.search_console.rows;
  const storedById = new Map(storedGscRows.map(row => [String(row.id), row]));
  ensure(storedById.size === storedGscRows.length && storedGscRows.length === loaded.packet.search_console.observation_coverage.stored_count, "GSC_STORED_IDENTITY_MISMATCH");
  ensure(selectedGscRows.length === storedGscRows.length && new Set(selectedGscRows.map(row => String(row.id))).size === storedById.size, "GSC_LOADER_COVERAGE_MISMATCH");
  const gscFields = ["id", "grain", "query", "page_url", "clicks", "impressions", "ctr", "average_position", "observed_date", "observed_start_date", "observed_end_date", "retrieved_at", "evidence_as_of", "completeness", "provider_limitations"];
  for (const selected of selectedGscRows) {
    const stored = storedById.get(String(selected.id));
    ensure(stored && String(selected.source_run_or_generation_reference) === String(gscRun.id), "GSC_LOADER_FOREIGN_OR_DUPLICATE_ROW");
    for (const field of gscFields) ensure(JSON.stringify(stable(selected[field])) === JSON.stringify(stable(stored[field])), "GSC_LOADER_VALUE_OR_PROVENANCE_MISMATCH");
  }
  ensure(loaded.packet.search_console.observation_coverage.exhaustive === true && loaded.packet.search_console.observation_coverage.truncated === false, "GSC_LOADER_NOT_EXHAUSTIVE");
  ensure(gscRun.evidence_period_start === "2025-09-04T16:30:48.496+00:00" && gscRun.evidence_period_end === "2026-09-03T16:30:48.496+00:00", "GSC_REPORTING_PERIOD_MISMATCH");

  const sitePageCount = await admin.from("organic_site_inspected_pages").select("id", { count: "exact", head: true }).eq("business_id", BUSINESS_ID).eq("run_id", siteRun.id);
  ensure(!sitePageCount.error && sitePageCount.count === 0 && String(siteRun.source_version).includes("accepted-port-54321-run-663"), "SITE_RUN_SELECTION_OR_COUNT_MISMATCH");
  const externalSource = await admin.from("organic_evidence_sources").select("id").eq("business_id", BUSINESS_ID).eq("source_kind", "external_search").maybeSingle();
  ensure(!externalSource.error && externalSource.data === null && loaded.packet.external.rows.length === 0, "UNEXPECTED_EXTERNAL_EVIDENCE");

  const previousPacket = { ...loaded.packet, search_console: { ...loaded.packet.search_console, rows: loaded.packet.search_console.rows.slice(0, 1000) } };
  const previousInputHash = buildInputHash(previousPacket);
  ensure(previousInputHash !== loaded.inputHash, "PACKET_IDENTITY_DID_NOT_CHANGE");
  process.stdout.write(`${JSON.stringify({ status: "VERIFIED_READ_ONLY", destination: { project_id: DESTINATION_ID, api_port: 64150, db_port: 64151, max_rows: 1000 }, catalogue: { downloaded: catalogue.counts, persisted: { products: persistedProducts.length, categories: persistedCategories.length, relationships: persistedLinks.length, variations: persistedVariations.length }, selected: { products: loaded.packet.commerce.products.length, categories: loaded.packet.commerce.categories.length, relationships: loaded.packet.commerce.relations.length, variations: 0 } }, search_console: { source_run: 750, selected_run: gscRun.id, stored: storedGscRows.length, selected: selectedGscRows.length, unique_ids: storedById.size, exhaustive: loaded.packet.search_console.observation_coverage.exhaustive, period_start: gscRun.evidence_period_start, period_end: gscRun.evidence_period_end, completeness: gscRun.completeness_state }, site: { source_run: 663, selected_run: siteRun.id, inspected_pages: sitePageCount.count }, external_rows_selected: loaded.packet.external.rows.length, packet_identity_changed: previousInputHash !== loaded.inputHash, input_hash: loaded.inputHash, snapshot_fingerprint: loaded.snapshotFingerprint, acquisition_sha256: CATALOGUE_SHA256 }, null, 2)}\n`);
}

main().catch(error => {
  const safeReadErrors = new Map([
    ["GSC observations count read failed", "GSC_COUNT_READ_FAILED"],
    ["GSC observations page read failed", "GSC_PAGE_READ_FAILED"],
    ["GSC observations final count read failed", "GSC_FINAL_COUNT_READ_FAILED"],
    ["GSC observations count unavailable", "GSC_COUNT_UNAVAILABLE"],
    ["GSC observations unexpected empty page", "GSC_EMPTY_PAGE"],
    ["GSC observations duplicate row identity", "GSC_DUPLICATE_IDENTITY"],
    ["GSC observations row ordering invalid", "GSC_ORDER_INVALID"],
    ["GSC observations page truncated", "GSC_PAGE_TRUNCATED"],
    ["GSC observations source count changed during read", "GSC_COUNT_CHANGED"]
  ]);
  const code = /^[A-Z0-9_]{1,100}$/.test(error?.message || "") ? error.message : safeReadErrors.get(error?.message) || "INPUT_PAGINATION_VERIFICATION_FAILED";
  process.stderr.write(`${JSON.stringify({ status: "VERIFICATION_INCOMPLETE", phase, safe_error_code: code, error_type: /^[A-Za-z]+$/.test(error?.name || "") ? error.name : "Error", frames: (error?.stack || "").split("\n").slice(1, 4).map(frame => frame.trim()) })}\n`);
  process.exitCode = 1;
});
