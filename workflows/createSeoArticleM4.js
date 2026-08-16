import { mkdir } from "node:fs/promises";
import path from "node:path";
import { invokeControlledCall, writeImmutableArtifact } from "../interpretation/call-control.js";
import { bindCreateSeoArticleStageResult, pauseCreateSeoArticleRun } from "./createSeoArticle.js";
import { buildCreateSeoArticleM4Input, articleBriefJsonSchema, validateCreateSeoArticleM4Output, buildArticleBriefAndPagePlan } from "./createSeoArticlePlanning.js";
import { sha256, stableId } from "../research/core/canonical.js";
import { validateEditorialPagePlan } from "../editorial/validation.js";

export const M4_SYSTEM_PROMPT = "You are a bounded article planning reasoner. Use only the supplied validated M3 opportunity, intelligence, research evidence, registries and current SEO guidance. Do not browse, change the primary query, article type or search intent, invent facts, metrics, products, URLs, competitor findings or ranking claims, or write article prose. Keep business intelligence as internal planning context rather than customer-facing persona language. Return only the requested structured planning JSON.";

const review = ({ brief, plan, input }) => `# Structured Article Brief + Page Plan Review\n\n## What we plan to write\n\nPrimary query: ${brief.primary_query}\nArticle type: ${brief.article_type}\nSearch intent: ${brief.search_intent}\nWorking title: ${brief.working_title}\n\n## Why this article exists\n\n${brief.article_purpose}\n\n## Who it is for\n\n${brief.target_reader}\n\n## Problem and outcome\n\n${brief.reader_problem}\n\n${brief.reader_outcome}\n\n## Article angle\n\n${brief.product_role}\n\n## Page structure\n\n${plan.components.map((item, index) => `${index + 1}. ${item.component_type}: ${item.required_content.join("; ")} — ${item.purpose}`).join("\n")}\n\n## Questions and FAQ plan\n\n${[...(brief.questions || []), ...(brief.faq || [])].map((item) => `- ${item.question}`).join("\n") || "- No additional evidence-backed questions selected."}\n\n## Product and commercial role\n\n${brief.product_role}\n\nCTA purpose: ${brief.cta.purpose}\nPlacement: ${brief.cta.placement}\n\n## Media and structured data\n\n${brief.media.map((item) => `- ${item.kind}: ${item.purpose} (${item.status})`).join("\n") || "- No media requirement selected."}\nStructured data: ${brief.structured_data.recommendation}\n\n## Target length\n\n${brief.target_length.mode}: ${brief.target_length.rationale}\n\n## Evidence and guidance\n\nResearch evidence and product/business context are bound in the technical artifact. SEO guidance snapshot: ${input.seo_guidance.snapshot_id} (${input.seo_guidance.freshness_status}).\n\n## Unknowns and limitations\n\n${brief.unknowns.map((item) => `- ${item}`).join("\n")}\n\nARTICLE NOT GENERATED\n\nHUMAN REVIEW REQUIRED BEFORE GENERATION\n`;

export async function runCreateSeoArticleM4({ m3Result, evidence, guidanceSnapshot, provider, outputDirectory = "artifacts/workflows/create-seo-article/m4-brief-proof", now = () => new Date() }) {
  let input;
  try { input = buildCreateSeoArticleM4Input({ m3Result, evidence, guidanceSnapshot }); } catch (error) { return { status: "failed", failure: { code: "INVALID_M4_INPUT", message: error.message } }; }
  if (!provider || typeof provider.generate !== "function" || !provider.model) return { status: "paused", pause: { reason: "planning_unavailable", required_stage: "article_brief", message: "A controlled M4 planning provider is unavailable." }, input };
  const prompt = `Create the structured article brief and page-plan planning output for this fixed opportunity. Do not write article prose.\n\nINPUT:\n${JSON.stringify(input)}`;
  let controlled;
  try {
    await mkdir(path.resolve(outputDirectory), { recursive: true });
    controlled = await invokeControlledCall({ benchmarkDirectory: path.resolve(outputDirectory), modelLabel: provider.model, maxCalls: 1, retries: 0, now, invoke: async ({ callDirectory, signal }) => {
      const schema = articleBriefJsonSchema(input);
      const request = provider.requestPayload ? provider.requestPayload({ systemPrompt: M4_SYSTEM_PROMPT, userPrompt: prompt, responseSchema: schema, temperature: 0.1 }) : null;
      await writeImmutableArtifact(callDirectory, "m4-input.json", { ...input, input_sha256: sha256(input), request });
      const response = await provider.generate({ systemPrompt: M4_SYSTEM_PROMPT, userPrompt: prompt, responseSchema: schema, signal });
      await writeImmutableArtifact(callDirectory, "m4-response-raw.json", { provider: response.provider, model: response.model, response_id: response.response_id || null, raw_text: response.rawText, usage: response.usage || null });
      let output; try { output = JSON.parse(response.rawText); } catch (error) { throw Object.assign(new Error("M4 planning output was malformed JSON."), { code: "INVALID_M4_OUTPUT", cause: error }); }
      const errors = validateCreateSeoArticleM4Output(output, input);
      const validation = { artifact_type: "m4_planning_validation", status: errors.length ? "FAIL" : "PASS", errors };
      await writeImmutableArtifact(callDirectory, "m4-validation.json", validation);
      if (errors.length) throw Object.assign(new Error("M4 planning output failed deterministic validation."), { code: "INVALID_M4_OUTPUT", errors });
      const { brief, plan } = buildArticleBriefAndPagePlan({ output, input });
      const planErrors = validateEditorialPagePlan(plan, { evidence_ids: input.research.relevant_evidence_ids, product_ids: input.registries.products.map((item) => item.product_id), internal_link_ids: [] });
      if (planErrors.length) throw Object.assign(new Error("M4 editorial page plan failed validation."), { code: "INVALID_M4_PAGE_PLAN", errors: planErrors });
      await writeImmutableArtifact(callDirectory, "article-brief.json", brief);
      await writeImmutableArtifact(callDirectory, "editorial-page-plan.json", plan);
      await writeImmutableArtifact(callDirectory, "m4-review.md", review({ brief, plan, input }));
      return { brief, plan, validation, metadata: { model: response.model || provider.model, api: provider.settings?.api || "injected", reasoning: provider.settings?.reasoning || null, ai_calls: 1, usage: response.usage || {}, input_count: input.research.relevant_evidence_ids.length, input_sha256: sha256(input) }, callDirectory };
    }});
  } catch (error) {
    return { status: "failed", failure: { code: error.code || "M4_PLANNING_FAILED", message: error.message, errors: error.errors || [] }, input, lifecycle: controlled?.lifecycle };
  }
  const result = controlled.result;
  const plan = m3Result.plan;
  const stageResult = { workflow_run_id: plan.workflow_run_id, workflow_input_sha256: plan.workflow_input_sha256, objective: "create_seo_article", stage_id: "article_brief", output_type: "validated_article_brief", artifact_id: result.brief.brief_id, artifact_sha256: result.brief.brief_sha256, validation_state: "valid", status: "complete", provenance: { brief_id: result.brief.brief_id, brief_sha256: result.brief.brief_sha256, page_plan_id: result.plan.plan_id, page_plan_sha256: result.plan.deterministic_content_sha256, seo_guidance_snapshot_id: guidanceSnapshot.snapshot_id, seo_guidance_snapshot_sha256: guidanceSnapshot.snapshot_sha256, source_manifest_version: guidanceSnapshot.source_manifest_version, freshness_status: "CURRENT" } };
  const nextPlan = bindCreateSeoArticleStageResult(plan, stageResult);
  nextPlan.m4 = { brief_id: result.brief.brief_id, brief_sha256: result.brief.brief_sha256, page_plan_id: result.plan.plan_id, page_plan_sha256: result.plan.deterministic_content_sha256, human_review_state: "awaiting_page_plan_approval" };
  return { status: "article_generation_ready", plan: nextPlan, input, brief: result.brief, pagePlan: result.plan, validation: result.validation, metadata: result.metadata, callDirectory: result.callDirectory, lifecycle: controlled.lifecycle };
}
