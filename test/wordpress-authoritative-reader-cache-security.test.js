import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("wordpress-plugin/streetkingz-ai-authoritative-reader/streetkingz-ai-authoritative-reader.php", "utf8");

test("authoritative Reader v1.2.0 prevents capability-protected REST responses entering LiteSpeed cache", () => {
  assert.match(source, /Version:\s*1\.2\.0/);
  assert.match(source, /rest_pre_dispatch/);
  assert.match(source, /streetkingz_ai_disable_authoritative_rest_cache/);
  assert.match(source, /litespeed_control_set_nocache/);
  assert.match(source, /LSCACHE_NO_CACHE/);
  assert.match(source, /DONOTCACHEPAGE/);
  assert.match(source, /X-LiteSpeed-Cache-Control', 'no-cache'/);
  assert.match(source, /no-store, private/);
});

test("cache exclusion is narrowly matched to the authoritative Reader route", () => {
  assert.match(source, /\^\/streetkingz-ai\/v1\/products\/\[0-9\]\+\/authoritative\$/);
  assert.doesNotMatch(source, /rest_pre_dispatch[\s\S]{0,500}streetkingz_ai_disable_authoritative_rest_cache\(\);\s*return\s+null/);
});

test("Reader permission remains bound only to its custom capability", () => {
  assert.match(source, /current_user_can\(STREETKINGZ_AI_READ_CAPABILITY\)/);
  assert.doesNotMatch(source, /streetkingz_ai_write_approved_product_copy/);
  assert.doesNotMatch(source, /__return_true/);
});
