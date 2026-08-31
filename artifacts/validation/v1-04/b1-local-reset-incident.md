# V1-04 B1 Local Acceptance Environment Incident

Classification: **LOCAL ACCEPTANCE ENVIRONMENT INCIDENT**

During the intended isolated, from-zero migration proof for B1, temporary
Supabase configuration substitution failed. The normal local Supabase project
was then targeted and `supabase db reset` was executed.

The reset left the local database with zero Accounts and zero Commerce Stores,
so the accepted local Street Kingz runtime state was lost. This was acceptance
runtime state, not a V1-03 Product failure. No old Street Kingz generations or
runtime rows were reconstructed.

Migration history remained applied through the uncommitted B1 migration. No
Google call, Woo provider call, or live Street Kingz mutation occurred. No Git
commit or push was made after B1 implementation.

The uncommitted B1 changes were preserved in a retained local Git stash and
restored to the working tree for continued validation. No ignored credential or
environment files were included in that recovery snapshot.

The old local Street Kingz Woo credential material is therefore orphaned from
the Product's local Vault state and requires manual owner revocation in
WooCommerce.
