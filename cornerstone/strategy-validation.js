import { cornerstoneStrategyJsonSchema } from "./strategy-contracts.js";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function schemaErrors(value, schema, path = "$", rootSchema = schema) {
  if (schema.$ref) {
    const keys = schema.$ref.replace(/^#\//, "").split("/");
    const resolved = keys.reduce((current, key) => current?.[key], rootSchema);
    return resolved ? schemaErrors(value, resolved, path, rootSchema) : [{ code: "SCHEMA_INVALID", path, message: `Unresolved schema reference ${schema.$ref}.` }];
  }
  if (schema.anyOf) {
    if (schema.anyOf.some((candidate) => schemaErrors(value, candidate, path, rootSchema).length === 0)) return [];
    return [{ code: "SCHEMA_INVALID", path, message: "Value does not match any allowed schema." }];
  }
  const errors = [];
  if (schema.type === "object") {
    if (!isObject(value)) return [{ code: "SCHEMA_INVALID", path, message: "Expected object." }];
    for (const key of schema.required || []) if (!(key in value)) errors.push({ code: "REQUIRED_FIELD_MISSING", path: `${path}.${key}`, message: "Required field is absent." });
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!schema.properties[key]) errors.push({ code: "SCHEMA_INVALID", path: `${path}.${key}`, message: "Unknown field is not allowed." });
    for (const [key, child] of Object.entries(schema.properties || {})) if (key in value) errors.push(...schemaErrors(value[key], child, `${path}.${key}`, rootSchema));
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) return [{ code: "SCHEMA_INVALID", path, message: "Expected array." }];
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) errors.push({ code: "SCHEMA_INVALID", path, message: `Array must contain at most ${schema.maxItems} items.` });
    value.forEach((item, index) => errors.push(...schemaErrors(item, schema.items, `${path}[${index}]`, rootSchema)));
  } else if (schema.type === "string" && typeof value !== "string") errors.push({ code: "SCHEMA_INVALID", path, message: "Expected string." });
  else if (schema.type === "boolean" && typeof value !== "boolean") errors.push({ code: "SCHEMA_INVALID", path, message: "Expected boolean." });
  else if (schema.type === "null" && value !== null) errors.push({ code: "SCHEMA_INVALID", path, message: "Expected null." });
  if (schema.enum && !schema.enum.includes(value)) errors.push({ code: "ENUM_INVALID", path, message: `Value must be one of: ${schema.enum.join(", ")}.` });
  return errors;
}

function walk(value, visit, path = "$") {
  visit(value, path);
  if (Array.isArray(value)) value.forEach((item, index) => walk(item, visit, `${path}[${index}]`));
  else if (isObject(value)) for (const [key, item] of Object.entries(value)) walk(item, visit, `${path}.${key}`);
}

function canonicalUrl(value) {
  try { const url = new URL(value); url.hash = ""; return url.toString(); } catch { return null; }
}

export function validateCornerstoneStrategy(output, input) {
  const errors = schemaErrors(output, cornerstoneStrategyJsonSchema(input.entity_allowlists));
  const warnings = [];
  if (!isObject(output)) return { status: "FAIL", errors, warnings };
  if (output.packet_id !== input.packet.packet_id) errors.push({ code: "PACKET_MISMATCH", path: "$.packet_id", message: "Strategy packet_id does not match the supplied packet." });

  const evidenceIds = new Set(input.entity_allowlists.evidence_ids);
  const knownUrls = new Set([
    input.packet.identity.proposed_url,
    ...input.packet.serp.observed_results.map((item) => item.url),
    ...input.packet.streetkingz_relevance.relevant_products.map((item) => item.url),
    ...input.packet.streetkingz_relevance.relevant_categories_pages.map((item) => item.url),
    ...input.packet.streetkingz_relevance.possible_internal_links.flatMap((item) => [item.source_page, item.destination_page])
  ].map(canonicalUrl).filter(Boolean));
  const knownProducts = new Map(input.entity_allowlists.products.map((item) => [item.product_id, item]));
  const knownLinks = new Set(input.entity_allowlists.internal_link_ids);
  const knownMetricNumbers = new Set();
  const metricItems = [input.packet.search_demand.primary_keyword, ...input.packet.search_demand.supporting_queries];
  for (const item of metricItems) for (const value of Object.values(item.metrics || {})) if (typeof value === "number") knownMetricNumbers.add(String(value));

  walk(output, (value, path) => {
    if (path.endsWith(".evidence_ids") && Array.isArray(value)) for (const id of value) if (!evidenceIds.has(id)) errors.push({ code: "UNKNOWN_EVIDENCE_ID", path, message: `Unknown evidence ID: ${id}.` });
    if (typeof value !== "string") return;
    for (const match of value.matchAll(/https?:\/\/[^\s)\]"']+/g)) if (!knownUrls.has(canonicalUrl(match[0]))) errors.push({ code: "INVENTED_URL", path, message: `URL was not supplied: ${match[0]}.` });
    if (/(?:search volume|monthly searches|cpc|clicks|impressions)/i.test(value)) for (const match of value.matchAll(/\b\d+(?:[,.]\d+)?\b/g)) if (!knownMetricNumbers.has(match[0].replace(",", ""))) errors.push({ code: "INVENTED_METRIC", path, message: `Metric value was not supplied: ${match[0]}.` });
    if ((value.length > 1400 || /(^|\n)#{1,6}\s|<p[ >]|<h[1-6][ >]/i.test(value) || value.split(/\n\s*\n/).length > 3)) errors.push({ code: "ARTICLE_BODY_DETECTED", path, message: "Finished article-like content is not allowed." });
  });

  for (const [index, product] of (output.streetkingz_integration?.genuinely_relevant_products || []).entries()) {
    if (!knownProducts.has(product.product_id)) errors.push({ code: "INVENTED_PRODUCT", path: `$.streetkingz_integration.genuinely_relevant_products[${index}].product_id`, message: "Product ID is not present in the packet-backed registry." });
  }
  for (const [index, link] of (output.internal_linking || []).entries()) if (!knownLinks.has(link.link_id)) errors.push({ code: "INVENTED_URL", path: `$.internal_linking[${index}].link_id`, message: "Internal-link ID is not present in the packet-backed registry." });
  const sections = output.structure?.sections || [];
  const sectionKeys = sections.map((item) => item.heading_direction.normalize("NFKC").trim().toLowerCase());
  if (new Set(sectionKeys).size !== sectionKeys.length) errors.push({ code: "DUPLICATE_SECTION", path: "$.structure.sections", message: "Structure contains duplicate section directions." });

  const pageLevelAvailable = input.packet.competitor_coverage.important_differences.some((item) => item.snippet_only === false);
  if (!pageLevelAvailable) walk(output, (value, path) => {
    const assertsOmission = typeof value === "string" && /(?:competitors?|ranking pages?).{0,80}(?:fail|omit|lack|do not|don't|missing|ignore|never cover)/i.test(value);
    const explicitlyRejectsAssertion = path.includes(".cannot_currently_be_claimed[") || /(?:not evidence|cannot (?:currently )?(?:claim|establish)|do not claim|without claiming|not evidence that)/i.test(value || "");
    if (assertsOmission && !explicitlyRejectsAssertion) errors.push({ code: "UNSUPPORTED_COMPETITOR_CLAIM", path, message: "Page-level competitor omission cannot be claimed from snippet-only evidence." });
  });

  if ((output.evidence?.missing_evidence || []).length || (output.open_questions || []).length) warnings.push({ code: "OPEN_EVIDENCE_OR_JUDGEMENT", message: "Strategy preserves evidence gaps or human questions that must be resolved before drafting." });
  if (["needs_more_evidence", "reject_topic"].includes(output.decision?.outcome)) warnings.push({ code: "NON_PROCEED_DECISION", message: `Decision is ${output.decision.outcome}; drafting must remain blocked.` });
  return { status: errors.length ? "FAIL" : warnings.length ? "PASS_WITH_WARNINGS" : "PASS", errors, warnings };
}
