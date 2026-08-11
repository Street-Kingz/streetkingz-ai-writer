import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalize, sha256 } from "../research/core/canonical.js";
import { importVoiceCorpus } from "../voice/import.js";
import { STREET_KINGZ_VOICE_SOURCES, buildExpandedStreetKingzFounderProfile } from "../voice/street-kingz.js";
import { validateVoiceProfile } from "../voice/profile.js";
import { diagnoseVoiceMismatch } from "../voice/diagnostic.js";
import { renderVoiceProfileReview } from "../voice/review.js";

const importPath = "imports/voice/street-kingz/voice-corpus.json";
const output = "artifacts/voice/street-kingz-founder-v1/observed-v2-imported-corpus-001";
const articlePath = "artifacts/cornerstone/best-car-drying-towel/component-revision-v1/deterministic-acceptance-001/semantic-page.json";
const artifact = JSON.parse(await readFile(importPath, "utf8"));
const imported = importVoiceCorpus(artifact);
const { profile, sources, analysis } = buildExpandedStreetKingzFounderProfile(imported.sources);
const article = JSON.parse(await readFile(articlePath, "utf8"));
profile.diagnostic_source_hash = sha256(article);
const diagnostic = diagnoseVoiceMismatch(article, profile);
diagnostic.first_person_opportunities = [{ path: "$.components[4].data.relevance_reason", direction: "Keep the founder's direct judgement, but replace detached proof language with a plain statement of the product's fit and trade-off." }];
diagnostic.unnecessary_first_person_opportunities = [{ paths: ["$.components[2].data.cards", "$.components[5].data"], direction: "Criteria definitions and practical steps do not need extra first person; direct neutral explanation is more natural here." }];
diagnostic.too_technical_findings = diagnostic.findings.filter((item) => item.pattern_id === "technical_without_practical_payoff").length;
diagnostic.legalistic_or_rigid_findings = diagnostic.findings.filter((item) => ["detached_evidentiary", "legalistic_absence", "formal_proof_language", "nominalised_formality"].includes(item.pattern_id)).length;
const validation = validateVoiceProfile(profile, sources);
if (validation.status !== "PASS") throw new Error(JSON.stringify(validation.errors));
const written = STREET_KINGZ_VOICE_SOURCES.filter((source) => source.eligible_for_voice_analysis);
const importAudit = {
  schema_version: "1.0.0", artifact_type: "voice_corpus_import_audit", source_artifact: importPath,
  source_artifact_modified: false, semantic_sha256: imported.semantic_sha256, validation: imported.validation,
  imported: imported.validation.metrics,
  existing_written_assessment: written.map((source) => ({ source_id: source.source_id, retained: true, authorship_class: source.authorship_class, mode: source.mode, words: source.approximate_words, influence_tier: source.influence_tier, limitation: source.naturalness })),
  combined: analysis.modalities,
  excluded_upstream: imported.export_summary.excluded,
  excluded_existing: STREET_KINGZ_VOICE_SOURCES.filter((source) => !source.eligible_for_voice_analysis).map((source) => ({ source_id: source.source_id, reason: source.exclusion_reason }))
};
const adaptation = {
  schema_version: "1.0.0", artifact_type: "spoken_to_written_adaptation", profile_id: profile.profile_id,
  profile_version: profile.profile_version,
  natural_communication: profile.spoken_written_comparison,
  rule: profile.observations.find((item) => item.classification === "EDITORIAL_ADAPTATION"),
  factual_boundary: profile.founder_fact_policy
};
const files = {
  "import-validation.json": imported.validation,
  "import-audit.json": importAudit,
  "deterministic-analysis.json": analysis,
  "voice-profile.json": profile,
  "profile-validation.json": validation,
  "spoken-written-adaptation.json": adaptation,
  "voice-profile-review.md": renderVoiceProfileReview(profile),
  "current-article-diagnostic.json": diagnostic,
  "run-metadata.json": { schema_version: "1.0.0", artifact_type: "voice_profile_build_run", mode: "offline_deterministic", ai_calls: 0, wordpress_writes: 0, source_semantic_sha256: imported.semantic_sha256, profile_hash: sha256(profile) }
};
await mkdir(output, { recursive: true });
for (const [name, value] of Object.entries(files)) {
  const body = typeof value === "string" ? value : `${JSON.stringify(canonicalize(value), null, 2)}\n`;
  await writeFile(join(output, name), body, { flag: "wx" }).catch((error) => { if (error.code !== "EEXIST") throw error; });
}
console.log(JSON.stringify({ output, profile_id: profile.profile_id, profile_version: profile.profile_version, profile_hash: sha256(profile), import: imported.validation.metrics, combined: analysis.modalities, observations: Object.fromEntries(["STRONG_OBSERVED_PATTERN", "MODERATE_OBSERVED_PATTERN", "WEAK_OBSERVED_PATTERN"].map((kind) => [kind, profile.observations.filter((item) => item.classification === kind).length])), diagnostic_findings: diagnostic.findings.length }, null, 2));
