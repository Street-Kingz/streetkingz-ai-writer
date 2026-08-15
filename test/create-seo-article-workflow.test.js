import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CREATE_SEO_ARTICLE_STAGES,
  bindCreateSeoArticleStageResult,
  createSeoArticleRunPlan,
  stageResultEnvelope,
  validateCreateSeoArticleRun
} from "../workflows/createSeoArticle.js";

const URL = "https://merchant.example/products/widget?variant=blue#details";

test("product_url alone creates a deterministic generic create_seo_article plan", () => {
  const first = createSeoArticleRunPlan({ product_url: URL });
  const second = createSeoArticleRunPlan({ product_url: URL });
  assert.deepEqual(first, second);
  assert.equal(first.objective, "create_seo_article");
  assert.equal(first.workflow_input.product_url, "https://merchant.example/products/widget?variant=blue");
  assert.deepEqual(first.stages.map((stage) => stage.stage_id), CREATE_SEO_ARTICLE_STAGES.map((stage) => stage.id));
  assert.deepEqual(validateCreateSeoArticleRun(first), []);
  assert.equal(first.external_calls_performed, 0);
  assert.equal(first.publication_allowed, false);
});

test("topic, keyword, prompt, invalid URLs and objective changes are rejected", () => {
  for (const input of [{}, { product_url: "file:///tmp/product" }, { product_url: URL, topic: "x" }, { product_url: URL, keyword: "x" }, { product_url: URL, prompt: "x" }, { product_url: URL, objective: "improve_product_page" }]) {
    assert.throws(() => createSeoArticleRunPlan(input), (error) => error.code === "INVALID_WORKFLOW_INPUT");
  }
});

test("valid stage results advance only in contract order and retain lineage", () => {
  const run = createSeoArticleRunPlan({ product_url: URL });
  const result = stageResultEnvelope(run, { artifactId: "pio_123", artifactSha256: "a".repeat(64) });
  const next = bindCreateSeoArticleStageResult(run, result);
  assert.equal(next.stages[0].state, "complete");
  assert.equal(next.current_stage, "business_understanding");
  assert.equal(next.stages[1].state, "ready");
  assert.equal(run.current_stage, "product_understanding");
});

test("invalid, failed, out-of-order, objective-changing and foreign-lineage results fail closed", () => {
  const mutations = [
    { validation_state: "invalid" },
    { status: "failed" },
    { stage_id: "research" },
    { objective: "identify_content_opportunities" },
    { workflow_run_id: "workflow_run_foreign" }
  ];
  for (const mutation of mutations) {
    const run = createSeoArticleRunPlan({ product_url: URL });
    const valid = stageResultEnvelope(run, { artifactId: "pio_123", artifactSha256: "a".repeat(64) });
    const failed = bindCreateSeoArticleStageResult(run, { ...valid, ...mutation });
    assert.equal(failed.state, "failed");
    assert.equal(failed.current_stage, null);
    assert.equal(failed.stages[0].state, "failed");
    assert.ok(failed.stages.slice(1).every((stage) => stage.state === "blocked"));
  }
});

test("tampered workflow plans are rejected before transition", () => {
  const run = createSeoArticleRunPlan({ product_url: URL });
  run.objective = "other_workflow";
  assert.match(validateCreateSeoArticleRun(run).map((error) => error.code).join(" "), /OBJECTIVE_CHANGE_REJECTED/);
  assert.throws(() => bindCreateSeoArticleStageResult(run, {}), (error) => error.code === "INVALID_WORKFLOW_RUN");
});
