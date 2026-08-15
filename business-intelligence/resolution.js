import { businessAuthorityRankFor } from "./authority.js";

const canonical = (value) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLowerCase() : JSON.stringify(value);

export function resolveBusinessKnowledgeCandidates({ fieldPath, authorityDomain, candidates }) {
  if (!Array.isArray(candidates) || !candidates.length) return { selected: null, conflict: null, resolution_method: "no_candidates" };
  const ranked = candidates.map((candidate, index) => ({ ...candidate, authority_rank: businessAuthorityRankFor(authorityDomain, candidate.source_type), _index: index }));
  if (ranked.some((candidate) => candidate.authority_rank === null)) throw new Error("Candidate contains an unsupported source type.");
  ranked.sort((left, right) => left.authority_rank - right.authority_rank || left._index - right._index);
  const provisional = ranked[0];
  const conflict = ranked.some((candidate) => canonical(candidate.value) !== canonical(provisional.value));
  const selected = { value: provisional.value, knowledge_type: provisional.knowledge_type, assertion_scope: provisional.assertion_scope, evidence_refs: [provisional.evidence_id], confidence: provisional.confidence, status: conflict ? "conflicted" : provisional.status };
  if (!conflict) return { selected, conflict: null, resolution_method: "field_specific_authority" };
  const conflictRecord = { id: `conflict_${fieldPath.replace(/[^a-z0-9]+/gi, "_")}`, field_path: fieldPath, authority_domain: authorityDomain, candidates: ranked.map(({ value, evidence_id, source_type, authority_rank }) => ({ value, evidence_refs: [evidence_id], source_type, authority_rank })), evidence_refs: ranked.map((item) => item.evidence_id), provisional_selection: { value: provisional.value, evidence_refs: [provisional.evidence_id], source_type: provisional.source_type }, resolution_method: ranked[1]?.authority_rank === provisional.authority_rank ? "equal_authority_provisional_selection" : "field_specific_authority", human_review_required: true, final_resolution: null };
  return { selected, conflict: conflictRecord, resolution_method: "field_specific_authority_with_conflict" };
}
