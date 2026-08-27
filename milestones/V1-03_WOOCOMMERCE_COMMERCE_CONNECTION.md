# V1-03 — WooCommerce Commerce Connection

**Status: Proposed — Awaiting Owner Approval**  
**Implementation not authorised.**

## Objective

Provide one authenticated Product customer a least-privilege, read-only WooCommerce connection for the single V1-02 Business and ingest the minimum reliable commercial evidence for later intelligence milestones.

## Required contract decisions

Before implementation, owner approval must confirm the WooCommerce authentication mechanism, minimum read permissions, Vault storage and reconnection/disconnection semantics, store URL/identity binding, read-only enforcement, product/category/variation/price/stock/status and justified order/sales evidence, missing COGS/margin semantics, freshness, pagination, rate limits, provider/partial errors, retry/idempotency, provenance, correction/unknown handling, tenant isolation, and O-016 recovery behaviour. Credentials must never appear in customer responses, logs or evidence.

Acceptance requires real synthetic-store proof of connection ownership, read-only credentials, complete agreed catalogue ingestion with pagination and correct variations/price/stock/status, reconciled included sales evidence, explicit missing values, safe repeated sync, visible partial/provider failure and stale data, Account A/B isolation, safe disconnect cleanup, and no Critical/High defect.

## Non-goals

Search Console, external search, GA4, recommendations, opportunity selection, SEO logic, article generation, free recommendation UI, paid execution, WordPress or product/order/stock/price writes, deployment, Shopify, multi-business, teams, agency, generic connector/OAuth frameworks, and broad job infrastructure are out of scope. Multi-provider Business summary redesign is out of scope unless evidence proves the existing model invalid.

V1-02 remains frozen under O-008 and O-016. Approval of this proposal is required before any implementation or credentials are created.
