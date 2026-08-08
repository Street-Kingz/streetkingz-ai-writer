import { canonicalJson } from "../core/canonical.js";

function displayValue(value) {
  if (value === undefined || value === null) return "Not available";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return canonicalJson(value);
}

function humanise(value) {
  return String(value || "evidence")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function sectionLabel(record) {
  const label = record.value?.label;
  return typeof label === "string" && label.trim()
    ? label.trim()
    : humanise(record.evidence_type);
}

function recordSortKey(record) {
  return displayValue(
    record.value?.field_path ??
    record.value?.question ??
    record.value?.related_query ??
    record.value?.title ??
    record.value?.url ??
    record.value?.keyword ??
    record.query_or_question ??
    record.evidence_id
  );
}

function recordDisplayValue(record) {
  if (Object.hasOwn(record.value || {}, "value")) return displayValue(record.value.value);
  if (record.evidence_type === "keyword_idea") return displayValue(record.value?.keyword);
  if (record.value?.question) return displayValue(record.value.question);
  if (record.value?.related_query) return displayValue(record.value.related_query);
  if (record.value?.title) return displayValue(record.value.title);
  if (record.value?.url) return displayValue(record.value.url);
  if (Object.hasOwn(record.value || {}, "keyword")) return displayValue(record.value.keyword);
  return displayValue(record.value);
}

export function renderEvidenceMarkdown(evidence, coverage) {
  const grouped = new Map();
  for (const record of evidence.records) {
    const key = sectionLabel(record);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(record);
  }
  const sections = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([label, records]) => {
      const rows = records
        .toSorted((a, b) =>
          recordSortKey(a).localeCompare(recordSortKey(b), "en") ||
          a.evidence_id.localeCompare(b.evidence_id, "en")
        )
        .map((record) =>
          `- ${recordDisplayValue(record)}  \n  Evidence: \`${record.evidence_id}\` · Confidence: ${record.confidence.score} · Source: ${record.provenance.source_record_id}`
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
