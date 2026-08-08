export function renderResearchStateMarkdown(state) {
  const requirements = state.sufficiency.requirements_checked.map((requirement) =>
    `- **${requirement.requirement.replaceAll("_", " ")}** — ${requirement.status}. ${requirement.reason} (${requirement.supporting_evidence_count} supporting evidence records)`
  ).join("\n");
  const providers = state.providers.map((provider) => `${provider.provider_id} (${provider.status}, ${provider.evidence_record_count} records)`).join(", ");
  const missing = state.missing_evidence_categories.length ? state.missing_evidence_categories.join(", ") : "None";
  return `# Research State

Objective: \`${state.objective.type}\`

Research state: \`${state.research_state_id}\`

Product: ${state.subject.product_name}

Source evidence: \`${state.source_evidence.evidence_artifact_id}\` (${state.source_evidence.record_count} active records)

Providers: ${providers}

## Aggregation

- Keyword/topic groups: ${state.keyword_topic_groups.length}
- Relevant site pages: ${state.site_pages.length}
- External ranking pages: ${state.external_pages.length}
- External ranking domains: ${state.external_domains.length}
- SERP feature observations: ${state.serp_feature_observations.length}
- Raw Search Console relationships: ${state.search_console_relationships.raw_relationship_count}
- Canonical Search Console relationships: ${state.search_console_relationships.canonical_relationship_count}
- Duplicate relationships collapsed: ${state.search_console_relationships.duplicate_relationships_collapsed}
- Conflicts preserved: ${state.conflicts.length}
- Missing evidence categories: ${missing}

## Evidence sufficiency

State: **${state.sufficiency.state}**

Interpretation may proceed: **${state.sufficiency.interpretation_may_proceed ? "YES" : "NO"}**

${state.sufficiency.reason}

${requirements}

## Boundary

This artifact reports evidence readiness only. It does not select keywords, recommend content, score opportunities or perform AI interpretation. Every group and requirement refers to immutable source evidence IDs in the machine-readable research-state artifact.
`;
}
