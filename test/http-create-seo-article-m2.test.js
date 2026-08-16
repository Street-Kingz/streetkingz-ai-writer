import assert from "node:assert/strict";
import express from "express";
import { after, before, test } from "node:test";
import { createSeoArticleWorkflowRouter } from "../routes/createSeoArticleWorkflow.js";
import { createFileCreateSeoArticleIntelligenceResolver } from "../workflows/createSeoArticleIntelligence.js";
import { requestJson, startServer, stopServer } from "./helpers/http.js";

const resolver = createFileCreateSeoArticleIntelligenceResolver({
  product: "artifacts/product-intelligence-founder-validation/heavy-duty-drying-towel-1200gsm/2026-08-14T06-35-19-842Z/product-intelligence-corrected.json",
  business: "artifacts/business-intelligence/streetkingz-co-uk/2026-08-15T06-44-34-338Z/founder-validation/business-intelligence-validated.json"
});
const app = express();
app.use(express.json());
app.use(createSeoArticleWorkflowRouter({ resolveCandidates: resolver }));
let server;

before(async () => { server = await startServer(app); });
after(async () => { await stopServer(server); });

test("M2 route advances a URL-only request to research ready without execution", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error("No external call expected"); };
  try {
    const response = await requestJson(server, { method: "POST", path: "/workflows/create-seo-article", body: { product_url: "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/" } });
    assert.equal(response.status, 201);
    assert.equal(response.body.current_stage, "research");
    assert.equal(response.body.stages[0].state, "complete");
    assert.equal(response.body.stages[1].state, "complete");
    assert.equal(response.body.stages[2].state, "ready");
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});
