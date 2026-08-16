import { readFile } from "node:fs/promises";
import { sha256, stableId } from "../research/core/canonical.js";
import { assertValidBusinessIntelligenceObject } from "../business-intelligence/validation.js";
import { createEditorialIntelligenceContext, validateEditorialIntelligenceContext } from "../editorial-intelligence/context.js";
import { assertValidProductIntelligenceObject } from "../product-intelligence/validation.js";
import {
  bindCreateSeoArticleStageResult,
  canonicalCreateSeoArticleProductUrl,
  createSeoArticleRunPlan,
  pauseCreateSeoArticleRun,
  stageResultEnvelope
} from "./createSeoArticle.js";

export class CreateSeoArticleIntelligencePause extends Error {
  constructor(details) { super(details.message); this.name = "CreateSeoArticleIntelligencePause"; this.code = "INTELLIGENCE_PAUSED"; Object.assign(this, details); }
}

export class CreateSeoArticleIntelligenceFailure extends Error {
  constructor(message, details = {}) { super(message); this.name = "CreateSeoArticleIntelligenceFailure"; this.code = "INTELLIGENCE_INVALID"; Object.assign(this, details); }
}

function businessHostname(productUrl) { return new URL(productUrl).hostname.toLowerCase(); }

function candidateArtifact(candidate, kind) {
  if (!candidate || typeof candidate !== "object" || !candidate.artifact || typeof candidate.artifact !== "object") throw new CreateSeoArticleIntelligenceFailure(`The ${kind} intelligence candidate is malformed.`, { failure_reason: "malformed_artifact" });
  const actualHash = sha256(candidate.artifact);
  if (candidate.artifact_sha256 && candidate.artifact_sha256 !== actualHash) throw new CreateSeoArticleIntelligenceFailure(`The ${kind} intelligence artifact hash does not match its contents.`, { failure_reason: "artifact_hash_mismatch" });
  return { ...candidate, artifact_sha256: actualHash, reference: candidate.reference || candidate.artifact.metadata?.object_id || stableId(`${kind}_artifact`, candidate.artifact) };
}

function unwrapProduct(candidate) { return candidate.artifact.product_intelligence_object || candidate.artifact; }
function unwrapBusiness(candidate) { return candidate.artifact.business_intelligence_object || candidate.artifact; }

function matchingProduct(candidate, productUrl) {
  const pio = unwrapProduct(candidate);
  return pio.metadata?.product_url && canonicalCreateSeoArticleProductUrl(pio.metadata.product_url) === productUrl;
}

function matchingBusiness(candidate, hostname) {
  const bio = unwrapBusiness(candidate);
  try { return new URL(bio.metadata?.primary_domain).hostname.toLowerCase() === hostname && typeof bio.metadata?.business_id === "string"; }
  catch { return false; }
}

function chooseCandidate(candidates, kind, matches) {
  if (!Array.isArray(candidates)) throw new CreateSeoArticleIntelligenceFailure(`The ${kind} candidate set is malformed.`, { failure_reason: "malformed_candidates" });
  for (const candidate of candidates) candidateArtifact(candidate, kind);
  const validIdentity = candidates.filter(matches);
  if (validIdentity.length > 1) throw new CreateSeoArticleIntelligenceFailure(`Multiple matching ${kind} intelligence artifacts were supplied.`, { failure_reason: "ambiguous_artifacts" });
  if (validIdentity.length === 1) return candidateArtifact(validIdentity[0], kind);
  const identityCandidates = candidates.filter((candidate) => {
    try { return kind === "product" ? Boolean(unwrapProduct(candidate)?.metadata?.product_url) : Boolean(unwrapBusiness(candidate)?.metadata?.business_id); }
    catch { return false; }
  });
  if (candidates.length && identityCandidates.length === 0) throw new CreateSeoArticleIntelligenceFailure(`The ${kind} intelligence artifact has no usable identity.`, { failure_reason: "malformed_artifact" });
  if (identityCandidates.length) {
    const structurallyValid = identityCandidates.map((candidate) => candidateArtifact(candidate, kind));
    const unvalidated = structurallyValid.some((candidate) => (kind === "product" ? unwrapProduct(candidate) : unwrapBusiness(candidate)).validation_status !== "validated");
    if (unvalidated) throw new CreateSeoArticleIntelligencePause({ reason: "awaiting_validation", required_stage: kind === "product" ? "product_understanding" : "business_understanding", message: `Validated ${kind === "product" ? "Product" : "Business"} Intelligence does not exist for this ${kind === "product" ? "product" : "merchant"}.`, next_action: `Complete required ${kind === "product" ? "product" : "business"} validation before continuing.` });
    throw new CreateSeoArticleIntelligenceFailure(`The ${kind} intelligence identity does not match the workflow input.`, { failure_reason: "identity_mismatch" });
  }
  throw new CreateSeoArticleIntelligencePause({ reason: "intelligence_unavailable", required_stage: kind === "product" ? "product_understanding" : "business_understanding", message: `Validated ${kind === "product" ? "Product" : "Business"} Intelligence does not exist for this ${kind === "product" ? "product" : "merchant"}.`, next_action: `Run the approved ${kind === "product" ? "Product" : "Business"} Intelligence collection and validation path.` });
}

async function readCandidatesFromFiles(files = {}) {
  const load = async (file, reference) => ({ artifact: JSON.parse(await readFile(file, "utf8")), reference });
  return {
    productCandidates: files.product ? [await load(files.product, files.product)] : [],
    businessCandidates: files.business ? [await load(files.business, files.business)] : [],
    contextCandidates: files.context ? [await load(files.context, files.context)] : []
  };
}

export function createFileCreateSeoArticleIntelligenceResolver(files = {}) {
  return async () => readCandidatesFromFiles(files);
}

export async function resolveCreateSeoArticleIntelligence({ productUrl, resolveCandidates = async () => ({ productCandidates: [], businessCandidates: [], contextCandidates: [] }), now = () => new Date().toISOString() }) {
  const canonicalUrl = canonicalCreateSeoArticleProductUrl(productUrl);
  const candidates = await resolveCandidates({ productUrl: canonicalUrl, businessHostname: businessHostname(canonicalUrl) });
  const product = chooseCandidate(candidates.productCandidates, "product", (candidate) => matchingProduct(candidate, canonicalUrl));
  let pio;
  try { pio = unwrapProduct(product); assertValidProductIntelligenceObject(pio); }
  catch (error) { throw new CreateSeoArticleIntelligenceFailure(`Product Intelligence failed validation: ${error.message}`, { failure_reason: "invalid_product_intelligence", cause: error }); }
  if (pio.validation_status !== "validated") throw new CreateSeoArticleIntelligencePause({ reason: "awaiting_validation", required_stage: "product_understanding", message: "Validated Product Intelligence does not exist for this product.", next_action: "Complete Product Intelligence validation before continuing." });

  let business;
  try {
    business = chooseCandidate(candidates.businessCandidates, "business", (candidate) => matchingBusiness(candidate, businessHostname(canonicalUrl)));
  } catch (error) {
    if (error instanceof CreateSeoArticleIntelligencePause) {
      error.partial_product = { ...product, object_id: pio.metadata.object_id, product_url: pio.metadata.product_url, source_fingerprint: pio.metadata.source_fingerprint, validation_status: pio.validation_status };
    }
    throw error;
  }
  let bio;
  try { bio = unwrapBusiness(business); assertValidBusinessIntelligenceObject(bio); }
  catch (error) { throw new CreateSeoArticleIntelligenceFailure(`Business Intelligence failed validation: ${error.message}`, { failure_reason: "invalid_business_intelligence", cause: error }); }
  if (bio.validation_status !== "validated") {
    const pause = new CreateSeoArticleIntelligencePause({ reason: "awaiting_validation", required_stage: "business_understanding", message: "Validated Business Intelligence does not exist for this merchant.", next_action: "Complete Business Intelligence validation before continuing." });
    pause.partial_product = { ...product, object_id: pio.metadata.object_id, product_url: pio.metadata.product_url, source_fingerprint: pio.metadata.source_fingerprint, validation_status: pio.validation_status };
    throw pause;
  }

  const contextCandidates = Array.isArray(candidates.contextCandidates) ? candidates.contextCandidates : [];
  const suppliedContext = contextCandidates.filter((candidate) => candidate?.artifact?.metadata?.business_id === bio.metadata.business_id && candidate?.artifact?.metadata?.product_object_id === pio.metadata.object_id);
  if (suppliedContext.length > 1) throw new CreateSeoArticleIntelligenceFailure("Multiple matching Editorial Intelligence Context artifacts were supplied.", { failure_reason: "ambiguous_artifacts" });
  if (contextCandidates.length && suppliedContext.length === 0) throw new CreateSeoArticleIntelligenceFailure("The Editorial Intelligence Context identity does not match the workflow intelligence.", { failure_reason: "identity_mismatch" });
  let context;
  let contextReference;
  let contextHash;
  if (suppliedContext.length === 1) {
    const candidate = candidateArtifact(suppliedContext[0], "editorial context");
    context = candidate.artifact;
    const errors = validateEditorialIntelligenceContext(context);
    if (errors.length) throw new CreateSeoArticleIntelligenceFailure(`Editorial Intelligence Context failed validation: ${errors.join("; ")}`, { failure_reason: "invalid_editorial_context" });
    contextReference = candidate.reference;
    contextHash = candidate.artifact_sha256;
  } else {
    try { context = createEditorialIntelligenceContext({ businessIntelligence: bio, productIntelligence: pio, createdAt: typeof now === "function" ? now() : now }); }
    catch (error) { throw new CreateSeoArticleIntelligenceFailure(`Editorial Intelligence Context failed validation: ${error.message}`, { failure_reason: "invalid_editorial_context", cause: error }); }
    contextReference = context.metadata.context_id;
    contextHash = sha256(context);
  }
  const intelligence = {
    product: { reference: product.reference, artifact_sha256: product.artifact_sha256, object_id: pio.metadata.object_id, product_url: pio.metadata.product_url, source_fingerprint: pio.metadata.source_fingerprint, validation_status: pio.validation_status },
    business: { reference: business.reference, artifact_sha256: business.artifact_sha256, object_id: bio.metadata.object_id, business_id: bio.metadata.business_id, primary_domain: bio.metadata.primary_domain, source_fingerprint: bio.metadata.source_fingerprint, validation_status: bio.validation_status },
    context: { reference: contextReference, artifact_sha256: contextHash, context_id: context.metadata.context_id, business_id: context.metadata.business_id, product_object_id: context.metadata.product_object_id, schema_version: context.metadata.schema_version, validation_status: "validated" },
    objects: { pio, bio, context }
  };
  return intelligence;
}

export async function runCreateSeoArticleM2({ input, resolveCandidates, now = () => new Date().toISOString() }) {
  let plan = createSeoArticleRunPlan(input);
  let intelligence;
  try { intelligence = await resolveCreateSeoArticleIntelligence({ productUrl: plan.workflow_input.product_url, resolveCandidates, now }); }
  catch (error) {
    if (error instanceof CreateSeoArticleIntelligencePause) {
      if (error.required_stage === "business_understanding" && error.partial_product) {
        plan = bindCreateSeoArticleStageResult(plan, {
          ...stageResultEnvelope(plan, { artifactId: error.partial_product.object_id, artifactSha256: error.partial_product.artifact_sha256 }),
          provenance: { product: error.partial_product }
        });
      }
      const pause = { reason: error.reason, requiredStage: error.required_stage, message: error.message, nextAction: error.next_action };
      return { plan: pauseCreateSeoArticleRun(plan, pause), status: "paused", pause: { reason: error.reason, required_stage: error.required_stage, message: error.message, next_action: error.next_action } };
    }
    if (error.code === "INVALID_WORKFLOW_INPUT" || error.code === "OBJECTIVE_CHANGE_REJECTED") throw error;
    plan.state = "failed";
    plan.current_stage = null;
    plan.failure = { code: error.failure_reason || "INTELLIGENCE_INVALID", message: error.message };
    for (const stage of plan.stages) if (["ready", "pending"].includes(stage.state)) { stage.state = stage.sequence === 1 ? "failed" : "blocked"; stage.failure = { code: stage.sequence === 1 ? plan.failure.code : "UPSTREAM_STAGE_FAILED" }; }
    return { plan, status: "failed", failure: plan.failure };
  }
  const productResult = { ...stageResultEnvelope(plan, { artifactId: intelligence.product.object_id, artifactSha256: intelligence.product.artifact_sha256 }), provenance: { product: intelligence.product } };
  plan = bindCreateSeoArticleStageResult(plan, productResult);
  const businessResult = { ...stageResultEnvelope(plan, { artifactId: intelligence.business.object_id, artifactSha256: intelligence.business.artifact_sha256 }), provenance: { business: intelligence.business, context: intelligence.context } };
  plan = bindCreateSeoArticleStageResult(plan, businessResult);
  return { plan, status: "ready_for_research", intelligence: { product: intelligence.product, business: intelligence.business, context: intelligence.context } };
}
