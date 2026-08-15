import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { stableId } from "../research/core/canonical.js";
import { BUSINESS_INTELLIGENCE_SCHEMA_VERSION } from "./contracts.js";
import { assertValidBusinessIntelligenceObject } from "./validation.js";
import { validateInterpretedBusinessIntelligence } from "./interpretationValidation.js";
import {
  BUSINESS_INTELLIGENCE_SYSTEM_PROMPT, businessIntelligenceInterpretationJsonSchema,
  partitionBusinessInterpretationEvidence, selectRelevantBusinessEvidence
} from "./interpretationPrompt.js";

const PASS_FIELDS = Object.freeze({
  catalogue: ["business_identity", "catalogue_understanding", "knowledge_gaps", "assumptions"],
  positioning: ["positioning", "knowledge_gaps", "assumptions"],
  customer: ["customer_understanding", "knowledge_gaps", "assumptions"]
});

const PASS_INSTRUCTIONS = Object.freeze({
  catalogue: "Interpret catalogue evidence only. Return business identity where directly supported by catalogue evidence, catalogue understanding, representative categories/products, catalogue coherence, catalogue knowledge gaps, and assumptions. Do not return positioning, customer understanding, audience architecture, or category audiences.",
  positioning: "Interpret positioning evidence only. Return positioning claims, value propositions, themes, differentiators, price/value orientation where supported, positioning knowledge gaps, and assumptions. Do not return business identity, catalogue facts, customer understanding, audience architecture, or category audiences.",
  customer: "Interpret customer evidence only. Return customer behaviours, motivations, priorities, problems, purchase drivers, exclusions where explicitly supported, customer knowledge gaps, and assumptions. Do not return business identity, catalogue facts, positioning, audience architecture, or category audiences."
});

const unknown = () => ({ value: null, knowledge_type: "unknown", assertion_scope: "unknown", evidence_refs: [], confidence: 0, status: "inferred" });
const emptyKnowledgeArray = () => [];
const safeTimestamp = (value) => value.replace(/[:.]/g, "-");
const businessSlug = (url) => new URL(url).hostname.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const displayValue = (value) => value === null ? "Unknown" : typeof value === "object" ? JSON.stringify(value) : String(value);
const titleCase = (value) => String(value).replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

function passSchema(pass) {
  const full = businessIntelligenceInterpretationJsonSchema();
  const properties = Object.fromEntries(PASS_FIELDS[pass].map((field) => [field, full.properties[field]]));
  return { type: "object", additionalProperties: false, required: PASS_FIELDS[pass], properties };
}

function passPrompt({ artifact, pass, contexts }) {
  const context = contexts[pass];
  return JSON.stringify({
    task: `Run the ${pass} Business Intelligence interpretation pass.`,
    business_url: artifact.business_url,
    source_fingerprint: artifact.source_fingerprint,
    pass,
    allowed_evidence_context: context,
    output_boundary: PASS_INSTRUCTIONS[pass],
    evidence_rule: "Every non-unknown value must cite evidence IDs from the supplied context only. Do not cite IDs from another pass or invent evidence IDs.",
    return_only_schema: true
  }, null, 2);
}

function skeleton({ artifact, completedAt, passOutput = {} }) {
  const sourceFingerprint = artifact.source_fingerprint;
  return {
    metadata: {
      object_id: stableId("bio-multipass", { business_url: artifact.business_url, source_fingerprint: sourceFingerprint }),
      schema_version: BUSINESS_INTELLIGENCE_SCHEMA_VERSION,
      business_id: stableId("business", new URL(artifact.business_url).hostname),
      primary_domain: artifact.business_url, created_at: completedAt, updated_at: completedAt,
      source_fingerprint: sourceFingerprint, ingestion_status: "interpreted_awaiting_human_validation"
    },
    business_identity: {
      business_name: unknown(), business_type: unknown(), owned_brand_status: unknown(), geographic_market: unknown(), sales_channel: unknown(), business_description: unknown(),
      ...(passOutput.business_identity || {})
    },
    catalogue_understanding: {
      product_focus: unknown(), primary_categories: emptyKnowledgeArray(), catalogue_coherence: unknown(), secondary_categories: emptyKnowledgeArray(), representative_product_refs: emptyKnowledgeArray(), catalogue_limitations: emptyKnowledgeArray(),
      ...(passOutput.catalogue_understanding || {})
    },
    audience_architecture: { type: unknown(), business_wide_profile_status: unknown() },
    customer_understanding: {
      target_customer_groups: emptyKnowledgeArray(), customer_behaviours: emptyKnowledgeArray(), customer_motivations: emptyKnowledgeArray(), customer_priorities: emptyKnowledgeArray(), customer_problems: emptyKnowledgeArray(), purchase_drivers: emptyKnowledgeArray(), exclusions: emptyKnowledgeArray(),
      ...(passOutput.customer_understanding || {})
    },
    positioning: {
      value_proposition: emptyKnowledgeArray(), positioning_themes: emptyKnowledgeArray(), differentiators: emptyKnowledgeArray(), positioning_claims: emptyKnowledgeArray(), price_value_orientation: unknown(),
      ...(passOutput.positioning || {})
    },
    category_audiences: [], knowledge_gaps: passOutput.knowledge_gaps || [], source_evidence: artifact.evidence,
    conflicts: [], human_validation_decisions: [], human_corrections: [], validation_status: "awaiting_validation",
    execution_metadata: { deterministic_steps: ["select_relevant_business_evidence", "partition_evidence_by_pass", "validate_partial_output"], ai_calls: [], input_tokens: 0, output_tokens: 0, external_api_call_count: 0 }
  };
}

function validatePassOutput({ artifact, pass, output, evidence, completedAt }) {
  const errors = [];
  if (!output || typeof output !== "object" || Array.isArray(output)) errors.push(`${pass} pass output must be an object.`);
  else {
    for (const field of Object.keys(output)) if (!PASS_FIELDS[pass].includes(field)) errors.push(`${pass} pass output contains forbidden field ${field}.`);
    const allowedIds = new Set(evidence.map((item) => item.id));
    const candidate = skeleton({ artifact, completedAt, passOutput: output });
    const candidateErrors = validateInterpretedBusinessIntelligence(candidate, output.assumptions || []);
    errors.push(...candidateErrors.filter((error) => !error.includes("validation_status must remain") && !error.includes("AI interpretation must not create human validation decisions")));
    const walk = (value, pathName = "$") => {
      if (Array.isArray(value)) return value.forEach((item, index) => walk(item, `${pathName}[${index}]`));
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value.evidence_refs)) for (const ref of value.evidence_refs) if (!allowedIds.has(ref)) errors.push(`${pathName}.evidence_refs contains an ID outside the ${pass} evidence context: ${ref}.`);
      for (const [key, child] of Object.entries(value)) walk(child, `${pathName}.${key}`);
    };
    walk(output);
  }
  return [...new Set(errors)];
}

async function writeRejectedDiagnostic({ outputRoot, artifact, pass, output, errors, evidence, model, createdAt }) {
  const directory = path.resolve(outputRoot, "invalid-partial-interpretations", pass, createdAt.replace(/[:.]/g, "-"));
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, "invalid-rejected.json");
  await writeFile(file, `${JSON.stringify({ artifact_type: "business_intelligence_invalid_partial_interpretation", validity: "INVALID / REJECTED", created_at: createdAt, pass, model, business_url: artifact.business_url, supplied_evidence_ids: evidence.map((item) => item.id), generated_output: output, validation_errors: errors }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return file;
}

function knowledgeEntries(value, pathName = "", output = []) {
  if (Array.isArray(value)) { value.forEach((item, index) => knowledgeEntries(item, `${pathName}[${index}]`, output)); return output; }
  if (!value || typeof value !== "object") return output;
  if (Object.hasOwn(value, "knowledge_type") && Object.hasOwn(value, "evidence_refs")) { output.push({ path: pathName, item: value }); return output; }
  for (const [key, child] of Object.entries(value)) if (!["metadata", "source_evidence", "execution_metadata", "conflicts", "human_validation_decisions", "human_corrections"].includes(key)) knowledgeEntries(child, pathName ? `${pathName}.${key}` : key, output);
  return output;
}

function reportKnowledge(entries, evidenceById) {
  if (!entries.length) return "No information recorded.";
  return entries.map(({ path: pathName, item }) => {
    const refs = item.evidence_refs?.length ? item.evidence_refs.map((id) => {
      const record = evidenceById.get(id);
      return record ? `\`${id}\` (${titleCase(record.source_type)} / ${record.source_field})` : `\`${id}\``;
    }).join(", ") : "none";
    return `- **${titleCase(pathName)}:** ${displayValue(item.value)} _(knowledge: ${item.knowledge_type}; confidence: ${item.confidence}; status: ${item.status}; evidence: ${refs})_`;
  }).join("\n");
}

export function renderBusinessIntelligenceFounderReview(bio) {
  const evidenceById = new Map(bio.source_evidence.map((record) => [record.id, record]));
  const value = (section, field) => bio[section]?.[field]?.value ?? null;
  const unique = (items) => [...new Map(items.map((item) => [String(item).toLowerCase().replace(/\s+/g, " ").trim(), item])).values()];
  const conceptKey = (item) => String(item).toLowerCase().replace(/\b(?:the website|the business|customers?|people|products?|a|an|that|this)\b/g, "").replace(/\b(?:communicates?|communicated|working|work|want|wants|value|valued|looking for|seeking|is|are|may|appear|appears|toward|relevant|desire for)\b/g, "").replace(/[^a-z0-9]+/gi, " ").replace(/\s+/g, " ").trim();
  const uniqueConcepts = (items) => [...new Map(items.map((item) => [conceptKey(item), item])).values()];
  const presentValue = (item) => { const text = String(item).replace(/_/g, " ").replace(/\s+/g, " ").trim(); return String(item).includes("_") ? titleCase(text) : text; };
  const cleanConcept = (item) => presentValue(item).replace(/^the website communicates (?:toward|that|a desire for)\s+/i, "").replace(/^the business communicates\s+/i, "").replace(/^products communicated as\s+/i, "").replace(/^the business states that\s+/i, "").replace(/^customers?\s+(?:who|that)\s+/i, "").replace(/[.]+$/, "").trim();
  const sourceLabel = (type) => ({ homepage: "Homepage", about_page: "About page", category_page: "Category pages", product_sample: "Sampled product pages", navigation: "Navigation", faq: "FAQs", customer_service_page: "Customer service pages", structured_site_identity: "Site information", structured_catalogue: "Catalogue information" }[type] || "Website evidence");
  const sourcesFor = (items) => unique(items.flatMap((item) => (item.evidence_refs || []).map((id) => evidenceById.get(id)).filter(Boolean).map((record) => sourceLabel(record.source_type))));
  const basedOn = (items) => { const sources = sourcesFor(items); return sources.length ? `Based on: ${sources.join(", ")}.` : ""; };
  const itemFor = (section, field) => bio[section]?.[field]?.filter((item) => item.value !== null && item.value !== undefined) || [];
  const bullets = (items, { filter = () => true, limit = 8 } = {}) => uniqueConcepts(items.filter(filter).map((item) => cleanConcept(item.value).trim())).slice(0, limit).map((item) => `- ${item ? item[0].toUpperCase() + item.slice(1) : item}`).join("\n") || "- Nothing specific has been recorded yet.";
  const customerItems = ["target_customer_groups", "customer_behaviours", "customer_motivations", "customer_priorities", "customer_problems", "purchase_drivers", "exclusions"].flatMap((field) => itemFor("customer_understanding", field));
  const operational = /\b(?:adapter|adaptor|fixings?|fittings?|included|not included|compatib(?:le|ility)|installation|pressure washer|warning|requires?|lance|lower panel|wheel|drying pass|fewer passes|awkward|around)\b/i;
  const businessLevel = (item) => {
    if (!operational.test(String(item.value))) return true;
    const records = (item.evidence_refs || []).map((id) => evidenceById.get(id)).filter(Boolean);
    return records.some((record) => ["homepage", "about_page", "category_page"].includes(record.source_type)) || new Set(records.map((record) => record.source_uri_or_location)).size > 1;
  };
  const businessCustomerItems = customerItems.filter(businessLevel);
  const name = value("business_identity", "business_name") || "The business";
  const type = value("business_identity", "business_type");
  const description = value("business_identity", "business_description");
  const focus = value("catalogue_understanding", "product_focus");
  const categories = itemFor("catalogue_understanding", "primary_categories");
  const products = itemFor("catalogue_understanding", "representative_product_refs");
  const coherence = value("catalogue_understanding", "catalogue_coherence");
  const identityItems = [bio.business_identity?.business_name, bio.business_identity?.business_type, bio.business_identity?.business_description, bio.business_identity?.sales_channel].filter(Boolean);
  const positioningClaims = itemFor("positioning", "positioning_claims").filter((item) => item.assertion_scope === "business_claim");
  const positioningInterpretations = [...itemFor("positioning", "value_proposition"), ...itemFor("positioning", "positioning_themes"), ...itemFor("positioning", "differentiators"), bio.positioning?.price_value_orientation].filter((item) => item?.value !== null && item?.assertion_scope === "interpretation");
  const unknownEntries = knowledgeEntries(bio).filter(({ item, path: pathName }) => item.knowledge_type === "unknown" && !pathName.startsWith("audience_architecture") && !pathName.includes("catalogue_limitations"));
  const gaps = (bio.knowledge_gaps || []).filter((gap) => !/sampled product|catalogue scope|limited product sample|technical limitation|competitor benchmark|complete pricing structure/i.test(`${gap.field} ${gap.reason}`));
  const customerGroups = uniqueConcepts(itemFor("customer_understanding", "target_customer_groups").filter(businessLevel).map((item) => presentValue(item.value)));
  const joinNatural = (items) => items.length < 2 ? (items[0] || "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
  let summaryBehaviour = "";
  let summaryMotivation = "";
  const customerSummary = (() => {
    if (!customerGroups.length) return "The intended customer is not yet clear from the available evidence.";
    const group = cleanConcept(customerGroups[0]).replace(/^[A-Z]/, (character) => character.toLowerCase());
    const behaviours = uniqueConcepts(itemFor("customer_understanding", "customer_behaviours").filter(businessLevel).map((item) => cleanConcept(item.value).replace(/^[A-Z]/, (character) => character.toLowerCase())));
    const motivations = uniqueConcepts([...itemFor("customer_understanding", "customer_priorities"), ...itemFor("customer_understanding", "purchase_drivers")].filter(businessLevel).map((item) => cleanConcept(item.value).replace(/^[A-Z]/, (character) => character.toLowerCase())));
    const behaviour = behaviours.find((item) => /clean|wash|use|buy|shop|maintain|look after/i.test(item));
    const motivation = motivations.find((item) => /result|quality|easy|simple|fuss|value|reliable|convenien/i.test(item));
    summaryBehaviour = behaviour;
    summaryMotivation = motivation;
    const groupWords = new Set(conceptKey(group).split(" ").filter((word) => word.length > 3));
    const behaviourWords = behaviour ? behaviour.split(/\s+/).filter((word) => word.length > 3) : [];
    const sharedBehaviourWords = behaviourWords.filter((word) => groupWords.has(word)).length;
    const behaviourAddsDistinctContext = behaviour && (behaviourWords.length === 0 || sharedBehaviourWords / behaviourWords.length < 0.5);
    return `Your website primarily speaks to ${group}${behaviourAddsDistinctContext ? ` who ${behaviour}` : ""}${motivation ? ` and want ${motivation}` : ""}.`;
  })();
  const founderQuestion = (field, reason = "") => { const text = `${field} ${reason}`.toLowerCase(); if (/owned_brand|own brand|third.party/.test(text)) return "Do you mainly sell your own-brand products, third-party products, or both?"; if (/geographic|market/.test(text)) return "Which geographic market or markets are you primarily targeting?"; if (/price|budget|value threshold|price_value/.test(text)) return "How important is price/value compared with quality, results, convenience or other buying factors?"; if (/customer|audience|profile|behavio[u]?r/.test(text)) return "Does the customer description above match the customers you actually want to attract?"; if (/position|differentiat|value proposition/.test(text)) return "Is this positioning an accurate description of how you want the business to be understood?"; return "Is there important business context missing from this understanding?"; };
  const friendlyField = (pathName) => { const field = String(pathName).replace(/\[\d+\]/g, "").split(".").pop(); return titleCase(field); };
  const summary = description || [type, focus].filter(Boolean).join(" focused on ") || `${name} appears to be an ecommerce business.`;
  return `# Business Understanding

We analysed your website to understand your business, products, positioning and intended customers. Please review the findings below and correct anything that does not accurately represent your business.

## What we think your business is

${summary}

${name !== "The business" ? `- Business name: ${name}` : ""}
${type ? `- Business model: ${type}` : ""}
${value("business_identity", "sales_channel") ? `- Sales channel: ${value("business_identity", "sales_channel")}` : ""}
${basedOn(identityItems)}

## What you sell

${focus ? `${focus}\n` : "The catalogue appears to centre on the following areas:\n"}${categories.length ? `\n### Main categories\n\n${unique(categories.map((item) => item.value)).map((item) => `- ${item}`).join("\n")}` : ""}

${products.length ? `### Examples from the catalogue\n\n${unique(products.map((item) => item.value)).slice(0, 6).map((item) => `- ${item}`).join("\n")}` : ""}

${coherence ? `The catalogue appears **${coherence}**.\n` : ""}${basedOn([...categories, ...products, bio.catalogue_understanding?.product_focus, bio.catalogue_understanding?.catalogue_coherence].filter(Boolean))}

## Who we think you're speaking to

${customerSummary}

${(() => { const items = [...itemFor("customer_understanding", "customer_priorities"), ...itemFor("customer_understanding", "customer_motivations"), ...itemFor("customer_understanding", "purchase_drivers")].filter((item) => businessLevel(item) && conceptKey(item.value) !== conceptKey(summaryMotivation)); return items.length ? `### What seems important to them\n\n${bullets(items, { limit: 6 })}` : ""; })()}

${(() => { const items = itemFor("customer_understanding", "customer_behaviours").filter((item) => businessLevel(item) && conceptKey(item.value) !== conceptKey(summaryBehaviour)); return items.length ? `### How they appear to use your products\n\n${bullets(items, { limit: 5 })}` : ""; })()}

${(() => { const items = itemFor("customer_understanding", "customer_problems").filter(businessLevel); return items.length ? `### Problems they appear to care about\n\n${bullets(items, { limit: 5 })}` : ""; })()}

${basedOn(businessCustomerItems)}

## How we think you're positioning the business

### What your website says

${bullets(positioningClaims)}

${basedOn(positioningClaims)}

### What we understand from that

${bullets(positioningInterpretations)}

${basedOn(positioningInterpretations)}

## A few things we'd like you to confirm

${(() => { const questions = unique([...unknownEntries.map(({ path: pathName }) => founderQuestion(pathName)), ...gaps.map((gap) => founderQuestion(gap.field, gap.reason))]); return questions.length ? questions.map((question) => `- ${question}`).join("\n") : "- No priority questions were identified."; })()}

## Audience structure

Does your business mainly serve one core type of customer, or do you have several meaningfully different customer groups?

## Your review

Please confirm whether the understanding above accurately represents your business.

- [ ] Yes, this accurately represents the business
- [ ] Mostly, but I need to correct or clarify something
- [ ] No, there are important misunderstandings

### Anything you'd like to correct or add?

_Write any corrections, context or missing information here._
`;
}

/** Regenerate only the client-facing review from an existing validated BIO. */
export async function writeBusinessIntelligenceFounderReview({ bio, outputPath }) {
  if (!bio || typeof bio !== "object") throw new Error("A Business Intelligence Object is required.");
  if (!outputPath) throw new Error("An output path is required.");
  await writeFile(outputPath, renderBusinessIntelligenceFounderReview(bio), { encoding: "utf8", flag: "w" });
  return outputPath;
}

async function writeSuccessfulArtifacts({ outputRoot, artifact, bio, passReports, createdAt }) {
  const directory = path.resolve(outputRoot, businessSlug(artifact.business_url), safeTimestamp(createdAt));
  await mkdir(directory, { recursive: true });
  const files = {
    directory,
    businessIntelligence: path.join(directory, "business-intelligence.json"),
    validation: path.join(directory, "interpretation-validation-report.json"),
    founderReview: path.join(directory, "founder-review.md")
  };
  const report = {
    schema_version: "1.0.0", artifact_type: "business_intelligence_multipass_interpretation_validation", created_at: createdAt,
    valid: true, validation_status: bio.validation_status, partial_passes: passReports,
    evidence_counts: { supplied_total: artifact.evidence.length, selected_total: passReports.reduce((total, pass) => total + pass.evidence_count, 0), contexts: Object.fromEntries(passReports.map((pass) => [pass.pass, pass.evidence_count])) },
    final_validation: { valid: true, errors: [] }, execution_metadata: bio.execution_metadata
  };
  await Promise.all([
    writeFile(files.businessIntelligence, `${JSON.stringify(bio, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
    writeFile(files.validation, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
    writeFile(files.founderReview, renderBusinessIntelligenceFounderReview(bio), { encoding: "utf8", flag: "wx" })
  ]);
  return files;
}

export async function interpretBusinessEvidenceInPasses({ evidenceArtifact, provider, outputRoot = "artifacts/business-intelligence", now = () => new Date(), monotonicNow = () => performance.now(), writeArtifacts = true }) {
  if (evidenceArtifact?.artifact_type !== "business_intelligence_raw_evidence") throw new Error("A raw Business Intelligence evidence artifact is required.");
  if (!provider?.generate || !provider.id || !provider.model) throw new Error("An injected Business Intelligence interpretation provider is required.");
  const relevantEvidence = selectRelevantBusinessEvidence(evidenceArtifact);
  const contexts = partitionBusinessInterpretationEvidence(relevantEvidence);
  const completedAt = now().toISOString();
  const outputs = {};
  const execution = { deterministic_steps: ["select_relevant_business_evidence", "partition_evidence_by_pass"], ai_calls: [], input_tokens: 0, output_tokens: 0, external_api_call_count: 0 };
  const passReports = [];
  const startedTick = monotonicNow();
  for (const pass of ["catalogue", "positioning", "customer"]) {
    const userPrompt = passPrompt({ artifact: evidenceArtifact, pass, contexts });
    const responseSchema = passSchema(pass);
    const response = await provider.generate({ systemPrompt: BUSINESS_INTELLIGENCE_SYSTEM_PROMPT, userPrompt, responseSchema, temperature: 0.1 });
    let output;
    try { output = JSON.parse(response.rawText); } catch (error) {
      const errors = [`${pass} pass returned malformed JSON: ${error.message}`];
      const diagnostic = writeArtifacts ? await writeRejectedDiagnostic({ outputRoot, artifact: evidenceArtifact, pass, output: response.rawText, errors, evidence: contexts[pass].evidence, model: response.model || provider.model, createdAt: now().toISOString() }) : null;
      throw Object.assign(new Error(`${pass} Business Intelligence interpretation pass failed validation.`), { errors, diagnostic });
    }
    const errors = validatePassOutput({ artifact: evidenceArtifact, pass, output, evidence: contexts[pass].evidence, completedAt });
    if (errors.length) {
      const diagnostic = writeArtifacts ? await writeRejectedDiagnostic({ outputRoot, artifact: evidenceArtifact, pass, output, errors, evidence: contexts[pass].evidence, model: response.model || provider.model, createdAt: now().toISOString() }) : null;
      throw Object.assign(new Error(`${pass} Business Intelligence interpretation pass failed validation.`), { errors, diagnostic });
    }
    outputs[pass] = output;
    const usage = response.usage || {};
    execution.ai_calls.push({ pass, provider: response.provider || provider.id, model: response.model || provider.model, reasoning_tokens: response.reasoning_tokens ?? usage.reasoning_tokens ?? null });
    execution.input_tokens += Number(usage.prompt_tokens ?? usage.input_tokens ?? 0);
    execution.output_tokens += Number(usage.completion_tokens ?? usage.output_tokens ?? 0);
    execution.external_api_call_count += 1;
    passReports.push({ pass, valid: true, model: response.model || provider.model, provider: response.provider || provider.id, evidence_count: contexts[pass].evidence.length, input_tokens: Number(usage.prompt_tokens ?? usage.input_tokens ?? 0), output_tokens: Number(usage.completion_tokens ?? usage.output_tokens ?? 0), reasoning_tokens: response.reasoning_tokens ?? usage.reasoning_tokens ?? null });
  }
  const assembled = skeleton({ artifact: evidenceArtifact, completedAt, passOutput: { business_identity: outputs.catalogue.business_identity, catalogue_understanding: outputs.catalogue.catalogue_understanding, positioning: outputs.positioning.positioning, customer_understanding: outputs.customer.customer_understanding, knowledge_gaps: [...(outputs.catalogue.knowledge_gaps || []), ...(outputs.positioning.knowledge_gaps || []), ...(outputs.customer.knowledge_gaps || [])] } });
  assembled.execution_metadata = { ...execution, deterministic_steps: [...execution.deterministic_steps, "assemble_validated_partial_outputs", "validate_business_intelligence_object"], execution_time_ms: Math.max(0, Math.round(monotonicNow() - startedTick)) };
  const errors = validateInterpretedBusinessIntelligence(assembled, [...(outputs.catalogue.assumptions || []), ...(outputs.positioning.assumptions || []), ...(outputs.customer.assumptions || [])]);
  if (errors.length) throw Object.assign(new Error("Assembled Business Intelligence Object failed validation."), { errors });
  assertValidBusinessIntelligenceObject(assembled);
  const files = writeArtifacts ? await writeSuccessfulArtifacts({ outputRoot, artifact: evidenceArtifact, bio: assembled, passReports, createdAt: completedAt }) : null;
  return { bio: assembled, passes: outputs, contexts, passReports, files };
}
