import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCornerstoneBrief, buildCornerstoneResearchPacket } from "../cornerstone/builder.js";
import { renderCornerstoneBrief } from "../cornerstone/render.js";
import { assertCornerstoneValid, validateCornerstoneBrief, validateCornerstoneResearchPacket } from "../cornerstone/validation.js";

const evidencePath = "artifacts/live-validation/dataforseo-keyword-ideas-2026-08-08/heavy-duty-drying-towel-1200gsm/run_2026-08-08T07-22-30-159Z_b9eff88a/evidence.json";
const researchStatePath = "artifacts/live-validation/research-state-2026-08-08/heavy-duty-drying-towel-1200gsm/create_supporting_content/research_state_da50a19ba60e6b045635c6eb/research-state.json";
const outputDirectory = "artifacts/cornerstone/best-car-drying-towel/fixture-v1";

const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
const researchState = JSON.parse(await readFile(researchStatePath, "utf8"));
const generatedAt = "2026-08-09T00:00:00.000Z";
const packet = buildCornerstoneResearchPacket({ evidence, researchState, topic: "Choosing the best car drying towel", primaryQuery: "best car drying towel", proposedUrl: "https://streetkingz.co.uk/guides/best-car-drying-towel/", generatedAt });
assertCornerstoneValid("Research packet", packet, validateCornerstoneResearchPacket, { evidence, researchState });
const brief = buildCornerstoneBrief(packet);
assertCornerstoneValid("Cornerstone brief", brief, validateCornerstoneBrief, { packet, evidence });

await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "research-packet.json"), `${JSON.stringify(packet, null, 2)}\n`, { flag: "wx" });
await writeFile(path.join(outputDirectory, "cornerstone-brief.json"), `${JSON.stringify(brief, null, 2)}\n`, { flag: "wx" });
await writeFile(path.join(outputDirectory, "cornerstone-brief.md"), renderCornerstoneBrief(brief), { flag: "wx" });
console.log(JSON.stringify({ output_directory: outputDirectory, packet_id: packet.packet_id, brief_id: brief.brief_id, article_drafted: false }, null, 2));
