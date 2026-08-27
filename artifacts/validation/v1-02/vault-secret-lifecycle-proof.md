# Vault Secret Lifecycle Proof

The Connection stores an internal opaque reference never exposed to customers. A real authenticated direct transition with an attached live secret returned a customer-safe projection containing neither the reference property/value nor plaintext, while the secret remained present for the non-disconnect transition. Direct table selection was denied. Transactional disconnect then deleted the secret, updated state/timestamps, cleared the reference and inserted its audit atomically.

A partial-success proof pre-deleted Vault material while leaving a stale Product reference; retry succeeded and cleared it. A distinct genuine failure renamed the local Vault table under controlled database administration, producing a real operational error. The Product transaction rolled back, returned safe `SECRET_OPERATION_FAILED`, retained the reference, audited safely, and succeeded after restoration. Authenticated/anonymous roles lacked Vault schema, plaintext-view and Vault RPC privileges.

Status: PASS — real API-driven disconnect, Supabase Vault privilege boundary, success lifecycle and recoverable failure verified.

Hosted lifecycle repeated the customer denial and supported disconnect/deletion proof with synthetic text. O-011 explicitly distinguishes live Vault lifecycle from portable logical disaster recovery: the available Free hosted database role cannot restore the original provider-managed encrypted Vault row, so unsupported escalation was rejected and stale recovered references are invalidated. The affected Connection is disconnected/revoked, its reference cleared, a safe re-authorisation diagnostic and audit recorded, and no plaintext is required.
