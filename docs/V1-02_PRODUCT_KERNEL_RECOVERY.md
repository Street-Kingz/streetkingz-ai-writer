# V1-02 Product Kernel Recovery Runbook

## Recovery policy

O-011 governs connector credentials during disaster recovery.

- A supported provider-managed physical restore may preserve Supabase Vault credentials when the selected plan explicitly provides that capability.
- A portable/manual logical restore recovers Product, Auth, schema and audit state, but connector credentials are not portable recovery material.
- Before a logically restored Product is returned to service, run `scripts/v1-02-sanitise-logical-recovery.sql` through an authorised database-administration boundary.

The sanitiser reconciles the reviewed Product grants, then atomically finds only Connections with stale `secret_reference` values. It disconnects them, revokes consent, clears the reference, records a safe re-authorisation diagnostic, updates the Business summary and creates tenant-bound recovery audit evidence. A rerun finds no stale references and creates no duplicate event.

Customer-facing wording should be: “Your store/search connection needs to be reconnected following system recovery.” Do not expose Vault, encryption or database implementation details.

## Portable logical recovery procedure

1. Create roles, schema and data dumps using the supported Supabase CLI/PostgreSQL workflow. Keep dumps outside Git in an access-controlled private location.
2. Restore roles (excluding provider-managed grants the target administrator cannot issue), schema, data and migration history into an isolated target.
3. Do not treat restored `secret_reference` values as usable. Do not attempt unsupported writes or ownership changes in provider-managed Vault schemas.
4. Execute the reviewed recovery sanitiser with stop-on-error enabled.
5. Verify four Product tables have RLS, four owner policies exist, authenticated raw writes are absent, `secret_reference` is not customer-readable, exactly five customer RPCs are executable, and service-only helpers remain restricted.
6. Verify every previously credential-bearing Connection is disconnected/revoked, has a null reference, exposes the bounded re-authorisation diagnostic, and has one recovery audit event.
7. Run two-tenant Auth/RLS/API acceptance tests before returning the target to service.

## Platform/service credential compromise

1. Identify whether the affected value is the Supabase publishable key, server secret/service-role key, management token or database credential.
2. Rotate or replace it through the supported Supabase Dashboard/API mechanism. Do not place the replacement in shell history, source control, logs or evidence.
3. Replace only the corresponding Render environment secret (`SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`; update `SUPABASE_URL` only if the project changes).
4. Restart/redeploy the reviewed Product commit.
5. Verify HTTPS health, managed Auth/getClaims, caller-scoped Product access and a bounded synthetic smoke test.
6. Disable/remove the old credential where supported and confirm it is no longer active.

## Render environment-secret compromise

Replace the affected secret in Render’s environment-secret store, redeploy/restart the service, verify the reviewed commit and health endpoint, and confirm the obsolete value is absent from the active environment and logs. Never copy a secret into a public incident record.

## Customer connector credential compromise

Customer connector credentials are separate from platform credentials and live in Supabase Vault. Disconnect/deletion removes the local Vault secret and clears its Product reference. Provider-side revocation and re-authorisation belong to the later connector milestone. Under O-011, portable disaster recovery invalidates restored connector references and requires customer re-authorisation.
