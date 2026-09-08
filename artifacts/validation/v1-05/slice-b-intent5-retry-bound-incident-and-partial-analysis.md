# V1-05 Instructions-5 Retry-Bound Incident and Partial Analysis

## Session and authorization

Session `slice-b-v6-sol-medium-intent5-001` used GPT-5.6 Sol, medium reasoning,
instructions-5, request cap 40, and cost cap `$6`. It consumed 1 smoke request
and 39 formal requests, for 40 total, with calculated cost `$1.342008`.
The request cap and cost cap were respected. The authorized session-wide formal
retry sub-bound was 1, but the observed retry count was 2. The session is
incomplete and is not acceptance evidence.

The two cases with two actual attempts were `V105-EVAL-028` and
`V105-EVAL-039`. Both second attempts reached the provider, as shown by their
ledger attempt counts and completed cache results. The ledger does not preserve
the first-attempt safe error code or classification for either case; those
values are therefore unavailable. No raw response was persisted. Both second
attempt outcomes were known and completed. There were no final known-failure or
unknown-outcome states.

## Cause and missing case

`evaluateCandidates()` owns a local `retryUsed` flag, and the acceptance
harness invokes it independently for each formal case. `canRequestCase()`
allows two attempts per case. Before this correction, the ledger had no durable
session-wide formal retry counter and `onRetry` consumed no durable global
permit. This was an `ACCEPTANCE_GLOBAL_RETRY_GOVERNANCE_BUG`, not a Product
interpretation defect.

The 38th interpretation-applicable case in frozen order is
`V105-EVAL-048`. It has expected intent `comparison_selection`, expected target
state `ambiguous` with two target references, and is high impact. It is a
mixed-evidence real case and commercial-sensitive. It has no complete cached
result.

## Diagnostic partial result

The 37 completed cases produced:

| Measure | Result |
|---|---:|
| Intent correct | 17/37 (45.95%) |
| Target agreement | 36/37 (97.30%) |
| Disposition agreement | 24/37 (64.86%) |
| Page-fit agreement | 29/37 (78.38%) |
| High-impact intent errors | 3 |
| High-impact target errors | 1 |

The missing case can add at most one intent-correct result. The final intent
envelope is therefore 17/38 (44.74%) to 18/38 (47.37%); 33/38 is required for
85%, so the intent gate is mathematically impossible. Existing high-impact
intent and target errors also make the zero-error gates impossible. The
incomplete run is therefore `PASS_ALREADY_IMPOSSIBLE_FROM_37_COMPLETED_RESULTS`.

Completed gate states were: mixed/uncertain FAIL; brand-navigation PASS;
wrong-page-type PASS; high-volume-irrelevant PASS; low-volume-preservation
PASS; commercial invariance PASS. Commercial controls remain 11/11 evaluated,
11 pass, 0 N/A.

High-impact intent errors were `V105-EVAL-014`, `V105-EVAL-041`, and
`V105-EVAL-043`. The high-impact target error was `V105-EVAL-041`. The Sol
instructions-5 partial result was 17/37 intent-correct versus 23/37 for Sol
instructions-4: -6 cases and -16.22 percentage points. Target agreement
improved by 2.70 points, while disposition and page-fit agreement each declined
by 2.70 points. The instructions-5 effect on this incomplete matched set is
`MIXED`, with a material downstream target improvement but an intent regression.

For intent changes across the matched 37 cases:

- instructions-4 wrong / instructions-5 correct: `V105-EVAL-028` (1);
- instructions-4 correct / instructions-5 wrong: `V105-EVAL-002`, `003`, `004`,
  `011`, `014`, `018`, `026` (7);
- both correct: 16 cases;
- both wrong, same intent: `008`, `017`, `019`, `027`, `041`, `042`, `043` (7);
- both wrong, different intent: `012`, `016`, `025`, `029`, `030`, `046` (6).

The mini matched-37 result was 22/37 intent-correct; Sol instructions-4 was
23/37; Sol instructions-5 was 17/37. These are matched-set diagnostics, not
formal acceptance scores.

## Governance correction

Future ledgers bind `formal_retry_cap: 1` and `formal_retry_count: 0`, along
with the existing request/cost/model/instruction/SHA/benchmark identity. A
retry permit is consumed and persisted before the retry provider call. Once
consumed, a retry in any later case fails before network with
`GLOBAL_ACCEPTANCE_RETRY_BOUND`. Smoke retries remain forbidden. Request,
cost, and retry limits remain independent. Resume metadata mismatches fail
closed. No cross-SHA cache carry-forward is permitted.

Focused retry, cost, harness, provider, and Slice B tests passed 45/45 after
the correction. No provider calls were made during this analysis. The paid
ledger and cache remain preserved locally and were not staged or modified.

Slice B remains not accepted. Slice C remains not authorised. A future clean,
fresh, conforming acceptance session requires separate governance review and
authorization; these 37 results cannot be salvaged as acceptance evidence.
