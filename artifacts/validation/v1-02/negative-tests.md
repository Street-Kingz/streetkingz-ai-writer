# Negative Tests

Real negatives cover missing/malformed/invalid auth, malformed and oversized JSON bodies, malformed UUID, invalid Business/platform/provider inputs, invalid status/consent, duplicate Business/Connection, raw PostgreSQL failure redaction, cross-tenant access, same-tenant raw table attacks, privileged RPC denial, AuditEvent forgery, genuine Vault operational failure and managed-Auth deletion failure. Product malformed JSON returns bounded 400 `INVALID_REQUEST`; an over-limit body returns bounded 413 `PAYLOAD_TOO_LARGE`, both with server UUIDs and no parser/body/path leakage.

Authenticated table insert/update/delete operations are denied even for the caller's own tenant. Fixed-purpose direct RPC attacks still derive `auth.uid()`, enforce ownership and state rules, and cannot access privileged cleanup/Vault functions.

Status: PASS.
