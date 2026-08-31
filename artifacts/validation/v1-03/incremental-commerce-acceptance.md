# V1-03 incremental commerce acceptance

## INCREMENTAL IMPLEMENTATION: READY FOR REAL STREET KINGZ ACCEPTANCE

The V1 incremental path keeps complete snapshot generations. It loads the
current promoted normalized snapshot, reads bounded current WooCommerce
inventories, selectively refreshes changed Products and Orders, rebuilds
Categories and Product-category links, enumerates current variable Product
Variations, then stages and atomically promotes a complete candidate. Failed or
partial candidates remain hidden and the previous generation remains the LKG.

Each sync uses one fixed start timestamp. The exact order window is
`syncStartedAt - 365 days` through `syncStartedAt`, inclusive of the bounded
WooCommerce query contract. Orders absent from the new window are removed from
the new generation; historical generations remain untouched.

Product and Order `source_modified_at` values are the V1 watermarks. New IDs,
changed timestamps/statuses, and missing IDs are handled explicitly. Categories
are fully refreshed because the current model has no reliable category
watermark. Variations are fully enumerated for current variable Products.

The normal customer action remains `POST /api/product/woocommerce/sync`:
`initial` is selected when no current generation exists and `incremental` when
one does. `GET /api/product/woocommerce/status` exposes safe connection,
completeness, attempt, success, evidence-as-of, and 365-day horizon state. The
internal harness now presents one `Run Sync` action and displays mode, counts,
changes, window, and freshness.

Deterministic tests passed for carry-forward/idempotence, Product add/change/
removal, category/link refresh, Variation enumeration/add/change/removal,
Order add/change/status/refund, rolling expiry, exact commercial attribution,
and failed-candidate LKG behavior. Local-Supabase integration passed complete
candidate promotion, current snapshot loading, LKG preservation, tenant-safe
status routing, and cleanup on synthetic accounts.

Disposable real WooCommerce validation passed Product price/stock refresh,
Order status refresh, native refund creation, parent `date_modified_gmt`
advancement, refund-summary selection, and exact `_refunded_item_id` line
attribution. The fixture was removed after validation. No Street Kingz
incremental sync was run and no Street Kingz data was changed.

V1-03 remains In Progress. This artifact does not claim real Street Kingz
incremental acceptance or V1-03 completion.
