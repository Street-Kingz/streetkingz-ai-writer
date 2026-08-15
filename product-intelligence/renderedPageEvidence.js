import { createSourceEvidence, deduplicateEvidence, normaliseEvidenceText } from "./evidence.js";

function firstMatch(value, pattern) {
  return String(value || "").match(pattern)?.[1] || "";
}

function elements(html, tag) {
  return [...String(html || "").matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, "gi"))]
    .map((match, index) => ({ attributes: match[1], inner: match[2], raw: match[0], text: normaliseEvidenceText(match[0]), index }))
    .filter((item) => item.text);
}

function sectionBlocks(html) {
  const headings = [...String(html || "").matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];
  return headings.map((heading, index) => {
    const end = headings[index + 1]?.index ?? html.length;
    const body = html.slice(heading.index + heading[0].length, end);
    return { heading: normaliseEvidenceText(heading[1]), body, raw: `${heading[0]}${body}` };
  }).filter((section) => section.heading && normaliseEvidenceText(section.body));
}

function excludedGlobalSection(heading) {
  const key = String(heading || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return new Set([
    "you may also like",
    "30 day satisfaction guarantee",
    "fast uk shipping",
    "premium materials no gimmicks",
    "sk detailing ltd",
    "navigate",
    "important links",
    "review cart"
  ]).has(key);
}

function internalLinks(html, sourceUrl) {
  const productStart = html.search(/<h1\b[^>]*class=["'][^"']*\bproduct_title\b/i);
  if (productStart < 0) return [];
  const scoped = html.slice(productStart);
  const host = new URL(sourceUrl).hostname;
  const seen = new Set();
  return [...scoped.matchAll(/<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)].map((match, index) => {
    let destination;
    try { destination = new URL(normaliseEvidenceText(match[2]), sourceUrl); } catch { return null; }
    const label = normaliseEvidenceText(match[4]);
    const attributes = `${match[1]} ${match[3]}`;
    const ui = /add_to_cart|ajax_add_to_cart|elementor-button|cart|account|checkout|cookie/i.test(attributes)
      || /^(add to (?:cart|basket)|buy now|select options|read more|view product|home|shop)$/i.test(label);
    const relevantPath = destination.pathname.startsWith("/product/") || destination.pathname.startsWith("/guides/") || destination.pathname.startsWith("/blog/");
    if (destination.hostname !== host || !relevantPath || destination.href === sourceUrl || !label || ui || seen.has(destination.href)) return null;
    seen.add(destination.href);
    const before = scoped.slice(Math.max(0, match.index - 600), match.index);
    const heading = [...before.matchAll(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/gi)].at(-1);
    const sectionHeading = heading ? normaliseEvidenceText(heading[1]) : null;
    if (excludedGlobalSection(sectionHeading) || /recommended for you/i.test(sectionHeading || "")) return null;
    return { label, destination_url: destination.href, raw: match[0], locator: `product-content a[${index}]`, section_heading: sectionHeading };
  }).filter(Boolean);
}

export function extractRenderedPageEvidence(html, sourceUrl, retrievedAt) {
  if (!String(html || "").trim()) throw new Error("Rendered product page HTML is empty.");
  const records = [];
  const add = (sourceField, rawValue, context, normalisedValue) => {
    if (!normaliseEvidenceText(rawValue)) return;
    records.push(createSourceEvidence({ sourceType: "rendered_product_page", sourceUriOrLocation: sourceUrl, sourceField, rawValue, normalisedValue, retrievedAt, context }));
  };

  const title = firstMatch(html, /<h1\b[^>]*class=["'][^"']*\bproduct_title\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
  if (!title) throw new Error("Rendered page does not contain a product title.");
  add("product.name", title, { locator: "h1.product_title", comparable_field: "product.name" });
  const price = firstMatch(html, /<p\b[^>]*class=["'][^"']*\bprice\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  add("commercial.price", price, { locator: "p.price", comparable_field: "commercial.price" });
  const shortDescription = firstMatch(html, /<div\b[^>]*class=["'][^"']*woocommerce-product-details__short-description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  add("content.short_description", shortDescription, { locator: "div.woocommerce-product-details__short-description" });

  for (const section of sectionBlocks(html)) {
    if (/frequently asked|faq/i.test(section.heading) || excludedGlobalSection(section.heading)) continue;
    add(`content.section.${section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`, section.raw, { locator: `section[h2=${JSON.stringify(section.heading)}]`, heading: section.heading });
    if (/tech specs|specifications/i.test(section.heading)) {
      const pattern = /<strong\b[^>]*>\s*[•]?\s*([^:<]+):\s*<\/strong>\s*([\s\S]*?)(?=<br\b|<strong\b|<\/p>)/gi;
      for (const match of section.body.matchAll(pattern)) {
        const attribute = normaliseEvidenceText(match[1]);
        const normalisedValue = normaliseEvidenceText(match[2]);
        if (!attribute || !normalisedValue) continue;
        records.push(createSourceEvidence({
          sourceType: "rendered_product_page", sourceUriOrLocation: sourceUrl,
          sourceField: `specification.${attribute.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
          rawValue: match[0], normalisedValue, retrievedAt,
          context: { locator: `section[h2=${JSON.stringify(section.heading)}] strong[${attribute}]`, attribute, comparable_field: `specification.${attribute.toLowerCase().replace(/[^a-z0-9]+/g, "_")}` }
        }));
      }
    }
  }

  for (const detail of elements(html, "details")) {
    const questionRaw = firstMatch(detail.raw, /<summary\b[^>]*>([\s\S]*?)<\/summary>/i);
    const question = normaliseEvidenceText(questionRaw);
    const answer = elements(detail.raw, "p").map((item) => item.text).join(" ").trim();
    if (!question || !answer) continue;
    records.push(createSourceEvidence({
      sourceType: "faq", sourceUriOrLocation: sourceUrl, sourceField: "faq.item",
      rawValue: detail.raw, normalisedValue: { question, answer }, retrievedAt,
      context: { locator: `details[${detail.index}]`, question, answer }
    }));
  }

  for (const link of internalLinks(html, sourceUrl)) {
    records.push(createSourceEvidence({
      sourceType: "internal_link", sourceUriOrLocation: sourceUrl, sourceField: "internal_link",
      rawValue: link.raw, normalisedValue: { label: link.label, destination_url: link.destination_url }, retrievedAt,
      context: { locator: link.locator, section_heading: link.section_heading }
    }));
  }
  return deduplicateEvidence(records);
}

export function extractStreetKingzProductPostId(html) {
  const value = String(html || "").match(/\bpostid-(\d+)\b/i)?.[1];
  const postId = Number(value);
  if (!Number.isInteger(postId) || postId <= 0) throw new Error("Rendered page did not expose a WordPress product post ID.");
  return postId;
}
