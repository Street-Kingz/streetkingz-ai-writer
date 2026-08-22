import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createM5DGenerationApproval, validateM5DGenerationApproval } from "../workflows/createSeoArticleM5D.js";

const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const root = "artifacts/workflows/create-seo-article";
async function fixtures() {
  const m4 = await read(`${root}/m4-proof-v5/gpt-5.6-sol/call_001/m4-input.json`);
  const brief = await read(`${root}/m4b-proof-v5/gpt-5.6-sol/call_001/article-brief.json`);
  const plan = await read(`${root}/m4b-proof-v5/gpt-5.6-sol/call_001/editorial-page-plan.json`);
  const pack = await read(`${root}/m4a2-proof-v4/article-editorial-evidence-pack.json`);
  const policy = await read(`${root}/m4a2a-proof-v3/article-claim-restriction-policy.json`);
  return { m4, brief, pagePlan: plan, evidencePack: pack, restrictionPolicy: policy, plan, pack, policy, opportunity: m4.opportunity, seoGuidance: m4.seo_guidance, productIntelligence: { product_id: m4.intelligence.product.product_id, pio_id: m4.intelligence.eic.product_object_id } };
}

test("M5D approval binds exactly to M4B and disallows publication", async () => {
  const f = await fixtures(); const approval = createM5DGenerationApproval(f);
  assert.equal(approval.publication_authorized, false);
  assert.deepEqual(validateM5DGenerationApproval(approval, f), []);
  const changed = { ...approval, page_plan: { ...approval.page_plan, sha256: "wrong" } };
  assert.ok(validateM5DGenerationApproval(changed, f).includes("PAGE_PLAN_APPROVAL_MISMATCH"));
});

test("historical M4 approval cannot pass M5D validation", async () => {
  const f = await fixtures(); const approval = createM5DGenerationApproval(f);
  const historical = { ...approval, brief: { id: "article_brief_248d2d96feff88a83be38999", sha256: "old" }, page_plan: { id: "editorial_page_plan_109d5a7553798979dc21fbb3", sha256: "old" } };
  const errors = validateM5DGenerationApproval(historical, f);
  assert.ok(errors.includes("BRIEF_APPROVAL_MISMATCH"));
  assert.ok(errors.includes("PAGE_PLAN_APPROVAL_MISMATCH"));
});

test("canonical M5D lineage uses WARN research and the exact plan", async () => {
  const f = await fixtures(); const approval = createM5DGenerationApproval(f);
  assert.equal(f.pack.subject_depth.status, "WARN");
  assert.equal(approval.brief.id, "article_brief_55a162120af6e322cf1a1832");
  assert.equal(approval.page_plan.id, "editorial_page_plan_cea873d04ab1869fdf850edf");
});
