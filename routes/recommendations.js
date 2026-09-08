import express from "express";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { privilegedClient } from "../product-kernel/privileged.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { correlationMiddleware } from "../product-kernel/correlation.js";
import { persistRecommendationRecords, feedProjection, detailProjection } from "../product-kernel/recommendationRepository.js";

const router = express.Router(); router.use(correlationMiddleware);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const handle = fn => (req, res) => Promise.resolve(fn(req, res)).catch(error => { const safe = safeError(error, req.correlationId); res.status(safe.status).json(safe.body); });
async function context(req) {
  const token = parseBearer(req.get("authorization")); const identity = await verifyIdentity(token); const client = callerClient(token); const account = await resolveAccount(client, identity.authUserId);
  if (!account || account.status !== "active") throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  const business = await client.from("businesses").select("id").eq("account_id", account.id).eq("status", "active").maybeSingle(); if (business.error) throw business.error; if (!business.data) throw new ProductError("BUSINESS_NOT_FOUND", "Business is not provisioned.", 404);
  return { business: business.data, admin: privilegedClient() };
}
async function targetOptions(admin, businessId) {
  const [products, categories] = await Promise.all([admin.from("commerce_products").select("id,source_id,name").eq("business_id", businessId).limit(500), admin.from("commerce_categories").select("id,source_id,name").eq("business_id", businessId).limit(500)]);
  if (products.error) throw products.error; if (categories.error) throw categories.error; return { products: products.data || [], categories: categories.data || [] };
}

router.post("/api/product/decision-runs/:id/recommendations", handle(async (req, res) => {
  const { business, admin } = await context(req); if (!UUID.test(req.params.id)) throw new ProductError("INVALID_RUN_ID", "The decision run identifier is invalid.", 400);
  const evaluation = await admin.from("organic_candidate_evaluation_runs").select("id,state").eq("business_id", business.id).eq("decision_run_id", req.params.id).eq("state", "interpretation_complete").maybeSingle(); if (evaluation.error) throw evaluation.error; if (!evaluation.data) throw new ProductError("EVALUATION_NOT_COMPLETE", "A complete evaluated run is required.", 409);
  const candidates = await admin.from("organic_opportunity_candidates").select("*").eq("business_id", business.id).eq("decision_run_id", req.params.id).limit(200); const evaluations = await admin.from("organic_candidate_evaluations").select("*").eq("business_id", business.id).eq("decision_run_id", req.params.id).limit(200); if (candidates.error) throw candidates.error; if (evaluations.error) throw evaluations.error;
  const byCandidate = new Map((evaluations.data || []).map(row => [String(row.candidate_id), row])); const merged = (candidates.data || []).map(candidate => ({ ...candidate, ...(byCandidate.get(String(candidate.candidate_id)) || {}), candidate_identity: candidate.candidate_identity || String(candidate.candidate_id), evidence_refs: byCandidate.get(String(candidate.candidate_id))?.evidence_refs || candidate.evidence_refs || [] }));
  const result = await persistRecommendationRecords({ admin, businessId: business.id, runId: req.params.id, candidates: merged }); res.status(201).json({ recommendations: feedProjection(result.records, await targetOptions(admin, business.id)), outcomes: result.outcomes, development_only: true });
}));

router.get("/api/product/recommendations", handle(async (req, res) => { const { business, admin } = await context(req); const result = await admin.from("organic_recommendations").select("*").eq("business_id", business.id).in("status", ["current", "deferred", "needs_reassessment"]).limit(200); if (result.error) throw result.error; res.json({ recommendations: feedProjection(result.data || [], await targetOptions(admin, business.id)), development_only: true }); }));
router.get("/api/product/recommendations/:id", handle(async (req, res) => { const { business, admin } = await context(req); const result = await admin.from("organic_recommendations").select("*").eq("business_id", business.id).eq("recommendation_id", req.params.id).maybeSingle(); if (result.error) throw result.error; if (!result.data) throw new ProductError("RECOMMENDATION_NOT_FOUND", "Recommendation was not found.", 404); res.json({ recommendation: detailProjection(result.data, await targetOptions(admin, business.id)), development_only: true }); }));

export default router;
