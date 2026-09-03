import test from "node:test";
import assert from "node:assert/strict";
import { createSiteTransport, acquireSiteEvidence, parseRobots, parseSitemap, siteBoundary, urlWithinBoundary, assertPublicDns, SITE_LIMITS } from "../product-kernel/siteEvidence.js";

const boundary = siteBoundary("https://example.test/");
const response = (body, { status = 200, type = "text/html", location = null } = {}) => {
  const headers = new Headers({ "content-type": type }); if (location) headers.set("location", location);
  return new Response(body, { status, headers });
};
const dnsPublic = async () => [{ address: "93.184.216.34", family: 4 }];

test("Slice C discovers in fixed priority, keeps discovered separate from inspected, and extracts direct page truth", async () => {
  const seen = [];
  const transport = createSiteTransport({ lookup: dnsPublic, fetchImpl: async (url) => {
    seen.push(url);
    if (url.endsWith("robots.txt")) return response("User-agent: *\nSitemap: https://example.test/sitemap.xml\nDisallow: /private");
    if (url.endsWith("sitemap.xml")) return response("<urlset><url><loc>https://example.test/sitemap-page</loc></url><url><loc>https://external.test/no</loc></url></urlset>", { type: "application/xml" });
    if (url.endsWith("/")) return response("<!doctype html><title>Home</title><meta name=description content=Desc><link rel=canonical href=\"/\"><h1>Welcome</h1><h2>Heading</h2><a href=\"/private\">Private</a><a href=\"/sitemap-page#fragment\">Page</a>");
    return response("<title>Page</title><meta name=robots content=\"noindex\"><h1>Page</h1>");
  } });
  const result = await acquireSiteEvidence({ boundary, transport, products: [{ id: "p1", source_id: 1, canonical_url: "https://example.test/product-one/" }] });
  assert.equal(result.completeness, "complete");
  assert.equal(result.discovered[0].discovery_source, "verified_homepage");
  assert.equal(result.discovered.some(item => item.discovery_source === "woo_product"), true);
  assert.equal(result.pages.length >= 2, true);
  const home = result.pages.find(item => item.descriptor.url === "https://example.test/").page;
  assert.equal(home.title, "Home"); assert.deepEqual(home.h1, ["Welcome"]); assert.equal(home.canonical_state, "same_boundary");
  assert.equal(seen[0], "https://example.test/robots.txt");
  assert.equal(result.pages.some(item => item.descriptor.url.includes("private") && item.descriptor.inspection_status !== "robots_disallowed"), false);
});

test("robots and sitemaps are bounded, same-site, and honest about malformed input", () => {
  const robots = parseRobots("User-agent: *\nDisallow: /private\nSitemap: https://example.test/sitemap.xml\nSitemap: https://evil.test/x", boundary);
  assert.equal(robots.allowed("https://example.test/private/x"), false);
  assert.equal(robots.allowed("https://example.test/public"), true);
  assert.deepEqual(robots.sitemap_urls, ["https://example.test/sitemap.xml"]);
  const parsed = parseSitemap("<urlset><url><loc>https://example.test/a</loc></url><url><loc>https://evil.test/b</loc></url></urlset>", boundary);
  assert.deepEqual(parsed.urls, ["https://example.test/a"]); assert.equal(parsed.rejected, 1);
  assert.throws(() => parseSitemap("not xml", boundary), error => error.code === "SITE_SITEMAP_MALFORMED");
});

test("transport enforces exact boundary, bounded redirects, and safe schemes", async () => {
  const calls = [];
  const transport = createSiteTransport({ lookup: dnsPublic, fetchImpl: async (url) => { calls.push(url); return response("", { status: 302, location: "https://evil.test/" }); } });
  await assert.rejects(() => transport.fetch("https://example.test/", { boundary }), error => error.code === "SITE_REDIRECT_UNSAFE");
  assert.equal(calls.length, 1);
  assert.equal(urlWithinBoundary("http://example.test/", boundary), false);
  assert.equal(urlWithinBoundary("https://sub.example.test/", boundary), false);
  assert.equal(urlWithinBoundary("file:///tmp/x", boundary), false);
});

test("transport revalidates every redirect destination and bounds redirect loops, timeouts and bodies", async () => {
  let redirects = 0; const loop = createSiteTransport({ lookup: dnsPublic, limits: { ...SITE_LIMITS, MAX_REDIRECTS: 2 }, fetchImpl: async () => { redirects++; return response("", { status: 302, location: "/loop" }); } });
  await assert.rejects(() => loop.fetch(boundary.href, { boundary }), error => error.code === "SITE_REDIRECT_LIMIT"); assert.equal(redirects, 3);
  const timeout = createSiteTransport({ lookup: dnsPublic, fetchImpl: async () => { throw Object.assign(new Error("aborted"), { name: "AbortError" }); } });
  await assert.rejects(() => timeout.fetch(boundary.href, { boundary }), error => error.code === "SITE_TIMEOUT");
  const oversized = createSiteTransport({ lookup: dnsPublic, limits: { ...SITE_LIMITS, MAX_HTML_RESPONSE_BYTES: 4 }, fetchImpl: async () => response("12345") });
  await assert.rejects(() => oversized.fetch(boundary.href, { boundary }), error => error.code === "SITE_RESPONSE_TOO_LARGE");
  let dnsCalls = 0; const rebinding = createSiteTransport({ lookup: async () => [{ address: ++dnsCalls === 1 ? "93.184.216.34" : "10.0.0.1", family: 4 }], fetchImpl: async () => response("", { status: 302, location: "/next" }) });
  await assert.rejects(() => rebinding.fetch(boundary.href, { boundary }), error => error.code === "SITE_PRIVATE_DESTINATION");
});

test("DNS validation blocks loopback/private/link-local destinations and accepts public answers", async () => {
  await assert.rejects(() => assertPublicDns("internal.test", { lookup: async () => [{ address: "127.0.0.1", family: 4 }] }), error => error.code === "SITE_PRIVATE_DESTINATION");
  await assert.rejects(() => assertPublicDns("internal.test", { lookup: async () => [{ address: "fd00::1", family: 6 }] }), error => error.code === "SITE_PRIVATE_DESTINATION");
  await assert.doesNotReject(() => assertPublicDns("public.test", { lookup: dnsPublic }));
});

test("caps produce truthful partial runs and no unbounded frontier", async () => {
  const transport = createSiteTransport({ lookup: dnsPublic, limits: { ...SITE_LIMITS, MAX_DISCOVERED_URLS: 2, MAX_INSPECTED_PAGES: 1 }, fetchImpl: async (url) => url.endsWith("robots.txt") ? response("") : response("<a href=\"/a\">A</a><a href=\"/b\">B</a>") });
  const result = await acquireSiteEvidence({ boundary, transport, limits: transport.limits, products: [{ id: "p1", source_id: 1, canonical_url: "https://example.test/p1" }, { id: "p2", source_id: 2, canonical_url: "https://example.test/p2" }, { id: "p3", source_id: 3, canonical_url: "https://example.test/p3" }] });
  assert.equal(result.completeness, "partial"); assert.equal(result.limitations.includes("discovered_url_cap"), true); assert.equal(result.pages.length, 1);
});

test("page truth distinguishes canonical and indexability declarations without Google claims", async () => {
  const transport = createSiteTransport({ lookup: dnsPublic, fetchImpl: async (url) => url.endsWith("robots.txt") ? response("") : response("<title>T</title><meta name=robots content=\"noindex,nofollow\"><meta name=description content=\"D\"><link rel=canonical href=\"https://evil.test/x\"><h1>A</h1><h1>B</h1>") });
  const result = await acquireSiteEvidence({ boundary, transport }); const page = result.pages.find(item => item.descriptor.url === boundary.href).page;
  assert.equal(page.canonical_state, "external"); assert.equal(page.meta_noindex, true); assert.deepEqual(page.h1, ["A", "B"]); assert.equal(Object.hasOwn(page, "google_indexed"), false);
});

test("non-HTML responses remain bounded retrieval facts without HTML claims", async () => {
  const transport = createSiteTransport({ lookup: dnsPublic, fetchImpl: async () => response("%PDF", { type: "application/pdf" }) });
  const result = await acquireSiteEvidence({ boundary, transport }); const page = result.pages.find(item => item.descriptor.url === boundary.href).page;
  assert.equal(page.status, "non_html"); assert.equal(page.title, null); assert.deepEqual(page.h1, []); assert.equal(page.canonical_state, "absent");
});
