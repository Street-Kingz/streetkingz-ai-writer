# V1-02 Product Kernel Implementation Notes

Implementation runs on Node 22 / Express with the Supabase JavaScript client. Product configuration uses `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or local `SUPABASE_ANON_KEY`) and server-only `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`). Values are never printed or stored in artefacts.

Apply `supabase/migrations/20260825000000_v1_02_product_kernel.sql` through the Supabase migration workflow. Authenticated table access is SELECT-only under owner RLS. Supported writes use five fixed-purpose caller-scoped RPCs that derive `auth.uid()`, validate ownership/lifecycle, and atomically mutate Product state plus required audits. Service-role access is limited to Vault, managed Auth, failure audit and idempotent account cleanup; it is not normal Product CRUD.

Product routes are under `/api/product/`: account, business, connections and customer-readable audit events. Connection states are `pending`, `connected`, `error`, `disconnected`; consent states are `pending`, `granted`, `revoked`.

Supabase Vault is the connector-secret boundary. Disconnect handles Vault delete/absence, state/reference/timestamps and audit in one PostgreSQL transaction. Account deletion uses an explicit non-active lifecycle and retryable privileged cleanup before managed Auth deletion. This implementation does not connect any provider.

Run unit/contract checks with `npm test`. Start local Supabase with `npx supabase start`, reset with `npx supabase db reset --local`, and run the opt-in proof with `V1_02_INTEGRATION=1` plus the local Supabase URL, publishable key and service-role key in the process environment.
