# V1-03 controlled synthetic WooCommerce E2E acceptance

Date: 2026-08-30

This record is sanitised. Temporary tunnel hostnames, credentials, bearer
tokens, opaque attempt tokens, Vault references, raw callback JSON, and raw
`system_status` output are intentionally omitted.

- Disposable provider: WordPress 7.1 with WooCommerce 11.0.1.
- Application Authentication Endpoint: `/wc-auth/v1/authorize`.
- WooCommerce sent a real JSON callback with `Content-Type: application/json;charset=UTF-8`, numeric positive `key_id`, separate consumer credentials, and `key_permissions=read`.
- Product durably captured Phase 1 and returned HTTP 200 with an empty body.
- WooCommerce then returned the browser with `success=1`; Product performed authenticated `system_status` verification and established the connection.
- Normalised identity persisted: HTTPS home/site URLs, WooCommerce version 11.0.1, UTC timezone, USD currency.
- Final state: one matching Commerce Store, consumed attempt, Connection connected/granted, credential only in Vault, no attempt credential reference.
- Direct test-only authenticated GET succeeded; a disposable product mutation was rejected with HTTP 401 and no product was created. Product runtime remained GET-only.
- Real denial flow: `success=0` returned denied; attempt became denied; no credential or Commerce Store remained.
- Reauthorisation flow: same Store remained attached, Connection remained connected, and the replacement local credential was attached while the prior local credential was replaced. Remote Woo key revocation is not claimed.
- Disconnect flow: Connection became disconnected/revoked, local credential was deleted, Store became stale, and both historical `success=1` and `success=0` return URLs reported disconnected.
- Cleanup: synthetic Auth users deleted, generated remote Woo API keys deleted from the disposable store, temporary Product/store tunnels stopped, disposable WordPress/MariaDB resources removed, and private raw logs removed.

Result: real controlled synthetic WooCommerce authentication acceptance PASS.
