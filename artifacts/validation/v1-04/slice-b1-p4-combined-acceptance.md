# V1-04 B1 P4 combined non-live acceptance

Branch: `feature/v1-04-organic-evidence`  
Product implementation SHA: `b0c6365ee195156cc8e1261ba4616f4daf1566f0`  
Acceptance-tooling SHA: `225f36f867ea23d6455c0289f91b3c443705134d`

Authority: frozen P4 plan and current P1–P3 acceptance contracts. No live
Google, WooCommerce, Street Kingz or DataForSEO calls were made.

## Installation and upgrade

- Migration manifest: `artifacts/validation/v1-04/slice-b1-p4-migration-manifest.json`.
- Migration chain: 18 files, head `20260918000000_v1_04_p3a3_disconnect_consistency.sql`; duplicate/order/hash checks PASS.
- From-zero minimal stack: PASS; Slice-A, B1, P3-B Tenant security and cleanup PASS.
- Slice-A upgrade preservation: PASS; actual pre/post hash
  `80e07ac12827dbab70ad353e5cf419ba15f7af5a80b14aedec79d22e6a4c0bcf`; unaffected-state hash matched.
- B1 ran on the same migrated Business; no additional Account or Business was created.
- Upgraded P3-B Tenant security: PASS (20/20); preserved state and cleanup remained unchanged.
- Disposable DB, Vault, containers, volumes and networks: PASS/removed.

## Combined suite register

Command: `zsh scripts/validation/v1-04-b1-p4-combined.sh`

| Suite | Tests passed | Failed | Skipped | Duration |
|---|---:|---:|---:|---:|
| P1 | 7 | 0 | 0 | 1s |
| B1 focused | 6 | 0 | 0 | 0s |
| B1 route/Vault | 1 | 0 | 0 | 2s |
| P2 grouped | 9 | 0 | 0 | 3s |
| P2-A | 42 | 0 | 0 | 4s |
| P2-B | 18 | 0 | 0 | 4s |
| P3-A | 17 | 0 | 0 | 4s |
| P3-A1 | 18 | 0 | 0 | 3s |
| P3-A2 | 13 | 0 | 0 | 12s |
| P3-A3 | 23 | 0 | 0 | 26s |
| P3-B Harness | 23 | 0 | 0 | 19s |
| P3-B Tenant | 21 | 0 | 0 | 6s |
| Slice-A | 1 | 0 | 0 | 2s |
| V1-02 | 1 | 0 | 0 | 5s |
| V1-03 core/commerce | 63 | 0 | 0 | 20s |
| V1-03 incremental | 1 | 0 | 0 | 2s |
| V1-03 pagination | 1 | 0 | 0 | 1s |
| V1-03 harness | 1 | 0 | 0 | 3s |

Combined total: 263 passed, 0 failed, 0 skipped.
Ledgers: P2 52/52; P3-A 41/41; P3-B Harness 22/22; P3-B Tenant 20/20;
P3-B 42/42.

## Ordinary suite and final decision

`npm test` with all integration flags unset: exit 0; final TAP summary present;
1,086 total, 1,068 passed, 0 failed, 18 skipped, 0 todo.

Skip audit: `artifacts/validation/v1-04/slice-b1-p4-skipped-test-audit.md`;
complete, with no required B1 test unexecuted. Sensitive-data scan PASS.
Normal local Supabase remained healthy and its state was not reset. Critical and
High Product/security defects remaining: 0.

P1–P4: COMPLETE. B1: READY FOR REAL GOOGLE ACCEPTANCE. Real Google acceptance
was not performed. B2 is NOT STARTED. V1-04 remains IN PROGRESS.
