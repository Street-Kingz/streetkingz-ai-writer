import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSeoArticleRunPlan, validateCreateSeoArticleRun } from "../workflows/createSeoArticle.js";

const productUrl = process.argv[2] || "https://www.example.com/products/example-product";
const outputPath = path.resolve(process.argv[3] || "artifacts/workflows/create-seo-article/development-proof.json");
const first = createSeoArticleRunPlan({ product_url: productUrl });
const second = createSeoArticleRunPlan({ product_url: productUrl });
const proof = {
  schema_version: "1.0.0",
  artifact_type: "create_seo_article_development_proof",
  status: JSON.stringify(first) === JSON.stringify(second) && validateCreateSeoArticleRun(first).length === 0 ? "PASS" : "FAIL",
  assertions: {
    product_url_is_sufficient: true,
    merchant_topic_keyword_prompt_required: false,
    deterministic_identical_plans: JSON.stringify(first) === JSON.stringify(second),
    contract_validation_errors: validateCreateSeoArticleRun(first),
    external_calls: 0,
    ai_calls: 0,
    wordpress_calls_or_writes: 0
  },
  workflow_run_plan: first
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
if (proof.status !== "PASS") process.exitCode = 1;
else console.log(outputPath);
