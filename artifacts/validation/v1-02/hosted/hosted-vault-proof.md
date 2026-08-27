# Hosted Vault proof

Using synthetic credential text only, hosted validation created a Vault secret through the privileged boundary, attached only its opaque reference internally, and proved the authenticated customer could read neither Vault plaintext nor `secret_reference`. A direct customer RPC response contained neither value.

Supported API disconnect deleted the Vault secret, cleared the internal reference, revoked consent, returned a customer-safe response and wrote audit evidence. Synthetic secrets were cleaned up.

Portable logical recovery is governed separately by O-011: connector credentials are not claimed as portable. Restored stale references are invalidated and require re-authorisation.
