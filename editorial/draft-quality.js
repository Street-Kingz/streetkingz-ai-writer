const normalise = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function strings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => strings(item, output));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => strings(item, output));
  return output;
}

function walk(value, visitor, path = "$") {
  visitor(value, path);
  if (Array.isArray(value)) value.forEach((item, index) => walk(item, visitor, `${path}[${index}]`));
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => walk(item, visitor, `${path}.${key}`));
}

export function reviewEditorialDraftQuality(page, { plan = null, productFactEvidence = [] } = {}) {
  const issues = [];
  const all = strings(page);
  const joined = all.join("\n");
  const methodologyLeak = /(?:search|serp|search console)\s+(?:evidence|data|coverage)|validated\s+(?:product|product information)|(?:according to|based on)\s+(?:the )?(?:evidence|research)|relevant example|selected product|commercially relevant|evidence[- ]backed|category-level trade-offs|confirmed specifications|place in this article|place in this guide|leave(?:s|ing)? the (?:final )?choice with the reader/i.test(joined);
  if (methodologyLeak) issues.push({ code: "METHODOLOGY_LEAKAGE", severity: "error", message: "Internal research or selection language must not appear in customer-facing copy." });
  if (/in this (?:comprehensive|ultimate) guide|keyword density|unlock the secrets/i.test(joined)) issues.push({ code: "GENERIC_SEO_FILLER", severity: "error", message: "Generic SEO filler is present." });
  if (/we (?:tested|put .* to the test)|our (?:tests|testing)|hands-on test/i.test(joined)) issues.push({ code: "INVENTED_EXPERIENCE", severity: "error", message: "The draft implies unprovided first-hand testing." });
  if (/gsm alone (?:means|proves|guarantees)|highest gsm is (?:always )?best/i.test(joined)) issues.push({ code: "UNSUPPORTED_GSM_SUPERIORITY", severity: "error", message: "The draft treats GSM alone as proof of quality." });
  const required = plan ? new Set(plan.component_requirements?.required_component_types || []) : new Set(["quick_answer", "faq", "conclusion"]);
  const quick = page.components?.find((item) => item.component_type === "quick_answer")?.data?.concise_answer || "";
  if (required.has("quick_answer") && (quick.length < 100 || !/(depend|look for|choose|best|right)/i.test(quick))) issues.push({ code: "WEAK_QUICK_ANSWER", severity: "error", message: "Quick answer does not independently resolve the core decision." });
  const faq = page.components?.find((item) => item.component_type === "faq");
  if (required.has("faq") && (!faq || faq.data?.items?.some((item) => item.answer.length < 45))) issues.push({ code: "WEAK_FAQ_ANSWER", severity: "error", message: "FAQ required by the approved plan is missing or too thin." });
  const conclusion = page.components?.find((item) => item.component_type === "conclusion")?.data;
  if (required.has("conclusion") && (!conclusion || conclusion.summary.length < 60 || conclusion.next_step.length < 25)) issues.push({ code: "WEAK_CONCLUSION", severity: "error", message: "Conclusion required by the approved plan is missing or weak." });
  const substantive = all.map(normalise).filter((item) => item.length > 90);
  const duplicates = substantive.filter((item, index) => substantive.indexOf(item) !== index);
  if (duplicates.length) issues.push({ code: "DUPLICATE_CONTENT", severity: "error", message: "Materially identical copy is repeated." });
  const productIndex = page.components?.findIndex((item) => item.component_type === "product_recommendation") ?? -1;
  const criteriaIndex = page.components?.findIndex((item) => item.component_type === "criteria_cards") ?? -1;
  if (productIndex >= 0 && (criteriaIndex < 0 || productIndex <= criteriaIndex)) issues.push({ code: "FORCED_COMMERCIALISATION", severity: "error", message: "Product recommendation precedes useful selection criteria." });
  const comparison = page.components?.find((item) => item.component_type === "comparison_table");
  const commercial = plan?.search_intent?.primary === "commercial_investigation";
  const comparisonRows = comparison?.data?.rows || [];
  const comparisonHasTradeoffs = comparisonRows.length >= 3 && comparisonRows.every((row) => row.cells?.length >= 2 && row.cells.some((cell) => /\b(?:but|whereas|while|trade[- ]?off|suits|less|easier|harder|heavier|lighter|cumbersome|comfortable|can|may)\b/i.test(cell)));
  const cards = page.components?.find((item) => item.component_type === "criteria_cards")?.data?.cards || [];
  const cardsExplainConsequences = cards.length >= 2 && cards.every((card) => typeof card.explanation === "string" && card.explanation.length >= 120 && /\b(?:because|which means|so that|but|while|suits|helps|can)\b/i.test(card.explanation));
  const sufficiencyIssues = [];
  if (commercial && comparison && !comparisonHasTradeoffs) sufficiencyIssues.push({ code: "COMPARISON_TOO_GENERIC", severity: "error", message: "Commercial-investigation comparison must expose meaningful alternatives or trade-offs." });
  if (commercial && criteriaIndex >= 0 && !cardsExplainConsequences) sufficiencyIssues.push({ code: "DECISION_CRITERIA_TOO_THIN", severity: "error", message: "Decision criteria must explain consequences, not only name attributes." });
  issues.push(...sufficiencyIssues);
  const editorialSufficiency = {
    status: sufficiencyIssues.some((item) => item.severity === "error") || methodologyLeak ? "FAIL" : "PASS",
    dimensions: {
      intent_fulfilment: commercial ? (comparisonHasTradeoffs && cardsExplainConsequences ? "PASS" : "FAIL") : "UNASSESSED",
      decision_usefulness: commercial ? (comparisonHasTradeoffs && cardsExplainConsequences ? "PASS" : "FAIL") : "UNASSESSED",
      concrete_explanation: cardsExplainConsequences ? "PASS" : "WARN",
      comparison_usefulness: comparison ? (comparisonHasTradeoffs ? "PASS" : "FAIL") : "UNASSESSED",
      plan_depth: cards.length || comparisonRows.length ? "PASS" : "WARN",
      methodology_leakage: methodologyLeak ? "FAIL" : "PASS",
      commercial_naturalness: productIndex >= 0 && !/relevant example|selected product|commercially relevant|place in this article|place in this guide/i.test(joined) ? "PASS" : productIndex >= 0 ? "WARN" : "UNASSESSED"
    }, issues: [...sufficiencyIssues, ...(methodologyLeak ? [{ code: "METHODOLOGY_LEAKAGE", severity: "error" }] : [])]
  };
  const productFactIds = new Set(productFactEvidence.map((record) => record.evidence_id));
  const usedProductFactIds = new Set();
  walk(page, (value, path) => { if (path.endsWith(".evidence_ids") && Array.isArray(value)) value.filter((id) => productFactIds.has(id)).forEach((id) => usedProductFactIds.add(id)); });
  const productUtilisation = productFactEvidence.length === 0
    ? { status: "NOT_APPLICABLE", facts_available: 0, facts_used: 0 }
    : { status: usedProductFactIds.size >= 2 ? "PASS" : "FAIL", facts_available: productFactEvidence.length, facts_used: usedProductFactIds.size, used_evidence_ids: [...usedProductFactIds] };
  if (productFactEvidence.length && productIndex >= 0 && productUtilisation.status === "FAIL") issues.push({ code: "PRODUCT_INTELLIGENCE_UNUSED", severity: "error", message: "Relevant validated product facts were available but not used in the approved product-led article." });
  if (productFactEvidence.length && productIndex >= 0 && productUtilisation.status === "FAIL") editorialSufficiency.status = "FAIL";
  editorialSufficiency.dimensions.product_intelligence_utilisation = productUtilisation.status;
  editorialSufficiency.issues.push(...(productFactEvidence.length && productIndex >= 0 && productUtilisation.status === "FAIL" ? [{ code: "PRODUCT_INTELLIGENCE_UNUSED", severity: "error" }] : []));
  return {
    schema_version: "1.0.0", artifact_type: "editorial_quality_review",
    status: issues.some((item) => item.severity === "error") ? "FAIL" : issues.length ? "PASS_WITH_WARNINGS" : "PASS",
    accepted_for_human_review: !issues.some((item) => item.severity === "error") && editorialSufficiency.status !== "FAIL",
    editorial_sufficiency: editorialSufficiency,
    product_intelligence_utilisation: productUtilisation,
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
