import crypto from "node:crypto";
import { canonicalJson } from "./decisionDiscovery.js";

export const SLICE_B_EVALUATION_VERSION = "v1-05-slice-b-6";
export const FILTER_VERSION = "v1-05-filter-3";
export const INTERPRETATION_VERSION = "v1-05-interpretation-7";
export const INSTRUCTION_VERSION = "v1-05-slice-b-instructions-6";
export const MAX_INTERPRETIVE_CANDIDATES = 50;
export const MAX_BATCH_SIZE = 10;
export const MAX_PLANNED_CALLS = 5;
export const MAX_TOTAL_ATTEMPTS = 6;
export const MAX_CALL_OUTPUT_TOKENS = 4000;
export const MAX_OUTPUT_TOKENS = 20_000;
export const MAX_DEADLINE_MS = 180_000;

const intents = new Set(["product_selection", "category_selection", "comparison_selection", "informational", "mixed_intent", "brand_navigation", "navigation_discovery", "broad_information", "uncertain", "uncertain_selection"]);
const dispositions = new Set(["retain", "retain_uncertain", "reject_mismatch", "reject_wrong_page_type", "reject_overlap_redundant"]);
const targetStates = new Set(["established", "ambiguous", "unresolved", "invalid"]);
const pageFits = new Set(["aligned", "misaligned", "ambiguous", "unknown"]);
const relevanceStates = new Set(["relevant", "irrelevant", "uncertain"]);
const assetFits = new Set(["supported", "redundant", "uncertain", "not_applicable"]);
export const INTENT_CLASS_DEFINITIONS = Object.freeze({
  product_selection: "The primary user job is choosing, assessing, or identifying a specific product-level solution or item. Use when the decision is fundamentally at product or item level and explicit comparison between alternatives is not itself the central job.",
  category_selection: "The primary user job is choosing or identifying the appropriate product category, type, family, or class for a need. Use when the decision is at category or type level rather than choosing one specific item.",
  comparison_selection: "The primary user job is explicitly comparing, evaluating, differentiating, or weighing alternatives or trade-offs in order to make a selection. Comparison or evaluation itself must be materially central to the user job.",
  informational: "The primary user job is obtaining specific factual, explanatory, instructional, or knowledge-oriented information about one reasonably bounded topic. The main job is learning or understanding, not selecting an option or locating a destination.",
  mixed_intent: "The bounded evidence materially supports two or more distinct user jobs such that no single intent class adequately represents the whole user need. Use only when multiple materially different jobs genuinely coexist; low confidence, noisy evidence, or several possible labels alone do not make mixed intent.",
  brand_navigation: "The primary user job is reaching, locating, or navigating to a named brand, official brand presence, or brand-owned destination. The brand or site destination is the navigation objective.",
  navigation_discovery: "The primary user job is locating or discovering an appropriate page, resource, destination, or route rather than selecting a product or category or primarily learning information. Use for generic destination or resource discovery.",
  broad_information: "The primary user job is broad or exploratory knowledge seeking whose scope is too general or diffuse to reduce confidently to one specific bounded informational job or a product or category selection job.",
  uncertain: "Use when the bounded evidence does not support a reliable conclusion about the user's primary intent family at all. This is uncertainty about what the user is trying to do, not uncertainty about relevance, target attribution, or page fit.",
  uncertain_selection: "Use when the evidence supports that the user's job belongs to the selection or evaluation family, but does not support resolving it reliably to a firm product, category, or comparison selection classification. Selection-shaped intent is supported; the specific selection classification is not."
});
export const INTENT_HIERARCHY = Object.freeze({
  family_values: Object.freeze(["selection", "information", "navigation", "mixed", "uncertain"]),
  selection_subtypes: Object.freeze(["product", "category", "comparison", "uncertain"]),
  information_scopes: Object.freeze(["bounded", "broad"]),
  navigation_destinations: Object.freeze(["brand", "discovery"])
});
export function buildInterpretationSystemPrompt() {
  const definitions = Object.entries(INTENT_CLASS_DEFINITIONS).map(([name, definition]) => `- ${name}: ${definition}`).join("\\n");
  return `Interpret only the supplied bounded organic evidence. Do not invent facts, targets, metrics, or commercial conclusions. Preserve uncertainty. Return one result for every candidate_id.\\n\\nClassify the USER JOB, never the candidate_type or target page type. First choose exactly one broad intent family: selection, information, navigation, mixed, or uncertain. Then choose only the branch field required by that family: selection uses subtype product, category, comparison, or uncertain; information uses scope bounded or broad; navigation uses destination brand or discovery; mixed and uncertain have no branch field.\\n\\nGeneric leaf meanings:\\n${definitions}\\n\\nBoundary rules: mixed_intent means multiple materially supported jobs coexist, not low confidence or noisy evidence. uncertain means even the broad user-job family cannot be resolved. uncertain_selection means selection/evaluation is clear but its product, category, or comparison subtype is unresolved. Product means a specific item-level decision; category means a type or family-level decision. comparison_selection applies when comparing alternatives or trade-offs is central, rather than incidental. informational is one reasonably bounded knowledge job; broad_information is genuinely broad exploratory information. brand_navigation targets a named brand or official brand destination; navigation_discovery is generic resource or destination discovery. Candidate type and target resources describe a possible intervention/page and must not determine intent.\\n\\nUse relevant when evidence supports the Business job, irrelevant only for clear mismatch, and uncertain when relevance evidence is insufficient. Established attribution requires a supplied allowed target; unresolved requires none. page_type_fit is aligned, misaligned, ambiguous, or unknown. new_asset_fit applies only to new assets. Retain uncertainty; reject only clear mismatch or wrong page type. Never invent targets, facts, commercial priority, or interventions.`;
}
export const REASON_CODES = Object.freeze(["wrong_market", "wrong_language", "invalid_target", "duplicate_candidate", "overlap_redundant", "irrelevant_job", "wrong_page_type", "target_ambiguous", "target_supported", "new_asset_redundant", "new_asset_supported", "brand_navigation", "mixed_intent", "evidence_limited", "uncertain"]);
const reasons = new Set(REASON_CODES);
const normalise = value => String(value || "").toLowerCase().normalize("NFKC").replace(/[^a-z0-9]+/g, " ").trim();
export const evaluationHash = value => crypto.createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
export const interpretationInputHash = (candidate, packet) => evaluationHash(buildInterpretationRequest({ candidate, packet }).input);
export function buildBatchIdentity({ candidates, packet }) { return evaluationHash({ evaluation_version: SLICE_B_EVALUATION_VERSION, filter_version: FILTER_VERSION, interpretation_version: INTERPRETATION_VERSION, instruction_version: INSTRUCTION_VERSION, candidate_ids: candidates.map(c => String(c.candidate_id)).sort(), candidate_input_hashes: candidates.map(c => interpretationInputHash(c, packet)).sort() }); }

const targetAttributionVariants = [
  { type: "object", additionalProperties: false, required: ["state", "resources"], properties: { state: { type: "string", enum: ["established"] }, resources: { type: "array", minItems: 1, items: { type: "string" } } } },
  { type: "object", additionalProperties: false, required: ["state", "resources"], properties: { state: { type: "string", enum: ["unresolved"] }, resources: { type: "array", maxItems: 0, items: { type: "string" } } } },
  { type: "object", additionalProperties: false, required: ["state", "resources"], properties: { state: { type: "string", enum: ["ambiguous"] }, resources: { type: "array", items: { type: "string" } } } },
  { type: "object", additionalProperties: false, required: ["state", "resources"], properties: { state: { type: "string", enum: ["invalid"] }, resources: { type: "array", items: { type: "string" } } } }
];
const hierarchicalIntentVariants = [
  { type: "object", additionalProperties: false, required: ["family", "subtype"], properties: { family: { type: "string", enum: ["selection"] }, subtype: { type: "string", enum: ["product", "category", "comparison", "uncertain"] } } },
  { type: "object", additionalProperties: false, required: ["family", "scope"], properties: { family: { type: "string", enum: ["information"] }, scope: { type: "string", enum: ["bounded", "broad"] } } },
  { type: "object", additionalProperties: false, required: ["family", "destination"], properties: { family: { type: "string", enum: ["navigation"] }, destination: { type: "string", enum: ["brand", "discovery"] } } },
  { type: "object", additionalProperties: false, required: ["family"], properties: { family: { type: "string", enum: ["mixed"] } } },
  { type: "object", additionalProperties: false, required: ["family"], properties: { family: { type: "string", enum: ["uncertain"] } } }
];
export const INTERPRETATION_RESPONSE_SCHEMA = { type: "object", additionalProperties: false, required: ["results"], properties: { results: { type: "array", items: { type: "object", additionalProperties: false, required: ["candidate_id", "customer_job", "intent", "intent_confidence", "relevance_state", "target_attribution", "page_type_fit", "new_asset_fit", "interpretive_disposition", "reason_codes", "limitations"], properties: { candidate_id: { type: "string" }, customer_job: { type: "string", maxLength: 1000 }, intent: { anyOf: hierarchicalIntentVariants }, intent_confidence: { type: "string", enum: ["high", "medium", "low", "unknown"] }, relevance_state: { type: "string", enum: [...relevanceStates] }, target_attribution: { anyOf: targetAttributionVariants }, page_type_fit: { type: "string", enum: [...pageFits] }, new_asset_fit: { type: "string", enum: [...assetFits] }, interpretive_disposition: { type: "string", enum: [...dispositions] }, reason_codes: { type: "array", maxItems: 8, items: { type: "string", enum: REASON_CODES } }, limitations: { type: "array", maxItems: 8, items: { type: "string", maxLength: 120 } } } } } } };

function availableTargetRefs(packet) { return new Set([...(packet.site?.pages || []).flatMap(page => [`page:${page.id}`]), ...(packet.commerce?.products || []).map(item => `product:${item.id}`), ...(packet.commerce?.categories || []).map(item => `category:${item.id}`)]); }

export function resolveEvidenceRef(ref, packet = {}) {
  const source = packet[ref.source_kind === "external_search" ? "external" : ref.source_kind]; const rows = source?.pages || source?.rows || source?.relations || [];
  const record = rows.find((row, index) => String(row.id ?? row.source_record_id ?? `row-${index + 1}`) === String(ref.source_record_id) || (Array.isArray(row.source_record_ids) && row.source_record_ids.map(String).includes(String(ref.source_record_id))));
  if (!record || (ref.source_run_or_generation_reference && String(record.source_run_or_generation_reference || source.selected_run_id || source.generation_id || "") !== String(ref.source_run_or_generation_reference))) return null;
  return { ref, record };
}
function sourceFacts(candidate, packet) { const seen = new Map(); for (const ref of candidate.evidence_refs || []) { const resolved = resolveEvidenceRef(ref, packet); if (resolved) seen.set(`${ref.source_kind}:${resolved.record.id || resolved.record.source_record_id || ref.source_record_id}`, { ...ref, market: resolved.record.market || resolved.record.location || resolved.record.location_code || null, language: resolved.record.language || resolved.record.language_code || null, record: resolved.record }); } return [...seen.values()]; }

export function deterministicFilter(candidate, packet = {}) {
  const found = []; const market = packet.business?.market; const language = packet.business?.language; const facts = sourceFacts(candidate, packet);
  if (!candidate.candidate_identity || !candidate.candidate_type || !(candidate.evidence_refs || []).length) found.push("malformed_candidate");
  if (market && candidate.market && candidate.market !== market) found.push("wrong_market");
  if (language && candidate.language && candidate.language !== language) found.push("wrong_language");
  if (market && facts.some(f => f.market && f.market !== market)) found.push("wrong_market");
  if (language && facts.some(f => f.language && f.language !== language)) found.push("wrong_language");
  const targets = availableTargetRefs(packet); if ((candidate.target_resources || []).some(ref => String(ref).startsWith("missing:") || (targets.size && !targets.has(ref)))) found.push("invalid_target");
  const reason_codes = [...new Set(found)]; return { disposition: reason_codes.length ? "reject" : "pass", reason_codes };
}

function derivedSourceJob(candidate, packet = {}) { if (candidate.source_job_identity || candidate.normalized_source_job) return candidate.source_job_identity || candidate.normalized_source_job; const facts = sourceFacts(candidate, packet); return facts.map(f => f.record.query || f.record.query_text || f.record.job || null).find(Boolean) || null; }
function edgeKeys(candidate, packet = {}) { const job = derivedSourceJob(candidate, packet); const targetKey = candidate.target_resource_type === "directed_page_pair" ? [...(candidate.target_resources || [])].join("->") : [...(candidate.target_resources || [])].sort().join("|"); return new Set([...([job].filter(Boolean).map(v => `job:${normalise(v)}`)), ...(candidate.evidence_refs || []).map(ref => `evidence:${ref.source_kind || ""}:${ref.source_record_id || ""}:${ref.source_run_or_generation_reference || ""}`), ...(targetKey ? [`target:${candidate.candidate_type}:${targetKey}`] : [])]); }
export function prepareDeterministicCohort(candidates) {
  const ordered = [...candidates].sort((a, b) => String(a.candidate_id || a.candidate_identity).localeCompare(String(b.candidate_id || b.candidate_identity)));
  const seen = new Map(); const prepared = []; const duplicateRejections = [];
  for (const candidate of ordered) {
    const rawTargets = [...new Set(candidate.target_resources || [])]; const targets = candidate.target_resource_type === "directed_page_pair" ? rawTargets.join("->") : rawTargets.sort().join("|");
    const job = candidate.source_job_identity || candidate.normalized_source_job;
    const key = targets ? `target:${candidate.candidate_type}:${targets}` : job ? `job:${normalise(job)}` : null;
    if (key && seen.has(key)) { duplicateRejections.push({ candidate, representative: seen.get(key), reason_code: "duplicate_candidate" }); continue; }
    if (key) seen.set(key, candidate); prepared.push(candidate);
  }
  return { prepared, duplicateRejections };
}
export function groupOverlap(candidates, packet = {}) {
  const all = [...candidates].sort((a, b) => String(a.candidate_id || a.candidate_identity).localeCompare(String(b.candidate_id || b.candidate_identity))); const parent = new Map(all.map((c, i) => [c, i]));
  const find = x => { while (parent.get(all[x]) !== x) { parent.set(all[x], parent.get(all[parent.get(all[x])])); x = parent.get(all[x]); } return x; }; const seen = new Map();
  all.forEach((c, i) => edgeKeys(c, packet).forEach(key => { if (seen.has(key)) { const a = find(i), b = find(seen.get(key)); if (a !== b) parent.set(all[a], b); } else seen.set(key, i); }));
  const members = new Map(); all.forEach((c, i) => { const root = find(i); const group = members.get(root) || []; group.push(c); members.set(root, group); }); const result = new Map();
  for (const group of members.values()) if (group.length >= 2) { const id = `overlap-${evaluationHash(group.map(c => c.candidate_identity).sort()).slice(0, 16)}`; group.forEach(c => result.set(c.candidate_id || c.candidate_identity, id)); }
  all.forEach(c => { const id = c.candidate_id || c.candidate_identity; if (!result.has(id)) result.set(id, null); }); return result;
}

export function selectInterpretiveCandidates(candidates) { const groups = new Map(); for (const candidate of candidates) { const source = (candidate.discovery_sources || []).slice().sort()[0] || "unknown"; const key = `${candidate.candidate_type}:${source}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(candidate); } for (const group of groups.values()) group.sort((a, b) => a.candidate_identity.localeCompare(b.candidate_identity)); const selected = []; const keys = [...groups.keys()].sort(); for (let index = 0; selected.length < MAX_INTERPRETIVE_CANDIDATES; index++) { let added = false; for (const key of keys) { if (groups.get(key)[index]) { selected.push(groups.get(key)[index]); added = true; if (selected.length === MAX_INTERPRETIVE_CANDIDATES) break; } } if (!added) break; } const chosen = new Set(selected); return { selected, boundedOut: candidates.filter(candidate => !chosen.has(candidate)).sort((a, b) => a.candidate_identity.localeCompare(b.candidate_identity)), partial: selected.length < candidates.length }; }

function targetDescriptors(packet, refs) { const allowed = new Set(refs); return [...(packet.site?.pages || []).filter(p => allowed.has(`page:${p.id}`)).map(p => ({ ref: `page:${p.id}`, resource_type: "page", page_type: p.type, name: p.title || p.h1 || null, url: p.url, h1: p.h1, canonical: p.canonical, indexable: p.indexable })), ...(packet.commerce?.products || []).filter(p => allowed.has(`product:${p.id}`)).map(p => ({ ref: `product:${p.id}`, resource_type: "product", name: p.name, url: p.canonical_url })), ...(packet.commerce?.categories || []).filter(c => allowed.has(`category:${c.id}`)).map(c => ({ ref: `category:${c.id}`, resource_type: "category", name: c.name }))].sort((a, b) => a.ref.localeCompare(b.ref)); }

export function buildInterpretationPacket(candidate, packet = {}) {
  const allowed = [...new Set(candidate.allowed_target_refs || candidate.target_resources || [])].sort(); const evidence = [...new Map((candidate.evidence_refs || []).map(ref => [`${ref.source_kind}:${ref.source_record_id}:${ref.source_run_or_generation_reference || ""}`, { source_kind: ref.source_kind, source_record_type: ref.source_record_type, source_record_id: ref.source_record_id, source_run_or_generation_reference: ref.source_run_or_generation_reference, relationship: ref.relationship }])).values()].sort((a, b) => `${a.source_kind}:${a.source_record_id}`.localeCompare(`${b.source_kind}:${b.source_record_id}`)).slice(0, 40);
  const facts = sourceFacts(candidate, packet).map(({ source_kind, source_record_id, record }) => ({ source_kind, source_record_id, market: record.market || record.location || record.location_code || null, language: record.language || record.language_code || null, query: record.query || record.query_text || null, page_type: record.type || record.page_type || null, title: record.title || record.result_title || null, url: record.url || record.result_url || null, h1: record.h1 || null, serp: Array.isArray(record.serp) ? record.serp.slice().sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999)).slice(0, 5).map(item => ({ rank: item.rank, domain: item.domain, title: item.title, description: item.description, url: item.url })) : undefined })).slice(0, 40);
  const trim = (value, max) => String(value || "").slice(0, max); const business = { name: trim(packet.business?.name, 160) || null, ecommerce_platform: trim(packet.business?.ecommerce_platform, 80) || null, primary_market: packet.business?.market || null, primary_language: packet.business?.language || null, product_names: (packet.commerce?.products || []).map(p => trim(p.name, 80)).filter(Boolean).sort().slice(0, 20), category_names: (packet.commerce?.categories || []).map(p => trim(p.name, 80)).filter(Boolean).sort().slice(0, 20) }; const limitations = [...new Set([...(candidate.limitations || []), ...(packet.limitations || [])])].slice(0, 8);
  const linkDirection = candidate.target_resource_type === "directed_page_pair" && allowed.length >= 2 ? { source_ref: candidate.target_resources[0], target_ref: candidate.target_resources[1] } : null;
  const result = { evaluation_version: SLICE_B_EVALUATION_VERSION, filter_version: FILTER_VERSION, interpretation_version: INTERPRETATION_VERSION, instruction_version: INSTRUCTION_VERSION, candidate_id: candidate.candidate_id, candidate_identity: candidate.candidate_identity, candidate_type: candidate.candidate_type, source_job: trim(derivedSourceJob(candidate, packet), 240) || null, allowed_target_refs: allowed, target_resource_type: candidate.target_resource_type || null, link_direction: linkDirection, target_descriptors: targetDescriptors(packet, allowed).map(item => ({ ...item, name: trim(item.name, 120), h1: trim(item.h1, 120) })), business, evidence_refs: evidence, bounded_evidence: facts, limitations, evidence_summary_truncated: (candidate.evidence_refs || []).length > 40 };
  const summary = { candidate_identity: result.candidate_identity, candidate_type: result.candidate_type, source_job: result.source_job, allowed_target_refs: result.allowed_target_refs, target_resource_type: result.target_resource_type, link_direction: result.link_direction, target_descriptors: result.target_descriptors, business: result.business, evidence: result.bounded_evidence, limitations: result.limitations };
  let textChars = JSON.stringify(summary).replace(/\\u[0-9a-f]{4}/gi, "x").length; if (textChars > 2000) { result.bounded_evidence = result.bounded_evidence.slice(0, 8); result.target_descriptors = result.target_descriptors.slice(0, 8); result.evidence_summary_truncated = true; result.limitations = [...new Set([...result.limitations, "evidence_summary_truncated"])].slice(0, 8); }
  const boundedSummary = { candidate_identity: result.candidate_identity, candidate_type: result.candidate_type, source_job: result.source_job, allowed_target_refs: result.allowed_target_refs, target_resource_type: result.target_resource_type, link_direction: result.link_direction, target_descriptors: result.target_descriptors, business: result.business, evidence: result.bounded_evidence, limitations: result.limitations };
  return { ...result, evidence_text_chars: JSON.stringify(boundedSummary).length, bounded_evidence_summary: JSON.stringify(boundedSummary) };
}

const nonDescriptiveKey = key => /(^|_)(id|ref|refs|url|type|kind|state|status|canonical|indexable|relationship|market|language|rank|clicks|impressions|ctr)$|(^|_)(candidate|source|target|run|generation)_?(id|ref)?$/i.test(String(key || ""));
function descriptiveTextChars(value, key = "") {
  if (value == null || nonDescriptiveKey(key) || key === "limitations") return 0;
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + descriptiveTextChars(item, key), 0);
  if (typeof value === "object") return Object.entries(value).reduce((sum, [childKey, child]) => sum + descriptiveTextChars(child, childKey), 0);
  return 0;
}
function boundDescriptiveText(value, state, key = "") {
  if (value == null || nonDescriptiveKey(key) || key === "limitations" || typeof value !== "object") {
    if (typeof value !== "string" || nonDescriptiveKey(key) || key === "limitations") return value;
    const kept = Math.max(0, state.remaining); state.remaining = Math.max(0, state.remaining - value.length);
    return value.slice(0, kept);
  }
  if (Array.isArray(value)) return value.map(item => boundDescriptiveText(item, state, key));
  return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, boundDescriptiveText(child, state, childKey)]));
}
function boundModelInput(input) {
  const copy = structuredClone(input); const before = descriptiveTextChars(copy); if (before <= 2000) return { ...copy, model_facing_text_chars: before };
  const bounded = boundDescriptiveText(copy, { remaining: 2000 });
  const after = descriptiveTextChars(bounded);
  if (after > 2000) throw new Error("INTERPRETATION_TEXT_BOUND_EXCEEDED");
  const limitations = [...new Set([...(bounded.limitations || []), "evidence_summary_truncated"])].slice(0, 8);
  return { ...bounded, limitations, evidence_summary_truncated: true, model_facing_text_chars: after };
}

export function validateInterpretation(output, candidate, packet = {}) {
  const allowed = new Set(buildInterpretationPacket(candidate, packet).allowed_target_refs); const ids = output?.attributed_target_resources || [];
  if (!output || typeof output.candidate_id !== "string" || output.candidate_id !== String(candidate.candidate_id) || typeof output.customer_job !== "string" || output.customer_job.length > 1000 || !intents.has(output.intent_class) || !["high", "medium", "low", "unknown"].includes(output.intent_confidence) || !relevanceStates.has(output.relevance_state) || !targetStates.has(output.target_attribution_state) || !pageFits.has(output.page_type_fit) || !assetFits.has(output.new_asset_fit) || !dispositions.has(output.interpretive_disposition) || !Array.isArray(ids) || new Set(ids).size !== ids.length || !ids.every(ref => allowed.has(ref)) || !Array.isArray(output.reason_codes) || output.reason_codes.length > 8 || output.reason_codes.some(code => !reasons.has(code)) || !Array.isArray(output.limitations) || output.limitations.length > 8) throw new Error("INVALID_INTERPRETATION_OUTPUT");
  const semanticFailure = code => { const error = new Error(code); error.code = code; error.validationDiagnostics = { validation_code: code, candidate_id: String(candidate.candidate_id), candidate_type: candidate.candidate_type, target_attribution_state: output.target_attribution_state, attributed_target_count: ids.length, allowed_target_count: allowed.size, all_attributed_refs_allowlisted: ids.every(ref => allowed.has(ref)) }; throw error; };
  if (output.target_attribution_state === "established" && !ids.length) semanticFailure("INVALID_TARGET_INVARIANT"); if (output.target_attribution_state === "unresolved" && ids.length) semanticFailure("INVALID_TARGET_INVARIANT"); if (output.interpretive_disposition === "reject_wrong_page_type" && output.page_type_fit !== "misaligned") semanticFailure("INVALID_PAGE_TYPE_INVARIANT"); if (output.interpretive_disposition === "reject_mismatch" && output.relevance_state !== "irrelevant") semanticFailure("INVALID_RELEVANCE_INVARIANT"); if (candidate.candidate_type !== "new_page_or_content_asset" && output.new_asset_fit !== "not_applicable") semanticFailure("INVALID_NEW_ASSET_INVARIANT");
  return { ...output, reason_codes: [...new Set(output.reason_codes)], limitations: [...new Set(output.limitations)].map(String).map(s => s.slice(0, 120)) };
}

export function normalizeHierarchicalIntent(intent) {
  if (!intent || typeof intent !== "object" || Array.isArray(intent) || typeof intent.family !== "string") {
    const error = new Error("INVALID_INTERPRETATION_OUTPUT"); error.code = error.message; throw error;
  }
  const expectedKeys = { selection: ["family", "subtype"], information: ["family", "scope"], navigation: ["family", "destination"], mixed: ["family"], uncertain: ["family"] };
  const keys = Object.keys(intent).sort(); const familyKeys = expectedKeys[intent.family];
  if (!familyKeys || JSON.stringify(keys) !== JSON.stringify([...familyKeys].sort())) { const error = new Error("INVALID_INTERPRETATION_OUTPUT"); error.code = error.message; throw error; }
  const mapping = {
    "selection:product": "product_selection", "selection:category": "category_selection", "selection:comparison": "comparison_selection", "selection:uncertain": "uncertain_selection",
    "information:bounded": "informational", "information:broad": "broad_information", "navigation:brand": "brand_navigation", "navigation:discovery": "navigation_discovery", mixed: "mixed_intent", uncertain: "uncertain"
  };
  const key = intent.family === "selection" ? `${intent.family}:${intent.subtype}` : intent.family === "information" ? `${intent.family}:${intent.scope}` : intent.family === "navigation" ? `${intent.family}:${intent.destination}` : intent.family;
  const intentClass = mapping[key];
  if (!intentClass) { const error = new Error("INVALID_INTERPRETATION_OUTPUT"); error.code = error.message; throw error; }
  return intentClass;
}

const legacyIntentToHierarchy = Object.freeze({
  product_selection: { family: "selection", subtype: "product" },
  category_selection: { family: "selection", subtype: "category" },
  comparison_selection: { family: "selection", subtype: "comparison" },
  uncertain_selection: { family: "selection", subtype: "uncertain" },
  informational: { family: "information", scope: "bounded" },
  broad_information: { family: "information", scope: "broad" },
  brand_navigation: { family: "navigation", destination: "brand" },
  navigation_discovery: { family: "navigation", destination: "discovery" },
  mixed_intent: { family: "mixed" },
  uncertain: { family: "uncertain" }
});

export function persistedEvaluationToProviderOutput(row) {
  const intent = legacyIntentToHierarchy[row?.intent_class];
  if (!intent || !row?.candidate_id) { const error = new Error("CACHED_EVALUATION_INCOMPATIBLE"); error.code = error.message; throw error; }
  return {
    candidate_id: String(row.candidate_id), customer_job: row.customer_job || "",
    intent, intent_confidence: row.intent_confidence || "unknown",
    relevance_state: row.relevance_state || "uncertain",
    target_attribution: { state: row.target_attribution_state, resources: row.attributed_target_resources || [] },
    page_type_fit: row.page_type_fit || "unknown", new_asset_fit: row.new_asset_fit || "not_applicable",
    interpretive_disposition: row.interpretive_disposition,
    reason_codes: row.interpretive_reason_codes || [], limitations: row.limitations || []
  };
}

export function normalizeInterpretationOutput(output) {
  if (!output || typeof output !== "object" || !output.target_attribution || typeof output.target_attribution !== "object" || Array.isArray(output.target_attribution)) {
    const error = new Error("INVALID_INTERPRETATION_OUTPUT"); error.code = "INVALID_INTERPRETATION_OUTPUT"; throw error;
  }
  const { target_attribution: attribution, intent, intent_class: legacyIntent, ...rest } = output;
  if (typeof attribution.state !== "string" || !Array.isArray(attribution.resources) || attribution.resources.some(ref => typeof ref !== "string")) {
    const error = new Error("INVALID_INTERPRETATION_OUTPUT"); error.code = "INVALID_INTERPRETATION_OUTPUT"; throw error;
  }
  const normalizedIntent = intent ? normalizeHierarchicalIntent(intent) : legacyIntent;
  if (normalizedIntent !== undefined && !intents.has(normalizedIntent)) { const error = new Error("INVALID_INTERPRETATION_OUTPUT"); error.code = error.message; throw error; }
  return { ...rest, ...(normalizedIntent === undefined ? {} : { intent_class: normalizedIntent }), target_attribution_state: attribution.state, attributed_target_resources: [...attribution.resources] };
}

export function buildInterpretationRequest({ candidate, packet }) { const input = buildInterpretationPacket(candidate, packet); const { bounded_evidence_summary, evidence_text_chars, ...modelInput } = input; const boundedInput = boundModelInput(modelInput); return { systemPrompt: buildInterpretationSystemPrompt(), userPrompt: JSON.stringify(boundedInput), input: boundedInput }; }
function notApplicable(candidate, disposition, codes = []) { return { candidate_id: candidate.candidate_id, deterministic_disposition: disposition, deterministic_reason_codes: codes, target_attribution_state: "not_applicable", attributed_target_resources: [], interpretation_state: "not_applicable", interpretive_disposition: "not_applicable", interpretive_reason_codes: [], limitations: [] }; }
export function refinePostInterpretationOverlap(candidates, rows) {
  const groups = new Map(); for (const row of rows) { if (!row || row.interpretation_state !== "complete") continue; const key = `${normalise(row.customer_job)}|${(row.attributed_target_resources || []).slice().sort().join("|")}|${row.intent_class}`; if (key !== "||") (groups.get(key) || groups.set(key, []).get(key)).push(row); }
  const byId = new Map(rows.map(row => [row.candidate_id, { ...row }])); for (const group of groups.values()) if (group.length > 1) { const ordered = group.slice().sort((a, b) => String(a.candidate_id).localeCompare(String(b.candidate_id))); const groupId = `overlap-${evaluationHash(ordered.map(row => row.candidate_id)).slice(0, 16)}`; ordered.forEach((row, index) => { const next = byId.get(row.candidate_id); next.overlap_group_id = groupId; if (index > 0 && row.interpretive_disposition === "retain" && row.new_asset_fit !== "uncertain") { next.interpretive_disposition = "reject_overlap_redundant"; next.interpretive_reason_codes = [...new Set([...(next.interpretive_reason_codes || []), "overlap_redundant"])].slice(0, 8); } }); }
  return rows.map(row => byId.get(row.candidate_id) || row);
}

export async function evaluateCandidates({ candidates, packet, interpretationProvider, signal, resolveBatch, onBatchComplete, onBatchFailure, onRetry }) {
  if (!packet.business?.market || !packet.business?.language) { const error = new Error("BUSINESS_LOCALE_REQUIRED"); error.code = "BUSINESS_LOCALE_REQUIRED"; throw error; }
  const cohort = prepareDeterministicCohort(candidates); const filters = cohort.prepared.map(candidate => ({ candidate, filter: deterministicFilter(candidate, packet) })); const rejected = filters.filter(x => x.filter.disposition === "reject"); const eligible = filters.filter(x => x.filter.disposition === "pass").map(x => x.candidate); const bounded = selectInterpretiveCandidates(eligible); const overlap = groupOverlap(candidates, packet); const results = new Map(rejected.map(x => [x.candidate.candidate_id, notApplicable(x.candidate, "reject", x.filter.reason_codes)])); cohort.duplicateRejections.forEach(x => results.set(x.candidate.candidate_id, notApplicable(x.candidate, "reject", [x.reason_code]))); bounded.boundedOut.forEach(c => results.set(c.candidate_id, notApplicable(c, "bounded_out"))); if (!interpretationProvider && bounded.selected.length) throw new Error("INTERPRETATION_PROVIDER_UNAVAILABLE");
  let attempts = 0, plannedCalls = 0, retryUsed = false, inputTokens = 0, outputTokens = 0, model = null, provider = null; const timeout = AbortSignal.timeout ? AbortSignal.timeout(MAX_DEADLINE_MS) : null; const combined = signal && timeout ? AbortSignal.any([signal, timeout]) : signal || timeout;
  for (let offset = 0; offset < bounded.selected.length; offset += MAX_BATCH_SIZE) { const batchIndex = Math.floor(offset / MAX_BATCH_SIZE); const batch = bounded.selected.slice(offset, offset + MAX_BATCH_SIZE); if (++plannedCalls > MAX_PLANNED_CALLS) throw new Error("INTERPRETATION_CALL_BOUND_EXCEEDED"); const request = { candidates: batch.map(candidate => buildInterpretationRequest({ candidate, packet }).input) }; let done = false;
    while (!done) { let responseMetadata = null; if (++attempts > MAX_TOTAL_ATTEMPTS) throw new Error("INTERPRETATION_CALL_BOUND_EXCEEDED"); try {
      if (combined?.aborted) { const error = new Error("INTERPRETATION_DEADLINE_EXPIRED"); error.code = error.message; throw error; }
      const cached = resolveBatch ? await resolveBatch({ batch, batchIndex, packet, inputHash: buildBatchIdentity({ candidates: batch, packet }) }) : null;
      if (cached?.pending) { const error = new Error("BATCH_PENDING"); error.code = "BATCH_PENDING"; throw error; }
      const response = cached?.response || await interpretationProvider.generate({ systemPrompt: buildInterpretationSystemPrompt(), userPrompt: JSON.stringify(request), responseSchema: INTERPRETATION_RESPONSE_SCHEMA, schemaName: "organic_candidate_interpretation", maxOutputTokens: MAX_CALL_OUTPUT_TOKENS, signal: combined });
      responseMetadata = response; provider = response.provider || provider; model = response.model || model; if (!cached?.reused) { inputTokens += Number(response.usage?.prompt_tokens || response.usage?.input_tokens || 0); outputTokens += Number(response.usage?.completion_tokens || response.usage?.output_tokens || 0); } if (outputTokens > MAX_OUTPUT_TOKENS) throw new Error("INTERPRETATION_OUTPUT_TOKEN_BOUND_EXCEEDED"); const outputs = Array.isArray(response.output) ? response.output : JSON.parse(response.rawText || "{}").results; if (!Array.isArray(outputs) || outputs.length !== batch.length) throw new Error("INVALID_INTERPRETATION_BATCH"); const expected = new Set(batch.map(c => String(c.candidate_id))); const actual = outputs.map(o => String(o?.candidate_id)); if (new Set(actual).size !== actual.length || actual.some(id => !expected.has(id)) || actual.length !== expected.size) throw new Error("INVALID_INTERPRETATION_CANDIDATE_SET");
      const validated = outputs.map(output => { const normalized = normalizeInterpretationOutput(output); const candidate = batch.find(c => String(c.candidate_id) === String(normalized.candidate_id)); const valid = validateInterpretation(normalized, candidate, packet); const row = { ...valid, deterministic_disposition: "pass", deterministic_reason_codes: [], overlap_group_id: overlap.get(candidate.candidate_id) || null, interpretation_state: "complete", interpretive_reason_codes: valid.reason_codes }; results.set(candidate.candidate_id, row); return row; });
      if (onBatchComplete && !cached?.reused) await onBatchComplete({ batch, batchIndex, inputHash: buildBatchIdentity({ candidates: batch, packet }), response, rows: validated }); done = true;
    } catch (error) { if (onBatchFailure) await onBatchFailure({ batch, batchIndex, error, provider: provider || responseMetadata?.provider || null, model: model || responseMetadata?.model || null, response: responseMetadata }); const retryable = !combined?.aborted && !["INTERPRETATION_DEADLINE_EXPIRED", "PROVIDER_DEADLINE_EXPIRED", "PROVIDER_OUTCOME_UNKNOWN"].includes(error.code) && !retryUsed && (!error.code ? /transport|transient|network|timeout/i.test(error.message || "") : ["ETIMEDOUT", "ECONNRESET", "PROVIDER_TRANSIENT"].includes(error.code)) || (!combined?.aborted && !["INTERPRETATION_DEADLINE_EXPIRED", "PROVIDER_DEADLINE_EXPIRED", "PROVIDER_OUTCOME_UNKNOWN"].includes(error.code) && !retryUsed && ["INVALID_INTERPRETATION_BATCH", "INVALID_INTERPRETATION_CANDIDATE_SET", "INVALID_INTERPRETATION_OUTPUT", "INVALID_TARGET_INVARIANT", "INVALID_PAGE_TYPE_INVARIANT", "INVALID_RELEVANCE_INVARIANT"].includes(error.message)); if (!retryable) throw error; if (onRetry && !(await onRetry({ batchIndex, error }))) throw error; retryUsed = true; } }
  }
  const finalRows = refinePostInterpretationOverlap(candidates, candidates.map(c => results.get(c.candidate_id)));
  return { rows: finalRows, discoveredCount: candidates.length, deterministicRejectedCount: rejected.length + cohort.duplicateRejections.length, postFilterCount: eligible.length, boundedOutCount: bounded.boundedOut.length, interpretedCount: bounded.selected.length, interpretiveRejectedCount: finalRows.filter(row => ["reject_mismatch", "reject_wrong_page_type", "reject_overlap_redundant"].includes(row.interpretive_disposition)).length, overlapGroupCount: new Set([...overlap.values()].filter(Boolean)).size, modelProvider: provider, modelName: model, modelRequestAttempts: attempts, plannedCalls, retryUsed, inputTokens, outputTokens, completeness: bounded.partial ? "partial" : "complete", limitations: bounded.partial ? ["interpretation_candidate_cap_hit"] : [] };
}
