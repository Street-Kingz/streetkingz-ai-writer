# V1-02 Test Report

Focused Product-kernel offline tests: PASS — 9 passed, 0 failed.

Dedicated real local Supabase integration: PASS — 1 passed, 0 failed, not skipped. It covers authenticated RPC/table secret-reference denial, account-bound Business deletion requests, portable active-Docker-context execution, malformed/oversized bodies, Auth, RLS, Vault, audit, deletion, timestamps and durability.

Full repository suite: PASS — 909 passed, 0 failed, 1 skipped. Normal `npm test` intentionally skips the opt-in integration proof and does not claim it executed.

Canonical migration reset/reapply: PASS — two consecutive clean resets after the final migration change.

Hosted source migration/effective grants, two-user Render Product smoke, destructive logical re-restore and deployment rollback: PASS. See `artifacts/validation/v1-02/hosted/hosted-test-report.md`.
