import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sha256 } from "../research/core/canonical.js";
import { approveVoiceProfile, resolveSiteVoiceProfile, validateVoiceProfile } from "../voice/profile.js";
import { buildVoiceTransformationInput, validateVoiceTransformationInput } from "../voice/transformation.js";
import { importVoiceCorpus } from "../voice/import.js";
import { STREET_KINGZ_VOICE_SOURCES } from "../voice/street-kingz.js";
import { buildDryingTowelConceptPolicy } from "../editorial/concept-ownership.js";

const ROOT = "artifacts/cornerstone/best-car-drying-towel";
const loadJson = (path) => readFile(path, "utf8").then(JSON.parse);
async function context() {
  const [observed, corpus, sourcePage, strategy, researchPacket, pagePlan] = await Promise.all([
    loadJson("artifacts/voice/street-kingz-founder-v1/observed-v2-imported-corpus-001/voice-profile.json"),
    loadJson("imports/voice/street-kingz/voice-corpus.json"), loadJson(`${ROOT}/component-revision-v1/deterministic-acceptance-001/semantic-page.json`),
    loadJson(`${ROOT}/strategy-v1/gpt-5.6-sol/call_002/strategy.json`), loadJson(`${ROOT}/fixture-v1/research-packet.json`), loadJson(`${ROOT}/component-draft-v1/approved-page-plan.json`)
  ]);
  const imported = importVoiceCorpus(corpus); const sources = [...imported.sources, ...STREET_KINGZ_VOICE_SOURCES.filter((item) => item.eligible_for_voice_analysis)];
  const amendment = { rule_id: "simplicity", rule: "Contrast the practical option with unnecessary complication only where natural and evidence-safe." };
  const approved = approveVoiceProfile(observed, [amendment], { reviewer: "owner", reviewedAt: "2026-08-10T12:00:00Z" });
  return { observed, sources, approved, voiceProfile: approved, sourcePage, strategy, researchPacket, pagePlan, conceptPolicy: buildDryingTowelConceptPolicy(pagePlan), approvalRecord: { status: "HUMAN_APPROVED" } };
}

test("approval preserves observed artifact by hash and creates a separate approved profile", async () => { const c = await context(); const before = sha256(c.observed); assert.equal(c.approved.observed_profile_hash, before); assert.equal(sha256(c.observed), before); assert.equal(c.approved.state, "approved"); });
test("approved profile separates observed patterns adaptations and human rules", async () => { const c = await context(); assert.ok(c.approved.observations.every((item) => item.classification.endsWith("OBSERVED_PATTERN"))); assert.ok(c.approved.editorial_adaptations.every((item) => item.classification === "EDITORIAL_ADAPTATION")); assert.ok(c.approved.human_rules.every((item) => item.classification === "EXPLICIT_HUMAN_RULE" && item.source_ids.length === 0)); assert.ok(c.approved.human_rules.some((item) => item.rule_id === "simplicity")); assert.equal(validateVoiceProfile(c.approved, c.sources).status, "PASS"); });
test("simplicity amendment is not reclassified as corpus observation", async () => { const c = await context(); assert.equal(c.approved.observations.some((item) => /unnecessary complication/.test(item.rule)), false); assert.equal(c.approved.human_rules.some((item) => /unnecessary complication/.test(item.rule)), true); });
test("approved profile resolves as active while observed profile remains unavailable", async () => { const c = await context(); assert.equal(resolveSiteVoiceProfile({ editorial: { voice_profile_id: c.approved.profile_id } }, [c.approved]).mode, "approved_profile"); assert.throws(() => resolveSiteVoiceProfile({ editorial: { voice_profile_id: c.observed.profile_id } }, [c.observed]), /not human-approved/); });
test("transformation preparation binds source profile strategy structure and references", async () => { const c = await context(); const input = buildVoiceTransformationInput(c); const result = validateVoiceTransformationInput(input); assert.equal(result.status, "PASS", JSON.stringify(result.errors)); assert.equal(input.ai_call_authorised, false); assert.equal(input.fact_lock.founder_fact_ids.length, 0); assert.deepEqual(input.structure_lock.component_sequence, c.sourcePage.components.map((item) => ({ component_id: item.component_id, component_type: item.component_type }))); });
test("transformation preparation fails closed on source structure reference and authority drift", async () => { const c = await context(); const input = buildVoiceTransformationInput(c); input.structure_lock.component_sequence.reverse(); input.reference_lock.product_ids[4].values.push("invented"); input.ai_call_authorised = true; const codes = validateVoiceTransformationInput(input).errors.map((item) => item.code); assert.ok(codes.includes("STRUCTURE_DRIFT")); assert.ok(codes.includes("REFERENCE_DRIFT")); assert.ok(codes.includes("AUTHORITY")); });
test("transformation embeds and hashes the bounded research packet", async () => { const c = await context(); const input = buildVoiceTransformationInput(c); assert.deepEqual(input.strategy.research_packet, c.researchPacket); input.strategy.research_packet.identity.topic = "drift"; assert.ok(validateVoiceTransformationInput(input).errors.some((item) => item.code === "RESEARCH_PACKET_HASH")); });
test("generic transformation core has no site product template topic or platform dependency", async () => { const code = (await readFile("voice/transformation.js", "utf8")).toLowerCase(); for (const term of ["street kingz", "ben", "product 70", "template 2003", "drying towel", "tiktok"]) assert.equal(code.includes(term), false, term); });
