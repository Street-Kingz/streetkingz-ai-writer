import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { deterministicFilter, selectInterpretiveCandidates, buildInterpretationPacket, buildInterpretationRequest, normalizeInterpretationOutput, INTERPRETATION_RESPONSE_SCHEMA, validateInterpretation, evaluateCandidates, groupOverlap, prepareDeterministicCohort, resolveEvidenceRef, refinePostInterpretationOverlap, buildBatchIdentity, MAX_BATCH_SIZE, MAX_PLANNED_CALLS, MAX_TOTAL_ATTEMPTS, MAX_OUTPUT_TOKENS, INTENT_CLASS_DEFINITIONS, buildInterpretationSystemPrompt, INSTRUCTION_VERSION } from "../product-kernel/candidateEvaluation.js";
import { discoverCandidates } from "../product-kernel/decisionDiscovery.js";
import { buildOpenAIInterpretationRequest, createOpenAIInterpretationProvider, interpretationModelProfile } from "../interpretation/providers/openai.js";
import { conservativeProviderRequestCostBound, configuredModelPricing, assertAcceptanceCostWithinCap } from "../interpretation/cost.js";
import { isSemanticInterpretationFailure } from "../scripts/validation/v1-05-slice-b-harness-lib.js";

const candidate = (id, extra = {}) => ({ candidate_id: id, candidate_identity: id, candidate_type: "existing_content_improvement", target_resources: ["page:" + id], discovery_sources: ["external_search"], evidence_refs: [{ source_kind: "external_search", source_record_type: "observation", source_record_id: "e-" + id, source_run_or_generation_reference: "run-1", relationship: "query_serp_relationship" }], market: "GB", language: "en", ...extra });

test("instructions-5 defines every intent class and generic boundaries from one source", () => {
  const names = ["product_selection", "category_selection", "comparison_selection", "informational", "mixed_intent", "brand_navigation", "navigation_discovery", "broad_information", "uncertain", "uncertain_selection"];
  const prompt = buildInterpretationSystemPrompt();
  assert.equal(INSTRUCTION_VERSION, "v1-05-slice-b-instructions-5");
  assert.deepEqual(Object.keys(INTENT_CLASS_DEFINITIONS), names);
  for (const name of names) { assert.equal(typeof INTENT_CLASS_DEFINITIONS[name], "string"); assert.ok(INTENT_CLASS_DEFINITIONS[name].length > 0); assert.match(prompt, new RegExp(name)); }
  for (const phrase of ["multiple materially supported jobs", "primary intent family", "selection or evaluation family", "product or item level", "category or type level", "comparing alternatives or trade-offs", "reasonably bounded knowledge job", "genuinely broad exploratory information", "named brand or official brand destination", "generic resource or destination discovery"]) assert.match(prompt, new RegExp(phrase, "i"));
  assert.doesNotMatch(prompt, /V105-EVAL-|case\\s+0\\d|evaluation corpus|benchmark/i);
});

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

test("target attribution invariants are strict and diagnostics are safe", () => {
  const item = candidate("target"); const base = { candidate_id: "target", customer_job: "learn", intent_class: "informational", intent_confidence: "medium", relevance_state: "relevant", target_attribution_state: "established", attributed_target_resources: ["page:target"], page_type_fit: "aligned", new_asset_fit: "not_applicable", interpretive_disposition: "retain", reason_codes: [], limitations: [] };
  assert.throws(() => validateInterpretation({ ...base, attributed_target_resources: [] }, item), error => error.code === "INVALID_TARGET_INVARIANT" && error.validationDiagnostics.attributed_target_count === 0 && !JSON.stringify(error.validationDiagnostics).includes("learn"));
  assert.throws(() => validateInterpretation({ ...base, target_attribution_state: "unresolved" }, item), /INVALID_TARGET_INVARIANT/);
  assert.equal(validateInterpretation(base, item).candidate_id, "target");
  assert.equal(validateInterpretation({ ...base, target_attribution_state: "unresolved", attributed_target_resources: [] }, item).candidate_id, "target");
});

test("v6 target attribution schema and normalization are explicit", () => {
  const schema = INTERPRETATION_RESPONSE_SCHEMA.properties.results.items.properties.target_attribution;
  assert.equal(schema.anyOf.length, 4);
  const variants = Object.fromEntries(schema.anyOf.map(variant => [variant.properties.state.enum[0], variant]));
  assert.equal(variants.established.properties.resources.minItems, 1);
  assert.equal(variants.unresolved.properties.resources.maxItems, 0);
  assert.deepEqual(normalizeInterpretationOutput({ candidate_id: "x", target_attribution: { state: "established", resources: ["page:a"] }, other: "kept" }), { candidate_id: "x", target_attribution_state: "established", attributed_target_resources: ["page:a"], other: "kept" });
  assert.deepEqual(normalizeInterpretationOutput({ target_attribution: { state: "unresolved", resources: [] } }), { target_attribution_state: "unresolved", attributed_target_resources: [] });
  assert.equal(buildInterpretationRequest({ candidate: candidate("x"), packet: { business: { market: "GB", language: "en" } } }).input.model_facing_text_chars <= 2000, true);
});

test("v6 schema is used in the strict OpenAI request and frozen meanings replay", () => {
  const request = buildOpenAIInterpretationRequest({ model: "gpt-4o-mini", systemPrompt: "x", userPrompt: "{}", responseSchema: INTERPRETATION_RESPONSE_SCHEMA });
  assert.equal(request.response_format.type, "json_schema"); assert.equal(request.response_format.json_schema.strict, true); assert.equal(request.response_format.json_schema.schema.type, "object");
  const expectations = JSON.parse(fs.readFileSync("artifacts/planning/v1-05/evaluation-slice-b-expectations.json", "utf8")).cases;
  const applicable = expectations.filter(item => item.interpretation_applicable); assert.equal(applicable.length, 38);
  for (const item of applicable) { const normalized = normalizeInterpretationOutput({ candidate_id: "replay", target_attribution: { state: item.expected_target_attribution_state, resources: item.expected_target_refs } }); assert.equal(normalized.target_attribution_state, item.expected_target_attribution_state); assert.deepEqual(normalized.attributed_target_resources, item.expected_target_refs); }
});

test("OpenAI model profiles preserve mini sampling and explicitly configure Sol reasoning", () => {
  const schema = INTERPRETATION_RESPONSE_SCHEMA;
  const mini = buildOpenAIInterpretationRequest({ model: "gpt-4o-mini", systemPrompt: "s", userPrompt: "u", responseSchema: schema, maxOutputTokens: 9000 });
  assert.equal(mini.temperature, 0.1);
  assert.equal("reasoning_effort" in mini, false);
  assert.equal(mini.max_completion_tokens, 4000);
  const sol = buildOpenAIInterpretationRequest({ model: "gpt-5.6-sol", reasoningEffort: "medium", systemPrompt: "s", userPrompt: "u", responseSchema: schema, maxOutputTokens: 4000 });
  assert.equal(sol.model, "gpt-5.6-sol");
  assert.equal(sol.reasoning_effort, "medium");
  for (const key of ["temperature", "top_p", "logprobs"]) assert.equal(key in sol, false);
  assert.equal(sol.response_format.type, "json_schema");
  assert.equal(sol.response_format.json_schema.strict, true);
  assert.equal(sol.response_format.json_schema.schema.properties.results.items.properties.target_attribution.anyOf.length, 4);
  assert.equal(sol.max_completion_tokens, 4000);
  assert.deepEqual(interpretationModelProfile("gpt-5.6-sol", { OPENAI_INTERPRETATION_REASONING_EFFORT: "low" }).reasoning_effort, "low");
  assert.deepEqual(interpretationModelProfile("gpt-5.6-sol", { OPENAI_INTERPRETATION_REASONING_EFFORT: "high" }).reasoning_effort, "high");
  assert.throws(() => interpretationModelProfile("gpt-5.6-sol", { OPENAI_INTERPRETATION_REASONING_EFFORT: "arbitrary" }), /must be one of/);
  assert.throws(() => interpretationModelProfile("gpt-4o-mini", { OPENAI_INTERPRETATION_REASONING_EFFORT: "medium" }), /incompatible/);
});

test("conservative cost bounds include the complete request and enforce the hard envelope", () => {
  const pricing = { input_per_million_tokens_usd: 4, output_per_million_tokens_usd: 20 };
  const base = buildOpenAIInterpretationRequest({ model: "gpt-5.6-sol", reasoningEffort: "medium", systemPrompt: "short", userPrompt: "{}", responseSchema: INTERPRETATION_RESPONSE_SCHEMA, maxOutputTokens: 4000 });
  const long = buildOpenAIInterpretationRequest({ ...{ model: "gpt-5.6-sol", reasoningEffort: "medium", userPrompt: "{}", responseSchema: INTERPRETATION_RESPONSE_SCHEMA, maxOutputTokens: 4000 }, systemPrompt: "long".repeat(1000) });
  const first = conservativeProviderRequestCostBound({ requestPayload: base, pricing, maxOutputTokens: 4000 });
  const second = conservativeProviderRequestCostBound({ requestPayload: long, pricing, maxOutputTokens: 4000 });
  assert.ok(second.conservative_input_token_bound > first.conservative_input_token_bound);
  assert.ok(second.maximum_request_cost_usd > first.maximum_request_cost_usd);
  assert.equal(first.max_output_token_bound, 4000);
  assert.equal(conservativeProviderRequestCostBound({ requestPayload: base, pricing: null }).cost_status, "unknown");
  assert.equal(configuredModelPricing({}, "gpt-5.6-sol"), null);
  assert.doesNotThrow(() => assertAcceptanceCostWithinCap({ currentCost: 4.79, costStatus: "calculated_from_explicit_configuration", pendingBound: { maximum_request_cost_usd: 0.20 } }));
  assert.throws(() => assertAcceptanceCostWithinCap({ currentCost: 4.95, costStatus: "calculated_from_explicit_configuration", pendingBound: { maximum_request_cost_usd: 0.20 } }), /GLOBAL_ACCEPTANCE_COST_BOUND/);
  assert.throws(() => assertAcceptanceCostWithinCap({ currentCost: 0, costStatus: "unknown", pendingBound: { maximum_request_cost_usd: 0.20 } }), /GLOBAL_ACCEPTANCE_COST_BOUND/);
});

test("base39 and hard40 cost arithmetic uses all request bounds and the largest retry", () => {
  const pricing = { input_per_million_tokens_usd: 4, output_per_million_tokens_usd: 20 };
  const requests = Array.from({ length: 39 }, (_, index) => ({ model: "gpt-5.6-sol", messages: [{ role: "system", content: "x".repeat(index + 1) }], response_format: { type: "json_schema", json_schema: { strict: true, schema: {} } }, reasoning_effort: "medium", max_completion_tokens: 4000 }));
  const bounds = requests.map(requestPayload => conservativeProviderRequestCostBound({ requestPayload, pricing }));
  const base39 = bounds.reduce((sum, item) => sum + item.maximum_request_cost_usd, 0);
  const largest = Math.max(...bounds.slice(1).map(item => item.maximum_request_cost_usd));
  const base38 = bounds.slice(0, 38).reduce((sum, item) => sum + item.maximum_request_cost_usd, 0);
  assert.ok(base39 > base38);
  assert.ok(base39 + largest > base39);
  assert.equal(bounds.every(item => item.max_output_token_bound === 4000), true);
  assert.equal(conservativeProviderRequestCostBound({ requestPayload: { reasoning_tokens: 999 }, pricing, maxOutputTokens: 4000 }).max_output_token_bound, 4000);
});

test("mocked Sol Chat Completions response preserves reasoning diagnostics and normalizes v6 output", async () => {
  let calls = 0;
  let request;
  const provider = createOpenAIInterpretationProvider({
    env: { OPENAI_API_KEY: "fixture-key", OPENAI_INTERPRETATION_MODEL: "gpt-5.6-sol", OPENAI_INTERPRETATION_REASONING_EFFORT: "medium" },
    fetchImpl: async (_url, options) => {
      calls++;
      request = JSON.parse(options.body);
      return { ok: true, status: 200, async text() { return JSON.stringify({ id: "sol-fixture-response", model: "gpt-5.6-sol", choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ results: [{ candidate_id: "sol-candidate", customer_job: "select", intent_class: "product_selection", intent_confidence: "high", relevance_state: "relevant", target_attribution: { state: "established", resources: ["page:sol"] }, page_type_fit: "aligned", new_asset_fit: "not_applicable", interpretive_disposition: "retain", reason_codes: [], limitations: [] }] }) } }], usage: { prompt_tokens: 120, completion_tokens: 80, completion_tokens_details: { reasoning_tokens: 24 } } }); } };
    }
  });
  const response = await provider.generate({ systemPrompt: "s", userPrompt: "u", responseSchema: INTERPRETATION_RESPONSE_SCHEMA, maxOutputTokens: 4000 });
  assert.equal(calls, 1);
  assert.equal(request.model, "gpt-5.6-sol");
  assert.equal(request.reasoning_effort, "medium");
  assert.equal("temperature" in request, false);
  assert.equal(response.provider, "openai");
  assert.equal(response.model, "gpt-5.6-sol");
  assert.equal(response.reasoning_tokens, 24);
  assert.equal(response.usage.completion_tokens, 80);
  const normalized = normalizeInterpretationOutput(JSON.parse(response.rawText).results[0]);
  const internalCandidate = candidate("sol-candidate", { target_resources: ["page:sol"] });
  assert.equal(validateInterpretation(normalized, internalCandidate).target_attribution_state, "established");
  assert.deepEqual(normalized.attributed_target_resources, ["page:sol"]);
});

test("case 007 Product packet supports v6 attribution variants without changing labels", () => {
  const line = fs.readFileSync("artifacts/planning/v1-05/fixtures/evaluation-inputs.jsonl", "utf8").trim().split("\n").map(JSON.parse).find(item => item.case_id === "V105-EVAL-007");
  const candidates = discoverCandidates(line.input_packet); const eligible = candidates.filter(item => deterministicFilter(item, line.input_packet).disposition === "pass"); const selected = selectInterpretiveCandidates(prepareDeterministicCohort(eligible).prepared).selected;
  assert.equal(selected.length, 3);
  for (const item of selected) { const allowed = item.allowed_target_refs || item.target_resources || []; assert.equal(normalizeInterpretationOutput({ candidate_id: item.candidate_id, target_attribution: { state: "unresolved", resources: [] } }).target_attribution_state, "unresolved"); if (allowed.length) assert.equal(normalizeInterpretationOutput({ candidate_id: item.candidate_id, target_attribution: { state: "established", resources: [allowed[0]] } }).attributed_target_resources.length, 1); }
  const variants = INTERPRETATION_RESPONSE_SCHEMA.properties.results.items.properties.target_attribution.anyOf; assert.equal(variants.find(v => v.properties.state.enum[0] === "established").properties.resources.minItems, 1); assert.equal(variants.find(v => v.properties.state.enum[0] === "unresolved").properties.resources.maxItems, 0);
});

test("semantic, provider, and harness failures retain distinct classifications", () => { assert.equal(isSemanticInterpretationFailure(Object.assign(new Error("INVALID_TARGET_INVARIANT"), { code: "INVALID_TARGET_INVARIANT" })), true); assert.equal(isSemanticInterpretationFailure({ code: "PROVIDER_OUTCOME_UNKNOWN" }), false); assert.equal(isSemanticInterpretationFailure({ code: "ACCEPTANCE_LEDGER_MISSING" }), false); });

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
  const sameLink = prepareDeterministicCohort([candidate("link-b", { candidate_type: "internal_linking", target_resource_type: "directed_page_pair", target_resources: ["page:a", "page:b"] }), candidate("link-a", { candidate_type: "internal_linking", target_resource_type: "directed_page_pair", target_resources: ["page:a", "page:b"] })]);
  assert.deepEqual(sameLink.prepared.map(x => x.candidate_id), ["link-a"]); assert.equal(sameLink.duplicateRejections[0].reason_code, "duplicate_candidate");
  const sameJob = prepareDeterministicCohort([candidate("job-b", { target_resources: [], source_job_identity: "Tyre   care guide" }), candidate("job-a", { target_resources: [], source_job_identity: "tyre care guide" })]);
  assert.deepEqual(sameJob.prepared.map(x => x.candidate_id), ["job-a"]); assert.equal(sameJob.duplicateRejections[0].candidate.candidate_id, "job-b");
});

test("directed links preserve direction and packet exposes it", () => {
  const forward = candidate("forward", { candidate_type: "internal_linking", target_resource_type: "directed_page_pair", target_resources: ["page:a", "page:b"] });
  const reverse = candidate("reverse", { candidate_type: "internal_linking", target_resource_type: "directed_page_pair", target_resources: ["page:b", "page:a"] });
  assert.equal(prepareDeterministicCohort([forward, reverse]).duplicateRejections.length, 0);
  assert.deepEqual(buildInterpretationPacket(forward).link_direction, { source_ref: "page:a", target_ref: "page:b" });
});

test("commerce evidence resolves relations and interpretation text is bounded", () => {
  const item = candidate("commerce", { evidence_refs: [{ source_kind: "commerce", source_record_type: "product_category_relation", source_record_id: "relation-1", source_run_or_generation_reference: "generation-1", relationship: "commerce_product_category_relationship" }] });
  const packet = { commerce: { relations: [{ id: "relation-1", source_run_or_generation_reference: "generation-1" }], products: [], categories: [] }, site: { pages: [] }, business: { name: "B".repeat(5000), market: "GB", language: "en" } };
  assert.ok(resolveEvidenceRef(item.evidence_refs[0], packet)); assert.ok(buildInterpretationPacket(item, packet).evidence_text_chars <= 2000);
});

test("post-interpretation overlap marks only clear redundant repeats", () => {
  const rows = [{ candidate_id: "a", interpretation_state: "complete", customer_job: "same job", attributed_target_resources: ["page:a"], intent_class: "informational", interpretive_disposition: "retain", relevance_state: "relevant", new_asset_fit: "not_applicable", interpretive_reason_codes: [] }, { candidate_id: "b", interpretation_state: "complete", customer_job: "same job", attributed_target_resources: ["page:a"], intent_class: "informational", interpretive_disposition: "retain", relevance_state: "relevant", new_asset_fit: "not_applicable", interpretive_reason_codes: [] }];
  const result = refinePostInterpretationOverlap([candidate("a"), candidate("b")], rows); assert.equal(result[0].interpretive_disposition, "retain"); assert.equal(result[1].interpretive_disposition, "reject_overlap_redundant"); assert.equal(result[1].relevance_state, "relevant"); assert.ok(result[1].interpretive_reason_codes.includes("overlap_redundant"));
});

test("completed durable batch is reused without another provider call", async () => {
  const item = candidate("cached"); let providerCalls = 0; let completionCalls = 0;
  const output = { candidate_id: "cached", customer_job: "job", intent_class: "informational", intent_confidence: "medium", relevance_state: "relevant", target_attribution: { state: "established", resources: ["page:cached"] }, page_type_fit: "aligned", new_asset_fit: "not_applicable", interpretive_disposition: "retain", reason_codes: [], limitations: [] };
  const result = await evaluateCandidates({ candidates: [item], packet: { business: { market: "GB", language: "en" } }, interpretationProvider: { async generate() { providerCalls++; throw new Error("must not call provider"); } }, resolveBatch: async () => ({ reused: true, response: { provider: "test", model: "test", output: [output], usage: {} } }), onBatchComplete: async () => { completionCalls++; } });
  assert.equal(providerCalls, 0); assert.equal(completionCalls, 0); assert.equal(result.rows[0].interpretive_disposition, "retain");
});

test("Slice B retries one failed batch and never exceeds the attempt bound", async () => {
  const item = candidate("retry"); let calls = 0;
  const provider = { async generate({ userPrompt }) { calls++; if (calls === 1) throw new Error("transport"); const requested = JSON.parse(userPrompt).candidates[0]; return { provider: "test", model: "test-model", rawText: JSON.stringify({ results: [{ candidate_id: requested.candidate_id, customer_job: "job", intent_class: "uncertain", intent_confidence: "unknown", relevance_state: "uncertain", target_attribution: { state: "unresolved", resources: [] }, page_type_fit: "unknown", new_asset_fit: "not_applicable", interpretive_disposition: "retain_uncertain", reason_codes: ["uncertain"], limitations: [] }] }), usage: {} }; } };
  const result = await evaluateCandidates({ candidates: [item], packet: { business: { market: "GB", language: "en" } }, interpretationProvider: provider });
  assert.equal(calls, 2); assert.equal(result.modelRequestAttempts, 2); assert.equal(result.rows[0].interpretive_disposition, "retain_uncertain");
});

test("Slice B injected provider batches at ten and records bounded interpretation", async () => {
  const candidates = Array.from({ length: 11 }, (_, i) => candidate(String(i)));
  let calls = 0;
  const provider = { async generate({ responseSchema, userPrompt }) { calls++; assert.ok(responseSchema); const requested = JSON.parse(userPrompt).candidates; return { provider: "test", model: "test-model", rawText: JSON.stringify({ results: requested.map(item => ({ candidate_id: item.candidate_id, customer_job: "job", intent_class: "informational", intent_confidence: "medium", relevance_state: "relevant", target_attribution: { state: "established", resources: item.allowed_target_refs }, page_type_fit: "aligned", new_asset_fit: "not_applicable", interpretive_disposition: "retain", reason_codes: [], limitations: [] })) }), usage: { prompt_tokens: 1, completion_tokens: 1 } }; } };
  const result = await evaluateCandidates({ candidates, packet: { business: { market: "GB", language: "en" } }, interpretationProvider: provider });
  assert.equal(calls, 2); assert.equal(result.interpretedCount, 11); assert.ok(result.outputTokens <= MAX_OUTPUT_TOKENS); assert.equal(MAX_BATCH_SIZE, 10); assert.equal(MAX_PLANNED_CALLS, 5); assert.equal(MAX_TOTAL_ATTEMPTS, 6);
});
