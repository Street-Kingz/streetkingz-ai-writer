# V1-04 — Organic Evidence Connections

**Status: DONE / ACCEPTED**

**Owner approval date:** 2026-08-31

**Current authorized slice:** none — milestone complete

**Current engineering phase:** none — milestone complete

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

The Google OAuth client belongs to the Product/operator. Customers provide no
developer credentials. Public deployment must satisfy Google's current OAuth
brand/scope verification, verified-domain, privacy-policy and redirect-origin
requirements; that is a public-release gate, not a requirement for the bounded
development test.

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

Both URL-prefix and Domain properties are supported. Discovery exposes only
safe `siteUrl`, permission level and property type facts, followed by an
authorized read probe. No Google profile identity is retained.

For a URL-prefix property, normalize the Business canonical base URL including
any supported base path. The property must contain it within the same scheme,
host, port and path boundary. A Business at `https://example.com/shop/` may
accept `https://example.com/` or `https://example.com/shop/`, but not
`https://example.com/blog/`; HTTP, `www`, sibling subdomains and lookalike
hosts are rejected. Evidence remains constrained to the Business canonical
base path.

For `sc-domain:example.com`, the Business canonical registrable domain must
match. Since a Domain property can cover multiple protocols and subdomains,
page-grain evidence is still constrained to the verified canonical host and
base path; sibling subdomains and other properties are not mixed in.

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

### Two acquisition grains and finalized-data semantics

V1-04 acquires two deliberately different grains:

- **Trend/seasonality grain:** up to the latest 365 finalized calendar days of
  low-cardinality property/date observations: date, clicks, impressions, CTR
  and position where valid under the selected aggregation. This aligns with
  the accepted V1-03 commerce horizon and permits one seasonal cycle without
  storing 365 days of high-cardinality detail.
- **Current detailed grain:** the latest 90 finalized calendar days for query,
  page and query+page observations, with clicks, impressions, CTR and average
  position.

The implementation uses Search Console's actual finalized-data semantics,
preferably `dataState=final`, and derives the latest usable evidence date from
provider results. It must not encode a guessed fixed two- or three-day lag.
Any later fresh/incomplete exploration is a separate explicitly incomplete
observation, never silently mixed into finalized evidence.

Completeness is grain-specific. Property/date coverage may be complete for the
requested finalized period according to provider semantics. Query, page and
query+page coverage remains provider-limited because of top-row and privacy
semantics. Pagination and explicit row caps are required; reaching an API end
does not erase those limitations. Hitting an implementation cap is `partial`.
An omitted query is `not_observed`/`provider_limited`, never zero impressions.
Empty and sparse properties are represented honestly.

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

Discovery priority is fixed: (1) the verified canonical homepage, (2) current
Woo Product/category URLs from accepted V1-03 evidence, (3) same-origin
sitemap/sitemap-index URLs, and only then (4) a bounded same-origin link
frontier to fill discovery gaps. Open-ended crawling is not the normal path.

The inventory distinguishes a **discovered URL** from an **inspected page**.
Every implementation must set explicit URL discovery, page fetch, response
byte, redirect, concurrency and total-run deadline caps before acceptance.
It must not silently truncate and call the inventory complete. Robots policy,
same-origin rules, private-network rejection, DNS-rebinding protection and
redirect revalidation remain mandatory.

The inventory stores declared/observable indexability evidence — robots policy,
meta robots/noindex, canonical declaration and HTTP status. It does not claim
“Google indexed” or “Google indexable truth”. The URL Inspection API is not in
scope.

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
PRODUCT-CONNECTED option because foundations exist. Before Slice D, a bounded
decision must verify current terms/licensing, permitted storage/retention, UK
keyword quality, Google UK SERP quality, bounded Business acquisition/refresh
cost, hard per-run/per-Business ceilings, duplicate-task protection, rate
limits and failure behaviour. It is not the accepted V1 provider yet, and no
second paid provider may be silently added. This gate does not block earlier
GSC/site slices.

### Query-seeding boundary

Allowed direct seed sources are Woo Product names, Woo Category names, verified
site page titles, verified site H1 values and available GSC queries. “Topic” is
not an independent source: it means a normalized direct title/H1 fact. Seed IDs,
source lineage, locale and language are retained. V1-04 does not use an LLM to
invent seeds.

A licensed provider may return bounded keyword ideas or related queries. These
are evidence with parent seed, provider relation, provider ordering/relevance
when supplied, locale/language and retrieval time. V1-04 may normalize,
deduplicate, reject malformed/junk rows and enforce result/cost bounds. It may
not rank opportunities, apply commercial weighting, select interventions, sum
opportunity value, produce an SEO shortlist or generate content.

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

Customer Connection state is separate from evidence source/run state. A GSC
Connection may be connected while its evidence is failed or stale, and a
disconnected Connection may retain stale last-known-good evidence. Site and
Product-owned external sources do not receive artificial customer Connection
rows merely to share this vocabulary. `business_id` is mandatory for every
durable fact; `connection_id` is present only for a genuine customer-connected
source and is otherwise null/not applicable.

Each source exposes `last_attempted_at`, `last_successful_at`,
`evidence_as_of` and coverage/completeness where meaningful.

- Search Console freshness follows the source's finalized-data semantics; the
  actual latest finalized date returned by the provider is recorded. No fixed
  guessed lag is encoded.
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

1. A fresh test customer can connect GSC from the authenticated Business flow
   without founder intervention.
2. OAuth uses the Product-owned client, official flow and exactly
   `https://www.googleapis.com/auth/webmasters.readonly`; no profile, email,
   openid or write scope is requested.
3. HTTPS callback, state/PKCE, short-lived pending Connection and one-time
   callback consumption are enforced.
4. Tokens remain Vault-only and absent from browser responses, logs and artifacts.
5. Official property discovery exposes only safe site URL, permission and type.
6. Multiple properties require explicit selection and an authorized read probe.
7. URL-prefix properties satisfy exact scheme/host/port/path-boundary rules.
8. Domain properties match the registrable domain and constrain evidence to the
   canonical host/base path.
9. Mismatched/unverified properties cannot activate; reconnect, property change,
   disconnect and reauthentication states are tested.
10. Revoked/expired authorization preserves LKG evidence and exposes failure.
11. No Google write API is called.
12. Finalized property/date evidence covers up to 365 days; finalized detailed
    query/page/query+page evidence covers up to 90 days.
13. The latest finalized date comes from provider semantics, not a fixed guessed
    lag.
14. Query/page/query+page coverage is separately provider-limited; pagination,
    caps, empty and sparse states are honest and omissions are never zero.

### Site evidence

15. The canonical site identity is verified before acquisition.
16. Discovery follows homepage → Woo URLs → sitemap → bounded link fallback.
17. Discovered URLs and inspected pages are distinct.
18. URL, page, byte, redirect, concurrency and deadline budgets are explicit;
    silent truncation cannot claim completeness.
19. Same-origin, redirect, SSRF, DNS-rebinding and private-network protections
    are tested.
20. Sitemap/robots handling is bounded and limitations are recorded.
21. URL, final URL, status, canonical, declared/observable indexability, page
    type and retrieval facts are normalized without claiming Google indexing.
22. Product/category relations are source-verified only.
23. Removed URLs disappear from the current inventory without erasing history.
24. Partial/failing collection retains LKG and cannot claim complete coverage;
    site evidence contains no PII or auth material.

### External search evidence

25. DataForSEO terms, storage, UK quality, cost ceilings, duplicate protection,
    rate limits and failure behavior are approved before Slice D.
26. Query identity, direct seed lineage, locale and language are deterministic;
    no LLM invents seeds.
27. Provider ideas remain attributed evidence, not a shortlist or recommendation.
28. Demand evidence includes period, unit, provider and completeness.
29. SERP evidence includes bounded rank, URL and domain observations.
30. Pagination, timeout, malformed response and cost ceilings fail closed;
    cache/reuse exposes retrieval and observation time without fake demand.

### Cross-source contract and governance

31. Every durable fact has mandatory Business ownership, provenance and
    observation/retrieval metadata; connection ID is used only for real customer
    Connections.
32. Direct facts and derived relationships remain distinct and traceable.
33. Connection state is separate from evidence source/run state.
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

## Resolved owner decisions

Resolved for this proposal: the customer-controlled GSC journey; Product-owned
Google OAuth client; exact `webmasters.readonly` scope; both URL-prefix and
Domain properties; canonical property isolation; 365-day finalized trend plus
90-day finalized detailed GSC evidence; provider-derived finalized dates rather
than a fixed guessed lag; sitemap/Woo-led site acquisition; deterministic
direct query seeds; GA4 and Bing excluded; and the Slice A–E execution order.

Public deployment must still satisfy Google's then-current OAuth brand/scope
verification, verified-domain, privacy-policy and redirect-origin requirements.
That is a public-release gate, not a requirement for the bounded development
test.

## Remaining bounded decisions

1. Exact implementation crawl/request caps.
2. DataForSEO terms/licensing, retention, UK quality, cost and provider approval
   before Slice D.
3. Detailed evidence/raw-retention constants where provider evidence is required.

These are bounded implementation/provider gates, not reasons to expand scope.

## Proposed execution order within one V1-04 milestone

Only one slice is active at a time:

- **Slice A:** organic evidence durable source/run/status foundation.
- **Slice B:** fresh-customer Google Search Console connection and evidence.
- **Slice C:** bounded site discovery and page-truth evidence.
- **Slice D:** external-provider decision and bounded external evidence.
- **Slice E:** unified progressive-evidence validation, real Street Kingz
  acceptance and V1-04 closeout.

V1-05 remains untouched until Slice E and V1-04 are accepted.

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
