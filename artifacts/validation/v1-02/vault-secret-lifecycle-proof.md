# Vault Secret Lifecycle Proof

The Connection model stores only a nullable opaque `secret_reference`. A synthetic secret was created through a service-role-only security-definer RPC, returned only an opaque UUID, was decrypted successfully through the privileged read proof, and was inaccessible through an authenticated caller. Deletion removed the secret: a subsequent privileged read returned null. Account deletion also removed an attached synthetic Vault secret before deleting the managed identity. No synthetic plaintext was written to public artefacts.

Status: PASS — real Supabase Vault privilege boundary and synthetic create/read/delete lifecycle verified.
