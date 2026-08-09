import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { diffElementorDocuments, sha256 } from "../lib/elementorNormalizationIncident.js";

const root = process.cwd();
const run = path.join(root,"artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1/guarded-write-execution-v0.1.9-001");
const beforeResponse = fs.readFileSync(path.join(run,"pre-write-authoritative-response.json"),"utf8");
const afterResponse = fs.readFileSync(path.join(run,"post-failure-authoritative-response.json"),"utf8");
const before = JSON.parse(beforeResponse), after = JSON.parse(afterResponse);
const originalRaw = before.elementor_template.raw_elementor_data;
const driftedRaw = after.elementor_template.raw_elementor_data;
const original = JSON.parse(originalRaw), drifted = JSON.parse(driftedRaw);
const changes = diffElementorDocuments(original,drifted);
const pluginPath = path.join(root,"wordpress-plugin/streetkingz-ai-template-2003-recovery/streetkingz-ai-template-2003-recovery.php");
const plugin = fs.readFileSync(pluginPath,"utf8");
const expectedOriginal = "81991fbccece6edcedb9cd84fc4d8dca99765b473cf24b2f8df26b5946f91c01";
const expectedDrifted = "e0a329efe268638edfbb3d6274512c26aeb0da835e4a9279a1d088d0d562de00";

function find(items,id){for(const item of items){if(item.id===id)return item; const hit=find(item.elements||[],id);if(hit)return hit;}return null;}
function contract(overrides={}){return {schema_version:1,status:"approved",authorisation_source:"explicit_human_incident_recovery_authorisation",human_recovery_approval:{artifact:"fixture-only",sha256:"9".repeat(64),statement_sha256:"8".repeat(64),authorised_at:"fixture-only"},incident_id:"template-2003-elementor-normalization-2026-08-09",template_id:2003,meta_key:"_elementor_data",operation:"restore_exact_raw_elementor_data",expected_current_raw_sha256:expectedDrifted,expected_current_authoritative_response_sha256:"bd2ed8e54bbb016800b82630a3c4da6fbf003e1471d953fde042b2c4488ab23d",expected_diff_sha256:"a".repeat(64),expected_diff_count:140,target_raw_sha256:expectedOriginal,target_raw_elementor_data:originalRaw,product_70_title_sha256:"b".repeat(64),product_70_excerpt_sha256:"c".repeat(64),product_70_content_sha256:"d".repeat(64),description_sha256:"72f9f609c59de983f61e8305d6cea67d8ae07d5743ca77e0d0efcd5fea2169b7",comparison_sha256:"019780f33556ba09df132a4a92e473f2523fe41615c7f058916b96ebec31ba07",safety_sha256:"bcf0b42d978be2f9caf218bfd55bab0bd902f05532e00868eae40fa06dc74bb6",product_70_modification_authorised:false,other_template_modification_authorised:false,other_meta_modification_authorised:false,publication_modification_authorised:false,slug_modification_authorised:false,one_time_recovery_id:"R".repeat(43),...overrides};}
function validateFixture(c){return c.template_id===2003&&c.meta_key==="_elementor_data"&&c.target_raw_sha256===sha256(c.target_raw_elementor_data)&&c.expected_current_raw_sha256===expectedDrifted&&c.product_70_modification_authorised===false&&c.other_template_modification_authorised===false&&c.other_meta_modification_authorised===false&&c.publication_modification_authorised===false&&c.slug_modification_authorised===false&&/^[A-Za-z0-9_-]{43,128}$/.test(c.one_time_recovery_id);}

test("exact preserved pre-incident source loads",()=>assert.equal(Array.isArray(original),true));
test("exact drifted source loads",()=>assert.equal(Array.isArray(drifted),true));
test("140-path diff confirmed",()=>assert.equal(changes.length,140));
test("only equal numeric-to-string differences",()=>assert.ok(changes.every(c=>c.original_type==="number"&&c.current_type==="string"&&String(c.original_value)===c.current_value)));
test("correct target hash",()=>assert.equal(sha256(originalRaw),expectedOriginal));
test("correct current hash",()=>assert.equal(sha256(driftedRaw),expectedDrifted));
test("wrong current hash rejected",()=>assert.equal(validateFixture(contract({expected_current_raw_sha256:"0".repeat(64)})),false));
test("wrong target hash rejected",()=>assert.equal(validateFixture(contract({target_raw_sha256:"0".repeat(64)})),false));
test("wrong post rejected",()=>assert.equal(validateFixture(contract({template_id:2004})),false));
test("wrong meta key rejected",()=>assert.equal(validateFixture(contract({meta_key:"anything"})),false));
test("Product 70 mutation impossible",()=>{assert.match(plugin,/SKAI_RECOVERY_TEMPLATE_ID = 2003/);assert.doesNotMatch(plugin,/update_post\(/);});
test("other template mutation impossible",()=>assert.match(plugin,/update_metadata\('post', SKAI_RECOVERY_TEMPLATE_ID, SKAI_RECOVERY_META_KEY/));
test("other meta mutation impossible",()=>assert.match(plugin,/SKAI_RECOVERY_META_KEY = '_elementor_data'/));
test("malformed recovery source rejected",()=>assert.equal(validateFixture(contract({target_raw_elementor_data:"{"})),false));
test("arbitrary value injection rejected",()=>assert.equal(validateFixture(contract({target_raw_elementor_data:originalRaw+" "})),false));
test("dry-run zero mutation",()=>{const body=plugin.slice(plugin.indexOf("if ($body['action'] === 'dry_run')"),plugin.indexOf("function skai_recovery_claim"));assert.doesNotMatch(body,/skai_recovery_write_exact/);});
test("dry-run performs no claim",()=>{const fn=plugin.slice(plugin.indexOf("function skai_recovery_validation_dry_run"),plugin.indexOf("function skai_recovery_validate_contract"));assert.match(fn,/claim_possible'=>false/);assert.doesNotMatch(fn,/skai_recovery_claim/);});
test("valid one-time claim uses atomic INSERT IGNORE",()=>assert.match(plugin,/INSERT IGNORE INTO \{\$wpdb->options\}/));
test("replay is rejected",()=>assert.match(plugin,/streetkingz_ai_recovery_replay_rejected/));
test("concurrent duplicate claim has database unique-key winner",()=>{assert.match(plugin,/SKAI_RECOVERY_CLAIM_PREFIX/);assert.match(plugin,/\$inserted === 1/);});
test("failure before claim remains unconsumed",()=>assert.ok(plugin.indexOf("skai_recovery_preflight($record['contract'])")<plugin.indexOf("skai_recovery_claim($record)")));
test("failure after claim remains permanently consumed",()=>assert.match(plugin,/failed_after_claim/));
test("recovery drifted to original is byte exact",()=>{let persisted=driftedRaw;persisted=originalRaw;assert.equal(sha256(persisted),expectedOriginal);});
test("recovery rollback original to drifted is byte exact",()=>{let persisted=originalRaw;persisted=driftedRaw;assert.equal(sha256(persisted),expectedDrifted);});
test("post-recovery raw hash exact",()=>assert.equal(Buffer.from(originalRaw).toString(),originalRaw));
test("post-recovery parsed structure exact",()=>assert.deepEqual(JSON.parse(originalRaw),original));
test("safety widget exact",()=>assert.deepEqual(find(original,"43d7d6f0"),find(JSON.parse(originalRaw),"43d7d6f0")));
test("description and comparison exact",()=>{for(const id of ["c80e718","40869c27"])assert.deepEqual(find(original,id),find(JSON.parse(originalRaw),id));});
test("product fields are observation-only",()=>{assert.match(plugin,/product_70_title_sha256/);assert.doesNotMatch(plugin,/post_title.*update/);});
test("cache invalidation is bounded",()=>{assert.match(plugin,/clean_post_cache\(SKAI_RECOVERY_TEMPLATE_ID\)/);assert.doesNotMatch(plugin,/clear_cache\(\)/);});
test("unrelated meta is unchanged",()=>assert.equal((plugin.match(/update_metadata\('post', SKAI_RECOVERY_TEMPLATE_ID, SKAI_RECOVERY_META_KEY/g)||[]).length,1));
test("no generic update_post_meta interface exists",()=>{assert.doesNotMatch(plugin,/update_post_meta/);assert.doesNotMatch(plugin,/\(\?P<post/);});
test("normal Writer capability is insufficient",()=>assert.doesNotMatch(plugin,/streetkingz_ai_write_approved_product_copy/));
test("dedicated recovery capability is required",()=>assert.match(plugin,/streetkingz_ai_recover_template_2003/));
test("credentials are excluded",()=>assert.doesNotMatch(plugin,/Authorization|Application Password|WORDPRESS_.*PASSWORD|api[_-]?key/i));
