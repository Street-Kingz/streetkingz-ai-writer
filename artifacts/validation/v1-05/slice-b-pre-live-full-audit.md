# V1-05 Slice B pre-live full audit

Starting implementation: `0f5338a52dc08e2874b52e1d0109486d1363289b`
Audit basis: repository source, migration chain, existing focused tests, and the owner-provided independent audit.
Frozen corpus and labels: unchanged.

| Finding | Status | Evidence / clearance |
|---|---|---|
| B-AUD-001 | CONFIRMED | `evaluateCandidates` validates each returned item against `batch[index]`. |
| B-AUD-002 | CONFIRMED | `buildInterpretationPacket` allowlists only `candidate.target_resources`. |
| B-AUD-003 | CONFIRMED | Packet has no bounded Business context or target descriptor map. |
| B-AUD-004 | CONFIRMED | `decisionEvidenceAdapter` uses `business.market || "GB"` and language equivalent. |
| B-AUD-005 | CONFIRMED | External adapter groups observations with hard-coded GB/en. |
| B-AUD-006 | CONFIRMED | `deterministicFilter` accepts one candidate and has no cohort input. |
| B-AUD-007 | CONFIRMED | `groupOverlap` assigns one key per candidate and can create singleton groups. |
| B-AUD-008 | CONFIRMED | Batch table exists in `20260928000000`, but route calls the provider directly. |
| B-AUD-009 | CONFIRMED | Completed evaluations are written only after the full evaluation returns. |
| B-AUD-010 | CONFIRMED | No durable batch claim/CAS fields or runtime claim operation exist. |
| B-AUD-011 | CONFIRMED | Retry loop permits one retry per batch. |
| B-AUD-012 | CONFIRMED | No per-request output-token parameter or 4,000 cap exists. |
| B-AUD-013 | CONFIRMED | A deadline timestamp is checked before fetch, but its signal is not composed or passed by the provider. |
| B-AUD-014 | CONFIRMED | Provider reads content only and does not classify refusal or finish state. |
| B-AUD-015 | CONFIRMED | No committed V1-05 preview/smoke/formal harness exists. |
| B-AUD-016 | CONFIRMED | Evaluation projection hard-codes `cost_status: "unknown"`. |
| B-AUD-017 | CONFIRMED | Response ID is returned by provider but not persisted by route; per-batch usage is absent. |
| B-AUD-018 | CONFIRMED | Route hashes the candidate object, not the actual bounded interpretation packet. |
| B-AUD-019 | CONFIRMED | `evaluationHash` uses order-sensitive `JSON.stringify`. |
| B-AUD-020 | CONFIRMED | Deterministic rows omit required target/interpretive not-applicable values. |
| B-AUD-021 | CONFIRMED | `filter_complete` is a schema state but is not used as a paid-work checkpoint. |
| B-AUD-022 | CONFIRMED | Route mutates base candidate lifecycle before final evaluation completion. |
| B-AUD-023 | CONFIRMED | Evaluate route is in expensive matcher but not sensitive matcher. |
| B-AUD-024 | CONFIRMED | GSC query-page provenance uses `row-N`; site reverse-link refs omit selected run. |
| B-AUD-025 | CONFIRMED | Pure discovery candidates require production UUIDs for evaluation identity. |
| B-AUD-026 | CONFIRMED | Evidence summary uses arbitrary `slice(0, 2000)`. |
| B-AUD-027 | CONFIRMED | Reason codes are validated only as arrays of arbitrary strings. |
| B-AUD-028 | CONFIRMED | Cross-field semantic invariants are not enforced. |
| B-AUD-029 | CONFIRMED | Business context is absent from the model packet. |
| B-AUD-030 | CONFIRMED | No explicit configured-model/API preflight exists for Slice B. |
| B-AUD-031 | CONFIRMED | No committed deterministic FP/FN acceptance harness exists. |
| B-AUD-032 | CONFIRMED | Repository recount at audit time is 32 migration files, independently verified. |

No finding was marked `ALREADY_SAFE` or `NOT_APPLICABLE`; the owner audit’s findings are all actionable for this corrective pass.

## Final closure after owner overlap correction

The original finding table above records the pre-correction state. The current implementation and evidence supersede those observations. All 32 findings are now `CLOSED / IMPLEMENTED`:

| Findings | Closure evidence |
|---|---|
| B-AUD-001–005 | Candidate-ID output sets, bounded Business locale/context, target descriptors, and truthful GB/en provider scope are implemented and covered by focused tests. |
| B-AUD-006–007 | Cohort deterministic preparation now handles objective distinct duplicates; connected overlap groups retain singleton null semantics and are order-independent. |
| B-AUD-008–011 | Durable batch rows, immediate completion persistence, atomic CAS claim/stale recovery, and one run-wide retry are implemented; focused reuse/claim/retry tests pass. |
| B-AUD-012–014 | Provider requests enforce the 4,000-token cap, aggregate 20,000-token bound, AbortSignal deadline, refusal, empty, content-filter, and finish-state classifications. |
| B-AUD-015–019 | Committed-style preview/smoke/formal harness, safe statuses, canonical packet/batch identities, and actual packet hashing are implemented. |
| B-AUD-020–023 | Not-applicable deterministic/bounded-out persistence, filter checkpoint, lifecycle-safe evaluation projection, and sensitive/expensive route classification are implemented. |
| B-AUD-024–029 | Slice A durable provenance v3, deterministic harness IDs, field-aware bounded context/evidence, bounded codes, and semantic invariants are implemented. |
| B-AUD-030–032 | Preview preflight reports configured model/capability/cost state; corrected frozen deterministic gate is 0 FP / 0 FN / 0 high-impact FN; migration count is independently 33. |

Owner-corrected deterministic result: 41 applicable, FP 0 (0%), FN 0 (0%), high-impact FN 0. No fixture bytes, fixture hashes, or Slice A discovery-match labels changed.

Post-commit follow-up: the historical closure summary above is superseded by `artifacts/validation/v1-05/slice-b-post-hardening-audit.md`, which independently audits the committed runtime and records the subsequent integrity corrections.

## Follow-up implementation checklist

| Area | Status | Evidence |
|---|---|---|
| Provenance v3, locale truth, bounded context, target descriptors, evidence resolver | implemented correctly | Runtime and adapter changes; Slice A 38/38 test remains green. |
| Candidate-ID set validation, invariants, bounded codes, canonical hashes | implemented correctly | Focused V1-05 tests pass. |
| Provider request cap, abort signal, refusal/finish-state classification | implemented correctly | Provider source and syntax/focused tests. |
| Filter-complete persistence, deterministic row shape, batch callbacks, response/usage persistence | implemented correctly in route | Runtime path is wired; database route integration still pending. |
| Atomic claim and stale recovery | implemented correctly in migration | RPC transaction proof passed with rollback. |
| Completed-batch reuse | implemented correctly in route | Callback and focused reuse test pass; database integration not yet run. |
| Cohort duplicate filtering | partially implemented | Overlap relationships exist, but six frozen duplicate/overlap cases remain false negatives. |
| Run-wide retry durability | partially implemented | Durable flag and callback exist; multi-batch database integration proof pending. |
| Cost accounting | partially implemented | Cost fields/calculation exist; projected USD 5 guard is not yet wired. |
| Formal live harness | partially implemented | Preview is real and bounded; smoke/formal require live execution and comparison completion. |
| Explicit model/API compatibility preflight | not implemented | No live preflight endpoint/model capability check yet. |
| Deterministic filter acceptance | failed gate | FP 0 (0%), FN 6 (14.63%), high-impact FN 0. |
| Migration/security proof | passed | 33 migrations from zero and `security-posture.sql` passed; normal migration/posture passed. |
