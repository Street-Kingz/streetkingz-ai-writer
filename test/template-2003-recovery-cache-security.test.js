import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("wordpress-plugin/streetkingz-ai-template-2003-recovery/streetkingz-ai-template-2003-recovery.php","utf8");
const matcher=source.slice(source.indexOf("function skai_recovery_is_protected_rest_request"),source.indexOf("function skai_recovery_disable_protected_rest_cache"));
const cacheBlock=source.slice(source.indexOf("function skai_recovery_disable_protected_rest_cache"),source.indexOf("add_action('rest_api_init'"));

test("Recovery v0.1.2 carries route-scoped cache hardening",()=>{assert.match(source,/Version:\s*0\.1\.2/);assert.match(source,/SKAI_RECOVERY_VERSION = '0\.1\.2'/);});
test("fixed Recovery resources are in no-cache scope",()=>{for(const route of ["recover","validation-manifest","validation/status","validation/dry-run"])assert.match(matcher,new RegExp(route.replace("/","\\/")));});
test("unrelated REST routes are excluded",()=>{assert.match(matcher,/===/);assert.doesNotMatch(matcher,/products|approved-product-70-copy|wp\/v2|str_starts_with/);});
test("anonymous rejection receives private no-store headers",()=>assert.match(cacheBlock,/no-cache, must-revalidate, max-age=0, no-store, private/));
test("Reader rejection uses the same protected dispatch path",()=>assert.match(cacheBlock,/skai_recovery_is_protected_rest_request\(\$request\)/));
test("Writer rejection uses the same protected dispatch path",()=>assert.match(cacheBlock,/rest_pre_dispatch/));
test("Recovery authenticated HTTP 200 is LiteSpeed no-cache",()=>{assert.match(cacheBlock,/LSCACHE_NO_CACHE/);assert.match(cacheBlock,/litespeed_control_set_nocache/);});
test("GET status is protected",()=>{assert.match(source,/WP_REST_Server::READABLE/);assert.match(source,/permission_callback' => 'skai_recovery_permission'/);});
test("POST validation dry-run is separately protected",()=>{assert.match(source,/validation\/dry-run/);assert.match(source,/validation_dry_run/);});
test("POST execute remains on the production resource",()=>assert.match(source,/\['install_contract','execute'\]/));
test("DELETE removal shares the protected fixed resource",()=>{assert.match(source,/WP_REST_Server::DELETABLE/);assert.match(source,/callback' => 'skai_recovery_remove'/);});
test("no global cache disable is introduced",()=>{assert.doesNotMatch(source,/add_filter\(\s*['\"]litespeed_[^'\"]+['\"]\s*,\s*['\"]__return_false/);assert.doesNotMatch(source,/do_action\(['\"]litespeed_purge_all/);});
test("fixed template restriction remains",()=>assert.match(source,/SKAI_RECOVERY_TEMPLATE_ID = 2003/));
test("fixed meta restriction remains",()=>assert.match(source,/SKAI_RECOVERY_META_KEY = '_elementor_data'/));
test("normal Writer and Reader capabilities remain insufficient",()=>{assert.doesNotMatch(source,/streetkingz_ai_write_approved_product_copy/);assert.doesNotMatch(source,/streetkingz_ai_read_product_source/);assert.match(source,/current_user_can\(SKAI_RECOVERY_CAP\)/);});
test("Recovery role remains free of broad CMS rights",()=>{const role=source.slice(source.indexOf("function skai_recovery_activate"),source.indexOf("register_activation_hook"));for(const cap of ["edit_posts","edit_products","manage_options","manage_woocommerce","install_plugins","edit_plugins"])assert.doesNotMatch(role,new RegExp(cap));});
test("one-time claim and permanent terminal states remain intact",()=>{assert.match(source,/INSERT IGNORE INTO/);assert.match(source,/failed_after_claim/);assert.match(source,/succeeded/);assert.doesNotMatch(source.slice(source.indexOf("function skai_recovery_claim")),/delete_option\(skai_recovery_id_name\(SKAI_RECOVERY_CLAIM_PREFIX/);});
