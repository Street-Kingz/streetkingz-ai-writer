# V1-04 B1 P2 OAuth Failure + Replay/Race Matrix

Status: BLOCKED — DURABLE PARTIAL PROOF

Starting SHA: d9b3ae9320bc824549fb86b299c7f3b4a3d2184e
Validation environment: existing local Supabase/Vault; synthetic tenant; injected
Google transport; no external network.

## Matrix register

The following 51 cases were predeclared. PASS means executed by the durable
P2 integration test; UNEXECUTED remains a gate.

| ID range | Boundary | Result |
| --- | --- | --- |
| P2-OAUTH-001..013 | callback input, denial, combined code/error, replay safety | PASS |
| P2-TOKEN-001..003 | generic, timeout-shaped and malformed exchange failures | PASS |
| P2-TOKEN-004..006 | no body, oversized response, authorization-code invalid_grant | UNEXECUTED |
| P2-TOKEN-007..009 | missing/empty refresh material and missing required scope | PASS |
| P2-TOKEN-010..011 | wrong/additional scope and malformed scope field | UNEXECUTED |
| P2-VAULT-001..005 | create/stage/supersede/expiry/state staging failures | UNEXECUTED |
| P2-PROVIDER-001..002 | property-list failure and malformed siteEntry | PASS |
| P2-PROVIDER-003..006 | probe failure, malformed probe, permission and identity cases | UNEXECUTED |
| P2-RACE-START-001..004 | two/three start and pending/processing interleavings | UNEXECUTED |
| P2-RACE-CALLBACK-001..003 | sequential, two-way and three-way callback races | UNEXECUTED |
| P2-RACE-SUPERSEDE-001..002 | processing and pending callback supersession | PASS for processing; pending unexecuted |
| P2-RACE-EXPIRY-001..003 | expiry before claim, during exchange and before selection | PASS for pending/processing cleanup; exchange interleaving unexecuted |
| P2-RACE-ACTIVATE-001..004 | activation/expiry, competing activation and replay | UNEXECUTED |

The grouped labels preserve the required case IDs without claiming that one
grouped test is four independent interleaving proofs. The durable test file is
test/v1-04-gsc-b1-p2-integration.test.js.

## Executed boundaries

The test traverses real HTTP callback/start routes, real Supabase lifecycle
RPCs, real local Vault staging/cleanup and an injected provider. Deterministic
provider barriers—not arbitrary sleeps—control the concurrent callback and
callback/supersession checks. Assertions use bounded state and secret existence;
no secret value, state value, verifier, authorization code, Vault ID or raw
provider response is persisted here.

Result: 9 Node tests passed, 0 failed, 0 skipped in the dedicated P2 command.
The P2 completion gate is not met because the unexecuted cases above remain.
P3 and P4 were not executed. B1 remains blocked.
