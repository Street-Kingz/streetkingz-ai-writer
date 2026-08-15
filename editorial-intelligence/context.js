import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { stableId } from "../research/core/canonical.js";
import { assertValidBusinessIntelligenceObject } from "../business-intelligence/validation.js";
import { assertValidProductIntelligenceObject } from "../product-intelligence/validation.js";

export const EDITORIAL_INTELLIGENCE_CONTEXT_VERSION = "1.0.0";

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const knowledge = (value) => isObject(value) && Object.hasOwn(value, "value") && Object.hasOwn(value, "knowledge_type") && Object.hasOwn(value, "evidence_refs");
const clone = (value) => structuredClone(value);
const effective = (value) => knowledge(value) ? clone(value) : value;
const entries = (section, fields) => Object.fromEntries(fields.filter((field) => section?.[field] !== undefined).map((field) => [field, Array.isArray(section[field]) ? section[field].map(effective) : effective(section[field])]));
const values = (items = []) => items.filter((item) => knowledge(item) && item.value !== null).map((item) => String(item.value));
const tokens = (value) => new Set(String(value).toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 3));

function unwrapBusiness(input) { return input; }
function unwrapProduct(input) { return input?.product_intelligence_object || input; }

function meaningfulAudienceConflict(business, product) {
  const businessAudience = values(business.customer_understanding?.target_customer_groups)[0];
  const productAudience = values(product.customer_understanding?.ideal_customers)[0];
  if (!businessAudience || !productAudience) return null;
  const businessTokens = tokens(businessAudience); const productTokens = tokens(productAudience);
  const overlap = [...productTokens].filter((token) => businessTokens.has(token)).length / Math.max(Math.min(productTokens.size, businessTokens.size), 1);
  if (overlap >= 0.2) return null;
  return { type: "audience_scope_conflict", field: "audience", business_value: businessAudience, product_value: productAudience, resolution: "business_wide_audience_remains_primary; product_specific_audience_requires_review" };
}

function projectBusiness(bio) {
  return {
    identity: entries(bio.business_identity, ["business_name", "business_type", "owned_brand_status", "geographic_market", "sales_channel", "business_description"]),
    catalogue: entries(bio.catalogue_understanding, ["product_focus", "primary_categories", "catalogue_coherence"]),
    audience: { architecture: entries(bio.audience_architecture, ["type", "business_wide_profile_status"]), customer_groups: entries(bio.customer_understanding, ["target_customer_groups", "customer_behaviours", "customer_motivations", "customer_priorities", "customer_problems", "purchase_drivers", "exclusions"]) },
    positioning: entries(bio.positioning, ["value_proposition", "positioning_themes", "differentiators", "positioning_claims", "price_value_orientation"]),
    relevant_claims: entries(bio.positioning, ["positioning_claims"])
  };
}

function projectProduct(pio) {
  return {
    identity: entries(pio.product_identity, ["product_name", "brand", "product_type", "sku", "model_number", "category", "variants"]),
    commercial: entries(pio.commercial_information, ["price", "currency", "availability", "sale_price", "stock_state", "variants", "bundles"]),
    specifications: (pio.specifications || []).map(clone),
    features: (pio.features || []).map(effective),
    benefits: (pio.benefits || []).map(clone),
    customer_understanding: entries(pio.customer_understanding, ["problems_solved", "objections", "ideal_customers", "customer_groups"]),
    usage: entries(pio.usage_context, ["use_cases", "instructions", "limitations", "compatibility"]),
    relationships: (pio.relationships || []).map(clone),
    existing_content: entries(pio.existing_content, ["current_description", "faqs", "guides", "content_references"])
  };
}

function relevantGaps(bio, pio) {
  const keep = (gap) => /audience|customer|compatib|position|price|claim|performance|specif|benefit|brand|market|care|instruction|usage/i.test(`${gap.field} ${gap.reason}`);
  return { business: (bio.knowledge_gaps || []).filter(keep).map(clone), product: (pio.knowledge_gaps || []).filter(keep).map(clone) };
}

export function validateEditorialIntelligenceContext(context) {
  const errors = [];
  if (!isObject(context)) return ["EditorialIntelligenceContext must be an object."];
  if (context.metadata?.schema_version !== EDITORIAL_INTELLIGENCE_CONTEXT_VERSION) errors.push("metadata.schema_version is unsupported.");
  if (!context.business || !context.product || !context.audience || !context.editorial_objective || !context.editorial_boundaries) errors.push("required context sections are missing.");
  if (context.provenance_summary?.business_validation_status !== "validated") errors.push("validated Business Intelligence provenance is required.");
  if (context.provenance_summary?.product_validation_status !== "validated") errors.push("validated Product Intelligence provenance is required.");
  if (context.editorial_objective?.primary_objective !== "persuade_the_intended_customer_to_buy") errors.push("editorial objective must explicitly prioritise persuasion.");
  if (context.editorial_objective?.accuracy_boundary !== "use_only_supported_or_permitted_intelligence") errors.push("accuracy boundary is required.");
  if (!context.editorial_boundaries?.permitted_persuasion) errors.push("permitted persuasive use must be explicit.");
  if (context.conflicts && !Array.isArray(context.conflicts)) errors.push("conflicts must be an array.");
  const forbidden = (value, pathName = "$") => {
    if (Array.isArray(value)) return value.forEach((item, index) => forbidden(item, `${pathName}[${index}]`));
    if (!isObject(value)) return;
    for (const key of Object.keys(value)) {
      if (["source_evidence", "raw_value", "normalised_value"].includes(key)) errors.push(`${pathName}.${key} is not permitted in editorial context.`);
      forbidden(value[key], `${pathName}.${key}`);
    }
  };
  forbidden(context);
  if (JSON.stringify(context).length > 60000) errors.push("editorial context exceeds bounded size.");
  return [...new Set(errors)];
}

export function assertValidEditorialIntelligenceContext(context) { const errors = validateEditorialIntelligenceContext(context); if (errors.length) throw new Error(`EditorialIntelligenceContext failed validation: ${errors.join("; ")}`); return context; }

export function createEditorialIntelligenceContext({ businessIntelligence, productIntelligence, createdAt = new Date().toISOString() }) {
  const business = unwrapBusiness(businessIntelligence); const product = unwrapProduct(productIntelligence);
  assertValidBusinessIntelligenceObject(business); assertValidProductIntelligenceObject(product);
  if (business.validation_status !== "validated") throw new Error("Validated Business Intelligence is required.");
  if (product.validation_status !== "validated") throw new Error("Validated Product Intelligence is required.");
  const conflicts = [...(business.conflicts || []).map((conflict) => ({ source: "business", ...clone(conflict) })), ...(product.conflicts || []).map((conflict) => ({ source: "product", ...clone(conflict) }))];
  const audienceConflict = meaningfulAudienceConflict(business, product); if (audienceConflict) conflicts.push(audienceConflict);
  const context = {
    metadata: { context_id: stableId("eic", { business_id: business.metadata.business_id, product_id: product.metadata.object_id, created_at: createdAt }), schema_version: EDITORIAL_INTELLIGENCE_CONTEXT_VERSION, created_at: createdAt, business_id: business.metadata.business_id, product_object_id: product.metadata.object_id },
    business: projectBusiness(business), product: projectProduct(product),
    audience: { business_wide_primary: projectBusiness(business).audience, product_specific_refinement: projectProduct(product).customer_understanding, precedence: "validated_business_audience_is_primary; product_intelligence_may_refine_specific_relevance_but_not_replace_it" },
    positioning: { business: projectBusiness(business).positioning, product: { features: projectProduct(product).features, benefits: projectProduct(product).benefits } },
    commercial_guidance: { price_value_orientation: effective(business.positioning?.price_value_orientation), objective: "sell_supported_product_value_to_the_intended_customer" },
    editorial_objective: { primary_objective: "persuade_the_intended_customer_to_buy", accuracy_boundary: "use_only_supported_or_permitted_intelligence", permission: "supported knowledge may be framed persuasively and benefit-led; sterile factual restatement is not required" },
    editorial_boundaries: { do_not_invent_specifications: true, do_not_invent_performance_claims: true, preserve_fact_derived_claim_distinctions: true, do_not_target_explicitly_excluded_audiences_as_primary: true, do_not_contradict_human_corrected_positioning: true, do_not_present_unknowns_as_known: true, permitted_persuasion: ["benefit_led_framing", "customer_problem_framing", "emotional_relevance", "product_differentiation", "purchase_motivation", "confident_supported_selling_language"] },
    knowledge_gaps: relevantGaps(business, product), conflicts,
    provenance_summary: { business_validation_status: business.validation_status, product_validation_status: product.validation_status, human_corrected_values_included: true, raw_source_evidence_included: false, superseded_values_included: false }
  };
  return assertValidEditorialIntelligenceContext(context);
}

export function renderEditorialIntelligenceReview(context) {
  const list = (items = []) => items.filter((item) => item?.value !== null).slice(0, 12).map((item) => `- ${typeof item.value === "object" ? JSON.stringify(item.value) : item.value}`).join("\n") || "- None recorded.";
  const gaps = [...(context.knowledge_gaps.business || []), ...(context.knowledge_gaps.product || [])].map((gap) => ({ value: gap.field ? `${gap.field}: ${gap.reason}` : gap.reason || "Unspecified knowledge gap" }));
  const conflictLines = context.conflicts.length ? context.conflicts.map((conflict) => {
    if (conflict.resolution_method === "approved_human_correction") return `- Historical ${conflict.source || "intelligence"} conflict retained for audit; the approved human correction is effective.`;
    return `- ${conflict.type || conflict.field_path || "Conflict requiring review"}`;
  }).join("\n") : "- None detected.";
  return `# Editorial Intelligence Context Review\n\n## Product\n\n${list(context.product.identity.product_name ? [context.product.identity.product_name, context.product.identity.category, context.product.identity.sku] : [])}\n\n## Intended Customer\n\n${list(context.audience.business_wide_primary.customer_groups?.target_customer_groups)}\n\n## Product-Specific Customer Relevance\n\n${list(context.audience.product_specific_refinement.ideal_customers)}\n\n## Business Positioning\n\n${list(context.business.positioning.positioning_claims)}\n\n## Why This Product Matters To That Customer\n\n${list(context.product.benefits)}\n\n## Trusted Selling Points\n\n${list([...(context.product.features || []), ...(context.product.benefits || [])])}\n\n## Claims / Facts / Derived Understanding\n\nThe context preserves knowledge type, assertion scope and provenance metadata for downstream use.\n\n## Important Boundaries\n\nSupported knowledge may be used in persuasive, benefit-led selling. Unsupported claims and unknowns must not be invented.\n\n## Relevant Unknowns\n\n${list(gaps)}\n\n## Conflicts\n\n${conflictLines}\n`;
}

export async function writeEditorialIntelligenceArtifacts({ businessIntelligence, productIntelligence, outputRoot, createdAt = new Date().toISOString() }) {
  const context = createEditorialIntelligenceContext({ businessIntelligence, productIntelligence, createdAt });
  const directory = path.resolve(outputRoot); await mkdir(directory, { recursive: true });
  const files = { directory, context: path.join(directory, "editorial-intelligence-context.json"), review: path.join(directory, "editorial-intelligence-review.md") };
  await writeFile(files.context, `${JSON.stringify(context, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await writeFile(files.review, renderEditorialIntelligenceReview(context), { encoding: "utf8", flag: "wx" });
  return { context, files };
}

export async function writeEditorialIntelligenceArtifactsFromFiles({ businessPath, productPath, outputRoot, createdAt = new Date().toISOString() }) {
  const [businessText, productText] = await Promise.all([readFile(businessPath, "utf8"), readFile(productPath, "utf8")]);
  return writeEditorialIntelligenceArtifacts({ businessIntelligence: JSON.parse(businessText), productIntelligence: JSON.parse(productText), outputRoot, createdAt });
}
