import test from "node:test";
import assert from "node:assert/strict";
import { aggregateResearchEvidence, OBJECTIVE_CONTRACTS } from "../research/aggregation/researchState.js";
import { renderResearchStateMarkdown } from "../research/renderers/researchState.js";
import { validateResearchState } from "../research/validation/evidence.js";

const RAW = { path: "fixture://raw.json", sha256: "a".repeat(64) };
const SUBJECT = "product_fixture";

function record({ id, provider, type, value, parents = [], query = null }) {
  return {
    evidence_id: id,
    provider_id: provider,
    provider_run_id: `run_${provider}`,
    evidence_type: type,
    subject_id: SUBJECT,
    seed_ids: [],
    query_or_question: query,
    value,
    context: { market: "GB", language: "en-GB" },
    observed_at: "2026-08-01T00:00:00.000Z",
    retrieved_at: "2026-08-08T00:00:00.000Z",
    provenance: {
      provider_id: provider,
      provider_version: "1.0.0",
      source_owner: "Fixture",
      source_url: "https://example.test/source",
      source_record_id: id,
      query_seed: query,
      market: "GB",
      language: "en-GB",
      observed_at: "2026-08-01T00:00:00.000Z",
      retrieved_at: "2026-08-08T00:00:00.000Z",
      raw_artifact: RAW,
      locator: { type: "json_pointer", value: `/records/${id}` },
      extraction_method: "fixture",
      normaliser_version: "1.0.0",
      parent_evidence_ids: parents
    },
    confidence: { score: 0.8 },
    raw_ref: RAW,
    normaliser_version: "1.0.0",
    status: "active"
  };
}

function providerRun(provider, count, status = "complete") {
  return {
    provider_id: provider,
    provider_version: "1.0.0",
    provider_run_id: `run_${provider}`,
    request_fingerprint: `fingerprint_${provider}`,
    status,
    normalised_artifact: { path: `fixture://${provider}.json`, sha256: "b".repeat(64) },
    rate_limit: null,
    cost: null,
    evidence_record_count: count,
    errors: [],
    warnings: []
  };
}

function fixtureEvidence({ include = ["facts", "keywords", "serp", "gsc"], conflict = false } = {}) {
  const records = [];
  if (include.includes("facts")) records.push(
    record({ id: "fact_name", provider: "product_facts", type: "product_fact", value: { field_path: "product.name", label: "name", value: "Heavy Duty Drying Towel" } }),
    record({ id: "fact_type", provider: "product_facts", type: "product_fact", value: { field_path: "product.category_type", label: "category type", value: "Microfibre car drying towel" } })
  );
  if (conflict) records.push(record({ id: "fact_type_conflict", provider: "product_facts", type: "product_fact", value: { field_path: "product.category_type", label: "category type", value: "Cotton drying cloth" } }));
  if (include.includes("keywords")) records.push(record({
    id: "kw_drying_towel",
    provider: "dataforseo_keyword_ideas",
    type: "keyword_idea",
    query: "car drying towel",
    parents: ["fact_name", "fact_type"],
    value: { keyword: "car drying towel", monthly_search_volume: 90, keyword_difficulty: 41 }
  }));
  if (include.includes("serp")) records.push(
    record({ id: "serp_organic", provider: "dataforseo_google_organic_serp_advanced", type: "serp_organic_result", query: "car drying towel", parents: ["kw_drying_towel"], value: { keyword: "car drying towel", url: "https://competitor.test/towel?ref=serp", domain: "competitor.test", title: "Drying towels" } }),
    record({ id: "serp_paa", provider: "dataforseo_google_organic_serp_advanced", type: "serp_people_also_ask", query: "car drying towel", parents: ["kw_drying_towel"], value: { keyword: "car drying towel", question: "Which towel dries a car?" } }),
    record({ id: "serp_related", provider: "dataforseo_google_organic_serp_advanced", type: "serp_related_search", query: "car drying towel", parents: ["kw_drying_towel"], value: { keyword: "car drying towel", related_query: "best drying cloth" } })
  );
  if (include.includes("gsc")) records.push(
    record({
      id: "gsc_zero_click",
      provider: "google_search_console",
      type: "search_console_query_performance",
      query: "best car drying towel",
      value: {
        query: "best car drying towel", clicks: 0, impressions: 50, ctr: 0, average_position: 14,
        keyword_relationships: [
          { target: "car drying towel", source_evidence_id: "kw_drying_towel", method: "normalised_phrase", rationale: "fixture" },
          { target: "car drying towel", source_evidence_id: "serp_organic", method: "normalised_phrase", rationale: "fixture" }
        ],
        page_relationships: []
      }
    }),
    record({
      id: "gsc_product_page",
      provider: "google_search_console",
      type: "search_console_query_page_performance",
      query: "car drying towel",
      value: {
        query: "car drying towel", page: "https://shop.test/product/heavy-duty-towel/?source=gsc", clicks: 2, impressions: 30, ctr: 0.066, average_position: 8,
        keyword_relationships: [{ target: "car drying towel", source_evidence_id: "kw_drying_towel", method: "normalised_exact", rationale: "fixture" }],
        page_relationships: [{ target: "https://shop.test/product/heavy-duty-towel", source_evidence_id: "fact_name", method: "canonical_url_exact", rationale: "fixture" }]
      }
    }),
    record({
      id: "gsc_unmatched_page",
      provider: "google_search_console",
      type: "search_console_page_performance",
      value: { page: "https://shop.test/blog/other", clicks: 0, impressions: 4, ctr: 0, average_position: 55, keyword_relationships: [], page_relationships: [] }
    })
  );
  const providers = [
    ["facts", "product_facts"],
    ["keywords", "dataforseo_keyword_ideas"],
    ["serp", "dataforseo_google_organic_serp_advanced"],
    ["gsc", "google_search_console"]
  ].filter(([kind]) => include.includes(kind)).map(([, provider]) => providerRun(provider, records.filter((item) => item.provider_id === provider).length));
  return {
    schema_version: "1.0.0",
    artifact_type: "research_evidence",
    evidence_artifact_id: "evidence_fixture",
    evidence_run_id: "evidence_run_fixture",
    subject: { subject_id: SUBJECT, product_url: "https://shop.test/product/heavy-duty-towel/", product_name: "Heavy Duty Drying Towel", product_type: "Microfibre towel", product_facts_ref: "fixture://facts.json", product_facts_sha256: "c".repeat(64) },
    scope: { market: "GB", language: "en-GB" },
    provider_runs: providers,
    records,
    coverage_ref: "coverage.json",
    created_at: "2026-08-08T00:00:00.000Z",
    warnings: []
  };
}

test("all initial objectives have explicit contracts and sufficient mixed evidence", () => {
  const evidence = fixtureEvidence();
  for (const objective of Object.keys(OBJECTIVE_CONTRACTS)) {
    const state = aggregateResearchEvidence({ evidence, objective });
    assert.equal(state.sufficiency.state, "sufficient");
    assert.equal(state.sufficiency.interpretation_may_proceed, true);
    assert.deepEqual(state.sufficiency.requirements_missing, []);
    assert.equal(state.sufficiency.requirements_satisfied.length, OBJECTIVE_CONTRACTS[objective].length);
    assert.deepEqual(validateResearchState(state), []);
  }
});

test("partial, insufficient, and unavailable states are descriptive", () => {
  const partial = aggregateResearchEvidence({ evidence: fixtureEvidence({ include: ["facts", "keywords"] }), objective: "create_supporting_content" });
  assert.equal(partial.sufficiency.state, "partial");
  assert.deepEqual(partial.sufficiency.requirements_missing, ["serp_intent_content_shape_evidence", "existing_site_duplication_assessment"]);
  assert.equal(partial.sufficiency.interpretation_may_proceed, false);

  const insufficientEvidence = fixtureEvidence({ include: ["facts"] });
  insufficientEvidence.provider_runs.push(
    providerRun("dataforseo_keyword_ideas", 0),
    providerRun("dataforseo_google_organic_serp_advanced", 0),
    providerRun("google_search_console", 0)
  );
  const insufficient = aggregateResearchEvidence({ evidence: insufficientEvidence, objective: "identify_content_opportunities" });
  assert.equal(insufficient.sufficiency.state, "insufficient");
  assert.equal(insufficient.sufficiency.requirements_satisfied.length, 0);

  const unavailableEvidence = fixtureEvidence({ include: [] });
  const unavailable = aggregateResearchEvidence({ evidence: unavailableEvidence, objective: "identify_content_opportunities" });
  assert.equal(unavailable.sufficiency.state, "unavailable");
});

test("zero-click evidence is present and no Search Console topic match is a meaningful assessment", () => {
  const evidence = fixtureEvidence();
  evidence.records.find((item) => item.evidence_id === "gsc_zero_click").value.keyword_relationships = [];
  evidence.records.find((item) => item.evidence_id === "gsc_product_page").value.keyword_relationships = [];
  const state = aggregateResearchEvidence({ evidence, objective: "create_supporting_content" });
  const requirement = state.sufficiency.requirements_checked.find((item) => item.requirement === "existing_site_duplication_assessment");
  assert.equal(requirement.status, "satisfied");
  assert.ok(requirement.supporting_evidence_ids.includes("gsc_zero_click"));
  assert.equal(state.search_console_relationships.unmatched_evidence_ids.includes("gsc_zero_click"), true);
});

test("aggregation is deterministic, IDs stable, source immutable, and duplicate relationships collapse", () => {
  const evidence = fixtureEvidence();
  const before = structuredClone(evidence);
  const first = aggregateResearchEvidence({ evidence, objective: "improve_existing_product_page" });
  const reordered = structuredClone(evidence);
  reordered.records.reverse();
  reordered.provider_runs.reverse();
  const second = aggregateResearchEvidence({ evidence: reordered, objective: "improve_existing_product_page" });
  assert.deepEqual(second, first);
  assert.equal(second.research_state_id, first.research_state_id);
  assert.deepEqual(evidence, before);
  assert.equal(first.source_evidence.evidence_ids.length, evidence.records.length);
  assert.ok(first.search_console_relationships.duplicate_relationships_collapsed > 0);
  assert.equal(new Set(first.source_evidence.evidence_ids).size, evidence.records.length);
});

test("conflicting evidence and provenance references are preserved without resolution", () => {
  const evidence = fixtureEvidence({ conflict: true });
  const state = aggregateResearchEvidence({ evidence, objective: "improve_existing_product_page" });
  const conflict = state.conflicts.find((item) => item.semantic_key === "product_fact:product.category_type");
  assert.deepEqual(conflict.evidence_ids, ["fact_type", "fact_type_conflict"]);
  assert.equal(conflict.resolution, "unresolved");
  assert.ok(state.source_evidence.evidence_ids.includes("fact_type_conflict"));
});

test("missing provider is isolated and unsupported objectives fail explicitly", () => {
  const evidence = fixtureEvidence({ include: ["facts", "keywords", "serp"] });
  const state = aggregateResearchEvidence({ evidence, objective: "create_supporting_content" });
  const missing = state.sufficiency.requirements_checked.find((item) => item.requirement === "existing_site_duplication_assessment");
  assert.equal(missing.status, "unavailable");
  assert.equal(state.missing_evidence_categories.includes("first_party_search_console"), true);
  assert.throws(() => aggregateResearchEvidence({ evidence, objective: "write_article" }), /Unsupported research objective/);
});

test("human-readable rendering is deterministic and contains readiness boundaries", () => {
  const state = aggregateResearchEvidence({ evidence: fixtureEvidence(), objective: "identify_content_opportunities" });
  const first = renderResearchStateMarkdown(state);
  const second = renderResearchStateMarkdown(structuredClone(state));
  assert.equal(second, first);
  assert.match(first, /State: \*\*sufficient\*\*/);
  assert.match(first, /Duplicate relationships collapsed:/);
  assert.match(first, /does not select keywords/);
});
