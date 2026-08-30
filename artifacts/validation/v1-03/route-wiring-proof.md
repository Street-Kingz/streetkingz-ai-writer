# V1-03 public WooCommerce route wiring proof

- Initiation: `POST /api/product/woocommerce/authorize`; tenant-scoped Product Bearer authentication, Woo-only connection ownership, frozen URL/DNS validation, opaque ten-minute attempt, server-controlled callback/return paths, and exact `read` scope.
- Callback: `POST /api/product/woocommerce/callback`; JSON-only route parser limited to 8 KB. Durable Phase-1 capture is acknowledged with an empty HTTP 200 before best-effort Phase-2 verification.
- Return: `GET /api/product/woocommerce/return`; only exact `success=0|1` and bounded opaque `user_id` are accepted. `success=1` alone cannot connect; denial is fixed-purpose and cannot overwrite callback-received or consumed state.
- Verify: `POST /api/product/woocommerce/verify`; authenticated tenant-scoped retry path. The narrow service boundary selects callback-received state, reads only the Vault credential fields required by `establishWooConnection`, and never returns the credential or reference.
- Ordering: synthetic route tests prove callback-before-return and return-before-callback, including success without callback remaining processing.
- Route-focused synthetic suite: 14 passed, 0 failed, including numeric `key_id`, charset content type, invalid legacy connected-state rejection, expired-attempt short-circuit, no-store/referrer headers, and callback/background-return race modelling.
- Correction migration: generic customer transitions cannot manage Woo provider state; connected Woo rows require granted consent, a Vault reference, and an established Commerce Store. Completion of an already-consumed valid attempt is idempotent.
- Existing V1-03 foundation regression: 67 passed, 0 failed.
- Critical remaining: 0. High remaining: 0.
