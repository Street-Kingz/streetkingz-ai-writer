const lines = (items) => items.map((item) => `- ${item}`).join("\n");

function renderComponent(component, products, links) {
  const d = component.data;
  // The page-level H1 is rendered once below. A hero's structured h1 is
  // retained for the future renderer but must not become a second visible
  // heading in human-review Markdown.
  const heading = component.component_type === "hero"
    ? null
    : (d.heading || d.h1 || component.component_type.replaceAll("_", " "));
  const out = heading ? [`## ${heading}`] : [];
  if (d.supporting_copy) out.push(d.supporting_copy);
  if (d.concise_answer) out.push(d.concise_answer, lines(d.supporting_points));
  if (d.paragraphs) out.push(...d.paragraphs, d.key_points?.length ? lines(d.key_points) : "");
  if (d.takeaway) out.push(d.takeaway, lines(d.supporting_points));
  if (d.cards) out.push(...d.cards.map((item) => `### ${item.title}\n\n${item.explanation}`));
  if (d.columns && d.rows) out.push(`Columns: ${d.columns.join(" | ")}`, ...d.rows.map((row) => `- **${row.label}:** ${row.cells.join(" | ")}`), d.limitations?.length ? `Limitations:\n${lines(d.limitations)}` : "");
  if (d.recommendation_context) {
    const product = products.get(d.product_id);
    out.push(`**${product?.name || d.product_id}**`, d.recommendation_context, d.relevance_reason, d.cta_label ? `CTA: ${d.cta_label}` : `CTA direction: ${d.cta_direction}`);
  }
  if (d.items) out.push(...d.items.map((item) => `### ${item.question}\n\n${item.answer}`));
  if (d.summary) out.push(d.summary, d.next_step);
  if (d.body && Array.isArray(d.body)) out.push(...d.body);
  if (d.body && typeof d.body === "string") out.push(d.body);
  if (d.links) out.push(...d.links.map((item) => `- ${links.get(item.internal_link_id)?.destination_url || item.internal_link_id}: ${item.context}`));
  if (component.media_requirements.length) out.push(`Media requirements:\n${lines(component.media_requirements.map((item) => `${item.kind}: ${item.purpose} (${item.status})`))}`);
  return out.filter(Boolean).join("\n\n");
}

export function renderEditorialDraftMarkdown(page, allowlists) {
  const products = new Map(allowlists.products.map((item) => [item.product_id, item]));
  const links = new Map(allowlists.internal_links.map((item) => [item.link_id, item]));
  return [`# ${page.h1}`, page.introduction_deck, ...page.components.map((item) => renderComponent(item, products, links)), `\n---\nSemantic preview only. WordPress rendering and publication are not authorised.`].join("\n\n");
}
