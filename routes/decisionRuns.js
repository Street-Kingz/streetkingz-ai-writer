import express from "express";
import { randomUUID } from "node:crypto";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { privilegedClient } from "../product-kernel/privileged.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { correlationMiddleware } from "../product-kernel/correlation.js";
import { loadDiscoveryEvidence } from "../product-kernel/decisionEvidenceAdapter.js";
import { DISCOVERY_VERSION, discoverCandidates, selectBoundedCandidates } from "../product-kernel/decisionDiscovery.js";
import { SLICE_B_EVALUATION_VERSION, FILTER_VERSION, INTERPRETATION_VERSION, INSTRUCTION_VERSION, buildInterpretationPacket, buildBatchIdentity, deterministicFilter, prepareDeterministicCohort, selectInterpretiveCandidates, evaluationHash, evaluateCandidates } from "../product-kernel/candidateEvaluation.js";
import { createOpenAIInterpretationProvider } from "../interpretation/providers/openai.js";
import { calculateConfiguredCost, configuredModelPricing } from "../interpretation/cost.js";

const router = express.Router();
router.use(correlationMiddleware);
const handle = fn => (req, res) => Promise.resolve(fn(req, res)).catch(error => { const safe = safeError(error, req.correlationId); res.status(safe.status).json(safe.body); });

async function context(req) {
  const token = parseBearer(req.get("authorization"));
  const identity = await verifyIdentity(token);
  const client = callerClient(token);
  const account = await resolveAccount(client, identity.authUserId);
  if (!account || account.status !== "active") throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  const business = await client.from("businesses").select("id,primary_market,primary_language").eq("account_id", account.id).eq("status", "active").maybeSingle();
  if (business.error) throw business.error;
  if (!business.data) throw new ProductError("BUSINESS_NOT_FOUND", "Business is not provisioned.", 404);
  return { business: business.data, admin: privilegedClient() };
}
function assertEmptyBody(req) {
  if (req.body === undefined) return;
  if (!req.body || Array.isArray(req.body) || typeof req.body !== "object" || Object.keys(req.body).length) throw new ProductError("INVALID_REQUEST", "This operation does not accept input fields.", 400);
}
const runProjection = row => ({ id: row.id, state: row.state, discovery_completeness: row.discovery_completeness, candidate_count: row.candidate_count, limitation_codes: row.limitation_codes || [], started_at: row.started_at, completed_at: row.completed_at, created_at: row.created_at, reused: false });

router.post("/api/product/decision-runs/discover", handle(async (req, res) => {
  assertEmptyBody(req);
  const { business, admin } = await context(req);
  if (!business.primary_market || !business.primary_language) throw new ProductError("BUSINESS_LOCALE_REQUIRED", "Business market and language must be established before discovery.", 409);
  const evidence = await loadDiscoveryEvidence({ admin, businessId: business.id });
  const existing = await admin.from("organic_decision_runs").select("id,state,discovery_completeness,candidate_count,limitation_codes,started_at,completed_at,created_at").match({ business_id: business.id, snapshot_fingerprint: evidence.snapshotFingerprint, input_hash: evidence.inputHash, discovery_version: DISCOVERY_VERSION, state: "discovery_complete" }).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return res.json({ ...runProjection(existing.data), reused: true });
  const inserted = await admin.from("organic_decision_runs").insert({ business_id: business.id, snapshot_fingerprint: evidence.snapshotFingerprint, input_hash: evidence.inputHash, source_references: evidence.sourceReferences, discovery_version: DISCOVERY_VERSION, correlation_id: req.correlationId, state: "pending", discovery_completeness: "empty" }).select("*").single();
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      const raced = await admin.from("organic_decision_runs").select("id,state,discovery_completeness,candidate_count,limitation_codes,started_at,completed_at,created_at").match({ business_id: business.id, snapshot_fingerprint: evidence.snapshotFingerprint, input_hash: evidence.inputHash, discovery_version: DISCOVERY_VERSION }).in("state", ["pending", "discovery_complete"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (raced.error || !raced.data) throw inserted.error;
      return res.status(raced.data.state === "pending" ? 202 : 200).json({ ...runProjection(raced.data), reused: true });
    }
    throw inserted.error;
  }
  const run = inserted.data;
  try {
    const selected = selectBoundedCandidates(discoverCandidates(evidence.packet));
    const rows = selected.candidates.map(candidate => ({ ...candidate, business_id: business.id, decision_run_id: run.id, snapshot_id: evidence.snapshotFingerprint }));
    if (rows.length) {
      const saved = await admin.from("organic_opportunity_candidates").insert(rows);
      if (saved.error) throw saved.error;
    }
    const completed = await admin.from("organic_decision_runs").update({ state: "discovery_complete", discovery_completeness: selected.completeness, limitation_codes: selected.limitations, candidate_count: rows.length, completed_at: new Date().toISOString() }).eq("id", run.id).eq("business_id", business.id).select("*").single();
    if (completed.error) throw completed.error;
    res.status(201).json({ ...runProjection(completed.data), reused: false });
  } catch (error) {
    await admin.from("organic_decision_runs").update({ state: "failed", discovery_completeness: "failed", limitation_codes: ["DISCOVERY_FAILED"], completed_at: new Date().toISOString() }).eq("id", run.id).eq("business_id", business.id);
    throw new ProductError("DISCOVERY_FAILED", "Evidence discovery could not be completed.", 503);
  }
}));

router.get("/api/product/decision-runs/:id", handle(async (req, res) => {
  const { business, admin } = await context(req);
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw new ProductError("INVALID_RUN_ID", "The decision run identifier is invalid.", 400);
  const result = await admin.from("organic_decision_runs").select("id,state,discovery_completeness,candidate_count,limitation_codes,started_at,completed_at,created_at").eq("id", req.params.id).eq("business_id", business.id).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new ProductError("DECISION_RUN_NOT_FOUND", "Decision run was not found.", 404);
  res.json({ ...runProjection(result.data), reused: undefined });
}));

router.get("/api/product/decision-runs/:id/candidates", handle(async (req, res) => {
  const { business, admin } = await context(req);
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw new ProductError("INVALID_RUN_ID", "The decision run identifier is invalid.", 400);
  const result = await admin.from("organic_opportunity_candidates").select("candidate_id,candidate_type,target_resources,allowed_target_refs,target_resource_type,discovery_sources,evidence_refs,market,language,freshness_state,completeness,limitations,candidate_status,snapshot_id,candidate_version,created_at").eq("decision_run_id", req.params.id).eq("business_id", business.id).order("created_at", { ascending: true }).limit(200);
  if (result.error) throw result.error;
  res.json({ candidates: result.data || [] });
}));

router.post("/api/product/decision-runs/:id/evaluate", handle(async (req, res) => {
  assertEmptyBody(req);
  const { business, admin } = await context(req);
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw new ProductError("INVALID_RUN_ID", "The decision run identifier is invalid.", 400);
  const runResult = await admin.from("organic_decision_runs").select("id,state,input_hash,business_id").eq("id", req.params.id).eq("business_id", business.id).maybeSingle();
  if (runResult.error) throw runResult.error;
  if (!runResult.data) throw new ProductError("DECISION_RUN_NOT_FOUND", "Decision run was not found.", 404);
  if (runResult.data.state !== "discovery_complete") throw new ProductError("DISCOVERY_NOT_COMPLETE", "The decision run is not ready for evaluation.", 409);
  const existing = await admin.from("organic_candidate_evaluation_runs").select("*").match({ business_id: business.id, decision_run_id: req.params.id, evaluation_version: SLICE_B_EVALUATION_VERSION, input_hash: runResult.data.input_hash }).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.state === "interpretation_complete") return res.json({ evaluation: projectEvaluation(existing.data), reused: true });
  const candidates = await admin.from("organic_opportunity_candidates").select("*").eq("business_id", business.id).eq("decision_run_id", req.params.id).order("candidate_identity", { ascending: true }).limit(200);
  if (candidates.error) throw candidates.error;
  const evidence = await loadDiscoveryEvidence({ admin, businessId: business.id });
  if (evidence.inputHash !== runResult.data.input_hash) throw new ProductError("EVIDENCE_CHANGED", "The selected evidence changed; rediscover before evaluation.", 409);
  let evalRun = existing.data;
  if (!evalRun) {
    const inserted = await admin.from("organic_candidate_evaluation_runs").insert({ business_id: business.id, decision_run_id: req.params.id, evaluation_version: SLICE_B_EVALUATION_VERSION, input_hash: runResult.data.input_hash, filter_version: FILTER_VERSION, interpretation_version: INTERPRETATION_VERSION, instruction_version: INSTRUCTION_VERSION, state: "pending", discovered_count: candidates.data.length, correlation_id: req.correlationId }).select("*").single();
    if (inserted.error) {
      if (inserted.error.code === "23505") {
        const raced = await admin.from("organic_candidate_evaluation_runs").select("*").match({ business_id: business.id, decision_run_id: req.params.id, evaluation_version: SLICE_B_EVALUATION_VERSION, input_hash: runResult.data.input_hash }).maybeSingle();
        if (raced.error || !raced.data) throw inserted.error;
        evalRun = raced.data;
      } else throw inserted.error;
    } else evalRun = inserted.data;
  }
  if (!evalRun) throw new ProductError("EVALUATION_FAILED", "Candidate evaluation could not be started.", 503);
  try {
    const cohort = prepareDeterministicCohort(candidates.data);
    const prepared = cohort.prepared.map(candidate => ({ candidate, filter: deterministicFilter(candidate, evidence.packet) }));
    const eligible = selectInterpretiveCandidates(prepared.filter(item => item.filter.disposition === "pass").map(item => item.candidate));
    const deterministicRows = prepared.filter(item => item.filter.disposition === "reject").map(item => ({ candidate_id: item.candidate.candidate_id, business_id: business.id, evaluation_run_id: evalRun.id, decision_run_id: req.params.id, evaluation_version: SLICE_B_EVALUATION_VERSION, deterministic_disposition: "reject", deterministic_reason_codes: item.filter.reason_codes, target_attribution_state: "not_applicable", attributed_target_resources: [], interpretation_state: "not_applicable", interpretive_disposition: "not_applicable", interpretive_reason_codes: [], evidence_refs: item.candidate.evidence_refs || [], limitations: item.candidate.limitations || [], interpretation_input_hash: evaluationHash(buildInterpretationPacket(item.candidate, evidence.packet)) }));
    deterministicRows.push(...cohort.duplicateRejections.map(item => ({ candidate_id: item.candidate.candidate_id, business_id: business.id, evaluation_run_id: evalRun.id, decision_run_id: req.params.id, evaluation_version: SLICE_B_EVALUATION_VERSION, deterministic_disposition: "reject", deterministic_reason_codes: [item.reason_code], target_attribution_state: "not_applicable", attributed_target_resources: [], interpretation_state: "not_applicable", interpretive_disposition: "not_applicable", interpretive_reason_codes: [], evidence_refs: item.candidate.evidence_refs || [], limitations: item.candidate.limitations || [], interpretation_input_hash: evaluationHash(buildInterpretationPacket(item.candidate, evidence.packet)) })));
    deterministicRows.push(...eligible.boundedOut.map(candidate => ({ candidate_id: candidate.candidate_id, business_id: business.id, evaluation_run_id: evalRun.id, decision_run_id: req.params.id, evaluation_version: SLICE_B_EVALUATION_VERSION, deterministic_disposition: "bounded_out", deterministic_reason_codes: [], target_attribution_state: "not_applicable", attributed_target_resources: [], interpretation_state: "not_applicable", interpretive_disposition: "not_applicable", interpretive_reason_codes: [], evidence_refs: candidate.evidence_refs || [], limitations: ["interpretation_candidate_cap_hit"], interpretation_input_hash: evaluationHash(buildInterpretationPacket(candidate, evidence.packet)) })));
    if (deterministicRows.length) { const savedPreparation = await admin.from("organic_candidate_evaluations").upsert(deterministicRows, { onConflict: "evaluation_run_id,candidate_id" }); if (savedPreparation.error) throw savedPreparation.error; }
    const filterCheckpoint = await admin.from("organic_candidate_evaluation_runs").update({ state: "filter_complete", deterministic_rejected_count: prepared.filter(item => item.filter.disposition === "reject").length + cohort.duplicateRejections.length, post_filter_count: eligible.selected.length + eligible.boundedOut.length, bounded_out_count: eligible.boundedOut.length, limitation_codes: eligible.partial ? ["interpretation_candidate_cap_hit"] : [] }).eq("id", evalRun.id).in("state", ["pending", "failed"]);
    if (filterCheckpoint.error) throw filterCheckpoint.error;
    const batches = [];
    const ownedBatchClaims = new Map();
    for (let offset = 0; offset < eligible.selected.length; offset += 10) {
      const ids = eligible.selected.slice(offset, offset + 10); batches.push({ business_id: business.id, evaluation_run_id: evalRun.id, batch_index: batches.length, candidate_ids: ids.map(item => item.candidate_id), input_hash: buildBatchIdentity({ candidates: ids, packet: evidence.packet }), state: "pending" });
    }
    for (const batch of batches) { const batchInsert = await admin.from("organic_candidate_interpretation_batches").insert(batch); if (batchInsert.error && batchInsert.error.code !== "23505") throw batchInsert.error; }
    const provider = createOpenAIInterpretationProvider();
    const result = await evaluateCandidates({ candidates: candidates.data, packet: evidence.packet, interpretationProvider: provider,
      resolveBatch: async ({ batch, batchIndex, inputHash }) => {
        let found = await admin.from("organic_candidate_interpretation_batches").select("*").eq("evaluation_run_id", evalRun.id).eq("batch_index", batchIndex).eq("input_hash", inputHash).maybeSingle();
        if (found.error) throw found.error;
        if (!found.data) { const insertedBatch = await admin.from("organic_candidate_interpretation_batches").insert({ business_id: business.id, evaluation_run_id: evalRun.id, batch_index: batchIndex, candidate_ids: batch.map(c => c.candidate_id), input_hash: inputHash, state: "pending" }).select("*").single(); if (insertedBatch.error && insertedBatch.error.code !== "23505") throw insertedBatch.error; found = insertedBatch.error ? await admin.from("organic_candidate_interpretation_batches").select("*").eq("evaluation_run_id", evalRun.id).eq("batch_index", batchIndex).eq("input_hash", inputHash).single() : insertedBatch; }
        if (found.error) throw found.error;
        if (found.data.state === "complete") { const saved = await admin.from("organic_candidate_evaluations").select("*").eq("evaluation_run_id", evalRun.id).in("candidate_id", batch.map(c => c.candidate_id)); if (saved.error) throw saved.error; if ((saved.data || []).length === batch.length) return { reused: true, response: { provider: found.data.provider, model: found.data.model, response_id: found.data.response_id, usage: { prompt_tokens: found.data.input_tokens, completion_tokens: found.data.output_tokens }, output: saved.data } }; }
        if (ownedBatchClaims.get(batchIndex)?.claimToken === found.data.claim_token) return null;
        const claimToken = randomUUID(); const claim = await admin.rpc("claim_candidate_interpretation_batch", { p_batch_id: found.data.id, p_claim_token: claimToken, p_timeout_seconds: 300 }); if (claim.error) throw claim.error; if (!claim.data) return { pending: true }; const started = await admin.rpc("record_candidate_interpretation_attempt", { p_batch_id: found.data.id, p_claim_token: claimToken }); if (started.error || !started.data) throw started.error || new Error("BATCH_ATTEMPT_CLAIM_FAILED"); ownedBatchClaims.set(batchIndex, { claimToken, batchId: found.data.id }); return null;
      },
      onBatchComplete: async ({ batchIndex, inputHash, response, rows }) => {
        const candidateById = new Map(candidates.data.map(candidate => [String(candidate.candidate_id), candidate])); const savedRows = rows.map(row => ({ ...row, business_id: business.id, evaluation_run_id: evalRun.id, decision_run_id: req.params.id, evaluation_version: SLICE_B_EVALUATION_VERSION, attributed_target_resources: row.attributed_target_resources || [], evidence_refs: candidateById.get(String(row.candidate_id))?.evidence_refs || [], interpretation_input_hash: candidateById.has(String(row.candidate_id)) ? evaluationHash(buildInterpretationPacket(candidateById.get(String(row.candidate_id)), evidence.packet)) : null, model_provider: response.provider || "openai", model_name: response.model || provider.model, instruction_version: INSTRUCTION_VERSION, provider_response_id: response.response_id || null, input_tokens: Number(response.usage?.prompt_tokens || response.usage?.input_tokens || 0), output_tokens: Number(response.usage?.completion_tokens || response.usage?.output_tokens || 0), limitations: row.limitations || [], overlap_group_id: row.overlap_group_id || null }));
        const claim = ownedBatchClaims.get(batchIndex); const batchInputTokens = Number(response.usage?.prompt_tokens || response.usage?.input_tokens || 0); const batchOutputTokens = Number(response.usage?.completion_tokens || response.usage?.output_tokens || 0); const batchCost = calculateConfiguredCost({ inputTokens: batchInputTokens, outputTokens: batchOutputTokens, pricing: configuredModelPricing(process.env, response.model || provider.model) });
        const completedBatch = await admin.rpc("complete_candidate_interpretation_batch", { p_batch_id: claim.batchId, p_claim_token: claim.claimToken, p_provider: response.provider || "openai", p_model: response.model || provider.model, p_response_id: response.response_id || null, p_input_tokens: batchInputTokens, p_output_tokens: batchOutputTokens, p_cost_usd: batchCost.cost_usd, p_cost_status: batchCost.cost_status, p_rows: savedRows }); if (completedBatch.error || !completedBatch.data) throw completedBatch.error || new Error("BATCH_ATOMIC_COMPLETION_FAILED");
      },
      onBatchFailure: async ({ batchIndex, error }) => { const claim = ownedBatchClaims.get(batchIndex); if (claim) await admin.rpc("record_candidate_interpretation_failure", { p_batch_id: claim.batchId, p_claim_token: claim.claimToken, p_error_code: String(error?.code || error?.message || "PROVIDER_FAILURE").replace(/[^A-Z0-9_]/gi, "_").slice(0, 80) }); },
      onRetry: async () => { const claimedRetry = await admin.from("organic_candidate_evaluation_runs").update({ retry_used: true }).eq("id", evalRun.id).eq("retry_used", false).select("id"); return !claimedRetry.error && (claimedRetry.data || []).length === 1; }
    });
    const pricing = configuredModelPricing(process.env, result.modelName);
    const cost = calculateConfiguredCost({ inputTokens: result.inputTokens, outputTokens: result.outputTokens, pricing });
    const accounting = await admin.from("organic_candidate_interpretation_batches").select("request_attempts,input_tokens,output_tokens,estimated_cost_usd,cost_status").eq("evaluation_run_id", evalRun.id);
    if (accounting.error) throw accounting.error;
    const durableAttempts = (accounting.data || []).reduce((sum, row) => sum + Number(row.request_attempts || 0), 0); const durableInputTokens = (accounting.data || []).reduce((sum, row) => sum + Number(row.input_tokens || 0), 0); const durableOutputTokens = (accounting.data || []).reduce((sum, row) => sum + Number(row.output_tokens || 0), 0); const durableCost = (accounting.data || []).every(row => row.cost_status === "calculated_from_explicit_configuration") ? (accounting.data || []).reduce((sum, row) => sum + Number(row.estimated_cost_usd || 0), 0) : null; const durableCostStatus = durableCost === null ? "unknown" : "calculated_from_explicit_configuration";
    const candidateById = new Map(candidates.data.map(candidate => [candidate.candidate_id, candidate]));
    const rows = result.rows.map(row => ({ ...row, business_id: business.id, evaluation_run_id: evalRun.id, decision_run_id: req.params.id, evaluation_version: SLICE_B_EVALUATION_VERSION, attributed_target_resources: row.attributed_target_resources || [], evidence_refs: candidateById.get(row.candidate_id)?.evidence_refs || [], interpretation_input_hash: candidateById.has(row.candidate_id) ? evaluationHash(buildInterpretationPacket(candidateById.get(row.candidate_id), evidence.packet)) : null, model_provider: result.modelProvider, model_name: result.modelName, instruction_version: INSTRUCTION_VERSION, limitations: row.limitations || [], overlap_group_id: row.overlap_group_id || null }));
    if (rows.length) { const saved = await admin.from("organic_candidate_evaluations").upsert(rows, { onConflict: "evaluation_run_id,candidate_id" }); if (saved.error) throw saved.error; }
    for (const row of result.rows) {
      const status = row.deterministic_disposition === "reject" || ["reject_mismatch", "reject_wrong_page_type"].includes(row.interpretive_disposition) ? "rejected" : row.interpretation_state === "complete" ? "interpreted" : row.deterministic_disposition === "pass" ? "eligible" : "discovered";
      const update = await admin.from("organic_opportunity_candidates").update({ candidate_status: status, rejection_reason_codes: row.deterministic_reason_codes?.length ? row.deterministic_reason_codes : row.interpretive_reason_codes || [], overlap_group_id: row.overlap_group_id || null, evaluated_at: row.interpretation_state === "complete" ? new Date().toISOString() : null }).eq("candidate_id", row.candidate_id).eq("business_id", business.id).eq("decision_run_id", req.params.id);
      if (update.error) throw update.error;
    }
    const completed = await admin.from("organic_candidate_evaluation_runs").update({ state: "interpretation_complete", deterministic_rejected_count: result.deterministicRejectedCount, post_filter_count: result.postFilterCount, bounded_out_count: result.boundedOutCount, interpreted_count: result.interpretedCount, interpretive_rejected_count: result.interpretiveRejectedCount, model_provider: result.modelProvider, model_name: result.modelName, model_request_attempts: durableAttempts, input_tokens: durableInputTokens, output_tokens: durableOutputTokens, retry_used: result.retryUsed, estimated_cost_usd: durableCost, cost_status: durableCostStatus, limitation_codes: result.limitations, completed_at: new Date().toISOString() }).eq("id", evalRun.id).select("*").single();
    if (completed.error) throw completed.error;
    res.status(201).json({ evaluation: projectEvaluation(completed.data), reused: false });
  } catch (error) {
    if (error?.code === "BATCH_PENDING") return res.status(202).json({ evaluation: { id: evalRun.id, state: "pending" }, pending: true });
    await admin.from("organic_candidate_evaluation_runs").update({ state: "failed", limitation_codes: [error.code === "INTERPRETATION_PROVIDER_UNAVAILABLE" ? "MODEL_UNAVAILABLE" : "EVALUATION_FAILED"], completed_at: new Date().toISOString() }).eq("id", evalRun.id);
    if (error?.code === "BUSINESS_LOCALE_REQUIRED" || error?.message === "BUSINESS_LOCALE_REQUIRED") throw new ProductError("BUSINESS_LOCALE_REQUIRED", "Business market and language must be established before evaluation.", 409);
    throw new ProductError("EVALUATION_FAILED", "Candidate evaluation could not be completed.", 503);
  }
}));

router.get("/api/product/decision-runs/:id/evaluation", handle(async (req, res) => {
  const { business, admin } = await context(req);
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw new ProductError("INVALID_RUN_ID", "The decision run identifier is invalid.", 400);
  const result = await admin.from("organic_candidate_evaluation_runs").select("*").eq("decision_run_id", req.params.id).eq("business_id", business.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new ProductError("EVALUATION_NOT_FOUND", "Candidate evaluation was not found.", 404);
  res.json({ evaluation: projectEvaluation(result.data) });
}));

router.get("/api/product/decision-runs/:id/evaluations/candidates", handle(async (req, res) => {
  const { business, admin } = await context(req);
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw new ProductError("INVALID_RUN_ID", "The decision run identifier is invalid.", 400);
  const result = await admin.from("organic_candidate_evaluations").select("id,candidate_id,deterministic_disposition,deterministic_reason_codes,overlap_group_id,target_attribution_state,attributed_target_resources,customer_job,intent_class,intent_confidence,page_type_fit,relevance_state,new_asset_fit,interpretation_state,interpretive_disposition,interpretive_reason_codes,limitations").eq("decision_run_id", req.params.id).eq("business_id", business.id).limit(200);
  if (result.error) throw result.error;
  res.json({ evaluations: result.data || [] });
}));

const projectEvaluation = row => ({ id: row.id, state: row.state, discovered_count: row.discovered_count, deterministic_rejected_count: row.deterministic_rejected_count, post_filter_count: row.post_filter_count, bounded_out_count: row.bounded_out_count, interpreted_count: row.interpreted_count, interpretive_rejected_count: row.interpretive_rejected_count, overlap_group_count: row.overlap_group_count, model_provider: row.model_provider, model_name: row.model_name, model_request_attempts: row.model_request_attempts, input_tokens: row.input_tokens, output_tokens: row.output_tokens, limitation_codes: row.limitation_codes || [], cost_status: row.cost_status || "unknown", estimated_cost_usd: row.estimated_cost_usd ?? null, started_at: row.started_at, completed_at: row.completed_at, created_at: row.created_at });

export default router;
