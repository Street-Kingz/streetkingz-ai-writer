# Genuine Street Kingz Product Input Report

## V1-05 usable partial site-evidence selection — final verification

**Current input state: READY TO FREEZE FOR V1-05 QUALITY VALIDATION.** This marks a trustworthy input candidate only; no V1-05 quality assessment or Product acceptance has been run.

The earlier report below records the collection-time loader behavior, before this correction. Its statements that run 3 had zero Product-selected pages and that freeze readiness was “No” are retained as history; the results in this section are the current post-correction verification.

### Governed selection rule

Before this correction, `loadDiscoveryEvidence()` selected only the run referenced by `organic_evidence_sources.current_complete_run`. It read the latest attempt only for state/fingerprint context, so partial run 3 was ignored and complete/LKG run 1 supplied zero site pages. `organic_finish_run` changes `current_complete_run` only for complete runs. For partial or failed runs it clears `active_run` and preserves the complete pointer. Run 3 therefore correctly remained the latest partial attempt while run 1 remained the complete/LKG pointer.

The Product read layer now selects the latest partial run only when it is newer than the complete/LKG pointer, its run and completeness states are both `partial`, retrieval/completion/evidence-as-of provenance and the required error code exist, and its business/source/run-scoped persisted page rows have identities, requested URLs, retrieval times and at least one successfully inspected page. Empty, failed, malformed, foreign-scoped or otherwise incoherent partial attempts do not displace complete/LKG. Page rows are taken from one run only. The selected packet reports `state=partial`, selected and latest-attempt provenance, coverage, and retained limitations. The lifecycle pointer and run 3 state were not changed or promoted.

### Current normal-loader result

Read-only verification used destination `streetkingz-v105-input-20260914-ad9sko` after confirming the live mapping: API `127.0.0.1:64150`, database `127.0.0.1:64151`; project identity matched the destination manifest and Supabase configuration. No destination data was written.

| Item | Verified result |
|---|---|
| Selected site run / state / completeness | Destination run 3 / `partial` / `partial` |
| Selected site rows | 100; 87 successfully inspected HTML, 11 non-HTML, 2 observed absent |
| Run dates | Retrieved 2026-09-14 13:13:20.607 UTC; evidence as of 13:14:32.267 UTC; completed 13:14:33.371 UTC |
| Discovery coverage | 113 discovered URLs; 100 inspection attempts; 13 persisted URLs remain unattempted; no fetch failures, robots blocks or deadline failure; the existing inspected-page cap was reached |
| Site limitations in packet | `SITE_LIMITATION`, `unattempted_discovered_urls_present`; run remains partial |
| Genuine product URLs selected | 30/30; 29 are classified `product`; the Origin Shampoo URL is selected but currently classified `unknown` |
| Homepage | Selected and classified `homepage` |
| Other page types | 0 category, 0 content; 69 unknown. Unknown pages remain unclassified |
| Commerce | 30 products, 11 categories and 103 relationships remain selected; 6 variations remain persisted and 0 exposed by the loader |
| Search Console | Run 2 (accepted source run 750), 1,125/1,125 observations selected |
| GSC page URL mapping | 501 observations contain page URLs; 467 map to selected page IDs. Of 61 unique URLs, 51 map and 10 remain unmatched. Prior to this correction, 0 mapped and all 61 were unmatched |
| External search evidence | Unavailable; 0 persisted/selected observations |
| Current complete/LKG pointer | Still destination run 1, representing accepted-environment run 663; it remains complete and unchanged |
| Input hash | `9530d347dcce2fea92f94bc9e6d1a90d54775e638b7a02510eb57ad0f4aaa6c3` |
| Snapshot fingerprint | `93ea961fa53289e63b801b8ecb591297b6df292680ac9f9574ca79ea90048057` |

Run 663 in the accepted environment and historical recovery run 764 are distinct environment-scoped records. Run 764 was not selected or substituted. The selected Search Console source remains provider-limited, retrieved 2026-09-03, for the period 2025-09-04 through 2026-09-03.

### Canonical-host diagnostic

The 23 run-3 rows recorded with `canonical_state=external` all resolve to host `pink-eel-708036.hostingersite.com`; none are a `www`/non-`www` variant of `streetkingz.co.uk`. This read-only host check found no canonical-boundary implementation defect to fold into this correction. Canonical classification logic was not changed. The collected external canonical values remain evidence and are not reinterpreted here.

### Remaining input limits

WooCommerce category records have no canonical URLs, so no category URLs were seeded or guessed; zero pages are verified as category pages. Zero pages were classified as content; 69 selected rows are `unknown`. The shampoo product URL is selected but classified `unknown`. Variations are stored but not exposed through the current Product loader. Search Console remains provider-limited, external search evidence is unavailable, and no sales, order, margin or conversion data is included. The partial site run reached the existing inspection cap and left 13 discovered URLs unattempted. Recommendation quality has not been assessed.

**Freeze decision:** READY TO FREEZE FOR V1-05 QUALITY VALIDATION. This is not recommendation-quality, Product-quality or production acceptance.

**Verification:** Focused site-selection and evidence-pagination tests passed (20 tests); full `npm test` passed (1,267 total, 1,246 passed, 21 skipped, 0 failed). `npm run security:secrets` reported 0 findings; `git diff --check` is clean. These checks made no AI, paid-provider, collection, or database-write calls.

Prepared: 2026-09-14T13:18:19Z

Status: READY TO FREEZE FOR V1-05 QUALITY VALIDATION; NOT PRODUCT-QUALITY ACCEPTANCE

Isolated destination: `/private/tmp/streetkingz-v105-input-20260914-ad9sko` (API port 64150; DB port 64151)
Report path: `/Users/ben/Documents/GitHub/streetkingz-ai-writer/artifacts/validation/v1-05/genuine-streetkingz-input-preparation-2026-09-14/input-report.md`

## Historical collection-time report (before usable partial selection was authorized)

The sections below retain the acquisition-time record and the original selection blocker. They are preserved for audit history; the post-correction Product selection and current readiness are recorded above.

### Source and acquisition

- Source: https://streetkingz.co.uk/; verified one-product read was confirmed by Ben as `WOO_READ_ACCESS_VERIFIED`.
- Catalogue acquired at 2026-09-14T09:52:31.768Z UTC through `wooCollectionRequest`, GET only: 4 WooCommerce requests/responses, with every response page validated against WooCommerce total/page headers.
- An unchanged mode-0600 private archive is retained outside the temporary directory and Git; SHA-256: `b63fd10c97f88aa7588f448e347567d5c9b1ebdb1924433d1440a154d489c4c2`.
- Products: 30; categories: 11; product/category relationships: 103; supported variations: 6. Orders and customer identities requested: 0.
- Source product/category/variation IDs were checked for uniqueness; variation parents and product/category relationships were reconciled. Imported product IDs: 30; categories: 11; relationships: 103; variations: 6.
- Prices and stock values are source values. Currency context from the previously retained store record: GBP.

## Normal Product loader selection

The existing `loadDiscoveryEvidence` Product input loader ran against the new destination after generation 1 was marked current and again after site run 3. It selects 30/30 products, 11/11 categories, 103/103 relationships, and 1,125/1,125 unique Search Console observations. Commerce identity/content and GSC identity/value/provenance checks pass. Site run 3 is partial and is not selected: the loader continues to select destination run 1, which contains zero inspected-page rows. The new page evidence is persisted but is not in the loader packet.

Current loader packet identity after collection: input hash `86169566a917cff4f4383890dcca35c5a7ab06608067fa8b565df447b90e9ab7`; snapshot fingerprint `33c6c5d954c1658ca11c0c315ca64b8dc76800d354c46521963fd5887ca7836a`. The input hash remains unchanged because the selected site rows remain empty; the snapshot fingerprint reflects the latest partial attempt.

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
| Site | Accepted source run 663 → destination run 1 selected: 0 page rows. New destination run 3: partial, 100 page rows persisted, 0 selected. | Accepted environment at 127.0.0.1:54321; run 663 state complete/complete, source state partial; retrieved 2026-09-03T00:00:00+00:00; last success 2026-09-03T12:22:02.262158+00:00; evidence as of 2026-09-03T00:00:00+00:00. Destination run 3 was retrieved 2026-09-14T13:13:20.607Z, completed 13:14:33.371Z, evidence as of 13:14:32.267Z; it remains an unselected partial attempt. |
| Search Console | Run 750: 1125 observations (page 61, query 365, query_page 440, trend 259) | Accepted environment at 127.0.0.1:54321; https://streetkingz.co.uk/, siteOwner; retrieved 2026-09-03T16:30:48.495+00:00; run completed and source last-success 2026-09-03T16:30:49.897343+00:00; period 2025-09-04T16:30:48.496+00:00 to 2026-09-03T16:30:48.496+00:00; evidence as of 2026-09-01T00:00:00+00:00; completeness provider_limited. Provider-limited detail remains explicit. |

Historical recovery context: site run 764 in 127.0.0.1:54274 is a separate partial recovery run with 100 inspected pages (retrieved 2026-09-03 17:00 UTC, completed 17:01 UTC). It was not substituted for accepted-environment run 663 and was not selected in this Product input. Numeric run IDs are environment-scoped.

## Imported versus selected

- Commerce downloaded → persisted → selected: 30 → 30 → 30 products; 11 → 11 → 11 categories; 103 → 103 → 103 relationships; 6 → 6 → 0 variations.
- First-party evidence source → persisted → Product-selected: 1,125 → 1,125 → 1,125 Search Console observations. For site pages, the newly collected run has 100 persisted rows and 0 Product-selected rows; selected LKG run 1 still has 0 persisted/selected rows.
- External evidence: unavailable; 0 selected and none imported or generated. Prior AI interpretations and placeholder-derived external evidence were not included.

## Site Evidence Collection

Exactly one site evidence collection was started through the existing authenticated Product endpoint, `POST /api/product/organic-evidence/site/acquire`. An earlier local endpoint invocation failed before authentication completed: it returned `500 INTERNAL_ERROR`, made zero public requests, created no run and wrote no site rows. After verifying that persisted state and correcting only the local runner environment, one collection completed. The failed invocation did not start a collection and was not retried as a site run.

The temporary loopback runner self-test passed. It rejects both protected ports, non-site/provider hosts, non-GET site requests and authorization/cookie headers to the public site. The actual site transport sent read-only GET requests only; no WooCommerce credentials were forwarded.

| Measure | Collection result |
|---|---:|
| Public Street Kingz HTTP requests | 119 GETs: 1 robots, 15 sitemap (including redirect hops), 103 page requests (including redirect hops) |
| Site evidence run | Destination run 3; source version `v1-04-slice-c`; retrieved 2026-09-14T13:13:20.607Z; completed 2026-09-14T13:14:33.371Z |
| Run state / completeness / evidence_as_of | `partial` / `partial` / 2026-09-14T13:14:32.267Z |
| Sitemap documents fetched / sitemap URLs accepted | 14 / 58 |
| Discovered URLs | 113 (1 homepage seed, 30 Woo product seeds, 58 sitemap URLs, 24 internal-link frontier URLs) |
| Page inspection attempts / successfully inspected HTML | 100 / 87 |
| Persisted discovered URL rows / inspected-page rows | 113 / 100 |
| Other persisted page statuses | 11 `non_html`; 2 `observed_absent`; 0 `fetch_failed` |
| Robots-disallowed / page fetch-failure counts | 0 / 0 |
| Cap/deadline limitations | `inspected_page_cap`; 13 discovered link-frontier URLs were left unattempted; no total-run deadline hit |
| Product-selected pages from run 3 | 0; the normal loader selected destination run 1 with 0 pages |

The 100 inspection attempts are distinct from the 103 page HTTP requests; extra requests were same-site redirect hops. The successful HTML count is 87, not 100. No page was robots-blocked or recorded as a fetch failure.

The earlier one-page/empty-site input snapshot remains preserved in the prior report committed at `1e9bcec82cb9184114d8ea263ee3d01318339533` (snapshot fingerprint `d252b43286bc715e92b851f770c6ac55e9084adbeb272a8efd802a5ed5f45e86`). The new run is a separate run-3 record; run 663/run 764 history and protected environments were not modified. The runner hard-blocked ports 54321 and 54274, and no optional Supabase service was restarted.

### Genuine product-page coverage

Each of the 30 canonical URLs below was discovered, attempted, successfully inspected as HTML, and persisted in run 3. None was Product-selected because run 3 is partial and the normal loader retained run 1.

| Product | Canonical URL | Discovered | Attempted | Successful HTML | Persisted | Product-selected |
|---|---|---:|---:|---:|---:|---:|
| XL Drying Towel – 800GSM | https://streetkingz.co.uk/product/xl-drying-towel-800gsm/ | Yes | Yes (inspected) | Yes | Yes | No |
| CORAL FLEECE CLOTHS – 2 PACK | https://streetkingz.co.uk/product/coral-fleece-cloths-2-pack/ | Yes | Yes (inspected) | Yes | Yes | No |
| Microfibre Wash Mitt | https://streetkingz.co.uk/product/microfibre-wash-mitt/ | Yes | Yes (inspected) | Yes | Yes | No |
| Heavy Duty Car Drying Towel – 1200GSM | https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/ | Yes | Yes (inspected) | Yes | Yes | No |
| Paint Protection Cloth | https://streetkingz.co.uk/product/paint-protection-cloth/ | Yes | Yes (inspected) | Yes | Yes | No |
| Ultra Wash and Dry Set | https://streetkingz.co.uk/product/ultra-wash-and-dry-set/ | Yes | Yes (inspected) | Yes | Yes | No |
| Twisted Loop Power Pack | https://streetkingz.co.uk/product/twisted-loop-power-pack/ | Yes | Yes (inspected) | Yes | Yes | No |
| XL Wash & Dry Set | https://streetkingz.co.uk/product/xl-wash-dry-set/ | Yes | Yes (inspected) | Yes | Yes | No |
| The XL Barrel Brush | https://streetkingz.co.uk/product/the-xl-barrel-brush/ | Yes | Yes (inspected) | Yes | Yes | No |
| Wheel Belt Flosser | https://streetkingz.co.uk/product/wheel-belt-flosser/ | Yes | Yes (inspected) | Yes | Yes | No |
| Microfibre Scrub Pads | https://streetkingz.co.uk/product/microfibre-scrub-pads/ | Yes | Yes (inspected) | Yes | Yes | No |
| The Origin Shampoo - Ultra Concentrated & pH safe | https://streetkingz.co.uk/product/origin-shampoo/ | Yes | Yes (inspected) | Yes | Yes | No |
| Origin MultiClean – Interior & Exterior Cleaner | https://streetkingz.co.uk/product/origin-multiclean/ | Yes | Yes (inspected) | Yes | Yes | No |
| Origin Glass Cleaner – Streak-Free Window & Mirror Cleaner | https://streetkingz.co.uk/product/origin-glass-cleaner/ | Yes | Yes (inspected) | Yes | Yes | No |
| The Origin Trilogy | https://streetkingz.co.uk/product/the-origin-trilogy/ | Yes | Yes (inspected) | Yes | Yes | No |
| Waffle Glass Cloth | https://streetkingz.co.uk/product/waffle-glass-cloth/ | Yes | Yes (inspected) | Yes | Yes | No |
| Slim Barrel Brush | https://streetkingz.co.uk/product/slim-barrel-brush/ | Yes | Yes (inspected) | Yes | Yes | No |
| Snow Foam Lance | https://streetkingz.co.uk/product/snow-foam-lance/ | Yes | Yes (inspected) | Yes | Yes | No |
| Stubby Gun and Nozzle Set | https://streetkingz.co.uk/product/stubby-gun-and-nozzle-set/ | Yes | Yes (inspected) | Yes | Yes | No |
| Origin XL Wash & Dry Kit | https://streetkingz.co.uk/product/origin-xl-wash-dry-kit/ | Yes | Yes (inspected) | Yes | Yes | No |
| Origin Interior Deep Clean Kit | https://streetkingz.co.uk/product/origin-interior-deep-clean-kit/ | Yes | Yes (inspected) | Yes | Yes | No |
| Origin Glass Clarity Kit (Glass Cleaner + Waffle Cloth) | https://streetkingz.co.uk/product/origin-glass-clarity-kit-glass-cleaner-waffle-cloth/ | Yes | Yes (inspected) | Yes | Yes | No |
| Wheel Cleaning Kit (XL Brush + Slim Brush + Belt Flosser) | https://streetkingz.co.uk/product/wheel-cleaning-power-pack/ | Yes | Yes (inspected) | Yes | Yes | No |
| The Origin Ultra Wash & Dry Kit | https://streetkingz.co.uk/product/the-origin-ultra-wash-dry-kit/ | Yes | Yes (inspected) | Yes | Yes | No |
| Wheel Hose Guides | https://streetkingz.co.uk/product/wheel-hose-guides/ | Yes | Yes (inspected) | Yes | Yes | No |
| Stubby Gun + Snow Foam Bundle | https://streetkingz.co.uk/product/stubby-gun-bundle/ | Yes | Yes (inspected) | Yes | Yes | No |
| Origin Wash Kit - Shampoo & Wash Mitt | https://streetkingz.co.uk/product/origin-wash-kit/ | Yes | Yes (inspected) | Yes | Yes | No |
| Weekend Wash | https://streetkingz.co.uk/product/wash/ | Yes | Yes (inspected) | Yes | Yes | No |
| Weekend Wash Plus | https://streetkingz.co.uk/product/wash-plus/ | Yes | Yes (inspected) | Yes | Yes | No |
| Weekend Wash Complete | https://streetkingz.co.uk/product/wash-complete/ | Yes | Yes (inspected) | Yes | Yes | No |

### Other page coverage and collected page fields

- **Homepage:** `https://streetkingz.co.uk/` was discovered from the verified store boundary, fetched with HTTP 200 as HTML, persisted in run 3, and is not Product-selected. The observed title was “Street Kingz | Premium Car Care for Everyday Drivers”; the extracted H1 list was empty. Same-boundary canonical was recorded, robots allowed was true, and both meta/X-Robots noindex were false.
- **Categories:** the 11 commerce category rows contain source ID, name, slug and parent source ID, with no canonical URL field. The route passes category ID/source ID only, while the existing collector seeds a category only when it receives a `canonical_url`. Therefore no category URL was guessed or seeded; 0 run-3 pages were verified/classified as category pages. Sitemap-discovered URLs classified as `unknown` were not relabelled as categories.
- **Content / guide pages:** 0 of the 100 persisted attempts were classified as `content`; 69 were `unknown`, so content-page coverage is not established beyond the collector’s current page-type classification.
- Across the 100 persisted rows, a title was present on 89, meta description on 55 and at least one H1 on 46. Canonical states were 64 `same_boundary`, 23 `external` and 13 `absent`. Robots allowance was true on all 100; meta noindex was true on 2 and X-Robots noindex on 6. These are collected field values, not SEO scores. The 11 non-HTML rows and 2 observed-absent rows do not count as successful HTML inspection.
- The 13 unattempted discovered URLs were all `link_frontier` URLs left by the existing 100-page cap. The Product loader selected no page IDs, URLs or page types from run 3.

### Search Console page-URL mapping and selection state

The selected Search Console run remains destination run 2 (accepted source run 750) with all 1,125 observations unchanged. Of these, 501 observations contain a page URL across 61 unique page URLs. Because selected site run 1 has no page rows, **0 observations map to a selected site page ID** and all **61 unique page URLs are unmatched** under the loader’s exact URL mapping. No GSC URLs were rewritten.

After run 3, site source state is `partial`, `active_run` is null, and `current_complete_run` remains run 1. Run 3 is preserved with 113 discovered rows and 100 inspected-page rows, but `loadDiscoveryEvidence()` selects run 1 and returns zero site pages. Commerce remains 30 products / 11 categories / 103 relationships; Search Console remains 1,125 observations. Variations remain 6 persisted / 0 loader-selected; external evidence remains unavailable / 0 selected. Current packet input hash is `86169566a917cff4f4383890dcca35c5a7ab06608067fa8b565df447b90e9ab7`; snapshot fingerprint is `33c6c5d954c1658ca11c0c315ca64b8dc76800d354c46521963fd5887ca7836a`.

Selected site source reference is destination run 1 (accepted source run 663). Its selected page IDs, URLs and page types are empty because it has zero inspected-page rows. Run 3 page IDs/URLs remain persisted under run 3 but are not Product-selected.

**Historical freeze readiness at collection time: No.** The blocker then was the current/LKG selection rule: `organic_finish_run` updates `current_complete_run` only when `p_state = 'complete'` (migration `supabase/migrations/20260903000000_v1_04_slice_a_integrity.sql:111-114`); `loadDiscoveryEvidence()` read only the site run referenced by that pointer. Governance has since authorized selection of usable partial evidence, and the current verified result is recorded at the top of this report. At the historical checkpoint, no pointer was changed, no partial run was promoted, and no second collection was started.

## Learning Layer

`loadDiscoveryEvidence()` in `product-kernel/decisionEvidenceAdapter.js` now separates Product evidence selection from the lifecycle-owned complete/LKG pointer. A partial run is useful only when persisted inspected-page evidence and run provenance are coherent; its partial state and limitations remain explicit. Safe experiment: the empty-partial regression case verifies complete/LKG fallback without changing either run or its pointer.

## Safe read-only experiment

The safe post-collection experiment replayed `loadDiscoveryEvidence()` read-only against the isolated destination and compared commerce/GSC identities and values while checking the site run selected by the normal loader. It made no writes or additional public-site/upstream/provider calls. Result: commerce/GSC unchanged; run 3 partial and persisted, while run 1 remained selected with zero page rows.

## Limitations

- Accepted site run 663 is marked complete/LKG, but the accepted database currently contains zero inspected-page rows for it; no site-page claims are selected. The later partial run 764 remains separate.
- The normal loader does not select variations, so their source data is retained in the isolated generation but absent from the loader packet.
- The existing 2,000-record per-source Product limit remains in place. This dataset is below the limit; runs exceeding it carry explicit stored/selected/truncated coverage metadata.
- No orders, customer identities, sales history, margin, conversion, paid external-search evidence, or old AI interpretations are included.
- Search Console is provider-limited and dated; missing or unmeasured data must not be treated as zero.
- Recommendation quality has not been assessed.
- One bounded collection used `POST /api/product/organic-evidence/site/acquire` in `routes/siteEvidence.js:27` and the existing `SITE_LIMITS` in `product-kernel/siteEvidence.js:7`; it hit the existing 100-page inspection cap and returned partial. No second collection was performed. The owner’s decision to allow Product selection of usable partial runs while preserving their incomplete state is resolved by the correction documented above. No second crawl was made.
- This is an input-preparation artifact only. No AI assessment, discovery, interpretation, recommendation, or decision-engine step was run.
