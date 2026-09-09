# Street Kingz Product run repair — bounded result

## Status

The original Street Kingz development run remains preserved and is not resumed.
Its discovery completed with 64 candidates, while evaluation stopped after the
fourth batch reached the shared 180-second deadline window. The retained state
contains three completed batches, one unknown provider outcome, and one batch
not started. No recommendation result was promoted from the incomplete run.

The original paid session remains the authoritative record of its own request
counts, usage, cost, and unknown outcome. No ledger or cache was rewritten.

## Confirmed and unconfirmed failure facts

The recorded elapsed time establishes that the evaluation returned after the
180-second window. The retained database state does not preserve a separate
first-attempt diagnostic record, so it cannot establish whether the first
failure was transport, response-body parsing, schema validation, or provider
timeout. The later unknown outcome is therefore kept unknown. It is not treated
as a retrievable completion.

Output-budget contribution is not established by the retained failure record;
the configured per-request ceiling remains 4,000 completion tokens.

## Repair

Completed persisted rows are now converted back to the provider-shaped
hierarchical intent and nested target-attribution envelope before passing through
the same normalizer and validator as a fresh response. Incompatible cached rows
fail closed with `CACHED_EVALUATION_INCOMPATIBLE`.

An already-aborted evaluation deadline now blocks provider dispatch and cannot
start a retry with an aborted signal. Provider aborts are classified separately
as `PROVIDER_DEADLINE_EXPIRED`; other transport failures remain unknown.

Migration 38 adds safe first-failure and latest-failure elapsed diagnostics,
response identifiers, token counts, cost status, and bounded error codes. It
does not store prompts, private evidence, raw responses, credentials, or keys.

## Destination and recovery boundary

The repository disposable Supabase validation was run from zero and passed all
38 migrations, including the recommendation table and authenticated feed/detail
security path. That run is synthetic E2E evidence only. The actual retained
Street Kingz evidence has not been copied into that disposable instance, so it
is not claimed as the actual recovery destination.

Because the actual isolated destination was not safely prepared, the separate
two-request development recovery was not dispatched. The unknown outcome and
its cost exposure remain preserved; no additional provider request was made in
this repair task. A future recovery must first copy a consistent private actual
evidence snapshot, verify the exact migrations and authenticated routes, reserve
the unknown request maximum plus both proposed request bounds under the US$5
cumulative cap, and link the recovery durably without altering the original
session.

## Validation

- focused Slice B tests: pass, including cached-row revalidation and expired-deadline no-dispatch;
- full npm suite: 1,197 passed, 21 pre-existing skips, 0 failures;
- isolated from-zero Supabase validation: pass, 38 migrations and authenticated synthetic E2E;
- secret scan: 0 findings;
- diff check: pass;
- OpenAI/provider calls in this repair task: 0.

The Product output for the Street Kingz run is therefore **incomplete and not
available for recommendation persistence or merchant feed projection**. No
manual recommendation has been substituted.
