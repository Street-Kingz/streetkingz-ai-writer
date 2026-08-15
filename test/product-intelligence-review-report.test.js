import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createSourceEvidence } from "../product-intelligence/evidence.js";
import { renderProductIntelligenceReviewReport, writeProductIntelligenceReviewReport } from "../product-intelligence/reviewReport.js";

const now = "2026-08-13T12:00:00.000Z";
const evidence = createSourceEvidence({ sourceType: "woocommerce", sourceUriOrLocation: "https://streetkingz.co.uk/wp-json/read/70", sourceField: "product.name", rawValue: "Heavy Duty Towel", retrievedAt: now });
const pageEvidence = createSourceEvidence({ sourceType: "rendered_product_page", sourceUriOrLocation: "https://streetkingz.co.uk/product/towel/", sourceField: "specification.gsm", rawValue: "1200GSM", retrievedAt: now });
const kv = (value, knowledgeType = "fact", confidence = 1, ref = evidence.id) => ({ value, knowledge_type: knowledgeType, evidence_refs: [ref], confidence, status: knowledgeType === "fact" ? "extracted" : "inferred" });

function pio() {
  return {
    metadata: { object_id: "pio_test", schema_version: "1.0.0", product_url: "https://streetkingz.co.uk/product/towel/", created_at: now, updated_at: now, ingestion_status: "interpreted_awaiting_human_validation", source_fingerprint: "fingerprint" },
    product_identity: { product_name: kv("Heavy Duty Towel"), brand: { value: null, knowledge_type: "unknown", evidence_refs: [evidence.id], confidence: 0, status: "inferred" }, product_type: kv("Vehicle drying towel", "derived", 0.9, pageEvidence.id), sku: kv("1200TL"), category: kv("Drying Towels") },
    commercial_information: { price: kv("18.99"), currency: kv("GBP") },
    specifications: [{ attribute: "GSM", ...kv("1200", "fact", 1, pageEvidence.id) }],
    features: [kv("1200GSM construction", "fact", 0.95, pageEvidence.id)],
    benefits: [kv("May hold more water", "derived", 0.75, pageEvidence.id)],
    customer_understanding: { problems_solved: [kv("Drying a washed vehicle", "derived", 0.8, pageEvidence.id)], objections: [], ideal_customers: [kv("Car enthusiasts", "derived", 0.55, pageEvidence.id)], customer_groups: [] },
    usage_context: { use_cases: [kv("Post-wash vehicle drying", "derived", 0.85, pageEvidence.id)], instructions: [], limitations: [], compatibility: [] },
    knowledge_gaps: [{ field: "warranty", importance: "medium", reason: "No warranty evidence was found." }],
    source_evidence: [evidence, pageEvidence], conflicts: [], human_corrections: [], validation_status: "awaiting_validation", execution_metadata: { ai_calls: [] }
  };
}

test("valid PIO creates a Markdown review artifact", async () => { const root = await mkdtemp(path.join(tmpdir(), "pio-review-")); const result = await writeProductIntelligenceReviewReport(pio(), { outputRoot: root, now: () => new Date(now) }); const markdown = await readFile(result.report, "utf8"); assert.match(markdown, /^# Product Intelligence Review Report/); });
test("confirmed facts appear with confidence", () => { const markdown = renderProductIntelligenceReviewReport(pio()); assert.match(markdown, /1200GSM construction/); assert.match(markdown, /Confidence: \*\*0\.95\*\*/); });
test("derived knowledge is explicitly labelled as interpretation", () => { const markdown = renderProductIntelligenceReviewReport(pio()); assert.match(markdown, /This is AI interpretation, not a direct product fact/); assert.match(markdown, /May hold more water/); });
test("unknown values and knowledge gaps appear", () => { const markdown = renderProductIntelligenceReviewReport(pio()); assert.match(markdown, /Product Identity › Brand/); assert.match(markdown, /No warranty evidence was found/); });
test("persona and low-confidence assumptions are highlighted", () => { const markdown = renderProductIntelligenceReviewReport(pio()); assert.match(markdown, /Car enthusiasts/); assert.match(markdown, /Needs founder review/); });
test("evidence references and source fields are preserved", () => { const markdown = renderProductIntelligenceReviewReport(pio()); assert.match(markdown, new RegExp(evidence.id)); assert.match(markdown, /`product\.name`/); });
test("missing optional sections do not break rendering", () => { const value = pio(); delete value.commercial_information; delete value.features; delete value.benefits; delete value.customer_understanding; delete value.usage_context; assert.match(renderProductIntelligenceReviewReport(value), /Price: Not recorded/); });
test("invalid PIO fails before rendering", () => { const value = pio(); delete value.product_identity.product_name; assert.throws(() => renderProductIntelligenceReviewReport(value), /failed validation/); });
test("existing wrapper assumptions are displayed without rewriting", () => { const input = { product_intelligence_object: pio(), human_validation: { assumptions: [{ statement: "Founder must confirm professional use.", confidence: 0.5, evidence_refs: [pageEvidence.id] }] } }; const markdown = renderProductIntelligenceReviewReport(input); assert.match(markdown, /Founder must confirm professional use\./); });
test("rendering makes no AI or network calls", () => { let calls = 0; const original = globalThis.fetch; globalThis.fetch = () => { calls += 1; throw new Error("network forbidden"); }; try { const markdown = renderProductIntelligenceReviewReport(pio()); assert.match(markdown, /Validation Checklist/); assert.equal(calls, 0); } finally { globalThis.fetch = original; } });
test("customer review headings do not repeat internal field paths", () => { const markdown = renderProductIntelligenceReviewReport(pio()); assert.equal((markdown.match(/^### Problems Solved$/gm) || []).length, 1); assert.equal((markdown.match(/^### Ideal Customer$/gm) || []).length, 1); assert.equal((markdown.match(/^### Use Cases$/gm) || []).length, 1); assert.doesNotMatch(markdown, /^### Customer Understanding › Problems Solved$/gm); assert.doesNotMatch(markdown, /^### Customer Understanding › Ideal Customers$/gm); assert.doesNotMatch(markdown, /^### Usage Context › Use Cases$/gm); });
