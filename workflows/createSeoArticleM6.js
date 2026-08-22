import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256, stableId } from "../research/core/canonical.js";
import { invokeControlledCall, writeImmutableArtifact } from "../interpretation/call-control.js";
import { validateM5DPage } from "./createSeoArticleM5D.js";
import { renderEditorialDraftMarkdown } from "../editorial/draft-render.js";
import { renderSemanticPageHtml } from "../rendering/html.js";

export const M6_CORRECTION_SYSTEM_PROMPT = "Apply only the approved founder correction plan to the supplied semantic article. Preserve strategy, component IDs/order, evidence IDs, restriction IDs, product IDs and all unaffected components. Improve direct practical expression without adding facts. Do not mention evidence, research, policies, lineage or editorial selection logic. Return structured_semantic_editorial_page JSON only.";

export function createFounderReview({ article, brief, pagePlan, feedback, reviewedAt = new Date().toISOString() }) {
  const core = { schema_version: "1.0.0", artifact_type: "founder_article_review", review_purpose: "M6_CORRECTION_TRIAGE", reviewed_at: reviewedAt, reviewed_article: { id: stableId("semantic_article", article), sha256: sha256(article) }, brief: { id: brief.brief_id, sha256: brief.brief_sha256 }, page_plan: { id: pagePlan.plan_id, sha256: pagePlan.deterministic_content_sha256 }, feedback, publication_authorized: false };
  return { ...core, review_id: stableId("founder_article_review", core) };
}

export function createCorrectionApproval({ review, article, brief, pagePlan, evidencePack, restrictionPolicy, approvedAt = new Date().toISOString() }) {
  const core = { schema_version: "1.0.0", artifact_type: "founder_article_correction_approval", purpose: "ONE_BOUNDED_M6_CORRECTION_FOR_FINAL_FOUNDER_REVIEW", approved_at: approvedAt, review_id: review.review_id, review_sha256: sha256(review), parent_article_id: stableId("semantic_article", article), parent_article_sha256: sha256(article), brief_id: brief.brief_id, brief_sha256: brief.brief_sha256, page_plan_id: pagePlan.plan_id, page_plan_sha256: pagePlan.deterministic_content_sha256, evidence_pack_id: evidencePack.evidence_pack_id, evidence_pack_sha256: evidencePack.evidence_pack_sha256, restriction_policy_id: restrictionPolicy.policy_id, restriction_policy_sha256: restrictionPolicy.policy_sha256, publication_authorized: false, research_authorized: false };
  return { ...core, approval_id: stableId("founder_correction_approval", core) };
}

export function createCorrectionPlan({ article, feedback, pagePlan }) {
  const affected = ["m4b_quick_answer", "m4b_criteria", "m4b_comparison", "m4b_use_cases", "m4b_product_fit", "m4b_conclusion"];
  const core = { schema_version: "1.0.0", artifact_type: "article_correction_plan", parent_article_id: stableId("semantic_article", article), feedback_ids: feedback.map((f) => f.feedback_id), affected_components: affected, preserved_components: pagePlan.components.map((c) => c.component_id).filter((id) => !affected.includes(id)), permitted_change: "Rewrite affected prose for direct practical expression and bounded explanation; preserve all semantic lineage and facts.", prohibited_change: "No strategy, component, evidence, restriction, product, URL, research or publication changes.", component_rules: affected.map((component_id) => ({ component_id, feedback_ids: feedback.map((f) => f.feedback_id), permitted_change: "Expression only within existing evidence boundary", prohibited_change: "New claim or changed strategy" })) };
  return { ...core, plan_id: stableId("article_correction_plan", core) };
}

function validateCorrectionLineage({ article, corrected, review, approval, plan, brief, pagePlan, evidencePack, restrictionPolicy, opportunity }) {
  const errors = [];
  if (approval.review_id !== review.review_id || approval.review_sha256 !== sha256(review)) errors.push("REVIEW_LINEAGE_MISMATCH");
  if (approval.parent_article_id !== stableId("semantic_article", article) || approval.parent_article_sha256 !== sha256(article)) errors.push("PARENT_ARTICLE_MISMATCH");
  if (plan.parent_article_id !== stableId("semantic_article", article)) errors.push("CORRECTION_PLAN_PARENT_MISMATCH");
  if (approval.brief_id !== brief.brief_id || approval.brief_sha256 !== brief.brief_sha256 || approval.page_plan_id !== pagePlan.plan_id || approval.page_plan_sha256 !== pagePlan.deterministic_content_sha256) errors.push("M4B_LINEAGE_MISMATCH");
  if (approval.evidence_pack_id !== evidencePack.evidence_pack_id || approval.evidence_pack_sha256 !== evidencePack.evidence_pack_sha256 || approval.restriction_policy_id !== restrictionPolicy.policy_id || approval.restriction_policy_sha256 !== restrictionPolicy.policy_sha256) errors.push("EVIDENCE_POLICY_LINEAGE_MISMATCH");
  if (approval.publication_authorized !== false || approval.research_authorized !== false) errors.push("AUTHORITY_INVALID");
  if (corrected.topic !== opportunity.primary_query || corrected.search_intent?.primary !== opportunity.search_intent) errors.push("STRATEGY_DRIFT");
  if (JSON.stringify(corrected.components.map((c) => c.component_id)) !== JSON.stringify(article.components.map((c) => c.component_id))) errors.push("COMPONENT_ID_DRIFT");
  return errors;
}

export async function runM6Correction({ article, m4Input, brief, pagePlan, evidencePack, restrictionPolicy, seoGuidance, productIntelligence, review, approval, correctionPlan, provider, outputDirectory, productFacts }) {
  const lineage = validateCorrectionLineage({ article, corrected: article, review, approval, plan: correctionPlan, brief, pagePlan, evidencePack, restrictionPolicy, opportunity: m4Input.opportunity });
  if (lineage.length) return { status: "BLOCKED", errors: lineage, ai_calls: 0 };
  const allowlists = { evidence_ids: [...new Set(article.components.flatMap((c) => c.evidence_ids))], product_ids: [...new Set(article.components.flatMap((c) => c.product_ids))], internal_link_ids: [], products: (m4Input.registries.products || []).map((p) => ({ product_id: p.product_id, name: p.product_name, url: p.product_url })), internal_links: [] };
  const packet = { parent_article: article, founder_review: review, correction_approval: approval, correction_plan: correctionPlan, relevant_product_facts: productFacts, restrictions: restrictionPolicy.restrictions, strategy: { query: m4Input.opportunity.primary_query, type: m4Input.opportunity.article_type, intent: m4Input.opportunity.search_intent }, no_research: true };
  await mkdir(path.resolve(outputDirectory), { recursive: true });
  const controlled = await invokeControlledCall({ benchmarkDirectory: outputDirectory, modelLabel: provider.model, maxCalls: 1, retries: 0, invoke: async ({ callDirectory }) => {
    await writeImmutableArtifact(callDirectory, "m6-input.json", { artifact_type: "m6_correction_input", packet, input_sha256: sha256(packet) });
    const response = await provider.generate({ systemPrompt: M6_CORRECTION_SYSTEM_PROMPT, userPrompt: JSON.stringify(packet), responseSchema: null });
    await writeImmutableArtifact(callDirectory, "m6-response-raw.json", { provider: response.provider, model: response.model, raw_text: response.rawText, usage: response.usage || {} });
    let corrected; let errors = []; try { corrected = JSON.parse(response.rawText); } catch (e) { errors = [{ code: "MALFORMED_JSON", message: e.message }]; }
    if (!errors.length) errors = validateCorrectionLineage({ article, corrected, review, approval, plan: correctionPlan, brief, pagePlan, evidencePack, restrictionPolicy, opportunity: m4Input.opportunity });
    errors.push(...validateM5DPage(corrected, { plan: { ...pagePlan, components: pagePlan.components.map((c) => ({ ...c, evidence_ids: allowlists.evidence_ids })) }, allowlists, opportunity: m4Input.opportunity, approval: { publication_authorized: false }, restrictionPolicy }));
    await writeImmutableArtifact(callDirectory, "m6-validation.json", { status: errors.length ? "FAIL" : "PASS", errors, downstream_eligible: !errors.length });
    if (errors.length) return { status: "BLOCKED", errors, ai_calls: 1, callDirectory };
    const markdown = renderEditorialDraftMarkdown(corrected, allowlists); const html = renderSemanticPageHtml(corrected, { allowlists, mode: "offline" });
    const id = stableId("semantic_article", corrected); const hash = sha256(corrected);
    await writeImmutableArtifact(callDirectory, "semantic-page.json", corrected);
    await writeImmutableArtifact(callDirectory, "m6-lineage.json", { artifact_type: "corrected_semantic_article_lineage", parent_article_id: stableId("semantic_article", article), parent_article_sha256: sha256(article), corrected_article_id: id, corrected_article_sha256: hash, founder_review_id: review.review_id, correction_approval_id: approval.approval_id, correction_plan_sha256: sha256(correctionPlan), brief_id: brief.brief_id, page_plan_id: pagePlan.plan_id, evidence_pack_id: evidencePack.evidence_pack_id, restriction_policy_id: restrictionPolicy.policy_id, seo_guidance_snapshot_id: seoGuidance.snapshot_id, product_intelligence_id: productIntelligence.product_id, publication_authorized: false });
    await writeImmutableArtifact(callDirectory, "semantic-page.md", markdown); await writeImmutableArtifact(callDirectory, "semantic-page.html", html);
    return { status: "HUMAN_REVIEW_READY", corrected, markdown, html, corrected_id: id, corrected_sha256: hash, callDirectory, ai_calls: 1, usage: response.usage || {} };
  }});
  return { ...controlled.result, lifecycle: controlled.lifecycle };
}
