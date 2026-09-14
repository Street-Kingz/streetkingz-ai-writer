import test from "node:test";
import assert from "node:assert/strict";
import { loadDiscoveryEvidence } from "../product-kernel/decisionEvidenceAdapter.js";

const BUSINESS = "business-1";
const SOURCE = "site-source-1";

function makeRun(id, state, overrides = {}) {
  return {
    id: String(id), state, completeness_state: state === "complete" ? "complete" : state === "partial" ? "partial" : "unavailable",
    retrieved_at: "2026-09-14T10:00:00Z", evidence_as_of: "2026-09-14T09:59:00Z",
    completed_at: "2026-09-14T10:01:00Z", error_code: state === "complete" ? null : "SITE_LIMITATION",
    source_version: "test-source", provider_version: "test-provider", business_id: BUSINESS, source_id: SOURCE,
    ...overrides
  };
}

function makePage(id, runId, overrides = {}) {
  return {
    id: String(id), business_id: BUSINESS, source_id: SOURCE, run_id: String(runId), discovered_url_id: String(id),
    requested_url: `https://example.test/page-${id}`, final_url: `https://example.test/page-${id}`,
    http_status: 200, canonical_state: "same_boundary", robots_allowed: true, meta_noindex: false,
    page_type: "product", title: `Page ${id}`, meta_description: null, h1: [], internal_links: [],
    retrieved_at: "2026-09-14T10:00:00Z", limitation: null, status: "inspected", ...overrides
  };
}

class Query {
  constructor(db, table) { this.db = db; this.table = table; this.filters = []; this.orders = []; this.limitValue = null; this.options = {}; }
  select(columns, options = {}) { this.options = { columns, ...options }; return this; }
  eq(column, value) { this.filters.push([column, value]); return this; }
  order(column, options = {}) { this.orders.push([column, options]); return this; }
  limit(value) { this.limitValue = value; return this; }
  maybeSingle() { return Promise.resolve(this.db.resolve(this, true)); }
  then(resolve, reject) { return Promise.resolve(this.db.resolve(this, false)).then(resolve, reject); }
}

function makeAdmin({ completeRun = null, latestRun = completeRun, runs, pages = [], discovered = [] } = {}) {
  const calls = [];
  const source = { id: SOURCE, business_id: BUSINESS, source_kind: "site", evidence_state: latestRun?.state || "complete", current_complete_run: completeRun?.id || null };
  const allRuns = runs || [completeRun, latestRun].filter(Boolean).filter((run, index, values) => values.findIndex(item => item.id === run.id) === index);
  const db = {
    calls,
    from(table) { return new Query(this, table); },
    resolve(query, single) {
      calls.push({ table: query.table, filters: query.filters.slice(), orders: query.orders.slice(), limit: query.limitValue });
      const match = row => query.filters.every(([column, value]) => String(row?.[column]) === String(value));
      let data;
      if (query.table === "businesses") data = [{ id: BUSINESS, status: "active", name: "Test business", ecommerce_platform: "woocommerce", primary_market: "GB", primary_language: "en" }];
      else if (query.table === "commerce_stores") data = [];
      else if (query.table === "organic_evidence_sources") data = [source].filter(match);
      else if (query.table === "organic_evidence_runs") {
        data = allRuns.filter(match);
        if (query.orders[0]?.[1]?.ascending === false) data = [...data].sort((a, b) => Number(b.id) - Number(a.id));
      } else if (query.table === "organic_site_inspected_pages") data = pages.filter(match).sort((a, b) => Number(a.id) - Number(b.id));
      else if (query.table === "organic_site_discovered_urls") data = discovered.filter(match);
      else data = [];
      if (query.limitValue !== null) data = data.slice(0, query.limitValue);
      return { data: single ? data[0] || null : data, error: null };
    }
  };
  return db;
}

async function load(admin) { return loadDiscoveryEvidence({ admin, businessId: BUSINESS }); }

test("complete current run remains selected when it is the only usable site run", async () => {
  const complete = makeRun(10, "complete");
  const admin = makeAdmin({ completeRun: complete, latestRun: complete, pages: [makePage(101, 10)] });
  const loaded = await load(admin);
  assert.equal(loaded.packet.site.selected_run_id, "10");
  assert.equal(loaded.packet.site.state, "available");
  assert.deepEqual(loaded.packet.site.pages.map(page => page.source_run_or_generation_reference), ["10"]);
});

test("newer usable partial supersedes an empty complete/LKG run without changing its lifecycle state", async () => {
  const complete = makeRun(10, "complete");
  const partial = makeRun(11, "partial");
  const admin = makeAdmin({ completeRun: complete, latestRun: partial, pages: [makePage(111, 11)], discovered: [{ id: "u1", business_id: BUSINESS, source_id: SOURCE, run_id: "11", inspection_status: "inspected" }] });
  const loaded = await load(admin);
  assert.equal(loaded.packet.site.selected_run_id, "11");
  assert.equal(loaded.packet.site.state, "partial");
  assert.equal(loaded.packet.site.selected_run_completeness, "partial");
  assert.equal(loaded.packet.site.selection_reason, "latest_usable_partial_with_persisted_inspected_pages");
  assert.ok(loaded.packet.site.limitations.includes("selected_site_run_is_partial"));
  assert.equal(loaded.packet.site.coverage.discovered_url_count, 1);
  assert.deepEqual(loaded.packet.site.pages.map(page => page.source_run_or_generation_reference), ["11"]);
  assert.equal(complete.state, "complete");
  assert.equal(complete.id, "10");
});

test("newer usable partial is selected instead of a useful complete/LKG run, with no row mixing", async () => {
  const complete = makeRun(20, "complete");
  const partial = makeRun(21, "partial");
  const admin = makeAdmin({ completeRun: complete, latestRun: partial, pages: [makePage(201, 20), makePage(211, 21)] });
  const loaded = await load(admin);
  assert.equal(loaded.packet.site.selected_run_id, "21");
  assert.deepEqual(loaded.packet.site.pages.map(page => page.id), ["211"]);
  assert.ok(loaded.packet.site.pages.every(page => page.source_run_or_generation_reference === "21"));
});

test("empty, failed, or incoherent partial attempts leave useful LKG selected", async t => {
  const complete = makeRun(30, "complete");
  await t.test("empty partial", async () => {
    const admin = makeAdmin({ completeRun: complete, latestRun: makeRun(31, "partial"), pages: [makePage(301, 30)] });
    const loaded = await load(admin);
    assert.equal(loaded.packet.site.selected_run_id, "30");
    assert.deepEqual(loaded.packet.site.pages.map(page => page.id), ["301"]);
  });
  await t.test("failed latest attempt", async () => {
    const failed = makeRun(32, "failed");
    const admin = makeAdmin({ completeRun: complete, latestRun: failed, runs: [complete, failed], pages: [makePage(301, 30)] });
    const loaded = await load(admin);
    assert.equal(loaded.packet.site.selected_run_id, "30");
    assert.equal(loaded.packet.site.state, "available");
  });
  await t.test("partial missing evidence_as_of", async () => {
    const malformed = makeRun(33, "partial", { evidence_as_of: null });
    const admin = makeAdmin({ completeRun: complete, latestRun: malformed, pages: [makePage(301, 30), makePage(331, 33)] });
    const loaded = await load(admin);
    assert.equal(loaded.packet.site.selected_run_id, "30");
  });
  await t.test("foreign run provenance", async () => {
    const partial = makeRun(34, "partial");
    const admin = makeAdmin({ completeRun: complete, latestRun: partial, pages: [makePage(341, 34, { run_id: "999" }), makePage(301, 30)] });
    const loaded = await load(admin);
    assert.equal(loaded.packet.site.selected_run_id, "30");
  });
});

test("partial selection preserves run limitations and input hash tracks selected page values", async () => {
  const complete = makeRun(40, "complete");
  const partial = makeRun(41, "partial");
  const discovered = [{ id: "u1", business_id: BUSINESS, source_id: SOURCE, run_id: "41", inspection_status: "discovered", reason_not_inspected: "inspected_page_cap" }];
  const first = await load(makeAdmin({ completeRun: complete, latestRun: partial, pages: [makePage(411, 41)], discovered }));
  const changed = await load(makeAdmin({ completeRun: complete, latestRun: partial, pages: [makePage(411, 41, { title: "Changed observed title" })], discovered }));
  assert.ok(first.packet.site.limitations.includes("SITE_LIMITATION"));
  assert.ok(first.packet.site.limitations.includes("inspected_page_cap"));
  assert.ok(first.packet.site.limitations.includes("unattempted_discovered_urls_present"));
  assert.notEqual(first.inputHash, changed.inputHash);
});

test("partial-run queries retain business, source and run scoping", async () => {
  const complete = makeRun(50, "complete");
  const partial = makeRun(51, "partial");
  const admin = makeAdmin({ completeRun: complete, latestRun: partial, pages: [makePage(511, 51)], discovered: [{ id: "u1", business_id: BUSINESS, source_id: SOURCE, run_id: "51", inspection_status: "inspected" }] });
  const loaded = await load(admin);
  assert.equal(loaded.packet.site.selected_run_id, "51");
  for (const query of admin.calls.filter(call => ["organic_site_inspected_pages", "organic_site_discovered_urls"].includes(call.table))) {
    const filters = Object.fromEntries(query.filters);
    assert.equal(filters.business_id, BUSINESS);
    assert.equal(filters.source_id, SOURCE);
    assert.equal(filters.run_id, "51");
  }
});
