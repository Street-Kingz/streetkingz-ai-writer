import { createProductFactsProvider } from "../research/providers/productFacts.js";
import { runEvidenceEngine } from "../research/evidenceEngine.js";

const args = process.argv.slice(2);
const approvedIndex = args.indexOf("--approved");
const approved = approvedIndex >= 0;
if (approved) args.splice(approvedIndex, 1);
const productFactsPath = args[0];

if (!productFactsPath || !approved) {
  console.error("Usage: npm run evidence:product -- <approved-facts.json> --approved");
  process.exitCode = 1;
} else {
  try {
    const result = await runEvidenceEngine({
      productFactsPath,
      approvedBy: "local_user",
      providers: [createProductFactsProvider()]
    });
    console.log(`Evidence artifact: ${result.files.evidence}`);
    console.log(`Coverage report: ${result.files.coverage}`);
    console.log(`Interpretation placeholder: ${result.files.interpretation}`);
    console.log(`Human-readable summary: ${result.files.summary}`);
    console.log(`Records: ${result.evidence.records.length}`);
    console.log(`Status: ${result.coverage.status}`);
  } catch (error) {
    console.error(`Evidence collection failed: ${error.message}`);
    if (error.errors) error.errors.forEach((item) => console.error(`- ${item}`));
    process.exitCode = 1;
  }
}
