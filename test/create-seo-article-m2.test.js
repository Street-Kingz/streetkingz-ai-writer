import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createEditorialIntelligenceContext } from "../editorial-intelligence/context.js";
import { sha256 } from "../research/core/canonical.js";
import { resumeCreateSeoArticleRun } from "../workflows/createSeoArticle.js";
import {
  CreateSeoArticleIntelligenceFailure,
  CreateSeoArticleIntelligencePause,
  resolveCreateSeoArticleIntelligence,
  runCreateSeoArticleM2
} from "../workflows/createSeoArticleIntelligence.js";

const PRODUCT_URL = "https://merchant.example/products/widget/";
const pioFile = "artifacts/product-intelligence-founder-validation/heavy-duty-drying-towel-1200gsm/2026-08-14T06-35-19-842Z/product-intelligence-corrected.json";
const bioFile = "artifacts/business-intelligence/streetkingz-co-uk/2026-08-15T06-44-34-338Z/founder-validation/business-intelligence-validated.json";
const [pioSource, bioSource] = await Promise.all([readFile(pioFile, "utf8"), readFile(bioFile, "utf8")]);

function replaceStrings(value, replacements) {
  if (typeof value === "string") return replacements.reduce((result, [from, to]) => result.split(from).join(to), value);
  if (Array.isArray(value)) return value.map((item) => replaceStrings(item, replacements));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceStrings(item, replacements)]));
  return value;
}

const PRODUCT = (() => {
  const value = structuredClone(JSON.parse(pioSource).product_intelligence_object);
  const result = replaceStrings(value, [["streetkingz.co.uk", "merchant.example"], ["heavy-duty-drying-towel-1200gsm", "products/widget"], ["Heavy Duty Drying Towel 1200GSM", "Widget"], ["Street Kingz", "Brand"]]);
  result.metadata.object_id = "pio-generic";
  result.metadata.product_url = PRODUCT_URL;
  return result;
})();
const BUSINESS = (() => {
  const value = structuredClone(JSON.parse(bioSource));
  const result = replaceStrings(value, [["streetkingz.co.uk", "merchant.example"], ["Street Kingz", "Brand"]]);
  result.metadata.object_id = "bio-generic";
  result.metadata.business_id = "business-generic";
  result.metadata.primary_domain = "https://merchant.example/";
  return result;
})();
const candidateResolver = (product = PRODUCT, business = BUSINESS, contextCandidates = []) => async () => ({ productCandidates: [{ reference: "pio-ref", artifact: product }], businessCandidates: [{ reference: "bio-ref", artifact: business }], contextCandidates });

test("M2 resolves validated PIO/BIO, creates EIC, binds both stages, and leaves research ready", async () => {
  const result = await runCreateSeoArticleM2({ input: { product_url: PRODUCT_URL }, resolveCandidates: candidateResolver(), now: () => "2026-08-15T12:00:00.000Z" });
  assert.equal(result.status, "ready_for_research");
  assert.equal(result.plan.current_stage, "research");
  assert.equal(result.plan.stages[0].state, "complete");
  assert.equal(result.plan.stages[1].state, "complete");
  assert.equal(result.plan.stages[2].state, "ready");
  assert.equal(result.plan.external_calls_performed, 0);
  assert.equal(result.plan.stages[1].result.provenance.context.validation_status, "validated");
});

test("awaiting product validation pauses and blocks downstream stages", async () => {
  const awaiting = structuredClone(PRODUCT); awaiting.validation_status = "awaiting_validation";
  const result = await runCreateSeoArticleM2({ input: { product_url: PRODUCT_URL }, resolveCandidates: candidateResolver(awaiting) });
  assert.equal(result.status, "paused");
  assert.equal(result.plan.pause.required_stage, "product_understanding");
  assert.ok(result.plan.stages.slice(1).every((stage) => stage.state === "blocked"));
  assert.equal(resumeCreateSeoArticleRun(result.plan).current_stage, "product_understanding");
});

test("awaiting business validation pauses after product remains complete", async () => {
  const awaiting = structuredClone(BUSINESS); awaiting.validation_status = "awaiting_validation";
  const result = await runCreateSeoArticleM2({ input: { product_url: PRODUCT_URL }, resolveCandidates: candidateResolver(PRODUCT, awaiting) });
  assert.equal(result.status, "paused");
  assert.equal(result.plan.pause.required_stage, "business_understanding");
  assert.equal(result.plan.stages[0].state, "complete");
  assert.ok(result.plan.stages.slice(2).every((stage) => stage.state === "blocked"));
});

test("identity mismatch, corruption, hash mismatch and ambiguity fail closed", async () => {
  const cases = [
    { resolver: candidateResolver({ ...PRODUCT, metadata: { ...PRODUCT.metadata, product_url: "https://other.example/products/widget/" } }), reason: "identity_mismatch" },
    { resolver: async () => ({ productCandidates: [{ artifact: { broken: true } }], businessCandidates: [], contextCandidates: [] }), reason: "malformed_artifact" },
    { resolver: async () => ({ productCandidates: [{ reference: "pio-ref", artifact: PRODUCT, artifact_sha256: "0".repeat(64) }], businessCandidates: [], contextCandidates: [] }), reason: "artifact_hash_mismatch" },
    { resolver: async () => ({ productCandidates: [{ artifact: PRODUCT }, { artifact: PRODUCT }], businessCandidates: [], contextCandidates: [] }), reason: "ambiguous_artifacts" }
  ];
  for (const item of cases) {
    const result = await runCreateSeoArticleM2({ input: { product_url: PRODUCT_URL }, resolveCandidates: item.resolver });
    assert.equal(result.status, "failed");
    assert.equal(result.failure.code, item.reason);
    assert.equal(result.plan.current_stage, null);
  }
});

test("EIC reuse is validated and its actual content hash is bound", async () => {
  const context = createEditorialIntelligenceContext({ businessIntelligence: BUSINESS, productIntelligence: PRODUCT, createdAt: "2026-08-15T12:00:00.000Z" });
  const result = await resolveCreateSeoArticleIntelligence({ productUrl: PRODUCT_URL, resolveCandidates: async () => ({ productCandidates: [{ artifact: PRODUCT }], businessCandidates: [{ artifact: BUSINESS }], contextCandidates: [{ reference: "eic-ref", artifact: context }] }) });
  assert.equal(result.context.reference, "eic-ref");
  assert.equal(result.context.artifact_sha256, sha256(context));
  await assert.rejects(() => resolveCreateSeoArticleIntelligence({ productUrl: PRODUCT_URL, resolveCandidates: async () => ({ productCandidates: [{ artifact: PRODUCT }], businessCandidates: [{ artifact: BUSINESS }], contextCandidates: [{ artifact: { ...context, metadata: { ...context.metadata, schema_version: "unsupported" } } }] }) }), CreateSeoArticleIntelligenceFailure);
  await assert.rejects(() => resolveCreateSeoArticleIntelligence({ productUrl: PRODUCT_URL, resolveCandidates: async () => ({ productCandidates: [{ artifact: PRODUCT }], businessCandidates: [{ artifact: BUSINESS }], contextCandidates: [{ artifact: { ...context, metadata: { ...context.metadata, product_object_id: "foreign" } } }] }) }), CreateSeoArticleIntelligenceFailure);
});

test("pause and failure classes remain distinguishable", () => {
  assert.ok(new CreateSeoArticleIntelligencePause({ message: "pause" }) instanceof Error);
  assert.ok(new CreateSeoArticleIntelligenceFailure("failure") instanceof Error);
});
