import path from "node:path";
import { createDataForSeoClient } from "../research/clients/dataForSeo.js";
import { runEvidenceEngine } from "../research/evidenceEngine.js";
import { createDataForSeoKeywordIdeasProvider } from "../research/providers/dataForSeoKeywordIdeas.js";
import { createDataForSeoSerpAdvancedProvider } from "../research/providers/dataForSeoSerpAdvanced.js";
import { createProductFactsProvider } from "../research/providers/productFacts.js";

const args = process.argv.slice(2);
const approvedIndex = args.indexOf("--approved");
const approved = approvedIndex >= 0;
if (approved) args.splice(approvedIndex, 1);
const [productFactsPath, keywordEvidencePath, requestedOutputRoot] = args;

if (!productFactsPath || !keywordEvidencePath || !approved) {
  console.error("Usage: npm run evidence:serp -- <approved-facts.json> <keyword-evidence.json> [output-root] --approved");
  process.exitCode = 1;
} else {
  try {
    const outputRoot = requestedOutputRoot || "artifacts/evidence";
    const cacheRoot = path.join(path.resolve(outputRoot), "cache");
    const client = createDataForSeoClient();
    const maxKeywords = process.env.DATAFORSEO_SERP_MAX_KEYWORDS === undefined
      ? 5
      : Number(process.env.DATAFORSEO_SERP_MAX_KEYWORDS);
    const maxCostUsd = process.env.DATAFORSEO_SERP_MAX_COST_USD === undefined
      ? client.config.maxCostUsd
      : Number(process.env.DATAFORSEO_SERP_MAX_COST_USD);
    const noKeywordIdeasNetwork = {
      config: client.config,
      async post() { throw new Error("Keyword Ideas cache is required before SERP collection."); }
    };
    const keywordProvider = createDataForSeoKeywordIdeasProvider({ client: noKeywordIdeasNetwork });
    const keywordPrepared = await keywordProvider.createRequest({
      productFactsPath,
      evidenceArtifactPath: keywordEvidencePath,
      scope: { market: "GB", language: "en-GB" },
      approval: { status: "approved", asserted_by: "local_user" }
    });
    const keywordCacheCheck = await keywordProvider.run({ preparedRequest: keywordPrepared, cacheRoot, now: () => new Date() });
    if (!keywordCacheCheck.result.cache.hit) throw new Error("Keyword Ideas cache preflight did not resolve as a cache hit.");

    const serpProvider = createDataForSeoSerpAdvancedProvider({ client, maxKeywords, maxCostUsd });
    const result = await runEvidenceEngine({
      productFactsPath,
      evidenceArtifactPath: keywordEvidencePath,
      approvedBy: "local_user",
      providers: [createProductFactsProvider(), keywordProvider, serpProvider],
      outputRoot
    });
    const serpRun = result.providerResults.find((item) => item.provider_id === serpProvider.id);
    console.log(`Shortlisted keywords: ${Object.keys(serpRun.evidence_categories || {}).join(" | ")}`);
    console.log(`Shortlist artifact: ${serpRun.shortlist_artifact.local_path}`);
    console.log(`Evidence artifact: ${result.files.evidence}`);
    console.log(`Coverage artifact: ${result.files.coverage}`);
    console.log(`Normalised artifact: ${serpRun.normalised_artifact.local_path}`);
    console.log(`Summary artifact: ${result.files.summary}`);
    console.log(`Paid requests: ${serpRun.paid_requests}`);
    console.log(`Cost USD: ${serpRun.cost.actual}`);
    console.log(`Cache hits: ${serpRun.cache.hits}`);
    console.log(`Cache misses: ${serpRun.cache.misses}`);
  } catch (error) {
    console.error(`DataForSEO SERP evidence collection failed: ${error.message}`);
    process.exitCode = 1;
  }
}
