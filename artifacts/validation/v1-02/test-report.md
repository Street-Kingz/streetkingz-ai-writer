# V1-02 Test Report

Focused Product-kernel offline tests: PASS — 7 passed, 0 failed, 1 opt-in integration test skipped as designed.

Real local Supabase integration: PASS — 1 passed, 0 failed. This single end-to-end test contains assertions covering Auth, `getClaims()`, caller-scoped Product API access, constraints, RLS/Data API isolation, Vault, audits, restart durability and deletion.

Full repository suite: PASS — 907 passed, 0 failed, 1 opt-in integration test skipped as designed.

Canonical migration reset/reapply: PASS — two consecutive clean resets after the final migration change.
