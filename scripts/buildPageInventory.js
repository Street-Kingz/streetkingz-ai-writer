import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildInterpretationContext } from "../interpretation/context.js";

const [researchStatePath, evidencePath, requestedOutputRoot] = process.argv.slice(2);
if (!researchStatePath || !evidencePath) {
  console.error("Usage: node scripts/buildPageInventory.js <research-state.json> <evidence.json> [output-root]");
  process.exitCode = 1;
} else {
  try {
    const [researchState, evidence] = await Promise.all([
      readFile(path.resolve(researchStatePath), "utf8").then(JSON.parse),
      readFile(path.resolve(evidencePath), "utf8").then(JSON.parse)
    ]);
    const context = buildInterpretationContext({ researchState, evidence });
    const outputRoot = path.resolve(requestedOutputRoot || "artifacts/page-inventory");
    const productSlug = new URL(context.source_product.product_url).pathname.split("/").filter(Boolean).at(-1);
    const outputDirectory = path.join(outputRoot, productSlug, context.objective.type, context.current_page_inventory.inventory_id);
    const inventoryPath = path.join(outputDirectory, "current-page-inventory.json");
    const gapMatrixPath = path.join(outputDirectory, "gap-matrix.json");
    await mkdir(outputDirectory, { recursive: true });
    await Promise.all([
      writeFile(inventoryPath, `${JSON.stringify(context.current_page_inventory, null, 2)}\n`, "utf8"),
      writeFile(gapMatrixPath, `${JSON.stringify(context.gap_matrix, null, 2)}\n`, "utf8")
    ]);
    console.log(`Current Page Inventory: ${inventoryPath}`);
    console.log(`Gap Matrix: ${gapMatrixPath}`);
  } catch (error) {
    console.error(`Page inventory build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
