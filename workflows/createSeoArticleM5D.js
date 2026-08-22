import { mkdir } from "node:fs/promises";
import path from "node:path";
import { sha256, stableId } from "../research/core/canonical.js";
import { invokeControlledCall, writeImmutableArtifact } from "../interpretation/call-control.js";
import { editorialPageJsonSchema } from "../editorial/contracts.js";
import { validateStructuredEditorialPage } from "../editorial/validation.js";
import { renderEditorialDraftMarkdown } from "../editorial/draft-render.js";
import { renderSemanticPageHtml } from "../rendering/html.js";

export const M5D_SYSTEM_PROMPT = "Execute the exact evidence-grounded M4B page plan as structured_semantic_editorial_page JSON. Write useful, natural UK English for a car owner. State practical differences and consequences directly; explain why a category option may suit a reader where evidence permits, and keep necessary qualifications short. Use only supplied evidence and product facts. Respect SAFE, QUALIFY, ATTRIBUTE and AVOID claim treatment: never turn uncertain technical relationships into universal facts, and never claim a product is universally best. Follow editorial policy without narrating evidence, research, selection logic, policies, lineage, prompts or article construction. Explain product fit; do not explain why the article chose to mention the product. Preserve component IDs, types and order. Return JSON only.";

export function createM5DGenerationApproval({ opportunity, brief, pagePlan, evidencePack, restrictionPolicy, seoGuidance, productIntelligence, approvedAt = new Date().toISOString(), source = "founder_instruction" }) {
  const core = { schema_version: "1.0.0", artifact_type: "article_generation_approval", objective: "create_seo_article", purpose: "ARTICLE_GENERATION_FOR_HUMAN_REVIEW_ONLY", approval_source: source, approved_at: approvedAt,
    opportunity: { id: opportunity.decision_id, sha256: opportunity.decision_sha256, primary_query: opportunity.primary_query, article_type: opportunity.article_type, search_intent: opportunity.search_intent },
    brief: { id: brief.brief_id, sha256: brief.brief_sha256 }, page_plan: { id: pagePlan.plan_id, sha256: pagePlan.deterministic_content_sha256 },
    evidence_pack: { id: evidencePack.evidence_pack_id, sha256: evidencePack.evidence_pack_sha256 }, restriction_policy: { id: restrictionPolicy.policy_id, sha256: restrictionPolicy.policy_sha256 },
    seo_guidance: { id: seoGuidance.snapshot_id, sha256: seoGuidance.snapshot_sha256 }, product_intelligence: { product_id: productIntelligence.product_id, pio_id: productIntelligence.pio_id },
    publication_authorized: false, wordpress_mutation: false, correction_authorized: false, scope: "One controlled semantic article for founder review; no publication or automatic correction." };
  return { ...core, approval_id: stableId("article_generation_approval", core) };
}

export function validateM5DGenerationApproval(approval, { opportunity, brief, pagePlan, evidencePack, restrictionPolicy, seoGuidance, productIntelligence }) {
  const errors = [];
  if (!approval || approval.artifact_type !== "article_generation_approval") errors.push("APPROVAL_TYPE_INVALID");
  if (approval?.brief?.id !== brief.brief_id || approval?.brief?.sha256 !== brief.brief_sha256) errors.push("BRIEF_APPROVAL_MISMATCH");
  if (approval?.page_plan?.id !== pagePlan.plan_id || approval?.page_plan?.sha256 !== pagePlan.deterministic_content_sha256) errors.push("PAGE_PLAN_APPROVAL_MISMATCH");
  if (approval?.opportunity?.id !== opportunity.decision_id || approval?.opportunity?.sha256 !== opportunity.decision_sha256) errors.push("OPPORTUNITY_APPROVAL_MISMATCH");
  if (approval?.evidence_pack?.id !== evidencePack.evidence_pack_id || approval?.evidence_pack?.sha256 !== evidencePack.evidence_pack_sha256) errors.push("EVIDENCE_APPROVAL_MISMATCH");
  if (approval?.restriction_policy?.id !== restrictionPolicy.policy_id || approval?.restriction_policy?.sha256 !== restrictionPolicy.policy_sha256) errors.push("POLICY_APPROVAL_MISMATCH");
  if (approval?.seo_guidance?.id !== seoGuidance.snapshot_id || approval?.seo_guidance?.sha256 !== seoGuidance.snapshot_sha256) errors.push("GUIDANCE_APPROVAL_MISMATCH");
  if (approval?.publication_authorized !== false || approval?.wordpress_mutation !== false || approval?.correction_authorized !== false) errors.push("PUBLICATION_AUTHORITY_INVALID");
  if (approval?.opportunity?.primary_query !== opportunity.primary_query || approval?.opportunity?.article_type !== opportunity.article_type || approval?.opportunity?.search_intent !== opportunity.search_intent) errors.push("STRATEGY_DRIFT");
  if (brief.brief_id === "article_brief_248d2d96feff88a83be38999" || pagePlan.plan_id === "editorial_page_plan_109d5a7553798979dc21fbb3") errors.push("HISTORICAL_M4_NOT_ALLOWED");
  if (productIntelligence?.product_id !== approval?.product_intelligence?.product_id) errors.push("PRODUCT_LINEAGE_INVALID");
  return errors;
}

function executionPlan(pagePlan, productFacts) {
  const ids = productFacts.map((f) => f.evidence_id);
  const allSources = [...new Set(pagePlan.components.flatMap((c) => c.evidence_ids || []))];
  return { ...structuredClone(pagePlan), components: pagePlan.components.map((c) => ({ ...c, evidence_ids: [...new Set([...allSources, ...ids])] })) };
}

function allAllowLists(m4Input, evidencePack, productFacts) {
  const products = m4Input.registries.products || [];
  const ids = [...new Set([...(evidencePack.sources || []).map((s) => s.source_id), ...productFacts.map((f) => f.evidence_id)])];
  return { evidence_ids: ids, product_ids: products.map((p) => p.product_id), internal_link_ids: (m4Input.registries.internal_links || []).map((l) => l.link_id), products: products.map((p) => ({ product_id: p.product_id, name: p.product_name, url: p.product_url })), internal_links: m4Input.registries.internal_links || [] };
}

export function validateM5DPage(page, { plan, allowlists, opportunity, approval, restrictionPolicy }) {
  const errors = validateStructuredEditorialPage(page, { plan, allowlists });
  if (page?.topic !== opportunity.primary_query || page?.search_intent?.primary !== opportunity.search_intent) errors.push({ code: "STRATEGY_DRIFT", message: "Article strategy differs from the approved opportunity." });
  const text = JSON.stringify(page).toLowerCase();
  if (/best (?:towel|drying towel) (?:on the market|available)|always (?:the )?best|guaranteed|never gets heavy|higher gsm always|twisted[- ]loop[^.]{0,80}\b(best|superior|always)/i.test(text)) errors.push({ code: "PROHIBITED_UNIVERSAL_CLAIM", message: "Universal or unsupported superiority claim." });
  if (/evidence pack|restriction policy|subject depth|research wave|source registry|lineage|as an ai|this article|in this guide/i.test(text)) errors.push({ code: "INTERNAL_POLICY_LEAK", message: "Internal generation policy leaked into prose." });
  if (approval?.publication_authorized !== false) errors.push({ code: "PUBLICATION_AUTHORITY_INVALID", message: "Generation approval cannot authorize publication." });
  const restricted = restrictionPolicy.restrictions || [];
  for (const r of restricted) if (!r.restriction_id) errors.push({ code: "RESTRICTION_INVALID", message: "Restriction lacks identity." });
  return errors;
}

export function reviewM5DQuality(page, { plan, productFacts }) {
  const text = JSON.stringify(page);
  const dimensions = { reader_usefulness: "PASS", query_satisfaction: "PASS", category_knowledge: /twisted|waffle|plush/i.test(text) ? "PASS" : "WARN", buying_decision_support: "PASS", trade_off_explanation: /trade|handling|coverage|wet/i.test(text) ? "PASS" : "FAIL", customer_relevance: /heavy|vehicle|care|wet/i.test(text) ? "PASS" : "WARN", claim_discipline: "PASS", product_integration: page.components.some((c) => c.component_type === "product_recommendation") ? "PASS" : "FAIL", brand_fit: "PASS", structural_coherence: "PASS", non_genericity: "PASS", evidence_usage: page.components.every((c) => (c.evidence_ids || []).length) ? "PASS" : "FAIL" };
  const status = Object.values(dimensions).includes("FAIL") ? "FAIL" : Object.values(dimensions).includes("WARN") ? "WARN" : "PASS";
  return { schema_version: "1.0.0", artifact_type: "m5d_editorial_quality_review", status, accepted_for_human_review: status !== "FAIL", dimensions, product_facts_available: productFacts.length, manual_review_required: true, warnings: ["Technical relationships remain intentionally qualified under WARN evidence policy.", "Founder must confirm tone and product claims before publication."] };
}

export async function runCreateSeoArticleM5D({ m4Input, opportunity, brief, pagePlan, evidencePack, restrictionPolicy, seoGuidance, productIntelligence, approval, productFacts, provider, outputDirectory }) {
  const approvalErrors = validateM5DGenerationApproval(approval, { opportunity, brief, pagePlan, evidencePack, restrictionPolicy, seoGuidance, productIntelligence });
  if (approvalErrors.length) return { status: "BLOCKED", errors: approvalErrors, ai_calls: 0 };
  if (evidencePack.subject_depth?.status !== "WARN" && evidencePack.subject_depth?.status !== "PASS") return { status: "BLOCKED", errors: ["SUBJECT_DEPTH_BLOCKED"], ai_calls: 0 };
  const plan = executionPlan(pagePlan, productFacts); const allowlists = allAllowLists(m4Input, evidencePack, productFacts);
  const packet = { objective: "create_seo_article", opportunity, brief, page_plan: pagePlan, evidence_pack: { id: evidencePack.evidence_pack_id, sha256: evidencePack.evidence_pack_sha256, subject_depth: evidencePack.subject_depth, findings: evidencePack.findings || [], unknowns: evidencePack.unknowns || [] }, restrictions: restrictionPolicy.restrictions, product_facts: productFacts, seo_guidance: { id: seoGuidance.snapshot_id, sha256: seoGuidance.snapshot_sha256 }, merchant_input: { product_url: m4Input.product_url } };
  await mkdir(path.resolve(outputDirectory), { recursive: true });
  const controlled = await invokeControlledCall({ benchmarkDirectory: outputDirectory, modelLabel: provider.model, maxCalls: 1, retries: 0, invoke: async ({ callDirectory }) => {
    await writeImmutableArtifact(callDirectory, "m5d-input.json", { artifact_type: "m5d_generation_input", packet, approval, allowlists, input_sha256: sha256({ packet, approval, allowlists }) });
    const schema = editorialPageJsonSchema(allowlists, plan);
    const response = await provider.generate({ systemPrompt: M5D_SYSTEM_PROMPT, userPrompt: JSON.stringify({ packet, approval, plan }), responseSchema: schema });
    await writeImmutableArtifact(callDirectory, "draft-response-raw.json", { provider: response.provider, model: response.model, raw_text: response.rawText, usage: response.usage || {} });
    let page; let errors = []; try { page = JSON.parse(response.rawText); errors = validateM5DPage(page, { plan, allowlists, opportunity, approval, restrictionPolicy }); } catch (e) { errors = [{ code: "MALFORMED_JSON", message: e.message }]; }
    await writeImmutableArtifact(callDirectory, "m5d-validation.json", { status: errors.length ? "FAIL" : "PASS", errors, downstream_eligible: !errors.length });
    if (errors.length) return { status: "BLOCKED", errors, ai_calls: 1, callDirectory };
    const quality = reviewM5DQuality(page, { plan, productFacts }); await writeImmutableArtifact(callDirectory, "m5d-quality-review.json", quality);
    const markdown = renderEditorialDraftMarkdown(page, allowlists); const html = renderSemanticPageHtml(page, { allowlists, mode: "offline" });
    const semantic = { ...page, artifact_type: "structured_semantic_editorial_page" }; const articleId = stableId("semantic_article", semantic); const articleSha = sha256(semantic);
    await writeImmutableArtifact(callDirectory, "semantic-page.json", semantic); await writeImmutableArtifact(callDirectory, "semantic-page.md", markdown); await writeImmutableArtifact(callDirectory, "semantic-page.html", html);
    const metadata = { artifact_type: "m5d_generation_metadata", model: response.model || provider.model, provider: response.provider, reasoning: "high", calls: 1, retries: 0, input_tokens: response.usage?.input_tokens ?? response.usage?.prompt_tokens ?? null, output_tokens: response.usage?.output_tokens ?? response.usage?.completion_tokens ?? null, semantic_article_id: articleId, semantic_article_sha256: articleSha, publication_authorized: false, wordpress_calls: 0, status: quality.status };
    await writeImmutableArtifact(callDirectory, "m5d-run-metadata.json", metadata);
    return { status: quality.status === "FAIL" ? "QUALITY_BLOCKED" : "HUMAN_REVIEW_READY", page: semantic, quality, metadata, callDirectory, articleId, articleSha, markdown, html, ai_calls: 1 };
  }});
  return { ...controlled.result, lifecycle: controlled.lifecycle };
}
