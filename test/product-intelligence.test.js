import assert from "node:assert/strict";
import { test } from "node:test";
import { authorityRankFor, SOURCE_AUTHORITY } from "../product-intelligence/authority.js";
import { PRODUCT_INTELLIGENCE_OBJECT_SCHEMA } from "../product-intelligence/contracts.js";
import { resolveKnowledgeCandidates } from "../product-intelligence/resolution.js";
import { validateProductIntelligenceObject } from "../product-intelligence/validation.js";

const NOW = "2026-08-13T10:00:00.000Z";

function evidence(id, sourceType, value) {
  return {
    id,
    source_type: sourceType,
    source_uri_or_location: `fixture://${id}`,
    source_field: "dimensions",
    raw_value: value,
    normalised_value: value,
    retrieved_at: NOW,
    authority_rank: authorityRankFor(sourceType),
    content_fingerprint: `sha256:${id.padEnd(64, "0")}`
  };
}

function knowledge(value, evidenceRefs = [], overrides = {}) {
  return {
    value,
    knowledge_type: "fact",
    evidence_refs: evidenceRefs,
    confidence: 0.9,
    status: "extracted",
    ...overrides
  };
}

function minimalPio() {
  const records = [
    evidence("ev-name", "woocommerce", "Example Towel"),
    evidence("ev-brand", "woocommerce", "Example Brand"),
    evidence("ev-type", "rendered_product_page", "Drying towel")
  ];
  return {
    metadata: {
      object_id: "pio-example-1",
      schema_version: "1.0.0",
      product_url: "https://example.test/product/towel/",
      created_at: NOW,
      updated_at: NOW,
      ingestion_status: "evidence_extracted",
      source_fingerprint: "sha256:source-fixture"
    },
    product_identity: {
      product_name: knowledge("Example Towel", ["ev-name"]),
      brand: knowledge("Example Brand", ["ev-brand"]),
      product_type: knowledge("Drying towel", ["ev-type"])
    },
    source_evidence: records,
    knowledge_gaps: [],
    validation_status: "awaiting_validation"
  };
}

function candidate(record, overrides = {}) {
  return {
    value: record.normalised_value,
    evidence_id: record.id,
    source_type: record.source_type,
    confidence: 0.9,
    ...overrides
  };
}

test("valid minimal Product Intelligence Object passes validation", () => {
  assert.deepEqual(validateProductIntelligenceObject(minimalPio()), []);
  assert.deepEqual(PRODUCT_INTELLIGENCE_OBJECT_SCHEMA.required, [
    "metadata", "product_identity", "source_evidence", "knowledge_gaps", "validation_status"
  ]);
});

test("missing required top-level fields fail clearly", () => {
  const errors = validateProductIntelligenceObject({});
  for (const field of ["metadata", "product_identity", "source_evidence", "knowledge_gaps", "validation_status"]) {
    assert.ok(errors.includes(`${field} is required.`));
  }
});

test("required product identity knowledge fails if absent", () => {
  const pio = minimalPio();
  delete pio.product_identity.brand;
  assert.ok(validateProductIntelligenceObject(pio).includes("product_identity.brand is required."));
});

test("unknown and absent optional product knowledge are allowed", () => {
  const pio = minimalPio();
  pio.product_identity.brand = knowledge(null, [], { knowledge_type: "unknown", confidence: 0, status: "extracted" });
  pio.knowledge_gaps.push({ field: "product_identity.brand", importance: "high", reason: "No brand was present in source evidence." });
  assert.deepEqual(validateProductIntelligenceObject(pio), []);
  assert.equal(pio.commercial_information, undefined);
});

test("confidence outside zero to one is rejected", () => {
  for (const confidence of [-0.01, 1.01, Number.NaN]) {
    const pio = minimalPio();
    pio.product_identity.product_name.confidence = confidence;
    assert.match(validateProductIntelligenceObject(pio).join("\n"), /confidence must be a number between 0 and 1/);
  }
});

test("invalid knowledge, status and source types are rejected", () => {
  const pio = minimalPio();
  pio.product_identity.product_name.knowledge_type = "guess";
  pio.product_identity.product_name.status = "accepted";
  pio.source_evidence[0].source_type = "marketplace";
  const errors = validateProductIntelligenceObject(pio).join("\n");
  assert.match(errors, /knowledge_type is not supported/);
  assert.match(errors, /status is not supported/);
  assert.match(errors, /source_type is not supported/);
});

test("evidence references are validated against source evidence", () => {
  const pio = minimalPio();
  pio.product_identity.product_name.evidence_refs = ["missing-evidence"];
  assert.match(validateProductIntelligenceObject(pio).join("\n"), /unknown evidence ID missing-evidence/);
});

test("central authority order matches the v0.1 hierarchy", () => {
  assert.deepEqual(SOURCE_AUTHORITY, {
    woocommerce: 1,
    rendered_product_page: 2,
    faq: 3,
    internal_link: 4,
    brand_catalogue: 5,
    ai_inference: 6
  });
  assert.equal(authorityRankFor("human_correction"), 0);
});

test("WooCommerce beats rendered-page evidence provisionally", () => {
  const woo = evidence("woo", "woocommerce", "90cm x 60cm");
  const page = evidence("page", "rendered_product_page", "90cm x 70cm");
  const result = resolveKnowledgeCandidates({ field: "specifications.dimensions", candidates: [candidate(page), candidate(woo)] });
  assert.equal(result.selected.value, "90cm x 60cm");
  assert.equal(result.selected.status, "conflicted");
});

test("rendered page beats FAQ", () => {
  const page = evidence("page", "rendered_product_page", "Blue");
  const faq = evidence("faq", "faq", "Red");
  assert.equal(resolveKnowledgeCandidates({ field: "colour", candidates: [candidate(faq), candidate(page)] }).selected.value, "Blue");
});

test("FAQ beats internal links", () => {
  const faq = evidence("faq", "faq", "Machine washable");
  const link = evidence("link", "internal_link", "Hand wash");
  assert.equal(resolveKnowledgeCandidates({ field: "care", candidates: [candidate(link), candidate(faq)] }).selected.value, "Machine washable");
});

test("AI inference cannot override higher-authority factual evidence", () => {
  const catalogue = evidence("cat", "brand_catalogue", "Microfibre");
  const ai = evidence("ai", "ai_inference", "Cotton");
  const result = resolveKnowledgeCandidates({ field: "material", candidates: [candidate(ai, { knowledge_type: "inference" }), candidate(catalogue)] });
  assert.equal(result.selected.value, "Microfibre");
  assert.equal(result.conflict.human_review_required, true);
});

test("higher/lower authority disagreement preserves candidates in an explicit conflict", () => {
  const woo = evidence("woo", "woocommerce", "90cm x 60cm");
  const page = evidence("page", "rendered_product_page", "90cm x 70cm");
  const result = resolveKnowledgeCandidates({ field: "specifications.dimensions", candidates: [candidate(woo), candidate(page)] });
  assert.deepEqual(result.conflict.evidence_refs, ["woo", "page"]);
  assert.equal(result.conflict.provisional_evidence_ref, "woo");
  assert.equal(result.conflict.resolution_method, "authority_precedence");
  assert.equal(result.conflict.final_resolution, null);
});

test("equal-authority disagreement produces an explicit conflict", () => {
  const first = evidence("page-a", "rendered_product_page", "60cm");
  const second = evidence("page-b", "rendered_product_page", "70cm");
  const result = resolveKnowledgeCandidates({ field: "width", candidates: [candidate(first), candidate(second)] });
  assert.equal(result.conflict.resolution_method, "equal_authority_provisional_selection");
  assert.equal(result.conflict.human_review_required, true);
});

test("approved human correction overrides automated resolution without changing evidence", () => {
  const records = [evidence("woo", "woocommerce", "60cm"), evidence("page", "rendered_product_page", "70cm")];
  const snapshot = structuredClone(records);
  const correction = {
    id: "correction-1",
    target_path: "width",
    previous_value: "60cm",
    corrected_value: "65cm",
    reason: "Confirmed against packaging.",
    created_at: NOW,
    status: "approved",
    supersedes_evidence_refs: ["woo", "page"]
  };
  const result = resolveKnowledgeCandidates({ field: "width", candidates: records.map(candidate), corrections: [correction] });
  assert.equal(result.selected.value, "65cm");
  assert.equal(result.selected.status, "human_corrected");
  assert.equal(result.selected.correction_id, "correction-1");
  assert.deepEqual(result.conflict.final_resolution, { value: "65cm", correction_id: "correction-1" });
  assert.equal(result.conflict.human_review_required, false);
  assert.deepEqual(records, snapshot);
});

test("withdrawn and superseded corrections are inactive", () => {
  const woo = evidence("woo", "woocommerce", "60cm");
  for (const status of ["withdrawn", "superseded"]) {
    const result = resolveKnowledgeCandidates({
      field: "width",
      candidates: [candidate(woo)],
      corrections: [{ id: "old", target_path: "width", corrected_value: "65cm", status }]
    });
    assert.equal(result.selected.value, "60cm");
    assert.notEqual(result.selected.status, "human_corrected");
  }
});

test("source and content fingerprints are represented and validated", () => {
  const pio = minimalPio();
  pio.metadata.source_fingerprint = "";
  pio.source_evidence[0].content_fingerprint = "";
  const errors = validateProductIntelligenceObject(pio).join("\n");
  assert.match(errors, /metadata.source_fingerprint/);
  assert.match(errors, /content_fingerprint/);
});

test("execution metadata is optional and bounded", () => {
  assert.deepEqual(validateProductIntelligenceObject(minimalPio()), []);
  const pio = minimalPio();
  pio.execution_metadata = {
    deterministic_steps: ["normalise evidence"],
    ai_calls: [],
    model_used: "future-model",
    input_tokens: 10,
    output_tokens: 5,
    external_api_call_count: 0,
    estimated_cost: 0.001
  };
  assert.deepEqual(validateProductIntelligenceObject(pio), []);
  pio.execution_metadata.input_tokens = -1;
  pio.execution_metadata.estimated_cost = Number.POSITIVE_INFINITY;
  const errors = validateProductIntelligenceObject(pio).join("\n");
  assert.match(errors, /input_tokens must be a non-negative integer/);
  assert.match(errors, /estimated_cost must be a non-negative number/);
});

test("structured domain sections accept bounded v0.1 items", () => {
  const pio = minimalPio();
  pio.specifications = [{ attribute: "Weight", unit: "g", ...knowledge(500, ["ev-type"], { knowledge_type: "derived" }) }];
  pio.features = [knowledge("Dual pile", ["ev-type"])];
  pio.benefits = [{ ...knowledge("Reduces drying passes", ["ev-type"], { knowledge_type: "inference", status: "inferred" }), supporting_feature_refs: ["feature-dual-pile"], reasoning: "Based on absorbency evidence." }];
  pio.customer_understanding = { problems_solved: [knowledge("Slow vehicle drying", [], { knowledge_type: "inference", status: "inferred" })] };
  pio.usage_context = { use_cases: [knowledge("Drying vehicle paint", ["ev-type"])] };
  pio.relationships = [{ relationship_type: "used_with", product_reference: { name: "Car shampoo" }, ...knowledge("Car shampoo", ["ev-type"]) }];
  pio.existing_content = { current_description: [knowledge("Current copy", ["ev-type"])] };
  assert.deepEqual(validateProductIntelligenceObject(pio), []);
});
