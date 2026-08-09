import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("wordpress-plugin/streetkingz-ai-guarded-writer/streetkingz-ai-guarded-writer.php", "utf8");

test("Guarded Writer v0.1.9 preserves protected control-plane LiteSpeed cache prevention", () => {
  assert.match(source, /Version:\s*0\.1\.9/);
  assert.match(source, /rest_pre_dispatch/);
  assert.match(source, /streetkingz_ai_writer_disable_protected_rest_cache/);
  assert.match(source, /litespeed_control_set_nocache/);
  assert.match(source, /LSCACHE_NO_CACHE/);
  assert.match(source, /DONOTCACHEPAGE/);
  assert.match(source, /X-LiteSpeed-Cache-Control', 'no-cache'/);
  assert.match(source, /no-store, private/);
});

test("Writer cache exclusion covers only the fixed guarded product-70 routes", () => {
  for (const route of ["approval", "approval/status", "execution-contract", "execution/status", "dry-run", "execute"]) {
    assert.match(source, new RegExp(route.replace("/", "\\/")));
  }
  assert.match(source, /approved-product-70-copy/);
});

test("cache hardening does not broaden Writer permissions or execution scope", () => {
  assert.match(source, /current_user_can\(STREETKINGZ_AI_WRITE_CAPABILITY\)/);
  assert.doesNotMatch(source, /streetkingz_ai_read_product_source/);
  assert.doesNotMatch(source, /manage_options/);
  assert.doesNotMatch(source, /__return_true/);
});
