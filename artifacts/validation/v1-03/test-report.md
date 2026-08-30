# V1-03 verification test report

- Focused V1-03 service/transport: 68 passed, 0 failed.
- Initial commerce collector/normaliser suite: 7 passed, 0 failed.
- Public WooCommerce route-only synthetic suite: 17 passed, 0 failed.
- Woo maintenance unit suite: 2 passed, 0 failed.
- Dedicated real local Supabase V1-03: 60 named lifecycle behaviours plus 1 commerce integration test passed (61 TAP tests), 0 failed.
- V1-02 focused unit regression: 9 passed, 0 failed.
- V1-02 real local Supabase regression: 1 passed, 0 failed.
- Full `npm test`: 1006 passed, 0 failed, 4 intentionally skipped integration entry points (1010 total).
- SQL changed for initial-sync staging, net-sales derivation, and active-generation enforcement; clean reset and post-reset integration passed.
- Post-correction real local Supabase V1-03: 61 TAP tests passed, 0 failed.
- Controlled real Woo initial-commerce reconciliation: BLOCKED. Real Woo authentication and initial sync succeeded with 4 Products, 2 Variations, 3 Categories, and 7 Orders across Product/Order pages, but the disposable refund fixture could not be created, so required refund and commercial-total reconciliation is not claimed.
- Sensitive-data scan: passed; no local Supabase key, `.env`, or real WooCommerce credential is tracked.
- Canonical-host contract: passed; trailing slash normalised, WordPress base path preserved, exact canonical HTTPS host required, host-changing redirects rejected with credentials.
- Complete lifecycle correction review: 0 Critical, 0 High remaining in scope.
