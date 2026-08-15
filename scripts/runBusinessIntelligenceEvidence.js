import { ingestBusinessEvidence } from "../business-intelligence/ingestion.js";
import { createBusinessWebsiteReader } from "../business-intelligence/webReader.js";

const businessUrl = process.argv[2];
if (!businessUrl) {
  console.error("Usage: npm run business-intelligence:evidence -- <business-homepage-url>");
  process.exitCode = 1;
} else {
  try {
    const result = await ingestBusinessEvidence(businessUrl, { readPage: createBusinessWebsiteReader() });
    console.log(JSON.stringify({
      run_directory: result.paths.runDirectory, raw_pages: result.paths.rawDirectory,
      raw_business_evidence: result.paths.evidence, run_metadata: result.paths.runMetadata,
      pages_retrieved: result.artifact.ingestion_metadata.pages_included.length,
      evidence_counts: result.artifact.source_summary.evidence_counts,
      products_sampled: result.artifact.sampling_summary.products_sampled,
      exclusions: { pages: result.artifact.ingestion_metadata.pages_excluded.length, products: result.artifact.sampling_summary.products_excluded.length },
      external_reads: result.artifact.execution_metadata.external_api_call_count, ai_calls: 0, writes: 0
    }, null, 2));
  } catch (error) {
    console.error(`Business Intelligence evidence ingestion failed: ${error.message}`);
    process.exitCode = 1;
  }
}
