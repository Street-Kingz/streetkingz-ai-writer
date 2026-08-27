# Schema and Migration Proof

Canonical migration: `supabase/migrations/20260825000000_v1_02_product_kernel.sql`

The SQL defines the bounded domain, constraints, updated-at triggers, SELECT-only authenticated table grants, owner-select RLS, service-only Vault/cleanup functions and authenticated fixed-purpose mutation RPCs. Connection RPCs return an explicit customer-safe JSON projection rather than the table composite. Every SECURITY DEFINER function has an empty fixed search path and fully qualified objects; PUBLIC/anon/authenticated execution is explicitly revoked from the internal timestamp trigger helper.

The official Supabase CLI 2.115.0 applied the final canonical migration from a clean database twice consecutively. Live privilege inspection confirmed authenticated roles have read-only Product access, with Connection SELECT column-bounded to exclude `secret_reference`; exactly five bounded caller RPCs; no privileged cleanup/Vault execution; and no Vault schema/decrypted-view access.

The same effective checks passed on hosted source `sylakfcdlntshrzmesnb` after pause/resume: four RLS tables, four owner policies, zero authenticated writes, zero customer `secret_reference` grants, exactly five customer RPCs, zero unintended helper execution and zero unsafe SECURITY DEFINER search paths. Portable recovery exposed that fresh-project default grants must be reconciled after schema restore; the reviewed recovery sanitiser now performs that explicit reconciliation and the destructive re-restore regression passed.

Status: PASS — canonical migration and two clean reset/reapply runs verified.
