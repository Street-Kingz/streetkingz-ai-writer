# V1-04 B1 P3-A — Connection Lifecycle + Evidence Preservation

Status: **BLOCKED — CONNECTION LIFECYCLE PROOF INCOMPLETE**

Starting implementation SHA: `dcdc22694f4d955f0f3f518fc5dbf2c0a39d2ec3`
Documentation checkpoint SHA: `803498f7ec8d277bc20a904ce75026dd413fbc71`
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
| P3A-RECONNECT-001 | start while connected | `/reconnect`, DB | UNEXECUTED | current smoke assertion is grouped with 002 |
| P3A-RECONNECT-002 | callback stages replacement | callback, Vault | UNEXECUTED | current smoke assertion is grouped with 001 |
| P3A-RECONNECT-003 | successful same-property reconnect | `/select`, activation RPC, Vault, source | UNEXECUTED | current smoke assertion is grouped with later LKG assertions |
| P3A-RECONNECT-004 | successful different-property reconnect | `/select`, activation RPC, source | UNEXECUTED | supporting assertion exists but lacks dedicated case vector |
| P3A-RECONNECT-005 | denied reconnect | callback, failure RPC | UNEXECUTED | grouped failed-reconnect vector |
| P3A-RECONNECT-006 | token-exchange failure | callback, failure RPC | UNEXECUTED | grouped failed-reconnect vector |
| P3A-RECONNECT-007 | property-list failure | `/properties`, provider | UNEXECUTED | not individually exercised in P3-A suite |
| P3A-RECONNECT-008 | property-probe failure | `/select`, provider | UNEXECUTED | grouped failed-reconnect vector |
| P3A-RECONNECT-009 | pending reconnect expiry | expiry RPC, status | UNEXECUTED | not individually exercised |
| P3A-RECONNECT-010 | staged reconnect expiry | expiry RPC, Vault | UNEXECUTED | not individually exercised |
| P3A-RECONNECT-011 | repeated reconnect starts | `/reconnect`, begin RPC | UNEXECUTED | supporting start exists outside dedicated vector |
| P3A-RECONNECT-012 | failed property change | `/select`, activation | UNEXECUTED | not individually exercised |
| P3A-REAUTH-001 | valid active credential | `/reauth-check`, Vault, provider | UNEXECUTED | positive path not separately asserted |
| P3A-REAUTH-002 | active invalid_grant | `/reauth-check`, mark RPC, status | UNEXECUTED | grouped with 001 and LKG setup |
| P3A-REAUTH-003 | transient provider failure | `/reauth-check`, provider | UNEXECUTED | not individually exercised |
| P3A-REAUTH-004 | no active secret reference | `/reauth-check`, mark RPC | UNEXECUTED | grouped with 005/006 |
| P3A-REAUTH-005 | Vault secret missing | `/reauth-check`, Vault | UNEXECUTED | not individually exercised |
| P3A-REAUTH-006 | malformed stored credential | `/reauth-check`, Vault | UNEXECUTED | not individually exercised |
| P3A-REAUTH-007 | failed reconnect from reauth state | `/reconnect`, callback | UNEXECUTED | supporting recovery path is grouped |
| P3A-REAUTH-008 | successful reconnect from reauth state | `/reconnect`, `/select` | UNEXECUTED | supporting recovery path is grouped |
| P3A-REAUTH-009 | stale invalid_grant after reconnect | held reauth, reconnect, CAS RPC | UNEXECUTED | current test covers disconnect ordering only |
| P3A-REAUTH-010 | stale invalid_grant after disconnect | held reauth, disconnect, CAS RPC | UNEXECUTED | supporting assertion exists but lacks dedicated case vector |
| P3A-DISCONNECT-001 | active connection with LKG | `/disconnect`, Vault, source | UNEXECUTED | grouped with repeated disconnect |
| P3A-DISCONNECT-002 | disconnect during pending reconnect | `/disconnect`, attempts, Vault | UNEXECUTED | not individually exercised |
| P3A-DISCONNECT-003 | disconnect during staged reconnect | `/disconnect`, attempts, Vault | UNEXECUTED | not individually exercised |
| P3A-DISCONNECT-004 | disconnect from reauth state | `/disconnect`, GSC state, source | UNEXECUTED | not individually exercised |
| P3A-DISCONNECT-005 | repeated disconnect | `/disconnect`, source | UNEXECUTED | grouped with 001 |
| P3A-DISCONNECT-006 | reconnect after disconnect | `/reconnect`, activation RPC | UNEXECUTED | supporting assertion exists but lacks dedicated case vector |
| P3A-DISCONNECT-007 | property change after disconnect | `/select`, source/history | UNEXECUTED | not individually exercised |
| P3A-DISCONNECT-008 | customer response language | disconnect response | UNEXECUTED | not individually exercised |
| P3A-RACE-001 | reconnect start vs disconnect | concurrent routes/RPCs | UNEXECUTED | P3-A race suite not yet implemented |
| P3A-RACE-002 | reconnect activation vs disconnect | concurrent activation/disconnect | UNEXECUTED | P3-A race suite not yet implemented |
| P3A-RACE-003 | reauth mark vs reconnect activation | CAS lifecycle race | UNEXECUTED | P3-A race suite not yet implemented |
| P3A-RACE-004 | reauth mark vs disconnect | CAS lifecycle race | UNEXECUTED | supporting ordering is not a complete race proof |

**Ledger:** 38 approved P3-A cases; 4 individually passed; 34 remain
unexecuted. The smoke suite produced 17 passing Node tests (16 named
subtests plus the parent), but grouped assertions are not substituted for the
individual ledger requirements.

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

## Commands and result

`npx supabase migration up --local` — PASS; applied
`20260915000000_v1_04_p3a_lifecycle_consistency.sql`:

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

No P3-B tenant/acceptance-surface proof or P4 migration/combined closeout was
executed. B1 remains blocked. Real Google acceptance remains unauthorized.
