function readableEvidence(record) {
  if (!record) return "Unknown evidence";
  const value = record.observation || {};
  if (record.evidence_category === "product_facts") return `${value.label || value.field_path}: ${value.value}`;
  if (record.evidence_category === "keyword_ideas") return `Search term “${value.keyword}” — volume ${value.monthly_search_volume ?? "unavailable"}, difficulty ${value.keyword_difficulty ?? "unavailable"}, CPC ${value.cpc_usd ?? "unavailable"}`;
  if (record.evidence_category === "search_console") return `Query “${value.query}” — ${value.impressions} impressions, ${value.clicks} clicks, CTR ${value.ctr}, average position ${value.average_position}${value.page ? `; page ${value.page}` : ""}`;
  return `${value.serp_item_type || record.evidence_type} for “${value.keyword}” — ${value.question || value.related_query || value.title || value.url || "observation returned"}${value.rank_absolute ? ` (rank ${value.rank_absolute})` : ""}`;
}

function evidenceList(ids, evidenceById) {
  return ids.map((id) => `  - ${readableEvidence(evidenceById.get(id))} (\`${id}\`)`).join("\n") || "  - None";
}

export function renderInterpretationMarkdown(interpretation, context) {
  const evidenceById = new Map((context?.citation_registry?.records || context?.evidence || []).map((record) => [record.evidence_id, record]));
  const evidenceUse = interpretation.category_assessments.map((item) => `### ${item.category}

- Assessment: ${item.assessment}
- Reason no action: ${item.reason_no_action || "Not applicable"}
- Evidence:
${evidenceList(item.evidence_ids, evidenceById)}`).join("\n\n");
  const findings = interpretation.findings.map((finding) => `### ${finding.id}

${finding.finding}

- Confidence: **${finding.confidence}** — ${finding.confidence_reason}
- What the evidence actually shows:
${evidenceList(finding.evidence_ids, evidenceById)}
- Limitations: ${finding.limitations.length ? finding.limitations.join("; ") : "None stated"}`).join("\n\n");
  const decisions = interpretation.decision_areas.map((decision) => `### ${decision.area} — ${decision.outcome}

- Current state: **${decision.current_state}**
- Recommendation: ${decision.recommendation}
- Confidence: **${decision.confidence}** — ${decision.confidence_reason}
- Evidence:
${evidenceList(decision.evidence_ids, evidenceById)}
- External evidence IDs: ${decision.external_evidence_ids.map((id) => `\`${id}\``).join(", ") || "None"}
- Limitations: ${decision.limitations.length ? decision.limitations.join("; ") : "None stated"}`).join("\n\n");
  return `# Product-page interpretation and decision

Product: ${interpretation.source_product.product_name}

Objective: \`${interpretation.objective}\`

Validation: **${interpretation.validation_state}**

Human review: **${interpretation.human_review_state}**

## Overall assessment

${interpretation.overall_assessment}

## Evidence-use report

Available: ${interpretation.evidence_use.categories_available.join(", ")}

Assessed: ${interpretation.evidence_use.categories_assessed.join(", ")}

Materially cited: ${interpretation.evidence_use.categories_materially_cited.join(", ") || "None"}

Unused: ${interpretation.evidence_use.categories_unused.join(", ") || "None"}

${evidenceUse}

## Findings

${findings || "No findings returned."}

## Decision-area review

${decisions}

## Overall limitations

${interpretation.limitations.map((limitation) => `- ${limitation}`).join("\n") || "- None stated"}

## Approval boundary

This validated interpretation is awaiting human review. It cannot flow automatically into content generation, page changes or publication.
`;
}
