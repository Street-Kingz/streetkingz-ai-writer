import { readFile } from "node:fs/promises";
import { aggregateResearchEvidence } from "../research/aggregation/researchState.js";
import { buildArticleCandidatePacket, buildArticleOpportunityAiInput, decideArticleOpportunity, validateArticleOpportunityDecision } from "./createSeoArticleOpportunity.js";
import { runControlledArticleOpportunityDecision } from "./createSeoArticleOpportunityAi.js";
import { bindCreateSeoArticleStageResult, createSeoArticleRunPlan, pauseCreateSeoArticleRun, stageResultEnvelope } from "./createSeoArticle.js";
import { runCreateSeoArticleM2 } from "./createSeoArticleIntelligence.js";
import { sha256 } from "../research/core/canonical.js";

async function load(file) { return JSON.parse(await readFile(file, "utf8")); }

export async function runCreateSeoArticleM3({ input, resolveCandidates, runResearch, decisionProvider, guidanceSnapshot = null, decisionOutputDirectory = "artifacts/workflows/create-seo-article/m3-opportunity", now = () => new Date().toISOString() }) {
  const m2 = await runCreateSeoArticleM2({ input, resolveCandidates, now });
  if (m2.status !== "ready_for_research") return m2;
  let plan = m2.plan;
  let research;
  try {
    if (typeof runResearch !== "function") throw Object.assign(new Error("Research execution is not configured for this workflow run."), { code: "RESEARCH_UNAVAILABLE" });
    research = await runResearch({ productUrl: input.product_url, intelligence: m2.intelligence, workflowRunId: plan.workflow_run_id, objective: "create_seo_article" });
    const evidence = research.evidence || await load(research.evidencePath);
    const researchState = research.researchState || (research.researchStatePath ? await load(research.researchStatePath) : aggregateResearchEvidence({ evidence, objective: "create_seo_article" }));
    const packet = research.packet || buildArticleCandidatePacket({ evidence, researchState, maximum: 25 });
    let decision = research.decision;
    let aiRun = null;
    if (!decision) {
      if (!decisionProvider) return { plan: pauseCreateSeoArticleRun(plan, { reason: "decision_unavailable", requiredStage: "research", message: "A controlled opportunity decision is unavailable; no deterministic volume-only fallback was used.", nextAction: "Run the approved bounded opportunity interpretation." }), status: "decision_unavailable", intelligence: m2.intelligence, researchState, packet };
      if (!guidanceSnapshot) return { plan: pauseCreateSeoArticleRun(plan, { reason: "guidance_unavailable", requiredStage: "research", message: "A current validated SEO guidance snapshot is required for the opportunity decision.", nextAction: "Retrieve or provide a still-current trusted guidance snapshot." }), status: "guidance_unavailable", intelligence: m2.intelligence, researchState, packet };
      const aiInput = buildArticleOpportunityAiInput({ packet, researchState, intelligence: m2.intelligence, market: research.market || "GB", language: research.language || "en-GB", guidanceSnapshot });
      aiRun = await runControlledArticleOpportunityDecision({ input: aiInput, provider: decisionProvider, outputDirectory: decisionOutputDirectory, now: () => new Date(now()) });
      decision = aiRun.decision;
    }
    const errors = validateArticleOpportunityDecision(decision, { evidenceIds: evidence.records.map((r) => r.evidence_id) });
    if (errors.length) throw Object.assign(new Error("Article opportunity decision failed validation."), { code: "INVALID_OPPORTUNITY", errors });
    const researchHash = sha256(researchState);
    const researchResult = { ...stageResultEnvelope(plan, { artifactId: researchState.research_state_id, artifactSha256: researchHash }), provenance: { research_state_id: researchState.research_state_id, research_state_sha256: researchHash, evidence_artifact_id: evidence.evidence_artifact_id, evidence_artifact_sha256: sha256(evidence) } };
    plan = bindCreateSeoArticleStageResult(plan, researchResult);
    const opportunityHash = sha256(decision);
    const opportunityResult = { ...stageResultEnvelope(plan, { artifactId: `article_opportunity_${opportunityHash.slice(0, 16)}`, artifactSha256: opportunityHash }), provenance: { research_state_id: researchState.research_state_id, evidence_artifact_id: evidence.evidence_artifact_id, candidate_packet_id: packet.packet_id, decision: decision.outcome, seo_guidance_snapshot_id: guidanceSnapshot?.snapshot_id || null, seo_guidance_snapshot_sha256: guidanceSnapshot?.snapshot_sha256 || null, source_manifest_version: guidanceSnapshot?.source_manifest_version || null, freshness_status: guidanceSnapshot ? "CURRENT" : "NOT_SUPPLIED" } };
    plan = bindCreateSeoArticleStageResult(plan, opportunityResult);
    if (guidanceSnapshot) plan.seo_guidance = { snapshot_id: guidanceSnapshot.snapshot_id, snapshot_sha256: guidanceSnapshot.snapshot_sha256, source_manifest_version: guidanceSnapshot.source_manifest_version, freshness_status: "CURRENT" };
    if (decision.outcome === "ARTICLE_RECOMMENDED") return { plan, status: "article_brief_ready", intelligence: m2.intelligence, researchState, packet, decision, aiRun };
    if (decision.outcome === "NO_ARTICLE_RECOMMENDED") { plan.state = "completed_no_article"; plan.current_stage = null; return { plan, status: "no_article_recommended", intelligence: m2.intelligence, researchState, packet, decision, aiRun }; }
    plan = pauseCreateSeoArticleRun(plan, { reason: "research_insufficient", requiredStage: "research", message: decision.rationale, nextAction: "Collect or validate the missing research evidence before deciding." });
    return { plan, status: "research_insufficient", intelligence: m2.intelligence, researchState, packet, decision, aiRun };
  } catch (error) {
    if (error.code === "RESEARCH_UNAVAILABLE") {
      plan = pauseCreateSeoArticleRun(plan, { reason: "research_unavailable", requiredStage: "research", message: error.message, nextAction: "Configure approved research providers or provide a frozen evidence fixture." });
      return { plan, status: "paused", pause: plan.pause };
    }
    plan.state = "failed"; plan.current_stage = null; plan.failure = { code: error.code || "RESEARCH_INVALID", message: error.message, errors: error.errors || [] };
    for (const stage of plan.stages) if (["ready", "pending"].includes(stage.state)) { stage.state = stage.sequence === 3 ? "failed" : "blocked"; stage.failure = { code: stage.sequence === 3 ? plan.failure.code : "UPSTREAM_STAGE_FAILED" }; }
    return { plan, status: "failed", failure: plan.failure };
  }
}

export function createFrozenM3ResearchRunner({ evidencePath, researchStatePath } = {}) {
  return async () => ({ evidencePath, researchStatePath });
}
