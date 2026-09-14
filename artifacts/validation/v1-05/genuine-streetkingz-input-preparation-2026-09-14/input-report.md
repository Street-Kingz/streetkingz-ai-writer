# Genuine Street Kingz Product Input Report

Prepared: 2026-09-14T12:26:04Z

Status: VERIFIED INPUT PREPARATION — NOT PRODUCT-QUALITY ACCEPTANCE

Isolated destination: `/private/tmp/streetkingz-v105-input-20260914-ad9sko` (API port 64150; DB port 64151)
Report path: `/Users/ben/Documents/GitHub/streetkingz-ai-writer/artifacts/validation/v1-05/genuine-streetkingz-input-preparation-2026-09-14/input-report.md`

## Source and acquisition

- Source: https://streetkingz.co.uk/; verified one-product read was confirmed by Ben as `WOO_READ_ACCESS_VERIFIED`.
- Catalogue acquired at 2026-09-14T09:52:31.768Z UTC through `wooCollectionRequest`, GET only: 4 WooCommerce requests/responses, with every response page validated against WooCommerce total/page headers.
- An unchanged mode-0600 private archive is retained outside the temporary directory and Git; SHA-256: `b63fd10c97f88aa7588f448e347567d5c9b1ebdb1924433d1440a154d489c4c2`.
- Products: 30; categories: 11; product/category relationships: 103; supported variations: 6. Orders and customer identities requested: 0.
- Source product/category/variation IDs were checked for uniqueness; variation parents and product/category relationships were reconciled. Imported product IDs: 30; categories: 11; relationships: 103; variations: 6.
- Prices and stock values are source values. Currency context from the previously retained store record: GBP.

## Normal Product loader selection

The existing `loadDiscoveryEvidence` Product input loader ran against the new destination after generation 1 was marked current. It selected 30/30 products, 11/11 categories, and 103/103 product/category relationships. Generation selection PASS; product source-ID and name/URL/price/stock match PASS; category source-ID and name/parent match PASS; relationship source-pair match PASS; Search Console run and selected observation identities match PASS: 1,125/1,125 unique observations from the selected run, including original values and provenance. The loader packet identity now includes all selected rows and coverage metadata.

Current packet identity after full selection: input hash `86169566a917cff4f4383890dcca35c5a7ab06608067fa8b565df447b90e9ab7`; snapshot fingerprint `d252b43286bc715e92b851f770c6ac55e9084adbeb272a8efd802a5ed5f45e86`.

Variations imported: 6; variations selected by the normal Product input loader: 0 (the loader currently does not read `commerce_variations`). No hand-assembled replacement packet was used. Product names and URLs selected by the loader:

- **XL Drying Towel – 800GSM** — https://streetkingz.co.uk/product/xl-drying-towel-800gsm/; current 16.99; regular 16.99; instock; source ID 67.
- **CORAL FLEECE CLOTHS – 2 PACK** — https://streetkingz.co.uk/product/coral-fleece-cloths-2-pack/; current 7.99; regular 7.99; instock; source ID 68.
- **Microfibre Wash Mitt** — https://streetkingz.co.uk/product/microfibre-wash-mitt/; current 9.99; regular 9.99; instock; source ID 69.
- **Heavy Duty Car Drying Towel – 1200GSM** — https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/; current 18.99; regular 18.99; instock; source ID 70.
- **Paint Protection Cloth** — https://streetkingz.co.uk/product/paint-protection-cloth/; current 2.99; regular 2.99; instock; source ID 873.
- **Ultra Wash and Dry Set** — https://streetkingz.co.uk/product/ultra-wash-and-dry-set/; current 25.99; regular 25.99; instock; source ID 1176.
- **Twisted Loop Power Pack** — https://streetkingz.co.uk/product/twisted-loop-power-pack/; current 29.99; regular 29.99; instock; source ID 1180.
- **XL Wash & Dry Set** — https://streetkingz.co.uk/product/xl-wash-dry-set/; current 23.99; regular 23.99; instock; source ID 1181.
- **The XL Barrel Brush** — https://streetkingz.co.uk/product/the-xl-barrel-brush/; current 16.99; regular 16.99; instock; source ID 1486.
- **Wheel Belt Flosser** — https://streetkingz.co.uk/product/wheel-belt-flosser/; current 9.99; regular 9.99; instock; source ID 1494.
- **Microfibre Scrub Pads** — https://streetkingz.co.uk/product/microfibre-scrub-pads/; current 2.99; instock; source ID 1498.
- **The Origin Shampoo - Ultra Concentrated & pH safe** — https://streetkingz.co.uk/product/origin-shampoo/; current 11.99; regular 11.99; instock; source ID 1905.
- **Origin MultiClean – Interior & Exterior Cleaner** — https://streetkingz.co.uk/product/origin-multiclean/; current 9.99; regular 9.99; instock; source ID 1915.
- **Origin Glass Cleaner – Streak-Free Window & Mirror Cleaner** — https://streetkingz.co.uk/product/origin-glass-cleaner/; current 9.49; regular 9.49; instock; source ID 1917.
- **The Origin Trilogy** — https://streetkingz.co.uk/product/the-origin-trilogy/; current 27.99; regular 27.99; instock; source ID 1920.
- **Waffle Glass Cloth** — https://streetkingz.co.uk/product/waffle-glass-cloth/; current 4.99; regular 4.99; instock; source ID 1922.
- **Slim Barrel Brush** — https://streetkingz.co.uk/product/slim-barrel-brush/; current 14.99; regular 14.99; instock; source ID 1944.
- **Snow Foam Lance** — https://streetkingz.co.uk/product/snow-foam-lance/; current 18.99; regular 18.99; instock; source ID 1945.
- **Stubby Gun and Nozzle Set** — https://streetkingz.co.uk/product/stubby-gun-and-nozzle-set/; current 18.99; regular 18.99; instock; source ID 1946.
- **Origin XL Wash & Dry Kit** — https://streetkingz.co.uk/product/origin-xl-wash-dry-kit/; current 27.99; regular 27.99; instock; source ID 1948.
- **Origin Interior Deep Clean Kit** — https://streetkingz.co.uk/product/origin-interior-deep-clean-kit/; current 13.99; regular 13.99; instock; source ID 1949.
- **Origin Glass Clarity Kit (Glass Cleaner + Waffle Cloth)** — https://streetkingz.co.uk/product/origin-glass-clarity-kit-glass-cleaner-waffle-cloth/; current 12.99; regular 12.99; instock; source ID 1950.
- **Wheel Cleaning Kit (XL Brush + Slim Brush + Belt Flosser)** — https://streetkingz.co.uk/product/wheel-cleaning-power-pack/; current 34.99; regular 34.99; instock; source ID 1951.
- **The Origin Ultra Wash & Dry Kit** — https://streetkingz.co.uk/product/the-origin-ultra-wash-dry-kit/; current 29.99; regular 29.99; instock; source ID 2008.
- **Wheel Hose Guides** — https://streetkingz.co.uk/product/wheel-hose-guides/; current 12.99; instock; source ID 2018.
- **Stubby Gun + Snow Foam Bundle** — https://streetkingz.co.uk/product/stubby-gun-bundle/; current 34.99; regular 34.99; instock; source ID 2039.
- **Origin Wash Kit - Shampoo & Wash Mitt** — https://streetkingz.co.uk/product/origin-wash-kit/; current 15.99; regular 15.99; instock; source ID 2527.
- **Weekend Wash** — https://streetkingz.co.uk/product/wash/; current 39.99; regular 39.99; instock; source ID 3068.
- **Weekend Wash Plus** — https://streetkingz.co.uk/product/wash-plus/; current 59.99; regular 59.99; instock; source ID 3071.
- **Weekend Wash Complete** — https://streetkingz.co.uk/product/wash-complete/; current 89.99; regular 89.99; instock; source ID 3072.

## Retained first-party evidence

| Source | Selected evidence | Source context and dates |
|---|---:|---|
| Site | Run 663: 0 inspected-page rows | Accepted environment at 127.0.0.1:54321; run state complete/complete; source state partial; retrieved 2026-09-03T00:00:00+00:00; run completed and source last-success 2026-09-03T12:22:02.262158+00:00; evidence as of 2026-09-03T00:00:00+00:00. The complete/LKG run envelope is selected, but no page records were retained at extraction time. |
| Search Console | Run 750: 1125 observations (page 61, query 365, query_page 440, trend 259) | Accepted environment at 127.0.0.1:54321; https://streetkingz.co.uk/, siteOwner; retrieved 2026-09-03T16:30:48.495+00:00; run completed and source last-success 2026-09-03T16:30:49.897343+00:00; period 2025-09-04T16:30:48.496+00:00 to 2026-09-03T16:30:48.496+00:00; evidence as of 2026-09-01T00:00:00+00:00; completeness provider_limited. Provider-limited detail remains explicit. |

Historical recovery context: site run 764 in 127.0.0.1:54274 is a separate partial recovery run with 100 inspected pages (retrieved 2026-09-03 17:00 UTC, completed 17:01 UTC). It was not substituted for accepted-environment run 663 and was not selected in this Product input. Numeric run IDs are environment-scoped.

## Imported versus selected

- Commerce downloaded → persisted → selected: 30 → 30 → 30 products; 11 → 11 → 11 categories; 103 → 103 → 103 relationships; 6 → 6 → 0 variations.
- First-party evidence source → persisted → Product-selected: 1,125 → 1,125 → 1,125 Search Console observations; 0 → 0 → 0 inspected site pages.
- External evidence: unavailable; 0 selected and none imported or generated. Prior AI interpretations and placeholder-derived external evidence were not included.

## Learning Layer

The PostgREST response ceiling applies to each request, so complete evidence selection requires stable keyset pages plus exact stored-count reconciliation. The reusable reader is `readBoundedEvidenceRows()` in `product-kernel/decisionEvidenceAdapter.js:13`.

## Safe read-only experiment

The safe experiment replayed `loadDiscoveryEvidence()` read-only against the isolated destination and compared every selected commerce/GSC record identity and value with persisted source rows. It made no database writes, live-site requests, upstream/provider calls, or AI/search calls. Result: PASS; packet input hash changed when compared with the prior 1,000-row packet.

## Limitations

- Accepted site run 663 is marked complete/LKG, but the accepted database currently contains zero inspected-page rows for it; no site-page claims are selected. The later partial run 764 remains separate.
- The normal loader does not select variations, so their source data is retained in the isolated generation but absent from the loader packet.
- The existing 2,000-record per-source Product limit remains in place. This dataset is below the limit; runs exceeding it carry explicit stored/selected/truncated coverage metadata.
- No orders, customer identities, sales history, margin, conversion, paid external-search evidence, or old AI interpretations are included.
- Search Console is provider-limited and dated; missing or unmeasured data must not be treated as zero.
- Recommendation quality has not been assessed.
- The existing bounded site-acquisition path is `POST /api/product/organic-evidence/site/acquire`, implemented in `routes/siteEvidence.js:27` and bounded by `SITE_LIMITS` in `product-kernel/siteEvidence.js:7` (500 discovered URLs, 100 inspected pages). The minimum next collection for useful page evidence is a fresh bounded run that retains inspected home, product, and category page rows under its selected run. This is a next step only; no crawl was run here.
- This is an input-preparation artifact only. No AI assessment, discovery, interpretation, recommendation, or decision-engine step was run.
