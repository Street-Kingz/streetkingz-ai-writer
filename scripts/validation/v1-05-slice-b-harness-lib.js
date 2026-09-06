export const COMMERCIAL_KEYS = new Set(["price", "regular_price", "current_price", "sale_price", "stock_quantity", "stock_status", "sales", "revenue", "COGS", "cogs", "margin", "commercial_constraints"]);

export function stripCommercial(value) {
  if (Array.isArray(value)) return value.map(stripCommercial);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !COMMERCIAL_KEYS.has(key)).map(([key, child]) => [key, stripCommercial(child)]));
}

export function commercialPacketInvariant(challenger, control) { return JSON.stringify(challenger) === JSON.stringify(control); }
export function canRequestCase(ledger, caseId) { const state = ledger.cases?.[caseId] || { actual_request_attempts: 0, state: "not_started" }; return state.state !== "unknown_provider_outcome" && state.actual_request_attempts < 2 && Number(ledger.total_request_count || 0) < 40; }
export function recordAcceptanceAttempt(ledger, caseId, mode = "formal") { const next = structuredClone(ledger); next.cases ||= {}; const state = next.cases[caseId] || { actual_request_attempts: 0, state: "not_started" }; if ((mode === "smoke" && Number(next.smoke_request_count || 0) >= 1) || !canRequestCase(next, caseId)) throw new Error("ACCEPTANCE_REQUEST_BOUND"); next.total_request_count = Number(next.total_request_count || 0) + 1; state.actual_request_attempts++; next.cases[caseId] = state; next[mode === "smoke" ? "smoke_request_count" : "formal_request_count"] = Number(next[mode === "smoke" ? "smoke_request_count" : "formal_request_count"] || 0) + 1; return next; }
export function cacheMatches(cache, identity) { const fields = ["session_id", "committed_sha", "provider", "model", "input_hash", "expectation_hash", "corpus_hash", "evaluation_version", "interpretation_version", "instruction_version", "packet_hash", "primary_candidate_identity"]; return fields.every(field => cache?.[field] === identity[field]); }
export function accountProviderFailure(ledger, error, pricingCost = null, usage = {}) { const next = structuredClone(ledger); next.input_tokens = Number(next.input_tokens || 0) + Number(usage.input_tokens || usage.prompt_tokens || 0); next.output_tokens = Number(next.output_tokens || 0) + Number(usage.output_tokens || usage.completion_tokens || 0); if (error?.code === "PROVIDER_OUTCOME_UNKNOWN" || pricingCost === null) { next.cost_status = "unknown"; next.estimated_cost_usd = null; } else if (next.cost_status !== "unknown") next.estimated_cost_usd = Number(((next.estimated_cost_usd || 0) + pricingCost).toFixed(8)); return next; }
