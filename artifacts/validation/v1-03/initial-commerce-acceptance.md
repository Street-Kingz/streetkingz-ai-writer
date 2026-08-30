# V1-03 initial commerce acceptance

Status: BLOCKED until controlled real WooCommerce reconciliation succeeds.

Deterministic initial-sync collector/normaliser: 7 passed, 0 failed.
Public WooCommerce route suite: 17 passed, 0 failed.
Frozen foundation suite: 68 passed, 0 failed.
Real local V1-03 lifecycle/commerce integration: 61 passed, 0 failed.
V1-02 unit regression: 9 passed, 0 failed.
V1-02 real local integration: 1 passed, 0 failed.
Full npm suite: 1003 passed, 0 failed, 3 skipped (1006 total).

The first controlled real Woo run reached a disposable public endpoint but
received HTTP 401 before the WC_Auth approval page. A rerun with a fresh
temporary HTTPS tunnel was blocked because the quick-tunnel hostname did not
resolve. No real product, order,
refund, pagination, or commercial totals are claimed here. The temporary
Woo containers, tunnels, credentials, and logs were removed after the run.

The initial-sync implementation now uses explicit `_fields` arrays, current
variation `parent_id`, exact refund-line attribution with order-level
remainders, per-request connection/generation validity checks, one active
generation per Store with stale recovery, and separate order-grain and
generation/Product-grain net-sales views.
