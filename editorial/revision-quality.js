import { visibleCopyStrings } from "./founder-voice.js";

export function reviewFounderRevisionQuality(revision, validation) {
  const page = revision.page;
  const copy = visibleCopyStrings(page).join(" ");
  const issues = [];
  if (validation.status === "FAIL") issues.push({ code: "DETERMINISTIC_VALIDATION_FAILED", severity: "error", message: "Deterministic revision validation failed." });
  const firstPersonCount = page.components.filter((item) => /\b(?:I|I've|I'd|I'm|we|our)\b/i.test(visibleCopyStrings({ components: [item] }).join(" "))).length;
  if (firstPersonCount < 2) issues.push({ code: "FOUNDER_VOICE_TOO_THIN", severity: "error", message: "The page remains too neutral to feel founder-led." });
  if (firstPersonCount > Math.ceil(page.components.length * 0.75)) issues.push({ code: "FOUNDER_VOICE_FORCED", severity: "error", message: "First-person voice is forced into too many components." });
  if (/supplied evidence|approved registry|registered option|evidence packet|packet-backed|approved product|evidence boundary|verified registry|supplied first-party example|unsupported by the packet|approved link|source registry/i.test(copy)) issues.push({ code: "ROBOTIC_GOVERNANCE_LANGUAGE", severity: "error", message: "Customer copy still exposes internal process language." });
  if (/in this (?:comprehensive|ultimate) guide|whether you're|navigate the world of/i.test(copy)) issues.push({ code: "GENERIC_AI_VOICE", severity: "error", message: "Generic AI/editorial filler remains." });
  const product = page.components.find((item) => item.component_type === "product_recommendation");
  if (!product || !/\b(?:I|we|our)\b/i.test(visibleCopyStrings({ components: [product] }).join(" "))) issues.push({ code: "COMMERCIAL_TRANSPARENCY_WEAK", severity: "error", message: "Product recommendation does not acknowledge Street Kingz's commercial role naturally." });
  if (!product?.data?.cta_label || product.data.cta_label.length > 70) issues.push({ code: "CTA_NOT_CUSTOMER_READY", severity: "error", message: "CTA is not usable customer-facing copy." });
  const faq = page.components.find((item) => item.component_type === "faq");
  if (!faq || faq.data.items.length < 3 || faq.data.items.some((item) => item.answer.length < 35)) issues.push({ code: "FAQ_NOT_USEFUL", severity: "error", message: "FAQ coverage is not useful enough." });
  const redundantFaqs = (faq?.data?.items || []).filter((item) => /(?:factors|criteria) covered above|use the factors covered above|as explained above/i.test(item.answer)).map((item) => item.question);
  if (redundantFaqs.length) issues.push({ code: "REDUNDANT_FAQ", severity: "warning", message: `FAQ repeats completed coverage: ${redundantFaqs.join(" | ")}` });
  const quick = page.components.find((item) => item.component_type === "quick_answer")?.data?.concise_answer || "";
  if (quick.length < 100 || !/(choose|look|best|right|depends)/i.test(quick)) issues.push({ code: "QUICK_ANSWER_WEAK", severity: "error", message: "Quick answer does not solve the decision." });
  const status = issues.some((item) => item.severity === "error") ? "FAIL" : issues.length ? "PASS_WITH_WARNINGS" : "PASS";
  return { schema_version: "1.0.0", artifact_type: "founder_revision_editorial_quality_review", status, accepted_for_human_review: status !== "FAIL", founder_question: "Does this genuinely sound like something the founder of Street Kingz could have written for customers?", founder_question_answer: status === "FAIL" ? "NO" : "YES", assessment: { page_moves_forward: validation.conceptOwnership?.status === "PASS", each_component_earns_place: redundantFaqs.length === 0, sections_or_items_that_could_be_removed: redundantFaqs.map((question) => ({ component_type: "faq", item: question, reason: "It points back to buying criteria already explained rather than resolving a residual question." })), product_introduced_naturally: !issues.some((item) => item.code === "COMMERCIAL_TRANSPARENCY_WEAK"), useful_for_towel_choice: !issues.some((item) => ["QUICK_ANSWER_WEAK", "FAQ_NOT_USEFUL"].includes(item.code)) }, metrics: { first_person_component_count: firstPersonCount, total_components: page.components.length }, issues, human_review_issues: ["Confirm the founder tone feels authentic rather than performed.", "Confirm first-party product facts and commercial wording.", "Review the comparison and founder-note decisions before rendering."] };
}
