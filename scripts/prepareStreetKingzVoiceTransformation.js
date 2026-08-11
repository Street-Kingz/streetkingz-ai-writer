import { readFile, mkdir, writeFile } from "node:fs/promises";
import { canonicalize, sha256 } from "../research/core/canonical.js";
import { buildVoiceTransformationInput, validateVoiceTransformationInput } from "../voice/transformation.js";
import { buildDryingTowelConceptPolicy, validateConceptOwnership } from "../editorial/concept-ownership.js";

const root = "artifacts/cornerstone/best-car-drying-towel";
const approvedDirectory = "artifacts/voice/street-kingz-founder-v1/approved-v1.1.0-001";
const output = `${root}/voice-transformation-v1/preparation-002`;
const paths = {
  voiceProfile: `${approvedDirectory}/approved-voice-profile.json`, approvalRecord: `${approvedDirectory}/approval-record.json`,
  sourcePage: `${root}/component-revision-v1/deterministic-acceptance-001/semantic-page.json`,
  strategy: `${root}/strategy-v1/gpt-5.6-sol/call_002/strategy.json`, researchPacket: `${root}/fixture-v1/research-packet.json`,
  pagePlan: `${root}/component-draft-v1/approved-page-plan.json`
};
const loaded = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, JSON.parse(await readFile(path, "utf8"))])));
const conceptPolicy = buildDryingTowelConceptPolicy(loaded.pagePlan);
const conceptValidation = validateConceptOwnership(loaded.sourcePage, conceptPolicy);
if (conceptValidation.status !== "PASS") throw new Error(JSON.stringify(conceptValidation.errors));
const input = buildVoiceTransformationInput({ ...loaded, conceptPolicy });
const validation = validateVoiceTransformationInput(input);
if (validation.status !== "PASS") throw new Error(JSON.stringify(validation.errors));
await mkdir(output, { recursive: true });
for (const [name, value] of Object.entries({ "transformation-input.json": input, "transformation-input-validation.json": validation, "source-concept-ownership-validation.json": conceptValidation, "run-metadata.json": { schema_version: "1.0.0", artifact_type: "voice_transformation_preparation_run", ai_calls: 0, wordpress_writes: 0, input_sha256: sha256(input), source_paths: paths } })) await writeFile(`${output}/${name}`, `${JSON.stringify(canonicalize(value), null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ output, input_sha256: sha256(input), source_semantic_page_sha256: input.source.semantic_page_sha256, voice_profile_sha256: input.voice.profile_sha256, strategy_sha256: input.strategy.strategy_sha256, research_packet_sha256: input.strategy.research_packet_sha256, validation: validation.status, ai_calls: 0 }, null, 2));
