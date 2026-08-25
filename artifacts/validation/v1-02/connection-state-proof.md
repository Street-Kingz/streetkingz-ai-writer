# Connection State Proof

Allowed connection and consent states and transitions are bounded in `product-kernel/constants.js`. No provider connector is implemented.

The real Product API created one synthetic Connection per tenant, transitioned Account B's Connection from `pending` to `connected` with granted consent, attached an actual synthetic Vault secret, then disconnected it through `PATCH /api/product/connections/:id`. The API returned `disconnected` with revoked consent, the database reference was null, the Vault secret no longer existed, and customer Connection responses did not expose `secret_reference`. No provider connector was implemented.

A deletion-failure proof attached a dangling opaque reference. The API returned `SECRET_OPERATION_FAILED`, retained the pending status, consent and reference for recovery, and persisted a bounded failure audit without plaintext.

Status: PASS — unit and real Product API transition proof.
