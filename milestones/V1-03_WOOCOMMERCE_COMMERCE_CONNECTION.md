# V1-03 — WooCommerce Commerce Connection

**Status: In Progress**  
**Approved — Implementation Authorised**  
**Owner approval date:** 2026-08-27  
**Approved contract baseline:** `90230e0ba478802bacd00d3023b56749af1f8001`

## Objective and customer capability

Connect one authenticated Product customer’s single V1-02 Business to one WooCommerce store using a least-privilege read-only connection; ingest and normalise the minimum trustworthy commercial evidence needed by later organic-growth intelligence; and expose connection, freshness, completeness, partial and missing-data state. This is commerce evidence infrastructure, not recommendation generation.

V1-01 proved commercial context can improve prioritisation. V1-02 established the secure Account/Business/Connection/Vault/audit foundation. V1-03 turns WooCommerce into the first real customer commerce evidence source.

## Foundations and architecture boundary

Reuse V1-02 identity, tenant RLS, Connection/Vault lifecycle, audit/correlation and safe errors; existing Product Intelligence/Product Facts, WooCommerce readers, provenance/evidence contracts, URL validation and bounded retry patterns. Adapt only where required. Do not create a generic connector marketplace, OAuth platform, queue or speculative job framework. Initial sync runs in the bounded Node service unless measured evidence requires a separately approved managed mechanism.

## Authentication and store ownership

The primary journey is WooCommerce’s official Application Authentication Endpoint, `/wc-auth/v1/authorize`, over HTTPS. Product constructs the URL with `app_name`, `scope=read`, an opaque Product-controlled `user_id`, `return_url`, and HTTPS `callback_url`. This `user_id` is a cryptographically random, one-time, expiring server-stored attempt identifier bound internally to Account, Business, pending Connection and canonical store origin; it contains no UUID, email, identity or predictable ID. The merchant authenticates and approves; WooCommerce returns `consumer_key`, `consumer_secret`, `key_permissions` and `user_id` to the Product callback. The return URL is UX/navigation only: `success=1` never connects a Connection. Only a valid unconsumed attempt plus structurally valid callback, exact `read` permission, Vault capture, authenticated store identity match and successful connection/audit transaction can connect it; the attempt is then consumed exactly once. Callback-before-return and return-before-callback are both safe. Denial (`success=0`), expiry, replay, duplicate or cross-tenant callbacks never create connected state and cannot replace a valid credential.

Manual key entry may be a documented fallback only if official evidence shows `/wc-auth/v1/authorize` cannot operate on a supported store. Permission that cannot be safely established is rejected closed. A dedicated WordPress user is optional, not mandatory; it is recommended as an operational best practice. Deleting the WordPress user associated with a key invalidates that key.

Persist submitted URL, canonical HTTPS origin, authenticated store identity facts and source/version. Normalise redirects, www and trailing slash. A URL alone is not proof; a materially different authenticated host fails closed and requires correction.

Before any request to a submitted or discovered URL, require HTTPS, reject userinfo, unsupported schemes, localhost, `.local`, loopback, RFC1918/private, IPv6 loopback/private/link-local, link-local, metadata, multicast, reserved and other non-routable targets, and unsafe IP literals. Resolve DNS before connecting and require every address to be publicly routable. Disable automatic redirects or validate every hop with the same checks; prevent DNS-rebinding/time-of-check/use bypass by pinning/validating the destination used for the connection. This is a bounded WooCommerce egress control, not a crawler platform.

Verify identity through authenticated `GET /wp-json/wc/v3/system_status` (or an equally authoritative supported endpoint), requesting only needed fields where `_fields` is supported: `environment.home_url`, `environment.site_url`, WooCommerce version, timezone and currency. Reconcile authenticated home/site identity to the submitted canonical origin; a different host fails closed. Never persist or log the full system-status response.

Use WordPress REST `_fields` to minimise provider responses, especially orders. Regardless of provider filtering, immediately transform through a strict allowlist and discard billing/shipping identity, email, phone, IP, user-agent, notes and unrelated metadata before persistence, logs or evidence.

## Read-only invariant

Keys must be generated with `scope=read`; Product performs no WooCommerce POST/PUT/PATCH/DELETE, WordPress write, product/stock/price/order mutation or credential exposure. A Read-key mutation attempt must fail in validation. Remote key revocation remains the merchant’s WooCommerce responsibility.

## Minimum platform-neutral model

Persist Store (canonical identity, platform, currency/timezone where needed, source version and sync/freshness state); Product (source ID, name/slug/URL, SKU, type/status, categories, regular/current/sale price, stock management/quantity/status, parent/variation links and timestamps); Variation (source ID, parent, SKU, identifying attributes, prices, stock, status and timestamps); Category (source ID, name/slug/parent).

Commercial facts retain bounded source order ID/dates/status/currency, product/variation IDs, quantity, line subtotal/total/tax, discounts and refund amounts/links needed for reconciliation, plus order totals. Never persist customer name/address/email/phone, IP, user-agent, payment metadata, notes or profiling fields; discard them before storage, logs and evidence. COGS/margin is optional: absent is unknown, never zero or inferred.

Recognised statuses are `processing` and `completed`. `pending` and `on-hold` are not recognised; `cancelled` and `failed` are excluded; `refunded` uses actual refund evidence. Custom statuses are retained as bounded source facts but classified unknown/unclassified and never counted automatically. Test orders are excluded only with an explicit approved source marker, never by heuristic.

Canonical `product_net_sales_ex_tax` is derived from actual line totals after source discounts, excluding line tax, minus actual attributable line-refund totals. Track product tax, quantities/refunds and order-level refund adjustments separately. Full and partial refunds use actual amounts; line-attributed refunds map only to exact attributable lines. Unattributed refunds remain order-level and are never proportionally allocated. Shipping, shipping tax, fees without product attribution and unattributed refunds are not Product sales. Retain order total, tax, shipping, discount and refund totals for reconciliation; preserve WooCommerce `prices_include_tax`/source tax semantics explicitly.

## Sync, freshness and retention

Initial sync ingests the complete agreed catalogue and the previous **365 days relative to sync start time** of orders—one seasonal cycle, bounded storage and no lifetime ingestion. Older evidence is unavailable outside the window, not zero. Incremental sync maintains a rolling bounded V1 model using reliable modified/date watermarks; expansion requires an explicit evidence decision.

Collection endpoints iterate every page within provider limits, detect final pages, prevent loops and mark partial on interruption; tests exceed one page for products and orders. Initial/incremental syncs are idempotent, stage new evidence and atomically promote only complete successful state. Failures preserve last-known-good data with visible stale/error/partial state. Removed/unpublished entities become inactive deliberately. Track attempt/success timestamps, freshness, completeness and cursor/watermark.

Reconnection verifies the same store, safely replaces Vault material, removes the old secret and audits. Disconnection deletes local Vault material, clears the reference, revokes consent, stops reads and preserves normalised privacy-minimised evidence as stale/disconnected until Account deletion; raw payloads and PII are not retained. Remote provider revocation is not claimed. Under O-016 portable recovery, credentials are not trusted/restored, Connections fail closed and re-authorisation is required before reads resume.

Durable facts retain Account→Business ownership, provider/source IDs, source and retrieval timestamps, connection/source and transformation versions, freshness and state. Direct, derived and customer-correction facts remain distinct; corrections never invisibly overwrite source truth. All records use server ownership checks and PostgreSQL RLS.

## Validation, non-goals and evidence

Use a controlled synthetic WooCommerce store with simple and variable products, multiple variations/categories, price/sale, stock states, >1 page products/orders, status/refund/discount/tax fixtures. After synthetic acceptance, perform one owner-authorised read-only Street Kingz reconciliation; its raw payloads and PII remain private and it is never required for implementation. Evidence belongs under `artifacts/validation/v1-03/`; private provider data remains ignored.

Out of scope: Search Console, DataForSEO/external search, GA4, opportunities, recommendations, SEO logic, articles, UI, paid execution, all WordPress/WooCommerce writes, product/stock/price/order edits, customer communication, Shopify/other platforms, multi-business, teams, agency, generic connector/OAuth frameworks, advanced CLV/attribution/profiling, forecasting, purchasing, dashboards and broad background infrastructure.

## Independently reviewable acceptance criteria

1. V1-02 Account/Business boundary is used.
2. Intended store identity is proven.
3. Official callback binds to the intended pending Connection/tenant.
4. Generated key permission is confirmed `read`.
5. Credential is stored only in Vault.
6. Consumer key/secret is absent from customer APIs.
7. `secret_reference` is absent from customer APIs.
8. Secrets are absent from logs/public evidence.
9. No WooCommerce write operation exists.
10. Read credential cannot mutate WooCommerce.
11. Complete agreed catalogue is ingested.
12. Product pagination over one page is proven.
13. Order pagination over more than one page is proven and the full approved 365-day window reconciles.
14. Simple products reconcile.
15. Variable products reconcile.
16. Variations reconcile.
17. Categories reconcile.
18. Regular/current/sale prices reconcile.
19. Stock-management state reconciles.
20. Stock quantity/status reconcile where available.
21. The 365-day order window is complete.
22. Processing/completed recognition reconciles.
23. Cancelled/failed exclusion reconciles.
24. Full refunds reconcile using actual amounts.
25. Partial refunds reconcile using actual amounts.
26. Line-attributed refunds map only to attributable lines.
27. Unattributed refunds remain order-level and are not allocated.
28. Discounts reconcile.
29. Tax/source-tax semantics reconcile.
30. Shipping remains separate from Product sales.
31. `product_net_sales_ex_tax` reconciles.
32. Prohibited customer PII is not durably persisted.
33. Missing COGS remains unknown.
34. Missing values never become zero.
35. Custom/unclassified statuses remain explicit/unknown.
36. Repeated sync is idempotent.
37. Incremental sync captures changed source data.
38. Removed/unpublished entities are handled deliberately.
39. Provider failure preserves last-known-good evidence.
40. Partial sync is not presented as complete.
41. Stale evidence is identifiable.
42. Invalid credentials fail visibly.
43. Revoked credentials fail visibly.
44. Reconnection safely replaces Vault material.
45. Disconnect deletes local credential/reference.
46. Disconnected retained evidence is explicitly stale.
47. Remote provider-revocation limitation is documented.
48. O-016 recovery fails closed.
49. Account A cannot access Account B commerce evidence.
50. Same-tenant direct Data API cannot bypass security boundaries.
51. Provenance is retained.
52. Source, derived and customer-correction facts remain distinct.
53. Synthetic test-store reconciliation passes.
54. Owner-authorised Street Kingz read-only reconciliation passes.
55. Full npm regression passes.
56. Sensitive-data scan passes.
57. Critical defects = 0.
58. High defects = 0.
59. No V1-04 capability is introduced.
60. No recommendation logic is introduced.
61. No WordPress/WooCommerce writes are introduced.
62. Customer-controlled URLs cannot reach prohibited network targets, including through redirects or DNS changes.
63. Authenticated WooCommerce home/site identity reconciles to the intended canonical Business/store origin before connection.

Required negative tests include merchant denial (`success=0`), unknown/expired/consumed/replayed/duplicate/wrong-tenant callbacks, `key_permissions != read`, malformed/missing callback credentials, return-without-callback and both callback/return arrival orders, callback credentials for another store, non-read permission, wrong/unreachable/non-WooCommerce URL, HTTP/localhost/loopback/private/link-local/metadata/userinfo URLs, public-to-private redirects and DNS-rebinding targets, malformed callback, pagination/timeout/malformed/rate-limit failure, duplicate/partial sync, removed entities, empty catalogue/no orders, missing SKU/stock/COGS, refunds/cancellation/failure, cross-tenant UUID attacks and post-valid-sync provider failure.

## Failure and completion

FAIL/BLOCKED applies if ownership, read-only access, callback safety, reconciliation, privacy, pagination, tenancy, last-known-good preservation or approved architecture cannot be secured, or any Critical/High defect remains. V1-04 cannot begin. PASS means one WooCommerce Business is safely connected and maintains trustworthy evidence, followed by Cody evidence, ChatGPT PASS, Ben approval and state/roadmap closeout.

## Owner decisions recorded

The following are accepted for this proposal: 365-day initial order horizon; official Application Authentication Endpoint as primary flow; dedicated WordPress user optional; synthetic validation plus one owner-authorised Street Kingz read-only reconciliation; disconnected normalised evidence retained stale until Account deletion. No unresolved owner-level decision remains. This proposal still requires explicit owner approval before implementation, credentials or a feature branch.
