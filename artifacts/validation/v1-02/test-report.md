# V1-02 Test Report

Focused Product-kernel offline tests: PASS — 8 passed, 0 failed. The added proof covers Vault deletion success/failure, disconnect ordering, response minimisation and bounded failure-audit paths.

Real local Supabase integration: PASS — 1 passed, 0 failed. This end-to-end test now attaches a real synthetic Vault secret to a Connection and disconnects it through the API, proves Vault/database cleanup, exercises real Vault deletion failure and recovery state, and verifies bounded failure audits and cross-tenant audit RLS.

Full repository suite: PASS — 908 passed, 0 failed, 1 opt-in integration test skipped as designed. The separate real-stack execution passed and is not falsely counted as executed by normal `npm test`.

Canonical migration reset/reapply: PASS — two consecutive clean resets after the final migration change.
