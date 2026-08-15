const AUTOMATED_AUTHORITY_ORDER = Object.freeze([
  "woocommerce",
  "rendered_product_page",
  "faq",
  "internal_link",
  "brand_catalogue",
  "ai_inference"
]);

export const SOURCE_AUTHORITY = Object.freeze(Object.fromEntries(
  AUTOMATED_AUTHORITY_ORDER.map((sourceType, index) => [sourceType, index + 1])
));

export function authorityRankFor(sourceType) {
  if (sourceType === "human_correction") return 0;
  return SOURCE_AUTHORITY[sourceType] ?? null;
}

export function compareSourceAuthority(leftSourceType, rightSourceType) {
  const left = authorityRankFor(leftSourceType);
  const right = authorityRankFor(rightSourceType);
  if (left === null || right === null) throw new Error("Cannot compare an unsupported source type.");
  return Math.sign(left - right);
}

