import express from "express";
import { parseBearer, verifyIdentity, callerClient } from "../product-kernel/auth.js";
import { resolveAccount } from "../product-kernel/repository.js";
import { ProductError, safeError } from "../product-kernel/errors.js";
import { correlationMiddleware } from "../product-kernel/correlation.js";

const router = express.Router();
router.use(correlationMiddleware);

async function context(req) {
  const token = parseBearer(req.get("authorization"));
  const identity = await verifyIdentity(token);
  const client = callerClient(token);
  const account = await resolveAccount(client, identity.authUserId);
  if (!account || account.status !== "active") throw new ProductError("TENANT_NOT_FOUND", "Product account is not provisioned.", 404);
  return { client, account };
}

function handle(next) {
  return (req, res) => Promise.resolve(next(req, res)).catch(error => {
    const safe = safeError(error, req.correlationId);
    res.status(safe.status).json(safe.body);
  });
}

router.get("/api/product/organic-evidence/status", handle(async (req, res) => {
  const { client, account } = await context(req);
  const businesses = await client.from("businesses").select("id").eq("account_id", account.id).eq("status", "active");
  if (businesses.error) throw businesses.error;
  const businessIds = (businesses.data || []).map(row => row.id);
  if (!businessIds.length) return res.json({ sources: [] });
  const result = await client.from("organic_evidence_sources")
    .select("source_kind,source_class,provider_id,evidence_state,last_attempted_at,last_successful_at,evidence_as_of,current_complete_run,active_run")
    .in("business_id", businessIds)
    .order("source_kind", { ascending: true });
  if (result.error) throw result.error;
  res.json({ sources: (result.data || []).map(source => ({
    source_kind: source.source_kind,
    source_class: source.source_class,
    provider_id: source.provider_id,
    evidence_state: source.evidence_state,
    last_attempted_at: source.last_attempted_at,
    last_successful_at: source.last_successful_at,
    evidence_as_of: source.evidence_as_of,
    has_current_complete_evidence: Boolean(source.current_complete_run),
    current_completeness_state: source.current_complete_run ? "complete" : null,
    collecting: Boolean(source.active_run)
  })) });
}));

export default router;
