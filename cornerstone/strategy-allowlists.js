import { stableId } from "../research/core/canonical.js";

const uniqueSorted = (values) => [...new Set(values.filter((value) => typeof value === "string" && value.trim()))].sort((a, b) => a.localeCompare(b, "en"));

export function deriveCornerstoneStrategyAllowlists(packet) {
  if (!packet || packet.artifact_type !== "cornerstone_research_packet") throw new Error("A cornerstone research packet is required to derive strategy allowlists.");
  const evidenceIds = uniqueSorted(packet.evidence.source_references.map((item) => item.evidence_id));
  const products = (packet.streetkingz_relevance.relevant_products || []).map((product) => ({
    product_id: product.subject_id,
    name: product.name,
    url: product.url,
    evidence_ids: uniqueSorted(product.evidence_ids || [])
  })).sort((a, b) => a.product_id.localeCompare(b.product_id, "en"));
  const internalLinks = (packet.streetkingz_relevance.possible_internal_links || []).map((link) => ({
    link_id: stableId("internal_link", { source_url: link.source_page, destination_url: link.destination_page }),
    source_url: link.source_page,
    destination_url: link.destination_page,
    evidence_ids: uniqueSorted(link.evidence_ids || [])
  })).sort((a, b) => a.link_id.localeCompare(b.link_id, "en"));
  const inventoryUrls = uniqueSorted([
    ...(packet.streetkingz_relevance.relevant_categories_pages || []).map((page) => page.url),
    ...internalLinks.flatMap((link) => [link.source_url, link.destination_url])
  ]);
  const inventoryPages = inventoryUrls.map((url) => ({ page_id: stableId("inventory_page", { url }), url }));
  const streetkingzUrls = uniqueSorted([
    packet.identity.proposed_url,
    ...products.map((product) => product.url),
    ...inventoryUrls
  ]);
  return {
    evidence_ids: evidenceIds,
    product_ids: products.map((product) => product.product_id),
    product_names: products.map((product) => product.name),
    products,
    streetkingz_urls: streetkingzUrls,
    internal_link_ids: internalLinks.map((link) => link.link_id),
    internal_link_source_urls: uniqueSorted(internalLinks.map((link) => link.source_url)),
    internal_link_destination_urls: uniqueSorted(internalLinks.map((link) => link.destination_url)),
    internal_links: internalLinks,
    inventory_page_ids: inventoryPages.map((page) => page.page_id),
    inventory_page_urls: inventoryUrls,
    inventory_pages: inventoryPages
  };
}

export function resolveStrategyEntities(strategy, allowlists) {
  const products = new Map(allowlists.products.map((product) => [product.product_id, product]));
  const links = new Map(allowlists.internal_links.map((link) => [link.link_id, link]));
  return {
    ...strategy,
    streetkingz_integration: {
      ...strategy.streetkingz_integration,
      genuinely_relevant_products: strategy.streetkingz_integration.genuinely_relevant_products.map((item) => ({ ...item, canonical_product: products.get(item.product_id) }))
    },
    internal_linking: strategy.internal_linking.map((item) => ({ ...item, canonical_link: links.get(item.link_id) }))
  };
}
