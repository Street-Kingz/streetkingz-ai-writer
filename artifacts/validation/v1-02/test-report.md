# V1-02 Test Report

Focused Product-kernel offline tests: PASS — 8 passed, 0 failed.

Dedicated real local Supabase integration: PASS — 1 passed, 0 failed, not skipped. It covers the hardened Auth, grant/RPC, RLS, Vault, audit, deletion, input/error, timestamp and durability boundaries.

Full repository suite: PASS — 908 passed, 0 failed, 1 skipped. Normal `npm test` intentionally skips the opt-in integration proof and does not claim it executed.

Canonical migration reset/reapply: PASS — two consecutive clean resets after the final migration change.
