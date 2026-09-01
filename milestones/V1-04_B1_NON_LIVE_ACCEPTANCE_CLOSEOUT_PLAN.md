# V1-04 B1 Non-Live Acceptance Closeout Plan

**Status:** APPROVED — EXECUTION PLAN FROZEN
**Owner:** Ben
**Approval date:** 2026-09-01
**Starting branch:** `feature/v1-04-organic-evidence`
**Starting baseline:** `af9eff91b5cbb3d235c0d22f4a268a698dcbbbe3`

This approved sub-plan sits beneath the V1-04 milestone contract; it does not
replace or expand that contract.

## Operating rules

B1 remains **BLOCKED** until all four phases are complete and accepted. Only
one phase may be active at a time; a later phase may not be started early. Each
phase receives its own implementation/proof commit. The P1–P4 order is fixed
unless Ben approves a documented change. Passing P1, P2 or P3 does not make B1
ready for real Google acceptance; P4 owns final combined closeout. Real Google
acceptance requires a separate founder-authorised task after P4. B2 remains not
started throughout this plan.

No live Google, WooCommerce, Street Kingz or DataForSEO calls are authorised by
this plan. No acceptance criterion may be weakened to obtain a pass. Previously
applied migrations must not be rewritten; any database correction requires a
new monotonic migration. Critical and High defects block progression. Historical
implementation claims do not substitute for reproducible proof.

## Fixed phase sequence

### P1 — PROPERTY IDENTITY + ACCEPTANCE-HARNESS SECURITY

**Purpose:** Correct and prove the immediate identity/security boundaries that
must exist before the rest of the acceptance matrix is trusted.

**Required scope:** validate the exact property identity returned by the
provider probe; reject missing, malformed or different returned identities;
preserve exact URL-prefix `siteUrl` and strict Domain identity; isolate the
local B1 acceptance harness from the normal Product application; make it
impossible to enable in production; bind it explicitly to loopback; remove
inherited wildcard/global CORS exposure; add an appropriate same-origin,
CSRF or one-time local bootstrap boundary; preserve raw socket-peer validation
as defence in depth; verify local-only Supabase/environment use; add focused
deterministic and HTTP regression proof.

**Explicit exclusions:** the full OAuth failure matrix, callback concurrency
matrix, reconnect lifecycle matrix, full two-tenant route matrix, final
acceptance-surface matrix, migration closeout, B1 acceptance, real Google OAuth
and B2.

**Completion:** P1 is complete only when the immediate identity and harness
defects are fixed and focused proof passes. B1 remains blocked.

### P2 — OAUTH FAILURE + REPLAY/RACE MATRIX

**Purpose:** Prove failure safety, state secrecy, expiry, one-time callback
behaviour and atomic race handling through the real route/RPC/Vault lifecycle.

**Required scope:** malformed, missing, unknown, expired and consumed state;
provider denial and callback errors; missing code; token exchange failures;
invalid/missing refresh credentials; malformed provider responses;
staged-secret cleanup; simultaneous starts; duplicate and concurrent callbacks;
callback/expiry and activation/expiry races; deterministic winner/fail-safe
behaviour.

**Completion:** P2 is complete only when every approved failure/replay/race
case has durable non-live proof. B1 remains blocked.

### P3 — RECONNECT + REAUTH + DISCONNECT + TENANT/HTTP

**Purpose:** Prove the complete active-connection lifecycle and tenant/security
surface.

**Required scope:** reconnect pending/success/failure/expiry; atomic credential
replacement; old-secret cleanup; no orphan staged credentials;
property-change verification; active `invalid_grant` to
`reauthentication_required`; LKG preservation; disconnect; repeated disconnect;
reconnect after disconnect; complete two-tenant route/RPC/RLS matrix; complete
acceptance-surface HTTP/spoof/cleanup matrix.

**Completion:** P3 is complete only when lifecycle, tenant isolation and
acceptance HTTP security are proven. B1 remains blocked.

### P4 — MIGRATION + COMBINED ACCEPTANCE CLOSEOUT

**Purpose:** Prove installation and upgrade integrity, audit every required test
and make the final B1 acceptance decision.

**Required scope:** isolated from-zero migration proof; isolated accepted
Slice-A to B1 upgrade proof; preservation of existing source/run/LKG state;
complete skipped-test audit; combined rerun of P1–P3 evidence; V1-02,
V1-03 and Slice-A regressions; full npm suite; sensitive-data scan; final
defects and acceptance report; minimal current-state documentation update.

**Completion:** B1 may become **READY FOR REAL GOOGLE ACCEPTANCE** only if every
required non-live case passes, Critical = 0, High = 0, no required case is
unproven, no required acceptance test remains unexecuted, and evidence is
reproducible. P4 does not authorise a real Google run and does not start B2.

## Change control

A change to phase order, phase boundary, completion condition, pass gate,
real-provider authorization or the B2 boundary requires a documented reason,
evidence, impact, Ben approval and a repository update before implementation.
Codex may report that this plan is technically wrong but may not silently
replace it.

## Status

| Phase | Status |
| --- | --- |
| P1 — Property Identity + Acceptance-Harness Security | NOT STARTED |
| P2 — OAuth Failure + Replay/Race Matrix | NOT STARTED |
| P3 — Reconnect + Reauth + Disconnect + Tenant/HTTP | NOT STARTED |
| P4 — Migration + Combined Acceptance Closeout | NOT STARTED |
