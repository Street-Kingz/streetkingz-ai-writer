# V1-04 B1 P3-A — Connection Lifecycle + Evidence Preservation

Status: **BLOCKED — CONNECTION LIFECYCLE PROOF INCOMPLETE**

Starting implementation SHA: `dcdc22694f4d955f0f3f518fc5dbf2c0a39d2ec3`
P3-A/P3-B execution-split checkpoint SHA: `803498f7ec8d277bc20a904ce75026dd413fbc71`
P3-A1 subdivision and implementation checkpoint SHA: `25b16396e2c3dbb1a14690570eb8b6ec05588623`
Environment: local Supabase/Vault, real Express routes and RPCs, synthetic
verified WooCommerce site identity, injected Google transport. No external
network was used.

## Lifecycle audit

The audit found three bounded lifecycle defects: staged first authorization did
not expose durable `awaiting_property`; activation did not clear a prior
`disconnected_at` marker or reset the current source view when the selected
property changed; and reauthentication marking lacked compare-and-set against
the credential that had been checked. These were corrected in monotonic
migration `20260915000000_v1_04_p3a_lifecycle_consistency.sql`.

Same-property activation preserves the source current-complete pointer and
timestamps. A different selected property preserves historical run rows but
clears the source current view to truthful `never_collected` state. Disconnect
marks a source stale only when a current complete run exists. Reauthentication
marking is guarded by the expected active secret and connected state, so a stale
health result cannot downgrade a newer reconnect or a disconnected connection.

## Exact P3-A ledger

Each row is intentionally individual. Grouped smoke assertions are supporting
evidence only and do not close rows that lack a dedicated case assertion.

| Case ID | Scenario | Boundary | Result | Proof / notes |
|---|---|---|---|---|
| P3A-STATE-001 | initial start | `/connect`, RPC, DB | PASS | dedicated subtest; pending connection, no secret/source |
| P3A-STATE-002 | callback awaiting property | callback, staging RPC, Vault, status | PASS | dedicated subtest; staged-only and awaiting state |
| P3A-STATE-003 | first activation | `/select`, activation RPC, Vault | PASS | dedicated subtest; connected and never-collected |
| P3A-STATE-004 | first authorization failure | callback, failure RPC | PASS | dedicated subtest; retryable and no credential |
| P3A-RECONNECT-001 | start while connected | `/reconnect`, DB | PASS | dedicated P3-A1 subtest; active secret/property/LKG retained |
| P3A-RECONNECT-002 | callback stages replacement | callback, Vault | PASS | dedicated P3-A1 subtest; staged-only replacement |
| P3A-RECONNECT-003 | successful same-property reconnect | `/select`, activation RPC, Vault, source | PASS | dedicated P3-A1 subtest; current evidence retained |
| P3A-RECONNECT-004 | successful different-property reconnect | `/select`, activation RPC, source | PASS | dedicated P3-A1 subtest; historical run retained/current reset |
| P3A-RECONNECT-005 | denied reconnect | callback, failure RPC | PASS | dedicated P3-A1 subtest; old credential/property retained |
| P3A-RECONNECT-006 | token-exchange failure | callback, failure RPC | PASS | dedicated P3-A1 subtest; old credential retained |
| P3A-RECONNECT-007 | property-list failure | `/properties`, provider | PASS | dedicated P3-A1 subtest; staged retry bounded |
| P3A-RECONNECT-008 | property-probe failure | `/select`, provider | PASS | dedicated P3-A1 subtest; old property retained |
| P3A-RECONNECT-009 | pending reconnect expiry | expiry RPC, status | PASS | dedicated P3-A1 subtest; callback rejected |
| P3A-RECONNECT-010 | staged reconnect expiry | expiry RPC, Vault | PASS | dedicated P3-A1 subtest; staged reference cleared |
| P3A-RECONNECT-011 | repeated reconnect starts | `/reconnect`, begin RPC | PASS | dedicated P3-A1 subtest; one current attempt |
| P3A-RECONNECT-012 | failed property change | `/select`, activation | PASS | dedicated P3-A1 subtest; no partial change |
| P3A-RECONNECT-013 | staging versus new reconnect start | callback/Vault and concurrent `/reconnect` | PASS | owner-approved overlap; no deadlock or orphan |
| P3A-REAUTH-001 | valid active credential | `/reauth-check`, Vault, provider | PASS | dedicated P3-A2 subtest; connected and evidence retained |
| P3A-REAUTH-002 | active invalid_grant | `/reauth-check`, mark RPC, status | PASS | dedicated P3-A2 subtest; reauthentication_required and LKG retained |
| P3A-REAUTH-003 | transient provider failure | `/reauth-check`, provider | PASS | dedicated subtest; safe retryable failure, connected state retained |
| P3A-REAUTH-004 | no active secret reference | `/reauth-check`, mark RPC | PASS | dedicated subtest; current null observation marks safely |
| P3A-REAUTH-005 | Vault secret missing | `/reauth-check`, Vault | PASS | dedicated subtest; safe reauthentication-required result |
| P3A-REAUTH-006 | malformed stored credential | `/reauth-check`, Vault | PASS | four named malformed/empty/shape vectors passed |
| P3A-REAUTH-007 | failed reconnect from reauth state | `/reconnect`, callback | PASS | dedicated subtest; recovery remains possible without false health |
| P3A-REAUTH-008 | successful reconnect from reauth state | `/reconnect`, `/select` | PASS | dedicated subtest; replacement restores connected state |
| P3A-REAUTH-009 | stale invalid_grant after reconnect | CAS RPC and replacement route | PASS | old credential CAS rejected after replacement |
| P3A-REAUTH-010 | stale invalid_grant after disconnect | CAS RPC and disconnect route | PASS | stale mark rejected; disconnected state retained |
| P3A-REAUTH-011 | stale no-secret observation after reconnect | exact-null CAS and reconnect route | PASS | null is exact comparison, not wildcard |
| P3A-REAUTH-012 | stale successful health check after disconnect | health-confirm CAS and disconnect route | PASS | stale success cannot report connected |
| P3A-DISCONNECT-001 | active connection with LKG | `/disconnect`, Vault, source | PASS | dedicated P3-A3 subtest; stale LKG and run retained |
| P3A-DISCONNECT-002 | disconnect during pending reconnect | `/disconnect`, attempts, Vault | PASS | pending callback rejected and LKG preserved |
| P3A-DISCONNECT-003 | disconnect during staged reconnect | `/disconnect`, attempts, Vault | PASS | staged reference cleared; no live attempt remains |
| P3A-DISCONNECT-004 | disconnect from reauth state | `/disconnect`, GSC state, source | PASS | local credential removed; disconnected state retained |
| P3A-DISCONNECT-005 | repeated disconnect | `/disconnect`, source | PASS | idempotent; first disconnect timestamp retained |
| P3A-DISCONNECT-006 | reconnect after disconnect | `/reconnect`, activation RPC | PASS | reconnect restores access and clears disconnect marker |
| P3A-DISCONNECT-007 | property change after disconnect | `/select`, source/history | PASS | old run retained; current view reset |
| P3A-DISCONNECT-008 | customer response language | disconnect response | PASS | explicitly distinguishes local removal from remote revocation |
| P3A-RACE-001 | reconnect start vs disconnect | concurrent routes/RPCs | PASS | concurrent route proof leaves coherent commit-order state |
| P3A-RACE-002 | reconnect activation vs disconnect | concurrent activation/disconnect | PASS | one coherent disconnected final state; bounded loser |
| P3A-RACE-003 | reauth mark vs reconnect activation | CAS lifecycle race | PASS | stale mark rejected after replacement |
| P3A-RACE-004 | reauth mark vs disconnect | CAS lifecycle race | PASS | stale mark rejected after disconnect |

**Ledger:** 41 approved P3-A cases after the owner-approved P3A-RECONNECT-013,
P3A-REAUTH-011 and P3A-REAUTH-012 additions; all 41 cases passed individually.
Earlier smoke suites remain supporting evidence only.

## State and evidence invariants observed

- First callback stages a credential without installing an active reference;
  first-time status is `awaiting_property`.
- Exact first activation creates one Search Console source in
  `never_collected` state and no run.
- Same-property credential replacement retained the complete run and
  `evidence_as_of` in the supporting smoke path.
- Different-property activation retained the historical run but cleared the
  current source pointer and timestamps.
- The corrected activation clears `disconnected_at` on reconnection.
- Active invalid-grant returned `GSC_REAUTH_REQUIRED`, persisted
  `reauthentication_required`, and retained LKG evidence in the supporting
  route proof.
- Disconnect retained the complete run and marked the source stale in the
  supporting route proof. No remote revocation is claimed.
- No access token is persisted and no sensitive values are recorded here.

## P3-A1 result

P3-A1 is **COMPLETE**. Its 17 approved cases, including the owner-approved
`P3A-RECONNECT-013` staging-versus-new-start overlap, each have a named
subtest in `test/v1-04-gsc-b1-p3a1-reconnect.test.js` and passed through the
real local routes, RPCs and Vault boundary. Same-property activation retained
the current evidence pointer and the `/select` response now reflects it.
Different-property activation retained the historical run while resetting the
current source view. The staging function now follows Connection-first lock
order in monotonic migration
`20260916000000_v1_04_p3a1_reconnect_consistency.sql`.

### Lifecycle transition summary

| Transition | Durable state and invariant proven |
| --- | --- |
| no GSC connection → initial start | one pending connection/attempt; no active secret; no source |
| successful first callback → property selection | processing/awaiting-property; staged secret only; no selected property or evidence |
| first exact activation → connected | consumed attempt; active secret; granted consent; exact property; `never_collected` source |
| connected → same-property reconnect | old active secret and current complete evidence remain until replacement commits; replacement preserves evidence |
| connected → different-property activation | verified new property activates; historical run remains; current source view resets to no current evidence |
| failed/expired reconnect → connected | old credential, property and current evidence remain; candidate material is removed |
| staging versus new reconnect start | Connection-first lifecycle ordering prevents deadlock; superseded staged material is removed; original active credential remains |

Historical organic run rows retain their existing schema and are preserved, but
they do not yet carry a dedicated selected-property identity. Therefore full
human-readable historical property attribution is **not** implemented; P3-A1
proves the required safety property that an old run is not exposed as current
after a different-property activation. This remains a bounded B2 design input,
not Search Analytics implementation.

P3-A2 (reauthentication and credential health) and P3-A3 (disconnect and
lifecycle races) are complete. P3-A and P3 remain blocked pending P3-B.

## P3-A3 result

P3-A3 is **COMPLETE**. All twelve approved disconnect and lifecycle-race cases
passed individually through local Express routes, Supabase RPCs and Vault state.
Disconnect now removes every reachable staged secret, clears staged references,
preserves LKG evidence as stale, retains the first disconnect timestamp, and
reports that remote Google revocation was not requested. Reconnect-after-
disconnect and property-change reset both remain truthful. Concurrent lifecycle
vectors completed without deadlock or credential resurrection.

Migration `20260918000000_v1_04_p3a3_disconnect_consistency.sql` is monotonic;
previous migrations were not edited.

The twelve P3-A3 cases each passed as named subtests in
`test/v1-04-gsc-b1-p3a3-disconnect-races.test.js`. The suite exercised active,
pending, staged and reauthentication disconnects, repeated and post-disconnect
reconnect, property-change evidence reset, local-versus-remote revocation
wording, and the four approved lifecycle race cases. Concurrent operations
completed without deadlock, credential resurrection or LKG deletion. The
temporary non-escalated full-suite attempt was an environment-only localhost
`EPERM`; the escalated authoritative rerun passed.

## P3-A2 result

P3-A2 is **COMPLETE**. All 12 cases, including the two owner-approved stale
credential-health cases, passed individually in
`test/v1-04-gsc-b1-p3a2-reauth.test.js` through real local Express routes,
Supabase RPCs and Vault-backed state. The new monotonic migration
`20260917000000_v1_04_p3a2_credential_health_cas.sql` makes expected-null
comparison exact, removes the unsafe two-argument RPC, provides bounded
compare-and-set/health-confirm results, and prevents stale responses from
contradicting connected or disconnected durable state. LKG evidence and
selected-property identity were preserved in all negative cases.

P3-A3 disconnect and lifecycle-race cases remain unexecuted; P3-A and P3 remain
blocked.

## Commands and result

`npx supabase migration up --local` — PASS; applied
`20260915000000_v1_04_p3a_lifecycle_consistency.sql` and
`20260916000000_v1_04_p3a1_reconnect_consistency.sql`:

- `P3A-DEF-001` — first-time staged authorization did not persist
  `awaiting_property`.
- `P3A-DEF-002` — reconnect activation left `disconnected_at` populated and
  could expose old-property current evidence after a property change.
- `P3A-DEF-003` — reauthentication marking was not guarded against a stale
  credential-health result.

All three are bounded High-risk lifecycle corrections; they require the
remaining individual P3-A matrix to be rerun before severity can be closed.

`V1_04_P3A_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-gsc-b1-p3a-lifecycle.test.js`
— 17 passed, 0 failed, 0 skipped; not sufficient to close the 38-case
individual ledger.

`V1_04_P3A1_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-gsc-b1-p3a1-reconnect.test.js`
— 18 passed, 0 failed, 0 skipped (17 named P3-A1 cases plus parent).

`V1_04_P3A2_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-gsc-b1-p3a2-reauth.test.js`
— 13 passed, 0 failed, 0 skipped (12 named P3-A2 cases plus parent).

`V1_04_P3A3_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-gsc-b1-p3a3-disconnect-races.test.js`
— 13 passed, 0 failed, 0 skipped (12 named P3-A3 cases plus parent).

`npm test` — 1,063 passed, 0 failed, 16 skipped; repository opt-in local
integration suites are separately enabled where required.

`V1_04_P3A3_INTEGRATION=1 node --test --test-concurrency=1 test/v1-04-gsc-b1-p3a3-disconnect-races.test.js`
— 13 passed, 0 failed, 0 skipped (12 named P3-A3 cases plus parent).

No P3-B tenant/acceptance-surface proof or P4 migration/combined closeout was
executed. B1 remains blocked. Real Google acceptance remains unauthorized.
