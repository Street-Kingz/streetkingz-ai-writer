import path from "node:path";
import { createDataForSeoClient } from "../research/clients/dataForSeo.js";
import { createGoogleSearchConsoleClient } from "../research/clients/googleSearchConsole.js";
import { runEvidenceEngine } from "../research/evidenceEngine.js";
import { createDataForSeoKeywordIdeasProvider } from "../research/providers/dataForSeoKeywordIdeas.js";
import { createDataForSeoSerpAdvancedProvider } from "../research/providers/dataForSeoSerpAdvanced.js";
import { createGoogleSearchConsoleProvider } from "../research/providers/googleSearchConsole.js";
import { createProductFactsProvider } from "../research/providers/productFacts.js";

const args = process.argv.slice(2);
const approvedIndex = args.indexOf("--approved");
const approved = approvedIndex >= 0;
if (approved) args.splice(approvedIndex, 1);
const [productFactsPath, evidenceArtifactPath, requestedOutputRoot] = args;

if (!productFactsPath || !evidenceArtifactPath || !approved) {
  console.error("Usage: npm run evidence:search-console -- <approved-facts.json> <keyword-serp-evidence.json> [output-root] --approved");
  process.exitCode = 1;
} else {
  try {
    const outputRoot = requestedOutputRoot || "artifacts/evidence";
    const cacheRoot = path.join(path.resolve(outputRoot), "cache");
    const dataForSeoClient = createDataForSeoClient();
    const offlineDataForSeo = { config: dataForSeoClient.config, async post() { throw new Error("Existing DataForSEO caches are required before Search Console collection."); } };
    const keywordProvider = createDataForSeoKeywordIdeasProvider({ client: offlineDataForSeo });
    const serpProvider = createDataForSeoSerpAdvancedProvider({ client: offlineDataForSeo, maxKeywords: 5, maxCostUsd: 0.01 });
    for (const provider of [keywordProvider, serpProvider]) {
      const prepared = await provider.createRequest({ productFactsPath, evidenceArtifactPath, scope: { market: "GB", language: "en-GB" }, approval: { status: "approved", asserted_by: "local_user" } });
      const cached = await provider.run({ preparedRequest: prepared, cacheRoot, now: () => new Date() });
      if (!cached.result.cache.hit) throw new Error(`${provider.id} did not resolve from cache.`);
    }

    const searchConsoleClient = createGoogleSearchConsoleClient();
    const searchConsoleProvider = createGoogleSearchConsoleProvider({
      client: searchConsoleClient,
      startDate: process.env.GOOGLE_SEARCH_CONSOLE_START_DATE || undefined,
      endDate: process.env.GOOGLE_SEARCH_CONSOLE_END_DATE || undefined,
      lookbackDays: process.env.GOOGLE_SEARCH_CONSOLE_LOOKBACK_DAYS || 90
    });
    const result = await runEvidenceEngine({
      productFactsPath,
      evidenceArtifactPath,
      approvedBy: "local_user",
      providers: [createProductFactsProvider(), keywordProvider, serpProvider, searchConsoleProvider],
      outputRoot
    });
    const providerRun = result.providerResults.find((item) => item.provider_id === searchConsoleProvider.id);
    console.log(`Property: ${searchConsoleClient.config.siteUrl}`);
    console.log(`API requests: ${providerRun.api_requests}`);
    console.log(`Rows returned: ${providerRun.rows_returned}`);
    console.log(`Cache hit: ${providerRun.cache.hit}`);
    console.log(`Normalised artifact: ${providerRun.normalised_artifact.local_path}`);
    console.log(`Evidence artifact: ${result.files.evidence}`);
    console.log(`Coverage artifact: ${result.files.coverage}`);
    console.log(`Summary artifact: ${result.files.summary}`);
  } catch (error) {
    console.error(`Google Search Console evidence collection failed: ${error.message}`);
    process.exitCode = 1;
  }
}
