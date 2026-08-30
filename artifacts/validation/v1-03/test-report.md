# V1-03 verification test report

- Focused V1-03 service/transport: 67 passed, 0 failed.
- Public WooCommerce route-only synthetic suite: 15 passed, 0 failed.
- Woo maintenance unit suite: 2 passed, 0 failed.
- Dedicated real local Supabase V1-03: 59 named behaviours passed (60 TAP tests including parent), 0 failed, including disconnect cancellation, Vault cleanup, stale returns, and completion/disconnect convergence.
- V1-02 focused unit regression: 9 passed, 0 failed.
- V1-02 real local Supabase regression: 1 passed, 0 failed.
- Full `npm test`: 994 passed, 0 failed, 2 intentionally skipped integration entry points.
- Final clean `npx supabase db reset --local --debug`: passed; output ended with `Finished supabase db reset on branch feature/v1-03-woocommerce-commerce-connection.`
- Post-reset real local Supabase V1-03: 53 named behaviours passed (54 TAP tests including parent), 0 failed.
- Sensitive-data scan: passed; no local Supabase key, `.env`, or real WooCommerce credential is tracked.
- Canonical-host contract: passed; trailing slash normalised, WordPress base path preserved, exact canonical HTTPS host required, host-changing redirects rejected with credentials.
- Complete lifecycle correction review: 0 Critical, 0 High remaining in scope.
