# Vault Secret Lifecycle Proof

The Connection stores an internal opaque reference never exposed to customers. Transactional disconnect derives caller ownership, treats delete and already-absent as the same secure postcondition, updates state/timestamps, clears the reference and inserts its audit atomically.

A partial-success proof pre-deleted Vault material while leaving a stale Product reference; retry succeeded and cleared it. A distinct genuine failure renamed the local Vault table under controlled database administration, producing a real operational error. The Product transaction rolled back, returned safe `SECRET_OPERATION_FAILED`, retained the reference, audited safely, and succeeded after restoration. Authenticated/anonymous roles lacked Vault schema, plaintext-view and Vault RPC privileges.

Status: PASS — real API-driven disconnect, Supabase Vault privilege boundary, success lifecycle and recoverable failure verified.
