# V1-03 incremental commerce acceptance

## REAL STREET KINGZ INCREMENTAL ACCEPTANCE: PASS

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
attribution. Follow-up provider precision probing established second-level
`date_modified_gmt` serialization: rapid Product edits advanced the timestamp,
while rapid Order line-total edits did not advance the parent timestamp. The
incremental inventory therefore retains only a strict bounded Order commercial
line fingerprint (line ID, Product/Variation IDs, quantity, total, tax) and
conservatively refreshes refunded Orders. The fixture was removed after
validation. At that pre-acceptance checkpoint, no Street Kingz incremental sync
had been run and no Street Kingz data had been changed.

The corrected current-snapshot loader selects internal row IDs only for link
reconstruction, strips them from collector state, and uses deterministic
bounded paging for every Store/Generation table. Child lines and adjustments
are read through bounded Order-ID chunks. Local Supabase proof loaded two
Products with multiple Category links and carried an unchanged categorised
Product without a detail GET. A separate local proof loaded 1001 Products,
1001 Orders, 1001 Lines, 2 Categories, and 2002 links exactly once.

Canonical Product/Variation comparisons normalize database numeric and
timestamp representations before change counting. Boundary timestamps within
the explicit one-second provider precision window are re-read using the prior
successful evidence timestamp. These integrity corrections preserve the
complete-generation/LKG architecture and do not change the accepted initial
sync path.

The harness has a local-only `POST /internal/v1-03/resume` path that
rotates a temporary password for the exact existing acceptance Auth user,
without creating Product records or a Woo authorization attempt. The live
local check correctly failed closed because the current local database contains
four active Businesses with the exact acceptance name/platform, including two
connected complete Woo Stores. The selector was then narrowed to the exact
canonical Street Kingz Store URL and complete-generation readiness, uniquely
selecting the accepted tenant without guessing or modifying any other tenant.
The resume implementation is covered by focused tests for not-found,
ambiguous, hosted-Supabase, canonical URL rejection, and successful exact-tenant
cases.

The first real Street Kingz incremental run is retained below as a failed
acceptance attempt. The corrected second real incremental run passed, and this
acceptance completes the V1-03 commerce-connection boundary. V1-04 is the next
milestone and is not started.

The first real Street Kingz incremental run completed structurally but failed
acceptance: Product-category links fell from 103 to 0 while Products (30),
Variations (6), Categories (11), Orders (24), Lines (36), and Adjustments (1)
were unchanged. Read-only provider diagnostics confirmed that the inventory
request using `categories.id` returned no usable category arrays, while the
supported `categories` field returned 103 valid category IDs. The broken
generation remains current evidence and the prior complete 103-link
generation remains historical evidence. The corrected collector now requests
`categories`, validates the array and IDs, rejects orphaned categories, and
reconstructs exact links for the replacement candidate; the acceptance
reference now compares exact Product-category pairs and fingerprints category
membership. This first run is retained as FAIL evidence.

The corrected second real Street Kingz incremental sync completed with
`status=complete` and `sync_mode=incremental`. It produced 30 Products, 6
Variations, 11 Categories, 103 Product-category links, 23 Orders, 35 Order
lines, and 1 Adjustment. Its exact order window was
`2025-08-31T16:30:59.162Z` through `2026-08-31T16:30:59.162Z`. Changes were
zero Product changes, zero Variation changes, one refreshed Order, and one
expired/removed Order.

Independent reconciliation passed exact counts and exact Product-category
pair-set comparison: 30 Products, 6 Variations, 11 Categories, 103 links,
and 23 Orders. All populated commercial rows reconciled exactly. Product
2018 / Variation 2020 remained `NO_RECOGNISED_SALES` with Product NULL/NULL.

The rolling horizon was proven against real evidence: the prior generation had
24 Orders and 36 Lines; the corrected generation had 23 Orders and 35 Lines,
with one Order naturally leaving the exact 365-day window. Historical evidence
remains intact and was not converted to zero or deleted.

Freshness after promotion was complete, with `order_horizon_days=365`,
`has_current_complete_generation=true`, and `evidence_as_of` equal to the
reported last successful timestamp. The first real failure remains preserved:
the initial incremental candidate promoted with 0 links because the real Woo
inventory response for `categories.id` contained no usable category arrays.
The corrected `categories` request self-healed 0 links to 103 through the
normal Product sync path. No manual rollback or database edit was used.

REAL STREET KINGZ INCREMENTAL ACCEPTANCE: PASS
