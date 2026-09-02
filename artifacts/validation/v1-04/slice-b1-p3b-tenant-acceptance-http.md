# V1-04 B1 P3-B — Tenant Isolation + Acceptance-Surface HTTP

Status: **COMPLETE — 42 / 42 PASS**

Starting SHA: `7f52cce74c4c94e0975268acc86aae755757a6dc`

This ledger is intentionally individual. The Harness and Tenant domains are
proven by dedicated local integration suites exercising the real routes, RLS,
RPC grants, Vault boundary, and acceptance server. Historical execution notes
below are retained for traceability.

| Case ID | Scenario | Boundary | Result | Test / command | Notes |
| --- | --- | --- | --- | --- | --- |
| P3B-TENANT-001 | Own-tenant positive control | GSC routes/RLS | PASS | `P3B-TENANT-001 own-tenant positive controls` | normal app HTTP; both tenants |
| P3B-TENANT-002 | Missing/invalid authentication | GSC routes/Auth | PASS | `P3B-TENANT-002 authentication failures` | unauthenticated route vectors |
| P3B-TENANT-003 | A cannot load B properties | `/properties`/RLS | PASS | `P3B-TENANT-003 foreign property discovery` | provider counter unchanged |
| P3B-TENANT-004 | A cannot select B property | `/select`/RLS | PASS | `P3B-TENANT-004 foreign property selection` | B unchanged |
| P3B-TENANT-005 | A cannot disconnect B | `/disconnect`/RPC | PASS | `P3B-TENANT-005 foreign disconnect and nonexistent comparison` | same safe not-found class |
| P3B-TENANT-006 | A cannot reauth-check B | `/reauth-check`/Vault | PASS | `P3B-TENANT-006 foreign reauth-check` | no provider work |
| P3B-TENANT-007 | Symmetric B-to-A control | GSC routes/RLS | PASS | `P3B-TENANT-007 symmetric foreign route controls` | reverse direction |
| P3B-TENANT-008 | Connect/reconnect identifier injection | `/connect`/`/reconnect` | PASS | `P3B-TENANT-008 connect/reconnect identifier injection` | own tenant remains authoritative |
| P3B-TENANT-009 | Status cannot be rebound | `/status` | PASS | `P3B-TENANT-009 status cannot be rebound` | foreign fields ignored |
| P3B-TENANT-010 | Callback cannot be rebound by IDs | callback/RPC | PASS | `P3B-TENANT-010 callback cannot be rebound` | one-time state preserved |
| P3B-TENANT-011 | Account/business RLS | Supabase RLS | PASS | `P3B-TENANT-011 Account/Business/audit RLS` | authenticated callers |
| P3B-TENANT-012 | Base connection RLS/safe columns | Supabase RLS | PASS | `P3B-TENANT-012 base Connection RLS and safe columns` | secret column unavailable |
| P3B-TENANT-013 | GSC connection RLS | Supabase RLS | PASS | `P3B-TENANT-013 GSC Connection RLS` | own-only read/update denied |
| P3B-TENANT-014 | Organic source/run isolation | Supabase RLS | PASS | `P3B-TENANT-014 organic source/run and commerce identity RLS` | source own-only; runs denied |
| P3B-TENANT-015 | OAuth attempts service-only | RLS/RPC | PASS | `P3B-TENANT-015 OAuth attempts service-only` | no attempt data |
| P3B-TENANT-016 | Secret references not customer-readable | RLS/Vault | PASS | `P3B-TENANT-016 secret references not customer-readable` | own/foreign |
| P3B-TENANT-017 | Vault inaccessible | Vault/RPC | PASS | `P3B-TENANT-017 Vault inaccessible` | tables and RPCs denied |
| P3B-TENANT-018 | Lifecycle RPCs service-only | RPC grants | PASS | `P3B-TENANT-018 service-only lifecycle RPCs` | effective signatures denied |
| P3B-TENANT-019 | Direct DML denied | RLS/DML | PASS | `P3B-TENANT-019 direct DML denied` | insert/update/delete denied |
| P3B-TENANT-020 | Foreign attacks have no side effect | all tenant boundaries | PASS | `P3B-TENANT-020 final foreign-attack side-effect audit` | both tenants remain usable |
| P3B-HARNESS-001 | Normal app exposes no harness | app routing | PASS | `P3B-HARNESS-001 normal app exposes no V1-04 routes` | HTTP 404 for all six routes |
| P3B-HARNESS-002 | Runner requires explicit enablement | runner | PASS | `P3B-HARNESS-002 explicit enable flag required` | fail-closed |
| P3B-HARNESS-003 | Production blocks startup | runner/config | PASS | `P3B-HARNESS-003 production rejected` | fail-closed |
| P3B-HARNESS-004 | Hosted Supabase blocks startup | runner/config | PASS | `P3B-HARNESS-004 hosted Supabase rejected` | loopback target required |
| P3B-HARNESS-005 | Runner binds loopback | server/socket | PASS | `P3B-HARNESS-005 binds loopback` | actual address 127.0.0.1 |
| P3B-HARNESS-006 | Legitimate local journey | acceptance HTTP | PASS | `P3B-HARNESS-006 local index/bootstrap journey` | index/bootstrap HTTP |
| P3B-HARNESS-007 | Non-loopback rejected | socket/peer | PASS | `P3B-HARNESS-007 non-loopback peer rejected` | peer predicate plus loopback bind |
| P3B-HARNESS-008 | Forwarded headers untrusted | peer headers | PASS | `P3B-HARNESS-008 forwarded headers cannot establish trust` | forwarded headers ignored |
| P3B-HARNESS-009 | Foreign Origin rejected | Origin/HTTP | PASS | `P3B-HARNESS-009 foreign Origin rejected` | HTTP 404 |
| P3B-HARNESS-010 | Host rebinding rejected | Host/HTTP | PASS | `P3B-HARNESS-010 foreign Host rejected` | HTTP 404 |
| P3B-HARNESS-011 | CORS/preflight bounded | CORS/HTTP | PASS | `P3B-HARNESS-011 hostile preflight has no grant` | no allow-origin |
| P3B-HARNESS-012 | Static content bounded | static HTTP | PASS | `P3B-HARNESS-012 static content is bounded` | no credential literals |
| P3B-HARNESS-013 | Bootstrap headers required | bootstrap | PASS | `P3B-HARNESS-013 bootstrap header required` | missing bootstrap rejected |
| P3B-HARNESS-014 | Bootstrap non-cacheable/memory-only | bootstrap | PASS | `P3B-HARNESS-014 bootstrap is non-cacheable and not in URL` | no-store |
| P3B-HARNESS-015 | Safe disposable session response | session HTTP | PASS | `P3B-HARNESS-015 safe session response` | exact safe-field allowlist |
| P3B-HARNESS-016 | Synthetic verified site provisioned | session/Woo/GSC HTTP/RPC | PASS | `P3B-HARNESS-016 synthetic site provisions locally and starts GSC journey` | injected Google; property selected; no observations |
| P3B-HARNESS-017 | Partial provisioning cleanup | Auth/DB/Vault | PASS | `P3B-HARNESS-017 partial provisioning cleanup vectors` | nine named failure points; safe failure |
| P3B-HARNESS-018 | Cleanup requires ownership/token | cleanup/Auth | PASS | `P3B-HARNESS-018 cleanup requires bootstrap and bearer vectors` | auth/bootstrap vectors |
| P3B-HARNESS-019 | Normal user cleanup denied | cleanup/Auth | PASS | `P3B-HARNESS-019 normal user cannot cleanup` | valid unmarked user receives 403 |
| P3B-HARNESS-020 | Cross-session cleanup denied | cleanup/Auth | PASS | `P3B-HARNESS-020 sessions cannot cross-clean` | target fields rejected; A/B isolated |
| P3B-HARNESS-021 | Complete cleanup/no residue | Auth/DB/Vault | PASS | `P3B-HARNESS-021 complete cleanup and no residue` | Auth/account/business/connection inventory cleared |
| P3B-HARNESS-022 | Repeated cleanup safe | cleanup/Auth | PASS | `P3B-HARNESS-022 repeated cleanup is bounded` | first cleanup succeeds; replay safe 401/403 |

## Final cleanup/residue evidence closeout (2026-09-02)

The strengthened local run supersedes the earlier shallow cleanup evidence.
The enabled command executed all 22 top-level Harness cases: 23 TAP tests
including the matrix parent, 23 passed, 0 failed, and 0 skipped. Supporting
proof included 9 individually named provisioning-failure vectors, 4 bootstrap
authentication vectors, Host wrong-port vectors, recreated bootstrap
comparison, and complete in-memory inventory checks.

HARNESS-016 completed the injected GSC journey through connect, callback,
properties and select, then verified the disposable Auth user, Account,
Business, Woo Connection/store, GSC row/attempts, organic source/runs and all
captured Vault references were absent after cleanup. HARNESS-017-A through -I
captured the inventory immediately before each injected failure and verified
all created rows and readable Vault references were removed; the control
session remained unaffected. HARNESS-021 verified active Woo and GSC
credentials and their database ownership before cleanup, then verified
complete database/Vault absence while a second control session retained its
rows and Vault credential. HARNESS-022 verified the same complete absence
before accepting the repeated-cleanup 401/403 result.

Exact proof command:

`V1_04_P3B_HARNESS_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-gsc-b1-p3b-acceptance-http.test.js`

The run used local loopback Supabase, injected Google transport, no external
provider calls, and restored the synthetic acceptance state. No production
correction or migration was required by this evidence closeout. Harness
domain: **COMPLETE — 22 / 22 PASS**. Tenant domain: **NOT STARTED — 0 / 20**.
P3-B remains blocked pending tenant isolation proof.

## Audit and current limitation

The acceptance router now validates an explicit local Host and marks disposable
users with protected `app_metadata`; session creation accepts a validated
synthetic HTTPS site and provisions the minimum local Woo identity. These are
bounded corrections, not proof. P3-B remains blocked until all 42 rows pass
through dedicated tests. P3-A remains complete; P4 and B2 were not executed.

## P3-B/H execution result

The initial 19-pass run was superseded after diagnosis: HARNESS-016 was missing
the GSC journey, and HARNESS-019/020 used invalid cleanup principals. The
corrected enabled command executed all 22 top-level cases: 22 passed, 0 failed,
0 skipped. Supporting evidence includes nine deterministic partial-provisioning
failure points, the injected local GSC connect/callback/properties/select
journey, valid normal-user and two-session cleanup principals, strict target
shape rejection, complete account/connection cleanup checks, and repeated
 cleanup. No live provider call occurred. The tenant domain remains 0 / 20
UNEXECUTED; P3-B remains BLOCKED pending tenant-isolation proof.

## P3-B tenant closeout (2026-09-02)

The normal Product application tenant suite executed all 20 approved cases as
individual subtests: 21 TAP tests including the parent, 21 passed, 0 failed,
and 0 skipped. The paired synthetic tenants used local Woo/GSC lifecycle
fixtures, injected Google transport, authenticated caller clients, real
PostgREST/RLS/Vault boundaries, and normal Product HTTP routes.

The suite proved own-tenant status and health controls; safe authentication
failure; foreign property, selection, disconnect and reauthentication denial;
identifier-injection resistance; callback state binding; Account/Business,
Connection, GSC and organic-source/run RLS; service-only attempts, Vault and
lifecycle RPCs; denied direct DML; and unchanged, still-usable tenants after
all foreign attacks. Foreign and nonexistent Connection IDs produced the same
safe response class. Provider counters remained unchanged for rejected foreign
work. No live provider calls occurred and teardown removed synthetic users and
state. Defect `P3B-DEF-001` (High) was found when a foreign disconnect
identifier reached the lifecycle RPC and produced an internal failure; the
route now performs the existing ownership lookup before invoking the RPC. No
migration was required.

Exact proof command:

`V1_04_P3B_TENANT_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-gsc-b1-p3b-tenant-isolation.test.js`

Tenant domain: **COMPLETE — 20 / 20 PASS**. Harness domain remains **COMPLETE
— 22 / 22 PASS**. P3-B is **COMPLETE — 42 / 42 PASS** and P3 is **COMPLETE**.
P4 remains NOT STARTED; B1 remains blocked pending P4.
