import { canonicalJson, sha256 } from "../research/core/canonical.js";

export const DRAFT_PROOF_ALLOWED_BLOCKS = Object.freeze([
  "paragraph", "heading", "list", "group", "columns", "column", "buttons", "button", "image"
]);

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#8217;" }[c]));
const block = (name, attrs = {}, inner = "") => `<!-- wp:${name}${Object.keys(attrs).length ? ` ${JSON.stringify(attrs)}` : ""} -->${inner}<!-- /wp:${name} -->`;
const paragraph = (text) => block("paragraph", {}, `<p>${esc(text)}</p>`);
const heading = (text, level = 2) => block("heading", { level }, `<h${level}>${esc(text)}</h${level}>`);
const list = (items) => block("list", {}, `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`);

export const GUTENBERG_DRAFT_PROOF = Object.freeze({
  post_title: "STREET KINGZ AI WRITER — GUTENBERG RENDER TEST",
  post_excerpt: "Non-production Kadence/native WordPress rendering test. Not for publication.",
  content: [
    paragraph("STREET KINGZ AI WRITER — GUTENBERG RENDER TEST"),
    paragraph("This is a small, non-production draft used to see how native WordPress content sits inside the real Street Kingz and Kadence shell. It is not the approved drying-towel article."),
    heading("A simple test of the native article shell"),
    paragraph("The useful question is straightforward: can normal WordPress blocks provide a clean, editable article foundation without creating a separate Elementor document for every page?"),
    list(["Readable paragraphs and headings", "A short practical list", "A small callout and a two-column layout", "A low-pressure button and simple FAQ content"]),
    block("group", { className: "is-style-notice" }, heading("Quick takeaway", 3) + paragraph("Keep the content simple, useful and easy to edit. The site shell should handle the surrounding presentation.")),
    block("columns", {}, block("column", {}, heading("Normal content", 3) + paragraph("This column represents an ordinary editorial point that should remain comfortable to read on desktop and mobile.")) + block("column", {}, heading("Practical choice", 3) + paragraph("This column represents a short, useful comparison without turning the page into a custom visual system."))),
    block("image", { alt: "Visual review placeholder for Street Kingz test media", className: "is-style-placeholder" }, `<figure class="wp-block-image is-style-placeholder"><div role="img" aria-label="Image placeholder: Street Kingz Gutenberg render test">Image placeholder for visual review</div></figure>`),
    block("buttons", {}, block("button", { url: "https://streetkingz.co.uk/" }, `<a class="wp-block-button__link" href="https://streetkingz.co.uk/">View Street Kingz</a>`)),
    heading("One simple FAQ", 2),
    heading("What is this draft for?", 3),
    paragraph("It is only a visual and persistence test. It should stay a draft and should never be treated as finished customer content.")
  ].join("\n")
});

const blockNames = (markup) => [...markup.matchAll(/<!-- wp:([a-z0-9-]+)(?:\s|\s?--)/g)].map((m) => m[1]);

export function validateGutenbergDraftContent(markup) {
  const errors = [];
  if (typeof markup !== "string" || !markup.trim()) errors.push("CONTENT_EMPTY");
  if ((markup.match(/<h1\b/gi) || []).length) errors.push("CONTENT_H1_FORBIDDEN");
  if (/<script\b|<iframe\b|\[[^\]]+\]|data-elementor-|elementor-|_elementor_data/i.test(markup)) errors.push("UNSAFE_MARKUP");
  const names = blockNames(markup);
  for (const name of names) if (!DRAFT_PROOF_ALLOWED_BLOCKS.includes(name)) errors.push(`BLOCK_NOT_ALLOWED:${name}`);
  if (!names.includes("paragraph") || !names.includes("heading") || !names.includes("list") || !names.includes("group") || !names.includes("columns") || !names.includes("image") || !names.includes("button")) errors.push("REQUIRED_CORE_BLOCK_MISSING");
  return { status: errors.length ? "FAIL" : "PASS", errors, block_names: names, h1_count: (markup.match(/<h1\b/gi) || []).length };
}

export function buildDraftProofPackage({ execution_id = "gutenberg-render-test-draft-001", content = GUTENBERG_DRAFT_PROOF.content } = {}) {
  const validation = validateGutenbergDraftContent(content);
  if (validation.status !== "PASS") throw new Error(`Invalid Gutenberg draft: ${validation.errors.join(",")}`);
  const content_hash = sha256(content);
  const contract = {
    schema_version: "1.0.0",
    artifact_type: "wordpress_create_draft_proof_contract",
    execution_id,
    operation: "CREATE_NEW_POST",
    target: { post_type: "post", post_status: "draft", existing_post_id: null },
    payload: { post_title: GUTENBERG_DRAFT_PROOF.post_title, post_excerpt: GUTENBERG_DRAFT_PROOF.post_excerpt, post_content_sha256: content_hash },
    authority: { publish: false, edit_existing_posts: false, edit_products: false, edit_elementor: false, arbitrary_meta: false, retry: false },
    verification: { require_created_post_id: true, read_back_fields: ["id", "post_type", "status", "title", "content"], expected_status: "draft", expected_post_type: "post" },
    cleanup: { on_verification_failure: "trash_or_delete_only_created_post", require_exact_created_post_id: true, never_touch_existing_posts: true },
    live_execution: false,
    wordpress_writes: 0,
    ai_calls: 0
  };
  return { contract, content, content_hash, validation, preview: { post_title: GUTENBERG_DRAFT_PROOF.post_title, post_excerpt: GUTENBERG_DRAFT_PROOF.post_excerpt, content } };
}

export function canonicalDraftPackageHash(pkg) { return sha256(canonicalJson({ contract: pkg.contract, content: pkg.content })); }
