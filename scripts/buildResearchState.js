import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { aggregateResearchEvidence } from "../research/aggregation/researchState.js";
import { renderResearchStateMarkdown } from "../research/renderers/researchState.js";

function productSlug(url) {
  return new URL(url).pathname.split("/").filter(Boolean).at(-1);
}

const [evidencePath, objective, requestedOutputRoot] = process.argv.slice(2);
if (!evidencePath || !objective) {
  console.error("Usage: npm run research:aggregate -- <evidence.json> <objective> [output-root]");
  process.exitCode = 1;
} else {
  try {
    const evidence = JSON.parse(await readFile(path.resolve(evidencePath), "utf8"));
    const state = aggregateResearchEvidence({ evidence, objective });
    const outputRoot = path.resolve(requestedOutputRoot || "artifacts/research-state");
    const outputDirectory = path.join(outputRoot, productSlug(state.subject.product_url), objective, state.research_state_id);
    const researchStatePath = path.join(outputDirectory, "research-state.json");
    const summaryPath = path.join(outputDirectory, "research-state.md");
    await mkdir(outputDirectory, { recursive: true });
    await Promise.all([
      writeFile(researchStatePath, `${JSON.stringify(state, null, 2)}\n`, "utf8"),
      writeFile(summaryPath, renderResearchStateMarkdown(state), "utf8")
    ]);
    console.log(`Objective: ${state.objective.type}`);
    console.log(`Sufficiency: ${state.sufficiency.state}`);
    console.log(`Interpretation may proceed: ${state.sufficiency.interpretation_may_proceed}`);
    console.log(`Source evidence records: ${state.source_evidence.record_count}`);
    console.log(`Aggregated groups: ${state.keyword_topic_groups.length}`);
    console.log(`Duplicate relationships collapsed: ${state.search_console_relationships.duplicate_relationships_collapsed}`);
    console.log(`Research-state artifact: ${researchStatePath}`);
    console.log(`Human-readable artifact: ${summaryPath}`);
  } catch (error) {
    console.error(`Research-state aggregation failed: ${error.message}`);
    if (error.errors) console.error(error.errors.join("\n"));
    process.exitCode = 1;
  }
}
