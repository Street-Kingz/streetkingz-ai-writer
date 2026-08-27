# Hosted backup and portable restore proof

## Provider-managed full recovery

Supabase provider-managed physical/restore-to-new-project capability may preserve Vault credentials and root-key state where the selected paid plan supports it. It was not exercised in this Free validation and no upgrade or charge was authorised.

## Portable logical disaster recovery — tested

The active source was logically backed up into ignored private storage, including roles, schema, data and migration history. The source Vault root key was captured privately and successfully ported to temporary Free recovery project `ripcavkuevqbusqqshbe`; the values matched privately and never entered Git/evidence.

Product, Auth, schema, migration and audit state restored. Inserting the original encrypted Vault row through the supported hosted database boundary failed because provider-managed `vault.secrets` did not grant INSERT to hosted `postgres` or service roles. Unsupported ownership changes, `supabase_admin` escalation and fabricated Vault identity were rejected.

Under O-016, the reviewed transactional sanitiser then:

- restored the exact V1-02 table/function grant model;
- disconnected and revoked the credential-bearing Connection;
- cleared its stale reference;
- set `REAUTHORISATION_REQUIRED_AFTER_RECOVERY` and a customer-safe message;
- set the Business summary to disconnected;
- inserted one tenant-bound, secret-free recovery audit event.

The operation was rerun with no duplicate audit. A Business row and a Product grant were then deliberately damaged, the same logical backup restored again, and the sanitiser reapplied. Auth sign-in, Product state, RLS, cross-tenant isolation, mutation denial and the fail-closed Connection state all returned.

The source was paused to release a Free project slot; the unrelated project was never touched. The temporary recovery project was deleted, private root-key material was removed, and source `sylakfcdlntshrzmesnb` resumed `ACTIVE_HEALTHY` with Render reconnecting unchanged.
