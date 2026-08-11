import { validateEditorialRevision } from "../editorial/revision-validation.js";
import { validateVoiceTransformation } from "./profile.js";
import { visibleCopyStrings } from "../editorial/founder-voice.js";
import { sha256 } from "../research/core/canonical.js";

const error = (code, path, message) => ({ code, path, message });

export function validateGeneratedVoiceTransformation(revision, { input, plan, conceptPolicy, allowlists }) {
  const sourcePage = input.source.semantic_page;
  const page = revision?.page;
  const editorial = validateEditorialRevision(revision, { sourcePageHash: input.source.semantic_page_sha256, plan, conceptPolicy, allowlists, founderFactIds: [] });
  const preservation = page ? validateVoiceTransformation({ before: sourcePage, after: page, founderFactIds: [] }) : { status: "FAIL", errors: [error("PAGE_MISSING", "$.page", "Page is required.")] };
  const errors = [...editorial.errors, ...preservation.errors];
  if (!page) return { status: "FAIL", errors, editorial, preservation };
  if (JSON.stringify(page.search_intent) !== JSON.stringify(sourcePage.search_intent)) errors.push(error("SEARCH_INTENT_DRIFT", "$.page.search_intent", "Search intent must be exact."));
  if (page.h1 !== sourcePage.h1) errors.push(error("H1_DRIFT", "$.page.h1", "H1 must remain exact."));
  const copy = visibleCopyStrings(page).join(" ");
  // This is deliberately scoped to visible customer copy (metadata and
  // annotations are excluded by visibleCopyStrings). It catches the
  // evidence-process register without banning ordinary words such as
  // “evidence-based” in internal fields.
  const legalistic = copy.match(/\b(?:there is no reliable basis|product details support|fit assessment|does not establish|cannot be concluded|supplied evidence|approved registry|evidence packet|available evidence|evidence here|evidence establishes|evidence supports|evidence suggests|cannot establish|based on the available evidence|the evidence (?:does not|cannot|supports|suggests))\b/gi) || [];
  if (legalistic.length) errors.push(error("LEGALISTIC_LANGUAGE_REMAINS", "$.page", legalistic.join(" | ")));
  const rawSpeech = copy.match(/\b(?:get yours|anywho|do as you're told|fucking|shit videos?|capiche)\b/gi) || [];
  if (rawSpeech.length) errors.push(error("RAW_SPOKEN_MANNERISM", "$.page", rawSpeech.join(" | ")));
  const product = page.components.find((item) => item.component_type === "product_recommendation");
  const productCopy = product ? visibleCopyStrings(product.data).join(" ") : "";
  if (!/\b(?:I|we|our)\b/i.test(productCopy)) errors.push(error("DETACHED_COMMERCIAL_VOICE", "$.page.components.product_recommendation", "Product ownership must be natural and explicit."));
  const anchors = [
    ["1200_gsm", /1200\s*GSM/i], ["dual_sided_microfibre", /dual[- ]sided microfibre/i], ["dimensions", /90\s*[×x]\s*60\s*cm/i],
    ["soft_microfibre_edging", /soft microfibre edging/i], ["vehicle_suitability", /cars? and larger vehicles?/i], ["saturated_weight", /(?:heavier|extra weight)[^.!?]{0,80}saturat|saturat[^.!?]{0,80}(?:heavier|extra weight)/i]
  ];
  for (const [id, expression] of anchors) if (!expression.test(productCopy)) errors.push(error("PRODUCT_FACT_MISSING", "$.page.components.product_recommendation", id));
  const simplicityContrastUsed = /\b(?:doesn['’]t need|don['’]t need|rather than|instead of|overcomplicat|what actually matters|headline number|keep it simple)\b/i.test(copy);
  return {
    schema_version: "1.0.0", artifact_type: "generated_voice_transformation_validation",
    status: errors.length ? "FAIL" : "PASS", errors, editorial, preservation,
    bindings: { source_semantic_sha256: input.source.semantic_page_sha256, voice_profile_sha256: input.voice.profile_sha256, strategy_sha256: input.strategy.strategy_sha256 },
    metrics: { legalistic_language_matches: legalistic.length, raw_spoken_mannerism_matches: rawSpeech.length, founder_fact_ids: 0, product_fact_anchors_preserved: anchors.length - errors.filter((item) => item.code === "PRODUCT_FACT_MISSING").length, product_fact_anchor_total: anchors.length, simplicity_contrast_used: simplicityContrastUsed, semantic_page_sha256: sha256(page) }
  };
}

export function reviewVoiceTransformationQuality(revision, validation) {
  const page = revision.page; const copy = visibleCopyStrings(page).join(" "); const issues = [];
  if (validation.status !== "PASS") issues.push({ code: "DETERMINISTIC_VALIDATION_FAILED", severity: "error" });
  if (/in this (?:comprehensive|ultimate) guide|navigate the world of|whether you['’]re a/i.test(copy)) issues.push({ code: "GENERIC_AI_LANGUAGE", severity: "error" });
  const firstPersonComponents = page.components.filter((item) => /\b(?:I|we|our)\b/i.test(visibleCopyStrings(item.data).join(" "))).length;
  if (firstPersonComponents < 2) issues.push({ code: "FOUNDER_VOICE_TOO_THIN", severity: "error" });
  if (firstPersonComponents > Math.ceil(page.components.length * 0.7)) issues.push({ code: "FOUNDER_VOICE_FORCED", severity: "error" });
  const quick = page.components.find((item) => item.component_type === "quick_answer")?.data?.concise_answer || "";
  if (quick.length < 80 || !/(choose|look|matters|right|best)/i.test(quick)) issues.push({ code: "QUICK_ANSWER_WEAK", severity: "error" });
  const faq = page.components.find((item) => item.component_type === "faq")?.data?.items || [];
  if (!faq.length || faq.some((item) => item.answer.length < 30)) issues.push({ code: "FAQ_WEAK", severity: "error" });
  const status = issues.some((item) => item.severity === "error") ? "FAIL" : issues.length ? "PASS_WITH_WARNINGS" : "PASS";
  return { schema_version: "1.0.0", artifact_type: "voice_transformation_editorial_review", status, accepted_for_human_review: status !== "FAIL", founder_voice: status === "FAIL" ? "Material issue remains." : "Reads as a careful founder-written article rather than a transcript, agency page or casualised AI draft.", assessment: { page_progression: validation.editorial?.conceptOwnership?.status === "PASS", product_integration_natural: !validation.errors.some((item) => item.code === "DETACHED_COMMERCIAL_VOICE"), technical_language_simplified: !validation.errors.some((item) => item.code === "LEGALISTIC_LANGUAGE_REMAINS"), simplicity_contrast_used: validation.metrics?.simplicity_contrast_used || false, raw_tiktok_mannerisms_introduced: validation.metrics?.raw_spoken_mannerism_matches || 0, first_person_component_count: firstPersonComponents, faq_count: faq.length }, issues };
}
