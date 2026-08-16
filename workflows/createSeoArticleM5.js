import { mkdir } from "node:fs/promises";
import path from "node:path";
import { sha256, stableId } from "../research/core/canonical.js";
import { invokeControlledCall, writeImmutableArtifact } from "../interpretation/call-control.js";
import { editorialPageJsonSchema } from "../editorial/contracts.js";
import { validateStructuredEditorialPage } from "../editorial/validation.js";
import { reviewEditorialDraftQuality } from "../editorial/draft-quality.js";
import { renderEditorialDraftMarkdown } from "../editorial/draft-render.js";
import { renderSemanticPageHtml } from "../rendering/html.js";

export const M5_DRAFT_SYSTEM_PROMPT = `Execute the approved editorial page plan as a semantic article. Write for people first in natural UK English where applicable. Preserve the exact component IDs, types and order; do not change the primary query, intent, article type or commercial strategy. Use only supplied evidence, product IDs and internal-link IDs. Do not invent facts, metrics, URLs, competitor findings, testing or first-hand experience. For commercial-investigation content, teach the reader enough to decide: explain meaningful distinctions, trade-offs, practical consequences and who each option may suit; touching every heading is not sufficient. Prefer concrete explanation over abstract adjectives and stop when planned coverage is complete. Do not expose internal business/persona terminology, SEO strategy, evidence methodology, research limitations or guidance. Recommendations must sound natural and reader-led, never like system selection commentary. Return only structured_semantic_editorial_page JSON; never HTML or Markdown.`;

export function createM5Approval({ objective, workflow_run_id, opportunity, brief, pagePlan, approvedAt = new Date().toISOString(), source = "founder_instruction" }) {
  const core = { schema_version: "1.0.0", artifact_type: "create_seo_article_generation_approval", objective, workflow_run_id,
    opportunity_id: opportunity.decision_id, opportunity_sha256: opportunity.decision_sha256,
    brief_id: brief.brief_id, brief_sha256: brief.brief_sha256,
    page_plan_id: pagePlan.plan_id, page_plan_sha256: pagePlan.deterministic_content_sha256,
    purpose: "controlled_m5_generation_for_founder_review", approval_source: source, approved_at: approvedAt,
    scope: "Generate one semantic article for human review from the exact approved M4 brief and page plan.", publication_authorized: false,
    wordpress_mutation: false, publication_attempts: 0 };
  return { ...core, approval_id: stableId("m5_generation_approval", core) };
}

function lineageErrors({ m4Input, brief, pagePlan, approval }) {
  const errors = [];
  if (m4Input.objective !== "create_seo_article") errors.push("OBJECTIVE_MISMATCH");
  const { brief_sha256: _briefHash, brief_id: _briefId, ...briefCore } = brief;
  const { deterministic_content_sha256: _planHash, plan_id: _planId, ...planCore } = pagePlan;
  if (sha256(briefCore) !== brief.brief_sha256) errors.push("BRIEF_HASH_MISMATCH");
  if (sha256(planCore) !== pagePlan.deterministic_content_sha256) errors.push("PAGE_PLAN_HASH_MISMATCH");
  if (pagePlan.brief_id !== brief.brief_id || pagePlan.brief_sha256 !== brief.brief_sha256) errors.push("PAGE_PLAN_BRIEF_MISMATCH");
  for (const key of ["decision_id", "decision_sha256"]) if (approval?.[`opportunity_${key.replace("decision_", "")}`] !== m4Input.opportunity[key]) errors.push("APPROVAL_OPPORTUNITY_MISMATCH");
  if (approval?.brief_id !== brief.brief_id || approval?.brief_sha256 !== brief.brief_sha256) errors.push("APPROVAL_BRIEF_MISMATCH");
  if (approval?.page_plan_id !== pagePlan.plan_id || approval?.page_plan_sha256 !== pagePlan.deterministic_content_sha256) errors.push("APPROVAL_PAGE_PLAN_MISMATCH");
  if (approval?.publication_authorized !== false || approval?.wordpress_mutation !== false) errors.push("APPROVAL_AUTHORITY_INVALID");
  const o = m4Input.opportunity;
  if (brief.primary_query !== o.primary_query || brief.article_type !== o.article_type || brief.search_intent !== o.search_intent) errors.push("BRIEF_STRATEGY_DRIFT");
  if (pagePlan.primary_query !== o.primary_query || pagePlan.search_intent?.primary !== o.search_intent) errors.push("PLAN_STRATEGY_DRIFT");
  if (pagePlan.strategy_id !== o.decision_id || pagePlan.provenance?.opportunity_decision_sha256 !== o.decision_sha256) errors.push("PLAN_OPPORTUNITY_LINEAGE_MISMATCH");
  if (pagePlan.provenance?.seo_guidance_snapshot_id !== m4Input.seo_guidance.snapshot_id || pagePlan.provenance?.seo_guidance_snapshot_sha256 !== m4Input.seo_guidance.snapshot_sha256 || pagePlan.provenance?.freshness_status !== "CURRENT") errors.push("GUIDANCE_LINEAGE_INVALID");
  if (!Array.isArray(pagePlan.component_sequence) || pagePlan.component_sequence.length !== pagePlan.components?.length) errors.push("COMPONENT_SEQUENCE_INVALID");
  return errors;
}

function selectRelevantProductFacts(records, brief, pagePlan) {
  const context = JSON.stringify({ brief, pagePlan }).toLowerCase();
  const terms = ["size", "gsm", "construction", "pile", "water", "heavy", "paint", "glass", "vehicle", "surface", "dry", "handling", "coat", "wax", "pressure", "use"];
  return records.map((record) => {
    const text = JSON.stringify(record.value || record).toLowerCase();
    const fieldPath = String(record.field_path || record.value?.field_path || "").toLowerCase();
    const editorialField = /specifications|features|intended_use|limitations|benefits/.test(fieldPath) ? 3 : 0;
    const score = editorialField + terms.reduce((total, term) => total + (context.includes(term) && text.includes(term) ? 1 : 0), 0);
    return { record, score };
  }).sort((a, b) => b.score - a.score || a.record.evidence_id.localeCompare(b.record.evidence_id)).slice(0, 24).map(({ record }) => record);
}

function buildAllowlists(m4Input, pagePlan, productFacts) {
  const productFactIds = productFacts.map((record) => record.evidence_id);
  const evidence_ids = [...new Set([...(m4Input.research.relevant_evidence_ids || []), ...(m4Input.intelligence.product.evidence_ids || []), ...pagePlan.components.flatMap((c) => c.evidence_ids || []), ...productFactIds])];
  return { evidence_ids, product_ids: (m4Input.registries?.products || []).map((p) => p.product_id), internal_link_ids: (m4Input.registries?.internal_links || []).map((l) => l.link_id), products: (m4Input.registries?.products || []).map((p) => ({ product_id: p.product_id, name: p.product_name, url: p.product_url })), internal_links: m4Input.registries?.internal_links || [] };
}

export async function runCreateSeoArticleM5({ m4Input, brief, pagePlan, approval, provider, outputDirectory, productFactsEvidence = [], now = () => new Date(), maxCalls = 1 }) {
  const errors = lineageErrors({ m4Input, brief, pagePlan, approval });
  if (errors.length) return { status: "BLOCKED", errors, ai_calls: 0 };
  const productFacts = selectRelevantProductFacts(productFactsEvidence, brief, pagePlan);
  const draftPlan = structuredClone(pagePlan);
  draftPlan.components = draftPlan.components.map((component) => ({ ...component, evidence_ids: [...new Set([...(component.evidence_ids || []), ...productFacts.map((record) => record.evidence_id)])] }));
  const allowlists = buildAllowlists(m4Input, draftPlan, productFacts);
  const packet = { objective: m4Input.objective, opportunity: m4Input.opportunity, article_brief: brief, page_plan: pagePlan,
    product_evidence: m4Input.intelligence.product, business_context: m4Input.intelligence.business, eic_context: m4Input.intelligence.eic,
    product_facts: { records: productFacts, source_artifact: "validated_product_facts_provider_evidence" },
    research: { state_id: m4Input.research.research_state_id, evidence_artifact_id: m4Input.research.evidence_artifact_id, evidence_ids: m4Input.research.relevant_evidence_ids.slice(0, 25), unknowns: m4Input.research.unknowns },
    authoritative_seo_guidance: { snapshot_id: m4Input.seo_guidance.snapshot_id, snapshot_sha256: m4Input.seo_guidance.snapshot_sha256, freshness_status: m4Input.seo_guidance.freshness_status, records: m4Input.seo_guidance.records.slice(0, 8) },
    standards: m4Input.seo_guidance.records.filter((r) => r.authority_class === "WEB_STANDARD"), unknowns: m4Input.research.unknowns };
  await mkdir(path.resolve(outputDirectory), { recursive: true });
  const result = await invokeControlledCall({ benchmarkDirectory: outputDirectory, modelLabel: provider.model, maxCalls, retries: 0, invoke: async ({ callDirectory }) => {
    const input = { schema_version: "1.0.0", artifact_type: "create_seo_article_m5_generation_input", packet, approval, allowlists, authority: { semantic_representation: "structured_semantic_editorial_page", add_components: false, change_strategy: false, generate_html: false, wordpress_mutation: false }, input_sha256: sha256({ packet, approval, allowlists }) };
    await writeImmutableArtifact(callDirectory, "m5-input.json", input);
    const schema = editorialPageJsonSchema(allowlists, draftPlan);
    const userPrompt = JSON.stringify({ instructions: "Populate the approved plan exactly and stop when the subject is properly covered.", packet, approval, allowlists });
    const response = await provider.generate({ systemPrompt: M5_DRAFT_SYSTEM_PROMPT, userPrompt, packet, approval, allowlists, schema, responseSchema: schema });
    await writeImmutableArtifact(callDirectory, "draft-response-raw.json", { artifact_type: "raw_editorial_draft_response", provider: response.provider, model: response.model, response_id: response.response_id, raw_text: response.rawText });
    let page = null; let validationErrors = [];
    try { page = JSON.parse(response.rawText); validationErrors = validateStructuredEditorialPage(page, { plan: draftPlan, allowlists }); } catch (error) { validationErrors = [{ code: "MALFORMED_JSON", message: error.message }]; }
    const validation = { artifact_type: "editorial_draft_validation", status: validationErrors.length ? "FAIL" : "PASS", downstream_eligible: !validationErrors.length, errors: validationErrors };
    await writeImmutableArtifact(callDirectory, "draft-validation.json", validation);
    if (validationErrors.length) return { accepted: false, validation, quality: null, page: null, callDirectory, response };
    const quality = reviewEditorialDraftQuality(page, { plan: draftPlan, productFactEvidence: productFacts });
    await writeImmutableArtifact(callDirectory, "editorial-quality-review.json", quality);
    const markdown = renderEditorialDraftMarkdown(page, allowlists);
    const html = renderSemanticPageHtml(page, { allowlists, mode: "offline" });
    await writeImmutableArtifact(callDirectory, "semantic-page.json", page);
    await writeImmutableArtifact(callDirectory, "semantic-page.md", markdown);
    await writeImmutableArtifact(callDirectory, "semantic-page.html", html);
    const metadata = { artifact_type: "m5_generation_metadata", model: response.model || provider.model, provider: response.provider, calls: 1, retries: 0, usage: response.usage || {}, semantic_article_id: stableId("semantic_article", page), semantic_article_sha256: sha256(page), status: quality.status, wordpress_writes: 0, publication_attempts: 0 };
    await writeImmutableArtifact(callDirectory, "run-metadata.json", metadata);
    const reviewCandidate = { artifact_type: "m6_review_candidate", state: "awaiting_human_review", semantic_article_id: metadata.semantic_article_id, semantic_article_sha256: metadata.semantic_article_sha256, opportunity_id: m4Input.opportunity.decision_id, opportunity_sha256: m4Input.opportunity.decision_sha256, brief_id: brief.brief_id, brief_sha256: brief.brief_sha256, page_plan_id: pagePlan.plan_id, page_plan_sha256: pagePlan.deterministic_content_sha256, approval_id: approval.approval_id, seo_guidance_snapshot_id: m4Input.seo_guidance.snapshot_id, seo_guidance_snapshot_sha256: m4Input.seo_guidance.snapshot_sha256, validation_status: validation.status, quality_status: quality.status, previews: ["semantic-page.md", "semantic-page.html"], known_unknowns: m4Input.research.unknowns };
    await writeImmutableArtifact(callDirectory, "m6-review-candidate.json", reviewCandidate);
    return { accepted: quality.accepted_for_human_review, validation, quality, page, metadata, callDirectory, response, reviewCandidate };
  } });
  return { ...result.result, lifecycle: result.lifecycle, status: result.result?.accepted ? "HUMAN_REVIEW_READY" : "QUALITY_REVIEW_REQUIRED" };
}
