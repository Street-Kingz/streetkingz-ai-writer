import { wordpressReadConfig } from "../cms/wordpressAuthoritativeReader.js";
import { ingestProductEvidence } from "../product-intelligence/ingestion.js";
import { createStreetKingzSourceReaders } from "../product-intelligence/streetKingzSources.js";

const productUrl = process.argv[2];
if (!productUrl) {
  console.error("Usage: npm run product-intelligence:evidence -- <street-kingz-product-url>");
  process.exitCode = 1;
} else {
  try {
    const readers = createStreetKingzSourceReaders({ wordpressConfig: wordpressReadConfig() });
    const result = await ingestProductEvidence(productUrl, readers);
    console.log(JSON.stringify({
      run_directory: result.paths.runDirectory,
      raw_woocommerce: result.paths.rawWooCommerce,
      raw_rendered_page: result.paths.rawRenderedPage,
      raw_evidence: result.paths.evidence,
      run_metadata: result.paths.runMetadata,
      evidence_counts: result.artifact.execution_metadata.evidence_counts,
      conflict_count: result.artifact.conflict_candidates.length,
      external_reads: result.artifact.execution_metadata.external_api_call_count,
      ai_calls: 0,
      writes: 0
    }, null, 2));
  } catch (error) {
    console.error(`Product Intelligence evidence ingestion failed: ${error.message}`);
    process.exitCode = 1;
  }
}

