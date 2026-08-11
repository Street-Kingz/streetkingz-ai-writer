import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { deriveCornerstoneStrategyAllowlists } from "../cornerstone/strategy-allowlists.js";
import { buildEditorialPagePlan } from "../editorial/plan.js";
import { renderEditorialPagePlan } from "../editorial/render.js";
import { validateEditorialPagePlan } from "../editorial/validation.js";

const packetPath = path.resolve(process.env.EDITORIAL_PACKET_PATH || "artifacts/cornerstone/best-car-drying-towel/fixture-v1/research-packet.json");
const strategyPath = path.resolve(process.env.EDITORIAL_STRATEGY_PATH || "artifacts/cornerstone/best-car-drying-towel/strategy-v1/gpt-5.6-sol/call_002/strategy.json");
const outputDirectory = path.resolve(process.env.EDITORIAL_PLAN_OUTPUT || "artifacts/cornerstone/best-car-drying-towel/component-page-plan-v1");
const [packet, strategy] = await Promise.all([readFile(packetPath, "utf8").then(JSON.parse), readFile(strategyPath, "utf8").then(JSON.parse)]);
const allowlists = deriveCornerstoneStrategyAllowlists(packet);
const plan = buildEditorialPagePlan({ packet, strategy });
const errors = validateEditorialPagePlan(plan, allowlists);
if (errors.length) throw Object.assign(new Error("Editorial page plan failed validation."), { validation_errors: errors });
await mkdir(outputDirectory, { recursive: false });
const validation = { schema_version: "1.0.0", artifact_type: "editorial_page_plan_validation", status: "PASS", errors: [], drafting_authorised: false, publication_authorised: false };
await Promise.all([
  writeFile(path.join(outputDirectory, "page-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
  writeFile(path.join(outputDirectory, "page-plan.md"), renderEditorialPagePlan(plan, allowlists), { encoding: "utf8", flag: "wx" }),
  writeFile(path.join(outputDirectory, "page-plan-validation.json"), `${JSON.stringify(validation, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
  writeFile(path.join(outputDirectory, "run-metadata.json"), `${JSON.stringify({ schema_version: "1.0.0", artifact_type: "editorial_page_plan_run_metadata", packet_path: path.relative(process.cwd(), packetPath), strategy_path: path.relative(process.cwd(), strategyPath), plan_id: plan.plan_id, deterministic_content_sha256: plan.deterministic_content_sha256, ai_calls: 0, wordpress_writes: 0 }, null, 2)}\n`, { encoding: "utf8", flag: "wx" })
]);
console.log(JSON.stringify({ output_directory: outputDirectory, plan_id: plan.plan_id, components: plan.components.map((item) => item.component_type), validation: "PASS" }, null, 2));
