# Schema and Migration Proof

Canonical migration: `supabase/migrations/20260825000000_v1_02_product_kernel.sql`

The SQL defines the bounded domain, constraints, updated-at triggers, SELECT-only authenticated table grants, owner-select RLS, service-only Vault/cleanup functions and authenticated fixed-purpose mutation RPCs. Every SECURITY DEFINER function has an empty fixed search path and fully qualified objects.

The official Supabase CLI 2.115.0 applied the final canonical migration from a clean database twice consecutively. Live privilege inspection confirmed authenticated roles have read-only Product access, with Connection SELECT column-bounded to exclude `secret_reference`; exactly five bounded caller RPCs; no privileged cleanup/Vault execution; and no Vault schema/decrypted-view access.

Status: PASS — canonical migration and two clean reset/reapply runs verified.
