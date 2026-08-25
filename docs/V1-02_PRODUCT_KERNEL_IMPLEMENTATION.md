# V1-02 Product Kernel Implementation Notes

Implementation runs on Node 22 / Express with the Supabase JavaScript client. Product configuration uses `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or local `SUPABASE_ANON_KEY`) and server-only `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`). Values are never printed or stored in artefacts.

Apply `supabase/migrations/20260825000000_v1_02_product_kernel.sql` through the Supabase migration workflow. The migration creates Account, Business, Connection and AuditEvent tables, database constraints, explicit RLS policies and service-role-only Vault RPC wrappers. Normal Product requests use the caller-scoped client with the bearer token. Only `product-kernel/privileged.js` may construct the privileged client.

Product routes are under `/api/product/`: account, business, connections and customer-readable audit events. Connection states are `pending`, `connected`, `error`, `disconnected`; consent states are `pending`, `granted`, `revoked`.

Supabase Vault is the connector-secret store boundary. Real local integration verifies privileged synthetic secret creation/read/deletion and authenticated denial. This implementation does not connect WooCommerce, Search Console or DataForSEO. Account deletion deletes attached Vault secrets, Product data and the managed Auth identity.

Run unit/contract checks with `npm test`. Start local Supabase with `npx supabase start`, reset with `npx supabase db reset --local`, and run the opt-in proof with `V1_02_INTEGRATION=1` plus the local Supabase URL, publishable key and service-role key in the process environment.
