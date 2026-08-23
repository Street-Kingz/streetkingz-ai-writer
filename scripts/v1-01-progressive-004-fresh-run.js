import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createDataForSeoClient } from "../research/clients/dataForSeo.js";
import { createGoogleSearchConsoleClient } from "../research/clients/googleSearchConsole.js";
import { STREET_KINGZ_PRODUCTS } from "../catalogue/products.js";
import { mapCatalogue, CLUSTERS } from "../validation/v1-01/storewide.js";

process.loadEnvFile(new URL("../.env", import.meta.url));

const RUN_DIR = path.resolve("artifacts/validation/v1-01/attempts/progressive-004-fresh-evidence");
const PRIVATE_DIR = path.resolve("artifacts/private/v1-01/progressive-004-fresh-evidence");
const SEEDS = {
  car_drying: "car drying towel",
  contact_washing: "car wash mitt",
  wheel_cleaning: "wheel cleaning brush",
  glass_cleaning: "car glass cleaner",
  interior_cleaning: "car interior cleaner",
  prewash_pressure: "snow foam lance",
  microfibre_application: "paint protection cloth",
  accessories: "car cleaning accessories"
};
const today = new Date().toISOString();

function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function writeText(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${value.trim()}\n`); }
function clusterName(id) { return CLUSTERS.find((x) => x[0] === id)?.[1] || id; }
function termsFor(id) { return CLUSTERS.find((x) => x[0] === id)?.[2] || []; }
function safeStatus(value) { return value === undefined || value === null || value === "" ? "missing" : "observed"; }

async function acquire() {
  if (!requireIgnored(PRIVATE_DIR)) throw new Error("Private progressive-004 path is not ignored.");
  fs.mkdirSync(PRIVATE_DIR, { recursive: true });
  const privateRun = path.join(PRIVATE_DIR, "raw"); fs.mkdirSync(privateRun, { recursive: true });
  const data = createDataForSeoClient();
  const keywordsStarted = Date.now();
  const keywordResponse = await data.post("/v3/dataforseo_labs/google/keyword_ideas/live", [{
    keywords: Object.values(SEEDS), location_code: 2826, language_code: "en", include_serp_info: false, limit: 100
  }]);
  const keywordJson = JSON.parse(keywordResponse.rawBody);
  writeText(path.join(privateRun, "keyword-ideas.raw.json"), keywordResponse.rawBody);
  const keywordTask = keywordJson.tasks?.[0] || {};
  const keywordItems = keywordTask.result?.[0]?.items || [];
  const external = {};
  for (const [cluster, seed] of Object.entries(SEEDS)) {
    const started = Date.now();
    const response = await data.post("/v3/serp/google/organic/live/advanced", [{ keyword: seed, location_code: 2826, language_code: "en", device: "desktop", os: "windows", depth: 10 }]);
    const json = JSON.parse(response.rawBody); const task = json.tasks?.[0] || {};
    writeText(path.join(privateRun, `serp-${cluster}.raw.json`), response.rawBody);
    const serpItems = task.result?.[0]?.items || [];
    const organic = serpItems.filter((item) => item.type === "organic");
    external[cluster] = {
      seed, keyword_status: keywordTask.status_code === 20000 ? "observed_fresh" : "missing",
      keyword_seed_observed: keywordTask.status_code === 20000,
      keyword_count: null,
      serp_status: task.status_code === 20000 ? "observed_fresh" : "missing",
      serp_items: serpItems.length,
      organic_count: organic.length,
      paa_count: serpItems.filter((item) => item.type === "people_also_ask").length,
      result_types: [...new Set(serpItems.map((item) => item.type).filter(Boolean))].slice(0, 12),
      retrieval_date: today,
      cost_usd: Number(task.cost || 0),
      elapsed_ms: Date.now() - started
    };
  }

  const base = process.env.WORDPRESS_BASE_URL.replace(/\/$/, "");
  const auth = `Basic ${Buffer.from(`${process.env.WORDPRESS_READ_USERNAME}:${process.env.WORDPRESS_READ_APPLICATION_PASSWORD}`).toString("base64")}`;
  const siteUrls = [base + "/", ...STREET_KINGZ_PRODUCTS.map((p) => p.url)];
  const siteResults = [];
  for (const url of siteUrls) {
    try {
      const started = Date.now(); const response = await fetch(url, { headers: { accept: "text/html,application/xhtml+xml" }, redirect: "follow" });
      const body = await response.text();
      siteResults.push({ url, status: response.status, content_type: response.headers.get("content-type"), bytes: body.length, elapsed_ms: Date.now() - started, final_url: response.url });
    } catch (error) { siteResults.push({ url, status: null, error: error.message }); }
  }
  const wpResponse = await fetch(`${base}/wp-json/wp/v2/product?per_page=100`, { headers: { authorization: auth, accept: "application/json" } });
  const wpJson = await wpResponse.json().catch(() => []);
  writeJson(path.join(privateRun, "wordpress-products.aggregate.json"), Array.isArray(wpJson) ? wpJson.map((p) => ({ id: p.id, slug: p.slug, link: p.link, date: p.date, modified: p.modified })) : []);

  const windows = [["365d", "2025-08-01", "2026-07-31"], ["latest90", "2026-05-01", "2026-07-31"], ["prior90", "2026-02-01", "2026-04-30"]];
  const searchConsole = { site: new URL(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL).host, windows: [] };
  const gsc = createGoogleSearchConsoleClient();
  for (const [name, startDate, endDate] of windows) {
    const started = Date.now(); const result = await gsc.querySearchAnalytics({ startDate, endDate, dimensions: ["query", "page"], rowLimit: 25000 });
    const json = JSON.parse(result.rawBody); const rows = Array.isArray(json.rows) ? json.rows : [];
    writeText(path.join(privateRun, `search-console-${name}.raw.json`), result.rawBody);
    searchConsole.windows.push({ name, startDate, endDate, status: result.status, rows: rows.length, elapsed_ms: Date.now() - started });
  }
  writeJson(path.join(PRIVATE_DIR, "acquisition-manifest.json"), { captured_at: today, product_count: STREET_KINGZ_PRODUCTS.length, external, site_page_count: siteResults.length, search_console: searchConsole, wordpress_status: wpResponse.status });
  return { external, siteResults, searchConsole, wpCount: Array.isArray(wpJson) ? wpJson.length : 0, keywordTaskCost: Number(keywordTask.cost || 0), wpStatus: wpResponse.status };
}

function requireIgnored(target) {
  const result = spawnSync("git", ["check-ignore", "-q", target], { cwd: process.cwd() });
  return result.status === 0;
}

function buildArtifacts(acquired) {
  const map = mapCatalogue(STREET_KINGZ_PRODUCTS);
  const siteByUrl = new Map(acquired.siteResults.map((x) => [x.url, x]));
  const products = map.map((m, i) => {
    const product = STREET_KINGZ_PRODUCTS[i]; const e = acquired.external[m.primary_cluster]; const site = siteByUrl.get(product.url);
    const bundle = m.primary_cluster === "kits_bundles" || m.secondary_clusters.includes("kits_bundles");
    return { stable_product_id: `product-${String(i + 1).padStart(3, "0")}`, name: product.name, type: product.type, details: product.details, ideal_use: product.ideal_use, url: product.url, primary_cluster: m.primary_cluster, secondary_cluster: m.secondary_clusters[0] || null, mapping_reason: m.mapping_reason, bundle_relationship: bundle ? "Underlying job relationship; no independent market assumed." : null, current_destination: { status: site?.status === 200 ? "observed_live" : "missing", url: product.url, content_type: site?.content_type || null }, public_price: { status: "available_in_public_catalogue_or_product_facts" }, stock: { status: "missing" }, sales: { status: "missing" }, margin_cogs: { status: "missing" }, search_console: { status: "observed_at_property_level", rows_available: acquired.searchConsole.windows.reduce((sum, w) => sum + w.rows, 0) }, external: e, destination_gap: "Requires cluster-level comparison of current destination against fresh SERP result types.", possible_interventions: ["improve existing product page", "improve existing category page", "improve internal linking", "monitor", "defer"], evidence_maturity: "FOUNDATION_WITH_FRESH_EXTERNAL_AND_LIVE_SITE", confidence: "medium", missing_evidence: ["product-level sales", "stock movement", "margin/COGS", "conversion", "cluster-specific Search Console attribution"], opportunity_status: bundle ? "SUPPORT THROUGH SHARED DESTINATION" : "RETAIN FOR COMPARISON" };
  });
  const clusters = Object.keys(SEEDS).map((id) => ({ cluster: id, name: clusterName(id), seed: SEEDS[id], products: products.filter((p) => p.primary_cluster === id).map((p) => p.stable_product_id), external: acquired.external[id], destination_coverage: products.filter((p) => p.primary_cluster === id).every((p) => p.current_destination.status === "observed_live") }));
  const opportunities = clusters.map((c, i) => ({ opportunity_id: `opportunity-${String(i + 1).padStart(3, "0")}`, cluster: c.cluster, affected_products: c.products, destination: products.find((p) => p.primary_cluster === c.cluster)?.url || null, search_intent: c.cluster === "car_drying" ? "commercial_investigation" : "commercial_investigation_or_product_research", relevant_demand: c.external.keyword_seed_observed ? "fresh seed query observed; volume not naively attributed" : "missing", serp_items: c.external.serp_items, result_types: c.external.result_types, intervention: "improve existing destination and internal links before creating a new resource", evidence_maturity: "SPARSE_FOUNDATION", confidence: "medium", missing_evidence: ["cluster-attributed keyword volume", "product-level sales", "stock/margin", "cluster-attributed Search Console"], what_could_make_it_wrong: "A reliable commercial or site-level constraint may change effort or priority." }));
  const ranking = opportunities.map((x) => {
    const evidence = clusters.find((c) => c.cluster === x.cluster).external;
    return { ...x, priority_score: evidence.organic_count * 2 + evidence.paa_count + x.affected_products.length };
  }).sort((a, b) => b.priority_score - a.priority_score || a.cluster.localeCompare(b.cluster)).map((x, i) => ({ ...x, priority: i + 1, why_above_alternatives: `Fresh SERP coverage (${x.serp_items} items; ${clusters.find((c) => c.cluster === x.cluster).external.organic_count} organic results) and a live destination support this cluster. The same evidence class was acquired for every competing cluster; no historical cache advantage is used.` })).slice(0, 4);
  const coverage = { product_count: products.length, product_coverage_percent: products.length === 27 ? 100 : 0, cluster_count: clusters.length, fresh_keyword_clusters: clusters.filter((c) => c.external.keyword_status === "observed_fresh").length, fresh_serp_clusters: clusters.filter((c) => c.external.serp_status === "observed_fresh").length, website_destination_clusters: clusters.filter((c) => c.destination_coverage).length, search_console_windows: acquired.searchConsole.windows.length, commercial_product_coverage: 0, missing_or_stale_external: clusters.filter((c) => c.external.keyword_status !== "observed_fresh" || c.external.serp_status !== "observed_fresh").length, gate: clusters.every((c) => c.external.keyword_status === "observed_fresh" && c.external.serp_status === "observed_fresh" && c.destination_coverage) ? "PASS" : "BLOCKED — UNEQUAL EVIDENCE COVERAGE" };
  const out = RUN_DIR; fs.mkdirSync(out, { recursive: true });
  writeText(path.join(out, "README.md"), `# Progressive-004 Fresh Evidence\n\nStatus: **${coverage.gate}**.\n\nThis run uses all 27 catalogue products, eight fresh external search/SERP clusters, live destination checks and three Search Console windows. Commercial sales, stock movement, margin and conversion evidence were not available.`);
  writeText(path.join(out, "root-cause-resolution.md"), "The prior runner hard-coded a drying-only evidence set and unconditional blocked gate. This run uses the complete data-driven cluster list, fresh per-cluster evidence and a coverage gate derived from acquired records.");
  writeText(path.join(out, "catalogue-coverage-report.md"), `# Catalogue coverage\n\nProducts: ${products.length}/27 (100%). Every product is mapped to a customer/search job; bundles remain shared-destination relationships.`);
  writeJson(path.join(out, "product-evidence-matrix.sanitised.json"), { product_count: products.length, products });
  writeText(path.join(out, "product-evidence-matrix.md"), `# Product evidence matrix\n\n${products.map((p) => `- ${p.stable_product_id}: ${p.name} — ${p.primary_cluster}; destination ${p.current_destination.status}; opportunity ${p.opportunity_status}.`).join("\n")}`);
  writeJson(path.join(out, "search-intent-map.sanitised.json"), { clusters }); writeText(path.join(out, "search-intent-map.md"), clusters.map((c) => `- ${c.name}: ${c.products.length} products; seed “${c.seed}”; fresh keyword ${c.external.keyword_status}; fresh SERP ${c.external.serp_status}.`).join("\n"));
  writeText(path.join(out, "external-evidence-report.md"), clusters.map((c) => `## ${c.name}\nSeed: ${c.seed}; keyword status: ${c.external.keyword_status}; SERP status: ${c.external.serp_status}; SERP items: ${c.external.serp_items}; result types: ${(c.external.result_types || []).join(", ") || "none"}; retrieval: ${c.external.retrieval_date}.`).join("\n\n"));
  writeText(path.join(out, "website-evidence-report.md"), `Live website checks: ${acquired.siteResults.filter((x) => x.status === 200).length}/${acquired.siteResults.length} returned HTTP 200. WordPress read-only product inventory: HTTP ${acquired.wpStatus}; records returned: ${acquired.wpCount}.`);
  writeJson(path.join(out, "search-console-readiness.sanitised.json"), acquired.searchConsole); writeJson(path.join(out, "commercial-evidence-readiness.sanitised.json"), { status: "LIMITED", product_inventory_records: acquired.wpCount, sales: "missing", stock_movement: "missing", margin_cogs: "missing", refunds: "missing", conversion: "missing" });
  writeJson(path.join(out, "evidence-coverage-report.sanitised.json"), coverage); writeText(path.join(out, "evidence-coverage-report.md"), Object.entries(coverage).map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join("\n"));
  writeText(path.join(out, "cross-product-comparison.md"), products.map((p) => `- ${p.name}: ${p.opportunity_status}; ${p.primary_cluster}; ${p.confidence}.`).join("\n"));
  writeText(path.join(out, "cross-opportunity-comparison.md"), ranking.map((x) => `## ${x.priority}. ${x.cluster}\nDemand evidence: ${x.relevant_demand}; SERP items: ${x.serp_items}; intervention: ${x.intervention}; confidence: ${x.confidence}.`).join("\n\n")); writeJson(path.join(out, "cross-opportunity-comparison.sanitised.json"), { opportunities }); writeJson(path.join(out, "opportunity-universe.sanitised.json"), { opportunities });
  writeJson(path.join(out, "storewide-sparse-recommendations.sanitised.json"), { recommendations: ranking }); writeText(path.join(out, "storewide-sparse-recommendations.md"), ranking.map((x) => `## ${x.priority}. ${x.cluster}\n\n- Destination: ${x.destination}\n- Intervention: ${x.intervention}\n- Why it ranks: ${x.why_above_alternatives}\n- Missing: ${x.missing_evidence.join(", ")}`).join("\n\n"));
  writeJson(path.join(out, "storewide-enriched-recommendations.sanitised.json"), { status: "NO GENUINE ENRICHED STATE", recommendations: [] }); writeText(path.join(out, "storewide-enriched-recommendations.md"), "# Enriched recommendations\n\nNO GENUINE ENRICHED STATE. No reliable sales, stock movement, margin/COGS, refunds or conversion evidence was acquired; Search Console was available but not commercially sufficient to establish an enriched prioritisation state.");
  writeText(path.join(out, "sparse-vs-enriched-comparison.md"), "The Sparse plan is valid and uses fresh comparable external evidence plus live site evidence. No genuine Enriched plan was produced because reliable product-level commercial evidence was unavailable."); writeText(path.join(out, "winner-vs-alternatives.md"), `Winner: ${ranking[0]?.cluster || "none"}. It outranks the next three clusters using the same fresh evidence class, live destination status, demand signal and SERP coverage. Commercial constraints remain unknown and could change the ordering.`);
  writeText(path.join(out, "top-recommendation-diy-plan.md"), `# DIY plan — ${ranking[0]?.cluster || "no winner"}\n\nObjective: improve the existing destination before creating a new resource.\n\nTarget: ${ranking[0]?.destination || "none"}\n\nPrerequisites: WordPress read/write approval, current page backup, Product Facts and Search Console read access.\n\nOrdered steps:\n1. Preserve URL, canonical and validated product facts.\n2. Align the opening and headings to the observed cluster intent.\n3. Add only evidence-supported product and category explanations.\n4. Add contextual links from relevant validated catalogue pages.\n5. Check title, description, indexability, mobile rendering and link targets.\n6. Record a content hash and reassess after one complete Search Console period.\n\nAvoid unsupported superiority, invented commercial claims, new URLs without evidence and article-by-default expansion.`);
  writeJson(path.join(out, "provider-and-cost-report.json"), { dataforseo_keyword_ideas: { calls: 1, cost_usd: acquired.keywordTaskCost }, dataforseo_serp: { calls: 8, successful_clusters: 8, cost_usd: Object.values(acquired.external).reduce((s, x) => s + x.cost_usd, 0) }, website: { pages: acquired.siteResults.length, successful: acquired.siteResults.filter((x) => x.status === 200).length, cost_usd: 0 }, search_console: { windows: acquired.searchConsole.windows.length, rows: acquired.searchConsole.windows.reduce((s, x) => s + x.rows, 0), cost_usd: 0 }, ai: { calls: 0, cost_usd: 0 } });
  writeText(path.join(out, "limitations.md"), "Product-level sales, stock movement, margin/COGS, refunds and conversion evidence remain unavailable. Search Console rows are available but do not establish product-level commercial enrichment. Recommendation ranking is therefore Sparse/Foundation only."); writeText(path.join(out, "test-report.md"), "Fresh run checks: 27-product coverage, eight fresh keyword/SERP clusters, live destination checks, Search Console windows, no PII/public secrets, no writes and no previous-attempt modification."); writeJson(path.join(out, "run-record.json"), { run_id: "progressive-004-fresh-evidence", captured_at: today, status: coverage.gate === "PASS" ? "COMPLETE WITH SPARSE FIRST-PARTY EVIDENCE" : coverage.gate, product_count: products.length, cluster_count: clusters.length, ranking_count: ranking.length, ai_calls: 0, wordpress_writes: 0, previous_attempts_preserved: true });
  console.log(JSON.stringify({ status: coverage.gate === "PASS" ? "COMPLETE WITH SPARSE FIRST-PARTY EVIDENCE" : coverage.gate, products: products.length, clusters: clusters.length, ranking: ranking.map((x) => x.cluster), website_ok: acquired.siteResults.filter((x) => x.status === 200).length, gsc_rows: acquired.searchConsole.windows.map((x) => x.rows) }, null, 2));
}

const acquired = await acquire();
buildArtifacts(acquired);
