# V1-03 initial commerce acceptance

## INITIAL COMMERCE SYNC: PASS

Real owner-authorised Street Kingz WooCommerce acceptance completed through
the official browser Application Authentication flow. The permission is
read-only. Product callback and verification succeeded, and no WooCommerce
write operation was performed.

The accepted initial sync promoted a complete generation with:

- Products: 30
- Variations: 6
- Categories: 11
- Product-category links: 103
- Orders: 24
- Order lines: 36
- Adjustments: 1

Exact order window:

- Start: `2025-08-31T09:20:35.909Z`
- End: `2026-08-31T09:20:35.909Z`

Independent WooCommerce reference reconciliation passed with unchanged source
fingerprint:

- Products: 30 / 30 PASS
- Variations: 6 / 6 PASS
- Categories: 11 / 11 PASS
- Orders: 24 / 24 PASS
- Every populated Product/Variation commercial row matched exactly.

The real-world edge case for Product `2018` / Variation `2020` was accepted as
`NO_RECOGNISED_SALES`: Woo Order `3151` was `failed`, its Product line `273`
was `excluded`, and its line total was `12.99` with tax `0` and refund total
and tax `0`. The independent reference had no recognised commercial row, and
the Product aggregate was explicitly NULL/NULL. This is a PASS and required no
Product code change.

Supporting V1-03 evidence remains accepted for genuine refund attribution and
fails-closed money handling, multi-page collection, atomic/LKG generation
promotion, concurrency/stale-worker protection, callback/return lifecycle,
read-key mutation rejection, RLS tenant isolation, clean rebuild, and PII
filtering/sensitive-data review. The Street Kingz store was not deliberately
broken to repeat synthetic failure exercises.

Street Kingz remains connected intentionally with read-only consent for the
next V1-03 incremental-sync validation. This acceptance is only the initial
commerce-sync slice; it does not mean V1-03 is complete. No credentials,
customer PII, raw orders/responses, tunnel URLs, or Vault references are stored
in this artifact.
