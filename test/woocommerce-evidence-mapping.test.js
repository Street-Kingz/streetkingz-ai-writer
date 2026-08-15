import assert from "node:assert/strict";
import { test } from "node:test";
import { ingestProductEvidence } from "../product-intelligence/ingestion.js";
import { extractAuthoritativeProductEvidence } from "../product-intelligence/woocommerceEvidence.js";

const PRODUCT_URL = "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/";
const RETRIEVED_AT = "2026-08-13T20:42:07.477Z";

function authoritative(woocommerce = {}) {
  return {
    post_id: 70,
    post_type: "product",
    status: "publish",
    fields: {
      post_title: "Heavy Duty Drying Towel – 1200gsm",
      post_excerpt: "<p>Source description</p>",
      post_content: "Source content",
      slug: "heavy-duty-drying-towel-1200gsm",
      permalink: PRODUCT_URL
    },
    meta: { _elementor_data: "[]" },
    woocommerce,
    provenance: { final_url: "https://streetkingz.co.uk/wp-json/streetkingz-ai/v1/products/70/authoritative" }
  };
}

function completeWooCommerce() {
  return {
    product_id: 70,
    sku: "1200TL",
    product_type: "variable",
    pricing: { regular_price: "18.99", sale_price: "16.99", current_price: "16.99", currency: "GBP" },
    inventory: { stock_status: "instock", manage_stock: true, stock_quantity: 9 },
    categories: [{ id: 54, name: "Drying Towels", slug: "drying-towels" }],
    attributes: [{ id: 1, name: "Size", slug: "pa_size", options: [{ id: 2, name: "Large", slug: "large" }], visible: true, variation: true }],
    variation_ids: [701],
    variations: [{ id: 701, sku: "1200TL-L", pricing: { regular_price: "19.99", sale_price: "", current_price: "19.99" }, inventory: { stock_status: "instock", manage_stock: false, stock_quantity: null }, attributes: { attribute_pa_size: "large" }, image_id: 900 }],
    variations_truncated: false,
    upsell_ids: [71],
    cross_sell_ids: [72],
    image_id: 1955,
    gallery_image_ids: [860, 861]
  };
}

const recordsFor = (woocommerce) => extractAuthoritativeProductEvidence(authoritative(woocommerce), PRODUCT_URL, RETRIEVED_AT);
const byField = (records, field) => records.find((record) => record.source_field === field);

test("existing authoritative WooCommerce evidence remains present", () => {
  const records = recordsFor({});
  for (const field of ["product.id", "product.name", "product.slug", "product.status", "product.permalink", "content.short_description", "content.long_description", "content.elementor_document"]) {
    assert.ok(byField(records, field), field);
  }
});

test("SKU creates evidence", () => assert.equal(byField(recordsFor(completeWooCommerce()), "product.sku").normalised_value, "1200TL"));
test("product type creates evidence", () => assert.equal(byField(recordsFor(completeWooCommerce()), "product.type").normalised_value, "variable"));

test("available pricing fields create separate evidence", () => {
  const records = recordsFor(completeWooCommerce());
  assert.equal(byField(records, "commercial.regular_price").raw_value, "18.99");
  assert.equal(byField(records, "commercial.sale_price").raw_value, "16.99");
  assert.equal(byField(records, "commercial.current_price").raw_value, "16.99");
  assert.equal(byField(records, "commercial.currency").raw_value, "GBP");
  assert.equal(byField(recordsFor({ pricing: { sale_price: "" } }), "commercial.sale_price"), undefined);
});

test("inventory fields create evidence", () => {
  const records = recordsFor(completeWooCommerce());
  assert.equal(byField(records, "inventory.stock_status").raw_value, "instock");
  assert.equal(byField(records, "inventory.manage_stock").raw_value, true);
  assert.equal(byField(records, "inventory.stock_quantity").raw_value, 9);
});

test("null stock quantity remains null", () => {
  const record = byField(recordsFor({ inventory: { stock_status: "instock", manage_stock: false, stock_quantity: null } }), "inventory.stock_quantity");
  assert.equal(record.raw_value, null);
  assert.equal(record.normalised_value, null);
});

test("categories retain ID name and slug together", () => {
  const record = byField(recordsFor(completeWooCommerce()), "taxonomy.product_cat.54");
  assert.deepEqual(record.raw_value, { id: 54, name: "Drying Towels", slug: "drying-towels" });
  assert.deepEqual(record.normalised_value, record.raw_value);
});

test("attributes map as bounded structured evidence", () => {
  const record = byField(recordsFor(completeWooCommerce()), "specification.attribute.pa_size");
  assert.equal(record.normalised_value.name, "Size");
  assert.equal(record.normalised_value.variation, true);
  assert.deepEqual(record.normalised_value.options, [{ id: 2, name: "Large", slug: "large" }]);
});

test("empty attributes create no fake evidence", () => {
  assert.equal(recordsFor({ attributes: [] }).some((record) => record.source_field.startsWith("specification.attribute.")), false);
});

test("variation IDs and bounded variation fields map when present", () => {
  const records = recordsFor(completeWooCommerce());
  assert.deepEqual(byField(records, "variation.ids").normalised_value, [701]);
  assert.equal(byField(records, "variation.701").normalised_value.sku, "1200TL-L");
});

test("upsells and cross-sells map only when present", () => {
  const records = recordsFor(completeWooCommerce());
  assert.deepEqual(byField(records, "relationship.upsell_ids").normalised_value, [71]);
  assert.deepEqual(byField(records, "relationship.cross_sell_ids").normalised_value, [72]);
  const empty = recordsFor({ upsell_ids: [], cross_sell_ids: [] });
  assert.equal(empty.some((record) => record.source_field.startsWith("relationship.")), false);
});

test("media IDs map only when present", () => {
  const records = recordsFor(completeWooCommerce());
  assert.equal(byField(records, "media.image_id").raw_value, 1955);
  assert.deepEqual(byField(records, "media.gallery_image_ids").normalised_value, [860, 861]);
});

test("all mapped records use WooCommerce authority rank one", () => {
  for (const record of recordsFor(completeWooCommerce())) {
    assert.equal(record.source_type, "woocommerce");
    assert.equal(record.authority_rank, 1);
  }
});

test("existing evidence IDs remain stable", () => {
  const before = byField(recordsFor({}), "product.name").id;
  const after = byField(recordsFor(completeWooCommerce()), "product.name").id;
  assert.equal(after, before);
});

test("fixture-only ingestion makes no network or AI calls", async () => {
  let renderedReads = 0;
  let authoritativeReads = 0;
  const html = '<body class="postid-70"><h1 class="product_title">Fixture</h1></body>';
  const result = await ingestProductEvidence(PRODUCT_URL, {
    readRenderedPage: async () => { renderedReads += 1; return { html, retrieval: { request_count: 0 } }; },
    readAuthoritativeProduct: async () => { authoritativeReads += 1; return { authoritativePost: authoritative(completeWooCommerce()), raw: { fixture: true }, retrieval: { request_count: 0 } }; },
    now: () => new Date(RETRIEVED_AT),
    writeArtifacts: false
  });
  assert.deepEqual({ renderedReads, authoritativeReads }, { renderedReads: 1, authoritativeReads: 1 });
  assert.equal(result.artifact.execution_metadata.external_api_call_count, 0);
  assert.equal(result.artifact.execution_metadata.ai_calls, 0);
});

