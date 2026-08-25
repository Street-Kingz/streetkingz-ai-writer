# Negative Tests

Unit coverage includes malformed auth, invalid transitions, missing configuration, bounded internal errors, Vault failure-closed behavior and privilege-boundary source checks. Real integration negatives include unauthenticated Product API denial, second-Business rejection, cross-tenant reads and mutation returning zero rows under RLS, anonymous table denial, authenticated Vault RPC denial, invalid state constraint rejection and invalid-owner foreign-key rejection.

Status: PASS.
