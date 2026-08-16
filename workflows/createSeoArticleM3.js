import { readFile } from "node:fs/promises";
import { aggregateResearchEvidence } from "../research/aggregation/researchState.js";
import { buildArticleCandidatePacket, decideArticleOpportunity, validateArticleOpportunityDecision } from "./createSeoArticleOpportunity.js";
import { bindCreateSeoArticleStageResult, createSeoArticleRunPlan, pauseCreateSeoArticleRun, stageResultEnvelope } from "./createSeoArticle.js";
import { runCreateSeoArticleM2 } from "./createSeoArticleIntelligence.js";
import { sha256 } from "../research/core/canonical.js";

async function load(file) { return JSON.parse(await readFile(file, "utf8")); }

export async function runCreateSeoArticleM3({ input, resolveCandidates, runResearch, now = () => new Date().toISOString() }) {
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
    const decision = research.decision || decideArticleOpportunity({ packet, researchState });
    const errors = validateArticleOpportunityDecision(decision, { evidenceIds: evidence.records.map((r) => r.evidence_id) });
    if (errors.length) throw Object.assign(new Error("Article opportunity decision failed validation."), { code: "INVALID_OPPORTUNITY", errors });
    const researchHash = sha256(researchState);
    const researchResult = { ...stageResultEnvelope(plan, { artifactId: researchState.research_state_id, artifactSha256: researchHash }), provenance: { research_state_id: researchState.research_state_id, research_state_sha256: researchHash, evidence_artifact_id: evidence.evidence_artifact_id, evidence_artifact_sha256: sha256(evidence) } };
    plan = bindCreateSeoArticleStageResult(plan, researchResult);
    const opportunityHash = sha256(decision);
    const opportunityResult = { ...stageResultEnvelope(plan, { artifactId: `article_opportunity_${opportunityHash.slice(0, 16)}`, artifactSha256: opportunityHash }), provenance: { research_state_id: researchState.research_state_id, evidence_artifact_id: evidence.evidence_artifact_id, candidate_packet_id: packet.packet_id, decision: decision.outcome } };
    plan = bindCreateSeoArticleStageResult(plan, opportunityResult);
    if (decision.outcome === "ARTICLE_RECOMMENDED") return { plan, status: "article_brief_ready", intelligence: m2.intelligence, researchState, packet, decision };
    if (decision.outcome === "NO_ARTICLE_RECOMMENDED") { plan.state = "completed_no_article"; plan.current_stage = null; return { plan, status: "no_article_recommended", intelligence: m2.intelligence, researchState, packet, decision }; }
    plan = pauseCreateSeoArticleRun(plan, { reason: "research_insufficient", requiredStage: "research", message: decision.rationale, nextAction: "Collect or validate the missing research evidence before deciding." });
    return { plan, status: "research_insufficient", intelligence: m2.intelligence, researchState, packet, decision };
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
