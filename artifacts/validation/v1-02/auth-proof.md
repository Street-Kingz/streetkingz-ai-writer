# Authentication Proof

The Product middleware parses bearer headers and verifies identity through Supabase `auth.getClaims(token)`. It rejects missing, malformed and invalid credentials and never authorizes from `getSession()`.

On 2026-08-25, two synthetic managed users signed in independently and `auth.getClaims(token)` returned each expected subject. A refresh-token renewal produced a valid access token for the same subject. Managed sign-out revoked refresh state; as documented by Supabase, the already-issued access JWT remained valid until expiry. After final user deletion, sign-in and refresh both failed. Missing, malformed and invalid bearer credentials were safely rejected.

Status: PASS — real managed sign-in, `getClaims()`, renewal, logout and deletion behavior verified.
