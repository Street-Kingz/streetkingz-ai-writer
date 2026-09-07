# V1-05 Slice B actual-commit live-path verification

Verification baseline: `3dc6ca683468ec698db0a728eae9efb350c5b06f`.
No live provider calls were made during this correction.

The independent review findings were confirmed against the committed route,
candidate evaluator, and acceptance harness. The following corrections are
implemented locally and are subject to the final non-live regression:

| Finding | Status | Evidence / correction |
| --- | --- | --- |
| ACTUAL-001 | CLOSED / IMPLEMENTED | Durable retry ownership remains in the database; route completion no longer projects a JS retry boolean. |
| ACTUAL-002 | CLOSED / IMPLEMENTED | `responseMetadata` is reset at the start of each evaluator attempt. |
| ACTUAL-003 | CLOSED / IMPLEMENTED | Formal cache entries use a canonical wrapper and are read into the same `{case_id,candidates,primary_candidate_id,result}` shape. |
| ACTUAL-004 | CLOSED / IMPLEMENTED | Formal cache reuse is session, SHA, provider, model, benchmark, packet, and runtime-version bound. |
| ACTUAL-005 | CLOSED / IMPLEMENTED | Smoke passes an `onRetry` guard that always refuses a second attempt. |
| ACTUAL-006 | CLOSED / IMPLEMENTED | Acceptance ledger persists per-case attempt counts before provider work and refuses attempts at two. |
| ACTUAL-007 | CLOSED / IMPLEMENTED | Commercial invariance compares stripped and original Product-derived identity, deterministic disposition, allowed targets, and model packet. |
| ACTUAL-008 | CLOSED / IMPLEMENTED | Model input now applies a deterministic field-aware character budget and records truncation. |
| ACTUAL-009 | CLOSED / IMPLEMENTED | Harness provider failures with safe usage metadata add tokens and calculated cost before durable failure-state write. |
| ACTUAL-010 | CLOSED / IMPLEMENTED | Cache identity includes corpus identity plus Slice B evaluation, interpretation, and instruction versions. |

Frozen fixture bytes, fixture hashes, owner labels, discovery matches, and
deterministic thresholds were not changed. No live authorization variable was
set.

## Final independent committed-code verification

FINAL-001 — CONFIRMED and CLOSED: durable interpreted rows now use
`interpretationInputHash`, derived from the exact bounded
`buildInterpretationRequest(...).input`; deterministic and bounded-out rows
persist a null interpretation hash because no model input was sent.

FINAL-002 — CONFIRMED and CLOSED: `PROVIDER_OUTCOME_UNKNOWN` records unknown
cost with null cost rather than manufacturing a zero-token priced attempt.

FINAL-003 — CONFIRMED and CLOSED: preview executes the commercial-control check
before returning and reports 11/11 invariance.

FINAL-004 — CONFIRMED and CLOSED: committed pure harness helpers and regression
tests cover commercial control, smoke/request bounds, restart state, cache
identity, and unknown-cost accounting.

FINAL-005 — CONFIRMED, ENVIRONMENT-BLOCKED: full npm execution remains blocked
by localhost bind permission in this agent environment; Product tests that ran
were green.

FINAL-006 — CONFIRMED, ENVIRONMENT-BLOCKED: disposable Supabase cannot start
because Colima is stopped and Docker socket access is denied. No normal
database was reset or modified.

Environment diagnostics: Node `v22.18.0`, npm `10.9.3`, Docker client
`29.7.2` with the Colima context, Colima `not running`; Supabase CLI execution
was likewise blocked by the unavailable Docker environment.

Final preview: PASS; 38 applicable cases, 38 formal requests, 1 smoke request,
39 base requests, global maximum 40, commercial invariance 11/11, provider
calls 0. Live approval was not set.

## Harness wiring verification

HARNESS-WIRE-001 — CONFIRMED: the prior call supplied corpus labels directly to
the commercial checker even though primary matches live in the expectations
file.

HARNESS-WIRE-002 — CONFIRMED: this produced a false not-applicable/pass path.
The checker now joins corpus sensitivity to expectation metadata by `case_id`.

HARNESS-WIRE-003 — CONFIRMED: pure ledger/commercial helpers are now imported
from the authoritative harness library by the live script.

HARNESS-WIRE-004 — CONFIRMED: completed case state is now rejected by
`canRequestCase`.

HARNESS-WIRE-005 — CONFIRMED: the completed-cache regression now asserts all 20
completed cases are ineligible and has no `|| true` escape.

Final non-live proof: focused harness/Product tests 25/25 passed; full npm
1,162 passed, 0 failed, 21 pre-existing skips; disposable migrations 36/36
and security posture PASS; secret scan 0 findings; diff check PASS. The final
preview is PASS with 38 formal cases, 39 base requests, 40 global maximum,
11/11 commercial invariance, and zero provider calls.

## Owner clarification: commercial control modes

The prior commercial proof requirement was corrected by owner clarification.
`V105-EVAL-021` intentionally has no primary candidate and is not
interpretation-applicable, so it uses the run-level
`run_level_insufficient_evidence_control` rather than being treated as
not-applicable. The other ten commercial-sensitive cases use candidate-level
controls. The authoritative evaluator now joins corpus sensitivity to Slice B
expectations by `case_id`, evaluates all 11 controls, and reports 10 primary
matches, 11 evaluated, 0 not-applicable, and 11 passes. No fixture, hash,
label, discovery-match, Product semantic, or threshold change was made.
