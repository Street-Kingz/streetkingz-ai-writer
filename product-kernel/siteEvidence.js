import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { sha256 } from "../research/core/canonical.js";
import { ProductError } from "./errors.js";

export const SITE_EVIDENCE_VERSION = "1.0.0";
export const SITE_SOURCE_VERSION = "v1-04-slice-c";
export const SITE_LIMITS = Object.freeze({
  MAX_DISCOVERED_URLS: 500,
  MAX_INSPECTED_PAGES: 100,
  MAX_SITEMAP_DOCUMENTS: 20,
  MAX_URLS_PER_SITEMAP: 1000,
  MAX_LINKS_EXTRACTED_PER_PAGE: 100,
  MAX_LINK_FRONTIER_DEPTH: 2,
  MAX_REDIRECTS: 3,
  MAX_HTML_RESPONSE_BYTES: 1024 * 1024,
  MAX_SITEMAP_RESPONSE_BYTES: 2 * 1024 * 1024,
  MAX_ROBOTS_RESPONSE_BYTES: 256 * 1024,
  MAX_CONCURRENCY: 2,
  REQUEST_TIMEOUT_MS: 15000,
  TOTAL_RUN_DEADLINE_MS: 120000
});

const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const UNSAFE_PATH = /\/(?:cart|basket|checkout|my-account|account|logout|wp-admin)(?:\/|$)/i;
const TRACKING_PARAMETER = /^(?:utm_|fbclid|gclid)$/i;
const PUBLIC_RANGES = new Set(["unspecified", "broadcast", "multicast", "linkLocalMulticast", "linkLocal", "loopback", "private", "reserved", "uniqueLocal"]);

function fail(code, message, status = 502) { return new ProductError(code, message, status); }
function finite(value) { return Number.isFinite(value); }
function decodeHtml(value) {
  return String(value ?? "").replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|nbsp|lt|gt);/gi, (_, entity) => {
    const lower = entity.toLowerCase();
    if (lower === "amp") return "&";
    if (lower === "quot") return '"';
    if (lower === "apos") return "'";
    if (lower === "nbsp") return " ";
    if (lower === "lt") return "<";
    if (lower === "gt") return ">";
    const number = Number.parseInt(lower.startsWith("#x") ? lower.slice(2) : lower.slice(1), lower.startsWith("#x") ? 16 : 10);
    return Number.isSafeInteger(number) ? String.fromCodePoint(number) : _;
  });
}
function text(value) { return decodeHtml(String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()); }
function attrs(raw = "") { return Object.fromEntries([...raw.matchAll(/([\w:-]+)\s*=\s*(?:(["'])([\s\S]*?)\2|([^\s>]+))/g)].map(m => [m[1].toLowerCase(), decodeHtml(m[3] ?? m[4])])); }
function blocks(html, tag) { return [...String(html).matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi"))]; }
function safeUrl(value, base) { try { const u = new URL(value, base); if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return null; u.hash = ""; return u; } catch { return null; } }

export function siteBoundary(value) {
  const url = safeUrl(value);
  if (!url || url.protocol !== "https:" || !url.hostname || url.username || url.password) throw fail("SITE_BOUNDARY_INVALID", "The site boundary is invalid.", 400);
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/+/g, "/") || "/";
  return url;
}

export function urlWithinBoundary(value, boundary, { allowHttp = false } = {}) {
  const base = boundary instanceof URL ? boundary : siteBoundary(boundary);
  const url = safeUrl(value, base.href);
  if (!url || (!allowHttp && url.protocol !== base.protocol) || url.hostname.toLowerCase() !== base.hostname.toLowerCase() || (url.port || "") !== (base.port || "")) return false;
  const root = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  return url.pathname === base.pathname || url.pathname.startsWith(root);
}

export function normalizeSiteUrl(value, boundary) {
  const url = safeUrl(value, boundary);
  if (!url || !urlWithinBoundary(url, boundary)) return null;
  for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAMETER.test(key)) url.searchParams.delete(key);
  url.hash = "";
  return url.href;
}

export async function assertPublicDns(hostname, { lookup = dns.lookup } = {}) {
  const answers = await lookup(hostname, { all: true, verbatim: true });
  if (!Array.isArray(answers) || !answers.length) throw fail("SITE_DNS_UNAVAILABLE", "The site destination could not be resolved.", 502);
  for (const answer of answers) {
    const address = answer?.address;
    if (typeof address !== "string" || !ipaddr.isValid(address)) throw fail("SITE_DNS_INVALID", "The site destination returned an invalid address.", 502);
    const parsed = ipaddr.parse(address);
    if (PUBLIC_RANGES.has(parsed.range())) throw fail("SITE_PRIVATE_DESTINATION", "The site destination is not public.", 403);
  }
  return answers;
}

async function readBounded(response, limit) {
  if (!response?.body?.getReader) throw fail("SITE_PROVIDER_MALFORMED", "The site returned an invalid response.");
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > limit) { await reader.cancel(); throw fail("SITE_RESPONSE_TOO_LARGE", "The site response exceeded the bounded limit."); }
    chunks.push(part.value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export function createSiteTransport({ fetchImpl = globalThis.fetch, lookup = dns.lookup, clock = () => new Date(), limits = SITE_LIMITS } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("A site fetch implementation is required.");
  return {
    limits,
    async fetch(url, { boundary, purpose = "page", method = "GET" } = {}) {
      const base = boundary instanceof URL ? boundary : siteBoundary(boundary);
      let current = safeUrl(url, base.href); if (!current || !urlWithinBoundary(current, base)) throw fail("SITE_BOUNDARY_INVALID", "The requested site URL is outside the Business boundary.", 403);
      let redirects = 0;
      while (true) {
        if (current.protocol !== base.protocol) throw fail("SITE_REDIRECT_UNSAFE", "The site redirect changed protocol.", 403);
        await assertPublicDns(current.hostname, { lookup });
        const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), limits.REQUEST_TIMEOUT_MS);
        let response;
        try { response = await fetchImpl(current.href, { method, redirect: "manual", signal: controller.signal, headers: { accept: purpose === "sitemap" || purpose === "robots" ? "text/plain, application/xml, text/xml, */*" : "text/html" } }); }
        catch (error) { if (error?.name === "AbortError") throw fail("SITE_TIMEOUT", "The site request timed out."); throw fail("SITE_FETCH_FAILED", "The site request failed."); }
        finally { clearTimeout(timer); }
        if (REDIRECTS.has(response.status)) {
          if (++redirects > limits.MAX_REDIRECTS) throw fail("SITE_REDIRECT_LIMIT", "The site redirect limit was reached.");
          const location = response.headers?.get?.("location"); const next = safeUrl(location, current.href);
          if (!next || !urlWithinBoundary(next, base) || next.protocol !== base.protocol) throw fail("SITE_REDIRECT_UNSAFE", "The site redirect left the Business boundary.", 403);
          current = next; continue;
        }
        const limit = purpose === "robots" ? limits.MAX_ROBOTS_RESPONSE_BYTES : purpose === "sitemap" ? limits.MAX_SITEMAP_RESPONSE_BYTES : limits.MAX_HTML_RESPONSE_BYTES;
        const body = await readBounded(response, limit);
        return { requested_url: url, final_url: current.href, status: response.status, headers: response.headers, content_type: response.headers?.get?.("content-type") || "", body, retrieved_at: clock().toISOString(), response_size_bytes: Buffer.byteLength(body), redirect_count: redirects, method };
      }
    }
  };
}

let siteTransportFactory = options => createSiteTransport(options);
export function setSiteEvidenceTransportFactory(factory) { siteTransportFactory = factory || (options => createSiteTransport(options)); }
export function siteEvidenceTransport(options) { return siteTransportFactory(options); }

function robotsRules(body) {
  const groups = []; let group = null;
  for (const raw of String(body || "").split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim(); if (!line) continue;
    const [key, ...rest] = line.split(":"); const value = rest.join(":").trim();
    if (/^user-agent$/i.test(key)) { if (!group || group.rules.length) { group = { agents: [], rules: [], sitemaps: [] }; groups.push(group); } group.agents.push(value.toLowerCase()); }
    else if (/^(allow|disallow)$/i.test(key) && group) group.rules.push({ allow: /^allow$/i.test(key), path: value });
    else if (/^sitemap$/i.test(key)) group?.sitemaps.push(value);
  }
  return groups;
}
export function parseRobots(body, boundary) {
  const groups = robotsRules(body); const sitemapUrls = groups.flatMap(g => g.sitemaps).map(value => normalizeSiteUrl(value, boundary)).filter(Boolean);
  const applicable = groups.filter(g => g.agents.includes("*") || g.agents.some(a => a === "streetkingzsiteevidence"));
  return { sitemap_urls: [...new Set(sitemapUrls)], allowed(url) { const pathname = new URL(url).pathname; const rules = applicable.flatMap(g => g.rules).filter(rule => rule.path); let winner = null; for (const rule of rules) if (pathname.startsWith(rule.path) && (!winner || rule.path.length >= winner.path.length)) winner = rule; return winner ? winner.allow : true; } };
}

export function parseSitemap(body, boundary, limit = SITE_LIMITS.MAX_URLS_PER_SITEMAP) {
  if (typeof body !== "string" || !/<(?:urlset|sitemapindex)\b/i.test(body)) throw fail("SITE_SITEMAP_MALFORMED", "The sitemap document was malformed.");
  const kind = /<sitemapindex\b/i.test(body) ? "index" : "urlset";
  const locs = [...body.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map(m => text(m[1])).filter(Boolean);
  if (locs.length > limit) throw fail("SITE_SITEMAP_CAP", "The sitemap URL limit was reached.");
  return { kind, urls: [...new Set(locs.map(value => normalizeSiteUrl(value, boundary)).filter(Boolean))], rejected: locs.length - locs.map(value => normalizeSiteUrl(value, boundary)).filter(Boolean).length };
}

function linksFromHtml(html, sourceUrl, boundary, limit) {
  const result = []; let rejected = 0;
  for (const match of String(html).matchAll(/<a\b([^>]*)href\s*=\s*(["'])(.*?)\2[^>]*>/gi)) {
    if (result.length >= limit) break;
    const raw = match[3]; const url = safeUrl(raw, sourceUrl);
    if (!url || !urlWithinBoundary(url, boundary) || UNSAFE_PATH.test(url.pathname) || [...url.searchParams.keys()].some(key => !TRACKING_PARAMETER.test(key))) { rejected++; continue; }
    const normalized = normalizeSiteUrl(url.href, boundary); if (normalized && !result.includes(normalized)) result.push(normalized);
  }
  return { urls: result, rejected };
}

function extractPageTruth(response, { boundary, requestedUrl, relation, pageType }) {
  const contentType = response.content_type.toLowerCase(); const isHtml = contentType.includes("text/html") || /^\s*<(?:!doctype\s+html|html\b)/i.test(response.body);
  const common = { requested_url: requestedUrl, final_url: response.final_url, http_status: response.status, content_type: response.content_type || null, retrieved_at: response.retrieved_at, response_size_bytes: response.response_size_bytes, page_type: pageType || "unknown", source_relation: relation || null, limitation: null };
  if (!isHtml) return { ...common, status: "non_html", robots_allowed: null, meta_noindex: null, x_robots_noindex: /(?:^|,)\s*noindex(?:\s|,|$)/i.test(response.headers?.get?.("x-robots-tag") || ""), canonical_state: "absent", title: null, meta_description: null, h1: [], headings: [], internal_links: [] };
  const html = response.body;
  const title = text(blocks(html, "title")[0]?.[1]).slice(0, 500) || null;
  const metas = [...html.matchAll(/<meta\b([^>]*)>/gi)].map(m => attrs(m[1]));
  const description = metas.find(m => m.name?.toLowerCase() === "description")?.content?.slice(0, 2000) || null;
  const robots = metas.find(m => m.name?.toLowerCase() === "robots")?.content || null;
  const canonicalRaw = [...html.matchAll(/<link\b([^>]*)>/gi)].map(m => attrs(m[1])).find(m => m.rel?.toLowerCase().split(/\s+/).includes("canonical"))?.href || null;
  const canonicalResolved = canonicalRaw ? safeUrl(canonicalRaw, response.final_url)?.href || null : null;
  const canonicalState = !canonicalRaw ? "absent" : !canonicalResolved ? "invalid" : urlWithinBoundary(canonicalResolved, boundary) ? "same_boundary" : "external";
  const h1 = blocks(html, "h1").map(m => text(m[1]).slice(0, 500)).filter(Boolean).slice(0, 10);
  const headings = ["h2", "h3"].flatMap(tag => blocks(html, tag).map(m => text(m[1]).slice(0, 500)).filter(Boolean)).slice(0, 30);
  const internal = linksFromHtml(html, response.final_url, boundary, SITE_LIMITS.MAX_LINKS_EXTRACTED_PER_PAGE);
  const xRobots = response.headers?.get?.("x-robots-tag") || null;
  return { ...common, status: response.status >= 200 && response.status < 300 ? "inspected" : response.status === 404 || response.status === 410 ? "observed_absent" : "http_error", robots_allowed: robotsRules("User-agent: *").length >= 0, meta_noindex: /(?:^|[\s,])noindex(?:[\s,]|$)/i.test(robots), x_robots_noindex: /(?:^|,)\s*noindex(?:\s|,|$)/i.test(xRobots || ""), canonical_raw: canonicalRaw, canonical_resolved: canonicalResolved, canonical_state: canonicalState, title, meta_description: description, h1, headings, internal_links: internal.urls, link_rejections: internal.rejected, page_type: pageType || "unknown", source_relation: relation || null, limitation: internal.rejected ? "bounded_link_filtering" : null };
}

function classify(url, boundary, relation) { if (url === boundary.href) return "homepage"; if (relation?.kind === "product") return "product"; if (relation?.kind === "category") return "category"; return /\/(?:blog|guide|news|article)(?:\/|$)/i.test(new URL(url).pathname) ? "content" : "unknown"; }

export async function acquireSiteEvidence({ boundary, transport, products = [], categories = [], now = () => new Date(), limits = SITE_LIMITS } = {}) {
  const base = siteBoundary(boundary); const started = Date.now(); const limitations = []; const discovered = new Map(); const pages = []; let robotsResult = { status: "not_fetched", sitemap_urls: [], allowed: () => true }; let sitemapDocuments = 0; let sitemapUrls = 0; let frontierDepth = new Map([[base.href, 0]]); let frontier = [];
  const add = (url, source, parent = null, relation = null, depth = 0) => { if (!urlWithinBoundary(url, base) || UNSAFE_PATH.test(new URL(url).pathname)) return false; const normalized = normalizeSiteUrl(url, base); if (!normalized) return false; if (discovered.has(normalized)) return false; if (discovered.size >= limits.MAX_DISCOVERED_URLS) { if (!limitations.includes("discovered_url_cap")) limitations.push("discovered_url_cap"); return false; } discovered.set(normalized, { url: normalized, discovery_source: source, discovery_parent_url: parent, relation, depth }); return true; };
  add(base.href, "verified_homepage");
  for (const product of products) if (typeof product?.canonical_url === "string") add(product.canonical_url, "woo_product", null, { kind: "product", id: product.id, source_id: product.source_id });
  for (const category of categories) if (typeof category?.canonical_url === "string") add(category.canonical_url, "woo_category", null, { kind: "category", id: category.id, source_id: category.source_id });
  try { const robots = await transport.fetch(new URL("robots.txt", base).href, { boundary: base, purpose: "robots" }); robotsResult = parseRobots(robots.body, base); robotsResult.status = robots.status; if (robots.status >= 400) robotsResult.allowed = () => true; } catch (error) { robotsResult = { status: error.code || "unavailable", sitemap_urls: [], allowed: () => true }; limitations.push(error.code || "robots_unavailable"); }
  const sitemapQueue = [...new Set([...robotsResult.sitemap_urls, new URL("sitemap.xml", base).href])];
  for (const sitemapUrl of sitemapQueue) {
    if (Date.now() - started > limits.TOTAL_RUN_DEADLINE_MS || sitemapDocuments >= limits.MAX_SITEMAP_DOCUMENTS) { limitations.push("sitemap_cap_or_deadline"); break; }
    try { const doc = await transport.fetch(sitemapUrl, { boundary: base, purpose: "sitemap" }); sitemapDocuments++; const parsed = parseSitemap(doc.body, base, limits.MAX_URLS_PER_SITEMAP); for (const url of parsed.urls) { if (add(url, "sitemap", sitemapUrl)) sitemapUrls++; } if (parsed.kind === "index") for (const child of parsed.urls.slice(0, limits.MAX_SITEMAP_DOCUMENTS - sitemapDocuments)) { try { const childDoc = await transport.fetch(child, { boundary: base, purpose: "sitemap" }); sitemapDocuments++; const childParsed = parseSitemap(childDoc.body, base, limits.MAX_URLS_PER_SITEMAP); for (const url of childParsed.urls) if (add(url, "sitemap", child)) sitemapUrls++; } catch { limitations.push("sitemap_child_unavailable"); } } } catch (error) { limitations.push(error.code || "sitemap_unavailable"); }
  }
  const inspect = async descriptor => {
    if (pages.length >= limits.MAX_INSPECTED_PAGES) { if (!limitations.includes("inspected_page_cap")) limitations.push("inspected_page_cap"); return; }
    if (Date.now() - started > limits.TOTAL_RUN_DEADLINE_MS) { if (!limitations.includes("run_deadline")) limitations.push("run_deadline"); return; }
    const allowed = robotsResult.allowed(descriptor.url); descriptor.robots_allowed = allowed; if (!allowed) { descriptor.inspection_status = "robots_disallowed"; descriptor.reason_not_inspected = "robots_disallowed"; pages.push({ descriptor, page: null }); return; }
    try { const response = await transport.fetch(descriptor.url, { boundary: base, purpose: "page" }); const relation = descriptor.relation; const page = extractPageTruth(response, { boundary: base, requestedUrl: descriptor.url, relation, pageType: classify(descriptor.url, base, relation) }); descriptor.inspection_status = page.status; descriptor.inspected_at = response.retrieved_at; pages.push({ descriptor, page }); if (page.internal_links?.length && descriptor.depth < limits.MAX_LINK_FRONTIER_DEPTH) for (const link of page.internal_links) { add(link, "link_frontier", descriptor.url, null, descriptor.depth + 1); frontierDepth.set(link, descriptor.depth + 1); } } catch (error) { descriptor.inspection_status = "fetch_failed"; descriptor.reason_not_inspected = error.code || "site_fetch_failed"; pages.push({ descriptor, page: { requested_url: descriptor.url, final_url: null, http_status: null, status: "fetch_failed", page_type: classify(descriptor.url, base, descriptor.relation), limitation: error.code || "site_fetch_failed", retrieved_at: now().toISOString(), source_relation: descriptor.relation || null } }); }
  };
  const priority = [...discovered.values()].sort((a, b) => (a.url === base.href ? -1 : b.url === base.href ? 1 : (a.discovery_source === "woo_product" || a.discovery_source === "woo_category" ? -1 : 0)));
  for (const descriptor of priority) await inspect(descriptor);
  frontier = [...discovered.values()].filter(d => d.discovery_source === "link_frontier" && !pages.some(p => p.descriptor.url === d.url)).sort((a, b) => a.depth - b.depth);
  for (const descriptor of frontier) await inspect(descriptor);
  const successfulPages = pages.filter(p => p.page?.status === "inspected");
  const materialLimit = limitations.length > 0 || pages.some(p => p.page?.status === "fetch_failed");
  const completeness = successfulPages.length === 0 ? "failed" : materialLimit ? "partial" : "complete";
  return { boundary: base.href, discovered: [...discovered.values()], pages, sitemap_documents: sitemapDocuments, sitemap_urls: sitemapUrls, robots: { status: robotsResult.status, sitemap_count: robotsResult.sitemap_urls.length }, limitations: [...new Set(limitations)], completeness, evidence_as_of: successfulPages.length ? new Date(Math.max(...successfulPages.map(p => Date.parse(p.page.retrieved_at)))).toISOString() : null, stats: { homepage_attempts: pages.filter(p => p.descriptor.url === base.href).length, inspected_pages: pages.length, successful_html: successfulPages.filter(p => p.page.content_type?.includes("html") || p.page.title !== undefined).length, robots_disallowed: pages.filter(p => p.descriptor.inspection_status === "robots_disallowed").length, fetch_failures: pages.filter(p => p.descriptor.inspection_status === "fetch_failed").length, non_html: pages.filter(p => p.page?.status === "non_html").length, foreign_rejected: 0, private_rejected: 0, cap_hits: limitations.filter(x => /cap|deadline/.test(x)) } };
}

export { extractPageTruth };
