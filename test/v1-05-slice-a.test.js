import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildInputHash, buildSnapshotFingerprint, CANDIDATE_TYPES, discoverCandidates, selectBoundedCandidates } from "../product-kernel/decisionDiscovery.js";

const fixtureRows = fs.readFileSync("artifacts/planning/v1-05/fixtures/evaluation-inputs.jsonl", "utf8").trim().split("\n").map(JSON.parse);
const matches = JSON.parse(fs.readFileSync("artifacts/planning/v1-05/evaluation-discovery-matches.json", "utf8")).matches;
const sourceIdentity = value => value.replace("external:", "external_search:");
const match = (candidate, expected) => {
  if (candidate.candidate_type !== expected.expected_candidate_type) return false;
  const hasSource = candidate.evidence_refs.some(ref => ref.source_kind + ":" + ref.source_record_id === sourceIdentity(expected.expected_source_query_or_job || expected.supporting_source_identity || ""));
  if (expected.match_mode === "existing_target") return expected.expected_target_refs.every(ref => candidate.target_resources.includes(ref)) && hasSource;
  if (expected.match_mode === "new_asset_source") return hasSource;
  if (expected.match_mode === "internal_link_direction") return candidate.target_resources[0] === expected.expected_link_source && candidate.target_resources[1] === expected.expected_link_target && candidate.evidence_refs.some(ref => ref.source_kind + ":" + ref.source_record_id === sourceIdentity(expected.supporting_source_identity));
  return false;
};

test("Slice A uses only the approved five candidate types and stable hashes", () => {
  assert.deepEqual(CANDIDATE_TYPES, ["existing_product_improvement", "existing_category_improvement", "existing_content_improvement", "new_page_or_content_asset", "internal_linking"]);
  const packet = { business: { market: "GB", language: "en" }, site: { pages: [{ id: "p", type: "content", title: "Guide", url: "https://example.test/guide" }], state: "available" } };
  assert.equal(buildInputHash(packet), buildInputHash(structuredClone(packet)));
  assert.equal(buildSnapshotFingerprint({ b: 1, a: 2 }), buildSnapshotFingerprint({ a: 2, b: 1 }));
  assert.equal(discoverCandidates(packet).every(c => c.candidate_status === "discovered" && c.overlap_group_id === null && c.rejection_reason_codes.length === 0), true);
});

test("Slice A discovers the frozen corpus with exact-match recall", () => {
  let discoverable = 0; let discovered = 0; let highImpactMisses = 0;
  for (const row of fixtureRows) {
    const expected = matches.find(item => item.case_id === row.case_id);
    const candidates = discoverCandidates(row.input_packet);
    assert.ok(candidates.length <= 200);
    if (!expected) continue;
    discoverable++;
    if (candidates.some(candidate => match(candidate, expected))) discovered++; else if (expected.high_impact) highImpactMisses++;
  }
  assert.equal(discoverable, 38);
  assert.ok(discovered / discoverable >= 0.9);
  assert.equal(highImpactMisses, 0);
});

test("Slice A merges exact identity and uses explicit cap semantics", () => {
  const packet = { business: { market: "GB", language: "en" }, site: { state: "available", pages: [{ id: "p", type: "content", title: "Guide", url: "https://example.test/guide" }] }, search_console: { state: "available", rows: [{ query: "guide", page_id: "p" }] }, external: { state: "available", rows: [{ query: "guide", market: "GB", language: "en", search_volume: 20, serp: [{ rank: 5, url: "https://example.test/guide", domain: "example.test" }] }] } };
  const candidates = discoverCandidates(packet);
  assert.equal(candidates.filter(c => c.candidate_type === "existing_content_improvement" && c.target_resources.includes("page:p")).length, 1);
  const selected = selectBoundedCandidates(Array.from({ length: 201 }, (_, i) => ({ candidate_identity: String(i), candidate_type: "new_page_or_content_asset", discovery_sources: ["external_search"], evidence_refs: [{ source_kind: "external_search", source_record_id: String(i) }] })));
  assert.equal(selected.candidates.length, 200);
  assert.equal(selected.completeness, "partial");
  assert.deepEqual(selected.limitations, ["candidate_cap_hit"]);
});

test("Slice A emits broad coexistence, directed links, and no arbitrary pairs", () => {
  const packet = { business: { market: "GB", language: "en" }, commerce: { products: [{ id: "p", name: "Blue brush" }], categories: [{ id: "c", name: "Brushes" }], relations: [{ id: "relation-1", product_id: "p", category_id: "c" }] }, site: { state: "available", pages: [{ id: "cat", type: "category", title: "Brushes", url: "https://example.test/brushes", internal_links: [] }, { id: "prod", type: "product", title: "Blue brush", url: "https://example.test/blue-brush", internal_links: [] }] }, external: { state: "available", rows: [{ query: "blue brush", market: "GB", language: "en", search_volume: 20, serp: [{ url: "https://example.test/blue-brush" }] }] } };
  const candidates = discoverCandidates(packet);
  assert.equal(candidates.some(c => c.candidate_type === "existing_product_improvement" && c.target_resources.includes("page:prod")), true);
  assert.equal(candidates.some(c => c.candidate_type === "new_page_or_content_asset"), true);
  assert.equal(candidates.some(c => c.candidate_type === "internal_linking" && c.target_resources[0] === "page:cat" && c.target_resources[1] === "page:prod"), true);
  assert.equal(candidates.some(c => c.candidate_type === "internal_linking" && c.target_resources[0] === "page:prod" && c.target_resources[1] === "page:cat"), false);
  const unrelated = { business: { market: "GB" }, site: { state: "available", pages: Array.from({ length: 20 }, (_, i) => ({ id: "page-" + i, type: i % 2 ? "product" : "category", title: "Unrelated " + i, url: "https://example.test/u-" + i, internal_links: [] })) } };
  assert.equal(discoverCandidates(unrelated).filter(c => c.candidate_type === "internal_linking").length, 0);
});

test("Slice A fair cap represents mixed type/source groups deterministically", () => {
  const candidates = [];
  for (const type of CANDIDATE_TYPES) for (const source of ["site", "search_console", "external_search"]) for (let i = 0; i < 20; i++) candidates.push({ candidate_identity: type + "-" + source + "-" + i, candidate_type: type, discovery_sources: [source], evidence_refs: [{ source_kind: source, source_record_id: String(i) }] });
  const shuffled = [...candidates].reverse();
  const a = selectBoundedCandidates(candidates); const b = selectBoundedCandidates(shuffled);
  assert.equal(a.candidates.length, 200);
  assert.deepEqual(a.candidates.map(c => c.candidate_identity), b.candidates.map(c => c.candidate_identity));
  assert.equal(new Set(a.candidates.map(c => c.candidate_type)).size, 5);
  assert.equal(a.completeness, "partial");
  assert.deepEqual(a.limitations, ["candidate_cap_hit"]);
});

test("Slice A is generic under consistent renaming", () => {
  const original = fixtureRows.find(row => row.case_id === "V105-EVAL-001").input_packet;
  const renamed = JSON.parse(JSON.stringify(original).replaceAll("Orbit", "Nova").replaceAll("orbit", "nova"));
  const shape = packet => discoverCandidates(packet).map(c => [c.candidate_type, c.target_resources.map(ref => ref.replace(/[^:]+$/, "RESOURCE"))]).sort();
  assert.deepEqual(shape(original), shape(renamed));
});

test("Slice A derives maturity only from sources supporting each candidate", () => {
  const base = {
    business: { market: "GB", language: "en" },
    site: { state: "partial", completeness_state: "partial", limitations: ["site_cap"], pages: [{ id: "site-page", type: "content", title: "Site guide", url: "https://example.test/guide" }] },
    search_console: { state: "available", completeness_state: "provider_limited", limitations: ["gsc_provider_limit"], rows: [{ id: "gsc-1", query: "guide", page_id: "site-page" }] },
    external: { state: "missing", completeness_state: "missing", limitations: ["external_unavailable"], rows: [] }
  };
  const gscOnly = discoverCandidates({ ...base, site: { state: "missing", pages: base.site.pages } }).find(candidate => candidate.discovery_sources.length === 1 && candidate.discovery_sources.includes("search_console"));
  assert.equal(gscOnly.freshness_state, "available");
  assert.equal(gscOnly.completeness, "provider_limited");
  assert.deepEqual(gscOnly.limitations, ["gsc_provider_limit"]);

  const siteOnly = discoverCandidates({ ...base, search_console: { state: "missing", rows: [] } }).find(candidate => candidate.discovery_sources.includes("site"));
  assert.equal(siteOnly.freshness_state, "partial");
  assert.equal(siteOnly.completeness, "partial");
  assert.deepEqual(siteOnly.limitations, ["site_cap"]);

  const both = discoverCandidates(base).find(candidate => candidate.candidate_type === "existing_content_improvement" && candidate.discovery_sources.length === 2);
  assert.equal(both.freshness_state, "partial");
  assert.equal(both.completeness, "partial");
  assert.deepEqual(both.limitations, ["gsc_provider_limit", "site_cap"]);

  const genuinelyMissing = discoverCandidates({ ...base, site: { state: "missing", completeness_state: "missing", pages: base.site.pages }, search_console: { state: "missing", rows: [] }, external: { state: "missing", completeness_state: "missing", rows: [{ id: "external-1", query: "guide", serp: [{ url: "https://example.test/guide" }] }] } }).find(candidate => candidate.discovery_sources.includes("external_search"));
  assert.equal(genuinelyMissing.freshness_state, "missing");
  assert.equal(genuinelyMissing.completeness, "missing");
});

test("Slice A resolves product targets by canonical URL identity before any fallback", () => {
  const packet = {
    business: { market: "GB", language: "en" },
    commerce: { products: [
      { id: "product-a", name: "Same Name", slug: "same-name", canonical_url: "https://shop.test/products/same-name/" },
      { id: "product-b", name: "Same Name", slug: "same-name-2", canonical_url: "https://shop.test/products/same-name-2/" }
    ], categories: [] },
    site: { state: "available", pages: [
      { id: "page-a", type: "product", title: "Same Name", h1: "Same Name", url: "https://SHOP.test:443/products/same-name/?utm_source=test#details" },
      { id: "page-unmatched", type: "product", title: "Same Name", h1: "Same Name", url: "https://shop.test/products/other-name/" }
    ] },
    search_console: { state: "missing", rows: [] },
    external: { state: "missing", rows: [] }
  };
  const candidates = discoverCandidates(packet).filter(candidate => candidate.candidate_type === "existing_product_improvement");
  const matched = candidates.find(candidate => candidate.target_resources.includes("page:page-a"));
  assert.deepEqual(matched.target_resources.sort(), ["page:page-a", "product:product-a"].sort());
  const unmatched = candidates.find(candidate => candidate.target_resources.includes("page:page-unmatched"));
  assert.deepEqual(unmatched.target_resources, ["page:page-unmatched"]);
  assert.equal(candidates.some(candidate => candidate.target_resources.includes("product:product-b") && candidate.target_resources.includes("page:page-a")), false);

  const external = discoverCandidates({ ...packet, site: { state: "missing", pages: packet.site.pages }, external: { state: "available", rows: [{ id: "external-1", query: "same name", serp: [{ url: "https://shop.test/products/same-name/?fbclid=ignored" }] }] } });
  assert.ok(external.some(candidate => candidate.target_resources.includes("product:product-a") && candidate.target_resources.includes("page:page-a")));
});

test("Product discovery runtime has no frozen-corpus label dependency", () => {
  const runtime = ["product-kernel/decisionDiscovery.js", "product-kernel/decisionEvidenceAdapter.js", "routes/decisionRuns.js"].map(file => fs.readFileSync(file, "utf8")).join("\n");
  assert.equal(runtime.includes("V105-EVAL-"), false);
  assert.equal(runtime.includes("evaluation-corpus.json"), false);
  assert.equal(runtime.includes("evaluation-discovery-matches.json"), false);
});
