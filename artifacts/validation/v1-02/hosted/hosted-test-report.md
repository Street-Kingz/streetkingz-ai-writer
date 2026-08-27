# Hosted and local test report

## Hosted

- source resume/migration/schema inspection: PASS
- HTTPS/health and unchanged-secret reconnection: PASS
- two-user Auth/getClaims/Product smoke: PASS
- cross-tenant and own-tenant mutation defence: PASS
- customer response/reference redaction: PASS
- Vault lifecycle and audit: PASS
- restart durability and account deletion: PASS
- portable logical destructive re-restore: PASS
- Render bad-deploy rejection and recovery: PASS

## Local

- dedicated real Supabase integration: 1 passed, 0 failed, 0 skipped
- focused V1-02: 9 passed, 0 failed
- full `npm test`: 909 passed, 0 failed, 1 skipped

The single normal-suite skip is the explicitly opt-in real-stack integration test; it was executed separately and passed. A stale local Auth volume was rebuilt after a reset left `auth.identities` absent; the rebuilt stack applied the canonical migration and the dedicated proof passed.
