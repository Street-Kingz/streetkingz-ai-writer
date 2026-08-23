import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { STREET_KINGZ_PRODUCTS } from "../../catalogue/products.js";
import { CLUSTER_DEFS, mapCatalogue, parseKeywordEvidence, parseSerpEvidence, parseGscRows, analyseDestination, buildOpportunityEvidence, buildDiyPlan } from "./decision-quality.js";

const raw = name => JSON.parse(fs.readFileSync(`artifacts/private/v1-01/progressive-004-fresh-evidence/raw/${name}`, "utf8"));

test("decision-quality mapping covers all 27 products and maps Origin Shampoo to contact washing", () => {
  const mapped = mapCatalogue(STREET_KINGZ_PRODUCTS);
  assert.equal(mapped.length, 27);
  assert.equal(new Set(mapped.map(x => x.stable_product_id)).size, 27);
  assert.equal(mapped.find(x => x.name.includes("Origin Shampoo")).primary_cluster, "contact_washing");
  assert.ok(mapped.every(x => x.primary_cluster && x.mapping_reason && x.confidence));
});

test("keyword task success alone does not establish coverage and returned items are parsed", () => {
  const parsed = parseKeywordEvidence(raw("keyword-ideas.raw.json"));
  assert.ok(Object.keys(parsed).length >= 8);
  assert.ok(Object.values(parsed).some(x => x.queries.length > 0));
  const empty = parseKeywordEvidence({ tasks: [{ result: [{ items: [] }] }] });
  assert.ok(Object.values(empty).every(x => x.source_status === "no_relevant_returned_items"));
});

test("SERP evidence retains URLs, result types and page-level interpretation inputs", () => {
  const parsed = parseSerpEvidence(raw("serp-prewash_pressure.raw.json"));
  assert.ok(parsed.item_types.length > 0);
  assert.ok(parsed.results.some(x => x.url));
});

test("Search Console rows are mapped to clusters rather than reduced to counts", () => {
  const mapped = mapCatalogue(STREET_KINGZ_PRODUCTS);
  const rows = parseGscRows(raw("search-console-latest90.raw.json"), mapped);
  assert.ok(rows.length > 0);
  assert.ok(rows.some(x => x.cluster === "prewash_pressure"));
  assert.ok(Object.hasOwn(rows[0], "query"));
  assert.ok(Object.hasOwn(rows[0], "impressions"));
});

test("destination analysis inspects metadata, headings and internal links beyond HTTP status", () => {
  const analysed = analyseDestination('<html><head><title>Example</title><meta name="description" content="Desc"></head><body><h1>H1</h1><a href="https://streetkingz.co.uk/product/x">Link</a></body></html>', "https://streetkingz.co.uk/product/x");
  assert.equal(analysed.title, "Example");
  assert.equal(analysed.description, "Desc");
  assert.equal(analysed.headings[0], "H1");
  assert.equal(analysed.gap_flags.internal_link_count, 1);
});

test("opportunities retain distinct interventions and do not use the former crude ranking formula", () => {
  const mapped = mapCatalogue(STREET_KINGZ_PRODUCTS);
  const keywords = parseKeywordEvidence(raw("keyword-ideas.raw.json"));
  const serps = Object.fromEntries(CLUSTER_DEFS.map(([id]) => [id, parseSerpEvidence(raw(`serp-${id}.raw.json`))]));
  const gsc = parseGscRows(raw("search-console-latest90.raw.json"), mapped);
  const destinations = mapped.map(p => analyseDestination("<title>x</title><h1>x</h1>", p.url));
  const opportunities = buildOpportunityEvidence({ mapped, keywords, serps, gsc, destinations });
  assert.equal(opportunities.length, 8);
  assert.ok(!Object.values(opportunities).some(x => Object.hasOwn(x, "priority_score")));
  assert.ok(opportunities.every(x => x.evidence_ids.length >= 3));
});

test("DIY plan is evidence-specific and points pre-wash winner at the bundle destination", () => {
  const mapped = mapCatalogue(STREET_KINGZ_PRODUCTS);
  const winner = { name: "Pre-wash and pressure-washer equipment", cluster: "prewash_pressure", destination: mapped.find(x => /Stubby Gun \+ Foam Lance Bundle/.test(x.name)).url, affected_products: mapped.filter(x => x.primary_cluster === "prewash_pressure").map(x => x.stable_product_id), intent: "commercial investigation", destination_gap: "Observed gap", destination_analysis: { title: "Bundle", headings: ["Setup"], gap_flags: { internal_link_count: 2 } }, gsc_evidence: { queries: [{ query: "stubby gun with foam cannon", branded: false }] }, demand_evidence: [{ keyword: "snow foam lance" }] };
  const plan = buildDiyPlan(winner, mapped);
  assert.match(plan, /stubby-gun-bundle/);
  assert.match(plan, /stubby gun with foam cannon/);
  assert.match(plan, /QA and verification/);
});

test("progressive-004 remains immutable and the decision-quality runner has no write endpoint", () => {
  const changed = execFileSync("git", ["diff", "--name-only", "--", "artifacts/validation/v1-01/attempts/progressive-004-fresh-evidence"], { encoding: "utf8" }).trim();
  assert.equal(changed, "");
  const runner = fs.readFileSync("scripts/v1-01-progressive-005-decision-quality.js", "utf8");
  assert.doesNotMatch(runner, /method:\s*["']POST["'][^\n]*wordpress|wp-json[^\n]*POST/i);
});
