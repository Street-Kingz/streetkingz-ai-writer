import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const plugin = await readFile("wordpress-plugin/ai-writer-article-draft/ai-writer-article-draft.php", "utf8");
const readme = await readFile("wordpress-plugin/ai-writer-article-draft/README.md", "utf8");

test("article draft plugin exposes only the bounded lifecycle", () => {
  assert.match(plugin, /ai-writer\/v1/);
  for (const route of ["article-draft\/contract", "article-draft\/status", "article-draft\/dry-run", "article-draft\/execute"]) assert.match(plugin, new RegExp(route));
  assert.match(plugin, /CREATE_NEW_POST/);
  assert.match(plugin, /post_type.*post/);
  assert.match(plugin, /post_status.*draft/);
  assert.match(plugin, /AI_WRITER_DRAFT_CAPABILITY/);
  assert.match(plugin, /article-draft\/created-draft\/\(\?P<execution_id>/);
});

test("role is narrow and cannot grant broad CMS or publication rights", () => {
  const role = plugin.slice(plugin.indexOf("function ai_writer_draft_ensure_role"), plugin.indexOf("register_activation_hook"));
  assert.match(role, /\['read' => true, AI_WRITER_DRAFT_CAPABILITY => true\]/);
  for (const forbidden of ["administrator", "edit_posts", "edit_pages", "publish_posts", "delete_posts", "edit_products", "upload_files", "manage_options", "edit_theme_options", "manage_woocommerce"]) assert.doesNotMatch(role, new RegExp(forbidden));
});

test("all protected responses are marked private and non-cacheable", () => {
  assert.match(plugin, /DONOTCACHEPAGE/);
  assert.match(plugin, /LSCACHE_NO_CACHE/);
  assert.match(plugin, /no-cache, must-revalidate, max-age=0, no-store, private/);
  assert.match(plugin, /ai_writer_draft_protected_route/);
});

test("only the exact contract and fixed post operation are accepted", () => {
  assert.match(plugin, /ai_writer_draft_exact_keys\(\$contract, \$keys\)/);
  assert.match(plugin, /\['post_type'\] !== 'post'/);
  assert.match(plugin, /\['post_status'\] !== 'draft'/);
  assert.match(plugin, /\['operation'\] !== 'CREATE_NEW_POST'/);
  assert.match(plugin, /existing_post_id/);
  assert.match(plugin, /wp_insert_post\(\[/);
  assert.doesNotMatch(plugin, /\$request->get_param\(['"](?:post_type|post_status|post_id|meta|taxonomy|terms|media)/i);
});

test("content validation blocks H1 unsafe HTML shortcodes Elementor and unknown blocks", () => {
  for (const value of ["<h1\\b", "<script\\b", "<iframe\\b", "\\[[^\\]]+\\]", "data-elementor-", "_elementor_data"]) assert.match(plugin, new RegExp(value));
  assert.match(plugin, /on\[a-z\]\+/);
  assert.match(plugin, /AI_WRITER_DRAFT_MAX_BYTES/);
  assert.match(plugin, /AI_WRITER_DRAFT_MAX_TITLE/);
  assert.match(plugin, /AI_WRITER_DRAFT_MAX_EXCERPT/);
  assert.match(plugin, /ai_writer_draft_valid_content/);
  assert.match(plugin, /ai_writer_draft_blocks_malformed/);
});

test("contract binds exact content hash, blocks arbitrary meta taxonomy media and Elementor", () => {
  assert.match(plugin, /content_sha256/);
  assert.match(plugin, /hash_equals\(\$contract\['content_sha256'\]/);
  assert.match(plugin, /'post_excerpt' => \$contract\['excerpt'\]/);
  assert.match(plugin, /'post_category' => \[\]/);
  assert.doesNotMatch(plugin, /meta_input|tax_input|media_id|upload/);
  assert.doesNotMatch(plugin, /save_document|elementor_library|Elementor\\s+Document|update_post_meta/);
});

test("dry run does not claim or mutate and execute claims atomically", () => {
  const dry = plugin.slice(plugin.indexOf("function ai_writer_draft_dry_run"), plugin.indexOf("function ai_writer_draft_readback"));
  assert.match(dry, /claim_performed.*false/);
  assert.match(dry, /mutation_performed.*false/);
  const execute = plugin.slice(plugin.indexOf("function ai_writer_draft_execute"));
  assert.match(execute, /add_option\(\$claim_option/);
  assert.match(execute, /ai_writer_draft_execution_replay/);
  assert.match(execute, /failed_after_claim/);
});

test("fresh read-back is authoritative and cleanup is exact-ID only", () => {
  assert.match(plugin, /get_post\(\$post_id\)/);
  assert.match(plugin, /post_type !== 'post'/);
  assert.match(plugin, /post_status !== 'draft'/);
  assert.match(plugin, /wp_trash_post\(\(int\) \$post_id\)/);
  assert.match(plugin, /cleanup_verified/);
  assert.match(plugin, /get_edit_post_link/);
});

test("created-draft read-back is execution-bound and server-side only", () => {
  assert.match(plugin, /function ai_writer_draft_created_draft_readback/);
  assert.match(plugin, /get_post\(\(int\) \$claim\['created_post_id'\]\)/);
  assert.match(plugin, /execution_id_sha256/);
  assert.match(plugin, /contract_sha256/);
  assert.match(plugin, /hash_equals\(\$contract\['content_sha256'\], ai_writer_draft_hash\(\$post->post_content\)\)/);
  assert.match(plugin, /'content_sha256' => ai_writer_draft_hash\(\$post->post_content\)/);
  assert.match(plugin, /'template_assignment' => ''/);
  assert.match(plugin, /'taxonomy_state' => 'empty'/);
  assert.doesNotMatch(plugin, /\$request->get_param\(['"]post_id/);
  assert.doesNotMatch(plugin, /'meta'\s*=>|get_post_meta\([^\n]+\*|get_post_custom/);
});

test("plugin has no Product 70, Template 2003, or broad Elementor dependency", () => {
  assert.doesNotMatch(plugin, /Product 70|Template 2003|2003|product_id|elementor_template/i);
  assert.doesNotMatch(readme, /Product 70|Template 2003|Elementor document/i);
});

test("package source contains no active contract, execution ID, credentials, or live fixture", () => {
  assert.doesNotMatch(plugin, /gutenberg-render-test-draft-001|07068b84ccc1d902b4759cbf526fa7ef6f818358c2171289e8052615ba1071a3|application[_ -]?password|Authorization:\s*Basic/i);
});

test("deployment ZIP has a WordPress-detectable plugin root", () => {
  const zip = "artifacts/deployment/ai-writer-article-draft-0.1.1.zip";
  const entries = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean);
  assert.ok(entries.includes("ai-writer-article-draft/"));
  assert.ok(entries.includes("ai-writer-article-draft/ai-writer-article-draft.php"));
  assert.ok(entries.includes("ai-writer-article-draft/README.md"));
  assert.ok(entries.every((entry) => entry === "ai-writer-article-draft/" || entry.startsWith("ai-writer-article-draft/")));
  assert.doesNotMatch(entries.join("\n"), /^(?:wordpress-plugin|artifacts)\//m);
  assert.match(plugin, /^\s*\* Plugin Name:\s*AI Writer Article Draft\s*$/m);
  assert.match(plugin, /^\s*\* Version:\s*0\.1\.1\s*$/m);
  assert.doesNotMatch(entries.join("\n"), /(?:\.env|execution-authorisation|active-contract|credentials)/i);
});
