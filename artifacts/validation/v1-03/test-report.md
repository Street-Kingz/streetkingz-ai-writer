# V1-03 verification test report

- Focused V1-03 service/transport: 67 passed, 0 failed.
- Public WooCommerce route-focused synthetic suite: 11 passed, 0 failed.
- Dedicated real local Supabase V1-03: 52 named behaviours passed (53 TAP tests including parent), 0 failed.
- V1-02 focused unit regression: 9 passed, 0 failed.
- V1-02 real local Supabase regression: 1 passed, 0 failed.
- Full `npm test`: 987 passed, 0 failed, 2 intentionally skipped integration entry points.
- No SQL changed in this route slice; no additional database reset was required.
- Sensitive-data scan: passed; no local Supabase key, `.env`, or real WooCommerce credential is tracked.
- Canonical-host contract: passed; trailing slash normalised, WordPress base path preserved, exact canonical HTTPS host required, host-changing redirects rejected with credentials.
- Complete route-slice review: 0 Critical, 0 High remaining in scope.
