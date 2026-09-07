# V1-05 Slice B commercial control-mode clarification

Status: OWNER APPROVED / FROZEN — SLICE B COMMERCIAL CONTROL MODE CLARIFICATION

The prior harness requirement that every commercial-sensitive case have a
`primary_candidate_match` was contradictory to the frozen truth for
`V105-EVAL-021`. That case intentionally represents insufficient evidence:
`discoverable=false`, `primary_candidate_match=null`, and
`interpretation_applicable=false`. No primary candidate is fabricated and no
frozen label is changed.

Slice B therefore has two harness-only control modes. Ten commercial-sensitive
cases with a frozen primary match use `candidate_level`. `V105-EVAL-021` alone
uses `run_level_insufficient_evidence_control`, comparing the complete bounded
organic preparation boundary before model execution. It is evaluated and is
not not-applicable.

The resulting control population is exactly 10 candidate-level cases, 1
run-level case, 11 commercial-sensitive controls, and 0 not-applicable
controls. The run-level control proves only that approved commercial-field
stripping does not alter Slice B organic preparation or model-facing inputs;
later commercial confidence effects remain outside Slice B.

No fixture bytes, fixture hashes, discovery matches, Product semantics, or
thresholds change. Slice C remains not authorised.
