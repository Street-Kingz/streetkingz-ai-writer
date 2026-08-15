import { authorityRankFor } from "./authority.js";

function canonicalValue(value) {
  if (typeof value === "string") return value.trim().replace(/\s+/g, " ").toLowerCase();
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

function activeCorrection(corrections, targetPath) {
  return [...corrections]
    .reverse()
    .find((correction) => correction.target_path === targetPath && correction.status === "approved");
}

export function resolveKnowledgeCandidates({ field, candidates, corrections = [] }) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { selected: null, conflict: null, resolution_method: "no_candidates" };
  }

  const ranked = candidates.map((candidate, index) => {
    const rank = authorityRankFor(candidate.source_type);
    if (rank === null || candidate.source_type === "human_correction") {
      throw new Error(`Unsupported automated candidate source_type: ${candidate.source_type}`);
    }
    return { ...candidate, authority_rank: rank, _index: index };
  }).sort((left, right) => left.authority_rank - right.authority_rank || left._index - right._index);

  const provisional = ranked[0];
  const disagreements = ranked.filter((candidate) => canonicalValue(candidate.value) !== canonicalValue(provisional.value));
  const correction = activeCorrection(corrections, field);
  if (correction) {
    const correctionDisagrees = canonicalValue(correction.corrected_value) !== canonicalValue(provisional.value);
    return {
      selected: {
        value: correction.corrected_value,
        knowledge_type: "fact",
        evidence_refs: [],
        confidence: 1,
        status: "human_corrected",
        correction_id: correction.id
      },
      conflict: (disagreements.length > 0 || correctionDisagrees) ? {
        field,
        candidates: [
          ...ranked.map((candidate) => ({
            value: candidate.value,
            evidence_refs: [candidate.evidence_id],
            source_type: candidate.source_type,
            authority_rank: candidate.authority_rank
          })),
          {
            value: correction.corrected_value,
            evidence_refs: [],
            source_type: "human_correction",
            authority_rank: 0,
            correction_id: correction.id
          }
        ],
        evidence_refs: ranked.map((candidate) => candidate.evidence_id),
        provisional_value: provisional.value,
        provisional_evidence_ref: provisional.evidence_id,
        resolution_method: "approved_human_correction",
        human_review_required: false,
        final_resolution: { value: correction.corrected_value, correction_id: correction.id }
      } : null,
      resolution_method: "approved_human_correction"
    };
  }

  const hasConflict = disagreements.length > 0;
  const selected = {
    value: provisional.value,
    knowledge_type: provisional.knowledge_type || "fact",
    evidence_refs: [provisional.evidence_id],
    confidence: provisional.confidence,
    status: hasConflict ? "conflicted" : (provisional.status || "extracted")
  };

  if (!hasConflict) return { selected, conflict: null, resolution_method: "authority_precedence" };

  return {
    selected,
    conflict: {
      field,
      candidates: ranked.map((candidate) => ({
        value: candidate.value,
        evidence_refs: [candidate.evidence_id],
        source_type: candidate.source_type,
        authority_rank: candidate.authority_rank
      })),
      evidence_refs: ranked.map((candidate) => candidate.evidence_id),
      provisional_value: provisional.value,
      provisional_evidence_ref: provisional.evidence_id,
      resolution_method: ranked[1]?.authority_rank === provisional.authority_rank
        ? "equal_authority_provisional_selection"
        : "authority_precedence",
      human_review_required: true,
      final_resolution: null
    },
    resolution_method: "authority_precedence_with_conflict"
  };
}
