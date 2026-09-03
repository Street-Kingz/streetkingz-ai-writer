# V1-04 Slice D0 — DataForSEO Provider Decision Gate

- Date: 2026-09-03
- Branch: `feature/v1-04-organic-evidence`
- Repository SHA at review: `cc2452c9ba44659ef087de2ad680c851ef219545`
- Scope: Slice D0 provider decision only; no Slice D Product implementation.
- Live validation: **NO — blocked before billable testing**.

## Governed state

Slice A, Slice B and Slice C remain accepted. B2 remains accepted with 1,125
Search Analytics observations. Slice C remains accepted with truthful partial
completeness caused by `inspected_page_cap`. No accepted evidence, connection,
credential or tenant state was changed.

The Slice D decision gate remains required. DataForSEO remains **PROVISIONAL**;
this document is a recommendation for Ben and is not provider approval.

## Official material reviewed

Reviewed on 2026-09-03:

- [DataForSEO Terms of Service](https://dataforseo.com/terms-of-service),
  updated 2026-06-12: defines the Service/API and restricts SERP use that could
  compete with or adversely affect search-engine providers; it does not state
  a clear downstream SaaS licence for displaying, retaining, caching or
  redistributing normalized SEO results.
- [DataForSEO Privacy Policy](https://dataforseo.com/privacy-policy): covers
  DataForSEO processing and subprocessors; it does not establish Product rights
  to retain or redistribute provider-derived SEO data.
- [DataForSEO DPA](https://dataforseo.com/wp-content/uploads/2026/06/DataForSEO_DPA-12-06-26.pdf),
  updated 2026-06-12: addresses Service Data/personal-data processing,
  minimisation, security and deletion/return; it is not a licence for the
  proposed keyword/SERP dataset.
- [Keyword Ideas live endpoint](https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_ideas-live/):
  endpoint contract, location/language inputs, result limit, optional
  clickstream/SERP fields, and 2,000 calls/minute with up to 30 simultaneous
  calls.
- [Google Organic SERP Advanced live endpoint](https://docs.dataforseo.com/v3/serp-se-type-live-advanced/):
  endpoint contract, location/language/device/depth inputs, 10-result billing
  unit, optional-cost multipliers, and 2,000 calls/minute with one task per
  live call.
- [Labs locations and languages](https://docs.dataforseo.com/v3/dataforseo_labs/locations_and_languages/):
  current supported-location mechanism and free lookup endpoint.
- [Google SERP locations](https://docs.dataforseo.com/v3/serp/google/locations/):
  current supported SERP-location mechanism and free lookup endpoint.
- [DataForSEO pricing](https://dataforseo.com/pricing): pay-as-you-go model,
  minimum payment of $50 and account budget controls; the retrieved public page
  delegates endpoint prices to interactive pricing material and did not expose
  stable numeric prices for the two proposed endpoints.
- [DataForSEO UK location announcement](https://dataforseo.com/update/new-locations-for-amazon-search-volume):
  identifies United Kingdom as location code 2826 and English as `en`.
- [DataForSEO US location example](https://dataforseo.com/help-center/how-to-scrape-google-search-results-with-python-using-dataforseo-serp-api):
  identifies United States as location code 2840 and English as `en`.

## Historical foundation audit

| Component | Classification | Finding |
|---|---|---|
| `research/clients/dataForSeo.js` | ADAPT | Useful in-memory Basic Auth, POST transport, timeout and rate-limit capture. It exposes raw response bodies in errors, has no response-byte bound, and reads credentials from environment configuration. |
| `dataForSeoKeywordIdeas.js` | ADAPT | Correct endpoint shape and normalization concepts, but file-coupled inputs/cache, default `locationCode = 2840`, broad historical fields, raw persistence and old approval model are not safe Product defaults. |
| `dataForSeoSerpAdvanced.js` | ADAPT | Correct endpoint shape and bounded depth/device concepts, but default `locationCode = 2840`, file/raw-artifact coupling and broad SERP-feature retention require Product redesign. |
| `selectSerpShortlist(...)` | DO NOT USE AS PRODUCT DECISION LOGIC | Historical ranking uses product-term matching, volume, difficulty and near-duplicate selection. V1-04 may acquire, validate, deduplicate and preserve lineage only. |
| Historical raw-response handling | DO NOT USE | Raw provider responses are written to local files and may be embedded in error metadata. Later Product work must default to normalized facts and sanitized errors. |

Provider evidence acquisition is distinct from opportunity selection. V1-04
Slice D must not rank opportunities, choose interventions, score SEO value or
produce recommendation language; those decisions belong to V1-05.

## Geography defect

The existing providers and tests default approximately to `market: GB` with
`location_code: 2840`. Current official material confirms the relevant country
mapping as:

- United Kingdom: `2826`;
- United States: `2840`;
- English: `en`.

The same country/location input model is used by the Labs and Google Organic
SERP endpoint documentation. This is recorded as **V1-04-D0-GEO-001**:
the reusable foundation is not safe for UK Product evidence unchanged.

Historical impact: the existing `test/dataforseo-serp.test.js` asserts `2840`
while the test scope is labelled `GB`, and historical scripts/artifacts contain
DataForSEO requests with `2840` in GB-labelled research. Those records must
remain historical and must not be relabelled as UK evidence. The historical
V1-01 provider reports also contain cost estimates, but they are not current
pricing truth.

## Terms and storage gate

**Conclusion: PROVIDER TERMS CLARIFICATION REQUIRED.**

The reviewed Terms do not clearly establish all of the rights required for the
proposed Product to persist and show normalized keyword ideas, search-volume
observations or SERP observations to isolated SaaS customers, nor do they state
clear retention, caching, derived-analysis, redistribution/resale, attribution
or deletion rules for those provider-derived facts. The DPA helps with personal
data processing obligations but does not resolve this data-licence question.

The provider's infrastructure result retention is a separate question from the
Product's legal right to store normalized facts. No inference is made from API
result availability or the DPA. Before implementation or live testing, obtain
written provider clarification covering commercial SaaS use, customer display,
normalized retention and cache duration, derived analysis, redistribution or
resale limits, attribution, deletion obligations and customer isolation.

Because this condition is unresolved, no live quality request was made.

## Proposed later Slice D contract (conditional; not implemented)

### Endpoints

Keep the minimum two-endpoint surface:

1. `POST /v3/dataforseo_labs/google/keyword_ideas/live` — bounded demand/idea
   evidence from direct seeds. Retain query text, direct parent seed, GB/English
   scope, search volume and justified monthly series, provider observation/update
   time, retrieval time, completeness and limitations. Exclude CPC, paid
   competition, difficulty, clickstream and embedded SERP data by default.
2. `POST /v3/serp/google/organic/live/advanced` — bounded current Google organic
   observations for direct seeds. Use rank, URL, domain and title/snippet only
   where materially useful; retain no rectangles, ads or unrelated features.

Both require explicit `location_code: 2826`, `language_code: en`, Google, and
desktop SERP with `depth: 10` for the proposed V1 contract. Desktop is the
recommended single baseline because it is the stable general web evidence
surface; mobile should be a later separately justified contract.

### Direct seeds and deterministic bounding

Permitted direct sources are Woo Product names, Woo Category names, verified
Slice C titles, verified Slice C H1 values and available GSC queries. Each seed
must retain a stable ID, Business/source-record identity, normalized text,
locale/language and direct provenance. Provider-returned ideas remain child
evidence with a parent direct seed. No LLM seed generation is permitted.

Recommended owner-review policy: source priority `woo_product`,
`woo_category`, `site_title`, `site_h1`, `gsc_query`; normalize deterministic
duplicates; sort stably by source priority then normalized text then source
identity; retain at most 5 per class and 20 per Business run. Do not use volume,
difficulty, revenue, margin or rank to choose seeds.

### Conditional future caps

These are proposed freeze points only:

| Constant | Proposed value |
|---|---:|
| `MAX_DIRECT_SEEDS_PER_SOURCE_CLASS` | 5 |
| `MAX_DIRECT_SEEDS_PER_BUSINESS_RUN` | 20 |
| `MAX_PROVIDER_IDEAS_PER_SEED_OR_REQUEST` | 25 |
| `MAX_PROVIDER_IDEAS_TOTAL` | 100 |
| `MAX_SERP_QUERIES_PER_BUSINESS_RUN` | 20 direct seeds only |
| `SERP_RESULTS_DEPTH` | 10 |
| `MAX_PROVIDER_REQUESTS_PER_RUN` | 21 (1 Labs + 20 SERP) |
| `MAX_PROVIDER_COST_USD_PER_RUN` | 0.10 hard ceiling, subject to verified pricing |
| `MAX_PROVIDER_COST_USD_PER_BUSINESS_PER_REFRESH_WINDOW` | 0.20 hard ceiling |
| `MAX_CONCURRENCY` | 2 |
| `REQUEST_TIMEOUT_MS` | 30,000 |
| `TOTAL_RUN_DEADLINE_MS` | 120,000 |
| `KEYWORD_EVIDENCE_REUSE_WINDOW` | 30 days, subject to license |
| `SERP_EVIDENCE_REUSE_WINDOW` | 7 days, subject to license |

### Cost and rate-limit position

The official pages establish pay-per-request billing and the endpoint cost
model, including a 10-result SERP billing unit and extra charges for certain
optional parameters. They do not expose a stable numeric price in the retrieved
public pricing page. Therefore:

- current Keyword Ideas price: **unresolved**;
- current SERP Advanced price: **unresolved**;
- historical estimates (`$0.024` Labs and `$0.002` SERP task) are stale and not
  used as current truth;
- cost multipliers reviewed: clickstream can double Labs cost; SERP depth above
  10, async AI overview, rectangles, PAA clicks, special query operators and
  crawl depth can add charges;
- documented provider throughput is 2,000 calls/minute; Labs documents up to
  30 simultaneous calls, while each live SERP call contains one task;
- Product should remain far below those limits with tenant fairness, a durable
  cost ledger, preflight estimates and a hard actual-cost stop.

No $0.10 live-test preflight can pass until the account-applicable numeric
prices and all applicable multipliers are verified.

### Duplicate, freshness and failure requirements

Later implementation must use durable idempotency over Business, provider,
endpoint, normalized direct seeds, location, language, device, limit/depth and
provider/normalizer version. Serialize simultaneous identical work; reuse a
valid success inside the source-specific freshness window; never retry a paid
success as a new task without an explicit stale/failed policy.

Keyword demand and SERP observation must have separate freshness windows. Store
provider observation time separately from retrieval time. Missing, empty or
partial provider evidence must remain unavailable/empty/partial, never zero and
never “no opportunity”. Preserve LKG on transient failure; invalid credentials
require reauthentication/credential remediation; insufficient balance, 400,
401/403, 429, 5xx, timeout, malformed JSON/item, task error, cost-limit breach
and partial responses need distinct safe failure/limitation states.

## Live validation result

- DataForSEO live test performed: **NO**.
- Keyword Ideas calls: 0.
- SERP calls: 0.
- Total billable calls: 0.
- Actual provider cost: USD 0.00.
- $0.10 ceiling: not consumed; preflight could not be proven.
- Keyword quality: not assessed.
- SERP quality: not assessed.
- External calls by host/type: none.

## Remediation required if later approved

Fix `V1-04-D0-GEO-001`; move credentials to Product-owned secret handling;
remove file-artifact coupling and raw-response persistence; sanitize error
bodies; implement tenant-bound normalized evidence with RLS/LKG and a cost
ledger; preserve direct-seed and provider-idea lineage; add paid-call
idempotency; and keep historical shortlist logic out of Product decision paths.

No Product code or migration was changed by this gate.

## Decision

**RECOMMENDATION: APPROVE WITH CONDITIONS, pending owner/legal clarification.**

Technical fit, bounded endpoints, UK configuration and deterministic controls
are promising. Terms/licensing/storage permission and current endpoint pricing
remain unresolved, so this is not approval to implement or spend provider
credit. Ben must decide whether to accept written clarification and authorize a
separate Slice D implementation.

- Critical remaining: provider terms/licensing/storage clarification; current
  account-applicable endpoint pricing and $0.10 preflight.
- High remaining: UK keyword/SERP quality validation; Product credential and
  tenant-bound implementation; paid-call idempotency and cost ledger.

