import test from "node:test";
import assert from "node:assert/strict";
import { buildBrowserOpenablePreview, validateBrowserOpenablePreview } from "../rendering/visual-preview.js";

test("browser preview is a complete file://-openable document with embedded CSS", () => {
  const document = buildBrowserOpenablePreview({ html: '<article class="generic-page"><h1>Example</h1></article>', css: '.generic-page{color:#111}@media (max-width:600px){.generic-page{padding:1rem}}' });
  const result = validateBrowserOpenablePreview(document, { expectedMarkupSelectors: ["generic-page", "@media"] });
  assert.equal(result.status, "PASS"); assert.match(document, /^<!DOCTYPE html>/); assert.match(document, /viewport/); assert.ok(result.embedded_css_bytes > 0);
});

test("empty or fragment-only previews fail closed", () => {
  assert.equal(validateBrowserOpenablePreview("<article class=\"x\"></article>").status, "FAIL");
  assert.throws(() => buildBrowserOpenablePreview({ html: "<article></article>", css: "" }));
});

test("discovered canonical preview contains CSS, matching selectors and preview media", async () => {
  const fs = await import("node:fs/promises"); const root = "artifacts/cornerstone/best-car-drying-towel/rendering-v1/discovered-street-kingz-v1";
  const [index, metadata, html] = await Promise.all([fs.readFile(`${root}/index.html`, "utf8"), fs.readFile(`${root}/preview-metadata.json`, "utf8"), fs.readFile(`${root}/rendered-page.html`, "utf8")]);
  const result = validateBrowserOpenablePreview(index, { expectedMarkupSelectors: ["discovered-editorial-page", "surface-page", "discovered-editorial-product-recommendation", "@media"] });
  assert.equal(result.status, "PASS"); assert.equal(JSON.parse(metadata).browser_openable, true); assert.match(html, /1200gsm-Fold-scaled-.webp/); assert.match(index, /<style>[\s\S]*discovered-editorial-product-recommendation/);
});
