# V1-04 B1 P2 OAuth Failure + Replay/Race Matrix

Status: **COMPLETE — P2 PASSED; P3/P4 REMAIN**

P2-A baseline: `f36caf4d11c8a8645f02f8058a0b9dd35056fa54`
P2-B baseline: `414e3bb4263977e10a508f8634a2e7947d5e9ff1`
Validation: local Supabase/Vault, real Express routes/RPCs, deterministic
local `fetchImpl`, synthetic authenticated tenant and synthetic verified
WooCommerce site identity. No external network.

## Exact case ledger

Each approved case has one row. P2-A rows are individually named and asserted
by `test/v1-04-gsc-b1-p2a-failures.test.js`. P2-B rows remain unexecuted by
design; the earlier grouped race test is regression evidence only.

| Case ID | Scenario | Assertion / boundary | Result | Proof command | Defect | Notes |
|---|---|---|---|---|---|---|
| P2-OAUTH-001 | missing state | callback route | PASS | dedicated P2-A command | — | no claim/exchange |
| P2-OAUTH-002 | malformed state | empty opaque state | PASS | same | — | fail closed |
| P2-OAUTH-003 | repeated/array state | repeated query parameter | PASS | same | — | no claim/exchange |
| P2-OAUTH-004 | unknown state | unknown state callback | PASS | same | — | no claim/exchange |
| P2-OAUTH-005 | expired pending state | expire RPC then callback | PASS | same | — | no exchange |
| P2-OAUTH-006 | consumed replay | success then replay | PASS | same | — | replay rejected |
| P2-OAUTH-007 | failed replay | denial then replay | PASS | same | — | terminal |
| P2-OAUTH-008 | superseded replay | newer start supersedes old | PASS | same | — | old state rejected |
| P2-OAUTH-009 | expired replay | expired callback twice | PASS | same | — | no resurrection |
| P2-OAUTH-010 | missing code/error | callback shape validation | PASS | same | — | no claim |
| P2-OAUTH-011 | unexpected parameter | callback allow-list | PASS | same | — | no claim |
| P2-OAUTH-012 | provider denial | error callback | PASS | same | — | `GSC_AUTH_DENIED` |
| P2-OAUTH-013 | code and error | denial precedence | PASS | same | — | exchange unchanged |
| P2-TOKEN-001 | generic exchange failure | local HTTP 500 | PASS | same | — | safe code |
| P2-TOKEN-002 | exchange timeout | local AbortError | PASS | same | — | bounded failure |
| P2-TOKEN-003 | malformed JSON | malformed token body | PASS | same | — | safe malformed mapping |
| P2-TOKEN-004 | no readable body | empty Response body | PASS | same | — | no staging |
| P2-TOKEN-005 | oversized response | body over 1 MiB cap | PASS | same | — | bounded size failure |
| P2-TOKEN-006 | authorization invalid_grant | local token error body | PASS | same | — | `GSC_REAUTH_REQUIRED` |
| P2-TOKEN-007 | missing refresh token | valid JSON without refresh | PASS | same | — | no credential |
| P2-TOKEN-008 | empty refresh token | empty refresh value | PASS | same | — | no credential |
| P2-TOKEN-009 | required scope missing | wrong-only scope | PASS | same | — | `GSC_SCOPE_INVALID` |
| P2-TOKEN-010 | additional/wrong scope | required plus `openid` | PASS | same | P2A-SCOPE-001 | exact set |
| P2-TOKEN-011 | malformed scope | non-string scope | PASS | same | — | safe scope code |
| P2-VAULT-001 | create fails before reference | injected create failure | PASS | same | — | no residue |
| P2-VAULT-002 | stage fails after create | real create then expiry | PASS | same | — | real delete cleanup |
| P2-VAULT-003 | superseded before stage | real create then supersession | PASS | same | — | no dangling stage |
| P2-VAULT-004 | expires before stage | real create then expiry | PASS | same | — | no dangling stage |
| P2-VAULT-005 | no longer stageable | real create then failure | PASS | same | — | no replacement |
| P2-PROVIDER-001 | property list fails | `/properties` + local 503 | PASS | same | — | no activation |
| P2-PROVIDER-002 | malformed siteEntry | `/properties` malformed body | PASS | same | — | safe malformed code |
| P2-PROVIDER-003 | probe fails | `/select` + local 403 | PASS | same | — | no activation |
| P2-PROVIDER-004 | malformed probe | `/select` missing siteUrl | PASS | same | — | no selection |
| P2-PROVIDER-005 | unusable permission | `/select` unverified user | PASS | same | — | rejected |
| P2-PROVIDER-006 | different identity | `/select` parent siteUrl | PASS | same | — | exact identity |
| P2-RACE-START-001 | two simultaneous starts | named P2-B start race subtest | PASS | dedicated P2-B command | — | one pending |
| P2-RACE-START-002 | three simultaneous starts | named P2-B start race subtest | PASS | same | — | one pending |
| P2-RACE-START-003 | start while pending | named P2-B supersession subtest | PASS | same | — | old callback rejected |
| P2-RACE-START-004 | start while processing | named P2-B staged supersession subtest | PASS | same | P2B-SECRET-001 corrected | ref cleared and secret deleted |
| P2-RACE-CALLBACK-001 | sequential replay | named P2-B replay subtest | PASS | same | — | one exchange |
| P2-RACE-CALLBACK-002 | two callback race | named P2-B callback race subtest | PASS | same | — | one winner |
| P2-RACE-CALLBACK-003 | three callback race | named P2-B callback race subtest | PASS | same | — | one winner |
| P2-RACE-SUPERSEDE-001 | processing superseded | named P2-B processing supersession subtest | PASS | same | — | no orphan |
| P2-RACE-SUPERSEDE-002 | pending superseded | named P2-B pending supersession subtest | PASS | same | — | no exchange |
| P2-RACE-EXPIRY-001 | expiry before claim | named P2-B expiry subtest | PASS | same | — | no exchange |
| P2-RACE-EXPIRY-002 | expiry during exchange | named P2-B expiry subtest | PASS | same | — | no stage |
| P2-RACE-EXPIRY-003 | expiry before selection | named P2-B expiry subtest | PASS | same | — | staged secret removed |
| P2-RACE-ACTIVATE-001 | activation before expiry | named P2-B activation subtest | PASS | same | — | expiry no-op |
| P2-RACE-ACTIVATE-002 | expiry before activation | named P2-B activation subtest | PASS | same | — | no partial activation |
| P2-RACE-ACTIVATE-003 | competing activation | named P2-B activation subtest | PASS | same | — | one winner |
| P2-RACE-ACTIVATE-004 | activation replay | named P2-B activation replay subtest | PASS | same | — | no duplicate source |
| P2-RACE-ACTIVATE-005 | activation versus new start | named P2-B supplemental lock-order subtest | PASS | same | P2B-LOCK-001 | both orderings deadlock-free |

**Ledger total:** 52 cases; 35 P2-A cases and 17 P2-B cases passed individually.
No approved P2 case is skipped.

## P2-A evidence

The dedicated suite traverses the actual callback, properties and selection
HTTP routes, service RPCs, local Vault create/read/delete boundary, and a real
GSC transport configured with controlled local `fetchImpl`. The transport guard
rejects non-Google test targets and no request is made to a live host.

The synthetic Woo site is created through accepted Product Woo lifecycle RPCs
with canonical base URL `https://example.com/shop/`; no Woo network call is
made. Provider failures therefore exercise the real `/select` route.

The five Vault cases use the production adapter by default plus an explicit
test-only adapter hook. Real synthetic Vault secrets are checked by bounded
counts and deleted through the production deletion RPC; values and references
are not persisted in evidence.

Exact scope semantics are fail-closed: whitespace around the one approved scope
is accepted, while missing, malformed, wrong, `openid`, `email`, and write-scope
additions are rejected. This is a code correction, not a migration.

## P2-B evidence

The dedicated `test/v1-04-gsc-b1-p2b-races.test.js` suite passed 17/17 named
cases (18 including the parent test) using actual concurrent HTTP requests,
real RPC locks, local Vault and deterministic exchange/property barriers. Every
race had a three-second hard barrier deadline. Activation/start was proven in
both activation-wins and new-start-wins orderings.

The lock audit confirmed that the pre-correction functions acquired locks in
opposite order. Monotonic migration
`20260913000000_v1_04_b1_activation_lock_order.sql` makes activation acquire
the Connection before the OAuth attempt, matching start. Migration
`20260914000000_v1_04_b1_superseded_secret_reference.sql` clears staged
references after deleting their Vault secrets. No deadlock, partial activation,
or Vault residue remained.

P2 is complete. P3 and P4 were not executed; B1 remains blocked pending them.
