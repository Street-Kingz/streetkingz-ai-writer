# V1-03 initial commerce acceptance

Status: BLOCKED: required real refund fixture and full commercial reconciliation did not complete.

Deterministic initial-sync collector/normaliser: 7 passed, 0 failed.
Public WooCommerce route suite: 17 passed, 0 failed.
Frozen foundation suite: 68 passed, 0 failed.
Real local V1-03 lifecycle/commerce integration: 63 passed, 0 failed.
V1-02 unit regression: 9 passed, 0 failed.
V1-02 real local integration: 1 passed, 0 failed.
Full npm suite: 1010 tests; 1006 passed, 0 failed, 4 skipped.

Controlled real Woo authentication succeeded against disposable WordPress 7.1
and WooCommerce 11.0.1. The real callback returned HTTP 200 with an empty
body, Product verified system_status, and the initial sync observed 4
Products, 2 Variations, 3 Categories, and 7 Orders across multiple Product
and Order pages with per-page size 2. A read GET returned 200 and a read-key
mutation returned 401.

The real Product sync promoted a complete candidate for those available
fixtures and the disconnected historical success=1 and success=0 return URLs
both reported disconnected.

The disposable refund helper was diagnosed and corrected locally: the prior
failure was the fixture code treating Woo's integer order-item ID as an item
object. One native `wc_create_refund()` partial refund is now proven with a
real refund ID, parent order, and `_refunded_item_id`. The full required real
refund matrix, Product sync using those refunds, and independent commercial
total reconciliation were not completed in this run. No complete real
commercial acceptance is claimed. The temporary
Woo containers, tunnels, credentials, and logs were removed after the run.

The initial-sync implementation now uses explicit `_fields` arrays, current
variation `parent_id`, exact refund-line attribution with order-level
remainders, per-request connection/generation validity checks, one active
generation per Store with stale recovery, and separate order-grain and
generation/Product-grain net-sales views.
