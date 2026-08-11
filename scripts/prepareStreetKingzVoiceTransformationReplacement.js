import { readFile, mkdir, writeFile } from "node:fs/promises";
import { canonicalize, sha256 } from "../research/core/canonical.js";
import { buildVoiceTransformationInput, validateVoiceTransformationInput } from "../voice/transformation.js";
import { buildDryingTowelConceptPolicy, validateConceptOwnership } from "../editorial/concept-ownership.js";

const root = "artifacts/cornerstone/best-car-drying-towel";
const output = `${root}/voice-transformation-v1/preparation-003`;
const paths = {
  voiceProfile: "artifacts/voice/street-kingz-founder-v1/approved-v1.1.0-001/approved-voice-profile.json",
  approvalRecord: "artifacts/voice/street-kingz-founder-v1/approved-v1.1.0-001/approval-record.json",
  sourcePage: `${root}/component-revision-v1/deterministic-acceptance-001/semantic-page.json`,
  strategy: `${root}/strategy-v1/gpt-5.6-sol/call_002/strategy.json`,
  researchPacket: `${root}/fixture-v1/research-packet.json`,
  pagePlan: `${root}/component-draft-v1/approved-page-plan.json`
};
const loaded = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, file]) => [key, JSON.parse(await readFile(file, "utf8"))])));
const conceptPolicy = buildDryingTowelConceptPolicy(loaded.pagePlan);
const conceptValidation = validateConceptOwnership(loaded.sourcePage, conceptPolicy);
if (conceptValidation.status !== "PASS") throw new Error(JSON.stringify(conceptValidation.errors));
const input = buildVoiceTransformationInput({ ...loaded, conceptPolicy });
const validation = validateVoiceTransformationInput(input);
if (validation.status !== "PASS") throw new Error(JSON.stringify(validation.errors));
const previousCall = {
  schema_version: "1.0.0",
  artifact_type: "voice_transformation_failure_classification",
  call_directory: `${root}/voice-transformation-v1/gpt-5.6-sol/call_001`,
  classification: "FAILED_AS_DESIGNED",
  immutable: true,
  reasons: [
    { code: "MEDIA_DRIFT", detail: "The model was previously asked to reproduce source-owned media_requirements." },
    { code: "LEGALISTIC_REGISTER_REMAINED", detail: "Known evidence-process wording survived the editorial rewrite." }
  ],
  corrective_boundary: "Model controls visible editorial prose only; source-owned metadata is deterministically reattached after parsing."
};
await mkdir(output, { recursive: true });
const artifacts = {
  "transformation-input.json": input,
  "transformation-input-validation.json": validation,
  "source-concept-ownership-validation.json": conceptValidation,
  "previous-call-001-classification.json": previousCall,
  "replacement-readiness.json": {
    schema_version: "1.0.0", artifact_type: "voice_transformation_replacement_readiness", ai_calls: 0, retries: 0,
    source_semantic_page_sha256: input.source.semantic_page_sha256,
    voice_profile_sha256: input.voice.profile_sha256,
    media_model_authority: false,
    deterministic_locks: input.transformation_boundary.deterministic_source_fields,
    legalistic_register_protection: true,
    prepared_for_exactly_one_call: true
  },
  "run-metadata.json": { schema_version: "1.0.0", artifact_type: "voice_transformation_preparation_run", ai_calls: 0, wordpress_writes: 0, writer_executions: 0, publication_attempts: 0, input_sha256: sha256(input), source_paths: paths }
};
for (const [name, value] of Object.entries(artifacts)) await writeFile(`${output}/${name}`, `${JSON.stringify(canonicalize(value), null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ output, input_sha256: sha256(input), source_semantic_page_sha256: input.source.semantic_page_sha256, voice_profile_sha256: input.voice.profile_sha256, validation: validation.status, ai_calls: 0 }, null, 2));
