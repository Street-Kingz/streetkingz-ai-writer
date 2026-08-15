import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertValidEditorialIntelligenceContext } from "../editorial-intelligence/context.js";
import { createOpenAIEditorialDraftProvider } from "./draft-provider.js";
import { calculateConfiguredCost, configuredModelPricing } from "../interpretation/cost.js";

export const COMMERCIAL_PRODUCT_EDITOR_VERSION = "0.1.0";

const UNSUPPORTED_CLAIM = /\b(guaranteed?|guarantee|twice as fast|scratch[- ]?proof|swirl[- ]?free|100%|never fails|always works|absorbs?\s+\d+(?:\.\d+)?\s*(?:litres?|liters?|l|ml|g|kg))\b/i;
const UNSUPPORTED_SUPERLATIVE = /\b(maximum|best|ultimate|unbeatable|superior|highest|fastest|most absorbent)\b/i;
const CAVEAT = /\b(when used correctly|clean(?:,| and)? shampooed|heavier (?:feel|when|once)|not included|do not use|must be|only use|limitations?|warning|care instructions?)\b/i;
const GENERIC_FILLER = /\b(dependable choice|reliable choice|great addition|built to perform|ideal everyday option|high[- ]quality solution|heavy[- ]duty choice|perfect choice|made to perform)\b/i;
const STOP_WORDS = new Set("a an and are as at be by for from has have in is it its of on or that the their this to with your you want without into over own own-car people products business customers customer better result results product make makes more less very using used use".split(/\s+/));

const textOf = (value) => typeof value === "string" ? value : value && typeof value === "object" ? String(value.value ?? "") : "";
const knowledgeItems = (value) => Array.isArray(value) ? value.filter((item) => item && typeof item === "object" && Object.hasOwn(item, "value") && item.value !== null) : [];
const words = (value) => new Set(textOf(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((word) => word.length > 3 && !STOP_WORDS.has(word)));
const clone = (value) => structuredClone(value);

function angleKey(value, role) {
  const lower = textOf(value).toLowerCase();
  if (/\b(absorb|water|dry|streak|pass|contact)\w*/.test(lower)) return "drying_efficiency";
  if (/\b(eas|fuss|convenien|control|simple|straightforward)\w*/.test(lower)) return "ease";
  if (/\b(soft|premium|plush|quality|feel)\w*/.test(lower)) return "quality_experience";
  if (/\b(large|larger|size|coverage|vehicle|car|van)\w*/.test(lower)) return "coverage_suitability";
  if (/\b(gsm|construction|layer|microfibre|microfiber)\w*/.test(lower)) return "construction";
  return role;
}

function item(value, role, score, reason, primeEligible = true, sourceLayer = "product") {
  return { value: textOf(value), role, source_layer: sourceLayer, angle_key: angleKey(value, role), score, reason, prime_eligible: primeEligible, knowledge_type: value.knowledge_type, status: value.status, evidence_refs: [...(value.evidence_refs || [])], confidence: value.confidence };
}

export function rankCommercialSellingPoints(context) {
  assertValidEditorialIntelligenceContext(context);
  const product = context.product || {};
  const business = context.business || {};
  const candidates = [];
  knowledgeItems(product.benefits).forEach((value) => candidates.push(item(value, "customer_outcome", 10, "A supported product benefit directly expresses a reason to buy.")));
  knowledgeItems(product.features).forEach((value) => candidates.push(item(value, "feature", 5, "A supported product feature can substantiate a stronger benefit-led point.")));
  knowledgeItems(product.customer_understanding?.problems_solved).forEach((value) => candidates.push(item(value, "customer_problem", 9, "A product-specific problem connects the product to a customer need.")));
  knowledgeItems(business.audience?.customer_groups?.customer_priorities).forEach((value) => candidates.push(item(value, "customer_priority", 8, "A validated business priority guides customer-relevant framing.", true, "business")));
  knowledgeItems(business.positioning?.positioning_themes).forEach((value) => candidates.push(item(value, "positioning", 7, "A validated positioning theme keeps the selling frame on-brand.", true, "business")));
  knowledgeItems(product.usage?.use_cases).forEach((value) => candidates.push(item(value, "ease_or_use_case", 8, "A supported use case can make the product easier to picture in use.")));
  knowledgeItems(product.customer_understanding?.objections).forEach((value) => candidates.push(item(value, "objection", 2, "An objection belongs in supporting information unless it is commercially essential.", false)));
  knowledgeItems(product.usage?.instructions).forEach((value) => candidates.push(item(value, "care_or_instruction", 1, "Instructions belong in use guidance rather than prime sales space.", false)));
  knowledgeItems(product.usage?.limitations).forEach((value) => candidates.push(item(value, "limitation", 0, "A limitation remains available for transparent supporting information, not a lead bullet.", false)));
  return candidates.sort((a, b) => b.score - a.score || a.value.localeCompare(b.value));
}

export function selectDistinctCommercialSellingPoints(context, limit = 12) {
  const selected = []; const rejected = [];
  for (const candidate of rankCommercialSellingPoints(context)) {
    if (!candidate.prime_eligible || candidate.source_layer !== "product" || UNSUPPORTED_SUPERLATIVE.test(candidate.value) || selected.some((item) => item.angle_key === candidate.angle_key)) {
      rejected.push({ ...candidate, rejection: !candidate.prime_eligible ? "secondary_information" : candidate.source_layer !== "product" ? "business_influence_only_no_product_proposition" : UNSUPPORTED_SUPERLATIVE.test(candidate.value) ? "unsupported_superlative" : "overlapping_commercial_angle" });
      continue;
    }
    selected.push(candidate);
    if (selected.length >= limit) break;
  }
  return { selected, rejected };
}

export function buildCommercialProductEditorInput({ context, currentShortDescription }) {
  assertValidEditorialIntelligenceContext(context);
  if (!Array.isArray(currentShortDescription) || currentShortDescription.some((value) => typeof value !== "string")) throw new Error("currentShortDescription must be an array of strings.");
  const ranked = rankCommercialSellingPoints(context);
  const distinct = selectDistinctCommercialSellingPoints(context);
  return {
    schema_version: COMMERCIAL_PRODUCT_EDITOR_VERSION,
    artifact_type: "commercial_product_page_editor_input",
    editorial_objective: context.editorial_objective,
    audience: clone(context.audience),
    business_positioning: clone(context.positioning.business),
    product: {
      identity: clone(context.product.identity),
      features: clone(context.product.features || []),
      benefits: clone(context.product.benefits || []),
      customer_relevance: clone(context.product.customer_understanding || {}),
      usage: { use_cases: clone(context.product.usage?.use_cases || []) },
      relevant_unknowns: clone(context.knowledge_gaps.product || [])
    },
    editorial_boundaries: clone(context.editorial_boundaries),
    current_short_description: [...currentShortDescription],
    ranked_selling_points: distinct.selected,
    rejected_selling_points: distinct.rejected.map((candidate) => ({ value: candidate.value, role: candidate.role, rejection: candidate.rejection })),
    business_guidance_use: {
      role: "prioritisation_and_framing_only",
      literal_copy_is_optional: true,
      do_not_restate_personas_or_positioning_as_product_claims: true,
      every_substantive_product_proposition_requires_product_intelligence_support: true
    },
    instruction: "Create concise prime sales bullets that persuade the validated intended customer. Product Intelligence supplies the product reasons to buy. Use Business Intelligence invisibly to prioritise and frame those reasons; do not restate audience, persona, exclusion or price-positioning language as product copy unless the specific product/use case independently supports it. Business context may influence tone without appearing literally. Do not lead with caveats, care instructions or narrow limitations. Do not invent measurements, guarantees, compatibility or performance claims. Return only the strict structured output."
  };
}

export function commercialProductEditorJsonSchema() {
  return {
    type: "object", additionalProperties: false, required: ["short_description_bullets"],
    properties: {
      short_description_bullets: { type: "array", minItems: 3, maxItems: 5, items: { type: "string", minLength: 8, maxLength: 180 } }
    }
  };
}

function superlativeIsExplicitlySupported(bullet, context) {
  const lower = String(bullet).toLowerCase();
  const allKnowledge = [
    ...rankCommercialSellingPoints(context),
    ...knowledgeItems(context.business?.positioning?.positioning_claims),
    ...knowledgeItems(context.product?.features)
  ];
  return allKnowledge.some((entry) => entry.knowledge_type === "fact" && entry.assertion_scope === "objective" && lower.includes(textOf(entry).toLowerCase()));
}

function bulletOverlap(first, second) {
  const a = words(first); const b = words(second);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((word) => b.has(word)).length;
  return intersection / Math.min(a.size, b.size);
}

function supportedCorpus(context) {
  return [
    ...rankCommercialSellingPoints(context).filter((candidate) => candidate.prime_eligible && candidate.source_layer === "product"),
    ...knowledgeItems(context.product?.identity ? Object.values(context.product.identity).flat() : []),
    ...knowledgeItems(context.product?.usage?.use_cases)
  ].map((candidate) => words(candidate.value || candidate));
}

function productSupportForBullet(bullet, context) {
  return rankCommercialSellingPoints(context).filter((candidate) => candidate.prime_eligible && candidate.source_layer === "product").map((candidate) => ({ candidate, overlap: [...words(bullet)].filter((word) => words(candidate.value).has(word)).length })).filter((entry) => entry.overlap >= 2).sort((a, b) => b.overlap - a.overlap || b.candidate.score - a.candidate.score)[0]?.candidate || null;
}

function businessInfluenceForBullet(bullet, context) {
  return rankCommercialSellingPoints(context).filter((candidate) => candidate.source_layer === "business").map((candidate) => ({ candidate, overlap: [...words(bullet)].filter((word) => words(candidate.value).has(word)).length })).filter((entry) => entry.overlap > 0).sort((a, b) => b.overlap - a.overlap || b.candidate.score - a.candidate.score)[0]?.candidate || null;
}

export function validateCommercialProductEditorOutput(output, { context }) {
  assertValidEditorialIntelligenceContext(context);
  const errors = [];
  const bullets = output?.short_description_bullets;
  if (!Array.isArray(bullets) || bullets.length < 3 || bullets.length > 5) errors.push("short_description_bullets must contain 3 to 5 bullets.");
  if (!Array.isArray(bullets)) return errors;
  const corpus = supportedCorpus(context);
  bullets.forEach((bullet, index) => {
    if (typeof bullet !== "string" || bullet.trim().length < 8) errors.push(`bullet[${index}] must be a meaningful string.`);
    if (UNSUPPORTED_CLAIM.test(String(bullet))) errors.push(`bullet[${index}] contains an unsupported performance, guarantee or measurement claim.`);
    if (UNSUPPORTED_SUPERLATIVE.test(String(bullet)) && !superlativeIsExplicitlySupported(bullet, context)) errors.push(`bullet[${index}] contains an unsupported superlative.`);
    if (GENERIC_FILLER.test(String(bullet))) errors.push(`bullet[${index}] is generic filler rather than a distinct supported buying reason.`);
    if (CAVEAT.test(String(bullet))) errors.push(`bullet[${index}] is caveat-led and belongs outside prime sales copy.`);
    const candidateWords = words(bullet);
    if (candidateWords.size && !corpus.some((sourceWords) => [...candidateWords].filter((word) => sourceWords.has(word)).length >= 2)) errors.push(`bullet[${index}] lacks meaningful Product Intelligence support for its product proposition.`);
    if (!productSupportForBullet(bullet, context)) errors.push(`bullet[${index}] must be grounded in Product Intelligence; Business Intelligence alone cannot create a product claim.`);
  });
  for (let index = 0; index < (bullets?.length || 0); index += 1) for (let other = index + 1; other < bullets.length; other += 1) if (bulletOverlap(bullets[index], bullets[other]) >= 0.7) errors.push(`bullets[${index}] and bullets[${other}] express substantially the same commercial angle.`);
  return [...new Set(errors)];
}

export function assertValidCommercialProductEditorOutput(output, options) {
  const errors = validateCommercialProductEditorOutput(output, options);
  if (errors.length) throw Object.assign(new Error(`Commercial product editor output failed validation: ${errors.join("; ")}`), { errors });
  return output;
}

export function buildCommercialComparison({ context, currentShortDescription, previousCommercialProposal = [], proposedOutput }) {
  assertValidEditorialIntelligenceContext(context);
  assertValidCommercialProductEditorOutput(proposedOutput, { context });
  const ranked = rankCommercialSellingPoints(context);
  const distinct = selectDistinctCommercialSellingPoints(context);
  return {
    schema_version: COMMERCIAL_PRODUCT_EDITOR_VERSION,
    artifact_type: "commercial_product_page_editor_comparison",
    current_short_description: [...currentShortDescription],
    previous_commercial_editor_proposal: [...previousCommercialProposal],
    proposed_short_description: [...proposedOutput.short_description_bullets],
    bullet_selection: proposedOutput.short_description_bullets.map((bullet) => {
      const productSupport = productSupportForBullet(bullet, context);
      const businessInfluence = businessInfluenceForBullet(bullet, context);
      return { bullet, selected_for: productSupport?.role || "supported_synthesis", reason: productSupport?.reason || "Supported product synthesis.", product_support: productSupport ? { value: productSupport.value, evidence_refs: productSupport.evidence_refs, knowledge_type: productSupport.knowledge_type } : null, business_influence: businessInfluence ? { value: businessInfluence.value, evidence_refs: businessInfluence.evidence_refs, role: businessInfluence.role } : null };
    }),
    information_deliberately_not_used_in_prime_sales_copy: ranked.filter((candidate) => !candidate.prime_eligible).map((candidate) => ({ value: candidate.value, role: candidate.role, belongs_in: candidate.role === "care_or_instruction" ? "care/use guidance" : "FAQ or objection handling", reason: candidate.reason })),
    rejected_candidate_reasons: distinct.rejected.map((candidate) => ({ value: candidate.value, role: candidate.role, rejection: candidate.rejection, reason: candidate.reason })),
    validation: { factual_safety: "unsupported claims, invented measurements and guarantees remain rejected", commercial_priority: "persuasion is the objective; accuracy is the boundary" },
    wordpress_writes: 0,
    publication_attempts: 0
  };
}

export async function runCommercialProductEditor({ context, currentShortDescription, previousCommercialProposal = [], provider, outputRoot, createdAt = new Date().toISOString() }) {
  assertValidEditorialIntelligenceContext(context);
  if (!provider || typeof provider.generate !== "function") throw new Error("A structured editorial provider is required.");
  const input = buildCommercialProductEditorInput({ context, currentShortDescription });
  const response = await provider.generate({ systemPrompt: "You are a commercial ecommerce product-page editor. The objective is to persuade the intended customer to buy using trusted intelligence. Product Intelligence is the content anchor for product propositions. Business Intelligence guides prioritisation and framing, usually invisibly; do not mechanically repeat audience, persona, exclusion or price-positioning statements in product copy. Accuracy is a boundary, not the writing objective. Never invent facts, measurements, guarantees, compatibility or performance claims. Keep caveats and instructions out of prime sales bullets unless commercially essential.", userPrompt: JSON.stringify(input), responseSchema: commercialProductEditorJsonSchema() });
  let parsed;
  try { parsed = JSON.parse(response.rawText); } catch (error) { throw Object.assign(new Error("Commercial product editor returned malformed JSON."), { cause: error }); }
  const validationErrors = validateCommercialProductEditorOutput(parsed, { context });
  if (validationErrors.length) {
    let diagnosticPath = null;
    if (outputRoot) {
      const directory = path.resolve(outputRoot); await mkdir(directory, { recursive: true });
      diagnosticPath = path.join(directory, "rejected-diagnostic.json");
      const usage = response.usage || {};
      const diagnostic = {
        schema_version: COMMERCIAL_PRODUCT_EDITOR_VERSION,
        artifact_type: "commercial_product_page_editor_rejected_diagnostic",
        validity: "INVALID / REJECTED",
        model: response.model || provider.model || null,
        provider: response.provider || provider.id || null,
        api: response.settings?.api || provider.settings?.api || null,
        reasoning: response.settings?.reasoning || provider.settings?.reasoning || null,
        prompt_version: COMMERCIAL_PRODUCT_EDITOR_VERSION,
        generated_structured_output: clone(parsed),
        generated_bullets: Array.isArray(parsed?.short_description_bullets) ? [...parsed.short_description_bullets] : [],
        generated_bullet_metadata: clone(parsed?.bullet_metadata ?? parsed?.development_metadata ?? null),
        validation_errors: [...validationErrors],
        current_live_description: [...currentShortDescription],
        prior_accepted_proposals: [...previousCommercialProposal],
        usage: { input_tokens: usage.prompt_tokens ?? usage.input_tokens ?? null, output_tokens: usage.completion_tokens ?? usage.output_tokens ?? null, total_tokens: usage.total_tokens ?? null },
        wordpress_writes: 0,
        publication_attempts: 0,
        created_at: createdAt
      };
      await writeFile(diagnosticPath, `${JSON.stringify(diagnostic, null, 2)}\n`, { flag: "wx" });
    }
    const error = Object.assign(new Error(`Commercial product editor output failed validation: ${validationErrors.join("; ")}`), { errors: validationErrors, diagnosticPath });
    throw error;
  }
  const comparison = buildCommercialComparison({ context, currentShortDescription, previousCommercialProposal, proposedOutput: parsed });
  const usage = response.usage || {};
  const inputTokens = usage.prompt_tokens ?? usage.input_tokens ?? null;
  const outputTokens = usage.completion_tokens ?? usage.output_tokens ?? null;
  const cost = calculateConfiguredCost({ inputTokens, outputTokens, pricing: configuredModelPricing(process.env, response.model || provider.model) });
  const metadata = { schema_version: COMMERCIAL_PRODUCT_EDITOR_VERSION, artifact_type: "commercial_product_page_editor_run_metadata", ai_calls: 1, provider: response.provider || provider.id, model: response.model || provider.model, settings: response.settings || provider.settings || null, input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: usage.total_tokens ?? (Number.isFinite(inputTokens) && Number.isFinite(outputTokens) ? inputTokens + outputTokens : null), ...cost, wordpress_writes: 0, publication_attempts: 0, created_at: createdAt };
  if (outputRoot) {
    const directory = path.resolve(outputRoot); await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "editorial-input.json"), `${JSON.stringify(input, null, 2)}\n`, { flag: "wx" });
    await writeFile(path.join(directory, "editorial-output.json"), `${JSON.stringify(parsed, null, 2)}\n`, { flag: "wx" });
    await writeFile(path.join(directory, "development-comparison.json"), `${JSON.stringify(comparison, null, 2)}\n`, { flag: "wx" });
    await writeFile(path.join(directory, "run-metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, { flag: "wx" });
  }
  return { output: parsed, comparison, response, input, metadata };
}

export { createOpenAIEditorialDraftProvider };
