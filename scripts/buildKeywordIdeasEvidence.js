import { createDataForSeoClient } from "../research/clients/dataForSeo.js";
import { runEvidenceEngine } from "../research/evidenceEngine.js";
import { createDataForSeoKeywordIdeasProvider } from "../research/providers/dataForSeoKeywordIdeas.js";
import { createProductFactsProvider } from "../research/providers/productFacts.js";

const args = process.argv.slice(2);
const approvedIndex = args.indexOf("--approved");
const approved = approvedIndex >= 0;
if (approved) args.splice(approvedIndex, 1);
const [productFactsPath, evidenceArtifactPath] = args;

if (!productFactsPath || !evidenceArtifactPath || !approved) {
  console.error("Usage: npm run evidence:dataforseo -- <approved-facts.json> <evidence.json> --approved");
  process.exitCode = 1;
} else {
  try {
    const client = createDataForSeoClient();
    const provider = createDataForSeoKeywordIdeasProvider({ client });
    const prepared = await provider.createRequest({
      productFactsPath,
      evidenceArtifactPath,
      scope: { market: "GB", language: "en-GB" },
      approval: { status: "approved", asserted_by: "local_user" }
    });
    console.log(`Seeds: ${prepared.request.seeds.map((seed) => seed.text).join(" | ")}`);
    const result = await runEvidenceEngine({
      productFactsPath,
      evidenceArtifactPath,
      approvedBy: "local_user",
      providers: [createProductFactsProvider(), provider]
    });
    const dataForSeoRun = result.providerResults.find((item) => item.provider_id === "dataforseo_keyword_ideas");
    console.log(`Evidence artifact: ${result.files.evidence}`);
    console.log(`Normalised artifact: ${dataForSeoRun.normalised_artifact.local_path}`);
    console.log(`Raw artifact: ${dataForSeoRun.raw_artifacts[0].local_path}`);
    console.log(`Summary artifact: ${result.files.summary}`);
    console.log(`Keyword ideas: ${dataForSeoRun.evidence_record_ids.length}`);
    console.log(`Cost USD: ${dataForSeoRun.cost.actual}`);
    console.log(`Cache hit: ${dataForSeoRun.cache.hit}`);
  } catch (error) {
    console.error(`DataForSEO evidence collection failed: ${error.message}`);
    process.exitCode = 1;
  }
}
