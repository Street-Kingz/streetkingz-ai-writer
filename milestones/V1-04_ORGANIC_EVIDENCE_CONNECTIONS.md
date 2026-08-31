# V1-04 — Organic Evidence Connections

**Status: PROPOSED — NOT AUTHORISED FOR IMPLEMENTATION**

## Contract purpose

V1-04 is an evidence-acquisition milestone. It does not choose an organic
opportunity and does not produce a recommendation. V1-05 consumes the evidence
created here and remains an independent decision layer.

The proposed customer capability is:

> For one authenticated Business, the Product can safely acquire, normalize,
> store and expose trustworthy organic-search evidence from the Business's own
> site, Search Console when connected, and bounded external search sources, with
> clear provenance, freshness, completeness and missing-data state.

The Product must remain useful without Search Console. V1-03 commerce evidence
is already accepted and is not reimplemented by this milestone.

## Boundaries inherited from governance

- One Account owns one Business; every source and fact is tenant-scoped.
- Intelligence is free; paid execution is separate and is not part of this
  milestone.
- Progressive evidence is required. Missing evidence is unknown/unavailable,
  never zero.
- Direct source facts remain distinguishable from derived relationships or
  interpretations.
- WooCommerce remains read-only and is not changed by this milestone.
- V1-05 owns opportunity discovery, prioritisation and recommendation language.
- V1-06 owns polished Product UI; V1-04 only needs a minimal functional
  connection/status journey.

## Existing capability audit

### Existing GSC capability — ADAPT, not reuse as the customer journey

`research/clients/googleSearchConsole.js` has a timeout-bounded client, refresh
token exchange and Search Analytics query transport. It currently reads a
single site URL from environment variables and can issue the official
Search Analytics query request.

`research/providers/googleSearchConsole.js` already provides useful query/page
and query-page normalization, date-range resolution, bounded row pagination,
malformed-response handling, cache metadata, provenance and the metrics
clicks, impressions, CTR and average position. `test/google-search-console.test.js`
proves fixture pagination, empty results, malformed responses and failures.

`scripts/authoriseSearchConsole.js` is an operator-oriented local helper. It
opens OAuth, saves a refresh token to `.env`, and is not suitable for a
customer-controlled Account → Business → Connection flow. It must not be
promoted into Product runtime behaviour.

Classification:

- REUSE the official endpoint shape, read-only scope, client timeout/error
  handling, date-range semantics, bounded pagination and normalizer concepts.
- ADAPT the provider to server-side Connection/Vault credentials, a pending
  Business-bound Connection, property discovery/selection and customer-safe
  status.
- REPLACE the env-file/manual-token journey with an authenticated Product OAuth
  callback and explicit property selection.
- DO NOT USE the script's `.env` token persistence, terminal/operator completion,
  or any profile data from the Google identity.

### Site understanding — ADAPT bounded evidence extraction

`business-intelligence/webReader.js` performs GET-only HTML retrieval with
retrieval metadata. `business-intelligence/websiteEvidence.js` normalizes text,
canonicalizes links, extracts titles/headings/statements/navigation and finds
representative product links. `business-intelligence/ingestion.js` plans a
bounded set of pages and produces provenance-bearing business evidence.

The CMS readers and `cms/wordpressAuthoritativeReader.js` are authenticated,
read-only WordPress/Product evidence paths. They are useful for source-specific
associations when the supported site exposes them, but they are not a generic
crawl inventory.

Classification:

- REUSE text/link normalization, GET-only retrieval metadata, canonical URL
  handling, bounded page planning and Woo/WordPress source associations where
  verified.
- ADAPT the reader with an explicit same-origin crawl boundary, sitemap and
  robots handling, redirect revalidation, response-size/time limits and a
  page-inventory record designed for V1-04.
- REPLACE broad business-page prose extraction as the primary site model with
  a smaller URL/page-truth model; prose remains supporting evidence only.
- DO NOT USE WordPress write readers, guarded writers, article-rendering paths,
  or a generic crawler platform.

### External search — ADAPT existing provider foundations

`research/clients/dataForSeo.js` has credential configuration, GET/POST
transport at the provider API boundary as required by the provider, timeout and
rate-limit capture. The keyword-ideas and SERP Advanced providers normalize
provider results, preserve provenance, cache raw/normalized artifacts and
enforce bounded keyword/cost ceilings. Existing fixtures and tests cover cost
ceilings, cache hits, malformed responses, provider failures and SERP item
normalization.

`research/providers/dataForSeoKeywordIdeas.js` and
`research/providers/dataForSeoSerpAdvanced.js` are evidence acquisition
primitives, not recommendation logic. Their current shortlist code contains
product-term eligibility and near-duplicate selection that must remain a
research-boundary operation and must not become V1-05 scoring.

Classification:

- REUSE provider client timeout/rate-limit/cost contracts, cache identity,
  normalized SERP records and provenance patterns if licensing/terms pass.
- ADAPT to Business-scoped query identities, explicit locale/language, the
  minimum demand/SERP fields and Product-owned server-side credentials.
- REPLACE broad artifact coupling to product-facts files with a V1-04 organic
  evidence request whose deterministic seed lineage is inspectable.
- DO NOT USE any provider field merely because it is available, a universal
  keyword database, backlink index, rank tracker, or opportunity score.

### Evidence/provenance foundations — REUSE and extend

`research/contracts/schemas.js`, `research/validation/evidence.js`,
`research/core/canonical.js`, `research/evidenceEngine.js` and the renderers
already establish schema versions, stable IDs, canonical JSON hashing, source
references, provider runs, raw-artifact references, normalized records,
coverage, warnings and failure states. Product and Business Intelligence
modules also preserve source roles, retrieval metadata, source fields and
knowledge gaps.

These are reusable patterns, not permission to make the old file artifacts the
customer database. V1-04 should retain source identity and lineage while adding
Business ownership, source connection identity, observation period,
completeness and source state to the durable Product model.

### Existing artifacts and obsolete paths

V1-01 validation artifacts contain useful evidence hygiene and Search Console /
SERP limitations, but are historical proof, not current customer state. Existing
WordPress article drafts, editorial research, rendering and guarded-write
artifacts are out of scope. Raw provider artifacts already present in the
repository must not be copied into new customer records or used as a substitute
for a live V1-04 connection contract.

## Customer connection experience

The minimum functional journey is customer-controlled and uses the accepted
Account → Business → Connection architecture:

1. An authenticated customer opens their Business and selects **Connect Google
   Search Console**.
2. The Product creates a short-lived pending Connection tied to the caller's
   Account and Business, with state, nonce, PKCE/state protection and an
   allowed callback origin.
3. The browser enters Google's official OAuth authorization flow requesting the
   minimum read-only Search Console scope.
4. The callback verifies state/PKCE, resolves the pending Connection, exchanges
   the code server-side, and stores refresh-token material only in Vault.
5. The Product discovers properties available to that authorized Google identity
   through the official read APIs. No Google profile or unrelated account data
   is retained.
6. The customer selects a property when multiple properties exist. The Product
   verifies Domain and URL-prefix identity against the Business canonical site;
   selection is not activated on a loose hostname match.
7. Only after property verification does the Connection become active and
   evidence collection become available.
8. The customer sees Connected, Failed or Reauthentication Required, can
   reconnect, explicitly change property, or disconnect.

No token, client secret, Vault reference, Google profile, copied credential or
manual database action is exposed to the browser. A fresh test customer must
complete this journey without founder/operator intervention.

Source connection classes:

| Source | V1-04 connection class | Boundary |
| --- | --- | --- |
| Google Search Console | CUSTOMER-CONNECTED | Customer OAuth and property selection are required. |
| Business site | NO-SEPARATE-CONNECTION | Acquired from the verified canonical site using bounded public GETs and supported source URLs. |
| Licensed external search provider | PRODUCT-CONNECTED | Product-owned credentials, server-side only, subject to terms, cost and request bounds. |

The lifecycle is intentionally source-specific rather than a universal OAuth
marketplace. It can later support another first-party source's connection
without implementing one now. GA4 could use a separate customer connection and
would require an explicit scope/PII/evidence review. Bing Webmaster Tools could
use the same broad customer-connected lifecycle if its property and query data
prove useful. Neither is in V1-04 implementation scope.

## Search Console V1 boundary

### Facts to acquire

The initial first-party evidence set is:

- property identity and property type (Domain or URL-prefix);
- date;
- query where available;
- page where available;
- clicks;
- impressions;
- CTR;
- average position;
- retrieval time, requested period, dimensions and completeness metadata.

Country, device and search appearance are excluded from the first V1 contract
unless a reviewed V1-05 decision requirement proves one necessary. They are not
free dimensions to ingest.

### Window and API behaviour

Proposed initial history is the latest **90 finalized calendar days**, with the
end date set conservatively behind the source's reporting delay and recorded
explicitly. This is a proposal, not a claim that 90 days is universally right:
it is enough for current query/page coverage and an early trend comparison,
keeps row/storage cost bounded, and avoids presenting delayed days as complete.
V1-05 may request a separately bounded comparison period only after this
contract is approved.

The implementation must document the selected finalization lag from provider
behaviour, page through all rows up to an explicit per-dimension cap, and expose
`partial`/`incomplete` when a cap or API top-row semantics prevents a complete
claim. Empty properties and new sites are valid `complete` zero-row coverage
only when the API response itself is complete; they are not evidence of zero
traffic or zero demand. Sparse rows retain their actual values and coverage
limits.

### Credential and lifecycle rules

Read-only OAuth scope only; no Search Console write API. Refresh/access tokens
are server-side Vault material. Access tokens are short-lived and never
persisted to customer-visible records. Revocation, refresh failure and missing
property access become Reauthentication Required/Failed without deleting the
last-known-good evidence. Disconnect removes local token material and marks
the source stale; it does not claim to revoke Google access remotely.

## Site-understanding V1 boundary

The minimum current site inventory is:

- requested URL and final URL;
- canonical URL when declared and whether it is same-origin;
- HTTP status and retrieval time;
- indexability signals such as robots/noindex where safely observable;
- page type (homepage, product, category, content or unknown);
- verified Woo Product/category relation where available;
- title, meta description and H1;
- bounded headings when useful;
- bounded internal-link relationships if they are needed by V1-05.

Discovery should start with the verified canonical URL, supported sitemap URLs,
Woo Product/category URLs and a small same-origin link frontier. It must have
explicit page, byte, redirect, depth and request budgets; honor robots policy
where applicable; reject private/link-local/reserved IPs after DNS resolution;
re-check redirect destinations; and prevent DNS rebinding/host drift. HTTPS is
required for authenticated reads. Unsupported builders or uninspectable pages
are reported as unknown/unsupported, not silently treated as empty.

V1-04 is not a PageSpeed, Core Web Vitals, accessibility, backlink, broken-link,
schema-writing, monitoring or generic technical SEO product. Removed URLs are
marked absent from the new bounded inventory while prior evidence remains
historical; a partial crawl never promotes itself as a complete inventory.

## External search evidence V1 boundary

The proposed normalized facts for a deterministic query observation are:

- query identity and normalized query text;
- market/locale and language;
- demand value when the licensed provider supplies one, its period/unit and
  provider/source;
- retrieval time and observation period;
- bounded top organic results: rank, URL and domain;
- title/snippet only if they materially support page/intent evidence;
- SERP feature/type only where it materially describes the result page.

Provider fields outside this set are discarded. Demand is evidence with a
source, period and completeness state, not exact truth and not a recommendation
score. SERP results are observations, not a universal rank history.

The first provider remains a decision gate: DataForSEO is a provisional
PRODUCT-CONNECTED option because foundations exist, but terms/licensing, live
quality, cost, retention and reliability must be reviewed before selection is
frozen. If it fails, the contract must name the replacement through a decision
update; implementation must not silently add a second paid provider.

### Query-seeding boundary

V1-04 may acquire evidence for a deterministic, inspectable seed set derived
from Product names, Category names, verified site page topics and available GSC
queries. Seed IDs, source and locale are retained. A bounded expansion may be
used to collect evidence, but expansion must not rank opportunities, sum
volumes, assign commercial value, select interventions or generate content.
Those are V1-05 decisions. V1-04 must be able to report no seeds / no demand as
unknown or unavailable rather than inventing values.

## Unified organic evidence model

Each durable fact or bounded observation must carry, directly or through a
stable parent run:

```text
business_id / connection_id (tenant ownership)
source_class and provider_id
source_identity (property, URL, query or provider record identity)
fact_type and normalized value
retrieved_at
observed_at or evidence period
source_state and completeness
direct_or_derived
provenance locator and source version
confidence/limitations when meaningful
```

Search Console observations, site facts and external observations share this
contract while retaining their source-specific fields. A derived page-to-
Product relation, query relationship or cross-source comparison references its
parents and never overwrites a direct source fact. `unknown`, `unavailable`,
`not_connected` and `not_observed` remain distinct from numeric zero.

V1-04 should add only the minimum organic tables/records needed after schema
review. It must not duplicate V1-03 commerce tables or copy commerce rows into a
second evidence system.

## Freshness, retention and failure

Source states exposed to customers are:

`not_connected`, `unavailable`, `collecting`, `complete`, `partial`, `failed`,
`stale`.

Each source exposes `last_attempted_at`, `last_successful_at`,
`evidence_as_of` and coverage/completeness where meaningful.

- Search Console freshness follows the source's delayed/finalized reporting;
  the requested range and lag are part of evidence metadata.
- Site evidence freshness follows the last successful bounded retrieval/crawl;
  changed/removed URLs are represented by the next complete inventory.
- Demand/SERP freshness follows provider-specific cache/reuse policy and
  retrieval time; a cache hit still retains the original observation time and
  current retrieval event.
- A failed or partial refresh does not replace the last complete evidence.
  It records the attempt and exposes the failure/partial state.
- New complete runs supersede current source views while prior runs remain
  inspectable according to retention policy. Raw payload retention is minimized
  and must not become customer PII storage.

There is no arbitrary global “stale after 24 hours” rule. Source-specific
policies must be justified by API delay, change rate, cost and decision use.

## Security and privacy

- Authenticate every customer operation and prove Account → Business ownership;
  enforce RLS for customer-visible evidence.
- Keep Google refresh/access tokens and Product-owned provider secrets in Vault;
  never return, log or artifact them.
- Bound service-role use to server-side secret operations and privileged
  collection paths after tenant checks; never send it to a browser.
- Use OAuth state/PKCE, short-lived pending connections, callback allowlists,
  explicit property reconciliation and safe reconnect/disconnect transitions.
- Permit crawler requests only to the verified public site boundary. Validate
  schemes, ports, DNS answers and redirect destinations; block loopback,
  link-local, private, multicast, metadata and reserved networks; cap response
  bytes, redirects, concurrency and duration.
- Use GET-only site and provider retrieval where the source API permits it; no
  WordPress or Woo writes and no Google writes.
- Retain only the minimum query/page/site facts. Do not ingest Google profile
  data, customer records, emails, phones, cookies, auth headers or unrelated
  page PII. Redact logs and sanitize validation artifacts.
- Do not persist raw HTML/provider responses by default. If an immutable raw
  reference is required for audit, use bounded private retention and store no
  credentials or unnecessary PII.

## Progressive evidence behaviour

| Available evidence | Permitted Product state |
| --- | --- |
| Commerce only | V1-03 commercial evidence remains available; organic source gaps are explicit. |
| Verified site | Site/page evidence can be used without GSC; coverage and unsupported pages are visible. |
| External search | Bounded demand/SERP observations add market evidence with provider limitations. |
| Search Console | First-party query/page performance enriches the evidence; it is not required. |

The absence of GSC must not become zero clicks, zero impressions, zero demand,
or zero organic performance. V1-05 must be able to proceed with partial
evidence and communicate the missing source.

## Explicit non-goals

Recommendation ranking, opportunity selection, commercial × search scoring,
article briefs, article generation, SEO writing, WordPress writes, schema
writes, internal-link execution, paid execution, monitoring recommendations,
GA4 without a later approval, Shopify, social/TikTok, email, ads, inventory
optimization, generic analytics dashboards, a generic SEO suite, a generic
crawler platform, a proprietary search index, a keyword-volume database, a
backlink index, and an AI agent framework are excluded.

## Acceptance criteria

The proposal has 36 independently reviewable criteria:

### Customer connection and Search Console

1. A fresh test customer can start GSC connection from the authenticated
   Business flow without founder intervention.
2. OAuth uses the official Google flow and minimum read-only scope.
3. Callback state/PKCE binds the result to the caller's pending Business
   Connection.
4. Tokens are Vault-only and absent from browser responses, logs and artifacts.
5. Property discovery is server-side and returns only safe property facts.
6. Multiple properties require explicit customer selection.
7. Domain and URL-prefix properties reconcile exactly to the Business site.
8. A mismatched property cannot activate the Connection.
9. Connected, failed and reauthentication-required states are customer-safe.
10. Reconnect, explicit property change and disconnect are tested.
11. Revoked/expired authorization preserves LKG evidence and exposes failure.
12. No Google write API is called.
13. Query, page and query-page facts preserve date, dimensions and metrics.
14. Search Console pagination and row caps are bounded and reported.
15. Empty and sparse properties are represented honestly, never as fake zero.

### Site evidence

16. The canonical site identity is verified before acquisition.
17. Discovery is bounded by URL, depth, byte, redirect and request budgets.
18. Same-origin and redirect rules prevent scope escape.
19. SSRF/DNS-rebinding/private-network protections are tested.
20. Sitemap/robots handling is bounded and its limitations are recorded.
21. URL, final URL, status, canonical, indexability, page type and retrieval
    facts are normalized.
22. Product/category relations are included only when source-verified.
23. Removed URLs disappear from the current inventory without erasing history.
24. Partial/failing crawl retains LKG and cannot claim complete coverage.
25. Site evidence contains no customer PII or auth material.

### External search evidence

26. The selected licensed provider and terms are explicitly approved.
27. Query identity, locale and language are deterministic and retained.
28. Demand evidence includes period, unit, provider and completeness.
29. SERP evidence includes bounded rank, URL and domain observations.
30. Provider pagination, timeout, malformed response and cost ceilings fail
    closed without fake demand values.
31. Cache/reuse policy exposes retrieval time and source observation time.

### Cross-source contract and governance

32. Every durable fact has Business ownership, provenance and observation/
    retrieval metadata.
33. Direct facts and derived relationships remain distinct and traceable.
34. Source states, missing evidence and completeness are customer-safe and
    source-appropriate.
35. RLS/cross-tenant tests prove one Business cannot read another's evidence.
36. Acceptance reports Critical = 0, High = 0 and no V1-05 decision logic or
    paid execution in the implementation.

## Eventual Street Kingz validation plan

Validation is not performed by this proposal. Once implementation is separately
authorized, use the existing owner-authorised Street Kingz Business as a test
Business without changing Woo data or performing writes. Verify canonical site
matching, bounded site inventory, optional customer-authorised GSC property
selection, bounded real external evidence, exact source/provenance coverage,
failure/LKG and no live writes. Reconcile only sanitized facts and preserve
the fact that Street Kingz is validation evidence, not the Product definition.

## Owner decisions required before authorization

1. Approve the 90 finalized-day initial GSC window and the explicit provider
   finalization lag, or select a different bounded period with evidence.
2. Approve the Google Cloud OAuth client/redirect deployment model and exact
   read-only scope after security review.
3. Approve whether URL-prefix, Domain, or both property types are supported in
   V1 and the canonical identity rules for each.
4. Decide whether site acquisition is implemented as a bounded inventory run
   or a smaller sitemap/page set for the first release.
5. Resolve DataForSEO terms/licensing, retention, cost ceiling and V1 provider
   selection; no paid provider is authorized by this proposal.
6. Approve the minimum evidence retention period and raw-response policy.
7. Confirm whether V1-05 may operate with site/external evidence while GSC is
   unavailable (the contract assumes yes, consistent with progressive evidence).
8. Confirm whether GA4/Bing remain future evidence-gated candidates.

## Proposal review risks

Critical concerns: none identified in the proposal provided implementation is
not authorized until OAuth, SSRF and provider terms are reviewed.

High concerns: Google property identity reconciliation; customer-safe token
lifecycle/revocation; crawler DNS/redirect enforcement; licensed external
provider terms/cost and top-row completeness; schema choice for preserving LKG
without duplicating V1-03.

## Authorization gate

This file proposes a reviewable contract only. It does not activate V1-04,
change `PROJECT_STATE.md` or `ROADMAP.md`, create credentials, call providers,
crawl Street Kingz or authorize V1-05.
