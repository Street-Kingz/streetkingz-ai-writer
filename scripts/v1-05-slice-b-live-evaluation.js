#!/usr/bin/env node
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { discoverCandidates } from "../product-kernel/decisionDiscovery.js";
import { deterministicFilter, selectInterpretiveCandidates, evaluateCandidates, MAX_PLANNED_CALLS, MAX_TOTAL_ATTEMPTS, MAX_OUTPUT_TOKENS, MAX_CALL_OUTPUT_TOKENS, MAX_DEADLINE_MS } from "../product-kernel/candidateEvaluation.js";
import { createOpenAIInterpretationProvider } from "../interpretation/providers/openai.js";
import { configuredModelPricing, calculateConfiguredCost } from "../interpretation/cost.js";

const mode = process.argv.includes("--smoke") ? "smoke" : process.argv.includes("--formal") ? "formal" : "preview";
const statuses = new Set(["PASS", "QUALITY_FAIL", "PROVIDER_FAIL", "BOUND_FAIL", "HARNESS_FAIL"]);
const emit = value => { const output = { ...value, status: statuses.has(value.status) ? value.status : "HARNESS_FAIL" }; console.log(JSON.stringify(output)); return output; };
const safeId = value => `harness-${crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 24)}`;
const withHarnessIds = candidates => candidates.map(candidate => ({ ...candidate, candidate_id: safeId(candidate.candidate_identity) }));
const classify = error => /BOUND|TOKEN/.test(error?.message || "") ? "BOUND_FAIL" : /PROVIDER|OPENAI|fetch|network|transient|timeout/i.test(error?.message || "") ? "PROVIDER_FAIL" : "HARNESS_FAIL";

try {
  const lines = (await fs.readFile("artifacts/planning/v1-05/fixtures/evaluation-inputs.jsonl", "utf8")).trim().split("\n").filter(Boolean).map(JSON.parse);
  const prepared = lines.map(item => { const candidates = withHarnessIds(discoverCandidates(item.input_packet)); const eligible = candidates.filter(candidate => deterministicFilter(candidate, item.input_packet).disposition === "pass"); return { case_id: item.case_id, packet: item.input_packet, candidates, discovered: candidates.length, eligible: eligible.length, selected: selectInterpretiveCandidates(eligible).selected.length }; });
  const pricing = configuredModelPricing(process.env, process.env.OPENAI_INTERPRETATION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini");
  const frozenMeta = (mode === "preview" || mode === "formal") ? JSON.parse(await fs.readFile("artifacts/planning/v1-05/evaluation-slice-b-expectations.json", "utf8")).cases : [];
  const applicable = mode === "formal" ? prepared.filter(item => frozenMeta.find(label => label.case_id === item.case_id)?.interpretation_applicable) : mode === "preview" ? prepared.filter(item => frozenMeta.find(label => label.case_id === item.case_id)?.interpretation_applicable) : prepared;
  if (mode === "preview") { const planned = applicable.reduce((n, item) => n + Math.ceil(item.selected / 10), 0); const projected = pricing ? calculateConfiguredCost({ inputTokens: 0, outputTokens: Math.min(MAX_OUTPUT_TOKENS, planned * MAX_CALL_OUTPUT_TOKENS), pricing }).cost_usd : null; if (planned > 40 || projected > 5) emit({ mode, stage: "preflight", safe_error_code: "ACCEPTANCE_BOUND_EXCEEDED", provider: "openai", model: process.env.OPENAI_INTERPRETATION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini", strict_output_capability: true, applicable_formal_cases: applicable.length, planned_calls: planned, maximum_attempts: MAX_TOTAL_ATTEMPTS, per_call_max_output_tokens: MAX_CALL_OUTPUT_TOKENS, aggregate_max_output_tokens: MAX_OUTPUT_TOKENS, deadline_ms: MAX_DEADLINE_MS, pricing_status: pricing ? "configured" : "unknown", projected_max_cost_usd: projected }); else emit({ status: "PASS", mode, provider: "openai", model: process.env.OPENAI_INTERPRETATION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini", strict_output_capability: true, applicable_formal_cases: applicable.length, planned_calls: planned, maximum_attempts: MAX_TOTAL_ATTEMPTS, per_call_max_output_tokens: MAX_CALL_OUTPUT_TOKENS, aggregate_max_output_tokens: MAX_OUTPUT_TOKENS, deadline_ms: MAX_DEADLINE_MS, pricing_status: pricing ? "configured" : "unknown", projected_max_cost_usd: projected }); process.exit(0); }
  if (!process.env.V105_LIVE_APPROVED) { emit({ status: "HARNESS_FAIL", mode, stage: "preflight", safe_error_code: "LIVE_APPROVAL_REQUIRED" }); process.exitCode = 1; process.exit(0); }
  const provider = createOpenAIInterpretationProvider(); let calls = 0; const results = [];
  const runCases = mode === "smoke" ? prepared.slice(0, 1) : applicable;
  for (const item of runCases) {
    const result = await evaluateCandidates({ candidates: item.candidates, packet: item.packet, interpretationProvider: { ...provider, async generate(request) { calls++; return provider.generate(request); } } });
    results.push({ case_id: item.case_id, result });
    if (mode === "formal") { const expected = frozenMeta.find(caseLabel => caseLabel.case_id === item.case_id); if (expected) { const primary = result.rows.find(row => row.deterministic_disposition === expected.expected_deterministic_disposition) || result.rows[0]; if (expected.expected_deterministic_disposition === "pass" && primary?.deterministic_disposition !== "pass") throw new Error("QUALITY_FILTER_MISMATCH"); } }
  }
  emit({ status: "PASS", mode, stage: mode === "smoke" ? "smoke" : "formal", safe_error_code: "OK", calls, cases: results.length, model: provider.model, token_totals: { input: results.reduce((n, x) => n + x.result.inputTokens, 0), output: results.reduce((n, x) => n + x.result.outputTokens, 0) }, cost_status: pricing ? "calculated_from_explicit_configuration" : "unknown" });
} catch (error) { emit({ status: classify(error), mode, stage: "execution", safe_error_code: String(error?.code || error?.message || "HARNESS_EXCEPTION").replace(/[^A-Z0-9_]/gi, "_").slice(0, 80), attempt_count: null, model: process.env.OPENAI_INTERPRETATION_MODEL || process.env.OPENAI_MODEL || null }); process.exitCode = 1; }
