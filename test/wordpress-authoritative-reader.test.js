import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createWordPressAuthoritativeReader, findElementorElementById, mapRequiredElementorWidgets, parseElementorDocument, wordpressReadConfig } from "../cms/wordpressAuthoritativeReader.js";
import { sha256 } from "../research/core/canonical.js";

const fixture = JSON.parse(await readFile("test/fixtures/wordpress-authoritative-product-70.json", "utf8"));
const config = { baseUrl: "https://streetkingz.co.uk", username: "reader", applicationPassword: "secret-not-for-artifacts" };
function response(body = fixture) { return { ok: true, status: 200, url: "https://streetkingz.co.uk/wp-json/wp/v2/product/70?context=edit", text: async () => JSON.stringify(body) }; }

test("configuration requires HTTPS and all read credentials without exposing values", () => {
  assert.throws(() => wordpressReadConfig({}), { code: "WORDPRESS_READ_AUTH_MISSING" });
  assert.throws(() => wordpressReadConfig({ WORDPRESS_BASE_URL: "http://example.com", WORDPRESS_READ_USERNAME: "u", WORDPRESS_READ_APPLICATION_PASSWORD: "p" }), { code: "WORDPRESS_READ_HTTPS_REQUIRED" });
});

test("read-only client exposes only readPost, performs GET and credentials never enter result", async () => {
  let request;
  const client = createWordPressAuthoritativeReader({ config, fetchImpl: async (url, options) => { request = { url: url.href, options }; return response(); }, clock: () => new Date("2026-08-08T16:00:00Z") });
  assert.deepEqual(Object.keys(client), ["readPost"]);
  const result = await client.readPost(70);
  assert.equal(request.options.method, "GET");
  assert.equal(JSON.stringify(result).includes(config.applicationPassword), false);
  assert.equal(JSON.stringify(result).includes("authorization"), false);
  assert.equal(result.provenance.write_capability, false);
});

test("raw response persistence completes before parsing and never receives credentials or headers", async () => {
  const events = [];
  const client = createWordPressAuthoritativeReader({ config, fetchImpl: async () => response(), persistRawResponse: async ({ body, provenance }) => { events.push("persisted"); assert.equal(body, JSON.stringify(fixture)); assert.equal(JSON.stringify(provenance).includes("secret-not-for-artifacts"), false); assert.equal(JSON.stringify(provenance).includes("authorization"), false); } });
  await client.readPost(70);
  events.push("returned");
  assert.deepEqual(events, ["persisted", "returned"]);
});

test("raw post fields, Elementor document, hashes and rollback values remain exact", async () => {
  const result = await createWordPressAuthoritativeReader({ config, fetchImpl: async () => response() }).readPost(70);
  assert.equal(result.fields.post_title, fixture.product.post_title);
  assert.equal(result.fields.post_excerpt, fixture.product.post_excerpt);
  assert.equal(result.meta._elementor_data, fixture.elementor_template.raw_elementor_data);
  assert.equal(result.hashes._elementor_data, sha256(fixture.elementor_template.raw_elementor_data));
  assert.deepEqual(result.rollback_values, { post_title: fixture.product.post_title, post_excerpt: fixture.product.post_excerpt, post_content: fixture.product.post_content, _elementor_data: fixture.elementor_template.raw_elementor_data });
});

test("required nested Elementor widgets resolve by exact ID with exact values", async () => {
  const result = await createWordPressAuthoritativeReader({ config, fetchImpl: async () => response() }).readPost(70);
  const widgets = mapRequiredElementorWidgets(result);
  assert.match(widgets.description.exact_stored_value, /90 × 60 cm/);
  assert.equal(widgets.comparison_answer.exact_stored_value, "<p>Current comparison</p>");
  assert.equal(widgets.detailed_safety_answer.exact_stored_value, "<p>Current detailed safety guidance</p>");
  assert.equal(widgets.comparison_accordion.widget_type, "nested-accordion");
});

test("missing or duplicate widget blocks deterministic mapping", () => {
  const document = parseElementorDocument(fixture.elementor_template.raw_elementor_data);
  assert.throws(() => findElementorElementById(document, "missing00"), { code: "ELEMENTOR_WIDGET_MISSING" });
  document.push(structuredClone(document[0].elements[0]));
  assert.throws(() => findElementorElementById(document, "c80e718"), { code: "ELEMENTOR_WIDGET_DUPLICATE" });
});

test("short-claim source and safety widget remain separate while slug and unrelated data are untouched", async () => {
  const result = await createWordPressAuthoritativeReader({ config, fetchImpl: async () => response() }).readPost(70);
  const widgets = mapRequiredElementorWidgets(result);
  assert.match(result.fields.post_excerpt, /Extreme absorbency/);
  assert.match(result.fields.post_excerpt, /Safe on all paint/);
  assert.doesNotMatch(widgets.detailed_safety_answer.exact_stored_value, /Extreme absorbency/);
  assert.equal(result.fields.slug, fixture.product.post_name);
  assert.equal(result.provenance.write_capability, false);
});

test("missing protected Elementor meta fails closed", async () => {
  const withoutMeta = structuredClone(fixture);
  delete withoutMeta.elementor_template.raw_elementor_data;
  await assert.rejects(createWordPressAuthoritativeReader({ config, fetchImpl: async () => response(withoutMeta) }).readPost(70), { code: "ELEMENTOR_TEMPLATE_DATA_NOT_EXPOSED" });
});
