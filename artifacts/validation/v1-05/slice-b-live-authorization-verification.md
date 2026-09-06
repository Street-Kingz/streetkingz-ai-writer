# V1-05 Slice B live-authorization verification

Starting SHA: `9e46dce2c8b4ad5edbd47fd7d1ff7d711749a1cb`
Live provider calls: **0**. `V105_LIVE_APPROVED` was not set.

| Finding | Status | Evidence |
|---|---|---|
| AUTH-001 | CLOSED / IMPLEMENTED | Production `onRetry` no longer mutates `evaluation_run.retry_used`; the atomic DB start RPC owns it. |
| AUTH-002 | CLOSED / IMPLEMENTED | Output usage fallback uses `completion_tokens || output_tokens`. |
| AUTH-003 | CLOSED / IMPLEMENTED | `start_candidate_interpretation_attempt` checks durable aggregate output plus 4,000 before network. |
| AUTH-004 | CLOSED / IMPLEMENTED | First priced attempt establishes calculated aggregate cost. |
| AUTH-005 | CLOSED / IMPLEMENTED | Provider attaches sanitized metadata for refusal, length, content-filter, empty, and HTTP failures. |
| AUTH-006 | CLOSED / IMPLEMENTED | Fetch failures classify as `PROVIDER_OUTCOME_UNKNOWN` and are not retryable. |
| AUTH-007 | CLOSED / IMPLEMENTED | Formal cache entries use case/result wrappers. |
| AUTH-008 | CLOSED / IMPLEMENTED | Ledger binds SHA, provider/model, fixture and expectation hashes; formal verifies them. |
| AUTH-009 | ALREADY_SAFE | Slice B model packets exclude commercial fields; live formal remains unexecuted pending authorization. |
| AUTH-010 | CLOSED / IMPLEMENTED | Production checks failure-RPC error and returned value before retry. |

Applied migration hashes were independently recorded and preserved:

- 20260929: `a826af7018ac2ce8538876fe593ace1e18eccd42f9c9e4ebd99da006a1f34a16`
- 20260930: `6d9c59108dd96c6c7db03fad0b8893d743ee3dd570da7e59d2313c35f89836e9`
- 20261001: `96096919ffba3d9012283e17e3b5a8c8d020cfa6e2760a35b927af60a7c128b0`

The new monotonic migration is `20261002000000_v1_05_slice_b_live_authorization_integrity.sql`.
