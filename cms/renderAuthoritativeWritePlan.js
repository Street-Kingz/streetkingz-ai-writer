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

export function renderHumanMergeInput(map, { evidenceIds = [] } = {}) {
  const description = map.mappings.product_description_benefits;
  const inventory = description.content_inventory ?? [];
  const omitted = inventory.filter((item) => item.current_supported && !item.candidate_supported).map((item) => item.concept);
  const preserved = inventory.filter((item) => item.current_supported && item.candidate_supported).map((item) => item.concept);
  return `# Human Description Merge Input

Status: **${description.implementation_status}**

This artifact is editorial input only. It does not authorise or perform a WordPress write.

## Exact authoritative current description

${quote(description.exact_current_value)}

## Approved candidate description

${quote(description.approved_candidate)}

## Useful current concepts omitted by the candidate

${omitted.map((value) => `- ${value}`).join("\n") || "- None"}

## Useful concepts already represented by the candidate

${preserved.map((value) => `- ${value}`).join("\n") || "- None"}

## Current wording that may deserve preservation

${omitted.map((value) => `- Preserve the authoritative wording supporting: ${value}.`).join("\n") || "- None"}

## Duplicate or redundant current wording

- Consolidate construction, water-holding and benefit statements where the approved candidate already expresses them.
- Do not repeat search terminology merely to retain every existing phrase.

## Supporting evidence IDs

${evidenceIds.map((value) => `- \`${value}\``).join("\n") || "- See the immutable final human-review artifact; no new evidence was introduced here."}

## Constraints

- Do not introduce new product facts, strategy, FAQs, metadata, internal links or comparisons.
- Preserve useful 90 × 60 cm control context, heavy-rinse positioning, lay/pat/glide usage and wettest-panel wording where supported by the authoritative source.
- Preserve factual limits: no quantified absorbency, superiority, “best”, ranking or unconditional scratch-safety claims.
- Keep Heavy Duty / 1200GSM identity and use “car drying towel” and “microfibre” naturally without stuffing.
- Do not make layout or rendered-position decisions.
- A human must supply and approve the final merged wording before any guarded write.
`;
}
