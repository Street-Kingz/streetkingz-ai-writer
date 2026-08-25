# Connection State Proof

Allowed connection and consent states and transitions are bounded in `product-kernel/constants.js`. No provider connector is implemented.

The real Product API created one synthetic Connection per tenant and used the caller-scoped transactional transition RPC. `connected_at` and `updated_at` changed on connection; `disconnected_at` changed on disconnect. Business `connection_status` provides the required durable connection summary. An attached synthetic Vault secret was atomically deleted with disconnection, reference clearing and audit insertion. Customer-safe JSON projections from both Connection RPCs exclude `secret_reference`; direct table reads and Express responses also deny it.

A genuine Vault operational failure rolled the transaction back, returned `SECRET_OPERATION_FAILED`, retained recoverable state/reference and persisted bounded failure evidence. A later retry succeeded. Invalid state/consent combinations were rejected by the RPC itself.

Status: PASS — unit and real Product API transition proof.
