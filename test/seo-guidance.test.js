import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createGuidanceSnapshot, guidanceContextForAi, retrieveGuidanceSnapshot, validateGuidanceSnapshot } from "../seo-guidance/guidance.js";
import { streetKingzGuidanceSnapshot } from "../seo-guidance/fixtures/streetkingzSnapshot.js";
import { buildArticleOpportunityAiInput } from "../workflows/createSeoArticleOpportunity.js";

test("trusted guidance snapshot has separated authority classes and current validation", () => {
  const result = validateGuidanceSnapshot(streetKingzGuidanceSnapshot, { now: "2026-08-20T00:00:00.000Z" });
  assert.equal(result.valid, true);
  assert.equal(result.freshness, "CURRENT");
  assert.ok(streetKingzGuidanceSnapshot.sources.some((source) => source.authority_class === "SEARCH_ENGINE_PRIMARY"));
  assert.equal(streetKingzGuidanceSnapshot.sources.find((source) => source.id === "google-ai-features").category, "google_ai_search");
  assert.equal(streetKingzGuidanceSnapshot.sources.find((source) => source.id === "google-ranking-systems").category, "google_ranking_systems");
  assert.equal(streetKingzGuidanceSnapshot.sources.find((source) => source.id === "google-generative-ai").category, "google_search");
  assert.ok(streetKingzGuidanceSnapshot.sources.some((source) => source.authority_class === "SEARCH_ENGINE_SECONDARY"));
  assert.ok(streetKingzGuidanceSnapshot.sources.filter((source) => source.authority_class === "WEB_STANDARD").length >= 2);
  assert.match(streetKingzGuidanceSnapshot.snapshot_sha256, /^[a-f0-9]{64}$/);
});

test("unallowlisted source and unsafe redirect fail closed", async () => {
  assert.throws(() => createGuidanceSnapshot({ sources: [{ id: "blog", url: "https://example.com/seo", content: "untrusted content that must never enter the snapshot" }] }), /allowlisted/);
  await assert.rejects(() => retrieveGuidanceSnapshot({ sources: [{ id: "google-search-essentials", url: "https://evil.example/redirect" }], fetchImpl: async () => ({ ok: true, text: async () => "x" }) }), /authority is not allowlisted/);
});

test("snapshot hash, changed content and freshness are deterministic", () => {
  const changed = createGuidanceSnapshot({ retrievedAt: "2026-08-16T00:00:00.000Z", sources: [{ id: "google-search-essentials", content: "A sufficiently long official guidance statement about helpful reliable people first content and search eligibility." }] });
  const changedAgain = createGuidanceSnapshot({ retrievedAt: "2026-08-16T00:00:00.000Z", sources: [{ id: "google-search-essentials", content: "A different sufficiently long official guidance statement about helpful reliable people first content and search eligibility." }] });
  assert.notEqual(changed.snapshot_sha256, changedAgain.snapshot_sha256);
  assert.equal(validateGuidanceSnapshot(changed, { now: "2026-08-17T00:00:00.000Z" }).freshness, "CURRENT");
  assert.equal(validateGuidanceSnapshot(changed, { now: "2027-01-01T00:00:00.000Z" }).freshness, "STALE");
  assert.throws(() => guidanceContextForAi(changed, { now: "2027-01-01T00:00:00.000Z" }), /current validated/);
});

test("expanded source set creates a new immutable snapshot beside the previous one", async () => {
  const previous = JSON.parse(await readFile("artifacts/workflows/create-seo-article/m3-seo-guidance-snapshot.json", "utf8"));
  assert.notEqual(streetKingzGuidanceSnapshot.snapshot_id, previous.snapshot_id);
  assert.notEqual(streetKingzGuidanceSnapshot.snapshot_sha256, previous.snapshot_sha256);
  assert.equal(validateGuidanceSnapshot(previous, { now: "2026-08-20T00:00:00.000Z" }).valid, true);
  assert.equal(validateGuidanceSnapshot(streetKingzGuidanceSnapshot, { now: "2026-08-20T00:00:00.000Z" }).freshness, "CURRENT");
});

test("AI packet keeps guidance separate and bounded", () => {
  const input = buildArticleOpportunityAiInput({ guidanceSnapshot: streetKingzGuidanceSnapshot, packet: { product: { subject_id: "p", product_name: "Widget", product_url: "https://example.test/p", evidence_ids: ["pf"] }, candidates: [{ query: "how to use widget", metrics: { monthly_search_volume: 10 }, product_term_matches: ["widget"], evidence_ids: ["kw"], serp: [] }], serp: [], search_console: "unknown", evidence_artifact_id: "e" }, researchState: { sufficiency: { state: "sufficient" } } });
  assert.equal(input.authoritative_seo_guidance.freshness_status, "CURRENT");
  assert.ok(input.web_structured_data_standards.every((record) => record.authority_class === "WEB_STANDARD"));
  assert.equal(input.empirical_search_evidence.evidence_artifact_id, "e");
  assert.ok(input.authoritative_seo_guidance.records.length <= 20);
  assert.ok(input.authoritative_seo_guidance.records.some((record) => record.category === "google_ai_search"));
  assert.ok(input.authoritative_seo_guidance.records.some((record) => record.category === "google_ranking_systems"));
});
