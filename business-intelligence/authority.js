import { AUTHORITY_DOMAINS, BUSINESS_SOURCE_TYPES } from "./contracts.js";

const ORDERS = Object.freeze({
  business_identity: ["structured_site_identity", "structured_catalogue", "homepage", "about_page", "navigation", "category_page", "product_sample", "faq", "customer_service_page", "ai_inference"],
  catalogue_structure: ["structured_catalogue", "navigation", "category_page", "product_sample", "homepage", "about_page", "faq", "customer_service_page", "structured_site_identity", "ai_inference"],
  declared_positioning: ["homepage", "about_page", "category_page", "product_sample", "faq", "customer_service_page", "navigation", "structured_site_identity", "structured_catalogue", "ai_inference"],
  audience_understanding: ["about_page", "homepage", "category_page", "product_sample", "faq", "customer_service_page", "navigation", "structured_catalogue", "structured_site_identity", "ai_inference"],
  category_audience: ["category_page", "product_sample", "faq", "structured_catalogue", "navigation", "homepage", "about_page", "customer_service_page", "structured_site_identity", "ai_inference"]
});

export const FIELD_SPECIFIC_AUTHORITY = Object.freeze(Object.fromEntries(Object.entries(ORDERS).map(([domain, order]) => [domain, Object.freeze(Object.fromEntries(order.map((source, index) => [source, index + 1]))) ])));

export function businessAuthorityRankFor(authorityDomain, sourceType) {
  if (!AUTHORITY_DOMAINS.includes(authorityDomain)) throw new Error(`Unsupported authority domain: ${authorityDomain}`);
  if (sourceType === "human_correction" || sourceType === "human_validation") return 0;
  if (!BUSINESS_SOURCE_TYPES.includes(sourceType)) return null;
  return FIELD_SPECIFIC_AUTHORITY[authorityDomain][sourceType] ?? null;
}

export function compareBusinessSourceAuthority(authorityDomain, leftSourceType, rightSourceType) {
  const left = businessAuthorityRankFor(authorityDomain, leftSourceType);
  const right = businessAuthorityRankFor(authorityDomain, rightSourceType);
  if (left === null || right === null) throw new Error("Cannot compare an unsupported business evidence source.");
  return Math.sign(left - right);
}
