import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertValidBusinessIntelligenceObject } from "./validation.js";
import { createHumanValidationDecision, resolveHumanValidationDecision } from "./humanValidation.js";
import { renderBusinessIntelligenceFounderReview } from "./multiPassInterpretation.js";

const SKIP = new Set(["metadata", "source_evidence", "execution_metadata", "conflicts", "human_validation_decisions", "human_corrections"]);

function walkKnowledge(value, pathName = "", output = []) {
  if (Array.isArray(value)) { value.forEach((item, index) => walkKnowledge(item, `${pathName}[${index}]`, output)); return output; }
  if (!value || typeof value !== "object") return output;
  if (Object.hasOwn(value, "knowledge_type") && Object.hasOwn(value, "evidence_refs")) { output.push({ path: pathName, value }); return output; }
  for (const [key, child] of Object.entries(value)) if (!SKIP.has(key)) walkKnowledge(child, pathName ? `${pathName}.${key}` : key, output);
  return output;
}

function getAt(root, pathName) {
  return pathName.replace(/\[([0-9]+)\]/g, ".$1").split(".").filter(Boolean).reduce((value, key) => value?.[key], root);
}

function setAt(root, pathName, value) {
  const keys = pathName.replace(/\[([0-9]+)\]/g, ".$1").split(".").filter(Boolean);
  const last = keys.pop(); let cursor = root;
  for (const key of keys) cursor = cursor[key] ??= /^\d+$/.test(key) ? [] : {};
  cursor[last] = value;
}

export function parseFounderBusinessReview(markdown) {
  if (typeof markdown !== "string" || !markdown.trim()) throw new Error("Founder review Markdown is required.");
  const options = [...markdown.matchAll(/^\s*-\s*\[([ xX])\]\s+(.+)$/gm)].map((match) => ({ selected: match[1].toLowerCase() === "x", label: match[2].trim() }));
  const selected = options.filter((option) => option.selected);
  if (selected.length !== 1) throw new Error("Founder review must select exactly one review option.");
  const heading = markdown.match(/###\s+Anything you'd like to correct or add\?\s*\n([\s\S]*)$/i);
  const clarification = heading?.[1]?.trim().replace(/^_+|_+$/g, "").trim() || "";
  if (selected[0].label.toLowerCase().startsWith("mostly") && !clarification) throw new Error("A clarification is required when the review selects Mostly.");
  return { selected_option: selected[0].label, options, clarification_text: clarification, markdown };
}

function extractFounderKnowledge(text) {
  const result = {};
  const ownBrand = text.match(/own-brand products are the primary focus[^.]*\.?/i);
  if (ownBrand) result.owned_brand_status = "Primarily own-brand products; third-party products may also be sold.";
  const geography = text.match(/primary geographic market is (?:the )?([^.]+)\.?/i);
  if (geography) result.geographic_market = geography[1].trim();
  const audience = text.match(/primarily serves one core audience:\s*([^.!?]+)[.!?]/i);
  if (audience) { result.audience_type = "focused_business"; result.audience_status = "meaningful"; result.customer_group = audience[1].trim(); }
  const exclusion = text.match(/(Professional [^.]+ are not the intended core audience\.)/i);
  if (exclusion) result.exclusion = exclusion[1].replace(/\.$/, "");
  const price = text.match(/Quality and results are more important[^.]*\.[\s\S]*?Value for money matters[^.]*\./i);
  if (price) result.price_value_orientation = "quality_over_lowest_price";
  const positioning = text.match(/The overall understanding of ([^.]+) is accurate\.?/i);
  if (positioning) result.positioning_confirmation = positioning[0];
  return result;
}

function applyDecision({ bio, pathName, action, correctedValue, reason, reviewer, createdAt, decisions, corrections }) {
  const original = getAt(bio, pathName);
  const result = createHumanValidationDecision({ action, targetPath: pathName, originalValue: original, correctedValue, reason, reviewer, createdAt });
  decisions.push(result.decision); if (result.correction) corrections.push(result.correction);
  const resolved = resolveHumanValidationDecision(original, result.decision, result.correction);
  if (resolved.effective !== null) setAt(bio, pathName, resolved.effective);
  return result;
}

function firstPath(bio, pathName) { return getAt(bio, pathName) !== undefined ? pathName : null; }

export function applyFounderBusinessReview({ bio, review, reviewer = "founder", createdAt = new Date().toISOString() }) {
  const parsed = typeof review === "string" ? parseFounderBusinessReview(review) : review;
  if (!parsed?.selected_option) throw new Error("A parsed founder review is required.");
  const effective = structuredClone(bio); const decisions = []; const corrections = [];
  const extracted = extractFounderKnowledge(parsed.clarification_text);
  const changedPaths = new Set();
  const correct = (pathName, value, reason) => { if (!firstPath(effective, pathName)) return; applyDecision({ bio: effective, pathName, action: "correct", correctedValue: value, reason, reviewer, createdAt, decisions, corrections }); changedPaths.add(pathName); };
  if (extracted.owned_brand_status) correct("business_identity.owned_brand_status", extracted.owned_brand_status, "Founder clarified the business's brand ownership model.");
  if (extracted.geographic_market) correct("business_identity.geographic_market", extracted.geographic_market, "Founder clarified the primary geographic market.");
  if (extracted.audience_type) {
    correct("audience_architecture.type", extracted.audience_type, "Founder confirmed the business-wide audience structure.");
    correct("audience_architecture.business_wide_profile_status", extracted.audience_status, "Founder confirmed a meaningful business-wide audience.");
  }
  if (extracted.customer_group && effective.customer_understanding?.target_customer_groups?.length) correct("customer_understanding.target_customer_groups[0]", extracted.customer_group, "Founder corrected and clarified the intended customer group.");
  if (extracted.exclusion) {
    const pathName = effective.customer_understanding?.exclusions?.length ? "customer_understanding.exclusions[0]" : "customer_understanding.exclusions[0]";
    if (!effective.customer_understanding) effective.customer_understanding = {};
    if (!Array.isArray(effective.customer_understanding.exclusions)) effective.customer_understanding.exclusions = [];
    if (!effective.customer_understanding.exclusions.length) effective.customer_understanding.exclusions.push(null);
    applyDecision({ bio: effective, pathName, action: "correct", correctedValue: extracted.exclusion, reason: "Founder clarified who is not the primary intended audience.", reviewer, createdAt, decisions, corrections }); changedPaths.add(pathName);
  }
  if (extracted.price_value_orientation) correct("positioning.price_value_orientation", extracted.price_value_orientation, "Founder clarified the quality/value orientation.");
  for (const { path: pathName, value } of walkKnowledge(effective)) {
    if (changedPaths.has(pathName) || value.value === null) continue;
    applyDecision({ bio: effective, pathName, action: "approve", reason: "Founder selected Mostly and did not contradict this finding.", reviewer, createdAt, decisions, corrections });
  }
  effective.human_validation_decisions = [...(effective.human_validation_decisions || []), ...decisions];
  effective.human_corrections = [...(effective.human_corrections || []), ...corrections];
  effective.validation_status = "validated";
  effective.metadata.updated_at = createdAt;
  assertValidBusinessIntelligenceObject(effective);
  return { bio: effective, parsed, extracted, decisions, corrections, remaining_unknowns: walkKnowledge(effective).filter(({ value }) => value.knowledge_type === "unknown").map(({ path }) => path) };
}

export function renderValidatedFounderReview({ bio, parsed, extracted }) {
  const rendered = renderBusinessIntelligenceFounderReview(bio).replace(/^# Business Understanding/m, "# Validated Business Understanding").replace(/^## What we think you're speaking to/m, "## Validated customer understanding").replace(/^## What you sell/m, "## Validated catalogue").replace(/^## Who we think you're speaking to/m, "## Validated customer understanding").replace(/^## How we think you're positioning the business/m, "## Validated positioning");
  const report = rendered.split("\n## A few things we'd like you to confirm")[0];
  const clarifications = parsed?.clarification_text ? `\n\n## Founder-supplied clarifications\n\n${parsed.clarification_text}\n` : "";
  const audienceType = bio.audience_architecture?.type?.value;
  const audienceText = audienceType === "focused_business" ? "The founder confirmed that the business serves one meaningful core audience." : audienceType === "multi_audience_business" ? "The founder confirmed that the business serves several meaningfully different customer groups." : audienceType === "general_store" ? "The founder confirmed that no single business-wide audience should be treated as primary." : "Audience structure remains unresolved.";
  const remaining = walkKnowledge(bio).filter(({ value }) => value.knowledge_type === "unknown");
  return `${report}\n\n## Validated audience structure\n\n${audienceText}\n${clarifications}\n## Remaining unknowns\n\n${remaining.length ? remaining.map(({ path: pathName }) => `- ${pathName.split(".").at(-1).replace(/_/g, " ")}`).join("\n") : "No previously recorded unknowns remain unresolved by this founder validation pass."}\n\n## Validation status\n\nValidated by founder review.\n`;
}

export async function applyFounderBusinessReviewFromFiles({ bioPath, reviewPath, outputRoot, reviewer = "founder", createdAt = new Date().toISOString() }) {
  const [bioText, reviewText] = await Promise.all([readFile(bioPath, "utf8"), readFile(reviewPath, "utf8")]);
  const result = applyFounderBusinessReview({ bio: JSON.parse(bioText), review: reviewText, reviewer, createdAt });
  const directory = path.resolve(outputRoot);
  await mkdir(directory, { recursive: true });
  const files = { directory, businessIntelligence: path.join(directory, "business-intelligence-validated.json"), metadata: path.join(directory, "founder-validation-metadata.json"), founderReview: path.join(directory, "founder-review-final.md") };
  await writeFile(files.businessIntelligence, `${JSON.stringify(result.bio, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await writeFile(files.metadata, `${JSON.stringify({ artifact_type: "business_intelligence_founder_validation", source_bio: bioPath, source_review: reviewPath, selected_review_option: result.parsed.selected_option, clarification_text: result.parsed.clarification_text, decisions_created: result.decisions, corrections_created: result.corrections, unknowns_resolved: result.corrections.map((item) => item.target_path), remaining_unknowns: result.remaining_unknowns, validation_status: result.bio.validation_status, created_at: createdAt, provenance: { source_type: "human_validation", reviewer } }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await writeFile(files.founderReview, renderValidatedFounderReview(result), { encoding: "utf8", flag: "wx" });
  return { ...result, files };
}
