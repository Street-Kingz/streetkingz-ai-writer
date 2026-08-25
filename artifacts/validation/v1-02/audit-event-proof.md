# Audit Event Proof

AuditEvent has tenant foreign keys, bounded JSON metadata and correlation IDs. Authenticated roles receive SELECT only; insert/update/delete are revoked. Server-side bounded audit creation is isolated behind the privileged module.

Real Product API operations persisted account, business, connection and transition events. Tenant-attributable failures persisted bounded `secret_operation_failed`, `connection_transition_failed` and `tenant_access_denied` events with correlation IDs and allowlisted safe metadata. Unattributable authentication failure produced only a correlation-bound safe diagnostic.

Each customer could read its own event stream; Account A's direct query for Account B's failure/audit rows returned zero rows under RLS. Direct authenticated insert, update and delete attempts failed. Audit serialization contained no Authorization header, bearer token, password or synthetic Vault plaintext.

Status: PASS — durable success/failure evidence, customer isolation, secret-free metadata and anti-forgery grants verified.
