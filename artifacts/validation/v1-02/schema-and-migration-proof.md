# Schema and Migration Proof

Canonical migration: `supabase/migrations/20260825000000_v1_02_product_kernel.sql`

The SQL defines UUID Account, Business, Connection and AuditEvent tables; unique Auth identity and one-Business constraints; foreign keys; provider uniqueness; explicit grants; and RLS policies.

The previous `migrations/` copy was moved into the canonical Supabase directory, leaving one migration authority. The official Supabase CLI 2.115.0 applied the migration from a clean local database twice consecutively after the final migration change. Both `supabase db reset --local` runs completed successfully.

Status: PASS — canonical migration and two clean reset/reapply runs verified.
