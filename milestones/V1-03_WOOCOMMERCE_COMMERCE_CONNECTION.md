# V1-03 — WooCommerce Commerce Connection

**Status: Proposed — Awaiting Owner Approval**  
**Implementation not authorised.**

## Objective and customer capability

Connect one authenticated Product customer’s single V1-02 Business to one WooCommerce store with a least-privilege read-only connection; ingest and normalise bounded, trustworthy commercial evidence; and expose connection, freshness, completeness and missing-data state. This is commerce evidence infrastructure, not recommendation generation or analytics.

V1-01 established that commercial context can improve prioritisation. V1-02 established the secure Account/Business/Connection/Vault/audit foundation. V1-03 is the first real commerce evidence source.

## Foundations and architecture boundary

Reuse V1-02 caller identity, tenant RLS, Connection/Vault lifecycle, audit/correlation and safe errors; existing Product Intelligence/Product Facts, WooCommerce readers, provenance/evidence contracts, URL validation and bounded retry patterns. Adapt only where needed. Do not create a generic connector marketplace, OAuth platform, queue or framework. Initial sync remains a bounded Node service operation unless measured pagination/latency requires a separately approved managed job mechanism.

## Authentication and ownership

Use WooCommerce REST API v3 over HTTPS with consumer key/secret created for a WordPress user and **Read** permission. WooCommerce documents Read as retrieval-only and v3 as the current API integration; private order data requires authenticated REST access. The setup is: customer submits a store URL; Product explains creation of a dedicated least-privilege integration user/key; credentials enter a server-only flow; Product verifies the store; material is stored only in Vault; Connection stores only the opaque reference. A supplied Write/ReadWrite key is rejected where permission cannot be proven safely; Product never performs writes regardless.

Persist submitted URL, canonical HTTPS origin, authenticated store identity facts and source/version. Normalise redirects, www and trailing slashes. A URL alone is not proof; a materially different authenticated host fails closed and requires correction. The canonical origin must remain bound to the Business and Connection.

## Read-only invariant

No WooCommerce POST/PUT/PATCH/DELETE operation, WordPress write, product/stock/price/order mutation or credential exposure exists. Validation must attempt a harmless provider mutation with a Read key and prove rejection. Remote key revocation remains the customer’s WooCommerce responsibility.

## Minimum commerce model

Persist platform-neutral Store (canonical identity, platform, currency/timezone where needed, source version, sync/freshness state); Product (source ID, name/slug/URL, SKU, type/status, categories, regular/current/sale price, stock management/quantity/status, parent/variation links, timestamps); Variation (source ID, parent, SKU, identifying attributes, prices, stock, status, timestamps); Category (source ID, name/slug/parent).

Commercial facts retain only source order ID, relevant dates, status, currency, product/variation IDs, quantity, line subtotal/total/tax, discounts and refund amounts/links needed for reconciliation, plus bounded order aggregates. Never persist customer name/address/email/phone, IP, user-agent, payment metadata, notes or profiling fields; discard them before storage, logs or evidence. COGS/margin is optional: unavailable means unknown, never zero or inferred.

Recognised sales are completed and processing orders; pending/on-hold are unrecognised until status changes; cancelled/failed are excluded; full refunds reduce recognised sales to zero and partial refunds reduce them proportionally. Gross order value and net recognised sales are separate facts. Discounts and tax are retained according to explicit inclusive/exclusive source flags; shipping/refunds are included only where required for reconciliation. Test orders are excluded when reliably identifiable. This is not accounting software.

Initial sync ingests the complete agreed catalogue and the previous **365 days** of orders (owner may change this horizon). Older evidence is unavailable, not zero. Incremental sync uses modified/date watermarks where reliable. Every attempt/success, freshness, completeness and cursor is recorded. Collection endpoints iterate all pages within bounded provider limits, detect final pages, prevent loops and mark partial on interruption; tests must exceed one page for products and orders.

Initial and incremental syncs are idempotent and do not duplicate entities. Removed/unpublished entities become inactive with provenance. New evidence is staged and promoted atomically only after a complete successful sync; failures preserve last-known-good evidence with stale/error/partial state.

## States, reconnection and recovery

Expose connected-healthy, connected-stale, connected-error, disconnected, auth-invalid/revoked, store-unavailable, timeout, rate-limit, malformed-response, partial and unsupported-version states. Reconnection verifies the same store, safely replaces Vault material, removes the old secret, audits and resumes sync. Disconnect sets disconnected/revoked, deletes local Vault material, clears the reference, stops reads and documents evidence retention; provider-side key revocation is not claimed.

Under O-016 portable recovery, credentials are not trusted or restored. Connections fail closed, references are cleared, and re-authorisation is required before reads resume; safely attributable historical commerce evidence may remain stale. No Vault plaintext or internal recovery detail is customer-visible.

Durable facts retain Account→Business ownership, provider/source IDs, source and retrieval timestamps, connection/source and transformation versions, freshness and state. Direct facts, derived metrics and customer corrections remain distinct; corrections never invisibly overwrite source truth.

## Scope, retention and validation

Retain current catalogue, approved 365-day commercial facts, provenance, sync and Connection/audit state only as needed. Account deletion follows V1-02; disconnection retention is explicit and privacy-minimised. All records require server ownership checks and PostgreSQL RLS; Account A cannot access B’s records or evidence, including via direct Data API.

Use a controlled synthetic WooCommerce store with simple and variable products, multiple variations/categories, price/sale, stock states, >1 page products/orders, completed/processing/cancelled/refunded examples, partial refund, discount and tax. Street Kingz is optional only with later owner authorisation and never required.

## Acceptance criteria

1. Real V1-02 Account/Business boundary and intended store identity are proven.
2. Credentials are Read-only, Vault-only, and absent from APIs/logs/evidence; secret_reference is never exposed.
3. Read-key mutation attempt fails; no unsupported writes exist.
4. Catalogue, pagination, simple products, variable products/variations, categories, prices and stock reconcile completely.
5. Approved order window and commercial facts reconcile, including refunds, cancellation/failure, discounts and tax; missing COGS/values remain unknown.
6. No prohibited PII persists; repeated and incremental syncs are idempotent and capture changes.
7. Provider, timeout, rate-limit, malformed, partial and stale failures preserve last-known-good state and are visible.
8. Invalid/revoked credentials fail visibly; reconnect replaces secrets safely; disconnect cleans local material and documents remote revocation.
9. O-016 recovery fails closed and requires re-authorisation.
10. Tenant and direct-mutation boundaries hold; provenance and correction semantics are preserved.
11. Real test-store evidence, full npm regression and sensitive-data scans pass.
12. Critical defects = 0, High defects = 0, and no V1-04/recommendation/write capability is built.

## Required negative tests and evidence

Test wrong/unreachable/non-WooCommerce URL, invalid/revoked/broader key, pagination/timeout/malformed/rate-limit failure, duplicate/partial sync, removed product/variation, empty catalogue/no orders, missing SKU/stock/COGS, unmanaged stock, refunds/cancellations/failures, cross-tenant UUID attacks, reconnect/disconnect and post-valid-sync provider failure. Evidence belongs under `artifacts/validation/v1-03/` with connection, identity, credential, schema, catalogue, variations, order/reconciliation, privacy, sync/failure, tenancy, recovery, test and limitations proofs; raw provider data remains private/ignored.

## Explicit non-goals

Search Console, DataForSEO/external search, GA4, opportunities, recommendations, SEO logic, articles, UI, paid execution, WordPress/WooCommerce writes, product/stock/price/order edits, customer communication, Shopify/other platforms, multi-business, teams, agency, generic connector/OAuth frameworks, advanced CLV/attribution/profiling, forecasting, purchasing and broad job/analytics infrastructure.

## Benchmark, failure and completion

The benchmark is a boring, reliable, privacy-minimised read-only commerce evidence source a competent ecommerce SEO specialist can trust. Failure or BLOCKED status results if ownership, read-only access, reconciliation, privacy, pagination, tenancy, last-known-good preservation or approved architecture cannot be secured, or any Critical/High defect remains; V1-04 cannot begin. PASS means one WooCommerce Business is safely connected and maintains trustworthy evidence, followed by Cody evidence, ChatGPT PASS, Ben approval and state/roadmap closeout.

## Owner decisions required

- **Order horizon:** recommend 365 days; alternative 90/730 days; consequence is less/more historical prioritisation and sync cost.
- **Integration user:** recommend a dedicated WordPress user with Read key; alternative existing least-privilege user; consequence is weaker isolation/rotation ownership.
- **Street Kingz reconciliation:** recommend synthetic store only; alternative owner-authorised read-only Street Kingz check; consequence is stronger realism but credential/privacy handling.
- **Disconnected evidence retention:** recommend retain bounded historical facts as stale; alternative purge on disconnect; consequence is continuity versus data minimisation.

V1-02 remains Done and frozen under O-008/O-016. This proposal does not authorise implementation, credentials or a feature branch.
