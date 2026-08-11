const normalise = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function strings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => strings(item, output));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => strings(item, output));
  return output;
}

export function reviewEditorialDraftQuality(page) {
  const issues = [];
  const all = strings(page);
  const joined = all.join("\n");
  if (/in this (?:comprehensive|ultimate) guide|keyword density|unlock the secrets/i.test(joined)) issues.push({ code: "GENERIC_SEO_FILLER", severity: "error", message: "Generic SEO filler is present." });
  if (/we (?:tested|put .* to the test)|our (?:tests|testing)|hands-on test/i.test(joined)) issues.push({ code: "INVENTED_EXPERIENCE", severity: "error", message: "The draft implies unprovided first-hand testing." });
  if (/gsm alone (?:means|proves|guarantees)|highest gsm is (?:always )?best/i.test(joined)) issues.push({ code: "UNSUPPORTED_GSM_SUPERIORITY", severity: "error", message: "The draft treats GSM alone as proof of quality." });
  const quick = page.components?.find((item) => item.component_type === "quick_answer")?.data?.concise_answer || "";
  if (quick.length < 100 || !/(depend|look for|choose|best|right)/i.test(quick)) issues.push({ code: "WEAK_QUICK_ANSWER", severity: "error", message: "Quick answer does not independently resolve the core decision." });
  const faq = page.components?.find((item) => item.component_type === "faq");
  if (faq?.data?.items?.some((item) => item.answer.length < 45)) issues.push({ code: "WEAK_FAQ_ANSWER", severity: "error", message: "At least one FAQ answer is too thin to be useful." });
  const conclusion = page.components?.find((item) => item.component_type === "conclusion")?.data;
  if (!conclusion || conclusion.summary.length < 60 || conclusion.next_step.length < 25) issues.push({ code: "WEAK_CONCLUSION", severity: "error", message: "Conclusion lacks a useful decision summary or next step." });
  const substantive = all.map(normalise).filter((item) => item.length > 90);
  const duplicates = substantive.filter((item, index) => substantive.indexOf(item) !== index);
  if (duplicates.length) issues.push({ code: "DUPLICATE_CONTENT", severity: "error", message: "Materially identical copy is repeated." });
  const productIndex = page.components?.findIndex((item) => item.component_type === "product_recommendation") ?? -1;
  const criteriaIndex = page.components?.findIndex((item) => item.component_type === "criteria_cards") ?? -1;
  if (productIndex >= 0 && (criteriaIndex < 0 || productIndex <= criteriaIndex)) issues.push({ code: "FORCED_COMMERCIALISATION", severity: "error", message: "Product recommendation precedes useful selection criteria." });
  return {
    schema_version: "1.0.0", artifact_type: "editorial_quality_review",
    status: issues.some((item) => item.severity === "error") ? "FAIL" : issues.length ? "PASS_WITH_WARNINGS" : "PASS",
    accepted_for_human_review: !issues.some((item) => item.severity === "error"),
    dimensions: {
      useful_beyond_schema: !issues.some((item) => ["WEAK_QUICK_ANSWER", "WEAK_FAQ_ANSWER", "WEAK_CONCLUSION"].includes(item.code)),
      generic_seo_filler_absent: !issues.some((item) => item.code === "GENERIC_SEO_FILLER"),
      forced_commercialisation_absent: !issues.some((item) => item.code === "FORCED_COMMERCIALISATION"),
      invented_experience_absent: !issues.some((item) => item.code === "INVENTED_EXPERIENCE")
    },
    issues,
    human_review_issues: ["Confirm tone and usefulness component by component.", "Confirm every product statement against the cited Product Facts.", "Supply or approve the required hero lifestyle image before rendering."]
  };
}
