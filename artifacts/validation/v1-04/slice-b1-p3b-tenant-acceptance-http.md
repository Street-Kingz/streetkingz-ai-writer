# V1-04 B1 P3-B — Tenant Isolation + Acceptance-Surface HTTP

Status: **BLOCKED — PROOF INCOMPLETE**

Starting SHA: `7f52cce74c4c94e0975268acc86aae755757a6dc`

This ledger is intentionally individual. P3-B was not previously executed;
rows remain UNEXECUTED until dedicated local integration suites exercise the
real routes, RLS, RPC grants, Vault boundary, and acceptance server.

| Case ID | Scenario | Boundary | Result | Test / command | Notes |
| --- | --- | --- | --- | --- | --- |
| P3B-TENANT-001 | Own-tenant positive control | GSC routes/RLS | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-002 | Missing/invalid authentication | GSC routes/Auth | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-003 | A cannot load B properties | `/properties`/RLS | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-004 | A cannot select B property | `/select`/RLS | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-005 | A cannot disconnect B | `/disconnect`/RPC | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-006 | A cannot reauth-check B | `/reauth-check`/Vault | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-007 | Symmetric B-to-A control | GSC routes/RLS | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-008 | Connect/reconnect identifier injection | `/connect`/`/reconnect` | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-009 | Status cannot be rebound | `/status` | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-010 | Callback cannot be rebound by IDs | callback/RPC | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-011 | Account/business RLS | Supabase RLS | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-012 | Base connection RLS/safe columns | Supabase RLS | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-013 | GSC connection RLS | Supabase RLS | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-014 | Organic source/run isolation | Supabase RLS | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-015 | OAuth attempts service-only | RLS/RPC | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-016 | Secret references not customer-readable | RLS/Vault | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-017 | Vault inaccessible | Vault/RPC | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-018 | Lifecycle RPCs service-only | RPC grants | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-019 | Direct DML denied | RLS/DML | UNEXECUTED | P3-B tenant suite | pending |
| P3B-TENANT-020 | Foreign attacks have no side effect | all tenant boundaries | UNEXECUTED | P3-B tenant suite | pending |
| P3B-HARNESS-001 | Normal app exposes no harness | app routing | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-002 | Runner requires explicit enablement | runner | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-003 | Production blocks startup | runner/config | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-004 | Hosted Supabase blocks startup | runner/config | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-005 | Runner binds loopback | server/socket | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-006 | Legitimate local journey | acceptance HTTP | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-007 | Non-loopback rejected | socket/peer | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-008 | Forwarded headers untrusted | peer headers | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-009 | Foreign Origin rejected | Origin/HTTP | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-010 | Host rebinding rejected | Host/HTTP | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-011 | CORS/preflight bounded | CORS/HTTP | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-012 | Static content bounded | static HTTP | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-013 | Bootstrap headers required | bootstrap | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-014 | Bootstrap non-cacheable/memory-only | bootstrap | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-015 | Safe disposable session response | session HTTP | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-016 | Synthetic verified site provisioned | session/Woo RPC | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-017 | Partial provisioning cleanup | Auth/DB/Vault | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-018 | Cleanup requires ownership/token | cleanup/Auth | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-019 | Normal user cleanup denied | cleanup/Auth | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-020 | Cross-session cleanup denied | cleanup/Auth | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-021 | Complete cleanup/no residue | Auth/DB/Vault | UNEXECUTED | P3-B acceptance suite | pending |
| P3B-HARNESS-022 | Repeated cleanup safe | cleanup/Auth | UNEXECUTED | P3-B acceptance suite | pending |

## Audit and current limitation

The acceptance router now validates an explicit local Host and marks disposable
users with protected `app_metadata`; session creation accepts a validated
synthetic HTTPS site and provisions the minimum local Woo identity. These are
bounded corrections, not proof. P3-B remains blocked until all 42 rows pass
through dedicated tests. P3-A remains complete; P4 and B2 were not executed.
