import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { createSourceEvidence } from "../product-intelligence/evidence.js";
import { interpretProductEvidence } from "../product-intelligence/interpretation.js";
import { productIntelligenceInterpretationJsonSchema } from "../product-intelligence/interpretationPrompt.js";

const when = "2026-08-13T12:00:00.000Z";
const ev = createSourceEvidence({ sourceType: "woocommerce", sourceUriOrLocation: "https://streetkingz.co.uk/wp-json/read/70", sourceField: "product.name", rawValue: "Heavy Duty Drying Towel", retrievedAt: when });
const typeEv = createSourceEvidence({ sourceType: "rendered_product_page", sourceUriOrLocation: "https://streetkingz.co.uk/product/towel/", sourceField: "specification.gsm", rawValue: "1200GSM microfibre", retrievedAt: when });
const artifact = { schema_version: "1.0.0", artifact_type: "product_intelligence_raw_evidence", product_url: "https://streetkingz.co.uk/product/towel/", created_at: when, source_fingerprint: "abc123", evidence: [ev, typeEv], conflict_candidates: [], execution_metadata: { ai_calls: 0 } };
const kv = (value, ref = ev.id, overrides = {}) => ({ value, knowledge_type: "fact", evidence_refs: [ref], confidence: 0.95, status: "extracted", ...overrides });
function proposal() {
  return {
    product_identity: { product_name: kv("Heavy Duty Drying Towel"), brand: kv("Street Kingz"), product_type: kv("Vehicle drying towel", typeEv.id, { knowledge_type: "derived", status: "inferred", confidence: 0.85 }), sku: null, category: null, variants: [] },
    commercial_information: { price: null, currency: null, sale_price: null, stock_state: null, availability: null, variants: [], bundles: [] },
    specifications: [{ attribute: "GSM", value: "1200", unit: "GSM", knowledge_type: "fact", evidence_refs: [typeEv.id], confidence: 0.98, status: "extracted" }],
    features: [kv("1200GSM microfibre construction", typeEv.id, { knowledge_type: "derived", status: "inferred", confidence: 0.9 })],
    benefits: [],
    customer_understanding: { problems_solved: [], objections: [], ideal_customers: [], customer_groups: [] },
    usage_context: { use_cases: [], instructions: [], limitations: [], compatibility: [] },
    relationships: [],
    existing_content: { current_description: [], faqs: [], internal_links: [], guides: [], images: [], content_references: [] },
    knowledge_gaps: [{ field: "warranty", importance: "medium", reason: "No warranty evidence was supplied." }],
    assumptions: []
  };
}
function provider(output = proposal()) { return { id: "mock", model: "mock-structured", async generate({ userPrompt, responseSchema }) { assert.ok(!userPrompt.includes("elementor_document")); assert.deepEqual(responseSchema.$defs.evidence_id.enum, [ev.id, typeEv.id]); assert.equal(responseSchema.properties.product_identity.properties.product_name.properties.evidence_refs.items.$ref, "#/$defs/evidence_id"); return { provider: "mock", model: "mock-structured", rawText: JSON.stringify(output), usage: { prompt_tokens: 100, completion_tokens: 50 } }; } }; }

test("valid structured AI output creates a validated PIO and preserves evidence refs", async () => {
  const result = await interpretProductEvidence({ evidenceArtifact: artifact, provider: provider(), writeArtifacts: false, now: () => new Date(when) });
  assert.equal(result.pio.product_identity.product_name.evidence_refs[0], ev.id);
  assert.equal(result.pio.validation_status, "awaiting_validation");
  assert.deepEqual(result.pio.source_evidence, artifact.evidence);
  assert.equal(result.artifact.human_validation.status, "awaiting_validation");
  assert.deepEqual(result.artifact.human_validation.unknowns, { knowledge_gaps: result.pio.knowledge_gaps, unknown_values: [] });
  assert.equal(result.pio.execution_metadata.ai_calls.length, 1);
});

test("missing required identity fields fail deterministically", async () => { const value = proposal(); delete value.product_identity.brand; await assert.rejects(() => interpretProductEvidence({ evidenceArtifact: artifact, provider: provider(value), writeArtifacts: false }), (error) => error.errors.some((item) => item.includes("product_identity.brand"))); });
test("unsupported knowledge types fail", async () => { const value = proposal(); value.features[0].knowledge_type = "guess"; await assert.rejects(() => interpretProductEvidence({ evidenceArtifact: artifact, provider: provider(value), writeArtifacts: false }), /failed validation/); });
test("confidence outside zero to one fails", async () => { const value = proposal(); value.features[0].confidence = 1.1; await assert.rejects(() => interpretProductEvidence({ evidenceArtifact: artifact, provider: provider(value), writeArtifacts: false }), /failed validation/); });
test("unknown knowledge values are allowed", async () => { const value = proposal(); value.usage_context.limitations.push({ value: null, knowledge_type: "unknown", evidence_refs: [], confidence: 0, status: "inferred" }); const result = await interpretProductEvidence({ evidenceArtifact: artifact, provider: provider(value), writeArtifacts: false }); assert.equal(result.pio.usage_context.limitations[0].value, null); });
test("unsupported claims without evidence are rejected", async () => { const value = proposal(); value.benefits.push({ value: "Dries twice as fast", knowledge_type: "inference", evidence_refs: [], confidence: 0.9, status: "inferred", supporting_feature_refs: [], reasoning: "Assumed" }); await assert.rejects(() => interpretProductEvidence({ evidenceArtifact: artifact, provider: provider(value), writeArtifacts: false }), (error) => error.errors.some((item) => item.includes("unsupported"))); });
test("unknown evidence references are rejected", async () => { const value = proposal(); value.features[0].evidence_refs = ["missing"]; await assert.rejects(() => interpretProductEvidence({ evidenceArtifact: artifact, provider: provider(value), writeArtifacts: false }), /failed validation/); });
test("artifact writer creates PIO, validation and metadata artifacts", async () => { const root = await mkdtemp(join(tmpdir(), "pio-interpretation-")); const result = await interpretProductEvidence({ evidenceArtifact: artifact, provider: provider(), outputRoot: root, now: () => new Date(when) }); assert.equal(JSON.parse(await readFile(result.files.productIntelligence, "utf8")).artifact_type, "product_intelligence_interpretation"); assert.equal(JSON.parse(await readFile(result.files.validation, "utf8")).valid, true); });
test("mocked interpretation makes no WordPress or network calls", async () => { let calls = 0; const original = globalThis.fetch; globalThis.fetch = async () => { calls++; throw new Error("network forbidden"); }; try { await interpretProductEvidence({ evidenceArtifact: artifact, provider: provider(), writeArtifacts: false }); assert.equal(calls, 0); } finally { globalThis.fetch = original; } });
