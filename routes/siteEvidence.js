import express from "express";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { privilegedClient } from "../product-kernel/privileged.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { correlationMiddleware } from "../product-kernel/correlation.js";
import { acquireSiteEvidence, siteBoundary, siteEvidenceTransport, SITE_EVIDENCE_VERSION, SITE_SOURCE_VERSION } from "../product-kernel/siteEvidence.js";

const router = express.Router();
router.use(correlationMiddleware);
const provider = "site";

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

const handle = fn => (req, res) => Promise.resolve(fn(req, res)).catch(error => { const safe = safeError(error, req.correlationId); res.status(safe.status).json(safe.body); });

router.post("/api/product/organic-evidence/site/acquire", handle(async (req, res) => {
  const { business, admin } = await context(req);
  const store = await admin.from("commerce_stores").select("id,canonical_base_url,current_generation,sync_state").eq("business_id", business.id).eq("provider", "woocommerce").maybeSingle();
  if (store.error || !store.data || store.data.sync_state !== "complete" || !store.data.current_generation) throw new ProductError("SITE_COMMERCE_REQUIRED", "A complete verified Business site is required.", 409);
  const boundary = siteBoundary(store.data.canonical_base_url);
  const products = await admin.from("commerce_products").select("id,source_id,canonical_url").eq("business_id", business.id).eq("store_id", store.data.id).eq("generation_id", store.data.current_generation);
  const categories = await admin.from("commerce_categories").select("id,source_id").eq("business_id", business.id).eq("store_id", store.data.id).eq("generation_id", store.data.current_generation);
  if (products.error || categories.error) throw new ProductError("SITE_COMMERCE_READ_FAILED", "Verified Business evidence could not be read.", 503);
  const ensured = await admin.rpc("organic_ensure_source", { p_business_id: business.id, p_source_class: "no_separate_connection", p_source_kind: "site", p_provider_id: null, p_connection_id: null });
  if (ensured.error || !ensured.data) throw new ProductError("SITE_SOURCE_FAILED", "The site evidence source could not be prepared.", 503);
  const source = ensured.data;
  if (source.active_run) throw new ProductError("SITE_RUN_ACTIVE", "Site evidence collection is already running.", 409);
  const retrievedAt = new Date().toISOString();
  const begun = await admin.rpc("organic_begin_run", { p_source_id: source.id, p_retrieved_at: retrievedAt, p_provider_version: SITE_EVIDENCE_VERSION, p_source_version: SITE_SOURCE_VERSION });
  if (begun.error || !begun.data) throw new ProductError("SITE_RUN_BEGIN_FAILED", "Site evidence collection could not start.", 503);
  const run = begun.data;
  const fail = async error => { await admin.rpc("organic_finish_run", { p_run_id: run.id, p_state: "failed", p_completeness_state: "unavailable", p_error_code: (error?.code || "SITE_COLLECTION_FAILED").replace(/[^A-Z0-9_:-]/g, "_").slice(0, 100) }); throw error instanceof ProductError ? error : new ProductError("SITE_COLLECTION_FAILED", "Site evidence collection failed.", 502); };
  try {
    const result = await acquireSiteEvidence({ boundary, transport: siteEvidenceTransport(), products: products.data || [], categories: categories.data || [] });
    const discoveredRows = result.discovered.map(item => ({ business_id: business.id, source_id: source.id, run_id: run.id, normalized_url: item.url, comparison_url: item.url, discovery_source: item.discovery_source === "robots_sitemap" ? "robots_sitemap" : item.discovery_source, discovery_parent_url: item.discovery_parent_url, discovered_at: retrievedAt, last_discovered_at: retrievedAt, inspected_at: item.inspected_at || null, inspection_status: item.inspection_status || "discovered", reason_not_inspected: item.reason_not_inspected || null, commerce_product_id: item.relation?.kind === "product" ? item.relation.id : null, commerce_category_id: item.relation?.kind === "category" ? item.relation.id : null, relation_source: item.relation?.kind === "product" ? "woo_product" : item.relation?.kind === "category" ? "woo_category" : null }));
    const savedUrls = discoveredRows.length ? await admin.from("organic_site_discovered_urls").insert(discoveredRows).select("id,normalized_url") : { data: [], error: null };
    if (savedUrls.error) throw new ProductError("SITE_URL_PERSIST_FAILED", "Discovered site evidence could not be saved.", 503);
    const urlIds = new Map((savedUrls.data || []).map(row => [row.normalized_url, row.id]));
    const pageRows = result.pages.filter(item => item.page).map(item => { const p = item.page; return { business_id: business.id, source_id: source.id, run_id: run.id, discovered_url_id: urlIds.get(item.descriptor.url), requested_url: p.requested_url, final_url: p.final_url, http_status: p.http_status, content_type: p.content_type || null, retrieved_at: p.retrieved_at, response_size_bytes: p.response_size_bytes || null, status: p.status, declared_canonical_raw: p.canonical_raw || null, declared_canonical_resolved: p.canonical_resolved || null, canonical_state: p.canonical_state || "absent", robots_allowed: item.descriptor.robots_allowed ?? null, meta_noindex: p.meta_noindex ?? null, x_robots_noindex: p.x_robots_noindex ?? null, page_type: p.page_type, title: p.title || null, meta_description: p.meta_description || null, h1: p.h1 || [], headings: p.headings || [], internal_links: p.internal_links || [], limitation: p.limitation || p.reason_not_inspected || null, direct_or_derived: "direct", provider_version: SITE_EVIDENCE_VERSION, source_version: SITE_SOURCE_VERSION }; }).filter(row => row.discovered_url_id);
    const savedPages = pageRows.length ? await admin.from("organic_site_inspected_pages").insert(pageRows) : { error: null };
    if (savedPages.error) throw new ProductError("SITE_PAGE_PERSIST_FAILED", "Inspected site evidence could not be saved.", 503);
    const state = result.completeness === "complete" ? "complete" : result.completeness === "partial" ? "partial" : "failed";
    const finish = await admin.rpc("organic_finish_run", { p_run_id: run.id, p_state: state, p_completeness_state: state === "complete" ? "complete" : state === "partial" ? "partial" : "unavailable", p_evidence_as_of: state === "failed" ? null : result.evidence_as_of, p_error_code: state === "failed" ? "SITE_NO_ACCEPTED_INVENTORY" : state === "partial" ? "SITE_LIMITATION" : null });
    if (finish.error) throw finish.error;
    res.status(200).json({ status: state, completeness: state === "complete" ? "complete" : state === "partial" ? "partial" : "failed", evidence_as_of: result.evidence_as_of, limitations: result.limitations, sitemap: { documents: result.sitemap_documents, urls: result.sitemap_urls }, stats: result.stats, discovered_url_count: result.discovered.length, inspected_page_count: result.pages.length });
  } catch (error) { await fail(error); }
}));

export default router;
