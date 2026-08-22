import { mkdir } from "node:fs/promises";
import path from "node:path";
import { invokeControlledCall, writeImmutableArtifact } from "../interpretation/call-control.js";
import { sha256, stableId } from "../research/core/canonical.js";
import { validateClaimRestrictionPolicy, evaluateResearchConfidence } from "../research/articleEvidencePolicy.js";
import { validateEditorialPagePlan } from "../editorial/validation.js";

export const M4B_SCHEMA_VERSION = "1.0.0";

const unique = (values = []) => [...new Set(values.filter(Boolean))];
const sourceIds = (pack) => unique((pack.sources || []).map((item) => item.source_id));
const productFactIds = (pack) => unique((pack.relevant_product_facts || []).map((item) => item.evidence_id));
const restrictionIds = (policy) => unique((policy.restrictions || []).map((item) => item.restriction_id));
const noProse = (value) => typeof value === "string" && (value.split(/\s+/).length > 100 || /<\/?[a-z][^>]*>|(^|\n)#{1,6}\s/i.test(value));

function assertOpportunity(input, opportunity) {
  if (!opportunity || opportunity.outcome !== "ARTICLE_RECOMMENDED") throw new Error("M4B_REQUIRES_ARTICLE_RECOMMENDED");
  if (opportunity.objective && opportunity.objective !== "create_seo_article") throw new Error("M4B_OBJECTIVE_MISMATCH");
  if (input.merchant_inputs_received?.join(",") !== "product_url") throw new Error("M4B_PRODUCT_URL_ONLY");
}

export function buildEvidenceGroundedM4BInput({ opportunity, evidencePack, restrictionPolicy, seoGuidance, productLineage, businessLineage = null, eicLineage = null, merchantInput = { product_url: null } }) {
  assertOpportunity({ merchant_inputs_received: ["product_url"] }, opportunity);
  if (!evidencePack?.evidence_pack_id || !evidencePack.evidence_pack_sha256) throw new Error("M4B_EVIDENCE_PACK_REQUIRED");
  if (evidencePack.status !== "VALIDATED" || evidencePack.freshness_status !== "CURRENT") throw new Error("M4B_EVIDENCE_PACK_NOT_CURRENT");
  if (evidencePack.lineage?.opportunity_id !== opportunity.decision_id) throw new Error("M4B_EVIDENCE_OPPORTUNITY_MISMATCH");
  if (evidencePack.lineage?.opportunity_sha256 && evidencePack.lineage.opportunity_sha256 !== opportunity.decision_sha256) throw new Error("M4B_EVIDENCE_OPPORTUNITY_HASH_MISMATCH");
  const confidence = evaluateResearchConfidence(evidencePack);
  const policyErrors = validateClaimRestrictionPolicy(restrictionPolicy, { pack: evidencePack, opportunity });
  if (confidence.status === "FAIL") throw new Error("M4B_SUBJECT_DEPTH_FAIL");
  if (confidence.status === "WARN" && policyErrors.length) throw new Error(`M4B_WARN_POLICY_INVALID:${policyErrors.join(",")}`);
  if (restrictionPolicy?.lineage?.evidence_pack_id !== evidencePack.evidence_pack_id || restrictionPolicy?.lineage?.evidence_pack_sha256 !== evidencePack.evidence_pack_sha256) throw new Error("M4B_POLICY_EVIDENCE_LINEAGE_MISMATCH");
  if (!seoGuidance?.snapshot_id || seoGuidance.snapshot_id !== restrictionPolicy.lineage.seo_guidance?.snapshot_id || seoGuidance.snapshot_sha256 !== restrictionPolicy.lineage.seo_guidance?.snapshot_sha256 || seoGuidance.freshness_status !== "CURRENT") throw new Error("M4B_SEO_GUIDANCE_LINEAGE_MISMATCH");
  if (!productLineage?.product_id || !productFactIds(evidencePack).length) throw new Error("M4B_PRODUCT_INTELLIGENCE_REQUIRED");

  const input = {
    schema_version: M4B_SCHEMA_VERSION,
    artifact_type: "evidence_grounded_m4b_planning_input",
    objective: "create_seo_article",
    merchant_inputs_received: ["product_url"],
    product_url: merchantInput.product_url || null,
    opportunity: {
      decision_id: opportunity.decision_id,
      decision_sha256: opportunity.decision_sha256,
      primary_query: opportunity.primary_query,
      supporting_queries: opportunity.supporting_queries || [],
      article_type: opportunity.article_type,
      search_intent: opportunity.search_intent,
      rationale: opportunity.rationale
    },
    evidence_pack: {
      id: evidencePack.evidence_pack_id,
      sha256: evidencePack.evidence_pack_sha256,
      freshness_status: evidencePack.freshness_status,
      subject_depth: evidencePack.subject_depth,
      research_budget: evidencePack.research_waves,
      questions: (evidencePack.question_coverage || evidencePack.research_questions || []).map((item) => ({ question_id: item.question_id, question: item.question, status: item.status, evidence_source_ids: item.evidence_source_ids || [] })),
      category_options: evidencePack.actual_constructions || evidencePack.category_options || [],
      terminology: evidencePack.market_terminology || [],
      decision_dimensions: evidencePack.decision_dimensions || evidencePack.live_buying_criteria || [],
      tradeoffs: evidencePack.tradeoffs || [],
      customer_questions: evidencePack.customer_questions || [],
      customer_concerns: evidencePack.customer_concerns || [],
      corroborated_findings: evidencePack.corroborated_findings || [],
      conflicting_findings: evidencePack.conflicting_findings || [],
      unknowns: evidencePack.unknowns || [],
      competitor_coverage: evidencePack.competitor_coverage || {},
      content_gaps: unique([...(evidencePack.content_gaps || []), ...(evidencePack.live_content_gaps || [])]),
      source_classes: unique((evidencePack.sources || []).map((item) => item.source_class)),
      evidence_ids: sourceIds(evidencePack)
    },
    claim_policy: {
      id: restrictionPolicy.policy_id,
      sha256: restrictionPolicy.policy_sha256,
      confidence: restrictionPolicy.confidence,
      restrictions: restrictionPolicy.restrictions,
      safe_claim_categories: restrictionPolicy.safe_claim_categories,
      evidence_limitations: restrictionPolicy.evidence_limitations,
      research_budget_status: restrictionPolicy.research_budget_status
    },
    product_intelligence: { ...productLineage, fact_evidence_ids: productFactIds(evidencePack), facts: evidencePack.relevant_product_facts || [] },
    business_intelligence: businessLineage,
    editorial_intelligence_context: eicLineage,
    seo_guidance: { snapshot_id: seoGuidance.snapshot_id, snapshot_sha256: seoGuidance.snapshot_sha256, source_manifest_version: seoGuidance.source_manifest_version, freshness_status: seoGuidance.freshness_status, relevant_constraints: (seoGuidance.records || []).filter((item) => /helpful|people-first|spam|structured-data|AI/i.test(`${item.statement} ${item.applicability}`)).map((item) => ({ guidance_id: item.guidance_id, statement: item.statement, applicability: item.applicability })) },
    registries: { products: [{ product_id: productLineage.product_id, product_url: merchantInput.product_url || null }], internal_links: [], internal_link_coverage: "partial" },
    planning_constraints: { keyword_research_complete: true, opportunity_immutable: true, research_calls_forbidden: true, article_prose_forbidden: true, browsing_allowed: false, publication_allowed: false, restriction_mode: confidence.restriction_mode }
  };
  return { ...input, input_sha256: sha256(input) };
}

function known(input) {
  return { evidence: new Set(input.evidence_pack.evidence_ids), restrictions: new Set(input.claim_policy.restrictions.map((item) => item.restriction_id)), products: new Set(input.registries.products.map((item) => item.product_id)) };
}

export function validateEvidenceGroundedM4BOutput(output, input) {
  const errors = [];
  if (!output || typeof output !== "object") return ["M4B_OUTPUT_INVALID"];
  for (const field of ["primary_query", "article_type", "search_intent", "working_title", "thesis", "reader_decision", "decision_framework", "sections", "product_role", "claim_boundaries", "coverage_depth", "structured_data"]) if (!(field in output)) errors.push(`M4B_REQUIRED_FIELD:${field}`);
  if (output.primary_query !== input.opportunity.primary_query) errors.push("M4B_PRIMARY_QUERY_CHANGED");
  if (output.article_type !== input.opportunity.article_type) errors.push("M4B_ARTICLE_TYPE_CHANGED");
  if (output.search_intent !== input.opportunity.search_intent) errors.push("M4B_SEARCH_INTENT_CHANGED");
  if (noProse(output.thesis) || noProse(output.reader_decision)) errors.push("M4B_ARTICLE_PROSE_IN_OUTPUT");
  const allow = known(input);
  if (!Array.isArray(output.sections) || output.sections.length < 5 || output.sections.length > 12) errors.push("M4B_SECTION_COUNT_INVALID");
  const ids = new Set();
  for (const [index, section] of (output.sections || []).entries()) {
    if (!section.component_id || ids.has(section.component_id)) errors.push(`M4B_COMPONENT_ID_INVALID:${index}`);
    ids.add(section.component_id);
    for (const field of ["component_type", "purpose", "reader_question", "evidence_ids", "restriction_ids", "required_points", "prohibited_claims"]) if (!(field in section)) errors.push(`M4B_SECTION_FIELD:${index}:${field}`);
    for (const id of section.evidence_ids || []) if (!allow.evidence.has(id)) errors.push(`M4B_UNKNOWN_EVIDENCE:${id}`);
    for (const id of section.restriction_ids || []) if (!allow.restrictions.has(id)) errors.push(`M4B_UNKNOWN_RESTRICTION:${id}`);
    for (const id of section.product_fact_ids || []) if (!new Set(input.product_intelligence.fact_evidence_ids).has(id)) errors.push(`M4B_UNKNOWN_PRODUCT_FACT:${id}`);
    if (noProse(section.heading) || noProse(section.purpose) || (section.required_points || []).some((item) => noProse(item))) errors.push("M4B_ARTICLE_PROSE_IN_OUTPUT");
    if (/(gsm|absorb|construction|pile|density|twisted|waffle)/i.test(`${section.heading} ${section.purpose} ${(section.required_points || []).join(" ")}`) && !(section.restriction_ids || []).length) errors.push(`M4B_RESTRICTED_SECTION_WITHOUT_POLICY:${index}`);
    if (/https?:\/\//i.test(JSON.stringify(section))) errors.push(`M4B_INVENTED_URL:${index}`);
    if (/(always best|best on the market|guaranteed|ranking factor|rank higher)/i.test(JSON.stringify(section))) errors.push(`M4B_UNSUPPORTED_CLAIM:${index}`);
  }
  if (output.product_role && !output.product_fact_ids?.length && !output.sections?.some((item) => (item.product_fact_ids || []).length)) errors.push("M4B_PRODUCT_FACT_CROSSOVER_MISSING");
  if (output.structured_data && /rich result|ranking factor|guarantee/i.test(JSON.stringify(output.structured_data))) errors.push("M4B_STRUCTURED_DATA_OVERCLAIM");
  return [...new Set(errors)];
}

function componentFromSection(section, index, input) {
  const productIds = section.product_fact_ids?.length ? [input.registries.products[0].product_id] : [];
  return {
    component_id: section.component_id || `${String(index + 1).padStart(2, "0")}_${stableId("m4b_component", section.heading, 8).slice(-8)}`,
    component_type: section.component_type,
    heading: section.heading,
    purpose: section.purpose,
    reader_question: section.reader_question,
    evidence_ids: unique(section.evidence_ids),
    restriction_ids: unique(section.restriction_ids),
    product_fact_ids: unique(section.product_fact_ids),
    product_ids: productIds,
    internal_link_ids: unique(section.internal_link_ids),
    media_requirements: section.media_requirements || [],
    conversion_role: section.conversion_role || (productIds.length ? "product_discovery" : "education"),
    required_content: unique(section.required_points),
    prohibited_claims: unique(section.prohibited_claims),
    product_role: section.product_role || "none"
  };
}

export function buildEvidenceGroundedBriefAndPagePlan({ output, input, oldM4Weaknesses }) {
  const briefCore = {
    schema_version: M4B_SCHEMA_VERSION, artifact_type: "evidence_grounded_article_brief", brief_version: "1.0.0", objective: "create_seo_article",
    opportunity_lineage: { id: input.opportunity.decision_id, sha256: input.opportunity.decision_sha256, primary_query: input.opportunity.primary_query, article_type: input.opportunity.article_type, search_intent: input.opportunity.search_intent },
    evidence_pack_lineage: { id: input.evidence_pack.id, sha256: input.evidence_pack.sha256, subject_depth: input.evidence_pack.subject_depth },
    restriction_policy_lineage: { id: input.claim_policy.id, sha256: input.claim_policy.sha256, restriction_ids: input.claim_policy.restrictions.map((item) => item.restriction_id) },
    seo_guidance_lineage: { snapshot_id: input.seo_guidance.snapshot_id, snapshot_sha256: input.seo_guidance.snapshot_sha256, source_manifest_version: input.seo_guidance.source_manifest_version, freshness_status: input.seo_guidance.freshness_status },
    product_intelligence_lineage: { product_id: input.product_intelligence.product_id, fact_evidence_ids: input.product_intelligence.fact_evidence_ids },
    business_intelligence_lineage: input.business_intelligence,
    editorial_intelligence_lineage: input.editorial_intelligence_context,
    working_title: output.working_title, thesis: output.thesis, reader_decision: output.reader_decision, article_type: output.article_type, search_intent: output.search_intent, primary_query: output.primary_query,
    supporting_queries: input.opportunity.supporting_queries, audience: output.audience || "Car owners comparing drying-towel options for a real vehicle-drying job.",
    decision_framework: output.decision_framework, key_coverage: output.sections.map((item) => ({ component_id: item.component_id, heading: item.heading, purpose: item.purpose, reader_question: item.reader_question, evidence_ids: item.evidence_ids, restriction_ids: item.restriction_ids, product_fact_ids: item.product_fact_ids || [] })),
    explicit_exclusions: output.explicit_exclusions || [], claim_boundaries: output.claim_boundaries, product_role: output.product_role, coverage_depth: output.coverage_depth, old_m4_weaknesses: oldM4Weaknesses, unknowns: input.evidence_pack.unknowns,
    evidence_question_coverage: input.evidence_pack.questions, commercial_objective: output.commercial_objective || "Help the reader choose based on supported criteria without making unsupported superiority claims."
  };
  const brief = { ...briefCore, brief_id: stableId("article_brief", briefCore), brief_sha256: sha256(briefCore) };
  const components = output.sections.map((section, index) => componentFromSection(section, index, input));
  const planCore = {
    schema_version: "1.0.0", artifact_type: "evidence_grounded_editorial_page_plan", plan_version: "m4b.1.0.0", page_type: "evergreen_guide", topic: output.primary_query, primary_query: output.primary_query,
    search_intent: { primary: output.search_intent, secondary: null }, title_direction: output.working_title, h1_direction: output.working_title, introduction_objective: output.thesis,
    packet_id: input.evidence_pack.id, strategy_id: input.opportunity.decision_id, brief_id: brief.brief_id, brief_sha256: brief.brief_sha256,
    opportunity_lineage: brief.opportunity_lineage, evidence_pack_lineage: brief.evidence_pack_lineage, restriction_policy_lineage: brief.restriction_policy_lineage, seo_guidance_lineage: brief.seo_guidance_lineage, product_intelligence_lineage: brief.product_intelligence_lineage,
    components, component_sequence: components.map((item) => item.component_id), component_requirements: { policy_id: "create_seo_article_m4b_v1", required_component_types: components.map((item) => item.component_type), ordering_rules: [{ rule: "component_after", component_type: "product_recommendation", after_component_type: "criteria_cards" }] },
    allowed_component_types: [...new Set(components.map((item) => item.component_type))], cta_strategy: output.cta_strategy, faq_plan: output.faq_plan || [], media_plan: output.media_plan || [], internal_link_plan: { coverage: input.registries.internal_link_coverage, links: [], unknowns: ["No validated internal-link registry was available in the canonical research packet."] }, structured_data: output.structured_data,
    human_review_state: "awaiting_m4b_founder_review", drafting_authorised: false, publication_authorised: false, provenance: { brief_id: brief.brief_id, brief_sha256: brief.brief_sha256, evidence_pack_id: input.evidence_pack.id, evidence_pack_sha256: input.evidence_pack.sha256, restriction_policy_id: input.claim_policy.id, restriction_policy_sha256: input.claim_policy.sha256 }
  };
  return { brief, plan: { ...planCore, plan_id: stableId("editorial_page_plan", planCore), deterministic_content_sha256: sha256(planCore) } };
}

export function reviewEvidenceGroundedPlan({ brief, plan, input, oldM4Weaknesses }) {
  const types = plan.components.map((item) => item.component_type);
  const evidenceSections = plan.components.filter((item) => item.evidence_ids.length).length;
  const restrictionSections = plan.components.filter((item) => item.restriction_ids.length).length;
  const productFactsUsed = unique(plan.components.flatMap((item) => item.product_fact_ids));
  const dimensions = {
    reader_decision_clarity: brief.reader_decision?.length > 40 ? "PASS" : "FAIL",
    category_specificity: (input.evidence_pack.category_options.length >= 2 && input.evidence_pack.terminology.length >= 3) ? "PASS" : "WARN",
    evidence_grounding: evidenceSections === plan.components.length ? "PASS" : "FAIL",
    trade_off_depth: input.evidence_pack.tradeoffs.length >= 2 && plan.components.some((item) => item.component_type === "comparison_table") ? "PASS" : "FAIL",
    customer_relevance: input.evidence_pack.customer_questions.length > 0 || input.evidence_pack.customer_concerns.length > 0 ? "PASS" : "WARN",
    claim_discipline: restrictionSections >= 2 ? "PASS" : "FAIL",
    product_integration: productFactsUsed.length >= 2 ? "PASS" : "FAIL",
    search_intent_fit: brief.search_intent === "commercial_investigation" && types.includes("comparison_table") ? "PASS" : "FAIL",
    structural_usefulness: plan.components.length >= 5 ? "PASS" : "FAIL",
    generation_readiness: plan.drafting_authorised === false && plan.publication_authorised === false ? "PASS" : "FAIL"
  };
  const status = Object.values(dimensions).includes("FAIL") ? "FAIL" : Object.values(dimensions).includes("WARN") ? "WARN" : "PASS";
  return { artifact_type: "m4b_editorial_plan_quality", status, dimensions, old_m4_weaknesses: oldM4Weaknesses, accepted_for_founder_review: status === "PASS" };
}

export function renderEvidenceGroundedPlanReview({ brief, plan, input, quality, oldM4Weaknesses }) {
  const sectionText = plan.components.map((item, index) => `### ${index + 1}. ${item.component_type}: ${item.heading}\n\n- Purpose: ${item.purpose}\n- Reader question: ${item.reader_question}\n- Evidence refs: ${item.evidence_ids.join(", ") || "none"}\n- Restriction refs: ${item.restriction_ids.join(", ") || "none"}\n- Product Fact refs: ${item.product_fact_ids.join(", ") || "none"}\n- Product role: ${item.product_role}\n- Must cover: ${item.required_content.join("; ")}\n- Must not claim: ${item.prohibited_claims.join("; ") || "No additional section-specific prohibition."}`).join("\n\n");
  return `# Evidence-Grounded Article Plan Review\n\n## Opportunity\n\nPrimary query: ${brief.primary_query}\nArticle type: ${brief.article_type}\nSearch intent: ${brief.search_intent}\n\n## What the reader is actually trying to decide\n\n${brief.reader_decision}\n\n## What research changed\n\nThe plan uses page-level category terminology, construction observations, trade-offs, customer questions, Product Intelligence crossover and explicit WARN restrictions. Historical weaknesses retained for comparison: ${oldM4Weaknesses.join("; ")}\n\n## Article thesis\n\n${brief.thesis}\n\n## Working title\n\n${brief.working_title}\n\n## Decision framework\n\n${brief.decision_framework.map((item) => `- ${item}`).join("\n")}\n\n## Research-question coverage\n\n${input.evidence_pack.questions.map((item) => `- ${item.question_id}: ${item.status} — ${item.question}`).join("\n")}\n\n## Planned structure\n\n${sectionText}\n\n## Category knowledge used\n\n${input.evidence_pack.category_options.join(", ")}\n\n## Buying criteria\n\n${input.evidence_pack.decision_dimensions.join(", ")}\n\n## Trade-offs\n\n${input.evidence_pack.tradeoffs.map((item) => `- ${item.concept}: ${item.statement} (${item.support_status})`).join("\n")}\n\n## Customer concerns used\n\n${input.evidence_pack.customer_questions.map((item) => `- ${item.question}`).join("\n") || "None selected."}\n\n## Manufacturer evidence used\n\nManufacturer evidence is used as attributed market terminology/design claims only.\n\n## Independent evidence used\n\nIndependent findings remain bounded observations and do not establish universal technical performance.\n\n## Community evidence used\n\nCommunity/practitioner material informs recurring concerns and questions, not technical consensus.\n\n## Content gaps addressed\n\n${input.evidence_pack.content_gaps.map((item) => `- ${item}`).join("\n")}\n\n## Street Kingz Product Intelligence crossover\n\n${brief.product_role}\n\nProduct Fact IDs used in the plan: ${unique(plan.components.flatMap((item) => item.product_fact_ids)).join(", ")}\n\n## Product placement strategy\n\nTeach the reader's decision first; use the validated product as a concrete, qualified fit where its facts illuminate coverage, construction, handling or use case; keep the CTA proportionate.\n\n## Claims safe to make\n\n${input.claim_policy.safe_claim_categories.map((item) => `- ${item}`).join("\n")}\n\n## Claims requiring qualification\n\n${input.claim_policy.restrictions.filter((item) => item.treatment === "QUALIFY").map((item) => `- ${item.subject}`).join("\n")}\n\n## Claims requiring attribution\n\n${input.claim_policy.restrictions.filter((item) => item.treatment === "ATTRIBUTE").map((item) => `- ${item.subject}`).join("\n")}\n\n## Claims prohibited\n\n${input.claim_policy.restrictions.filter((item) => item.treatment === "AVOID").map((item) => `- ${item.subject}`).join("\n")}\n\n## Internal linking\n\nNo invented links; the validated internal-link registry is currently partial/empty.\n\n## FAQ plan\n\n${(plan.faq_plan || []).map((item) => `- ${item.question} — evidence ${item.evidence_ids.join(", ")}; restrictions ${item.restriction_ids.join(", ")}`).join("\n") || "No FAQ plan selected."}\n\n## Media plan\n\n${(plan.media_plan || []).map((item) => `- ${item.kind}: ${item.purpose} (${item.status})`).join("\n") || "No media plan selected."}\n\n## Structured data\n\nPreserve the inherited recommendation for later rendering review; no rich-result promise is made.\n\n## Coverage/depth guidance\n\n${JSON.stringify(brief.coverage_depth)}\n\n## Remaining evidence limitations\n\n${input.evidence_pack.unknowns.map((item) => `- ${item}`).join("\n")}\n\n## Why this plan should outperform historical M4\n\nIt binds section-level evidence and restrictions, uses actual category findings and customer questions, explains trade-offs, and connects Product Facts to reader decisions rather than providing only generic criteria and a late product mention.\n\n## What remains unknown\n\n${input.evidence_pack.unknowns.map((item) => `- ${item}`).join("\n")}\n\n## Editorial plan quality\n\n${quality.status}: ${JSON.stringify(quality.dimensions)}\n\n## Generation readiness\n\nThe plan is ready for explicit founder approval before generation.\n\nARTICLE NOT GENERATED\n\nHUMAN REVIEW REQUIRED BEFORE GENERATION\n`;
}

export async function runCreateSeoArticleM4B({ input, provider, oldM4Weaknesses, outputDirectory = "artifacts/workflows/create-seo-article/m4b-proof-v1", now = () => new Date() }) {
  if (!provider || typeof provider.generate !== "function" || !provider.model) return { status: "paused", pause: { reason: "planning_unavailable" }, input };
  let controlled;
  try {
    await mkdir(path.resolve(outputDirectory), { recursive: true });
    controlled = await invokeControlledCall({ benchmarkDirectory: path.resolve(outputDirectory), modelLabel: provider.model, maxCalls: 1, retries: 0, now, invoke: async ({ callDirectory, signal }) => {
      const prompt = `Create an evidence-grounded structured article brief and page plan. Use only the supplied packet. Do not browse, research, change strategy or write article prose. Every section must carry evidence and restriction references.\n\nINPUT:\n${JSON.stringify(input)}`;
      await writeImmutableArtifact(callDirectory, "m4b-input.json", input);
      const response = await provider.generate({ systemPrompt: "You are an evidence-bounded article planning reasoner. Execute the approved opportunity for a commercial-investigation reader; do not expose internal policy language in customer copy, and do not invent claims.", userPrompt: prompt, responseSchema: { type: "object" }, signal });
      await writeImmutableArtifact(callDirectory, "m4b-response-raw.json", { provider: response.provider, model: response.model, raw_text: response.rawText, usage: response.usage || null });
      let output; try { output = JSON.parse(response.rawText); } catch { throw Object.assign(new Error("M4B_OUTPUT_MALFORMED"), { code: "INVALID_M4B_OUTPUT" }); }
      const errors = validateEvidenceGroundedM4BOutput(output, input);
      await writeImmutableArtifact(callDirectory, "m4b-validation.json", { artifact_type: "m4b_planning_validation", status: errors.length ? "FAIL" : "PASS", errors });
      if (errors.length) throw Object.assign(new Error("M4B_OUTPUT_INVALID"), { code: "INVALID_M4B_OUTPUT", errors });
      const { brief, plan } = buildEvidenceGroundedBriefAndPagePlan({ output, input, oldM4Weaknesses });
      const planErrors = validateEditorialPagePlan(plan, { evidence_ids: input.evidence_pack.evidence_ids, product_ids: [...known(input).products], internal_link_ids: [] });
      if (planErrors.length) throw Object.assign(new Error("M4B_PAGE_PLAN_INVALID"), { code: "INVALID_M4B_PAGE_PLAN", errors: planErrors });
      const quality = reviewEvidenceGroundedPlan({ brief, plan, input, oldM4Weaknesses });
      await writeImmutableArtifact(callDirectory, "article-brief.json", brief);
      await writeImmutableArtifact(callDirectory, "editorial-page-plan.json", plan);
      await writeImmutableArtifact(callDirectory, "m4b-quality-review.json", quality);
      await writeImmutableArtifact(callDirectory, "m4b-review.md", renderEvidenceGroundedPlanReview({ brief, plan, input, quality, oldM4Weaknesses }));
      return { brief, plan, quality, validation: { status: "PASS", errors: [] }, metadata: { model: response.model || provider.model, api: provider.settings?.api || "injected", reasoning: provider.settings?.reasoning || null, ai_calls: 1, retries: 0, usage: response.usage || {}, input_evidence_count: input.evidence_pack.evidence_ids.length, restriction_count: input.claim_policy.restrictions.length, product_fact_count: input.product_intelligence.fact_evidence_ids.length }, callDirectory };
    }});
  } catch (error) { return { status: "failed", failure: { code: error.code || "M4B_FAILED", message: error.message, errors: error.errors || [] }, input, lifecycle: controlled?.lifecycle }; }
  const result = controlled.result;
  return { status: "m4b_ready_for_founder_review", ...result, lifecycle: controlled.lifecycle };
}
