import test from "node:test";
import assert from "node:assert/strict";
import { renderEvidenceMarkdown } from "../research/renderers/evidence.js";

function record({ id, type = "product_fact", label, fieldPath, value, keyword }) {
  const typedValue = type === "keyword_idea"
    ? { keyword, monthly_search_volume: 100 }
    : { label, field_path: fieldPath, value };
  return {
    evidence_id: id,
    evidence_type: type,
    query_or_question: keyword ?? null,
    value: typedValue,
    confidence: { score: 0.8 },
    provenance: { source_record_id: `source:${id}` }
  };
}

const coverage = {
  status: "complete",
  usable_record_count: 5,
  provider_statuses: [
    { provider_id: "product_facts", status: "complete" },
    { provider_id: "dataforseo_keyword_ideas", status: "complete" }
  ]
};

test("renders mixed typed evidence values without changing the evidence", () => {
  const evidence = {
    evidence_artifact_id: "evidence_test",
    subject: { product_name: "Drying Towel", product_facts_ref: "facts.json" },
    records: [
      record({ id: "string", label: "Details", fieldPath: "product.name", value: "Heavy Duty Towel" }),
      record({ id: "number", label: "Details", fieldPath: "product.price", value: 18.99 }),
      record({ id: "undefined", type: "other_observation", label: null, fieldPath: undefined, value: undefined }),
      record({ id: "null", type: "other_observation", label: undefined, fieldPath: undefined, value: null }),
      record({ id: "keyword", type: "keyword_idea", keyword: "microfibre car drying towel" })
    ]
  };
  const before = structuredClone(evidence);

  const summary = renderEvidenceMarkdown(evidence, coverage);

  assert.match(summary, /## Details[\s\S]*Heavy Duty Towel[\s\S]*18\.99/);
  assert.match(summary, /## Keyword Idea[\s\S]*microfibre car drying towel/);
  assert.match(summary, /## Other Observation[\s\S]*Not available/);
  assert.equal(summary.match(/Not available/g)?.length, 2);
  assert.deepEqual(evidence, before);
});

test("summary output is deterministic across evidence record order", () => {
  const records = [
    record({ id: "b", label: "Details", fieldPath: "product.size", value: "90 × 60 cm" }),
    record({ id: "a", label: "Details", fieldPath: "product.name", value: "Heavy Duty Towel" }),
    record({ id: "keyword", type: "keyword_idea", keyword: "car drying towel" })
  ];
  const base = {
    evidence_artifact_id: "evidence_test",
    subject: { product_name: "Drying Towel", product_facts_ref: "facts.json" }
  };

  const first = renderEvidenceMarkdown({ ...base, records }, { ...coverage, usable_record_count: 3 });
  const second = renderEvidenceMarkdown({ ...base, records: [...records].reverse() }, { ...coverage, usable_record_count: 3 });

  assert.equal(second, first);
});
