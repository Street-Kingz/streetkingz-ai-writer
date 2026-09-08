# V1-05 Slice B — Hierarchical Intent Provider Contract

Status: NON-LIVE READY — FINAL SOL REVALIDATION AUTHORIZATION REQUIRED

## Contract decision

The flat ten-way provider output mixed job family, selection scope, comparison
mode, information breadth, navigation destination, multiplicity, and fallback
resolution. This implementation moves only the provider boundary to a coherent
hierarchy. The internal `intent_class` enum, scorer, persistence, fixtures,
expectations, thresholds, and commercial controls remain unchanged.

## Provider hierarchy

The strict provider field is `intent`, with branch-specific objects:

- `selection` with subtype `product`, `category`, `comparison`, or `uncertain`;
- `information` with scope `bounded` or `broad`;
- `navigation` with destination `brand` or `discovery`;
- `mixed` with no branch field;
- `uncertain` with no branch field.

Each branch has `additionalProperties: false` and required fields, so
cross-branch combinations cannot be emitted as valid structured output.

## Normalization and compatibility

`normalizeHierarchicalIntent()` is the authoritative provider-to-legacy mapping
used by `normalizeInterpretationOutput()`. It maps all ten branches exactly to
the existing `intent_class` values. Downstream Product code therefore continues
to receive the flat internal shape, with no database migration.

The v6 nested `target_attribution` contract and all other interpretation fields
are unchanged. No deterministic keyword or candidate-type intent heuristic was
added.

## Versions and identity

- Slice A: `v1-05-slice-a-4-provenance`
- Filter: `v1-05-filter-3`
- Slice B: `v1-05-slice-b-6`
- Interpretation: `v1-05-interpretation-7`
- Instruction: `v1-05-slice-b-instructions-6`
- Migrations: 36; no migration required.

Interpretation and instruction versions participate in request input/batch and
acceptance cache identity. Historical instructions-4/instructions-5 paid
results are not reusable as instructions-6/interpretation-7 acceptance data.

## Frozen truth and controls

The frozen evaluation inputs, corpus, expectations, discovery matches, labels,
and thresholds were not changed. All ten frozen intent labels are represented
exactly once and round-trip deterministically through the hierarchy. Existing
durable retry and configured cost controls remain in force: one session-wide
formal retry, 40 requests, pre-network cost guarding, and smoke retry
forbidden. Commercial neutrality remains 11/11 PASS, with 10 candidate-level
and 1 run-level controls.

## Offline validation

Focused tests prove strict branch structure, invalid cross-branch rejection,
ten-label round trips, unchanged downstream flat shape, v6 target schema,
provider request construction, retry/cost governance, and Sol medium settings.
The zero-call preview passed with 38 formal cases, 1 smoke, 39 base requests,
40 maximum requests, 11/11 commercial controls, 0 provider calls, and a
conservative hard-40 cost bound of `$5.546424` against the configured `$6` cap.
The full npm suite passed with 1,184 tests, 0 failures, and 21 existing skips.

Future configuration is Sol medium with a separately authorized fresh session;
no paid ledger was created and no OpenAI call was made in this task.
