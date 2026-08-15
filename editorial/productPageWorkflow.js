import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertValidEditorialIntelligenceContext } from "../editorial-intelligence/context.js";
import { calculateConfiguredCost, configuredModelPricing } from "../interpretation/cost.js";
import {
  commercialProductEditorJsonSchema,
  runCommercialProductEditor,
  validateCommercialProductEditorOutput
} from "./commercialProductEditor.js";
import { sha256 } from "../research/core/canonical.js";

export const PRODUCT_PAGE_WORKFLOW_VERSION = "0.1.0";

const UNSUPPORTED = /\b(guaranteed?|guarantee|twice as fast|scratch[- ]?proof|swirl[- ]?free|100%|never fails|always works|absorbs?\s+\d+(?:\.\d+)?\s*(?:litres?|liters?|l|ml|g|kg)|quickest|fastest|all paint)\b/i;
const WORDS = (value) => new Set(String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((word) => word.length > 4));
const clone = (value) => structuredClone(value);

export function normalizeProductPageContent(page) {
  if (!page || typeof page !== "object") throw new Error("A current product-page representation is required.");
  const title = typeof page.title === "string" ? page.title : page.title?.rendered;
  const shortDescription = Array.isArray(page.short_description)
    ? page.short_description
    : Array.isArray(page.excerpt?.rendered)
      ? page.excerpt.rendered
      : typeof page.excerpt?.rendered === "string"
        ? [...page.excerpt.rendered.matchAll(/<li[^>]*>(.*?)<\/li>/gis)].map((match) => match[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean)
        : [];
  const mainDescription = typeof page.main_description === "string" ? page.main_description : page.content?.rendered || "";
  if (!title || !Array.isArray(shortDescription) || shortDescription.some((value) => typeof value !== "string")) throw new Error("Current product page must include a title and short description bullets.");
  return {
    title,
    short_description: [...shortDescription],
    main_description: mainDescription,
    faq: page.faq || null,
    specifications: page.specifications || null,
    care_use: page.care_use || null,
    source: page.source || "local product-page representation"
  };
}

function supportForText(text, context) {
  const candidateWords = WORDS(text);
  const values = [
    ...(context.product?.benefits || []), ...(context.product?.features || []),
    ...(context.product?.usage?.use_cases || []), ...(context.product?.customer_understanding?.problems_solved || [])
  ];
  return values.filter((value) => [...candidateWords].filter((word) => WORDS(value.value).has(word)).length >= 2).map((value) => ({ value: value.value, evidence_refs: value.evidence_refs || [], knowledge_type: value.knowledge_type }));
}

export function validateMainDescription(output, { context }) {
  const text = output?.main_description;
  const errors = [];
  if (typeof text !== "string" || text.trim().length < 40) errors.push("main_description must be a meaningful product description.");
  if (typeof text === "string" && UNSUPPORTED.test(text)) errors.push("main_description contains an unsupported claim, measurement, guarantee or comparison.");
  if (typeof text === "string" && !supportForText(text, context).length) errors.push("main_description lacks meaningful Product Intelligence support.");
  return errors;
}

export function productPageMainDescriptionJsonSchema() {
  return { type: "object", additionalProperties: false, required: ["main_description"], properties: { main_description: { type: "string", minLength: 40, maxLength: 1800 } } };
}

export function buildProductPageEditorInput({ context, currentPage, proposedShortDescription }) {
  assertValidEditorialIntelligenceContext(context);
  const page = normalizeProductPageContent(currentPage);
  return {
    schema_version: PRODUCT_PAGE_WORKFLOW_VERSION,
    artifact_type: "product_page_editor_input",
    editorial_objective: context.editorial_objective,
    trusted_intelligence: {
      product: { identity: clone(context.product.identity), features: clone(context.product.features || []), benefits: clone(context.product.benefits || []), usage: clone(context.product.usage || {}), customer_relevance: clone(context.product.customer_understanding || {}), unknowns: clone(context.knowledge_gaps.product || []) },
      business_guidance: { audience: clone(context.audience), positioning: clone(context.positioning.business), commercial_guidance: clone(context.commercial_guidance || {}) },
      boundaries: clone(context.editorial_boundaries)
    },
    current_page: page,
    approved_short_description: proposedShortDescription,
    business_guidance_use: { role: "prioritisation_and_framing_only", literal_copy_is_optional: true, do_not_restate_personas_or_positioning_as_product_claims: true, every_substantive_product_proposition_requires_product_intelligence_support: true },
    instruction: "Propose only a persuasive main product description. Product Intelligence supplies the product reasons to buy. Use Business Intelligence invisibly to prioritise and frame those reasons; do not mechanically restate audience, persona, exclusion or price-positioning language. Expand product-grounded reasons without repeating the bullets mechanically. Keep specifications precise and defer care instructions or narrow caveats to their proper sections. Do not invent claims."
  };
}

function section(name, current, proposed, decision, reason, productSupport = [], businessInfluence = []) {
  return { section: name, current, proposed, decision, reason, product_support: productSupport, business_influence: businessInfluence };
}

export function buildProductPageProposal({ context, currentPage, shortDescriptionOutput, mainDescriptionOutput, commercialProvenance = null }) {
  assertValidEditorialIntelligenceContext(context);
  const page = normalizeProductPageContent(currentPage);
  const shortErrors = validateCommercialProductEditorOutput(shortDescriptionOutput, { context });
  const mainErrors = validateMainDescription(mainDescriptionOutput, { context });
  if (shortErrors.length || mainErrors.length) throw Object.assign(new Error("Product-page proposal failed deterministic validation."), { errors: [...shortErrors, ...mainErrors] });
  const shortChanged = JSON.stringify(page.short_description) !== JSON.stringify(shortDescriptionOutput.short_description_bullets);
  const mainChanged = page.main_description !== mainDescriptionOutput.main_description;
  const mainSupport = supportForText(mainDescriptionOutput.main_description, context);
  return {
    schema_version: PRODUCT_PAGE_WORKFLOW_VERSION,
    artifact_type: "product_page_editor_proposal",
    validation: { status: "PASS", errors: [] },
    provenance: commercialProvenance ? { commercial_editor: commercialProvenance } : null,
    sections: [
      section("title", page.title, page.title, "KEEP", "The existing title clearly identifies the product."),
      section("short_description", page.short_description, shortDescriptionOutput.short_description_bullets, shortChanged ? "REPLACE" : "KEEP", "Prime bullets should lead with distinct product-grounded reasons to buy.", shortDescriptionOutput.short_description_bullets.map((value) => ({ value, evidence_refs: [], role: "commercial_editor_output" }))),
      section("main_description", page.main_description, mainDescriptionOutput.main_description, mainChanged ? "EDIT" : "KEEP", "Expand the strongest product reasons without mechanically repeating the short description.", mainSupport),
      ...(page.specifications ? [section("specifications", page.specifications, page.specifications, "KEEP", "No justified change was generated for this factual section.")] : []),
      ...(page.faq ? [section("faq", page.faq, page.faq, "KEEP", "Existing FAQ content remains secondary supporting information.")] : []),
      ...(page.care_use ? [section("care_use", page.care_use, page.care_use, "KEEP", "Care and instructions remain separate from prime sales copy.")] : [])
    ],
    assessment: {
      strongest_existing_elements: ["Product identity is clear."],
      weakest_existing_elements: ["Prime short-description copy is more defensive than commercially useful."],
      missing_commercial_information: [],
      unnecessary_or_repetitive_information: ["Caveats and usage warnings should not lead the page."],
      caveats_too_prominent: page.short_description.filter((value) => /when used correctly|clean|heavier|do not|only/i.test(value)),
      unsupported_claims: [],
      purchase_confidence_opportunities: ["Lead with supported drying outcome, capacity, feel and suitability."]
    },
    wordpress_writes: 0,
    publication_attempts: 0
  };
}

export function renderProductPageReview(proposal) {
  const lines = ["# Product Page Review", "", "## Summary", "", "The proposal keeps clear product identity and factual supporting sections while improving prime selling copy and expanding the main description.", ""];
  for (const entry of proposal.sections) {
    lines.push(`## ${entry.section.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())}`, "", `Recommendation: **${entry.decision}**`, "", "### Current", "", Array.isArray(entry.current) ? entry.current.map((value) => `- ${value}`).join("\n") : String(entry.current || "(none)"), "", "### Proposed", "", Array.isArray(entry.proposed) ? entry.proposed.map((value) => `- ${value}`).join("\n") : String(entry.proposed || "(none)"), "");
  }
  lines.push("## Overall assessment", "", ...proposal.assessment.purchase_confidence_opportunities.map((value) => `- ${value}`), "", "WordPress writes: 0", "Publishing: 0");
  return `${lines.join("\n")}\n`;
}

export async function runProductPageEditorialWorkflow({ context, currentPage, commercialProvider, mainDescriptionProvider, outputRoot, previousCommercialProposal = [], createdAt = new Date().toISOString() }) {
  assertValidEditorialIntelligenceContext(context);
  const page = normalizeProductPageContent(currentPage);
  if (!commercialProvider?.generate || !mainDescriptionProvider?.generate) throw new Error("Commercial and main-description providers are required.");
  const commercial = await runCommercialProductEditor({ context, currentShortDescription: page.short_description, previousCommercialProposal, provider: commercialProvider });
  const mainInput = buildProductPageEditorInput({ context, currentPage: page, proposedShortDescription: commercial.output.short_description_bullets });
  const mainResponse = await mainDescriptionProvider.generate({ systemPrompt: "You are an ecommerce product-page editor. Product Intelligence is the content anchor for product propositions. Business Intelligence guides prioritisation and framing, usually invisibly; do not mechanically repeat audience, persona, exclusion or price-positioning statements. Persuade using trusted product intelligence; accuracy is the boundary, not the objective. Do not invent claims, measurements, guarantees or compatibility. Keep primary prose benefit-led rather than caveat-led. Return only the requested structured main description.", userPrompt: JSON.stringify(mainInput), responseSchema: productPageMainDescriptionJsonSchema() });
  let mainOutput; try { mainOutput = JSON.parse(mainResponse.rawText); } catch (error) { throw Object.assign(new Error("Product-page editor returned malformed main-description JSON."), { cause: error }); }
  const proposal = buildProductPageProposal({ context, currentPage: page, shortDescriptionOutput: commercial.output, mainDescriptionOutput: mainOutput, commercialProvenance: { output_sha256: sha256(JSON.stringify(commercial.output)), run_metadata: commercial.metadata } });
  const metadata = { schema_version: PRODUCT_PAGE_WORKFLOW_VERSION, artifact_type: "product_page_editor_run_metadata", ai_calls: 2, commercial_provider: commercial.response?.provider || commercialProvider.id || null, commercial_model: commercial.response?.model || commercialProvider.model || null, main_provider: mainResponse.provider || mainDescriptionProvider.id || null, main_model: mainResponse.model || mainDescriptionProvider.model || null, commercial_usage: commercial.metadata, main_usage: mainResponse.usage || null, wordpress_writes: 0, publication_attempts: 0, automatic_retries: 0, automatic_repairs: 0, created_at: createdAt };
  if (outputRoot) {
    const directory = path.resolve(outputRoot); await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "product-page-proposal.json"), `${JSON.stringify(proposal, null, 2)}\n`, { flag: "wx" });
    await writeFile(path.join(directory, "product-page-review.md"), renderProductPageReview(proposal), { flag: "wx" });
    await writeFile(path.join(directory, "workflow-input.json"), `${JSON.stringify(mainInput, null, 2)}\n`, { flag: "wx" });
    await writeFile(path.join(directory, "run-metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, { flag: "wx" });
  }
  return { proposal, review: renderProductPageReview(proposal), metadata, commercial, mainResponse };
}
