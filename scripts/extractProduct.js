import { extractProductFromUrl } from "../services/productExtraction.js";

const args = process.argv.slice(2);
const forceIndex = args.indexOf("--force");
const force = forceIndex >= 0;
if (force) args.splice(forceIndex, 1);
const url = args[0];

if (!url) {
  console.error("Usage: npm run extract:product -- <street-kingz-product-url> [--force]");
  process.exitCode = 1;
} else {
  try {
    const result = await extractProductFromUrl(url, { force });
    console.log(`Product facts: ${result.paths.facts}`);
    console.log(`AI interpretation: ${result.paths.interpretation}`);
    console.log(`Human-readable summary: ${result.paths.markdown}`);
    console.log(`Raw page: ${result.paths.rawHtml}`);
    console.log(`Shared cache: ${result.paths.cacheHtml}`);
    console.log(`Cache used: ${result.cacheHit ? "yes" : "no"}`);
  } catch (error) {
    console.error(`Product extraction failed: ${error.message}`);
    process.exitCode = 1;
  }
}
