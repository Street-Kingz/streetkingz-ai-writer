import { writeRun } from "../validation/v1-01/progressive.js";
const result = writeRun();
console.log(JSON.stringify({ status: "COMPLETE_WITH_LIMITED_ENRICHMENT", sparse: result.sparse.length, enriched: result.enriched.length, top: result.enriched[0].id }));
