# V1-04 Organic Evidence Architecture Note

**Proposal only — implementation not authorised**

## Shape

V1-04 should add one Business-owned organic evidence boundary with source-
specific collectors behind it:

```text
Account → Business
             ├─ CUSTOMER-CONNECTED: Google Search Console Connection
             ├─ NO-SEPARATE-CONNECTION: verified site inventory
             └─ PRODUCT-CONNECTED: licensed demand/SERP provider
                         ↓
              bounded source run / provenance
                         ↓
              normalized direct observations
                         ↓
              derived relations (explicitly linked)
                         ↓
              source status + completeness + LKG view
                         ↓
              V1-05 evidence input (not a recommendation)
```

The accepted Account → Business → Connection and Vault lifecycle should be
reused. GSC needs a pending customer-bound Connection because OAuth is a
customer action. Site evidence needs no separate connection after canonical
site verification. External search credentials belong to the Product and stay
server-side.

## Run and LKG rule

Each source run is bounded and records attempted, successful, partial or failed
state. A complete replacement becomes the current source view only after
validation. A failed/partial run keeps the previous complete view readable and
exposes the current failure. This is analogous to the accepted V1-03 LKG rule,
but should not force all source data into commerce generations where a simpler
source-run model is sufficient.

## Direct versus derived

Direct facts are immutable observations from GSC, the site or the provider.
Derived records may connect a GSC page to a verified site URL or a query to a
seed, but retain parent IDs, method and confidence. Neither a relationship nor
an interpretation may overwrite the direct query, page, URL or SERP fact.

## Implementation constraints for later authorization

- Server-side collection only; customer APIs expose safe status and evidence,
  never tokens, secrets, raw response bodies or private crawl material.
- Every query begins with tenant ownership checks and remains RLS-visible only
  to that Business.
- Every external request is bounded by source-specific page/row/byte/time/cost
  limits and records completeness.
- No schema should duplicate V1-03 commerce facts. A source reference may point
  to existing Product/category identity where it is verified.
- The first implementation should prove the fresh-customer GSC connection,
  site-boundary safety and one licensed provider contract before adding richer
  dimensions or UI.

## Deliberate omissions

No universal OAuth framework, generic connector marketplace, crawler platform,
rank tracker, keyword database, backlink index, recommendation scorer, article
workflow, WordPress writer, GA4 connector or Bing connector is implied.
