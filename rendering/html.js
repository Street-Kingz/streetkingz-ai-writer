import { DEFAULT_THEME, createRendererContract } from "./contracts.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const cls = (theme, name) => `${theme.class_prefix}-${name}`;
const attrs = (values) => Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== false).map(([key, value]) => `${key}="${esc(value)}"`).join(" ");
const p = (text) => `<p>${esc(text)}</p>`;
const list = (items) => items?.length ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : "";

function media(requirements, theme, mode) {
  return (requirements || []).filter((item) => {
    if (mode === "production" && item.status === "required_missing") throw new Error(`Required media unresolved: ${item.requirement_id}`);
    return mode === "offline" || item.status !== "optional_missing";
  }).map((item) => mode === "production" ? "" : `<figure class="${cls(theme, "media-placeholder")} ${cls(theme, item.status)}" ${attrs({ "data-media-kind": item.kind, "data-media-status": item.status })}><div role="img" aria-label="${esc(item.alt_text_direction)}"></div><figcaption>${esc(item.purpose)}${item.status === "required_missing" ? " — media required before publication" : " — optional media not supplied"}</figcaption></figure>`).join("");
}
function heading(text, level = 2) { return `<h${level}>${esc(text)}</h${level}>`; }
function surfaceRole(component, theme) { return theme.surface_assignment?.[component.component_type] || "surface"; }
function widthRole(component, theme) { return theme.layout?.width_roles?.[component.component_type] || "auto"; }
function productLink(id, products, theme) {
  const product = products.get(id); if (!product) throw new Error(`Unknown product reference: ${id}`);
  return `<a class="${cls(theme, "product-link")}" href="${esc(product.url)}">${esc(product.name)}</a>`;
}
function internalLink(id, links, products, theme) {
  const link = links.get(id); if (!link) throw new Error(`Unknown internal link reference: ${id}`);
  const product = [...products.values()].find((item) => item.url === link.destination_url);
  const label = product?.name || link.anchor_label || "Read the related guide";
  return `<a class="${cls(theme, "internal-link")}" href="${esc(link.destination_url)}">${esc(label)}</a>`;
}

function renderComponent(component, context) {
  const { products, links, theme, mode } = context; const d = component.data; const type = component.component_type;
  const body = [];
  if (type !== "hero" && (d.heading || d.h1)) body.push(heading(d.heading || d.h1));
  if (type === "hero") { body.push(`<div class="${cls(theme, "hero-copy")}">${p(d.supporting_copy)}</div>`); if (d.trust_update_note) body.push(p(d.trust_update_note)); }
  if (type === "quick_answer") body.push(`<div class="${cls(theme, "quick-answer")}">${p(d.concise_answer)}${list(d.supporting_points)}</div>`);
  if (type === "rich_text_section") body.push(...(d.paragraphs || []).map(p), list(d.key_points));
  if (type === "key_takeaway") body.push(`<aside class="${cls(theme, "key-takeaway")}" role="note">${p(d.takeaway)}${list(d.supporting_points)}</aside>`);
  if (type === "criteria_cards") body.push(`<div class="${cls(theme, "criteria-grid")}">${d.cards.map((card) => `<article class="${cls(theme, "criteria-card")}">${heading(card.title, 3)}${p(card.explanation)}</article>`).join("")}</div>`);
  if (type === "comparison_table" || type === "product_comparison") {
    const columns = d.columns || d.comparison_points?.map((item) => item.criterion) || [];
    const rows = d.rows || d.comparison_points?.map((item) => ({ label: item.criterion, cells: item.values })) || [];
    body.push(`<div class="${cls(theme, "table-wrap")}"><table><thead><tr>${columns.map((column) => `<th scope="col">${esc(column)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr><th scope="row">${esc(row.label)}</th>${row.cells.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
    if (d.limitations?.length) body.push(`<aside class="${cls(theme, "callout")}" role="note">${list(d.limitations)}</aside>`);
  }
  if (type === "image_text") body.push(...(d.body || []).map(p));
  if (type === "product_recommendation") { const product = products.get(d.product_id); const image = theme.media?.product_images?.[d.product_id]; body.push(`<div class="${cls(theme, "product-recommendation")}"><div class="${cls(theme, "product-media")}">${image ? `<img src="${esc(image.url)}" alt="${esc(image.alt || product.name)}" loading="lazy">` : ""}</div><div class="${cls(theme, "product-copy")}">${productLink(d.product_id, products, theme)}${p(d.recommendation_context)}${p(d.relevance_reason)}${d.cta_label ? `<a class="${cls(theme, "cta")}" href="${esc(product.url)}">${esc(d.cta_label)}</a>` : ""}</div></div>`); }
  if (type === "pros_tradeoffs") body.push(`<div class="${cls(theme, "pros-tradeoffs")}"><div><h3>Advantages</h3>${list(d.advantages)}</div><div><h3>Trade-offs</h3>${list(d.tradeoffs)}</div>${d.suitable_for?.length ? `<div><h3>Suitable for</h3>${list(d.suitable_for)}</div>` : ""}${d.not_ideal_for?.length ? `<div><h3>Not ideal for</h3>${list(d.not_ideal_for)}</div>` : ""}</div>`);
  if (type === "founder_note") body.push(`<aside class="${cls(theme, "founder-note")}" role="note">${p(d.opinion)}${p(d.attribution)}</aside>`);
  if (type === "faq") body.push(`<div class="${cls(theme, "faq-list")}">${d.items.map((item) => `<details><summary>${esc(item.question)}</summary>${p(item.answer)}</details>`).join("")}</div>`);
  if (type === "related_guides") body.push(`<nav aria-label="Related guides"><ul>${d.links.map((item) => `<li>${internalLink(item.internal_link_id, links, products, theme)} — ${esc(item.context)}</li>`).join("")}</ul></nav>`);
  if (type === "conclusion") body.push(p(d.summary), p(d.next_step));
  if (type === "call_to_action") body.push(`<div class="${cls(theme, "cta-block")}">${p(d.body)}${d.product_id ? productLink(d.product_id, products, theme) : d.internal_link_id ? internalLink(d.internal_link_id, links, theme) : ""}</div>`);
  if (component.internal_link_ids?.length && type !== "related_guides" && !d.links) {
    const productUrls = new Set((component.product_ids || []).map((id) => products.get(id)?.url).filter(Boolean));
    const linksToRender = component.internal_link_ids.filter((id) => !productUrls.has(links.get(id)?.destination_url));
    if (linksToRender.length) body.push(`<nav aria-label="Related links"><ul>${linksToRender.map((id) => `<li>${internalLink(id, links, products, theme)}</li>`).join("")}</ul></nav>`);
  }
  const mediaHtml = media(component.media_requirements, theme, mode); if (mediaHtml) body.push(mediaHtml);
  const role = widthRole(component, theme); return `<section class="${cls(theme, `component component-${type} surface-${surfaceRole(component, theme)}`)}" data-component-id="${esc(component.component_id)}" data-surface-role="${esc(surfaceRole(component, theme))}" data-width-role="${esc(role)}"><div class="${cls(theme, "section-inner")} ${cls(theme, `width-${role}`)}"><div class="${cls(theme, "content-container")}">${body.join("")}</div></div></section>`;
}

export function renderSemanticPageHtml(page, { allowlists, theme = DEFAULT_THEME, mode = "offline" } = {}) {
  if (!page || !Array.isArray(page.components)) throw new Error("A semantic page is required.");
  const products = new Map((allowlists?.products || []).map((item) => [item.product_id, item]));
  const links = new Map((allowlists?.internal_links || []).map((item) => [item.link_id, item]));
  const contract = createRendererContract(theme);
  const pageRole = theme.page_surface_role || "page";
  const content = [`<header class="${cls(theme, `header surface-${pageRole}`)}" data-surface-role="${esc(pageRole)}"><div class="${cls(theme, "section-inner")} ${cls(theme, "width-wide")}"><div class="${cls(theme, "content-container")}"><h1>${esc(page.h1)}</h1>${p(page.introduction_deck)}</div></div></header>`, ...page.components.map((component) => renderComponent(component, { products, links, theme, mode }))].join("");
  return `<article class="${cls(theme, "page")} surface-${pageRole}" data-renderer-contract="${contract.renderer_contract_version}" data-theme="${esc(theme.theme_id)}" data-surface-role="${esc(pageRole)}">${content}</article>`;
}

export function renderStreetKingzEditorialCss(theme = DEFAULT_THEME) {
  const c = theme.class_prefix; const surfaces = theme.surfaces; const layout = theme.layout || {}; const container = theme.container || {}; const roles = layout.width_roles || {}; const surfaceCss = Object.entries(surfaces || {}).map(([role, token]) => `.${c}-page.surface-${role},.${c}-page .surface-${role}{--surface-bg:${token.background};--surface-text:${token.text};--surface-muted:${token.text_muted};--surface-heading:${token.heading};--surface-link:${token.link};--surface-border:${token.border};--surface-accent:${token.accent};--surface-accent-text:${token.accent_text};background:var(--surface-bg);color:var(--surface-text);}`).join(""); const fontImport = theme.typography?.font_import ? `@import url('${theme.typography.font_import}');` : ""; const canvasWidth = layout.page_canvas === "full_width" ? "100%" : (container.max_width || "72rem"); const sectionWidth = layout.section_surface === "full_width" ? "100%" : canvasWidth; const widthCss = `. ${c}-page`.replace(". ", ".") + `{width:${canvasWidth};max-width:${canvasWidth};margin:0 auto;padding:0;font-family:${theme.typography.body};line-height:${theme.typography.line_height};background:var(--surface-bg);color:var(--surface-text)}.${c}-page .${c}-header,.${c}-page .${c}-component{width:${sectionWidth};max-width:${sectionWidth};margin:0 auto 2.75rem;padding:0}.${c}-page .${c}-section-inner{width:100%;max-width:100%;padding:clamp(2rem,5vw,4rem) ${container.gutter || "1.25rem"}}.${c}-page .${c}-content-container{width:100%;max-width:${container.reading_width || "48rem"};margin:0 auto}.${c}-page .${c}-width-wide .${c}-content-container{max-width:${container.max_width || "72rem"}}.${c}-page .${c}-width-split .${c}-content-container{max-width:${container.max_width || "72rem"}}.${c}-page .${c}-width-full_bleed .${c}-content-container{max-width:none}.${c}-page .${c}-width-auto .${c}-content-container{max-width:${container.reading_width || "48rem"}}`; return `${fontImport}html,body{margin:0;padding:0;min-width:0}body{background:${theme.surfaces?.page?.background || "#fff"};color:${theme.surfaces?.page?.text || "#171717"};font-family:${theme.typography.body}}${widthCss}${surfaceCss}.${c}-page .${c}-header{border-bottom:1px solid var(--surface-border)}.${c}-page h1,.${c}-page h2,.${c}-page h3{color:var(--surface-heading)}.${c}-page h1{font-family:${theme.typography.heading};font-size:clamp(2.25rem,5vw,4rem);font-weight:700;letter-spacing:-.02em;line-height:1.05;margin:0 0 1.25rem}.${c}-page h2{font-family:${theme.typography.heading};font-size:clamp(1.65rem,3vw,2.35rem);line-height:1.15;margin:0 0 1.25rem}.${c}-page h3{font-family:${theme.typography.heading};font-size:1.35rem;line-height:1.2;margin:1.5rem 0 .75rem}.${c}-page p{color:var(--surface-text);font-size:1.08rem;margin:0 0 1rem}.${c}-page a{color:var(--surface-link)}.${c}-page .${c}-quick-answer,.${c}-page .${c}-key-takeaway,.${c}-page .${c}-callout{padding:1.5rem;border-left:4px solid var(--surface-accent);background:var(--surface-bg);color:var(--surface-text);border-radius:${theme.shape.radius}}.${c}-criteria-grid{display:grid;gap:1rem}@media (min-width:48rem){.${c}-criteria-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}.${c}-criteria-card{padding:1.35rem;border:1px solid var(--surface-border);border-radius:${theme.shape.radius};background:var(--surface-bg)}.${c}-product-recommendation{display:grid;grid-template-columns:minmax(9rem,13rem) 1fr;gap:1.5rem;padding:1.5rem;border-radius:${theme.shape.radius};background:var(--surface-bg);color:var(--surface-text);box-shadow:${theme.shape.shadow}}.${c}-product-media{background:var(--surface-muted);border-radius:${theme.shape.radius};padding:.5rem;min-height:12rem}.${c}-product-media img{display:block;width:100%;height:100%;max-height:16rem;object-fit:contain;border-radius:${theme.shape.radius}}.${c}-product-copy .${c}-product-link{display:block;color:var(--surface-link);font-size:1.45rem;font-weight:700;text-decoration:none;margin-bottom:1rem}.${c}-product-copy p{color:var(--surface-text)}.${c}-cta{display:inline-block;margin-top:1rem;padding:.8rem 1.1rem;background:var(--surface-accent);color:var(--surface-accent-text)!important;border-radius:${theme.shape.radius};font-weight:700;text-decoration:none}.${c}-table-wrap{overflow-x:auto}.${c}-table-wrap table{border-collapse:collapse;width:100%}.${c}-table-wrap th,.${c}-table-wrap td{padding:.85rem;border-bottom:1px solid var(--surface-border);text-align:left}.${c}-media-placeholder{padding:1rem;background:var(--surface-bg);border:1px solid var(--surface-border);border-radius:${theme.shape.radius}}.${c}-media-placeholder [role=img]{min-height:10rem;background:var(--surface-muted);border-radius:${theme.shape.radius}}.${c}-faq-list details{padding:1rem 0;border-bottom:1px solid var(--surface-border)}.${c}-faq-list summary{cursor:pointer;color:var(--surface-heading);font-weight:700;font-size:1.1rem}@media (max-width:47.99rem){.${c}-page{width:100%;max-width:100%}.${c}-page .${c}-section-inner{padding:2rem 1rem}.${c}-page p{font-size:1rem}.${c}-page h1{font-size:clamp(2rem,9vw,2.75rem)}.${c}-product-recommendation{grid-template-columns:1fr}.${c}-product-media{min-height:13rem}.${c}-product-media img{max-height:15rem}}`;
}
