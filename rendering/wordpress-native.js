import { canonicalJson, sha256 } from "../research/core/canonical.js";

export const WORDPRESS_MAPPING_STATES = Object.freeze(["NATIVE_BLOCK", "COMPOSED_BLOCKS", "EXISTING_PLUGIN_BLOCK", "CUSTOM_BLOCK_REQUIRED", "FALLBACK_RENDERER", "UNSUPPORTED"]);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#8217;" }[c]));
const block = (name, attrs, inner = "", closing = true) => `<!-- wp:${name}${attrs ? ` ${JSON.stringify(attrs)}` : ""} -->${inner}${closing ? `<!-- /wp:${name} -->` : ""}`;
const paragraph = (text) => block("paragraph", {}, `<p>${esc(text)}</p>`);
const heading = (text, level = 2) => block("heading", { level }, `<h${level}>${esc(text)}</h${level}>`);
const link = (label, url) => `<a href="${esc(url)}">${esc(label)}</a>`;

export const STREET_KINGZ_WORDPRESS_MAPPING = Object.freeze({
  hero: { state: "COMPOSED_BLOCKS", target: "core/group + core/cover-or-image + core/heading", confidence: "medium", custom_code_required: false, editable: true, semantic_html: true, mobile: "stacked" },
  quick_answer: { state: "COMPOSED_BLOCKS", target: "core/group + core/heading + core/list", confidence: "medium", custom_code_required: false, editable: true, semantic_html: true, mobile: "natural-flow" },
  rich_text_section: { state: "NATIVE_BLOCK", target: "core/heading + core/paragraph + core/list", confidence: "high", custom_code_required: false, editable: true, semantic_html: true, mobile: "natural-flow" },
  criteria_cards: { state: "COMPOSED_BLOCKS", target: "core/group + core/columns", confidence: "medium", custom_code_required: false, editable: true, semantic_html: true, mobile: "stacked" },
  comparison_table: { state: "COMPOSED_BLOCKS", target: "core/table", confidence: "high", custom_code_required: false, editable: true, semantic_html: true, mobile: "horizontal-scroll-or-stack" },
  image_text: { state: "COMPOSED_BLOCKS", target: "core/media-text", confidence: "medium", custom_code_required: false, editable: true, semantic_html: true, mobile: "stacked" },
  product_recommendation: { state: "COMPOSED_BLOCKS", target: "core/group + WooCommerce product link + core/button", confidence: "medium", custom_code_required: false, editable: true, semantic_html: true, mobile: "stacked" },
  product_comparison: { state: "COMPOSED_BLOCKS", target: "core/table + core/group", confidence: "medium", custom_code_required: false, editable: true, semantic_html: true, mobile: "horizontal-scroll-or-stack" },
  pros_tradeoffs: { state: "COMPOSED_BLOCKS", target: "core/columns + core/list", confidence: "high", custom_code_required: false, editable: true, semantic_html: true, mobile: "stacked" },
  founder_note: { state: "COMPOSED_BLOCKS", target: "core/group + core/paragraph", confidence: "high", custom_code_required: false, editable: true, semantic_html: true, mobile: "natural-flow" },
  faq: { state: "COMPOSED_BLOCKS", target: "core/heading + core/paragraph", confidence: "medium", custom_code_required: false, editable: true, semantic_html: true, mobile: "natural-flow", notes: "Core Details availability was not evidenced in the supplied site artifacts; avoid assuming an accordion plugin." },
  related_guides: { state: "NATIVE_BLOCK", target: "core/list + core/link", confidence: "high", custom_code_required: false, editable: true, semantic_html: true, mobile: "natural-flow" },
  conclusion: { state: "NATIVE_BLOCK", target: "core/heading + core/paragraph", confidence: "high", custom_code_required: false, editable: true, semantic_html: true, mobile: "natural-flow" },
  call_to_action: { state: "COMPOSED_BLOCKS", target: "core/paragraph + core/button", confidence: "medium", custom_code_required: false, editable: true, semantic_html: true, mobile: "stacked" },
  key_takeaway: { state: "COMPOSED_BLOCKS", target: "core/group + core/paragraph + core/list", confidence: "medium", custom_code_required: false, editable: true, semantic_html: true, mobile: "natural-flow" }
});

function list(items = []) { return items.length ? block("list", {}, `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`) : ""; }
function renderComponent(component, mapping) {
  const d = component.data || {}; const type = component.component_type; if (mapping[type]?.state === "UNSUPPORTED") throw new Error(`Unsupported WordPress mapping: ${type}`);
  const title = d.heading || d.h1; let output = title && type !== "hero" ? heading(title, 2) : "";
  if (type === "hero") {
    output += d.supporting_copy ? paragraph(d.supporting_copy) : "";
    if (d.image_placeholder) output += paragraph(`[Image placeholder: ${d.image_placeholder.description || "approved media required"}]`);
  }
  else if (type === "quick_answer") output += block("group", {}, paragraph(d.concise_answer) + list(d.supporting_points));
  else if (type === "rich_text_section") output += (d.paragraphs || []).map(paragraph).join("") + list(d.key_points);
  else if (type === "criteria_cards") output += block("columns", {}, d.cards.map((card) => block("column", {}, heading(card.title, 3) + paragraph(card.explanation))).join(""));
  else if (type === "comparison_table") {
    const headers = d.columns || [];
    const rows = d.rows || [];
    output += block("table", {}, `<figure class="wp-block-table"><table><thead><tr>${headers.map((item) => `<th>${esc(item)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${(row.cells || []).map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></figure>`);
  }
  else if (type === "pros_tradeoffs") output += block("columns", {}, ["pros", "tradeoffs"].map((key) => { const group = d[key] || {}; return block("column", {}, heading(group.heading || key, 3) + list(group.items || [])); }).join(""));
  else if (type === "key_takeaway") output += block("group", {}, paragraph(d.takeaway) + list(d.supporting_points));
  else if (type === "faq") output += (d.items || []).map((item) => heading(item.question, 3) + paragraph(item.answer)).join("");
  else if (type === "product_recommendation") { const url = component.product_url || d.product_url || null; const productCopy = url ? `<p>${link(d.product_name || d.product_id, url)}</p>` : paragraph(d.product_id || "Product recommendation"); output += block("group", {}, productCopy + (d.recommendation_context ? paragraph(d.recommendation_context) : "") + (d.relevance_reason ? paragraph(d.relevance_reason) : "") + (d.cta_label && url ? block("buttons", {}, block("button", { url }, `<a class="wp-block-button__link" href="${esc(url)}">${esc(d.cta_label)}</a>`)) : "")); }
  else if (type === "conclusion") output += paragraph(d.summary) + paragraph(d.next_step);
  else if (type === "call_to_action") output += paragraph(d.body);
  else if (type === "image_text") output += (d.body || []).map(paragraph).join("");
  else if (type === "founder_note") output += block("group", {}, paragraph(d.opinion) + paragraph(d.attribution));
  else output += paragraph(d.body || d.summary || "");
  return output;
}

export function renderSemanticPageToWordPressBlocks(page, { mapping = STREET_KINGZ_WORDPRESS_MAPPING, productRegistry = new Map() } = {}) {
  if (!page || !Array.isArray(page.components)) throw new Error("SemanticPage is required.");
  const components = page.components.map((component) => { const productId = component.data?.product_id; const product = productId ? (productRegistry.get?.(productId) || productRegistry[productId]) : null; return { ...component, product_url: product?.url || null, product_name: product?.name || null }; });
  const markup = heading(page.h1, 1) + (page.introduction_deck ? paragraph(page.introduction_deck) : "") + components.map((component) => block("group", { className: `semantic-component semantic-${component.component_type}` }, renderComponent(component, mapping))).join("");
  return { artifact_type: "wordpress_native_block_prototype", format: "gutenberg-block-markup", mapping_version: "1.0.0", markup, semantic_page_sha256: sha256(canonicalJson(page)), semantic_content_modified: false, wordpress_writes: 0, ai_calls: 0 };
}
