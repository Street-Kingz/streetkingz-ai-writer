import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildEvidenceGroundedM4BInput, validateEvidenceGroundedM4BOutput } from "../workflows/createSeoArticleM4B.js";

const read = async (file) => JSON.parse(await readFile(file, "utf8"));
const files = {
  m4: "artifacts/workflows/create-seo-article/m4-proof-v5/gpt-5.6-sol/call_001/m4-input.json",
  pack: "artifacts/workflows/create-seo-article/m4a2-proof-v4/article-editorial-evidence-pack.json",
  policy: "artifacts/workflows/create-seo-article/m4a2a-proof-v3/article-claim-restriction-policy.json"
};

async function fixture() {
  const m4 = await read(files.m4), pack = await read(files.pack), policy = await read(files.policy);
  return { m4, pack, policy, input: buildEvidenceGroundedM4BInput({ opportunity: m4.opportunity, evidencePack: pack, restrictionPolicy: policy, seoGuidance: m4.seo_guidance, productLineage: { product_id: m4.intelligence.product.product_id, pio_id: m4.intelligence.eic.product_object_id }, businessLineage: m4.intelligence.business, eicLineage: m4.intelligence.eic, merchantInput: { product_url: m4.intelligence.product.product_url } }) };
}

test("M4B inherits canonical opportunity and product_url-only merchant boundary", async () => {
  const { input } = await fixture();
  assert.deepEqual(input.merchant_inputs_received, ["product_url"]);
  assert.equal(input.opportunity.primary_query, "best microfibre car drying towel");
  assert.equal(input.opportunity.article_type, "supporting_article");
  assert.equal(input.opportunity.search_intent, "commercial_investigation");
  assert.equal(input.planning_constraints.restriction_mode, "QUALIFIED");
});

test("historical M4 remains immutable and is not the M4B lineage", async () => {
  const oldPlan = await read("artifacts/workflows/create-seo-article/m4-proof-v5/gpt-5.6-sol/call_001/editorial-page-plan.json");
  const hash = oldPlan.deterministic_content_sha256;
  assert.equal(hash, "109d5a7553798979dc21fbb3d452a2eaba3e092932910543b043f5da3da0b233");
  assert.notEqual(oldPlan.plan_id, "editorial_page_plan_cea873d04ab1869fdf850edf");
});

test("WARN planning requires matching restriction policy and FAIL blocks", async () => {
  const { m4, pack, policy } = await fixture();
  const missing = structuredClone(policy); missing.restrictions = [];
  assert.throws(() => buildEvidenceGroundedM4BInput({ opportunity: m4.opportunity, evidencePack: pack, restrictionPolicy: missing, seoGuidance: m4.seo_guidance, productLineage: { product_id: m4.intelligence.product.product_id } }), /M4B_WARN_POLICY_INVALID/);
  const failed = structuredClone(pack); failed.subject_depth = { ...failed.subject_depth, status: "FAIL" };
  assert.throws(() => buildEvidenceGroundedM4BInput({ opportunity: m4.opportunity, evidencePack: failed, restrictionPolicy: policy, seoGuidance: m4.seo_guidance, productLineage: { product_id: m4.intelligence.product.product_id } }), /M4B_SUBJECT_DEPTH_FAIL|M4B_WARN_POLICY_INVALID/);
});

test("M4B rejects changed strategy, unknown evidence, unknown restrictions and missing restricted policy", async () => {
  const { input } = await fixture();
  const raw = await read("artifacts/workflows/create-seo-article/m4b-proof-v2/gpt-5.6-sol/call_001/m4b-response-raw.json");
  const output = JSON.parse(raw.raw_text);
  const changed = structuredClone(output); changed.primary_query = "different query"; changed.article_type = "how_to"; changed.search_intent = "informational";
  assert.ok(validateEvidenceGroundedM4BOutput(changed, input).includes("M4B_PRIMARY_QUERY_CHANGED"));
  assert.ok(validateEvidenceGroundedM4BOutput(changed, input).includes("M4B_ARTICLE_TYPE_CHANGED"));
  assert.ok(validateEvidenceGroundedM4BOutput(changed, input).includes("M4B_SEARCH_INTENT_CHANGED"));
  const unknown = structuredClone(output); unknown.sections[0].evidence_ids.push("unknown_evidence"); unknown.sections[0].restriction_ids.push("unknown_restriction");
  const errors = validateEvidenceGroundedM4BOutput(unknown, input);
  assert.ok(errors.includes("M4B_UNKNOWN_EVIDENCE:unknown_evidence"));
  assert.ok(errors.includes("M4B_UNKNOWN_RESTRICTION:unknown_restriction"));
  const restricted = structuredClone(output); restricted.sections[1].restriction_ids = [];
  assert.ok(validateEvidenceGroundedM4BOutput(restricted, input).includes("M4B_RESTRICTED_SECTION_WITHOUT_POLICY:1"));
});

test("M4B rejects URLs, unsupported superiority and prose in planning output", async () => {
  const { input } = await fixture();
  const raw = await read("artifacts/workflows/create-seo-article/m4b-proof-v2/gpt-5.6-sol/call_001/m4b-response-raw.json");
  const output = JSON.parse(raw.raw_text);
  const bad = structuredClone(output); bad.sections[0].purpose = "https://example.test and this is a very long article paragraph ".repeat(15); bad.sections[0].required_points.push("This is always best on the market");
  const errors = validateEvidenceGroundedM4BOutput(bad, input);
  assert.ok(errors.includes("M4B_INVENTED_URL:0"));
  assert.ok(errors.includes("M4B_UNSUPPORTED_CLAIM:0"));
  assert.ok(errors.includes("M4B_ARTICLE_PROSE_IN_OUTPUT"));
});
