# V1-04 B1 P4 skipped-test audit

Authoritative ordinary run: `npm test` at acceptance candidate `225f36f`.
Result: 1,086 total, 1,068 passed, 0 failed, 18 skipped, 0 todo.

All 18 skips are explicit opt-in integration parent tests. They are allowed to
remain skipped in ordinary npm because each required integration contract was
run with its dedicated flag in the same final P4 execution.

| File | Test | Condition | B1/P4 | Dedicated result |
|---|---|---|---|---|
| `test/v1-02-supabase-integration.test.js` | V1-02 hardened real Supabase boundary | `V1_02_INTEGRATION` unset | NO / YES | PASS |
| `test/v1-03-supabase-integration.test.js` | V1-03 ownership, snapshot and lifecycle | `V1_03_INTEGRATION` unset | NO / YES | PASS |
| `test/v1-03-commerce-supabase-integration.test.js` | V1-03 initial snapshot lifecycle | `V1_03_INTEGRATION` unset | NO / YES | PASS |
| `test/v1-03-commerce-supabase-integration.test.js` | V1-03 completion/disconnect races | `V1_03_INTEGRATION` unset | NO / YES | PASS |
| `test/v1-03-incremental-supabase-integration.test.js` | V1-03 incremental lifecycle | `V1_03_INTEGRATION` unset | NO / YES | PASS |
| `test/v1-03-snapshot-pagination-supabase-integration.test.js` | V1-03 pagination | `V1_03_INTEGRATION` unset | NO / YES | PASS |
| `test/v1-03-acceptance-harness-integration.test.js` | V1-03 acceptance harness | `V1_03_ACCEPTANCE_HARNESS_INTEGRATION` unset | NO / YES | PASS |
| `test/v1-04-organic-evidence-supabase-integration.test.js` | Slice-A source/run lifecycle | `V1_04_INTEGRATION` unset | YES / YES | PASS |
| `test/v1-04-gsc-b1-supabase-integration.test.js` | B1 route/Vault lifecycle | `V1_04_INTEGRATION` unset | YES / YES | PASS |
| `test/v1-04-gsc-b1-p2-integration.test.js` | P2 grouped matrix | `V1_04_P2_INTEGRATION` unset | YES / YES | PASS |
| `test/v1-04-gsc-b1-p2a-failures.test.js` | P2-A failure ledger | `V1_04_P2A_INTEGRATION` unset | YES / YES | PASS |
| `test/v1-04-gsc-b1-p2b-races.test.js` | P2-B race ledger | `V1_04_P2B_INTEGRATION` unset | YES / YES | PASS |
| `test/v1-04-gsc-b1-p3a-lifecycle.test.js` | P3-A lifecycle | `V1_04_P3A_INTEGRATION` unset | YES / YES | PASS |
| `test/v1-04-gsc-b1-p3a1-reconnect.test.js` | P3-A1 reconnect | `V1_04_P3A1_INTEGRATION` unset | YES / YES | PASS |
| `test/v1-04-gsc-b1-p3a2-reauth.test.js` | P3-A2 reauth | `V1_04_P3A2_INTEGRATION` unset | YES / YES | PASS |
| `test/v1-04-gsc-b1-p3a3-disconnect-races.test.js` | P3-A3 disconnect races | `V1_04_P3A3_INTEGRATION` unset | YES / YES | PASS |
| `test/v1-04-gsc-b1-p3b-acceptance-http.test.js` | P3-B Harness | `V1_04_P3B_HARNESS_INTEGRATION` unset | YES / YES | PASS |
| `test/v1-04-gsc-b1-p3b-tenant-isolation.test.js` | P3-B Tenant | `V1_04_P3B_TENANT_INTEGRATION` unset | YES / YES | PASS |

Static `.skip`/`.todo` occurrences: none beyond these conditional parent
tests. Early-return pseudo-skips and silent assertion bypasses: none found.
Required B1 tests unexecuted: NO.
