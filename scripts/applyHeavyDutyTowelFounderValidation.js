import { readFile } from "node:fs/promises";
import path from "node:path";
import { createApprovedHumanCorrection, writeCorrectedProductIntelligenceArtifact } from "../product-intelligence/humanCorrection.js";
import { writeProductIntelligenceReviewReport } from "../product-intelligence/reviewReport.js";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/applyHeavyDutyTowelFounderValidation.js <product-intelligence.json>");
  process.exitCode = 1;
} else {
  try {
    const sourceArtifact = JSON.parse(await readFile(path.resolve(inputPath), "utf8"));
    const pio = sourceArtifact.product_intelligence_object || sourceArtifact;
    const targetPath = "customer_understanding.ideal_customers";
    const correction = createApprovedHumanCorrection({
      targetPath,
      previousValue: pio.customer_understanding.ideal_customers,
      correctedValue: "People who wash their own vehicle at home, care about keeping it looking good, spend money looking after it, value product quality and achieving a good result, and are willing to pay more for a better product that makes the job easier or gives a better result rather than simply choosing the cheapest option. They are primarily buying for their own vehicle. Professional detailers and professional car washers are not the intended target audience.",
      reason: "Founder validation established that the intended customer is an at-home owner caring for their own vehicle. Professional buyers prioritising commercial cost per job, bulk purchasing, margin, durability under commercial use, or overall cost efficiency are not the target. Do not infer demographics or automatically label this customer a car enthusiast.",
      createdAt: new Date().toISOString(),
      supersedesEvidenceRefs: []
    });
    const result = await writeCorrectedProductIntelligenceArtifact({
      sourceArtifact,
      correction,
      knownNextSliceRequirement: "The future product-page editor should use trusted Product Intelligence to sell the product. Accuracy remains a boundary, not the objective of the copy. It should prioritise commercially useful reasons to buy while preventing invented or unsupported claims. The currently identified overly defensive short-description wording must not be changed in this founder-validation slice."
    });
    const review = await writeProductIntelligenceReviewReport(result.artifact);
    console.log(JSON.stringify({ corrected_product_intelligence: result.paths.artifact, founder_validation_metadata: result.paths.metadata, review_report: review.report, correction_id: correction.id, ai_calls: 0, external_requests: 0 }, null, 2));
  } catch (error) {
    console.error(`Founder validation failed: ${error.message}`);
    if (error.errors) console.error(JSON.stringify(error.errors, null, 2));
    process.exitCode = 1;
  }
}
