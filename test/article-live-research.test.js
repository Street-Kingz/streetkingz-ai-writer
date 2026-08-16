import test from "node:test";
import assert from "node:assert/strict";
import { assertSafeResearchUrl, enrichEvidencePackWithLivePages, normalizeResearchPage } from "../research/articleLiveEvidence.js";

test("live research URL safety rejects unsafe schemes and private destinations", async () => {
  await assert.rejects(() => assertSafeResearchUrl("file:///etc/passwd"), /UNSUPPORTED_OR_CREDENTIAL_URL/);
  await assert.rejects(() => assertSafeResearchUrl("http://127.0.0.1/test"), /PRIVATE_NETWORK_URL/);
});

test("normalization extracts bounded page structure without scripts or navigation", () => {
  const page = normalizeResearchPage("<nav>Menu</nav><script>alert(1)</script><main><h1>Drying towels</h1><h2>Waffle weave</h2><p>Absorbency and size.</p></main><footer>Footer</footer>", "https://example.test/a", "https://example.test/a");
  assert.deepEqual(page.h1, ["Drying towels"]);
  assert.deepEqual(page.h2, ["Waffle weave"]);
  assert.match(page.content, /Absorbency/);
  assert.doesNotMatch(page.content, /alert|Menu|Footer/);
  assert.match(page.normalized_hash, /^[a-f0-9]{64}$/);
});

test("subject-depth gate can fail without enough page evidence", () => {
  const pack = { sources: [], research_questions: [], relevant_product_facts: [{ evidence_id: "p" }], tradeoffs: [], content_gaps: [], unknowns: [], decision_dimensions: [], corroborated_findings: [] };
  const result = enrichEvidencePackWithLivePages({ ...pack, evidence_pack_id: "old", evidence_pack_sha256: "old" }, [{ source_id: "live_1", requested_url: "https://example.test", final_url: "https://example.test", source_class: "INDEPENDENT_EXPERT", extraction_status: "FAILED", failure_reason: "TIMEOUT", retrieved_at: "2026-01-01T00:00:00Z", content_hash: null }]);
  assert.equal(result.subject_depth.status, "FAIL");
  assert.equal(result.page_level_coverage.failed, 1);
});
