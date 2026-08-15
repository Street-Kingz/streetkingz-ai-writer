import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertValidProductIntelligenceObject } from "./validation.js";

const safeTimestamp = (value) => value.replace(/[:.]/g, "-");
const productSlug = (url) => new URL(url).pathname.split("/").filter(Boolean).at(-1);
const titleCase = (value) => String(value).replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
const displayValue = (value) => value === null ? "Unknown" : typeof value === "object" ? JSON.stringify(value) : String(value);

function unwrap(input) {
  if (input?.product_intelligence_object) return { pio: input.product_intelligence_object, review: input.human_validation || {} };
  return { pio: input, review: {} };
}

function collectKnowledge(value, path = "", output = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectKnowledge(item, `${path}[${index}]`, output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  if (Object.hasOwn(value, "knowledge_type") && Object.hasOwn(value, "evidence_refs")) {
    output.push({ path, item: value });
    return output;
  }
  for (const [key, child] of Object.entries(value)) {
    if (["metadata", "source_evidence", "conflicts", "human_corrections", "execution_metadata", "knowledge_gaps"].includes(key)) continue;
    collectKnowledge(child, path ? `${path}.${key}` : key, output);
  }
  return output;
}

function pathLabel(path) {
  return path.split(".").map((part) => titleCase(part.replace(/\[\d+\]$/, ""))).join(" › ");
}

function evidenceLines(refs, evidenceById) {
  if (!refs?.length) return "  - No evidence reference recorded";
  return refs.map((id) => {
    const evidence = evidenceById.get(id);
    return evidence
      ? `  - ${titleCase(evidence.source_type)} / \`${evidence.source_field}\` — \`${id}\``
      : `  - Unresolved evidence reference — \`${id}\``;
  }).join("\n");
}

function knowledgeBlock(entry, evidenceById, note = "", { showPath = true, headingLabel = null } = {}) {
  const effectiveNote = entry.item.status === "human_corrected" ? "Founder corrected" : note;
  const evidence = entry.item.status === "human_corrected" && !entry.item.evidence_refs.length ? "  - Founder-supplied correction; no source evidence attribution" : evidenceLines(entry.item.evidence_refs, evidenceById);
  return `${showPath ? `### ${headingLabel || pathLabel(entry.path)}\n\n` : ""}${displayValue(entry.item.value)}\n\n- Knowledge type: **${entry.item.knowledge_type}**\n- Confidence: **${entry.item.confidence}**\n- Status: **${entry.item.status}**${effectiveNote ? `\n- Review note: **${effectiveNote}**` : ""}\n- Evidence:\n${evidence}`;
}

function sectionOrEmpty(entries, evidenceById, note, options) {
  return entries.length ? entries.map((entry) => knowledgeBlock(entry, evidenceById, note, options)).join("\n\n---\n\n") : "No information recorded in this section.";
}

function overviewValue(value) {
  return value ? displayValue(value.value) : "Not recorded";
}

export function renderProductIntelligenceReviewReport(input) {
  const { pio, review } = unwrap(input);
  assertValidProductIntelligenceObject(pio);
  const evidenceById = new Map(pio.source_evidence.map((record) => [record.id, record]));
  const knowledge = collectKnowledge(pio);
  const isFocusedCustomerKnowledge = ({ path }) => path.startsWith("customer_understanding.") || path.startsWith("usage_context.use_cases");
  const facts = knowledge.filter((entry) => entry.item.knowledge_type === "fact" && !isFocusedCustomerKnowledge(entry));
  const derived = knowledge.filter((entry) => entry.item.knowledge_type === "derived" && !isFocusedCustomerKnowledge(entry));
  const customer = (field) => knowledge.filter(({ path }) => path.startsWith(`customer_understanding.${field}`));
  const usage = knowledge.filter(({ path }) => path.startsWith("usage_context.use_cases"));
  const potentialAssumptions = knowledge.filter(({ path, item }) => item.status !== "human_corrected" && (item.knowledge_type === "inference" || item.confidence < 0.6 || path.startsWith("customer_understanding.ideal_customers") || path.startsWith("customer_understanding.customer_groups")));
  const unknownValues = knowledge.filter(({ item }) => item.knowledge_type === "unknown");
  const sourceCounts = Object.fromEntries(["woocommerce", "rendered_product_page", "faq", "internal_link"].map((type) => [type, pio.source_evidence.filter((record) => record.source_type === type).length]));
  const price = pio.commercial_information?.price;
  const currency = pio.commercial_information?.currency;
  const displayedPrice = price ? `${currency?.value ? `${currency.value} ` : ""}${displayValue(price.value)}` : "Not recorded";
  const recordedAssumptions = Array.isArray(review.assumptions) ? review.assumptions : [];
  const assumptionText = [
    ...potentialAssumptions.map((entry) => knowledgeBlock(entry, evidenceById, "Needs founder review", { headingLabel: entry.path.startsWith("customer_understanding.ideal_customers") ? "Ideal Customer Assumption" : entry.path.startsWith("customer_understanding.customer_groups") ? "Customer Group Assumption" : null })),
    ...recordedAssumptions.map((assumption, index) => `### Recorded assumption ${index + 1}\n\n${assumption.statement}\n\n- Confidence: **${assumption.confidence}**\n- Review note: **Needs founder review**\n- Evidence:\n${evidenceLines(assumption.evidence_refs, evidenceById)}`)
  ].join("\n\n") || "No explicit inference, low-confidence, customer-persona, or recorded assumption was found.";
  const unknownText = [
    ...unknownValues.map((entry) => knowledgeBlock(entry, evidenceById, "Unknown in the current PIO")),
    ...pio.knowledge_gaps.map((gap) => `### ${gap.field}\n\n- Importance: **${gap.importance}**\n- Reason: ${gap.reason}`)
  ].join("\n\n") || "No unknown values or knowledge gaps were recorded.";

  return `# Product Intelligence Review Report

This report formats the existing Product Intelligence Object for human review. It does not add or reinterpret product intelligence.

## Product Overview

- Product name: ${overviewValue(pio.product_identity.product_name)}
- Product type: ${overviewValue(pio.product_identity.product_type)}
- Brand: ${overviewValue(pio.product_identity.brand)}
- SKU: ${overviewValue(pio.product_identity.sku)}
- Price: ${displayedPrice}
- Category: ${overviewValue(pio.product_identity.category)}
- Validation status: **${pio.validation_status}**
- Product URL: ${pio.metadata.product_url}

## Confirmed Facts

${sectionOrEmpty(facts, evidenceById)}

## Derived Understanding

**This is AI interpretation, not a direct product fact.**

${sectionOrEmpty(derived, evidenceById)}

## Customer Understanding

### Problems Solved

${sectionOrEmpty(customer("problems_solved"), evidenceById, "", { showPath: false })}

### Ideal Customer

${sectionOrEmpty(customer("ideal_customers"), evidenceById, "", { showPath: false })}

### Use Cases

${sectionOrEmpty(usage, evidenceById, "", { showPath: false })}

## Potential Assumptions To Review

${assumptionText}

## Unknown Information

${unknownText}

## Evidence Summary

- WooCommerce: ${sourceCounts.woocommerce}
- Rendered product page: ${sourceCounts.rendered_product_page}
- FAQ: ${sourceCounts.faq}
- Internal links: ${sourceCounts.internal_link}
- Total evidence records: ${pio.source_evidence.length}
- Conflicts: ${(pio.conflicts || []).length}

${(pio.conflicts || []).length ? (pio.conflicts || []).map((conflict) => `- \`${conflict.field}\`: ${conflict.resolution_method}; human review required: ${conflict.human_review_required}`).join("\n") : "No conflicts recorded."}

## Validation Checklist

- [ ] Product identity is correct
- [ ] Specifications are correct
- [ ] Features are correct
- [ ] Benefits are reasonable
- [ ] Customer understanding is accurate
- [ ] Assumptions are approved
- [ ] Unknowns are acceptable
`;
}

export async function writeProductIntelligenceReviewReport(input, { outputRoot = "artifacts/product-intelligence-review", now = () => new Date() } = {}) {
  const { pio } = unwrap(input);
  assertValidProductIntelligenceObject(pio);
  const createdAt = now().toISOString();
  const directory = path.resolve(outputRoot, productSlug(pio.metadata.product_url), safeTimestamp(createdAt));
  await mkdir(directory, { recursive: true });
  const report = path.join(directory, "review-report.md");
  await writeFile(report, renderProductIntelligenceReviewReport(input), { encoding: "utf8", flag: "wx" });
  return { directory, report, createdAt };
}
