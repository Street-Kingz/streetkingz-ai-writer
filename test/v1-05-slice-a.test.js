import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildInputHash, buildSnapshotFingerprint, CANDIDATE_TYPES, discoverCandidates, selectBoundedCandidates } from "../product-kernel/decisionDiscovery.js";

const fixtureRows = fs.readFileSync("artifacts/planning/v1-05/fixtures/evaluation-inputs.jsonl", "utf8").trim().split("\n").map(JSON.parse);
const matches = JSON.parse(fs.readFileSync("artifacts/planning/v1-05/evaluation-discovery-matches.json", "utf8")).matches;
const match = (candidate, expected) => candidate.candidate_type === expected.expected_candidate_type && (expected.match_mode !== "existing_target" || expected.expected_target_refs.every(ref => candidate.target_resources.includes(ref))) && (expected.match_mode !== "internal_link_pair" || expected.expected_link_pair.every(ref => candidate.target_resources.includes(ref)));

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

test("Slice A is generic under consistent renaming", () => {
  const original = fixtureRows.find(row => row.case_id === "V105-EVAL-001").input_packet;
  const renamed = JSON.parse(JSON.stringify(original).replaceAll("Orbit", "Nova").replaceAll("orbit", "nova"));
  const shape = packet => discoverCandidates(packet).map(c => [c.candidate_type, c.target_resources.map(ref => ref.replace(/[^:]+$/, "RESOURCE"))]).sort();
  assert.deepEqual(shape(original), shape(renamed));
});

test("Product discovery runtime has no frozen-corpus label dependency", () => {
  const runtime = ["product-kernel/decisionDiscovery.js", "product-kernel/decisionEvidenceAdapter.js", "routes/decisionRuns.js"].map(file => fs.readFileSync(file, "utf8")).join("\n");
  assert.equal(runtime.includes("V105-EVAL-"), false);
  assert.equal(runtime.includes("evaluation-corpus.json"), false);
  assert.equal(runtime.includes("evaluation-discovery-matches.json"), false);
});
