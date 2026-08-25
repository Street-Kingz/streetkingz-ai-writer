# Negative Tests

Unit coverage includes malformed auth, invalid transitions, missing configuration, bounded internal errors, Vault failure-closed behavior, disconnect ordering, response minimisation and failure-audit source checks. Real integration negatives include unauthenticated Product API denial, second-Business rejection, cross-tenant reads and mutation returning zero rows under RLS, anonymous table denial, authenticated Vault RPC denial, invalid state and foreign-key rejection, invalid Connection transition, foreign Connection access, arbitrary AuditEvent write denial and recoverable Vault deletion failure.

The Vault failure response did not claim disconnection, retained the opaque reference, and exposed no plaintext. Its tenant audit was bounded and Account A could not read Account B's failure events.

Status: PASS.
