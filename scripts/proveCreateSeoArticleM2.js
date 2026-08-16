import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFileCreateSeoArticleIntelligenceResolver, runCreateSeoArticleM2 } from "../workflows/createSeoArticleIntelligence.js";

const productUrl = "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/";
const root = "artifacts";
const product = path.join(root, "product-intelligence-founder-validation/heavy-duty-drying-towel-1200gsm/2026-08-14T06-35-19-842Z/product-intelligence-corrected.json");
const business = path.join(root, "business-intelligence/streetkingz-co-uk/2026-08-15T06-44-34-338Z/founder-validation/business-intelligence-validated.json");
const resolver = createFileCreateSeoArticleIntelligenceResolver({ product, business });
const result = await runCreateSeoArticleM2({ input: { product_url: productUrl }, resolveCandidates: resolver, now: () => "2026-08-15T12:00:00.000Z" });
const proof = {
  schema_version: "1.0.0", artifact_type: "create_seo_article_m2_url_to_evidence_proof", status: result.status === "ready_for_research" && result.plan.current_stage === "research" ? "PASS" : "FAIL",
  objective: result.plan.objective, canonical_product_url: result.plan.workflow_input.product_url, workflow_run_id: result.plan.workflow_run_id,
  product_intelligence: result.intelligence?.product || null, business_intelligence: result.intelligence?.business || null, editorial_intelligence_context: result.intelligence?.context || null,
  stage_transitions: result.plan.stages.map((stage) => ({ stage_id: stage.stage_id, state: stage.state, result: stage.result ? { artifact_id: stage.result.artifact_id, artifact_sha256: stage.result.artifact_sha256, provenance: stage.result.provenance } : null })),
  final_active_stage: result.plan.current_stage, research_status: result.plan.current_stage === "research" ? "READY_NOT_EXECUTED" : "NOT_READY", merchant_inputs_received: ["product_url"], ai_calls: 0, external_calls: 0, wordpress_calls: 0, wordpress_writes: 0, publishing_attempts: 0
};
await mkdir(path.dirname("artifacts/workflows/create-seo-article/m2-url-to-evidence-proof.json"), { recursive: true });
await writeFile("artifacts/workflows/create-seo-article/m2-url-to-evidence-proof.json", `${JSON.stringify(proof, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: proof.status, workflow_run_id: proof.workflow_run_id, product_object_id: proof.product_intelligence?.object_id, business_id: proof.business_intelligence?.business_id, context_id: proof.editorial_intelligence_context?.context_id, research_status: proof.research_status }, null, 2));
if (proof.status !== "PASS") process.exitCode = 1;
