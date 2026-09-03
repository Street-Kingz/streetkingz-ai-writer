import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(new URL("../supabase/migrations/20260902000000_v1_04_organic_evidence_foundation.sql", import.meta.url), "utf8");
const correction = fs.readFileSync(new URL("../supabase/migrations/20260903000000_v1_04_slice_a_integrity.sql", import.meta.url), "utf8");

test("Slice A migration defines typed source and run states without a generic EAV table", () => {
  assert.match(migration, /create table public\.organic_evidence_sources/);
  assert.match(migration, /create table public\.organic_evidence_runs/);
  assert.match(migration, /source_class text not null check/);
  assert.match(migration, /source_kind text not null check/);
  assert.match(migration, /evidence_state text not null default 'never_collected'/);
  assert.match(migration, /state text not null default 'pending'/);
  assert.doesNotMatch(migration, /fact_type\s+text.*fact_key|fact_value/i);
});

test("Slice A migration structurally binds customer-connected sources to the same Business Connection", () => {
  assert.match(migration, /foreign key \(connection_id, business_id\)\s+references public\.connections\(id, business_id\)/);
  assert.match(migration, /customer_connected.*search_console.*google_search_console.*connection_id is not null/s);
  assert.match(migration, /no_separate_connection.*site.*provider_id is null.*connection_id is null/s);
  assert.match(migration, /product_connected.*external_search.*provider_id is not null.*connection_id is null/s);
});

test("Slice A lifecycle is service-only and preserves LKG on partial/failed completion", () => {
  assert.match(migration, /organic_begin_run[\s\S]*SERVICE_ROLE_REQUIRED/);
  assert.match(migration, /organic_finish_run[\s\S]*SERVICE_ROLE_REQUIRED/);
  assert.match(migration, /if p_state = 'complete' then[\s\S]*current_complete_run = v_run\.id/);
  assert.match(migration, /else[\s\S]*evidence_state = p_state[\s\S]*where id = v_source\.id/);
  assert.match(migration, /else[\s\S]*evidence_state = p_state[\s\S]*where id = v_source\.id/);
  assert.match(migration, /last_successful_at = v_run\.completed_at/);
});

test("customer status route exposes only safe status facts", () => {
  const route = fs.readFileSync(new URL("../routes/organicEvidence.js", import.meta.url), "utf8");
  assert.match(route, /\/api\/product\/organic-evidence\/status/);
  assert.match(route, /has_current_complete_evidence/);
  assert.doesNotMatch(route, /secret_reference|Vault|service_role|correlation_id/);
  assert.match(route, /current_completeness_state: source\.current_complete_run \? source\.current_completeness_state : null/);
});

test("Slice A correction closes completion and pointer integrity gaps", () => {
  assert.match(correction, /add column if not exists evidence_as_of/);
  assert.match(correction, /p_state = 'complete' and p_completeness_state not in \('complete','provider_limited'\)/);
  assert.match(correction, /p_state = 'complete' and p_evidence_as_of is null/);
  assert.match(correction, /p_state = 'complete' and p_error_code is not null/);
  assert.match(correction, /organic_source_pointer_owner_guard/);
  assert.match(correction, /r\.source_id = new\.id/);
  assert.match(correction, /r\.business_id = new\.business_id/);
  assert.match(correction, /ORGANIC_SOURCE_CONFLICT/);
  assert.match(correction, /revoke insert, update, delete/);
});

test("Slice D migration is typed, tenant-scoped, service-write-only, and credential-free", () => {
  const external = fs.readFileSync(new URL("../supabase/migrations/20260921000000_v1_04_slice_d_external_evidence.sql", import.meta.url), "utf8");
  assert.match(external, /create table public\.organic_external_seeds/);
  assert.match(external, /create table public\.organic_external_provider_requests/);
  assert.match(external, /create table public\.organic_external_observations/);
  assert.match(external, /source_class text not null check \(source_class in \('woo_product','woo_category','site_title','site_h1','gsc_query'\)\)/);
  assert.match(external, /request_fingerprint text not null unique/);
  assert.match(external, /alter table public\.organic_external_observations enable row level security/);
  assert.match(external, /revoke all on public\.organic_external_seeds, public\.organic_external_provider_requests, public\.organic_external_observations from public, anon, authenticated/);
  assert.doesNotMatch(external, /password|refresh_token|access_token|authorization/i);
  assert.doesNotMatch(external, /raw_response|response_body/i);
});

test("Slice D Product route is authenticated, fixed-scope, and does not expose shortlist logic", () => {
  const route = fs.readFileSync(new URL("../routes/externalEvidence.js", import.meta.url), "utf8");
  assert.match(route, /verifyIdentity/);
  assert.match(route, /\/api\/product\/organic-evidence\/external\/acquire/);
  assert.match(route, /location_code: 2826/);
  assert.match(route, /device: "desktop"/);
  assert.doesNotMatch(route, /selectSerpShortlist|opportunity_score|recommendation|keyword_difficulty/);
  assert.doesNotMatch(route, /req\.body.*keyword|req\.body.*location/);
});
