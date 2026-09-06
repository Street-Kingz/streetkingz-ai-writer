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
