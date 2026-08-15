const MAX_CATEGORIES = 6;
export const MAX_REPRESENTATIVE_PRODUCTS = 8;

const EXCLUDED_PATH = /\/(?:cart|basket|checkout|my-account|account|privacy|terms|cookies?|wp-admin)(?:\/|$)/i;
const ABOUT = /\b(?:about|our story|who we are)\b/i;
const SUPPORT = /\b(?:faq|frequently asked|help|delivery|shipping|returns|customer service)\b/i;
const CATEGORY_PATH = /\/(?:product-category|collections?|category)\//i;

export function validateBusinessUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("A valid absolute business URL is required."); }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Business URL must use HTTP or HTTPS.");
  url.hash = "";
  return url.href;
}

export function planDiscoveredPages(homeUrl, navigationLinks) {
  const origin = new URL(homeUrl).origin;
  const excluded = [];
  const accepted = [];
  const seen = new Set([homeUrl]);
  for (const link of navigationLinks) {
    const url = new URL(link.url);
    let pageType = null;
    if (url.origin !== origin) excluded.push({ url: link.url, reason: "off_site" });
    else if (EXCLUDED_PATH.test(url.pathname)) excluded.push({ url: link.url, reason: "global_or_transactional" });
    else if (ABOUT.test(`${link.label} ${url.pathname}`)) pageType = "about_page";
    else if (SUPPORT.test(`${link.label} ${url.pathname}`)) pageType = /faq/i.test(`${link.label} ${url.pathname}`) ? "faq" : "customer_service_page";
    else if (CATEGORY_PATH.test(url.pathname)) pageType = "category_page";
    else excluded.push({ url: link.url, reason: "not_a_supported_business_evidence_page" });
    if (!pageType) continue;
    if (seen.has(link.url)) { excluded.push({ url: link.url, reason: "duplicate" }); continue; }
    if (pageType === "about_page" && accepted.some((item) => item.page_type === pageType)) { excluded.push({ url: link.url, reason: "about_page_limit" }); continue; }
    if (["faq", "customer_service_page"].includes(pageType) && accepted.filter((item) => ["faq", "customer_service_page"].includes(item.page_type)).length >= 2) { excluded.push({ url: link.url, reason: "support_page_limit" }); continue; }
    if (pageType === "category_page" && accepted.filter((item) => item.page_type === pageType).length >= MAX_CATEGORIES) { excluded.push({ url: link.url, reason: "category_page_limit" }); continue; }
    seen.add(link.url);
    accepted.push({ url: link.url, label: link.label, page_type: pageType, reason: `primary_navigation_${pageType}` });
  }
  return { included: accepted, excluded, limits: { categories: MAX_CATEGORIES, representative_products: MAX_REPRESENTATIVE_PRODUCTS } };
}

export function selectRepresentativeProducts(categories, maximum = MAX_REPRESENTATIVE_PRODUCTS) {
  const selected = [], excluded = [], seen = new Set();
  let cursor = 0;
  while (selected.length < maximum) {
    let added = false;
    for (const category of categories) {
      const candidate = category.products[cursor];
      if (!candidate) continue;
      added = true;
      if (seen.has(candidate.url)) { excluded.push({ url: candidate.url, reason: "duplicate_product", category_url: category.url }); continue; }
      seen.add(candidate.url);
      selected.push({ url: candidate.url, label: candidate.label, category_url: category.url, category_label: category.label, reason: "round_robin_primary_category_sample" });
      if (selected.length === maximum) break;
    }
    if (!added) break;
    cursor += 1;
  }
  for (const category of categories) for (const candidate of category.products) {
    if (!seen.has(candidate.url) && !excluded.some((item) => item.url === candidate.url)) excluded.push({ url: candidate.url, reason: "representative_product_limit", category_url: category.url });
  }
  return { selected, excluded, maximum };
}
