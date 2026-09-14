import test from "node:test";
import assert from "node:assert/strict";
import { loadDiscoveryEvidence } from "../product-kernel/decisionEvidenceAdapter.js";
import { buildInputHash } from "../product-kernel/decisionDiscovery.js";

const BUSINESS_ID = "business-1";
const GSC_RUN_ID = "gsc-run-7";
const EXTERNAL_RUN_ID = "external-run-9";

function makeGscRow(id) {
  return {
    id,
    grain: "query",
    query: `query ${id}`,
    page_url: `https://example.test/page/${id}`,
    clicks: id % 7,
    impressions: id + 20,
    ctr: 0.25,
    average_position: 4.5,
    observed_date: "2026-09-01",
    observed_start_date: null,
    observed_end_date: null,
    retrieved_at: "2026-09-03T10:00:00Z",
    evidence_as_of: "2026-09-01T00:00:00Z",
    completeness: "provider_limited",
    provider_limitations: ["provider_limited_detail"]
  };
}

function makeExternalRow(id) {
  return {
    id,
    observation_type: "keyword_volume",
    query_text: `external query ${id}`,
    search_volume: id,
    rank_group: null,
    rank_absolute: null,
    result_url: null,
    result_domain: null,
    result_title: null,
    result_description: null,
    location_code: 2826,
    language_code: "en",
    device: "desktop",
    observed_at: "2026-09-01T00:00:00Z",
    retrieved_at: "2026-09-03T10:00:00Z",
    completeness: "complete",
    limitations: [],
    seed_id: `seed-${id}`
  };
}

class Query {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this.filters = [];
    this.options = {};
    this.orders = [];
    this.limitValue = null;
  }
  select(columns, options = {}) { this.options = { columns, ...options }; return this; }
  eq(column, value) { this.filters.push([column, "eq", value]); return this; }
  gt(column, value) { this.filters.push([column, "gt", value]); return this; }
  order(column, options = {}) { this.orders.push([column, options]); return this; }
  limit(value) { this.limitValue = value; return this; }
  maybeSingle() { return Promise.resolve(this.db.resolve(this, true)); }
  then(resolve, reject) { return Promise.resolve(this.db.resolve(this, false)).then(resolve, reject); }
}

function makeAdmin(options = {}) {
  const { gscRows = [], externalRows = [], failPage, emptyPage, shortPage, duplicatePage, changedFinalCount } = options;
  const hasGsc = Object.hasOwn(options, "gscRows");
  const hasExternal = Object.hasOwn(options, "externalRows");
  const calls = [];
  const db = {
    calls,
    from(table) { return new Query(this, table); },
    resolve(query, single) {
      const filters = Object.fromEntries(query.filters.filter(([, op]) => op === "eq").map(([key, , value]) => [key, value]));
      const cursor = query.filters.find(([key, op]) => key === "id" && op === "gt")?.[2] ?? null;
      const isCount = query.options.head === true;
      const rows = query.table === "organic_search_console_observations" ? gscRows : query.table === "organic_external_observations" ? externalRows : [];
      const isEvidence = query.table === "organic_search_console_observations" || query.table === "organic_external_observations";
      if (isEvidence) calls.push({ table: query.table, filters, cursor, limit: query.limitValue, count: isCount, orders: query.orders });

      if (query.table === "businesses") return single ? { data: { id: BUSINESS_ID, status: "active", name: "Test", ecommerce_platform: "woocommerce", primary_market: "GB", primary_language: "en" }, error: null } : { data: [], error: null };
      if (query.table === "commerce_stores") return single ? { data: { id: "store-1", provider: "woocommerce", canonical_base_url: "https://example.test/", current_generation: "generation-1", sync_state: "complete" }, error: null } : { data: [], error: null };
      if (query.table === "organic_evidence_sources") {
        const kind = filters.source_kind;
        const value = kind === "search_console" && hasGsc ? { id: "source-gsc", source_kind: kind, source_class: "customer_connected", provider_id: "google_search_console", evidence_state: "complete", current_complete_run: GSC_RUN_ID } : kind === "external_search" && hasExternal ? { id: "source-external", source_kind: kind, source_class: "provider", provider_id: "dataforseo", evidence_state: "complete", current_complete_run: EXTERNAL_RUN_ID } : null;
        return single ? { data: value, error: null } : { data: [], error: null };
      }
      if (query.table === "organic_evidence_runs") {
        const runId = filters.id || (query.orders[0]?.[1]?.ascending === false ? EXTERNAL_RUN_ID : null);
        const value = runId === GSC_RUN_ID || runId === EXTERNAL_RUN_ID ? { id: runId, state: "complete", completeness_state: "provider_limited", retrieved_at: "2026-09-03T10:00:00Z", evidence_period_start: "2025-09-04", evidence_period_end: "2026-09-03", completed_at: "2026-09-03T10:00:01Z", error_code: null, source_version: "test", provider_version: "test" } : null;
        return single ? { data: value, error: null } : { data: value ? [value] : [], error: null };
      }
      if (query.table === "commerce_sync_generations") return { data: { id: "generation-1", state: "complete", started_at: null, completed_at: null, snapshot_kind: "complete" }, error: null };
      if (!isEvidence) return { data: [], error: null };
      const scoped = rows.filter(row => filters.business_id === BUSINESS_ID && (query.table === "organic_search_console_observations" ? filters.run_id === GSC_RUN_ID : filters.run_id === EXTERNAL_RUN_ID));
      if (isCount) {
        const matchingCount = changedFinalCount && calls.filter(call => call.table === query.table && call.count).length > 1 ? scoped.length + 1 : scoped.length;
        return { data: null, count: matchingCount, error: null };
      }
      const pageIndex = calls.filter(call => call.table === query.table && !call.count).length;
      if (failPage === pageIndex) return { data: null, error: { message: "controlled page failure" } };
      if (emptyPage === pageIndex) return { data: [], error: null };
      let selected = scoped.filter(row => cursor === null || row.id > cursor).slice(0, query.limitValue);
      if (shortPage === pageIndex && selected.length) selected = selected.slice(0, selected.length - 1);
      if (duplicatePage === pageIndex && cursor !== null) selected = [scoped[0], ...selected.slice(1)];
      return { data: selected, error: null };
    }
  };
  return db;
}

function defaultRows(count, makeRow = makeGscRow) { return Array.from({ length: count }, (_, index) => makeRow(index + 1)); }

async function load(admin) { return loadDiscoveryEvidence({ admin, businessId: BUSINESS_ID }); }

test("GSC pagination returns all 1,125 uniquely identified rows across a 1,000-row server ceiling", async () => {
  const rows = defaultRows(1125);
  const admin = makeAdmin({ gscRows: rows });
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => { upstreamCalls += 1; throw new Error("unexpected upstream call"); };
  try {
    const loaded = await load(admin);
    assert.equal(loaded.packet.search_console.rows.length, 1125);
    assert.deepEqual(loaded.packet.search_console.rows.map(row => Number(row.id)), rows.map(row => row.id));
    assert.equal(loaded.packet.search_console.rows[0].query, rows[0].query);
    assert.equal(loaded.packet.search_console.rows[1124].impressions, rows[1124].impressions);
    assert.equal(loaded.packet.search_console.rows[1124].provider_limitations[0], "provider_limited_detail");
    assert.equal(loaded.packet.search_console.rows[1124].source_run_or_generation_reference, GSC_RUN_ID);
    assert.deepEqual(loaded.packet.search_console.observation_coverage, { stored_count: 1125, selected_count: 1125, record_limit: 2000, truncated: false, exhaustive: true });
    assert.deepEqual(admin.calls.filter(call => call.table === "organic_search_console_observations" && !call.count).map(call => [call.cursor, call.limit]), [[null, 1000], [1000, 125]]);
    for (const call of admin.calls.filter(call => call.table === "organic_search_console_observations")) {
      assert.equal(call.filters.business_id, BUSINESS_ID);
      assert.equal(call.filters.run_id, GSC_RUN_ID);
      if (!call.count) assert.deepEqual(call.orders, [["id", { ascending: true }]]);
    }
    assert.equal(upstreamCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("zero observations and exact 2,000-row boundaries are exhaustive without an extra empty page", async () => {
  const zeroAdmin = makeAdmin({ gscRows: [] });
  const zero = await load(zeroAdmin);
  assert.equal(zero.packet.search_console.rows.length, 0);
  assert.equal(zero.packet.search_console.observation_coverage.exhaustive, true);
  assert.equal(zeroAdmin.calls.filter(call => call.table === "organic_search_console_observations" && !call.count).length, 0);

  const boundaryAdmin = makeAdmin({ gscRows: defaultRows(2000) });
  const boundary = await load(boundaryAdmin);
  assert.equal(boundary.packet.search_console.rows.length, 2000);
  assert.equal(boundary.packet.search_console.observation_coverage.truncated, false);
  assert.deepEqual(boundaryAdmin.calls.filter(call => call.table === "organic_search_console_observations" && !call.count).map(call => [call.cursor, call.limit]), [[null, 1000], [1000, 1000]]);
});

test("later-page failures, empty pages, duplicates, short pages, and count drift fail closed", async t => {
  await t.test("later page failure", async () => {
    const admin = makeAdmin({ gscRows: defaultRows(1125), failPage: 2 });
    await assert.rejects(load(admin), /GSC observations page read failed/);
  });
  await t.test("unexpected empty page", async () => {
    const admin = makeAdmin({ gscRows: defaultRows(1125), emptyPage: 2 });
    await assert.rejects(load(admin), /GSC observations unexpected empty page/);
  });
  await t.test("duplicate row across pages", async () => {
    const admin = makeAdmin({ gscRows: defaultRows(1125), duplicatePage: 2 });
    await assert.rejects(load(admin), /GSC observations duplicate row identity/);
  });
  await t.test("short intermediate page", async () => {
    const admin = makeAdmin({ gscRows: defaultRows(1125), shortPage: 1 });
    await assert.rejects(load(admin), /GSC observations page truncated/);
  });
  await t.test("stored count changes during read", async () => {
    const admin = makeAdmin({ gscRows: defaultRows(10), changedFinalCount: true });
    await assert.rejects(load(admin), /GSC observations source count changed during read/);
  });
});

test("the existing 2,000-record Product cap is explicit and does not fetch a third page", async () => {
  const admin = makeAdmin({ gscRows: defaultRows(2505) });
  const loaded = await load(admin);
  assert.equal(loaded.packet.search_console.rows.length, 2000);
  assert.deepEqual(loaded.packet.search_console.observation_coverage, { stored_count: 2505, selected_count: 2000, record_limit: 2000, truncated: true, exhaustive: false });
  assert.deepEqual(loaded.packet.search_console.limitations, ["product_evidence_record_limit_reached"]);
  assert.deepEqual(admin.calls.filter(call => call.table === "organic_search_console_observations" && !call.count).map(call => [call.cursor, call.limit]), [[null, 1000], [1000, 1000]]);
  const truncatedPacket = { ...loaded.packet, search_console: { ...loaded.packet.search_console, rows: loaded.packet.search_console.rows.slice(0, 1000) } };
  assert.notEqual(loaded.inputHash, buildInputHash(truncatedPacket));
});

test("the same bounded reader paginates the already-selected external observation run", async () => {
  const rows = defaultRows(1125, makeExternalRow);
  const admin = makeAdmin({ externalRows: rows });
  const loaded = await load(admin);
  assert.equal(loaded.packet.external.selected_run_id, EXTERNAL_RUN_ID);
  assert.equal(loaded.packet.external.observation_coverage.stored_count, 1125);
  assert.equal(loaded.packet.external.observation_coverage.selected_count, 1125);
  assert.equal(loaded.packet.external.rows.length, 1125);
  assert.deepEqual(admin.calls.filter(call => call.table === "organic_external_observations").map(call => [call.count, call.cursor, call.filters.business_id, call.filters.run_id]), [
    [true, null, BUSINESS_ID, EXTERNAL_RUN_ID], [false, null, BUSINESS_ID, EXTERNAL_RUN_ID], [false, 1000, BUSINESS_ID, EXTERNAL_RUN_ID], [true, null, BUSINESS_ID, EXTERNAL_RUN_ID]
  ]);
});
