# Phase 3: Evidence Collection Architecture

## Purpose

Phase 3 transforms a reviewed product-understanding artifact into reusable evidence that can later be interpreted by AI. It collects and normalises observations; it does not decide what content to create and does not generate content.

The same evidence must support product pages, buying guides, FAQs, comparison pages, collection pages, cornerstone articles and supporting articles. Evidence is therefore keyed to products, questions, queries, competitors and markets—not to an output content type.

The governing boundary is:

```text
Product-understanding artifact
        ↓
Research seed plan
        ↓
Independent evidence providers
        ↓
Immutable raw provider artifacts
        ↓
Provider-specific normalisation
        ↓
Merged evidence index
        ↓
Separate AI interpretation (later stage)
```

The AI must never browse, search, fetch pages or call research providers. It receives only the collected normalised evidence and returns an interpretation whose statements reference evidence IDs.

## Provider availability and responsible access

The architecture must not assume a paid subscription.

| Provider | V1 access | Responsible approach |
|---|---|---|
| Product facts | Local Phase 2 artifacts | Read the approved `facts.json`; never scrape the product again during research. |
| Google Autocomplete | Manual/import provider | Google does not document a supported public Autocomplete research API. V1 accepts suggestions copied or exported from a user-initiated Google session. An undocumented endpoint must not become a required dependency. |
| Google People Also Ask | Manual/import provider | Google does not provide a supported public PAA API. V1 accepts questions and visible source links captured from a user-initiated SERP. It must not expand PAA recursively or scrape Google at scale. |
| Reddit | Official API when approved; manual import fallback | Use registered OAuth access only after Reddit approval, a descriptive user agent and rate-header compliance. If approval is unavailable, mark the provider unavailable or accept user-selected thread exports; do not bypass access controls. |
| Competitor pages | Direct fetch of user-supplied URLs | Fetch only explicit public URLs, respect `robots.txt`, site terms, `Retry-After`, conditional requests and per-host limits. Do not use competitor fetching as a search engine. |

Reddit’s current official guidance requires approval and OAuth, specifies rate headers and a free-access limit for eligible clients, and requires stored deleted content to be removed; it strongly recommends routinely deleting stored user content within 48 hours ([Reddit Data API Wiki](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki), [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy)). These rules must be treated as provider configuration, not assumptions embedded in the core pipeline.

Google’s Custom Search JSON API is not a suitable fallback for new installations: it is closed to new customers and existing customers must transition by January 1, 2027 ([official overview](https://developers.google.com/custom-search/v1/overview)).

## 1. Overall architecture

V1 remains a modular, single-user local tool. It needs no database, queue, worker or service split.

### Modules

```text
research/
├── contracts/             # Provider request/result and evidence schemas
├── planner/               # Converts product facts into provider-neutral seeds
├── providers/             # One adapter per independent source
├── normalisers/           # Raw-source-specific to canonical-evidence conversion
├── cache/                 # Provider-independent cache utilities and policies
├── confidence/            # Deterministic confidence components
├── aggregation/           # Deduplication and merged evidence index
├── validation/            # Schema, provenance and artifact-boundary checks
└── renderers/             # Human-readable evidence report
```

### Initial provider adapters

- `product_facts`
- `google_autocomplete_import`
- `google_paa_import`
- `reddit_oauth`
- `reddit_import`
- `competitor_page`

Import providers are first-class providers, not temporary exceptions. They emit the same raw manifest, normalised records, confidence components and failure status as network providers.

### Future adapters

- `google_search_console`
- `google_trends`
- `google_analytics_4`
- `google_merchant_center`
- Any additional provider implementing the provider contract

Search Console has an official API ([official getting-started documentation](https://developers.google.com/webmaster-tools/v1/getting-started)). GA4 reporting is available through the official Google Analytics Data API ([official dimensions and metrics](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema)). Merchant Center data and reports are available through the official Merchant API with OAuth or service accounts ([official overview](https://developers.google.com/merchant/api/overview)). Google Trends has an official API alpha, but access remains limited and must be treated as optional ([official Trends API alpha](https://developers.google.com/search/apis/trends)).

Adding any of these providers must not change the planner, merged evidence schema, AI interpretation contract or downstream content architecture.

### Local artifact layout

```text
artifacts/evidence/<product-slug>/<evidence-run-id>/
├── request.json
├── seeds.json
├── providers/
│   ├── product_facts/<provider-run-id>/
│   │   ├── raw.json
│   │   ├── normalised.json
│   │   └── run.json
│   ├── google_autocomplete_import/<provider-run-id>/...
│   ├── google_paa_import/<provider-run-id>/...
│   ├── reddit_oauth/<provider-run-id>/...
│   └── competitor_page/<provider-run-id>/...
├── evidence.json
├── coverage.json
├── interpretation.json
└── summary.md
```

`interpretation.json` initially contains `status: "not_generated"`. When interpretation is implemented later, it is written as a new artifact and never modifies raw or normalised evidence.

### Data flow

1. Validate and load an approved Phase 2 facts artifact.
2. Build content-type-neutral seeds from product names, product type, intended use, FAQs, claims, limitations and related products.
3. Produce explicit provider requests containing seeds, UK market, English language and collection bounds.
4. Resolve each provider’s cache independently.
5. Collect or import raw evidence only for cache misses.
6. Save immutable raw responses before normalisation.
7. Normalise each provider independently into the common evidence schema.
8. Validate provenance and confidence components.
9. Merge records by stable evidence ID without erasing provider-specific observations.
10. Produce coverage and failure reports.
11. Optionally pass only `evidence.json` and `coverage.json` to a later AI interpreter.

## 2. Provider interface

Every provider implements the same conceptual contract.

### Provider metadata

- Stable provider ID and adapter version
- Source owner
- Supported evidence types
- Supported markets and languages
- Access mode: local, import, official API or direct public page
- Authentication requirements
- Cache policy
- Rate-limit policy
- Retention and deletion policy
- Whether the provider is configured and available

### Input: `ProviderRequest`

- `request_id`
- `product_subject_id`
- `product_facts_ref`
- `seeds`: stable IDs plus seed text and origin fact IDs
- `market`: `GB`
- `language`: `en-GB`
- Optional provider-specific bounds, such as subreddits or competitor URLs
- Maximum records and maximum requests
- Collection reason
- Requested-at timestamp

### Output: `ProviderResult`

- Provider identity and adapter version
- Request fingerprint
- Status: `complete`, `partial`, `failed`, `unavailable` or `skipped`
- Cache status and cache reference
- Raw artifact references
- Normalised artifact reference
- Normalised evidence record IDs
- Started/completed timestamps
- Rate-limit observations
- Warnings
- Structured errors
- Retry recommendation, if any

### Operations

The interface needs five operations, regardless of provider implementation:

1. **Validate configuration** — report availability without collecting.
2. **Fingerprint request** — create the independent cache key.
3. **Collect or import** — return raw bytes or structured raw input.
4. **Normalise** — convert raw data into evidence records without AI.
5. **Apply retention** — expire, tombstone or remove provider data when required.

Provider adapters may not call one another. The orchestrator may run all configured providers and combine their results, but one provider’s failure cannot prevent another provider from saving its artifacts.

## 3. Evidence artifact schema

### Top-level `EvidenceArtifact`

- `schema_version`
- `artifact_type: "research_evidence"`
- `evidence_run_id`
- `subject`
  - Stable product ID
  - Product URL
  - Product-facts artifact reference and hash
- `scope`
  - Market
  - Language
  - Collection start and end
- `provider_runs`: references and statuses
- `records`: canonical evidence records
- `coverage`: requested, completed, unavailable and failed evidence types
- `created_at`
- `warnings`

### Canonical `EvidenceRecord`

- `evidence_id`: stable hash of provider, evidence type, canonical subject/query and source observation identity
- `provider_id`
- `provider_run_id`
- `evidence_type`
- `subject_id`
- `seed_ids`
- `query_or_question`
- `value`: typed value, never an unlabelled free-form blob
- `context`
  - Market
  - Language
  - Device, subreddit, competitor or page section where applicable
- `observed_at`
- `retrieved_at`
- `provenance`
- `confidence`
- `raw_ref`
- `normaliser_version`
- `status`: active, expired, deleted or disputed

### Initial evidence types

- `product_fact`
- `search_suggestion`
- `people_also_ask_question`
- `people_also_ask_source`
- `reddit_post`
- `reddit_comment`
- `reddit_language_pattern`
- `competitor_page_metadata`
- `competitor_heading`
- `competitor_claim`
- `competitor_question`
- `competitor_internal_link`

The schema describes observations, not recommendations. For example, a PAA record means “this question was visibly shown for this query, market and time”; it does not mean the question has high volume or that its displayed answer is true.

### Raw and interpretation artifacts

Raw artifacts retain provider-native fields and response bodies subject to the provider’s retention rules. Normalised evidence contains only fields required for later interpretation. AI interpretation uses a separate schema:

- `interpretation_id`
- Input evidence artifact hash
- Interpreter model and prompt version
- Findings
- Evidence IDs supporting each finding
- Uncertainties and conflicts
- No raw URLs or claims invented outside the evidence artifact

## 4. Caching strategy

Each provider owns its cache namespace and policy.

### Cache key

The request fingerprint includes:

- Provider ID and adapter version
- Normaliser version where it affects usable output
- Canonical seeds or source URLs
- Market and language
- Provider-specific parameters
- Authentication/account scope when results are account-specific

Content-type intent must not be part of the cache key. The same autocomplete, Reddit or competitor evidence must be reusable for an article, FAQ, product page or comparison.

### Storage

```text
artifacts/evidence/cache/<provider-id>/<request-fingerprint>/
├── raw/<retrieval-id>.*
├── retrieval.json
└── latest.json
```

Raw retrievals are immutable. `latest.json` is a pointer, not a mutable replacement for history. A provider run copies or references the exact cached retrieval it used.

### Initial freshness defaults

| Provider | Default freshness | Notes |
|---|---:|---|
| Product facts | Until source artifact hash changes | Facts are immutable inputs. |
| Google Autocomplete import | 7 days | Suggestions are volatile; retain capture date and market. |
| Google PAA import | 7 days | Questions and source links are SERP observations. |
| Reddit | At most 48 hours for stored user content unless current terms permit otherwise | Refresh deletion state and enforce tombstones/removal. Derived non-user aggregates require a documented policy. |
| Competitor page | 7 days | Use `ETag`/`Last-Modified` and conditional requests when available. |

Users can force a new retrieval, but a forced run creates a new immutable cache entry. It never overwrites evidence previously used by an interpretation.

## 5. Rate limiting

Rate limiting is provider-specific and persists locally so restarting the command does not forget recent requests.

### General rules

- Resolve cache before acquiring a rate-limit slot.
- Default to sequential collection for a single-user tool.
- Honour `Retry-After` and provider rate headers.
- Use capped exponential backoff with jitter only for retryable responses.
- Do not retry authentication, permission, robots or validation failures automatically.
- Set a per-run request budget and record when it is exhausted.
- Never rotate credentials, IP addresses or user agents to evade a limit.

### Initial provider policies

- **Autocomplete and PAA imports:** no automated Google requests in V1; collection rate is governed by explicit human captures.
- **Reddit:** stay below the limit reported by `X-Ratelimit-*` headers. The current eligible free-access documentation states 100 QPM per OAuth client averaged over a ten-minute window; use a conservative soft ceiling such as 80 QPM and always defer to returned headers.
- **Competitor pages:** one concurrent request per host, a default minimum interval of five seconds, conditional requests and a small per-run page cap.
- **Product facts:** local reads only.

## 6. Confidence scoring

Confidence measures how suitable an observation is for later interpretation. It is not a probability that a statement is true and must never hide the underlying source.

### Components

Each record stores scores from 0 to 1 plus a written rationale:

- **Source reliability (35%)** — first-party fact, official API, user-generated content or competitor marketing.
- **Directness (25%)** — direct observation versus deterministic derivation.
- **Corroboration (20%)** — independent sources supporting the same observation.
- **Freshness (10%)** — age relative to provider policy.
- **Extraction integrity (10%)** — structured API field, stable selector, manual transcription or uncertain parse.

The combined score is deterministic and versioned. Component weights may change only with a scoring-version change.

### Evidence-type interpretation

- Product facts can have high factual confidence when directly sourced and reviewed.
- Autocomplete and PAA can have high confidence as observations of Google’s interface, but they provide no search-volume confidence.
- Reddit can have high confidence as evidence of one person’s language or concern, but low confidence as a general product fact.
- A competitor claim can have high confidence that the competitor published it and low confidence that the claim is objectively true.
- Corroboration must require independent providers; repeated copies from one page do not increase confidence.

Records below a configured threshold remain visible with warnings. They are not silently discarded.

## 7. Provenance model

Every record must answer: who supplied it, where it appeared, when it was observed, how it was extracted and which raw bytes support it.

### Required provenance fields

- Provider ID and adapter version
- Source owner
- Canonical source URL or local artifact URI
- Source record ID, post ID, comment ID or page-section locator where available
- Query/seed that caused collection
- Market, language and relevant account scope
- Retrieved and observed timestamps
- Raw artifact path and SHA-256 hash
- Raw byte range, JSON pointer, CSS/semantic locator or imported row ID
- Extraction method: API, deterministic HTML, manual import or deterministic derivation
- Normaliser version
- Terms/retention classification
- Parent evidence IDs for derived normalised observations

Manual imports also require capture instructions, capture time and the original imported file. “Manually supplied” must never mean “source unknown.”

AI interpretation provenance is separate: every finding cites normalised evidence IDs, the evidence artifact hash, model, prompt version and interpretation time.

## 8. Failure handling

The orchestrator treats provider results as a set, not a transaction.

### Provider isolation

- Every provider writes its own `run.json` even when it fails.
- Successful provider artifacts remain valid if another provider fails.
- Normalisation failure does not delete a successfully captured raw artifact.
- One failed seed can produce a `partial` provider result while preserving successful seeds.
- Provider exceptions are converted into structured errors at the adapter boundary.

### Error classification

- `configuration`: missing approval, token or import file
- `permission`: access denied or robots disallowed
- `rate_limited`: includes retry time where supplied
- `transient`: timeout or 5xx
- `invalid_source`: malformed or unsupported raw data
- `normalisation`: raw data captured but unusable
- `retention`: data expired or removed due to source policy

### Completion policy

The evidence run can finish as:

- `complete`: all requested providers completed
- `partial`: at least one provider completed and at least one failed/unavailable
- `insufficient`: collection completed but minimum evidence requirements were not met
- `failed`: no provider produced usable evidence

Product facts are the minimum required source for a product-led run. Other initial providers are optional and independently degradable. `coverage.json` must make missing sources explicit so a later decision stage can decline to recommend content rather than treating absence as negative evidence.

No AI interpretation should run when the evidence artifact fails schema/provenance validation or is marked `insufficient` under the selected interpretation policy.

## 9. Acceptance criteria

Phase 3 collection is acceptable when:

- A reviewed Phase 2 product artifact can create a provider-neutral seed plan.
- Product facts, Autocomplete import, PAA import, Reddit and competitor pages all use the same provider result contract.
- Each provider can be enabled, disabled, unavailable or failed without preventing other providers from completing.
- Each provider proves independent cache reuse in automated tests.
- No automated test accesses Google, Reddit, competitor sites or an AI provider.
- Raw, normalised and interpretation artifacts are stored separately.
- Every normalised evidence record resolves to a raw artifact and passes provenance validation.
- Manual imports retain original files and capture metadata.
- Autocomplete and PAA are represented as interface observations, not volume or truth claims.
- Reddit collection uses approved OAuth access or an explicit manual import; no access control is bypassed.
- Reddit retention and deletion handling is tested before OAuth collection is enabled.
- Competitor fetching respects explicit URLs, robots decisions, conditional HTTP and per-host limits.
- Cache keys omit output content type, proving evidence reuse across all target content forms.
- Confidence component calculations are deterministic, versioned and explainable.
- A mixed-success run produces usable evidence plus an accurate coverage/failure report.
- The AI interpreter has no network or provider access and can cite only supplied evidence IDs.
- The complete existing legacy and Phase 2 test suites continue to pass.

## 10. Recommended implementation order

### Step 1: Contracts and local artifacts

Define and test provider request/result, raw manifest, evidence record, coverage and interpretation-placeholder schemas. Build provenance validation and stable request/evidence hashing first.

### Step 2: Product-facts provider

Implement the local Phase 2 adapter. It establishes the contract without network, authentication, rate limits or ambiguous external data.

### Step 3: Orchestrator and independent cache

Implement sequential provider execution, per-provider cache namespaces, partial completion, structured errors and coverage reporting using fake providers.

### Step 4: Competitor-page provider

Add explicit-URL fetching, robots checks, conditional requests, HTML snapshots and deterministic normalisation. This proves the network-provider boundary without a subscription.

### Step 5: Google manual-import providers

Add separate Autocomplete and PAA import formats, validators and normalisers. Keep them separate because they represent different observations and freshness policies.

### Step 6: Reddit provider

Implement manual import first. Add official OAuth collection only after access is approved and retention/deletion tests pass. Treat lack of approval as `unavailable`, not as a reason to scrape unofficial endpoints.

### Step 7: Aggregation and confidence

Build stable evidence IDs, duplicate grouping, cross-provider corroboration, deterministic confidence components and the final `evidence.json`/`summary.md` renderers.

### Step 8: AI interpretation boundary

Only after evidence artifacts pass acceptance tests, define an interpreter that receives normalised evidence and coverage artifacts, has no network tools, and returns findings with evidence citations. Interpretation remains outside evidence collection.

### Step 9: Future official providers

Add Search Console, then GA4 and Merchant Center using official APIs because they provide first-party business evidence. Add Google Trends only when official API access is available. Each is an adapter addition, not an architectural change.
