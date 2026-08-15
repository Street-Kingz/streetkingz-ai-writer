import { createSourceEvidence, deduplicateEvidence } from "./evidence.js";

export function extractAuthoritativeProductEvidence(authoritativePost, productUrl, retrievedAt) {
  if (!authoritativePost || authoritativePost.post_type !== "product") throw new Error("Authoritative source did not return a product.");
  const records = [];
  const add = (sourceField, rawValue, context = {}, { allowNull = false, normalisedValue } = {}) => {
    if (rawValue === undefined || (!allowNull && rawValue === null) || rawValue === "") return;
    records.push(createSourceEvidence({
      sourceType: "woocommerce",
      sourceUriOrLocation: authoritativePost.provenance?.final_url || productUrl,
      sourceField,
      rawValue,
      ...(normalisedValue !== undefined || (allowNull && rawValue === null) ? { normalisedValue: normalisedValue ?? rawValue } : {}),
      retrievedAt,
      context
    }));
  };
  const woocommerce = authoritativePost.woocommerce || {};
  add("product.id", woocommerce.product_id ?? authoritativePost.post_id, { structured: true });
  add("product.name", authoritativePost.fields?.post_title, { structured: true, comparable_field: "product.name" });
  add("product.slug", authoritativePost.fields?.slug, { structured: true });
  add("product.status", authoritativePost.status, { structured: true });
  add("product.permalink", authoritativePost.fields?.permalink, { structured: true });
  add("content.short_description", authoritativePost.fields?.post_excerpt, { structured: false, source_location: "wp_posts.post_excerpt" });
  add("content.long_description", authoritativePost.fields?.post_content, { structured: false, source_location: "wp_posts.post_content" });
  if (authoritativePost.meta?._elementor_data) add("content.elementor_document", authoritativePost.meta._elementor_data, { structured: false, source_location: "wp_postmeta._elementor_data" });

  add("product.sku", woocommerce.sku, { structured: true, source_location: "woocommerce.sku" });
  add("product.type", woocommerce.product_type, { structured: true, source_location: "woocommerce.product_type" });
  for (const field of ["regular_price", "sale_price", "current_price", "currency"]) {
    add(`commercial.${field}`, woocommerce.pricing?.[field], { structured: true, source_location: `woocommerce.pricing.${field}` });
  }
  for (const field of ["stock_status", "manage_stock"]) {
    add(`inventory.${field}`, woocommerce.inventory?.[field], { structured: true, source_location: `woocommerce.inventory.${field}` });
  }
  if (woocommerce.inventory && Object.hasOwn(woocommerce.inventory, "stock_quantity")) {
    add("inventory.stock_quantity", woocommerce.inventory.stock_quantity, { structured: true, source_location: "woocommerce.inventory.stock_quantity" }, { allowNull: true });
  }

  for (const category of woocommerce.categories || []) {
    if (!category || category.id === undefined || !category.name || !category.slug) continue;
    add(`taxonomy.product_cat.${category.id}`, category, {
      structured: true,
      source_location: "woocommerce.categories",
      taxonomy: "product_cat"
    }, { normalisedValue: category });
  }
  for (const [index, attribute] of (woocommerce.attributes || []).entries()) {
    if (!attribute?.name) continue;
    const key = String(attribute.slug || attribute.name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || String(index);
    add(`specification.attribute.${key}`, attribute, {
      structured: true,
      source_location: `woocommerce.attributes[${index}]`,
      attribute: attribute.name
    }, { normalisedValue: attribute });
  }

  if (Array.isArray(woocommerce.variation_ids) && woocommerce.variation_ids.length) {
    add("variation.ids", woocommerce.variation_ids, { structured: true, source_location: "woocommerce.variation_ids" }, { normalisedValue: woocommerce.variation_ids });
  }
  for (const [index, variation] of (woocommerce.variations || []).entries()) {
    if (!variation || variation.id === undefined) continue;
    add(`variation.${variation.id}`, variation, {
      structured: true,
      source_location: `woocommerce.variations[${index}]`
    }, { normalisedValue: variation });
  }
  for (const field of ["upsell_ids", "cross_sell_ids"]) {
    const values = woocommerce[field];
    if (Array.isArray(values) && values.length) {
      add(`relationship.${field}`, values, { structured: true, source_location: `woocommerce.${field}` }, { normalisedValue: values });
    }
  }
  if (woocommerce.image_id !== undefined && woocommerce.image_id !== null && woocommerce.image_id !== "") {
    add("media.image_id", woocommerce.image_id, { structured: true, source_location: "woocommerce.image_id" });
  }
  if (Array.isArray(woocommerce.gallery_image_ids) && woocommerce.gallery_image_ids.length) {
    add("media.gallery_image_ids", woocommerce.gallery_image_ids, { structured: true, source_location: "woocommerce.gallery_image_ids" }, { normalisedValue: woocommerce.gallery_image_ids });
  }
  return deduplicateEvidence(records);
}
