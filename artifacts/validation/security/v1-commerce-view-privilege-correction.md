# V1 commerce view privilege correction

The from-zero Supabase proof reproduced authenticated relation privileges on
`public.commerce_product_net_sales` and
`public.commerce_product_net_sales_by_generation`, both service-only views.
No authenticated customer Product path uses them.

The monotonic migration
`20260927000000_v1_security_view_privilege_correction.sql` revokes all
relation privileges from `public`, `anon` and `authenticated`, restores
explicit `SELECT` for `service_role`, and sets future public table-like
objects to deny authenticated privileges by default.

The permanent posture assertion rejects any authenticated privilege on a public
view. The corrected 31-migration disposable chain and the preserved normal
database both pass. No normal reset occurred and no credentials or customer
data are included here.
