import { readFile, mkdir, writeFile } from "node:fs/promises";
import { canonicalize, sha256 } from "../research/core/canonical.js";
import { approveVoiceProfile, validateVoiceProfile } from "../voice/profile.js";
import { importVoiceCorpus } from "../voice/import.js";
import { STREET_KINGZ_VOICE_SOURCES } from "../voice/street-kingz.js";
import { buildVoiceTransformationInput, validateVoiceTransformationInput } from "../voice/transformation.js";
import { buildDryingTowelConceptPolicy, validateConceptOwnership } from "../editorial/concept-ownership.js";

const observedDirectory = "artifacts/voice/street-kingz-founder-v1/observed-v2-imported-corpus-001";
const approvedDirectory = "artifacts/voice/street-kingz-founder-v1/approved-v1.1.0-001";
const preparationDirectory = "artifacts/cornerstone/best-car-drying-towel/voice-transformation-v1/preparation-001";
const sourcePagePath = "artifacts/cornerstone/best-car-drying-towel/component-revision-v1/deterministic-acceptance-001/semantic-page.json";
const strategyPath = "artifacts/cornerstone/best-car-drying-towel/strategy-v1/gpt-5.6-sol/call_002/strategy.json";
const packetPath = "artifacts/cornerstone/best-car-drying-towel/fixture-v1/research-packet.json";
const pagePlanPath = "artifacts/cornerstone/best-car-drying-towel/component-draft-v1/approved-page-plan.json";
const importedArtifact = JSON.parse(await readFile("imports/voice/street-kingz/voice-corpus.json", "utf8"));
const imported = importVoiceCorpus(importedArtifact);
const sources = [...imported.sources, ...STREET_KINGZ_VOICE_SOURCES.filter((source) => source.eligible_for_voice_analysis)];
const observedProfile = JSON.parse(await readFile(`${observedDirectory}/voice-profile.json`, "utf8"));
const approvalText = "I approve street-kingz-founder-v1 v1.1.0 as the active human-approved Street Kingz VoiceProfile, with the SIMPLICITY / CONTRAST amendment.";
const amendment = {
  rule_id: "sk_human_rule_simplicity_contrast_v1",
  rule: "Where natural, explain decisions by contrasting the straightforward, practical option with unnecessary complication. Use the contrast to clarify what matters, distinguish useful specifications from impressive-sounding numbers, prefer the practical answer when complexity adds little value, and challenge detailing theatre only when evidence supports it. Do not repeat it as a catchphrase, force it into every section, manufacture arguments, attack other brands or make unsupported claims."
};
const approvedAt = new Date().toISOString();
const approvedProfile = approveVoiceProfile(observedProfile, [amendment], { reviewer: "Ben", reviewedAt: approvedAt });
approvedProfile.profile_version = "1.1.0";
approvedProfile.approval.approval_text_sha256 = sha256(approvalText);
approvedProfile.approval.human_amendment_ids = [amendment.rule_id];
const approvalValidation = validateVoiceProfile(approvedProfile, sources);
if (approvalValidation.status !== "PASS") throw new Error(JSON.stringify(approvalValidation.errors));
const approvalRecord = {
  schema_version: "1.0.0", artifact_type: "site_voice_profile_human_approval", status: "HUMAN_APPROVED",
  profile_id: approvedProfile.profile_id, profile_version: approvedProfile.profile_version,
  observed_profile_sha256: sha256(observedProfile), approved_profile_sha256: sha256(approvedProfile),
  reviewer: "Ben", approved_at: approvedAt, approval_text: approvalText, approval_text_sha256: sha256(approvalText),
  amendment, observed_evidence_changed: false, historical_artifacts_changed: false
};
const siteSelection = { schema_version: "1.0.0", artifact_type: "site_voice_profile_selection", site_id: "street-kingz", state: "active", voice_profile_id: approvedProfile.profile_id, voice_profile_version: approvedProfile.profile_version, approved_profile_sha256: sha256(approvedProfile), approval_record_sha256: sha256(approvalRecord) };
await mkdir(approvedDirectory, { recursive: true });
for (const [name, value] of Object.entries({ "approved-voice-profile.json": approvedProfile, "approval-record.json": approvalRecord, "approval-validation.json": approvalValidation, "site-voice-selection.json": siteSelection })) await writeFile(`${approvedDirectory}/${name}`, `${JSON.stringify(canonicalize(value), null, 2)}\n`, { flag: "wx" });

const [sourcePage, strategy, researchPacket, pagePlan] = await Promise.all([sourcePagePath, strategyPath, packetPath, pagePlanPath].map((path) => readFile(path, "utf8").then(JSON.parse)));
const conceptPolicy = buildDryingTowelConceptPolicy(pagePlan);
const conceptValidation = validateConceptOwnership(sourcePage, conceptPolicy);
if (conceptValidation.status !== "PASS") throw new Error(`Source concept policy failed: ${JSON.stringify(conceptValidation.errors)}`);
const transformationInput = buildVoiceTransformationInput({ sourcePage, voiceProfile: approvedProfile, strategy, researchPacket, pagePlan, conceptPolicy, approvalRecord });
const transformationValidation = validateVoiceTransformationInput(transformationInput);
if (transformationValidation.status !== "PASS") throw new Error(JSON.stringify(transformationValidation.errors));
await mkdir(preparationDirectory, { recursive: true });
for (const [name, value] of Object.entries({ "transformation-input.json": transformationInput, "transformation-input-validation.json": transformationValidation, "source-concept-ownership-validation.json": conceptValidation, "run-metadata.json": { schema_version: "1.0.0", artifact_type: "voice_transformation_preparation_run", prepared_at: approvedAt, ai_calls: 0, wordpress_writes: 0, input_sha256: sha256(transformationInput), source_page_path: sourcePagePath, approved_profile_path: `${approvedDirectory}/approved-voice-profile.json` } })) await writeFile(`${preparationDirectory}/${name}`, `${JSON.stringify(canonicalize(value), null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ approvedDirectory, preparationDirectory, observed_profile_sha256: sha256(observedProfile), approved_profile_sha256: sha256(approvedProfile), human_rules: approvedProfile.human_rules.length, observed_patterns: approvedProfile.observations.length, adaptations: approvedProfile.editorial_adaptations.length, source_semantic_page_sha256: sha256(sourcePage), transformation_validation: transformationValidation.status, ai_calls: 0 }, null, 2));
