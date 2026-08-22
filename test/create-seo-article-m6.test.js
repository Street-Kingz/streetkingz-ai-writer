import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createFounderReview, createCorrectionApproval } from "../workflows/createSeoArticleM6.js";
import { validateM5DPage } from "../workflows/createSeoArticleM5D.js";

const root = "artifacts/workflows/create-seo-article";
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
async function fixtures() {
  const m4Input = await read(`${root}/m4-proof-v5/gpt-5.6-sol/call_001/m4-input.json`);
  const article = await read(`${root}/m5d-proof-v1/gpt-5.6-sol/call_001/semantic-page.json`);
  const brief = await read(`${root}/m4b-proof-v5/gpt-5.6-sol/call_001/article-brief.json`);
  const pagePlan = await read(`${root}/m4b-proof-v5/gpt-5.6-sol/call_001/editorial-page-plan.json`);
  const evidencePack = await read(`${root}/m4a2-proof-v4/article-editorial-evidence-pack.json`);
  const restrictionPolicy = await read(`${root}/m4a2a-proof-v3/article-claim-restriction-policy.json`);
  return { m4Input, article, brief, pagePlan, evidencePack, restrictionPolicy };
}

test("founder review and correction approval bind the exact M5D parent", async () => {
  const f = await fixtures();
  const review = createFounderReview({ article: f.article, brief: f.brief, pagePlan: f.pagePlan, feedback: [{ feedback_id: "style_1", class: "STYLE", classification: "VALID" }] });
  const approval = createCorrectionApproval({ review, article: f.article, brief: f.brief, pagePlan: f.pagePlan, evidencePack: f.evidencePack, restrictionPolicy: f.restrictionPolicy });
  assert.equal(approval.publication_authorized, false);
  assert.equal(approval.parent_article_sha256, (await import("../research/core/canonical.js")).sha256(f.article));
  assert.notEqual(approval.parent_article_sha256, "wrong");
});

test("founder feedback is not evidence and parent strategy remains immutable", async () => {
  const f = await fixtures();
  const changed = structuredClone(f.article); changed.topic = "other topic";
  const errors = validateM5DPage(changed, { plan: { ...f.pagePlan, components: f.pagePlan.components.map((c) => ({ ...c, evidence_ids: [...new Set(f.article.components.flatMap((x) => x.evidence_ids))] })) }, allowlists: { evidence_ids: [...new Set(f.article.components.flatMap((x) => x.evidence_ids))], product_ids: [...new Set(f.article.components.flatMap((x) => x.product_ids))], internal_link_ids: [], products: [{ product_id: f.m4Input.registries.products[0].product_id, name: f.m4Input.registries.products[0].product_name, url: f.m4Input.registries.products[0].product_url }], internal_links: [] }, opportunity: f.m4Input.opportunity, approval: { publication_authorized: false }, restrictionPolicy: f.restrictionPolicy });
  assert.ok(errors.some((e) => e.code === "STRATEGY_DRIFT"));
});

test("article-specific saturated-weight fact is distinct from category evidence", async () => {
  const facts = (await read(`${root}/m5c-proof/gpt-5.6-sol/call_001/m5-input.json`)).packet.product_facts.records;
  const record = facts.find((f) => JSON.stringify(f.value).includes("Feels heavier when fully saturated"));
  assert.equal(record.evidence_id, "ev_03eaf1f2b6bd5f09a0c4da51");
  assert.equal(record.subject_id, "product_20fcada95c00204601928709");
});
