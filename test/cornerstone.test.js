import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildCornerstoneBrief, buildCornerstoneResearchPacket } from "../cornerstone/builder.js";
import { renderCornerstoneBrief } from "../cornerstone/render.js";
import { validateCornerstoneBrief, validateCornerstoneResearchPacket } from "../cornerstone/validation.js";

const evidencePath = new URL("../artifacts/live-validation/dataforseo-keyword-ideas-2026-08-08/heavy-duty-drying-towel-1200gsm/run_2026-08-08T07-22-30-159Z_b9eff88a/evidence.json", import.meta.url);
const statePath = new URL("../artifacts/live-validation/research-state-2026-08-08/heavy-duty-drying-towel-1200gsm/create_supporting_content/research_state_da50a19ba60e6b045635c6eb/research-state.json", import.meta.url);
const generatedAt = "2026-08-09T00:00:00.000Z";
const clone = (value) => structuredClone(value);
let sourceEvidence; let sourceState;

async function sources() {
  sourceEvidence ||= JSON.parse(await readFile(evidencePath, "utf8"));
  sourceState ||= JSON.parse(await readFile(statePath, "utf8"));
  return { evidence: clone(sourceEvidence), researchState: clone(sourceState) };
}

function build(evidence, researchState, overrides = {}) {
  const packet = buildCornerstoneResearchPacket({ evidence, researchState, topic: "Choosing the best car drying towel", primaryQuery: "best car drying towel", proposedUrl: "https://streetkingz.co.uk/guides/best-car-drying-towel/", generatedAt, ...overrides });
  return { packet, brief: buildCornerstoneBrief(packet) };
}

test("cornerstone packet and brief satisfy their schemas and evidence references", async () => {
  const inputs = await sources(); const { packet, brief } = build(inputs.evidence, inputs.researchState);
  assert.deepEqual(validateCornerstoneResearchPacket(packet, inputs), []);
  assert.deepEqual(validateCornerstoneBrief(brief, { packet, evidence: inputs.evidence }), []);
  assert.ok(packet.evidence.source_references.length > 0);
});

test("generation is deterministic and volatile time is isolated from deterministic identity", async () => {
  const inputs = await sources(); const first = build(inputs.evidence, inputs.researchState); const second = build(clone(inputs.evidence), clone(inputs.researchState));
  assert.deepEqual(first, second);
  const later = build(clone(inputs.evidence), clone(inputs.researchState), { generatedAt: "2026-08-10T00:00:00.000Z" });
  assert.equal(first.packet.packet_id, later.packet.packet_id);
  assert.equal(first.packet.deterministic_content_sha256, later.packet.deterministic_content_sha256);
  assert.notEqual(first.packet.generated_at, later.packet.generated_at);
});

test("missing primary metrics remain explicit rather than fabricated", async () => {
  const inputs = await sources(); const result = build(inputs.evidence, inputs.researchState, { topic: "Unmeasured washing method", primaryQuery: "unmeasured washing method" });
  assert.equal(result.packet.search_demand.primary_keyword.metrics, null);
  assert.equal(result.brief.search_opportunity.trace_kind, "judgement_required");
});

test("stale evidence is identified deterministically", async () => {
  const inputs = await sources(); const { packet } = build(inputs.evidence, inputs.researchState, { generatedAt: "2028-08-09T00:00:00.000Z" });
  assert.equal(packet.risks.stale_evidence, true);
});

test("duplicate primary and supporting queries fail validation", async () => {
  const inputs = await sources(); const { packet } = build(inputs.evidence, inputs.researchState);
  packet.search_demand.supporting_queries.push({ query: packet.identity.primary_query, metrics: null, evidence_ids: [] });
  assert.ok(validateCornerstoneResearchPacket(packet, inputs).some((error) => error.includes("must be unique")));
});

test("fabricated keyword metrics are rejected against source evidence", async () => {
  const inputs = await sources(); const { packet } = build(inputs.evidence, inputs.researchState);
  packet.search_demand.primary_keyword.metrics.monthly_search_volume += 1;
  assert.ok(validateCornerstoneResearchPacket(packet, inputs).some((error) => error.includes("does not match source evidence")));
});

test("unsupported competitor gap claims are rejected unless judgement-required", async () => {
  const inputs = await sources(); const { packet } = build(inputs.evidence, inputs.researchState);
  packet.competitor_coverage.weak_or_missing_coverage[0].kind = "observed_evidence";
  assert.ok(validateCornerstoneResearchPacket(packet, inputs).some((error) => error.includes("judgement_required")));
});

test("internal-link candidates resolve to site inventory and avoid pagination/tag noise", async () => {
  const inputs = await sources(); const { packet } = build(inputs.evidence, inputs.researchState);
  assert.ok(packet.streetkingz_relevance.possible_internal_links.length > 0);
  assert.ok(packet.streetkingz_relevance.possible_internal_links.every((item) => !/\/page\/\d+|\/product-tag\//.test(item.destination_page)));
  assert.deepEqual(validateCornerstoneResearchPacket(packet, inputs), []);
});

test("cannibalisation focuses on strong query-intent overlap and requests differentiation", async () => {
  const inputs = await sources(); const { packet } = build(inputs.evidence, inputs.researchState);
  assert.equal(packet.risks.cannibalisation.overall_risk, "medium");
  assert.equal(packet.risks.cannibalisation.recommended_action, "human_review_required");
  assert.ok(packet.risks.cannibalisation.conflicts.every((item) => item.recommended_action === "differentiate_intent"));
});

test("empty Search Console evidence produces no links and does not invent absence", async () => {
  const inputs = await sources(); inputs.evidence.records = inputs.evidence.records.filter((r) => !r.evidence_type.startsWith("search_console_"));
  const { packet } = build(inputs.evidence, inputs.researchState);
  assert.deepEqual(packet.streetkingz_relevance.possible_internal_links, []);
  assert.match(packet.risks.cannibalisation.limitation, /not proof/i);
});

test("empty SERP evidence remains valid with explicit competitor uncertainty", async () => {
  const inputs = await sources(); inputs.evidence.records = inputs.evidence.records.filter((r) => !r.evidence_type.startsWith("serp_"));
  const { packet } = build(inputs.evidence, inputs.researchState);
  assert.deepEqual(packet.serp.observed_results, []);
  assert.ok(packet.evidence.unsupported_areas.some((item) => /no organic SERP/i.test(item)));
  assert.deepEqual(validateCornerstoneResearchPacket(packet, inputs), []);
});

test("malformed evidence fixture is rejected before packet construction", async () => {
  const inputs = await sources(); delete inputs.evidence.subject.subject_id;
  assert.throws(() => build(inputs.evidence, inputs.researchState), /failed validation/);
});

test("builder generalises beyond Product 70, template 2003 and drying towels", async () => {
  const inputs = await sources();
  inputs.evidence.evidence_artifact_id = "evidence_generic_category_fixture";
  inputs.evidence.subject = { ...inputs.evidence.subject, subject_id: "category_alloy_care", product_url: "https://example.test/category/alloy-care/", product_name: "Alloy care", product_type: "Vehicle wheel care" };
  for (const record of inputs.evidence.records) record.subject_id = "category_alloy_care";
  inputs.researchState.source_evidence.evidence_artifact_id = inputs.evidence.evidence_artifact_id;
  inputs.researchState.subject = clone(inputs.evidence.subject);
  const { packet } = build(inputs.evidence, inputs.researchState, { topic: "Cleaning alloy wheels", primaryQuery: "how to clean alloy wheels", proposedUrl: "https://example.test/guides/clean-alloy-wheels/" });
  assert.equal(packet.identity.topic, "Cleaning alloy wheels");
  assert.equal(packet.identity.primary_query, "how to clean alloy wheels");
  assert.doesNotMatch(JSON.stringify({ identity: packet.identity, intent: packet.intent }), /product.?70|template.?2003/i);
});

test("Markdown rendering is decision-oriented and does not draft an article", async () => {
  const inputs = await sources(); const { brief } = build(inputs.evidence, inputs.researchState); const markdown = renderCornerstoneBrief(brief);
  for (const heading of ["Opportunity", "Search Intent", "SERP Evidence", "Content Gaps", "Recommended Structure", "Do Cover", "Do Not Cover", "Open Questions", "Confidence / Risks"]) assert.match(markdown, new RegExp(`## ${heading.replace("/", "\\/")}`));
  assert.match(markdown, /awaiting_human_review/);
  assert.ok(markdown.length < 20000);
});
