import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const dir = "artifacts/cornerstone/best-car-drying-towel/production-semantic-article-v1";
const page = JSON.parse(await readFile(`${dir}/semantic-page.json`, "utf8"));
const mapping = JSON.parse(await readFile(`${dir}/gutenberg-mapping.json`, "utf8"));
const validation = JSON.parse(await readFile(`${dir}/validation.json`, "utf8"));
const markup = await readFile(`${dir}/gutenberg-content.html`, "utf8");

test("production SemanticPage fixture is complete and URL-free", () => {
  const required = ["hero", "quick_answer", "rich_text_section", "criteria_cards", "comparison_table", "product_recommendation", "pros_tradeoffs", "founder_note", "faq", "conclusion", "call_to_action"];
  assert.deepEqual(page.components.map((item) => item.component_type), required);
  assert.equal(validation.status, "PASS");
  assert.equal(validation.h1_count, 1);
  assert.equal(validation.hardcoded_urls, false);
  assert.equal(validation.wordpress_writes, 0);
  assert.equal(validation.ai_calls, 0);
  assert.ok(page.components.filter((item) => item.data?.product_reference).length >= 3);
  assert.match(JSON.stringify(page), /heavy-duty-drying-towel-1200gsm/);
});

test("Gutenberg mapping is deterministic, editable and preserves semantic content", () => {
  assert.equal(mapping.semantic_content_modified, false);
  assert.equal(mapping.wordpress_writes, 0);
  assert.equal(mapping.ai_calls, 0);
  assert.match(markup, /wp:heading/);
  assert.match(markup, /wp:table/);
  assert.match(markup, /wp:columns/);
  assert.equal((markup.match(/<h1>/g) || []).length, 1);
  assert.doesNotMatch(markup, /https?:\/\//u);
  const regenerated = execFileSync("node", ["scripts/buildProductionSemanticArticleFixture.js"], { encoding: "utf8" });
  assert.match(regenerated, new RegExp(mapping.semantic_page_sha256));
});
