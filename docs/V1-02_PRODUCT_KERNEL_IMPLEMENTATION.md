# V1-02 Product Kernel Implementation Notes

Implementation runs on Node 22 / Express with the Supabase JavaScript client. Product configuration uses `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or local `SUPABASE_ANON_KEY`) and server-only `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`). Values are never printed or stored in artefacts.

Apply `supabase/migrations/20260825000000_v1_02_product_kernel.sql` through the Supabase migration workflow. Authenticated table access is SELECT-only under owner RLS. Supported writes use five fixed-purpose caller-scoped RPCs that derive `auth.uid()`, validate ownership/lifecycle, and atomically mutate Product state plus required audits. Service-role access is limited to Vault, managed Auth, failure audit and idempotent account cleanup; it is not normal Product CRUD.

Product routes are under `/api/product/`: account, business, connections and customer-readable audit events. Connection states are `pending`, `connected`, `error`, `disconnected`; consent states are `pending`, `granted`, `revoked`. Customer-callable Connection RPCs return explicit JSON projections excluding `secret_reference`, matching the Express response boundary. Malformed and oversized Product request bodies receive bounded Product JSON errors.

Supabase Vault is the connector-secret boundary. Disconnect handles Vault delete/absence, state/reference/timestamps and audit in one PostgreSQL transaction. Account deletion atomically marks its existing Business deletion-requested and audits both intentions before retryable privileged cleanup and managed Auth deletion. V1-02 has no standalone Business-only deletion flow. This implementation does not connect any provider.

Run unit/contract checks with `npm test`. Start local Supabase with `npx supabase start`, reset with `npx supabase db reset --local`, and run the opt-in proof with `V1_02_INTEGRATION=1` plus the local Supabase URL, publishable key and service-role key in the process environment. The test invokes `docker` through the caller's active Docker context/environment; it contains no user-specific socket or runtime path.

Hosted validation uses an isolated London Supabase project and a Free Render Node service. O-011 defines portable disaster recovery: Product/Auth/schema/audit state is restored, while stale connector credential references fail closed through `scripts/v1-02-sanitise-logical-recovery.sql` and require customer re-authorisation. Provider-managed credential-preserving restore remains plan-dependent and was not exercised on Free. See `docs/V1-02_PRODUCT_KERNEL_RECOVERY.md`.
