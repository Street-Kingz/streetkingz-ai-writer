# V1-04 Slice B1 — Google Search Console Customer Connection

Status: `BLOCKED — COMPLETE NON-LIVE MATRIX INCOMPLETE`

Validation revision: P2 validation work from starting baseline
`d9b3ae9320bc824549fb86b299c7f3b4a3d2184e`. No live Google, WooCommerce or
Street Kingz call was made.

This artifact records the bounded B1 implementation and deterministic local
proof. No Google account data, tokens, credentials, property responses or
customer evidence are stored here.

## Implemented boundary

- Customer-authenticated start and reconnect endpoints create a tenant-bound,
  fifteen-minute, single-use OAuth attempt.
- The Product-owned OAuth client uses HTTPS callback configuration, exact
  `webmasters.readonly` scope, offline access, high-entropy state and S256 PKCE.
- Authorization codes are exchanged server-side. Only the customer refresh
  token is stored in Vault; access tokens are request-memory-only.
- Sites are discovered through the official read API and selected only after a
  fresh safe property probe.
- URL-prefix properties use strict scheme, host, port and path-boundary rules.
- Domain properties use registrable-domain matching, including `co.uk`, while
  later evidence remains constrained to the Business canonical site.
- Activation occurs only after property verification. The organic source is
  then bound to the same-Business GSC Connection with evidence state
  `never_collected`.
- Disconnect removes the local Vault secret, invalidates pending attempts,
  preserves evidence LKG and does not claim remote Google revocation.
- GSC operations use provider-specific Connection state and do not use the Woo
  lifecycle or Business-level Woo status as their state machine.

## Recovery and validation record

The first B1 implementation self-reported readiness. Independent review found
unsafe direct lifecycle DML, non-atomic OAuth attempts, unsafe reconnect
credential replacement, incomplete property identity/permission validation,
and insufficient end-to-end route proof. This artifact remains blocked until
the hardening migration and full injected-transport route proof pass.

The current correction adds monotonic lifecycle migrations through
`20260912000000`, removes durable plaintext OAuth state, adds atomic attempt
start/claim/activation/disconnect functions, stages replacement credentials,
and uses `tldts` for public-suffix-aware matching. The local-only acceptance
surface is at `/internal/v1-04` when `V1_04_B1_ACCEPTANCE=1` and now prepares a
disposable authenticated browser session in memory.

- A local acceptance environment reset incident removed local runtime rows; it
  did not alter committed V1-03/Slice A evidence and did not contact Google or
  WooCommerce. The incident is recorded separately in
  `b1-local-reset-incident.md`.
- The clean current local database was verified at nine migrations through the
  B1 migration, with zero Accounts, Stores, sources or runs.
- A verified detached worktree on project
  `streetkingz-ai-writer-v104-b1-zero-proof` used ports 56320–56329. All nine
  migrations applied from empty state and a disposable authenticated site
  source completed a lifecycle smoke proof. The temporary stack was removed.
- A separate detached upgrade proof applied Slice A migrations, retained a
  representative complete source/run, applied both B1 migrations, and verified
  the source remained complete while the B1 objects/functions existed. That
  temporary stack was removed; the normal local stack remained running.
- The B1 focused tests passed 6/6 and the full route/Vault injected-transport
  lifecycle passed 1/1 after the atomic-expiry correction. Exact provider
  identity tests, the activation expiry gate, and the loopback implementation
  are present, but the complete failure, race, reconnect, two-tenant,
  reauthentication and acceptance-surface matrix remains to be executed. No
  live Google authorization was performed.
- The final correction preserves the exact provider URL-prefix string, makes
  activation reject and expire staged attempts atomically, restricts the
  acceptance surface by socket peer address, adds bounded local-session
  cleanup, and adds an active-credential reauthentication check. These
  corrections have not yet been covered by a complete durable matrix.

## Latest validation

Executed successfully:

- focused B1 contract tests: 6 passed, 0 failed;
- local B1 route/Vault integration: 1 passed, 0 failed, including exact
  provider probe identity, active `invalid_grant` state, LKG retention and
  disconnect;
- Slice A local integration: 1 passed;
- enabled V1-02/V1-03 local integrations: 64 passed;
- full npm: 1,056 passed, 9 skipped, 0 failed;
- `git diff --check`: passed.

Still unexecuted as durable B1 proofs: the complete OAuth failure matrix,
concurrent start/callback races, reconnect failure/success matrix, full
two-tenant route isolation, acceptance-surface HTTP/peer tests, isolated
from-zero migration proof, reproducible Slice-A-to-B1 upgrade proof, and
separate staged-expiry/active-reauth/disconnect-LKG cases. B1 therefore remains
blocked and is not authorized for real Google acceptance.

## Deterministic proof

- Six focused B1 tests passed: exact OAuth scope/PKCE, PSL-aware property
  normalization, URL-prefix/domain matching, no Search Analytics collection,
  bounded lifecycle RPC usage, and plaintext-state/expiry assertions.
- Slice A local integration remained green after the B1 migration.
- No live Google authorization or Google API call was performed.

## Acceptance boundary

B1 remains `BLOCKED — FULL NON-LIVE MATRIX INCOMPLETE`. B2 — Search Analytics
evidence acquisition — remains not started. V1-04 remains in progress.

## P1 closeout — property identity and acceptance-harness security

P1 status: `COMPLETE`. B1 remains blocked pending P2, P3 and P4.

The advisor-identified property-probe defect was confirmed: selection sent the
requested property to the probe and checked permission, but did not validate
that the provider response identified the same property. The route now rejects
missing, malformed and different returned `siteUrl` values before activation.
Exact URL-prefix provider identity remains unchanged for probing and storage;
comparison normalization is separate.

The acceptance-harness isolation defect was confirmed: the harness had been
conditionally mounted in the normal Express application after global CORS.
The normal app no longer imports or mounts it. A dedicated runner at
`scripts/runV104B1Acceptance.js` requires the explicit acceptance flag, rejects
production, requires loopback Supabase, and binds only to `127.0.0.1`. The
harness router retains socket-peer loopback validation, rejects non-local
Origins, has no CORS middleware, and requires an in-memory bootstrap header for
session/cleanup mutations. The browser token remains in JavaScript memory only.

Executed P1 proof:

- `node --test --test-concurrency=1 test/v1-04-b1-p1.test.js test/v1-04-gsc-b1.test.js`:
  13 passed, 0 failed, 0 skipped.
- Proof covers exact returned identity, parent/sibling/scheme/host/port
  mismatch, missing/malformed identity, Domain identity, normal-app
  non-mounting, explicit enable/production/local-environment guards, loopback
  peer variants, bootstrap/origin rejection, and absence of wildcard CORS.

P1 did not execute the P2 OAuth failure/race matrix, P3 reconnect/tenant/full
acceptance-surface matrix, or P4 migration/combined closeout. No live Google,
WooCommerce, Street Kingz or DataForSEO call was made.

## P2 validation — OAuth failure and replay/race matrix

P2 status: `BLOCKED`. This is a durable partial proof, not P2 acceptance.

The predeclared matrix was exercised through the real Express routes, Supabase
RPCs and local Vault with an injected deterministic Google transport. The
executed proof passed 9/9 Node test cases (8 nested matrix groups plus the
parent), with no required test skipped in the dedicated command:

`V1_04_P2_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-gsc-b1-p2-integration.test.js`

Passed groups:

- callback input/state failures P2-OAUTH-001 through P2-OAUTH-013;
- authorization-code failure scenarios P2-TOKEN-001, 002, 003, 007, 008,
  009, 011;
- staged post-callback provider failure cases P2-PROVIDER-001, 002 and
  the P1 identity regression;
- two-way and three-way concurrent callback claim races;
- simultaneous three-start supersession;
- callback versus superseding start;
- pending and processing expiry cleanup.

The matrix remains incomplete. The following required proof families were not
executed individually and block P2: P2-TOKEN-004, 005, 006 and 010;
P2-VAULT-001 through P2-VAULT-005; P2-PROVIDER-003 through 006 as distinct
route cases; the full P2-RACE-START-001 through 004 interleaving matrix;
P2-RACE-CALLBACK-001 through 003 as separate durable cases; both explicit
callback/expiry interleavings; and P2-RACE-ACTIVATE-001 through 004. The
required activation/expiry/replay boundary and Vault partial-failure cleanup
proof therefore remain unproven.

The earlier grouped P2 run did not demonstrate a production defect, but it did
not close the later individually required P2-A cases. P3 and P4 were not
executed, B1 remains blocked, and real Google acceptance remains unauthorized.

Regression evidence for this P2 pass:

- P1 plus existing B1 focused tests: 13 passed, 0 failed, 0 skipped.
- Dedicated P2 local route/RPC/Vault matrix: 9 passed, 0 failed, 0 skipped.
- Slice-A local integration: 1 passed, 0 failed, 0 skipped.
- V1-02 local integration: 1 passed, 0 failed, 0 skipped.
- V1-03 local integration: 63 passed, 0 failed, 0 skipped.
- Full npm: 1,063 passed, 0 failed, 10 skipped. The additional skipped case
  is the opt-in P2 Supabase integration when its environment flag is absent;
  the dedicated P2 command above executed it with no skip.
- git diff check and sensitive literal scan: passed.

## P2-A — failure-boundary proof

P2-A checkpoint status: `COMPLETE`; at that checkpoint P2 overall remained
`BLOCKED` pending P2-B. The earlier grouped P2 wording above is historical and
is superseded for the failure-boundary cases by the exact ledger in
`slice-b1-p2-oauth-failure-race-matrix.md`.

At baseline `f36caf4d11c8a8645f02f8058a0b9dd35056fa54`, the dedicated P2-A
suite closed 35 cases individually: all 13 callback/state cases, all 11
token cases, all 5 Vault/staging cases, and all 6 provider-list/probe cases.
The provider cases used the real `/select` route with a synthetic verified
Commerce Store created through the accepted local Woo lifecycle; no Woo
network call was made. Transport cases used the real bounded GSC transport
with controlled local fetch responses.

The exact-scope correction rejects additional `openid`, `email` and Search
Console write scopes while accepting only the approved read-only scope with
ordinary surrounding whitespace. The Vault test hook is explicit and
test-only; production defaults remain the real Vault RPCs. Secret checks use
counts/existence only and retain no secret values or references.

At the P2-A checkpoint, P2-B remained responsible for the 16 race/activation cases in the exact ledger:
simultaneous starts, concurrent callbacks, supersession interleavings,
callback/expiry interleavings, and activation/expiry/replay. P3 and P4 remain
not started. Real Google acceptance remains unauthorized and B2 remains not
started.

P2-A final command:
`V1_04_P2A_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-gsc-b1-p2a-failures.test.js`

Result: 42 tests passed, 0 failed, 0 skipped (35 owned case assertions plus
five exact-scope supplemental assertions, the positive provider control and
the parent test). The existing grouped P2 race regression also passed 9/9
tests; those 16 ledger cases were then P2-B UNEXECUTED rather than being
claimed by the P2-A task.

## P2-B — replay, concurrency and activation-race proof

P2-B status: `COMPLETE`; P2 status: `COMPLETE`. The exact ledger now contains
52 rows: the retained 35 P2-A PASS cases and 17 individually proven P2-B
cases, including owner-approved `P2-RACE-ACTIVATE-005`. The dedicated suite
passed 18/18 tests including its parent (17 named cases), with actual
concurrent HTTP requests, Supabase RPC locks, local Vault and deterministic
exchange/property barriers. The three-second barrier deadline detected no
deadlock.

The effective SQL audit confirmed the pre-correction start/activation lock-order
inversion. New monotonic migrations
`20260913000000_v1_04_b1_activation_lock_order.sql` and
`20260914000000_v1_04_b1_superseded_secret_reference.sql` corrected the lock
order and cleared deleted staged-secret references. Both activation-wins and
new-start-wins orderings passed without partial activation or Vault residue.

The P2-B proof is recorded in
`artifacts/validation/v1-04/slice-b1-p2-oauth-failure-race-matrix.md`.
P3 and P4 remain not started; B1 remains blocked pending those phases. Real
Google acceptance remains unauthorized and B2 remains not started.

## P3-A1 — reconnect and property/evidence consistency

P3-A1 is `COMPLETE`. The exact 17-case suite
`test/v1-04-gsc-b1-p3a1-reconnect.test.js` passed 18 tests including its
parent, with real local Express routes, Supabase lifecycle RPCs, Vault and
synthetic verified Woo state. Same-property reconnect retained the current
complete evidence pointer and `/select` returned the durable evidence state.
Different-property reconnect retained historical run rows while clearing the
current source view. Failed, expired and repeated reconnects preserved the
active credential and left no staged reference. The owner-approved
`P3A-RECONNECT-013` staging/start overlap passed without deadlock or Vault
residue after the Connection-first staging correction in
`20260916000000_v1_04_p3a1_reconnect_consistency.sql`.

P3-A2 — Reauthentication + Credential Health — and P3-A3 — Disconnect +
Lifecycle Races — remain NOT STARTED. P3-A and P3 remain blocked; P3-B and P4
remain not started. B1 remains `BLOCKED — COMPLETE NON-LIVE MATRIX INCOMPLETE`.
Real Google acceptance remains unauthorized and B2 remains not started.

## P3-A3 — disconnect and lifecycle races

P3-A3 is `COMPLETE`: all twelve individually named disconnect/lifecycle cases
passed (13 TAP tests including the parent). The real local route/RPC/Vault proof
covered active, pending, staged and reauthentication disconnects, repeated and
post-disconnect reconnect, property-change evidence reset, local-versus-remote
revocation wording, and both orderings of the four approved lifecycle races.
Migration `20260918000000_v1_04_p3a3_disconnect_consistency.sql` makes staged
cleanup set-based, clears deleted references and preserves the first disconnect
timestamp. No deadlock, credential resurrection or LKG deletion occurred.

P3-A is now `COMPLETE` with all 41 ledger cases passing. P3-B — Tenant
Isolation + Acceptance-Surface HTTP — remains NOT STARTED, so P3 and B1 remain
blocked. P4 and B2 remain not started. No live provider call was made.

## P3-A / current closeout correction

The earlier historical P3-A section above is preserved as historical evidence.
Current repository evidence supersedes its old 38-case snapshot: P3-A now has
41 individual PASS cases across P3-A1, P3-A2 and P3-A3. P3-A is `COMPLETE`.
P3-B remains NOT STARTED, so P3 is `IN PROGRESS / BLOCKED pending P3-B` and B1
remains `BLOCKED — COMPLETE NON-LIVE MATRIX INCOMPLETE`. P4 and B2 remain not
started; no live Google, WooCommerce, Street Kingz or DataForSEO call occurred.

## P3-A2 — reauthentication and credential health

P3-A2 is `COMPLETE`: all 12 individually named credential-health cases passed
(13 TAP tests including the parent) through local Express, Supabase RPC and
Vault boundaries. Current invalid-grant transitions to
`reauthentication_required`; transient provider failures preserve connected
state; missing, unreadable and malformed credentials fail safely; recovery from
reauthentication-required works; and stale invalid-grant, exact-null and stale
successful-health results cannot overwrite a newer replacement or disconnect.
The LKG source/run state remains intact and no raw credential/provider detail is
returned.

Migration `20260917000000_v1_04_p3a2_credential_health_cas.sql` applies the
exact-null compare-and-set semantics, adds bounded health confirmation, and
drops the unsafe legacy two-argument marking function. P3-A3 — Disconnect +
Lifecycle Races — remains NOT STARTED, so P3-A, P3 and B1 remain blocked. P4
and B2 remain not started; no live Google acceptance was performed.

## P3-A — connection lifecycle and evidence preservation

P3-A is `BLOCKED — CONNECTION LIFECYCLE PROOF INCOMPLETE`. The lifecycle audit
identified and corrected bounded defects for first-time `awaiting_property`
state, reconnect timestamp/property evidence consistency, and compare-and-set
reauthentication marking in monotonic migration
`20260915000000_v1_04_p3a_lifecycle_consistency.sql`.

The dedicated proof is recorded in
`artifacts/validation/v1-04/slice-b1-p3a-connection-lifecycle.md`. Its exact
ledger contains 38 P3-A cases: four individual first-connection cases passed
and 34 lifecycle/reconnect/reauth/disconnect/race cases remain unexecuted as
individual proof. A supporting local route/Vault smoke suite passed 17 tests,
but grouped assertions are not counted as individual acceptance closure.

P3-B — Tenant Isolation + Acceptance-Surface HTTP — remains NOT STARTED. P4
remains NOT STARTED. B1 remains `BLOCKED — COMPLETE NON-LIVE MATRIX
INCOMPLETE`; real Google acceptance remains unauthorized and B2 remains not
started. No live Google, WooCommerce, Street Kingz or DataForSEO call occurred.
