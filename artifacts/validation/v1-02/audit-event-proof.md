# Audit Event Proof

AuditEvent has tenant foreign keys, bounded JSON metadata and correlation IDs. Authenticated roles receive SELECT only; insert/update/delete are revoked. Server-side bounded audit creation is isolated behind the privileged module.

Account, Business and Connection creation, state transition, disconnection and deletion-request/cleanup audits are inserted in the same PostgreSQL transaction as their Product mutation by fixed-purpose RPCs. A successful mutation therefore cannot commit without its required audit. Cross-system Auth deletion failure is recorded separately against the already-safe non-operational Account state.

Tenant-attributable failures persisted bounded `secret_operation_failed`, `connection_transition_failed`, `tenant_access_denied` and `account_deletion_failed` evidence. Unattributable authentication failure produced only a server-correlation diagnostic.

Each customer could read its own event stream; Account A's direct query for Account B's failure/audit rows returned zero rows under RLS. Direct authenticated insert, update and delete attempts failed. Audit serialization contained no Authorization header, bearer token, password or synthetic Vault plaintext.

Status: PASS — transactional success audits, bounded recovery audits, isolation and anti-forgery verified.
