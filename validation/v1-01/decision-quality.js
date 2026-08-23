import fs from "node:fs";
import path from "node:path";
import { STREET_KINGZ_PRODUCTS } from "../../catalogue/products.js";

export const CLUSTER_DEFS = [
  ["car_drying", "Car drying", "car drying towel"],
  ["contact_washing", "Contact washing", "car wash mitt"],
  ["wheel_cleaning", "Wheel cleaning", "wheel cleaning brush"],
  ["glass_cleaning", "Glass cleaning", "car glass cleaner"],
  ["interior_cleaning", "Interior cleaning", "car interior cleaner"],
  ["prewash_pressure", "Pre-wash and pressure-washer equipment", "snow foam lance"],
  ["microfibre_application", "Microfibre application and paint protection", "paint protection cloth"],
  ["accessories", "Cleaning accessories", "car cleaning accessories"]
];
const bundle = /\b(bundle|kit|set|pack|trilogy|power pack)\b/i;

export function mapProduct(product, index) {
  const s = `${product.name} ${product.type} ${product.details} ${product.ideal_use}`.toLowerCase();
  let primary = "accessories";
  if (/drying towel|chamois|drying performance/.test(s)) primary = "car_drying";
  else if (/wheel|barrel brush|flosser/.test(s)) primary = "wheel_cleaning";
  else if (/glass|window|mirror/.test(s)) primary = "glass_cleaning";
  else if (/interior|multi-clean|coral fleece/.test(s)) primary = "interior_cleaning";
  else if (/foam lance|pressure washer|snow foam|stubby gun/.test(s)) primary = "prewash_pressure";
  else if (/shampoo|wash mitt|contact wash|wash stage/.test(s)) primary = "contact_washing";
  else if (/scrub pad|paint protection|microfibre cloth|microfibre-faced/.test(s)) primary = "microfibre_application";
  const secondary = [];
  if (bundle.test(s)) secondary.push("bundle_relationship");
  if (/wash|shampoo/.test(s) && primary !== "contact_washing") secondary.push("contact_washing");
  if (/dry|towel/.test(s) && primary !== "car_drying") secondary.push("car_drying");
  if (/cloth|microfibre/.test(s) && primary !== "microfibre_application") secondary.push("microfibre_application");
  return {
    stable_product_id: `product-${String(index + 1).padStart(3, "0")}`,
    name: product.name, type: product.type, details: product.details, ideal_use: product.ideal_use, url: product.url,
    primary_cluster: primary, secondary_clusters: secondary,
    bundle_component_relationship: bundle.test(s) ? "Bundle/kit represented through underlying customer job; no independent market assumed." : null,
    mapping_reason: `Customer job derived from the product's stated use and contents: ${CLUSTER_DEFS.find(x => x[0] === primary)?.[1] || primary}.`,
    confidence: primary === "accessories" ? "medium" : "high"
  };
}
export function mapCatalogue(products = STREET_KINGZ_PRODUCTS) { return products.map(mapProduct); }

export function parseKeywordEvidence(raw, seeds = Object.fromEntries(CLUSTER_DEFS.map(x => [x[0], x[2]]))) {
  const items = raw?.tasks?.[0]?.result?.[0]?.items || [];
  return Object.fromEntries(Object.entries(seeds).map(([cluster, seed]) => {
    const tokens = seed.toLowerCase().split(/\s+/).filter(x => x.length > 3);
    const matched = items.filter(item => tokens.some(token => String(item.keyword || "").toLowerCase().includes(token)));
    return [cluster, { seed, source_status: matched.length ? "observed_fresh_items" : "no_relevant_returned_items", queries: matched.slice(0, 20).map(item => ({ keyword: item.keyword, search_volume: item.keyword_info?.search_volume ?? null, cpc: item.keyword_info?.cpc ?? null, competition: item.keyword_info?.competition ?? null, intent: item.search_intent_info?.main_intent ?? null, last_updated: item.keyword_info?.last_updated_time ?? null })), excluded_returned_items: items.length - matched.length, provenance: "DataForSEO keyword_ideas live response" }];
  }));
}

export function parseSerpEvidence(raw) {
  const result = raw?.tasks?.[0]?.result?.[0];
  const items = result?.items || [];
  return { keyword: result?.keyword || null, retrieved_at: result?.datetime || null, item_types: result?.item_types || [], results: items.map(item => ({ type: item.type, rank: item.rank_absolute, title: item.title || item.description || null, url: item.url || null, domain: item.domain || null, questions: item.items?.map(x => x.question || x.title).filter(Boolean).slice(0, 8) || [] })) };
}

export function parseGscRows(raw, mappedProducts) {
  const rows = raw?.rows || [];
  return rows.map(row => {
    const query = row.keys?.[0] || ""; const page = row.keys?.[1] || "";
    const product = mappedProducts.find(p => page === p.url);
    const q = query.toLowerCase();
    const cluster = product?.primary_cluster || (/towel|drying/.test(q) ? "car_drying" : /wheel/.test(q) ? "wheel_cleaning" : /foam|stubby|pressure/.test(q) ? "prewash_pressure" : /glass|window/.test(q) ? "glass_cleaning" : /interior|multi/.test(q) ? "interior_cleaning" : /mitt|shampoo|wash/.test(q) ? "contact_washing" : /cloth|paint|protection/.test(q) ? "microfibre_application" : null);
    return { query, page, cluster, clicks: row.clicks ?? null, impressions: row.impressions ?? null, ctr: row.ctr ?? null, position: row.position ?? null, branded: /street\s*kingz|street\s*kings|kingz detailing/i.test(query) };
  });
}

export function analyseDestination(html, url) {
  const text = String(html || "");
  const title = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || null;
  const description = text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] || null;
  const headings = [...text.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 20);
  const links = [...text.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() })).filter(x => x.text).slice(0, 80);
  return { url, title, description, headings, internal_links: links.filter(x => x.href.includes("streetkingz.co.uk")), content_bytes: Buffer.byteLength(text), gap_flags: { has_title: Boolean(title), has_description: Boolean(description), heading_count: headings.length, internal_link_count: links.filter(x => x.href.includes("streetkingz.co.uk")).length, likely_thin_content: text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length < 500 } };
}

export function buildOpportunityEvidence({ mapped, keywords, serps, gsc, destinations }) {
  return CLUSTER_DEFS.map(([cluster, name, seed]) => {
    const products = mapped.filter(p => p.primary_cluster === cluster); const k = keywords[cluster]; const s = serps[cluster]; const rows = gsc.filter(x => x.cluster === cluster); const destination = destinations.find(x => products.some(p => p.url === x.url)) || null;
    const demand = k?.queries?.filter(x => x.search_volume !== null).sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0)).slice(0, 8) || [];
    const resultMix = [...new Set((s?.results || []).map(x => x.type))];
    const commercial = resultMix.some(x => ["popular_products", "product_reviews", "product_specifications"].includes(x)) || (s?.results || []).some(x => /collection|product|shop|cleaner|brush|towel|mitt|lance/i.test(`${x.title} ${x.url}`));
    let intervention = "monitor"; let destinationGap = "Evidence does not yet justify a material destination change.";
    if (destination?.gap_flags?.likely_thin_content || destination?.gap_flags?.internal_link_count < 3) { intervention = destination?.url ? "improve existing product/category page and internal links" : "create justified resource after validation"; destinationGap = "Live destination has limited extractable content or internal-link support; improve the existing destination before creating a new page."; }
    if (cluster === "accessories" && !products.length) intervention = "no action";
    return { opportunity_id: `opportunity-${cluster}`, cluster, name, affected_products: products.map(p => p.stable_product_id), destination: destination?.url || products[0]?.url || null, demand_evidence: demand, keyword_query_count: k?.queries?.length || 0, serp_evidence: s, gsc_evidence: { rows: rows.length, queries: rows.slice(0, 20), latest_direction: "available in acquired windows; no causal trend inferred" }, destination_analysis: destination, intent: commercial ? "commercial investigation / product research" : "mixed informational and commercial investigation", intervention, destination_gap: destinationGap, feasibility: commercial ? "plausible ecommerce destination; competition varies by SERP" : "uncertain; SERP intent needs careful qualification", evidence_ids: [`keyword:${cluster}`, `serp:${cluster}`, `gsc:${cluster}`, `destination:${cluster}`], missing_evidence: ["product-level sales", "stock movement", "margin/COGS", "conversion"], confidence: demand.length && s?.results?.length ? "medium" : "low", what_could_make_it_wrong: "Reliable commercial constraints, changing SERPs or better first-party page evidence could alter priority." };
  });
}

export function buildDiyPlan(winner, mapped) {
  const p = mapped.filter(x => winner.affected_products.includes(x.stable_product_id));
  const target = winner.cluster === "prewash_pressure" ? mapped.find(x => /Stubby Gun \+ Foam Lance Bundle/i.test(x.name)) : p[0];
  const links = winner.cluster === "prewash_pressure" ? mapped.filter(x => x.primary_cluster === "prewash_pressure" && x.stable_product_id !== target?.stable_product_id) : mapped.filter(x => x.primary_cluster !== winner.cluster && /bundle|kit|set/i.test(x.type)).slice(0, 3);
  const queryThemes = [...new Set([...(winner.gsc_evidence?.queries || []).filter(x => !x.branded).map(x => x.query), ...(winner.demand_evidence || []).filter(x => /wash|dry|wheel|glass|interior|foam|lance|mitt|brush|towel|clean/i.test(x.keyword)).map(x => x.keyword)])].slice(0, 12);
  return `# Evidence-grounded DIY plan: ${winner.name}\n\n## Objective\nImprove the existing destination for the ${winner.name.toLowerCase()} customer job without creating a new page unless the current destination cannot satisfy the observed intent.\n\n## Target\n- URL: ${target?.url || winner.destination}\n- Intent: ${winner.intent}\n- Affected products: ${p.map(x => x.name).join(", ")}\n- Query themes: ${queryThemes.map(x => `“${x}”`).join(", ") || "No relevant query theme was validated; do not invent one."}\n\n## Current gap\n${winner.destination_gap}\nTitle: ${winner.destination_analysis?.title || "not extracted"}. Headings: ${(winner.destination_analysis?.headings || []).join("; ") || "not extracted"}. Internal links observed: ${winner.destination_analysis?.gap_flags?.internal_link_count ?? "unknown"}.\n\n## Prerequisites and effort\nWordPress content-editor access, a backup or revision, Product Facts, and read-only Search Console. Basic ecommerce SEO and link QA skills. Difficulty: moderate. Effort: one focused editing session plus QA and one comparable Search Console review window.\n\n## Exact changes\n1. Keep the URL, canonical, product identity, pricing and indexability unchanged.\n2. Rewrite the first screen to state the customer job and the product's validated use, using only the validated query themes without stuffing.\n3. Add a concise choice/use-case section based only on the supplied SERP questions and product facts; do not infer universal performance from GSM, construction or competitor copy.\n4. Add a clearly labelled related-options block that links to: ${links.map(x => `${x.name} (${x.url})`).join(", ") || "no additional link has been validated"}.\n5. Add contextual internal links from the component destination pages using descriptive anchors such as “${winner.name.toLowerCase()}” or the product's customer job, never exact-match repetition in every link.\n6. Add or improve the title/meta description only after previewing the live result; make one clear promise that the page can support.\n\n## Supported / prohibited\nSupported: catalogue product name, type, stated details and intended use; observed query/SERP/page evidence listed above. Prohibited: invented ratings, universal “best” claims, competitor claims not in the SERP evidence, sales/stock/margin claims, guaranteed rankings or unvalidated technical causation.\n\n## QA and verification\nPreview desktop/mobile; verify one H1, title, description, canonical and indexability; test every internal link; confirm no PII or private commercial value; compare the rendered page with the before snapshot; record the content hash.\n\n## Monitoring and stop conditions\nRecheck query/page impressions, clicks, CTR and position after one complete comparable Search Console period. Stop if the destination, intent or product availability changes, or if new evidence shows the page is not the right destination.\n`;
}
