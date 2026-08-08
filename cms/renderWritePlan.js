const quote = (value) => String(value || "").split("\n").map((line) => `> ${line}`).join("\n");

export function renderCmsWritePlan(fieldMap) {
  const labels = { title_headings: "Title / H1", product_description_benefits: "Product description", comparisons: "Comparison", clarity_trust: "Clarity / trust" };
  const sections = Object.entries(fieldMap.field_mappings).map(([area, mapping]) => `## ${labels[area]}

- **Product/post ID:** ${fieldMap.product_post_id}
- **CMS storage:** ${mapping.cms_storage_type}.${mapping.field_identifier}
- **Mapping status:** ${mapping.mapping_status}
- **Proposed operation:** ${mapping.proposed_operation || "replace_field"}
- **Raw stored value available:** ${mapping.raw_stored_value_available ? "YES" : "NO"}
- **Current-value hash:** \`${mapping.cms_current_value_sha256}\`

### Current rendered target

${quote(mapping.current_rendered_value)}

### Approved candidate

${quote(mapping.target_content)}

### ${mapping.raw_stored_value_available ? "Current CMS value / rollback source" : "Observed value (not a complete rollback source)"}

${quote(mapping.current_stored_value)}

### Content that survives unchanged

${(mapping.content_that_survives_unchanged || []).map((item) => `- ${item}`).join("\n") || "- The field-level change must preserve all content outside the exact authorised target."}

### Content that would be removed

${(mapping.content_that_would_be_removed || mapping.content_that_would_be_removed_by_verbatim_section_replacement || []).map((item) => `- ${item}`).join("\n") || "- Only the exact current target quoted above."}

### Implementation conditions

- Do not write unless the live page hash still equals \`${fieldMap.verified_live_content_hash}\`.
- ${mapping.cms_hash_guard_eligible ? `Do not write unless the current CMS value hash still equals \`${mapping.cms_current_value_sha256}\`.` : "BLOCKED: capture the authoritative raw CMS value, its hash and its exact rollback value before writing."}
- ${mapping.rollback_source_complete ? "Preserve the rollback source exactly." : "The rendered/view-context value above is diagnostic only and cannot serve as a lossless rollback source."}
- ${mapping.mapping_reason}
`).join("\n");
  return `# Heavy Duty Drying Towel – CMS Field-Level Write Plan

Approval state: **awaiting_human_implementation_approval**

Product/post ID: **${fieldMap.product_post_id}**

No WordPress write or publication operation was performed.

${sections}

## Explicitly blocked fields and operations

${fieldMap.blocked_fields.map((item) => `- ${item}`).join("\n")}

The product slug remains \`${fieldMap.cms_record.slug}\` and no slug change is authorised.

## Drift and rollback contract

1. Retrieve the live page immediately before any future write and require its hash to equal \`${fieldMap.verified_live_content_hash}\`.
2. First obtain the authoritative raw value for every target whose raw value is unavailable; no such target is write-eligible yet.
3. Read each target CMS field immediately before writing and require its raw-value hash to equal the authoritative recorded field hash.
4. On either mismatch, stop and reverify.
5. Preserve each exact raw CMS value as the rollback source.
6. A future write remains subject to separate human implementation approval and post-write verification.
`;
}
