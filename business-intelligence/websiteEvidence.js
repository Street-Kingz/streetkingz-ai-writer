import { createBusinessSourceEvidence } from "./evidence.js";

const ENTITY_MAP = Object.freeze({ amp: "&", quot: '"', apos: "'", nbsp: " ", pound: "£", lt: "<", gt: ">" });

export function normaliseBusinessEvidenceText(value) {
  return String(value ?? "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity) => {
      if (entity[0] === "#") {
        const radix = entity[1]?.toLowerCase() === "x" ? 16 : 10;
        const number = Number.parseInt(entity.slice(radix === 16 ? 2 : 1), radix);
        return Number.isFinite(number) ? String.fromCodePoint(number) : _;
      }
      return ENTITY_MAP[entity.toLowerCase()] ?? `&${entity};`;
    })
    .replace(/\s+/g, " ").trim();
}

function attributes(raw = "") {
  return Object.fromEntries([...raw.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map((match) => [match[1].toLowerCase(), match[3]]));
}

function blocks(html, tagPattern) {
  return [...String(html).matchAll(new RegExp(`<(${tagPattern})\\b([^>]*)>([\\s\\S]*?)<\\/\\1>`, "gi"))]
    .map((match, index) => ({ tag: match[1].toLowerCase(), attrs: attributes(match[2]), raw: match[0], inner: match[3], text: normaliseBusinessEvidenceText(match[3]), index }))
    .filter((item) => item.text);
}

function withoutBoilerplate(html) {
  return String(html || "")
    .replace(/<(script|style|noscript|svg|footer)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+(?:id|class)=["'][^"']*(?:cookie|consent|newsletter|modal|popup)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, " ");
}

function canonicalUrl(href, sourceUrl) {
  try {
    const url = new URL(normaliseBusinessEvidenceText(href), sourceUrl);
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch { return null; }
}

export function extractLinks(html, sourceUrl, { navigationOnly = false } = {}) {
  const scope = navigationOnly
    ? [...String(html).matchAll(/<(nav|header)\b[^>]*>[\s\S]*?<\/\1>/gi)].map((match) => match[0]).join("\n")
    : withoutBoilerplate(html);
  const seen = new Set();
  return [...scope.matchAll(/<a\b([^>]*)href\s*=\s*(["'])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/gi)].map((match, index) => {
    const url = canonicalUrl(match[3], sourceUrl);
    const label = normaliseBusinessEvidenceText(match[5]);
    if (!url || !label || seen.has(`${url}\n${label}`)) return null;
    seen.add(`${url}\n${label}`);
    return { url, label, raw: match[0], locator: `${navigationOnly ? "navigation" : "content"} a[${index}]` };
  }).filter(Boolean);
}

function classifyStatement(text) {
  return /\b(?:trusted by|chosen by|designed for|made for|built for|intended for)\b/i.test(text)
    ? "customer_claim" : "positioning_claim";
}

function add(records, { sourceType, sourceUrl, sourceRole, sourceField, rawValue, normalisedValue, retrievedAt, claimClassification, context }) {
  if (normalisedValue === "" || normalisedValue === undefined) return;
  records.push(createBusinessSourceEvidence({ sourceType, sourceUriOrLocation: sourceUrl, sourceRole, sourceField, rawValue, normalisedValue, retrievedAt, claimClassification, context }));
}

function mainContent(html) {
  const main = String(html).match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  return withoutBoilerplate(main || html)
    .replace(/<(nav|header|aside)\b[\s\S]*?<\/\1>/gi, " ");
}

export function extractBusinessPageEvidence({ html, url, pageType, retrievedAt }) {
  if (!String(html || "").trim()) throw new Error(`Empty HTML returned for ${url}.`);
  const records = [];
  const sourceRole = ["navigation"].includes(pageType) ? "observed_structure" : "business_statement";
  const title = blocks(html, "title")[0];
  if (title) add(records, { sourceType: pageType, sourceUrl: url, sourceRole, sourceField: "page.title", rawValue: title.inner, normalisedValue: title.text, retrievedAt, claimClassification: "observed_fact", context: { locator: "title", page_type: pageType } });

  const content = mainContent(html);
  for (const item of blocks(content, "h1|h2|h3|p|li").slice(0, 40)) {
    if (item.text.length < 3 || /^(skip to content|log in|my account|basket|cart|cookie settings)$/i.test(item.text)) continue;
    const kind = /^h/.test(item.tag) ? "heading" : item.tag === "li" ? "list_item" : "statement";
    add(records, { sourceType: pageType, sourceUrl: url, sourceRole, sourceField: `page.${kind}`,
      rawValue: item.inner, normalisedValue: item.text, retrievedAt,
      claimClassification: classifyStatement(item.text), context: { locator: `${item.tag}[${item.index}]`, page_type: pageType } });
  }

  for (const detail of blocks(content, "details")) {
    const questionRaw = detail.inner.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1];
    const question = normaliseBusinessEvidenceText(questionRaw);
    const answerHtml = detail.inner.replace(/<summary\b[^>]*>[\s\S]*?<\/summary>/i, " ");
    const answer = normaliseBusinessEvidenceText(answerHtml);
    if (!question || !answer) continue;
    add(records, { sourceType: "faq", sourceUrl: url, sourceRole: "business_statement", sourceField: "faq.item", rawValue: detail.raw,
      normalisedValue: { question, answer }, retrievedAt, claimClassification: "customer_claim", context: { locator: `details[${detail.index}]`, page_type: pageType } });
  }
  return records;
}

export function extractNavigationEvidence(html, url, retrievedAt) {
  return extractLinks(html, url, { navigationOnly: true }).map((link) => createBusinessSourceEvidence({
    sourceType: "navigation", sourceUriOrLocation: url, sourceRole: "observed_structure", sourceField: "navigation.link",
    rawValue: link.raw, normalisedValue: { label: link.label, destination_url: link.url }, retrievedAt,
    claimClassification: "observed_fact", context: { locator: link.locator }
  }));
}

export function extractProductCandidates(html, categoryUrl) {
  const host = new URL(categoryUrl).hostname;
  const seen = new Set();
  return extractLinks(html, categoryUrl).filter((link) => {
    const url = new URL(link.url);
    if (url.hostname !== host || !/\/product\//i.test(url.pathname) || seen.has(url.href)) return false;
    seen.add(url.href);
    return true;
  });
}
