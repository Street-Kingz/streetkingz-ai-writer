# Vault Secret Lifecycle Proof

The Connection model stores only a nullable opaque `secret_reference`, which is no longer exposed by normal customer Connection responses. A synthetic secret was created through a service-role-only security-definer RPC, attached to a real Connection, and disconnected through the Product API. The disconnect deleted Vault material before caller-scoped CRUD cleared the reference; a subsequent privileged read returned null.

The failure path used a dangling opaque reference so the real Vault deletion RPC returned failure. The API returned safe `SECRET_OPERATION_FAILED`, did not report disconnection, retained status/consent/reference for retry, emitted bounded audit evidence, and exposed no plaintext. Account deletion also removed an attached synthetic Vault secret before deleting the managed identity. No synthetic plaintext was written to public artefacts.

Status: PASS — real API-driven disconnect, Supabase Vault privilege boundary, success lifecycle and recoverable failure verified.
