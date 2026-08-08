const quote = (values) => values.length ? values.map((value) => value.split("\n").map((line) => `> ${line}`).join("\n")).join("\n>\n") : "> No unique rendered target identified.";

export function renderImplementationDiff(verification) {
  const labels = { title_headings: "Title / H1", product_description_benefits: "Product description", comparisons: "Comparison", clarity_trust: "Clarity / trust" };
  const sections = verification.implementation_mappings.map((mapping) => `## ${labels[mapping.decision_area] || mapping.decision_area}

### Current live content

${quote(mapping.current_live_content)}

### Approved candidate

${quote([mapping.approved_candidate])}

### Proposed operation

${mapping.operation}

### Reason

${mapping.reason}

### Evidence / approval provenance

- Final review SHA-256: \`${verification.source_final_review_sha256}\`
- Source generation SHA-256: \`${verification.source_generation_sha256}\`
- Source locators: ${mapping.source_locators.length ? mapping.source_locators.map((item) => `\`${item}\``).join(", ") : "none"}

### Implementation notes

${mapping.implementation_notes.map((item) => `- ${item}`).join("\n")}
${mapping.preserve_current_content?.length ? `\n### Existing content that must be preserved\n\n${quote(mapping.preserve_current_content)}` : ""}
`).join("\n");
  return `# Proposed Product-Page Implementation Diff

State: awaiting human implementation approval

Verified content hash: \`${verification.verified_content_hash}\`

This is a deterministic mapping artifact. It does not modify the page, infer CMS field ownership or authorise publication.

${sections}

## Explicit exclusions

- No standalone differentiation implementation was produced because the final human decision rejected it.
- FAQ addition, metadata, specifications, care/usage and internal linking remain outside implementation scope.
- No WordPress field ownership, layout or publication action is inferred from rendered HTML.

## Drift guard

Immediately before any future write, retrieve the page and compare its content hash with \`${verification.verified_content_hash}\`. On mismatch: STOP and reverify.
`;
}
