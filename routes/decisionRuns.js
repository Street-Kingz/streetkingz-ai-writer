import express from "express";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { privilegedClient } from "../product-kernel/privileged.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { correlationMiddleware } from "../product-kernel/correlation.js";
import { loadDiscoveryEvidence } from "../product-kernel/decisionEvidenceAdapter.js";
import { DISCOVERY_VERSION, discoverCandidates, selectBoundedCandidates } from "../product-kernel/decisionDiscovery.js";
import { SLICE_B_EVALUATION_VERSION, FILTER_VERSION, INTERPRETATION_VERSION, INSTRUCTION_VERSION, evaluationHash, evaluateCandidates } from "../product-kernel/candidateEvaluation.js";
import { createOpenAIInterpretationProvider } from "../interpretation/providers/openai.js";

const router = express.Router();
router.use(correlationMiddleware);
const handle = fn => (req, res) => Promise.resolve(fn(req, res)).catch(error => { const safe = safeError(error, req.correlationId); res.status(safe.status).json(safe.body); });

async function context(req) {
  const token = parseBearer(req.get("authorization"));
  const identity = await verifyIdentity(token);
  const client = callerClient(token);
  const account = await resolveAccount(client, identity.authUserId);
  if (!account || account.status !== "active") throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  const business = await client.from("businesses").select("id").eq("account_id", account.id).eq("status", "active").maybeSingle();
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
  const result = await admin.from("organic_opportunity_candidates").select("candidate_id,candidate_type,target_resources,target_resource_type,discovery_sources,evidence_refs,market,language,freshness_state,completeness,limitations,candidate_status,snapshot_id,candidate_version,created_at").eq("decision_run_id", req.params.id).eq("business_id", business.id).order("created_at", { ascending: true }).limit(200);
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
    const provider = createOpenAIInterpretationProvider();
    const result = await evaluateCandidates({ candidates: candidates.data, packet: evidence.packet, interpretationProvider: provider });
    const candidateById = new Map(candidates.data.map(candidate => [candidate.candidate_id, candidate]));
    const rows = result.rows.map(row => ({ ...row, business_id: business.id, evaluation_run_id: evalRun.id, decision_run_id: req.params.id, evaluation_version: SLICE_B_EVALUATION_VERSION, attributed_target_resources: row.attributed_target_resources || [], evidence_refs: candidateById.get(row.candidate_id)?.evidence_refs || [], interpretation_input_hash: candidateById.has(row.candidate_id) ? evaluationHash(candidateById.get(row.candidate_id)) : null, model_provider: result.modelProvider, model_name: result.modelName, instruction_version: INSTRUCTION_VERSION, limitations: row.limitations || [], overlap_group_id: row.overlap_group_id || null }));
    if (rows.length) { const saved = await admin.from("organic_candidate_evaluations").upsert(rows, { onConflict: "evaluation_run_id,candidate_id" }); if (saved.error) throw saved.error; }
    for (const row of result.rows) {
      const status = row.deterministic_disposition === "reject" || ["reject_mismatch", "reject_wrong_page_type"].includes(row.interpretive_disposition) ? "rejected" : row.interpretation_state === "complete" ? "interpreted" : row.deterministic_disposition === "pass" ? "eligible" : "discovered";
      const update = await admin.from("organic_opportunity_candidates").update({ candidate_status: status, rejection_reason_codes: row.deterministic_reason_codes?.length ? row.deterministic_reason_codes : row.interpretive_reason_codes || [], overlap_group_id: row.overlap_group_id || null, evaluated_at: row.interpretation_state === "complete" ? new Date().toISOString() : null }).eq("candidate_id", row.candidate_id).eq("business_id", business.id).eq("decision_run_id", req.params.id);
      if (update.error) throw update.error;
    }
    const completed = await admin.from("organic_candidate_evaluation_runs").update({ state: "interpretation_complete", deterministic_rejected_count: result.deterministicRejectedCount, post_filter_count: result.postFilterCount, bounded_out_count: result.boundedOutCount, interpreted_count: result.interpretedCount, interpretive_rejected_count: result.interpretiveRejectedCount, model_provider: result.modelProvider, model_name: result.modelName, model_request_attempts: result.modelRequestAttempts, input_tokens: result.inputTokens, output_tokens: result.outputTokens, limitation_codes: result.limitations, completed_at: new Date().toISOString() }).eq("id", evalRun.id).select("*").single();
    if (completed.error) throw completed.error;
    res.status(201).json({ evaluation: projectEvaluation(completed.data), reused: false });
  } catch (error) {
    await admin.from("organic_candidate_evaluation_runs").update({ state: "failed", limitation_codes: [error.code === "INTERPRETATION_PROVIDER_UNAVAILABLE" ? "MODEL_UNAVAILABLE" : "EVALUATION_FAILED"], completed_at: new Date().toISOString() }).eq("id", evalRun.id);
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

const projectEvaluation = row => ({ id: row.id, state: row.state, discovered_count: row.discovered_count, deterministic_rejected_count: row.deterministic_rejected_count, post_filter_count: row.post_filter_count, bounded_out_count: row.bounded_out_count, interpreted_count: row.interpreted_count, interpretive_rejected_count: row.interpretive_rejected_count, overlap_group_count: row.overlap_group_count, model_provider: row.model_provider, model_name: row.model_name, model_request_attempts: row.model_request_attempts, input_tokens: row.input_tokens, output_tokens: row.output_tokens, limitation_codes: row.limitation_codes || [], cost_status: "unknown", started_at: row.started_at, completed_at: row.completed_at, created_at: row.created_at });

export default router;
