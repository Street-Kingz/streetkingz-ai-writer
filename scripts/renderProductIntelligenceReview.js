import { readFile } from "node:fs/promises";
import path from "node:path";
import { writeProductIntelligenceReviewReport } from "../product-intelligence/reviewReport.js";

const [inputPath, outputRoot] = process.argv.slice(2);
if (!inputPath) {
  console.error("Usage: npm run product-intelligence:review -- <product-intelligence.json> [output-root]");
  process.exitCode = 1;
} else {
  try {
    const input = JSON.parse(await readFile(path.resolve(inputPath), "utf8"));
    const result = await writeProductIntelligenceReviewReport(input, outputRoot ? { outputRoot } : {});
    console.log(JSON.stringify({ review_report: result.report, ai_calls: 0, external_requests: 0 }, null, 2));
  } catch (error) {
    console.error(`Product Intelligence review rendering failed: ${error.message}`);
    if (error.errors) console.error(JSON.stringify(error.errors, null, 2));
    process.exitCode = 1;
  }
}
