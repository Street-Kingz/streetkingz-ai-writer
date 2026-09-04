import express from "express";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { privilegedClient } from "../product-kernel/privileged.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { correlationMiddleware } from "../product-kernel/correlation.js";
import { loadDiscoveryEvidence } from "../product-kernel/decisionEvidenceAdapter.js";
import { DISCOVERY_VERSION, discoverCandidates, selectBoundedCandidates } from "../product-kernel/decisionDiscovery.js";

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
  if (!req.body || Array.isArray(req.body) || typeof req.body !== "object" || Object.keys(req.body).length) throw new ProductError("INVALID_REQUEST", "Discovery does not accept input fields.", 400);
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

export default router;
