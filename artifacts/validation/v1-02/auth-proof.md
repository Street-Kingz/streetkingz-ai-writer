# Authentication Proof

The Product middleware parses bearer headers and verifies identity through Supabase `auth.getClaims(token)`. It rejects missing, malformed and invalid credentials and never authorizes from `getSession()`.

On 2026-08-25, two synthetic managed users were created in the official local Supabase Auth service, signed in independently with passwords, and received distinct access tokens. `auth.getClaims(token)` returned each expected managed user ID. Missing bearer authentication returned `AUTH_REQUIRED`, and the deleted user could no longer sign in.

Status: PASS — real local Supabase Auth and `getClaims()` verified.
