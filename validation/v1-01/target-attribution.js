import fs from "node:fs";
import { STREET_KINGZ_PRODUCTS } from "../../catalogue/products.js";
import { cleanGscRows } from "./evidence-hygiene.js";

export const PREWASH_PRODUCTS = [
  {
    name: "Stubby Gun & Nozzle Set",
    url: "https://streetkingz.co.uk/product/stubby-gun-and-nozzle-set/",
    intent: "gun-only and nozzle-specific pressure-washer intent"
  },
  {
    name: "Snow Foam Lance",
    url: "https://streetkingz.co.uk/product/snow-foam-lance/",
    intent: "snow-foam-lance and foam-application intent"
  },
  {
    name: "Stubby Gun + Foam Lance Bundle",
    url: "https://streetkingz.co.uk/product/stubby-gun-bundle/",
    intent: "combined stubby-gun and foam-lance intent"
  }
];

export function queryIntent(query) {
  const q = String(query).toLowerCase();
  if (q.includes("foam cannon") || q.includes("snow foam lance") || q.includes("foam lance")) return "combined gun-and-foam";
  if (q.includes("nozzle") || q.includes("stubby gun") || q.includes("jet wash gun")) return "gun-and-nozzle";
  if (q.includes("snow foam") || q.includes("foam lances")) return "foam-lance";
  return "general pre-wash";
}

function metrics(rows) {
  const clicks = rows.reduce((n, row) => n + (row.clicks || 0), 0);
  const impressions = rows.reduce((n, row) => n + (row.impressions || 0), 0);
  const ctr = impressions ? clicks / impressions : null;
  const position = impressions
    ? rows.reduce((n, row) => n + ((row.position || 0) * (row.impressions || 0)), 0) / impressions
    : null;
  return { row_count: rows.length, clicks, impressions, ctr, position };
}

export function buildPageAttribution({ rawByWindow, destinations, products = STREET_KINGZ_PRODUCTS }) {
  const prewashUrls = new Set(PREWASH_PRODUCTS.map(product => product.url));
  const mapped = products.map(product => ({
    ...product,
    primary_cluster: prewashUrls.has(product.url) ? "prewash_pressure" : product.primary_cluster
  }));
  const cleaned = {};
  for (const window of ["365d", "latest90", "prior90"]) {
    cleaned[window] = cleanGscRows(rawByWindow[window], mapped, window).accepted
      .filter(row => row.cluster === "prewash_pressure");
  }
  const pages = PREWASH_PRODUCTS.map(product => {
    const byWindow = Object.fromEntries(["365d", "latest90", "prior90"].map(window => {
      const rows = cleaned[window].filter(row => row.page === product.url);
      return [window, {
        ...metrics(rows),
        rows: rows.map(row => ({
          query: row.query,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
          intent: queryIntent(row.query),
          relevance: "exact landing page and pre-wash customer-job match"
        }))
      }];
    }));
    return {
      ...product,
      customer_job: "prewash_pressure",
      destination: destinations[product.url] || null,
      baseline: byWindow["365d"],
      latest90: byWindow.latest90,
      prior90: byWindow.prior90,
      trend: byWindow.latest90.impressions || byWindow.prior90.impressions
        ? { clicks_delta: byWindow.latest90.clicks - byWindow.prior90.clicks, impressions_delta: byWindow.latest90.impressions - byWindow.prior90.impressions }
        : "no comparable page-level evidence",
      exact_page_evidence: byWindow["365d"].row_count > 0,
      selection_relevance: product.name === "Stubby Gun + Foam Lance Bundle"
        ? "Exact combination query evidence lands on this bundle."
        : "No accepted 365-day query row lands on this exact product page."
    };
  });
  return { windows: ["365d", "latest90", "prior90"], pages };
}

export function selectTarget(attribution) {
  const eligible = attribution.pages.filter(page => page.exact_page_evidence && page.baseline.clicks > 0);
  if (!eligible.length) return { target: null, reason: "No exact product page has accepted page-level clicks." };
  const target = [...eligible].sort((a, b) => b.baseline.clicks - a.baseline.clicks || b.baseline.impressions - a.baseline.impressions)[0];
  return {
    target,
    reason: "Selected from exact-page accepted 365-day evidence; catalogue order and cluster totals are not used."
  };
}
