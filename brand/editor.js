import { canonicalJson, sha256 } from "../research/core/canonical.js";
import { validateBrandVoiceProfile } from "./voice-profile.js";

function replaceForbidden(text, profile) {
  let result = text;
  for (const phrase of profile.forbidden_phrases) result = result.replace(new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")}\\b`, "giu"), "");
  return result.replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
}

function transformValue(value, profile) {
  if (typeof value === "string") return replaceForbidden(value, profile);
  if (Array.isArray(value)) return value.map((item) => transformValue(item, profile));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, transformValue(item, profile)]));
  return value;
}

function componentText(component) {
  return JSON.stringify(component.data || {}).replace(/[{}\[\]"]/g, " ").replace(/\\n/g, " ");
}

function scoreComponent(component, profile) {
  const text = componentText(component);
  const words = text.split(/\s+/u).filter(Boolean);
  const sentenceCount = Math.max(1, (text.match(/[.!?]/g) || []).length);
  const firstPerson = /\b(I|we|our|my|you|your)\b/i.test(text);
  const forbidden = profile.forbidden_phrases.some((phrase) => text.toLowerCase().includes(phrase.toLowerCase()));
  return {
    voice: Math.max(1, Math.min(10, 7 + (firstPerson ? 1 : 0) - (forbidden ? 2 : 0))),
    human_feel: Math.max(1, Math.min(10, 7 + (sentenceCount > 1 ? 1 : 0) + (firstPerson ? 1 : 0))),
    commercial_confidence: component.component_type === "product_recommendation" ? (firstPerson ? 8 : 6) : 7,
    clarity: words.length > 0 ? 8 : 1
  };
}

function analyzeComponent(component, profile) {
  const text = componentText(component);
  const issues = [];
  const lower = text.toLowerCase();
  const data = component.data || {};
  if (profile.forbidden_phrases.some((phrase) => lower.includes(phrase.toLowerCase()))) issues.push({ type: "generic_language", confidence: 0.98 });
  if (/\b(guaranteed|guarantees|100%|always works|never fails)\b/i.test(text)) issues.push({ type: "unsupported_claim", confidence: 0.99 });
  if (component.component_type === "product_recommendation") {
    if (!/^\s*(my|i would|we would|our)\b/i.test(data.relevance_reason || "")) issues.push({ type: "weak_opinion", confidence: 0.9 });
    if (!data.suitable_customer) issues.push({ type: "weak_customer_focus", confidence: 0.88 });
    if (!data.recommendation_context) issues.push({ type: "unclear_recommendation", confidence: 0.86 });
  }
  if (["hero", "quick_answer"].includes(component.component_type) && !/\b(you|your|car owner|owner|job|wash|dry)\b/i.test(text)) issues.push({ type: "weak_customer_focus", confidence: 0.82 });
  const rewrite_required = issues.some((issue) => issue.confidence >= 0.85 && issue.type !== "unsupported_claim");
  return { component: component.component_type, issues, confidence: issues.length ? Math.max(...issues.map((issue) => issue.confidence)) : 0.99, rewrite_required, scores_before: scoreComponent(component, profile) };
}

export function analyzeBrandPage(page, profile) {
  const validation = validateBrandVoiceProfile(profile);
  if (validation.status === "FAIL") throw new Error(validation.errors.join("; "));
  if (!page || !Array.isArray(page.components)) throw new Error("SemanticPage is required.");
  const components = page.components.map((component) => analyzeComponent(component, profile));
  return { artifact_type: "editorial_report", profile: profile.brand_name, components, issues: components.flatMap((item) => item.issues), rewrite_count: components.filter((item) => item.rewrite_required).length };
}

function editComponent(component, profile, analysis) {
  if (!analysis.rewrite_required) return structuredClone(component);
  const edited = transformValue(component, profile);
  const data = edited.data || {};
  if (component.component_type === "product_recommendation" && profile.recommendation_style === "first_person_opinion" && typeof data.relevance_reason === "string" && !/^my pick\b/i.test(data.relevance_reason)) {
    data.relevance_reason = `My pick is simple: ${data.relevance_reason}`;
  }
  if (component.component_type === "founder_note" && profile.founder_style === "first_person_reason" && typeof data.opinion === "string" && !/\bwe made this\b/i.test(data.opinion)) {
    data.opinion = `The reason we made this: ${data.opinion}`;
  }
  return { ...edited, data };
}

export function applyBrandEditor(page, profile) {
  const validation = validateBrandVoiceProfile(profile);
  if (validation.status === "FAIL") throw new Error(validation.errors.join("; "));
  if (!page || !Array.isArray(page.components)) throw new Error("SemanticPage is required.");
  const report = analyzeBrandPage(page, profile);
  if (report.issues.some((issue) => issue.type === "unsupported_claim")) throw new Error("Unsupported claim requires evidence review before Brand Editor transformation.");
  const edited = structuredClone(page);
  edited.components = page.components.map((component, index) => editComponent(component, profile, report.components[index]));
  report.components = report.components.map((item, index) => ({ ...item, scores_after: scoreComponent(edited.components[index], profile), score_improved: Object.values(scoreComponent(edited.components[index], profile)).reduce((a, b) => a + b, 0) >= Object.values(item.scores_before).reduce((a, b) => a + b, 0) }));
  return {
    artifact_type: "brand_edited_semantic_page",
    brand_profile_version: profile.schema_version,
    brand_name: profile.brand_name,
    source_semantic_page_sha256: sha256(canonicalJson(page)),
    semantic_page_sha256: sha256(canonicalJson(edited)),
    semantic_content_modified: JSON.stringify(page) !== JSON.stringify(edited),
    editorial_report: report,
    product_references_preserved: JSON.stringify(page.components.map((item) => item.data?.product_reference)) === JSON.stringify(edited.components.map((item) => item.data?.product_reference)),
    edited_components: edited.components.map((item) => item.component_id),
    page: edited
  };
}
