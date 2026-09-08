# V1-05 Slice B target-attribution contract v6

Status: NON-LIVE CONTRACT HARDENING COMPLETE — FRESH AUTHORIZATION REQUIRED

The v5 live attempt exposed a model semantic contract failure at case 007. The
Product-built inputs were valid and the benchmark labels were not changed. A
model switch was deferred so the same `gpt-4o-mini` contract can be evaluated
after hardening.

The old response schema had independent `target_attribution_state` and
`attributed_target_resources` fields, allowing structurally valid but
semantically impossible pairings. v6 uses a nested `target_attribution` with
strict `anyOf` variants: established requires at least one resource, unresolved
requires an empty resource array, and ambiguous/invalid preserve their prior
array semantics.

The provider-to-Product boundary uses one `normalizeInterpretationOutput()`
helper. It produces the unchanged internal flat fields. No database migration,
auto-repair, fixture, label, discovery, or taxonomy change was made. The
existing validator and `INVALID_TARGET_INVARIANT` defense remain active.

Versions: Slice B `v1-05-slice-b-6`; interpretation
`v1-05-interpretation-6`; discovery `v1-05-slice-a-4-provenance`; filter
`v1-05-filter-3`; instruction `v1-05-slice-b-instructions-4`.

Case 007 was reconstructed locally with three selected candidates and no
impossible Product input. The invalid established-empty and unresolved-
nonempty pairings are excluded by the v6 branch cardinality constraints.
Frozen expected interpretations replay to the same internal meanings.

The 11 commercial controls remain 10 candidate-level plus one run-level control
for V105-EVAL-021; all 11 remain evaluated and passing with no N/A cases.

The prior fixed-path paid session for acceptance SHA `830b21e…` remains
preserved with 9 consumed requests. Future live modes require a new explicit
`V105_ACCEPTANCE_SESSION_ID`; session files are isolated beneath
`artifacts/validation/v1-05/live-sessions/<SESSION_ID>/`. Preview creates no
paid-session files. A fresh owner authorization is required.
