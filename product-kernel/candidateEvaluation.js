import crypto from "node:crypto";

export const SLICE_B_EVALUATION_VERSION = "v1-05-slice-b-1";
export const FILTER_VERSION = "v1-05-filter-1";
export const INTERPRETATION_VERSION = "v1-05-interpretation-1";
export const INSTRUCTION_VERSION = "v1-05-slice-b-instructions-1";
export const MAX_INTERPRETIVE_CANDIDATES = 50;
export const MAX_BATCH_SIZE = 10;
export const MAX_PLANNED_CALLS = 5;
export const MAX_TOTAL_ATTEMPTS = 6;
export const MAX_OUTPUT_TOKENS = 20_000;
export const MAX_DEADLINE_MS = 180_000;
export const INTERPRETATION_RESPONSE_SCHEMA = { type: "object", additionalProperties: false, required: ["results"], properties: { results: { type: "array", items: { type: "object", additionalProperties: false, required: ["candidate_id", "customer_job", "intent_class", "intent_confidence", "relevance_state", "target_attribution_state", "attributed_target_resources", "page_type_fit", "new_asset_fit", "interpretive_disposition", "reason_codes", "limitations"], properties: { candidate_id: { type: "string" }, customer_job: { type: "string" }, intent_class: { type: "string", enum: ["product_selection", "category_selection", "comparison_selection", "informational", "mixed_intent", "brand_navigation", "navigation_discovery", "broad_information", "uncertain", "uncertain_selection"] }, intent_confidence: { type: "string", enum: ["high", "medium", "low", "unknown"] }, relevance_state: { type: "string", enum: ["relevant", "irrelevant", "uncertain"] }, target_attribution_state: { type: "string", enum: ["established", "ambiguous", "unresolved", "invalid"] }, attributed_target_resources: { type: "array", items: { type: "string" } }, page_type_fit: { type: "string", enum: ["aligned", "misaligned", "ambiguous", "unknown"] }, new_asset_fit: { type: "string", enum: ["supported", "redundant", "uncertain", "not_applicable"] }, interpretive_disposition: { type: "string", enum: ["retain", "retain_uncertain", "reject_mismatch", "reject_wrong_page_type"] }, reason_codes: { type: "array", items: { type: "string" } }, limitations: { type: "array", items: { type: "string" } } } } } } };

const intents = new Set(["product_selection", "category_selection", "comparison_selection", "informational", "mixed_intent", "brand_navigation", "navigation_discovery", "broad_information", "uncertain", "uncertain_selection"]);
const dispositions = new Set(["retain", "retain_uncertain", "reject_mismatch", "reject_wrong_page_type"]);
const targetStates = new Set(["established", "ambiguous", "unresolved", "invalid"]);
const pageFits = new Set(["aligned", "misaligned", "ambiguous", "unknown"]);
const relevanceStates = new Set(["relevant", "irrelevant", "uncertain"]);
const assetFits = new Set(["supported", "redundant", "uncertain", "not_applicable"]);

const normalise = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const evaluationHash = value => crypto.createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
const source = candidate => [...(candidate.discovery_sources || [])].sort()[0] || "unknown";
const targetKey = candidate => JSON.stringify([...(candidate.target_resources || [])].sort());

export function deterministicFilter(candidate, packet = {}) {
  const reasons = [];
  const market = packet.business?.market;
  const language = packet.business?.language;
  const refs = candidate.evidence_refs || [];
  if (!candidate.candidate_identity || !candidate.candidate_type || !refs.length) reasons.push("malformed_candidate");
  if (market && candidate.market && candidate.market !== market) reasons.push("wrong_market");
  if (language && candidate.language && candidate.language !== language) reasons.push("wrong_language");
  const sourceFacts = refs.map(ref => ref.source_market || ref.market).filter(Boolean);
  const sourceLanguages = refs.map(ref => ref.source_language || ref.language).filter(Boolean);
  if (market && sourceFacts.some(value => value !== market)) reasons.push("wrong_market");
  if (language && sourceLanguages.some(value => value !== language)) reasons.push("wrong_language");
  if ((candidate.target_resources || []).some(ref => String(ref).includes("missing:"))) reasons.push("invalid_target");
  const available = new Set([
    ...(packet.site?.pages || []).flatMap(page => [`page:${page.id}`]),
    ...(packet.commerce?.products || []).map(item => `product:${item.id}`),
    ...(packet.commerce?.categories || []).map(item => `category:${item.id}`)
  ]);
  if ((candidate.target_resources || []).length && available.size && candidate.target_resources.some(ref => !available.has(ref))) reasons.push("invalid_target");
  return { disposition: reasons.length ? "reject" : "pass", reason_codes: reasons };
}

export function groupOverlap(candidates) {
  const groups = new Map();
  const keyFor = candidate => {
    const sourceJob = candidate.source_job_identity || candidate.normalized_source_job || null;
    if (sourceJob) return `job:${normalise(sourceJob)}`;
    const refs = (candidate.evidence_refs || []).map(ref => `${ref.source_kind || ""}:${ref.source_record_id || ""}`).sort();
    return refs.length ? `evidence:${refs.join("|")}` : `target:${targetKey(candidate)}`;
  };
  for (const candidate of candidates) {
    const key = keyFor(candidate);
    if (!groups.has(key)) groups.set(key, `overlap-${evaluationHash(key).slice(0, 16)}`);
  }
  return new Map(candidates.map(candidate => {
    const sourceJob = candidate.source_job_identity || candidate.normalized_source_job || null;
    const refs = (candidate.evidence_refs || []).map(ref => `${ref.source_kind || ""}:${ref.source_record_id || ""}`).sort();
    const key = sourceJob ? `job:${normalise(sourceJob)}` : refs.length ? `evidence:${refs.join("|")}` : `target:${targetKey(candidate)}`;
    return [candidate.candidate_id || candidate.candidate_identity, groups.get(key)];
  }));
}

export function selectInterpretiveCandidates(candidates) {
  const all = [...candidates];
  if (all.length <= MAX_INTERPRETIVE_CANDIDATES) return { selected: all.sort((a, b) => a.candidate_identity.localeCompare(b.candidate_identity)), boundedOut: [], partial: false };
  const groups = new Map();
  for (const candidate of all) {
    const key = `${candidate.candidate_type}:${source(candidate)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
  }
  for (const group of groups.values()) group.sort((a, b) => a.candidate_identity.localeCompare(b.candidate_identity));
  const keys = [...groups.keys()].sort(); const selected = [];
  for (let index = 0; selected.length < MAX_INTERPRETIVE_CANDIDATES; index++) {
    let added = false;
    for (const key of keys) { const candidate = groups.get(key)[index]; if (candidate) { selected.push(candidate); added = true; if (selected.length === MAX_INTERPRETIVE_CANDIDATES) break; } }
    if (!added) break;
  }
  const selectedIds = new Set(selected.map(candidate => candidate.candidate_id));
  return { selected, boundedOut: all.filter(candidate => !selectedIds.has(candidate.candidate_id)), partial: true };
}

export function buildInterpretationPacket(candidate, packet = {}) {
  const allowed = [...(candidate.target_resources || [])].sort();
  const evidence = (candidate.evidence_refs || []).slice(0, 40).map(ref => ({ source_kind: ref.source_kind, source_record_type: ref.source_record_type, source_record_id: ref.source_record_id, source_run_or_generation_reference: ref.source_run_or_generation_reference, relationship: ref.relationship }));
  const ids = new Set(evidence.map(ref => `${ref.source_kind}:${ref.source_record_id}`));
  const sourceFacts = {
    site_pages: (packet.site?.pages || []).filter(row => ids.has(`site:${row.id}`)).map(row => ({ id: row.id, url: row.url, type: row.type, title: row.title, h1: row.h1, canonical: row.canonical, indexable: row.indexable, internal_links: row.internal_links })),
    search_console: (packet.search_console?.rows || []).filter(row => ids.has(`search_console:${row.source_record_id || row.id}`)).map(row => ({ query: row.query, page_id: row.page_id, page_url: row.page_url, period: [row.observed_start_date, row.observed_end_date], market: row.market || null, language: row.language || null })),
    external_search: (packet.external?.rows || []).filter(row => (row.source_record_ids || [row.source_record_id]).some(id => ids.has(`external_search:${id}`))).map(row => ({ query: row.query, market: row.market, language: row.language, serp: (row.serp || []).slice(0, 20).map(item => ({ url: item.url, domain: item.domain, title: item.title, description: item.description })) }))
  };
  const summary = JSON.stringify({ candidate_type: candidate.candidate_type, target_resources: allowed, market: candidate.market, language: candidate.language, discovery_sources: candidate.discovery_sources, evidence_refs: evidence, limitations: candidate.limitations || [], source_facts: sourceFacts });
  return { candidate_id: candidate.candidate_id, candidate_identity: candidate.candidate_identity, allowed_target_refs: allowed, evidence_refs: evidence, bounded_evidence_summary: summary.slice(0, 2000) };
}

export function validateInterpretation(output, candidate) {
  if (!output || output.candidate_id !== candidate.candidate_id || typeof output.customer_job !== "string" || output.customer_job.length > 1000 || !intents.has(output.intent_class) || !["high", "medium", "low", "unknown"].includes(output.intent_confidence) || !relevanceStates.has(output.relevance_state) || !targetStates.has(output.target_attribution_state) || !pageFits.has(output.page_type_fit) || !assetFits.has(output.new_asset_fit) || !dispositions.has(output.interpretive_disposition) || !Array.isArray(output.attributed_target_resources) || !output.attributed_target_resources.every(ref => candidate.target_resources?.includes(ref)) || !Array.isArray(output.reason_codes) || !Array.isArray(output.limitations)) throw new Error("INVALID_INTERPRETATION_OUTPUT");
  return { ...output, reason_codes: Array.isArray(output.reason_codes) ? output.reason_codes.slice(0, 8) : [], limitations: Array.isArray(output.limitations) ? output.limitations.slice(0, 8) : [] };
}

export function buildInterpretationRequest({ candidate, packet }) {
  const input = buildInterpretationPacket(candidate, packet);
  return { systemPrompt: "Interpret only the supplied organic/site evidence. Do not invent targets, facts, metrics or commercial conclusions. Preserve uncertainty. Return only the required structured result.", userPrompt: JSON.stringify(input), input };
}

export async function evaluateCandidates({ candidates, packet, interpretationProvider, signal }) {
  const filterRows = candidates.map(candidate => ({ candidate, filter: deterministicFilter(candidate, packet) }));
  const rejected = filterRows.filter(row => row.filter.disposition === "reject");
  const eligible = filterRows.filter(row => row.filter.disposition === "pass").map(row => row.candidate);
  const bounded = selectInterpretiveCandidates(eligible);
  const results = new Map();
  for (const row of rejected) results.set(row.candidate.candidate_id, { candidate_id: row.candidate.candidate_id, deterministic_disposition: "reject", deterministic_reason_codes: row.filter.reason_codes, interpretation_state: "not_applicable", interpretive_disposition: "not_applicable" });
  for (const candidate of bounded.boundedOut) results.set(candidate.candidate_id, { candidate_id: candidate.candidate_id, deterministic_disposition: "bounded_out", deterministic_reason_codes: [], interpretation_state: "not_applicable", interpretive_disposition: "not_applicable" });
  if (!interpretationProvider && bounded.selected.length) throw new Error("INTERPRETATION_PROVIDER_UNAVAILABLE");
  let attempts = 0; let plannedCalls = 0; let inputTokens = 0; let outputTokens = 0; let model = null; let provider = null;
  const overlapGroups = groupOverlap(candidates);
  const deadline = Date.now() + MAX_DEADLINE_MS;
  const call = async request => {
    if (Date.now() >= deadline) throw new Error("INTERPRETATION_DEADLINE_EXCEEDED");
    const response = await interpretationProvider.generate({ ...request, signal });
    provider = response.provider || provider;
    model = response.model || model;
    inputTokens += Number(response.usage?.prompt_tokens || response.usage?.input_tokens || 0);
    outputTokens += Number(response.usage?.completion_tokens || response.usage?.output_tokens || 0);
    if (outputTokens > MAX_OUTPUT_TOKENS) throw new Error("INTERPRETATION_OUTPUT_TOKEN_BOUND_EXCEEDED");
    return response;
  };
  for (let offset = 0; offset < bounded.selected.length; offset += MAX_BATCH_SIZE) {
    const batch = bounded.selected.slice(offset, offset + MAX_BATCH_SIZE);
    if (plannedCalls >= MAX_PLANNED_CALLS || attempts >= MAX_TOTAL_ATTEMPTS) throw new Error("INTERPRETATION_CALL_BOUND_EXCEEDED");
    const request = { candidates: batch.map(candidate => buildInterpretationRequest({ candidate, packet }).input) };
    plannedCalls++;
    let completed = false;
    for (let retry = 0; retry < 2 && !completed; retry++) {
      if (attempts >= MAX_TOTAL_ATTEMPTS) throw new Error("INTERPRETATION_CALL_BOUND_EXCEEDED");
      attempts++;
      try {
        const response = await call({ systemPrompt: "Interpret each candidate independently from supplied evidence. Do not invent facts or targets. Return a JSON object with a results array.", userPrompt: JSON.stringify(request), responseSchema: INTERPRETATION_RESPONSE_SCHEMA, schemaName: "organic_candidate_interpretation" });
        const outputs = Array.isArray(response.output) ? response.output : JSON.parse(response.rawText || "{}").results;
        if (!Array.isArray(outputs) || outputs.length !== batch.length) throw new Error("INVALID_INTERPRETATION_BATCH");
        outputs.forEach((output, index) => { const validated = validateInterpretation(output, batch[index]); results.set(batch[index].candidate_id, { ...validated, deterministic_disposition: "pass", deterministic_reason_codes: [], overlap_group_id: overlapGroups.get(batch[index].candidate_id) || null, interpretation_state: "complete", interpretive_reason_codes: validated.reason_codes || [] }); });
        completed = true;
      } catch (error) {
        if (retry === 1) throw error;
      }
    }
  }
  return { rows: candidates.map(candidate => results.get(candidate.candidate_id)), discoveredCount: candidates.length, deterministicRejectedCount: rejected.length, postFilterCount: eligible.length, boundedOutCount: bounded.boundedOut.length, interpretedCount: bounded.selected.length, interpretiveRejectedCount: [...results.values()].filter(row => ["reject_mismatch", "reject_wrong_page_type"].includes(row.interpretive_disposition)).length, overlapGroupCount: new Set([...overlapGroups.values()]).size, modelProvider: provider, modelName: model, modelRequestAttempts: attempts, inputTokens, outputTokens, completeness: bounded.partial ? "partial" : "complete", limitations: bounded.partial ? ["interpretation_candidate_cap_hit"] : [] };
}
