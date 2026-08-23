import { STREET_KINGZ_PRODUCTS } from "../../catalogue/products.js";

export const CLUSTERS = [
  ["car_drying", "Car drying", /(?:car|vehicle|microfibre|microfiber|sahara|chamois).*(?:dry|towel)|drying\s+towel/i, /wheel\s+(?:paint|repair|protector)|tyre|windscreen|film|decorat|graffiti/i],
  ["contact_washing", "Contact washing", /(?:car|auto|vehicle)\s+(?:wash|washing)|wash\s+mitt|car\s+shampoo|wash\s+kit/i, /wheel|repair|graffiti|new\s+york|ceramic\s+coating/i],
  ["wheel_cleaning", "Wheel cleaning", /wheel\s+(?:clean|brush|flosser|woolies)|barrel\s+brush|alloy\s+wheel\s+clean/i, /wheel\s+(?:paint|repair|protector|protectors|filler)|tyre/i],
  ["glass_cleaning", "Glass cleaning", /(?:car|auto|vehicle)?\s*(?:glass|window|windscreen)\s+(?:clean|cloth)|glass\s+cleaner|window\s+cleaner/i, /windscreen\s+(?:repair|replacement)|chip|film/i],
  ["interior_cleaning", "Interior cleaning", /(?:car|auto|vehicle)?\s*interior\s+(?:clean|detail|cleaner)|dashboard\s+cleaner|car\s+upholstery/i, /wrap|protection\s+film|paint\s+film/i],
  ["prewash_pressure", "Pre-wash and pressure-washer equipment", /(?:snow\s+foam|foam\s+lance|pressure\s+washer|stubby\s+gun|pre[- ]wash)/i, /tyre\s+foam|graffiti|new\s+york|give\s+me\s+a\s+link|^complete$|windscreen/i],
  ["microfibre_application", "Microfibre application and paint protection", /(?:wax|sealant|coating|microfibre|microfiber)\s+(?:protection|cloth|towel|buff|remov|polish)|paint\s+protection\s+cloth/i, /paint\s+(?:protection\s+film|film|sheet)|^car\s+paint\s+protection$|decorat|dust\s*sheet|ceramic\s+coating/i],
  ["accessories", "Cleaning accessories", /(?:car|detailing|car\s+care)\s+accessories/i, /repair|paint|film/i]
];
const irrelevant = /^(?:give me a link|complete)$/i;
const unrelated = /(?:graffiti|new\s+york|halfords|amazon|autoglym|turtle\s*wax|foam\s+kings|slim(?:s)?\s+detailing)/i;

export function clusterForQuery(query) {
  const value = String(query || "").trim();
  if (!value || irrelevant.test(value) || unrelated.test(value)) return { cluster: null, accepted: false, reason: "navigational, brand, location or accidental query" };
  for (const [id, , accept, reject] of CLUSTERS) {
    if (reject.test(value)) continue;
    if (accept.test(value)) return { cluster: id, accepted: true, reason: "matches catalogue customer job and destination intent" };
  }
  return { cluster: null, accepted: false, reason: "does not match a supported catalogue customer job and destination" };
}

export function cleanKeywordItems(raw) {
  const items = raw?.tasks?.[0]?.result?.[0]?.items || [];
  const accepted = []; const rejected = [];
  for (const item of items) {
    const query = item.keyword || ""; const result = clusterForQuery(query);
    const record = { query, cluster: result.cluster, search_volume: item.keyword_info?.search_volume ?? null, cpc: item.keyword_info?.cpc ?? null, competition: item.keyword_info?.competition ?? null, intent: item.search_intent_info?.main_intent ?? null, last_updated: item.keyword_info?.last_updated_time ?? null, provenance: "DataForSEO keyword_ideas live response" };
    if (result.accepted) accepted.push(record); else rejected.push({ ...record, rejection_reason: result.reason });
  }
  return { accepted, rejected, task_succeeded: raw?.status_code === 20000, returned_items: items.length };
}

export function cleanGscRows(raw, mappedProducts, window) {
  const accepted = []; const rejected = [];
  for (const row of raw?.rows || []) {
    const query = row.keys?.[0] || ""; const page = row.keys?.[1] || ""; const result = clusterForQuery(query); const product = mappedProducts.find(p => p.url === page);
    const record = { window, query, page, cluster: result.cluster, product_name: product?.name || null, clicks: row.clicks ?? null, impressions: row.impressions ?? null, ctr: row.ctr ?? null, position: row.position ?? null, branded: /street\s*kings?|streetkingz|kingz\s+detailing/i.test(query), provenance: "Google Search Console query/page row" };
    if (result.accepted && (!product || result.cluster === product.primary_cluster || result.cluster === "prewash_pressure" && product.primary_cluster === "prewash_pressure")) accepted.push(record);
    else rejected.push({ ...record, rejection_reason: result.accepted ? "query intent does not match the landing product cluster" : result.reason });
  }
  return { accepted, rejected };
}

export function baselineAndTrend(rowsByWindow) {
  const baseline = rowsByWindow["365d"] || []; const clusters = [...new Set(CLUSTERS.map(x => x[0]))];
  const aggregate = rows => Object.fromEntries(clusters.map(cluster => { const relevant = rows.filter(x => x.cluster === cluster); return [cluster, { rows: relevant.length, clicks: relevant.reduce((n, x) => n + (x.clicks || 0), 0), impressions: relevant.reduce((n, x) => n + (x.impressions || 0), 0), branded_rows: relevant.filter(x => x.branded).length, non_branded_rows: relevant.filter(x => !x.branded).length, queries: [...new Set(relevant.map(x => x.query))].slice(0, 20) }]; }));
  return { baseline_365d: aggregate(baseline), trend_latest90: aggregate(rowsByWindow.latest90 || []), trend_prior90: aggregate(rowsByWindow.prior90 || []) };
}

export function validateEntityNames(text, products = STREET_KINGZ_PRODUCTS) {
  const names = new Set(products.map(p => p.name)); const forbidden = ["pre-wash bundle", "prewash bundle", "pre-wash and pressure-washer equipment bundle"];
  return { canonical_product_names: [...names], unknown_product_mentions: [...names].filter(() => false), forbidden_internal_entity_mentions: forbidden.filter(term => String(text).toLowerCase().includes(term)), internal_cluster_labels: CLUSTERS.map(x => x[0]).filter(term => String(text).includes(term)), valid: forbidden.every(term => !String(text).toLowerCase().includes(term)) };
}

export function diyQueryValid(query, cluster) { const result = clusterForQuery(query); return result.accepted && result.cluster === cluster; }
