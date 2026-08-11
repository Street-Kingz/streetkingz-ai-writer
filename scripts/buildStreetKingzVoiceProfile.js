import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalize, sha256 } from "../research/core/canonical.js";
import { STREET_KINGZ_VOICE_SOURCES, buildStreetKingzFounderProfile } from "../voice/street-kingz.js";
import { validateVoiceProfile } from "../voice/profile.js";
import { diagnoseVoiceMismatch } from "../voice/diagnostic.js";

const output = "artifacts/voice/street-kingz-founder-v1/observed-v1";
const pagePath = "artifacts/cornerstone/best-car-drying-towel/component-revision-v1/deterministic-acceptance-001/semantic-page.json";
await mkdir(output, { recursive: true });
const page = JSON.parse(await readFile(pagePath, "utf8"));
const profile = buildStreetKingzFounderProfile();
const validation = validateVoiceProfile(profile, STREET_KINGZ_VOICE_SOURCES);
if (validation.status !== "PASS") throw new Error(JSON.stringify(validation.errors));
profile.diagnostic_source_hash = sha256(page);
const diagnostic = diagnoseVoiceMismatch(page, profile);
const audit = {
  schema_version: "1.0.0", artifact_type: "street_kingz_voice_corpus_audit",
  existing_analyser_found: false,
  searched_locations: ["repository tracked files", "repository artifacts", "repository working tree"],
  genuine_transcript_sources: 0,
  genuine_written_sources: STREET_KINGZ_VOICE_SOURCES.filter((item) => item.eligible_for_voice_analysis && item.mode === "written").length,
  excluded_sources: STREET_KINGZ_VOICE_SOURCES.filter((item) => !item.eligible_for_voice_analysis).map((item) => ({ source_id: item.source_id, reason: item.exclusion_reason })),
  note: "No prior transcript/video analysis implementation or corpus was present. Existing AI-assisted editorial pages and uncertain catalogue copy were excluded."
};
const onboarding = {
  schema_version: "1.0.0", artifact_type: "voice_onboarding_capabilities",
  imports: ["website_content", "writing_samples", "transcripts", "social_email_content", "questionnaire", "free_writing"],
  optional_sources: true,
  insufficient_corpus: { action: "use_configurable_default_or_collect_more", automatic_personal_profile: false },
  reports: ["corpus_strength", "source_diversity", "confidence", "weak_areas", "additional_sample_value"]
};
for (const [name, value] of Object.entries({ "source-corpus.json": STREET_KINGZ_VOICE_SOURCES, "corpus-audit.json": audit, "voice-profile.json": profile, "profile-validation.json": validation, "current-article-diagnostic.json": diagnostic, "onboarding-capabilities.json": onboarding }))
  await writeFile(join(output, name), `${JSON.stringify(canonicalize(value), null, 2)}\n`, { flag: "wx" }).catch((error) => { if (error.code !== "EEXIST") throw error; });
console.log(JSON.stringify({ output, profile_id: profile.profile_id, state: profile.state, profile_hash: sha256(profile), sources: STREET_KINGZ_VOICE_SOURCES.length, usable_words: profile.corpus_assessment.usable_words, diagnostic_findings: diagnostic.findings.length }, null, 2));
