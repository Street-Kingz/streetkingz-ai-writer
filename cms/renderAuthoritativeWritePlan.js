const quote = (value) => String(value ?? "").split("\n").map((line) => `> ${line}`).join("\n");
export function renderAuthoritativeWritePlan(map) {
  const labels = { title_headings: "Title / H1", product_description_benefits: "Product description", comparisons: "Comparison", clarity_trust: "Clarity / trust" };
  const sections = Object.entries(map.mappings).map(([area, item]) => `## ${labels[area]}

- Source: \`${item.source}\`
- Status: **${item.implementation_status}**
- Operation: \`${item.operation}\`
- Authoritative current-value hash: \`${item.authoritative_value_sha256}\`

### Exact authoritative current value / rollback source

${quote(item.exact_current_value)}

### Approved candidate

${quote(item.approved_candidate)}

### Content that survives

${item.content_that_survives.map((value) => `- ${value}`).join("\n") || "- None"}

### Content that would be removed or omitted

${item.content_that_would_be_removed.map((value) => `- ${value}`).join("\n") || "- None"}

Reason: ${item.reason}
`).join("\n");
  return `# Authoritative CMS Field-Level Write Plan

Approval state: **awaiting_human_implementation_approval**

Product/post ID: **${map.post_id}**

No WordPress write or publication operation was performed.

${sections}

## Drift guards

1. Require live-page hash \`${map.drift_guards.verified_live_hash}\` immediately before writing.
2. Require every authoritative CMS raw-value hash recorded in the mapping artifact.
3. On any mismatch, stop and reverify.
4. Preserve the complete original \`_elementor_data\` and field values for rollback.

## Explicitly blocked

${map.blocked_fields.map((value) => `- ${value}`).join("\n")}
`;
}
