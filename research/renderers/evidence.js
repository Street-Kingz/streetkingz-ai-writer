function displayValue(value) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function renderEvidenceMarkdown(evidence, coverage) {
  const grouped = new Map();
  for (const record of evidence.records) {
    const key = record.value.label;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(record);
  }
  const sections = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, records]) => {
      const rows = records
        .sort((a, b) => a.value.field_path.localeCompare(b.value.field_path))
        .map((record) =>
          `- ${displayValue(record.value.value)}  \n  Evidence: \`${record.evidence_id}\` · Confidence: ${record.confidence.score} · Source: ${record.provenance.source_record_id}`
        )
        .join("\n");
      return `## ${label}\n\n${rows}`;
    })
    .join("\n\n");

  return `# Product Evidence

Product: ${evidence.subject.product_name}

Source facts: ${evidence.subject.product_facts_ref}

Evidence artifact: \`${evidence.evidence_artifact_id}\`

Status: ${coverage.status}

Providers: ${coverage.provider_statuses.map((provider) => `${provider.provider_id} (${provider.status})`).join(", ")}

Usable records: ${coverage.usable_record_count}

AI interpretation: not generated

${sections}

## Provenance note

Every item above has a stable evidence ID and complete machine-readable provenance in \`evidence.json\`. This report is a human-readable view and is not an AI interpretation.
`;
}
