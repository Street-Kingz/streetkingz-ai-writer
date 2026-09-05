import test from "node:test";
import assert from "node:assert/strict";
import { deterministicFilter, selectInterpretiveCandidates, buildInterpretationPacket, validateInterpretation, evaluateCandidates, groupOverlap, prepareDeterministicCohort, buildBatchIdentity, MAX_BATCH_SIZE, MAX_PLANNED_CALLS, MAX_TOTAL_ATTEMPTS, MAX_OUTPUT_TOKENS } from "../product-kernel/candidateEvaluation.js";

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

test("Slice B singleton overlap is null and batch identity is order-independent", () => {
  const one = candidate("one"); const two = candidate("two");
  assert.equal(groupOverlap([one]).get("one"), null);
  assert.equal(buildBatchIdentity({ candidates: [one, two], packet: { business: { market: "GB", language: "en" } } }), buildBatchIdentity({ candidates: [two, one], packet: { business: { market: "GB", language: "en" } } }));
});

test("cohort preparation rejects only objectively duplicate distinct candidates", () => {
  const sameTarget = prepareDeterministicCohort([candidate("target-b", { target_resources: ["page:same"] }), candidate("target-a", { target_resources: ["page:same"] })]);
  assert.deepEqual(sameTarget.prepared.map(x => x.candidate_id), ["target-a"]); assert.equal(sameTarget.duplicateRejections[0].candidate.candidate_id, "target-b");
  const sameLink = prepareDeterministicCohort([candidate("link-b", { target_resources: [], link_source_ref: "page:a", link_target_ref: "page:b" }), candidate("link-a", { target_resources: [], link_source_ref: "page:a", link_target_ref: "page:b" })]);
  assert.deepEqual(sameLink.prepared.map(x => x.candidate_id), ["link-a"]); assert.equal(sameLink.duplicateRejections[0].reason_code, "duplicate_candidate");
  const sameJob = prepareDeterministicCohort([candidate("job-b", { target_resources: [], source_job_identity: "Tyre   care guide" }), candidate("job-a", { target_resources: [], source_job_identity: "tyre care guide" })]);
  assert.deepEqual(sameJob.prepared.map(x => x.candidate_id), ["job-a"]); assert.equal(sameJob.duplicateRejections[0].candidate.candidate_id, "job-b");
});

test("completed durable batch is reused without another provider call", async () => {
  const item = candidate("cached"); let providerCalls = 0; let completionCalls = 0;
  const output = { candidate_id: "cached", customer_job: "job", intent_class: "informational", intent_confidence: "medium", relevance_state: "relevant", target_attribution_state: "established", attributed_target_resources: ["page:cached"], page_type_fit: "aligned", new_asset_fit: "not_applicable", interpretive_disposition: "retain", reason_codes: [], limitations: [] };
  const result = await evaluateCandidates({ candidates: [item], packet: { business: { market: "GB", language: "en" } }, interpretationProvider: { async generate() { providerCalls++; throw new Error("must not call provider"); } }, resolveBatch: async () => ({ reused: true, response: { provider: "test", model: "test", output: [output], usage: {} } }), onBatchComplete: async () => { completionCalls++; } });
  assert.equal(providerCalls, 0); assert.equal(completionCalls, 0); assert.equal(result.rows[0].interpretive_disposition, "retain");
});

test("Slice B retries one failed batch and never exceeds the attempt bound", async () => {
  const item = candidate("retry"); let calls = 0;
  const provider = { async generate({ userPrompt }) { calls++; if (calls === 1) throw new Error("transport"); const requested = JSON.parse(userPrompt).candidates[0]; return { provider: "test", model: "test-model", rawText: JSON.stringify({ results: [{ candidate_id: requested.candidate_id, customer_job: "job", intent_class: "uncertain", intent_confidence: "unknown", relevance_state: "uncertain", target_attribution_state: "unresolved", attributed_target_resources: [], page_type_fit: "unknown", new_asset_fit: "not_applicable", interpretive_disposition: "retain_uncertain", reason_codes: ["uncertain"], limitations: [] }] }), usage: {} }; } };
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
