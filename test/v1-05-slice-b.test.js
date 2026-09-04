import test from "node:test";
import assert from "node:assert/strict";
import { deterministicFilter, selectInterpretiveCandidates, buildInterpretationPacket, validateInterpretation, evaluateCandidates, groupOverlap, MAX_BATCH_SIZE, MAX_PLANNED_CALLS, MAX_TOTAL_ATTEMPTS, MAX_OUTPUT_TOKENS } from "../product-kernel/candidateEvaluation.js";

const candidate = (id, extra = {}) => ({ candidate_id: id, candidate_identity: id, candidate_type: "existing_content_improvement", target_resources: ["page:" + id], discovery_sources: ["external_search"], evidence_refs: [{ source_kind: "external_search", source_record_type: "observation", source_record_id: "e-" + id, source_run_or_generation_reference: "run-1", relationship: "query_serp_relationship" }], market: "GB", language: "en", ...extra });

test("Slice B deterministic filters remain structural and do not use metrics", () => {
  assert.deepEqual(deterministicFilter(candidate("a"), { business: { market: "GB", language: "en" } }), { disposition: "pass", reason_codes: [] });
  assert.deepEqual(deterministicFilter(candidate("a", { market: "DE" }), { business: { market: "GB", language: "en" } }), { disposition: "reject", reason_codes: ["wrong_market"] });
  assert.equal(deterministicFilter(candidate("a", { search_volume: 0 }), { business: { market: "GB", language: "en" } }).disposition, "pass");
});

test("Slice B fair interpretation bound is deterministic and bounded-out is not rejection", () => {
  const input = []; for (const type of ["existing_product_improvement", "existing_category_improvement", "existing_content_improvement", "new_page_or_content_asset", "internal_linking"]) for (const source of ["site", "search_console", "external_search"]) for (let i = 0; i < 5; i++) input.push(candidate(`${type}-${source}-${i}`, { candidate_type: type, discovery_sources: [source] }));
  const result = selectInterpretiveCandidates(input);
  assert.equal(result.selected.length, 50); assert.equal(result.boundedOut.length, input.length - 50); assert.equal(result.partial, true);
  assert.deepEqual(result.selected.map(x => x.candidate_id), selectInterpretiveCandidates([...input].reverse()).selected.map(x => x.candidate_id));
});

test("Slice B packet is bounded and target output is allowlisted", () => {
  const item = candidate("a", { evidence_refs: Array.from({ length: 45 }, (_, i) => ({ source_kind: "site", source_record_type: "page", source_record_id: String(i), source_run_or_generation_reference: "run", relationship: "supports" })) });
  const packet = buildInterpretationPacket(item); assert.equal(packet.evidence_refs.length, 40); assert.ok(packet.bounded_evidence_summary.length <= 2000);
  const output = { candidate_id: "a", customer_job: "learn", intent_class: "informational", intent_confidence: "medium", relevance_state: "relevant", target_attribution_state: "established", attributed_target_resources: ["page:a"], page_type_fit: "aligned", new_asset_fit: "not_applicable", interpretive_disposition: "retain", reason_codes: [], limitations: [] };
  assert.equal(validateInterpretation(output, item).candidate_id, "a"); assert.throws(() => validateInterpretation({ ...output, attributed_target_resources: ["page:invented"] }, item), /INVALID_INTERPRETATION_OUTPUT/);
});

test("Slice B preserves source facts and groups same jobs without commercial inputs", () => {
  const item = candidate("a", { source_job_identity: "remove tar from paint", discovery_sources: ["external_search"] });
  const packet = buildInterpretationPacket(item, { external: { rows: [{ source_record_id: "e-a", query: "remove tar from paint", market: "GB", language: "en", serp: [{ url: "https://example.test/guide", title: "Tar guide" }] }] } });
  assert.match(packet.bounded_evidence_summary, /remove tar from paint/);
  assert.doesNotMatch(packet.bounded_evidence_summary, /sales|margin|stock|revenue/i);
  const grouped = groupOverlap([item, candidate("b", { source_job_identity: "remove tar from paint" })]);
  assert.equal(grouped.get("a"), grouped.get("b"));
});

test("Slice B retries one failed batch and never exceeds the attempt bound", async () => {
  const item = candidate("retry"); let calls = 0;
  const provider = { async generate({ userPrompt }) { calls++; if (calls === 1) throw new Error("transport"); const requested = JSON.parse(userPrompt).candidates[0]; return { provider: "test", model: "test-model", rawText: JSON.stringify({ results: [{ candidate_id: requested.candidate_id, customer_job: "job", intent_class: "uncertain", intent_confidence: "unknown", relevance_state: "uncertain", target_attribution_state: "unresolved", attributed_target_resources: [], page_type_fit: "unknown", new_asset_fit: "uncertain", interpretive_disposition: "retain_uncertain", reason_codes: ["uncertain"], limitations: [] }] }), usage: {} }; } };
  const result = await evaluateCandidates({ candidates: [item], packet: { business: { market: "GB", language: "en" } }, interpretationProvider: provider });
  assert.equal(calls, 2); assert.equal(result.modelRequestAttempts, 2); assert.equal(result.rows[0].interpretive_disposition, "retain_uncertain");
});

test("Slice B injected provider batches at ten and records bounded interpretation", async () => {
  const candidates = Array.from({ length: 11 }, (_, i) => candidate(String(i)));
  let calls = 0;
  const provider = { async generate({ responseSchema, userPrompt }) { calls++; assert.ok(responseSchema); const requested = JSON.parse(userPrompt).candidates; return { provider: "test", model: "test-model", rawText: JSON.stringify({ results: requested.map(item => ({ candidate_id: item.candidate_id, customer_job: "job", intent_class: "informational", intent_confidence: "medium", relevance_state: "relevant", target_attribution_state: "established", attributed_target_resources: item.allowed_target_refs, page_type_fit: "aligned", new_asset_fit: "not_applicable", interpretive_disposition: "retain", reason_codes: [], limitations: [] })) }), usage: { prompt_tokens: 1, completion_tokens: 1 } }; } };
  const result = await evaluateCandidates({ candidates, packet: { business: { market: "GB", language: "en" } }, interpretationProvider: provider });
  assert.equal(calls, 2); assert.equal(result.interpretedCount, 11); assert.ok(result.outputTokens <= MAX_OUTPUT_TOKENS); assert.equal(MAX_BATCH_SIZE, 10); assert.equal(MAX_PLANNED_CALLS, 5); assert.equal(MAX_TOTAL_ATTEMPTS, 6);
});
