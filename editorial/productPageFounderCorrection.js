import { sha256 } from "../research/core/canonical.js";

/** Create an immutable, human-corrected product-page proposal lineage. */
export function applyProductPageFounderCorrection({ proposal, parentProposalPath, parentProposalSha256, field, originalValue, correctedValue, reason, createdAt = new Date().toISOString() }) {
  if (!proposal || typeof proposal !== "object") throw new Error("PRODUCT_PAGE_PROPOSAL_REQUIRED");
  if (!parentProposalPath || !/^[a-f0-9]{64}$/i.test(String(parentProposalSha256 || ""))) throw new Error("PARENT_PROPOSAL_LINEAGE_REQUIRED");
  const section = proposal.sections?.find((item) => item.section === field);
  if (!section) throw new Error("CORRECTION_FIELD_NOT_FOUND");
  if (JSON.stringify(section.proposed) !== JSON.stringify(originalValue)) throw new Error("CORRECTION_ORIGINAL_VALUE_MISMATCH");
  if (typeof correctedValue !== "string" || !correctedValue.trim()) throw new Error("CORRECTION_VALUE_REQUIRED");
  const corrected = structuredClone(proposal);
  const target = corrected.sections.find((item) => item.section === field);
  target.proposed = correctedValue;
  target.decision = target.current === correctedValue ? "KEEP" : "EDIT";
  target.reason = reason;
  corrected.provenance = {
    ...(corrected.provenance || {}),
    founder_correction: {
      correction_type: "founder_human_editorial_correction",
      parent_proposal_artifact: parentProposalPath,
      parent_proposal_sha256: parentProposalSha256,
      corrected_field: field,
      original_value: originalValue,
      corrected_value: correctedValue,
      reason,
      corrected_at: createdAt,
      source: "human_review"
    }
  };
  return corrected;
}

export function correctedProposalSha256(proposal) { return sha256(JSON.stringify(proposal)); }
