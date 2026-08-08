# Content Intelligence Evidence Architecture

## Purpose and scope

This architecture turns an approved product or source artifact into reusable evidence for content decisions. It collects and normalises observations; it does not decide what content to create and does not generate content.

Street Kingz is the initial real-world customer and the Heavy Duty Drying Towel is the V1 validation subject. Product URLs, catalogue data, market settings and brand rules are inputs. The engine architecture is not Street Kingz-specific, the repository is not being renamed, and no final commercial product name has been chosen.

The same evidence must be reusable for product pages, buying guides, FAQs, comparisons, collection pages and articles. Evidence is keyed to subjects, queries, sources, markets and retrieval parameters—not to an output content type.

The governing boundary is:

```text
Approved product/source artifact
        ↓
Deterministic provider seeds and requests
        ↓
Independent evidence providers
        ↓
Immutable raw provider artifacts
        ↓
Provider-specific normalisation
        ↓
Evidence aggregation, coverage and sufficiency
        ↓
Deterministic Current Page Inventory and Gap Matrix
        ↓
Compact model-independent Decision Brief
        ↓
GPT-5.6 Sol interpretation and deterministic validation
        ↓
Decision-level human approval
        ↓
Constrained generation and deterministic validation
        ↓
Generated-change human approval
        ↓
Publication
        ↓
Measurement
```

AI does not perform research. It must not browse, fetch pages or call research providers. Providers collect evidence. AI receives validated evidence and coverage only after the engine determines that sufficient evidence exists for the requested objective, and its findings must cite evidence IDs.

## Architectural principles

- **Provider independence:** adapters do not call one another and the Evidence Engine does not depend on a specific vendor. DataForSEO is the current preferred V1 implementation, not a permanent hard dependency.
- **Automation by default:** recurring manual evidence collection is not part of the normal workflow. Manual imports exist only for fallback, debugging or exceptional recovery.
- **Commercial pragmatism:** paid APIs and subscriptions are acceptable when they materially improve evidence quality or eliminate meaningful manual work. Zero cost is not a goal when it harms automation or output quality.
- **Evidence before interpretation:** raw observations, normalised evidence, AI interpretation and generated content remain separate artifacts.
- **Proportionate scope:** add a provider, dataset or processing stage only when it materially improves the final decision/content or removes meaningful manual work.
- **Targeted page inspection:** retain explicit-URL competitor-page extraction when headings, claims, structure, product information or other page-level content must be inspected. A SERP provider is not a substitute for page content.
- **Optional qualitative sources:** Reddit is not a V1 dependency. It may be evaluated later only if evidence shows that it adds material qualitative value.

## Current implementation state

### Completed and validated

- Phase 2 rendered product-page capture, deterministic cache reuse and canonical product facts.
- Field-level product-fact provenance back to source artifacts and page evidence.
- Evidence contracts, validation, stable IDs, provider isolation, coverage reports and human-readable summaries.
- Product Facts provider and deterministic provider-specific caching.
- DataForSEO Keyword Ideas client and provider, including deterministic seeds, raw/normalised separation, request fingerprinting, failure preservation and rate-limit metadata.
- Preflight maximum-cost enforcement and recorded actual provider cost.
- Fixture-backed tests that make no live provider calls.
- One controlled live Keyword Ideas request followed by a cache-only rerun with zero additional requests. The saved run returned 100 keyword ideas at a recorded cost of $0.024 and produced complete evidence, coverage and summary artifacts after the renderer compatibility fix.
- DataForSEO SERP Advanced and Google Search Console providers with controlled live validation, deterministic cache reuse and preserved provenance.
- Deterministic cross-provider aggregation, coverage and objective-specific sufficiency.
- Current Page Inventory, Gap Matrix, compact Decision Brief and canonical citation architecture.
- GPT-5.6 Sol interpretation, strict output validation, immutable call lifecycle and two independent 48/50 product-value reviews.

### Current and next work

1. Use the validated Product Facts, Keyword Ideas, SERP Advanced and Search Console evidence layer with deterministic caching and provenance.
2. Keep Current Page Inventory, Gap Matrix and the compact Decision Brief as permanent deterministic interpretation inputs.
3. Use GPT-5.6 Sol as the preferred production interpreter; GPT-4.1 is no longer on the critical path.
4. Implement constrained generation only from individually approved or human-modified decisions.
5. Validate generated changes and require a second human approval before publication.

## V1 provider path

```text
Product Facts
    ↓
DataForSEO Keyword Ideas
    ↓
DataForSEO Google Organic SERP Advanced
    ↓
Google Search Console
    ↓
Evidence aggregation and sufficiency
```

These are the preferred V1 implementations:

| Provider | Role | V1 state |
|---|---|---|
| Product Facts | Approved first-party facts and deterministic research seeds | Implemented |
| DataForSEO Keyword Ideas | Keyword discovery, volume, difficulty and commercial metrics | Implemented and live-validated |
| DataForSEO Google Organic SERP Advanced | Ranking pages, result types, SERP features, People Also Ask and related searches when returned | Implemented and live-validated |
| Google Search Console | First-party queries, pages, impressions, clicks and positions | Implemented and live-validated |
| Competitor page | Targeted inspection of explicit public pages | Optional, targeted |
| Manual Autocomplete/PAA imports | Recovery and debugging only | Optional fallback |
| Reddit | Potential qualitative language/concern evidence | Future evaluation, not required |

If DataForSEO is replaced, an alternative adapter may satisfy the same provider and evidence contracts. Provider choice must not change downstream aggregation, sufficiency, interpretation or content-generation contracts.

## Overall architecture

V1 remains a modular, single-user local tool. It needs no database, queue, worker, microservice split or provider marketplace.

The implemented and planned module boundaries are:

```text
research/
├── contracts/             # Provider request/result and evidence schemas
├── core/                  # Canonical hashing and stable identities
├── providers/             # Independent source adapters
├── clients/               # Provider transports and configuration
├── validation/            # Schema, provenance and artifact checks
├── renderers/             # Human-readable evidence reports
├── aggregation/           # Cross-provider grouping/corroboration
└── sufficiency/           # Objective-specific sufficiency decisions

interpretation/            # Inventory, Gap Matrix, Decision Brief, model contract and validation
generation/                # Decision approval, compact generation brief, output contract and validation
```

Do not create placeholder modules merely to match this diagram. Add them when their milestone is implemented.

## Data flow

1. Validate and load an approved product/source artifact.
2. Build deterministic, content-type-neutral seeds with origin evidence IDs.
3. Produce explicit provider requests with market, language, bounds and cost/request ceilings.
4. Resolve each provider cache independently before transport.
5. Collect raw evidence only for cache misses.
6. Save raw responses before normalisation so failures remain inspectable.
7. Normalise each provider independently into canonical evidence records.
8. Validate provenance, confidence and provider results.
9. Aggregate stable evidence IDs without erasing provider-specific observations.
10. Produce coverage, failures and an objective-specific sufficiency state.
11. If evidence is sufficient, derive the Current Page Inventory, Gap Matrix and compact Decision Brief deterministically.
12. Run and validate interpretation, then record human approval independently for each decision.
13. Pass only approved or human-modified decisions and their necessary evidence into constrained generation.
14. Validate generated changes and require human approval before a separate publication stage.
15. If evidence is insufficient, stop or request a scoped additional provider; absence must not be treated as negative evidence.

## Provider contract

Every provider has a stable ID and version, declares supported evidence types and cache policy, and implements the same conceptual boundary:

1. Validate configuration and approved inputs.
2. Create and fingerprint a deterministic request.
3. Resolve its own cache namespace.
4. Collect raw data on a cache miss, subject to request and cost controls.
5. Normalise provider-native data into canonical evidence without AI.
6. Return a structured result, including cache, provenance, rate-limit, cost, warning and error metadata where applicable.

Provider adapters may not call one another. One provider failure must not prevent another provider from preserving successful artifacts. Provider-specific authentication, pricing, retention and response formats remain inside the adapter/client boundary.

### Provider request

A request records:

- Provider and adapter version
- Subject and approved product/source artifact reference and hash
- Stable seeds plus origin evidence IDs
- Market and language
- Provider-specific parameters and bounds
- Approval context
- Maximum requests and maximum cost where applicable

### Provider result

A result records:

- Provider identity, version and stable request fingerprint
- Status: `complete`, `partial`, `failed`, `unavailable` or `skipped`
- Cache hit and cache reference
- Raw and normalised artifact references
- Evidence record IDs
- Start/completion timestamps
- Rate-limit observations
- Actual/configured cost where applicable
- Structured warnings and errors

## Evidence and provenance

Canonical evidence records contain stable identity, provider/run identity, evidence type, subject and seed references, a typed value, retrieval context, timestamps, provenance, confidence, raw reference, normaliser version and lifecycle status.

Initial V1 evidence types are:

- `product_fact`
- `keyword_idea`
- SERP ranking/result/feature/question observations to be defined with the SERP Advanced provider
- Search Console query/page performance observations to be defined with the Search Console provider
- Targeted competitor metadata, heading, claim, question and internal-link observations when that provider is justified

The schema describes observations, not recommendations. A PAA item means that the provider observed a displayed question for a particular request; it does not establish that the answer is true or that the query deserves content.

Every record must answer who supplied it, where and when it was observed, how it was extracted, which request/seed caused collection and which immutable raw bytes support it. AI interpretation provenance is separate: every finding cites evidence IDs, the evidence artifact hash, model, prompt version and interpretation time.

Manual imports, when used for fallback/debugging, must retain the original file, capture instructions and capture time. “Manually supplied” never means “source unknown.”

## Caching and cost control

Each provider owns an independent namespace under:

```text
artifacts/evidence/cache/<provider-id>/<request-fingerprint>/
```

The fingerprint includes provider/adapter and normaliser versions, canonical seeds or source identifiers, market/language, result-affecting parameters and account scope when results are account-specific. Output content type is excluded so evidence can be reused across workflows.

Cache resolution occurs before any network or paid transport. Cached runs return the recorded original cost as provenance but incur no new cost. Raw responses are preserved and never silently overwritten by normalisation or interpretation.

Paid providers must enforce a configured preflight maximum where deterministically possible and record the configured ceiling, conservative request estimate, actual charge and response total. Do not optimise away a valuable provider merely to reach zero cost; optimise unnecessary repeat requests through deterministic reuse.

## Rate limits and responsible access

- Default to sequential collection for the single-user V1 tool.
- Resolve cache before acquiring a rate-limit slot.
- Honour provider rate headers and `Retry-After`.
- Retry only explicitly retryable failures with bounded backoff; do not retry authentication, permission or validation failures automatically.
- Record and enforce per-run request/cost budgets.
- Never rotate credentials, IP addresses or user agents to evade limits.
- Targeted competitor fetching uses explicit public URLs and must respect applicable access rules, `robots.txt`, conditional requests and conservative per-host limits.
- Manual Google imports must never turn into automated use of undocumented endpoints.
- Any future Reddit adapter requires approved access and then-current retention/deletion compliance; it remains outside mandatory V1 scope.

## Confidence, aggregation and sufficiency

Confidence measures how suitable an observation is for later interpretation. It is not a probability that a statement is true and never hides the source. Scores remain deterministic, versioned and decomposed into source reliability, directness, corroboration, freshness and extraction integrity.

Aggregation groups related observations and computes cross-provider corroboration without erasing source-specific records. Repeated observations from the same source do not count as independent corroboration.

Before AI recommends or generates content, the engine must decide whether evidence is sufficient for the requested objective. Preliminary sufficiency evaluates:

- Whether required provider/evidence categories for that objective completed or were explicitly unavailable
- Whether usable evidence retains valid provenance
- Whether material conflicts, staleness or missing fields make a decision unsafe
- Whether the available evidence can support the candidate actions under consideration, including “take no action”

V1 does not yet define numeric SEO thresholds or a mathematically sophisticated score. Detailed rules will be designed after real SERP Advanced and Search Console data are available. Until then, sufficiency is an explicit state and rationale, not an invented volume, difficulty or ranking cutoff.

## AI interpretation and opportunity decision

There is one downstream interpretation/strategy stage. Deterministic evidence, sufficiency, Current Page Inventory and Gap Matrix feed a compact, model-independent Decision Brief. GPT-5.6 Sol is the preferred production interpretation model; GPT-4.1 is no longer on the critical path. It returns findings and exactly one bounded decision per required area with canonical evidence citations and uncertainty.

Interpretation never changes raw or normalised evidence. Its validated output remains immutable. A separate approval artifact records `approved`, `modified`, `rejected` or `pending` for each decision. Generation receives only approved/modified work, necessary current content and allowed evidence; it cannot independently choose strategy, search targets, sections or claims. Generated changes require deterministic validation and a second human approval. Publication and measurement remain later, separate stages.

## Failure handling

The Evidence Engine treats providers as a set, not a transaction:

- Successful provider artifacts remain usable when another provider fails.
- Raw data survives a normalisation failure.
- Exceptions become structured provider errors.
- Coverage distinguishes complete, partial and failed collection.
- Sufficiency is separate from collection status: a technically complete run may still be insufficient for a particular objective.
- No AI interpretation runs when artifacts fail validation or sufficiency is not met.

## V1 acceptance criteria

The evidence architecture is ready for the first complete decision when:

- Product Facts, Keyword Ideas, SERP Advanced and Search Console use independent provider contracts and caches.
- Every normalised record resolves to immutable raw evidence and passes provenance validation.
- Automated tests use fixtures and never make live provider calls.
- Paid request ceilings, actual costs and cache-only reuse are tested and recorded.
- Missing providers or metrics remain explicit and are not estimated by AI.
- Aggregation preserves provider-specific observations and deterministic identities.
- Objective-specific sufficiency can allow, decline or defer AI interpretation with a rationale.
- The interpreter has no network/provider access and cites only supplied evidence IDs.
- Manual imports are not required by the normal workflow.
- The legacy and Phase 2 compatibility suites continue to pass.

## Delivery sequence

1. **Completed — baseline and modularisation:** protect the legacy HTTP contract with offline characterisation tests.
2. **Completed — Phase 2 product extraction:** capture rendered source, canonical product facts and field-level provenance with deterministic cache reuse.
3. **Completed — Evidence Engine foundation:** establish contracts, stable IDs, provider isolation, validation, coverage, caching and summaries.
4. **Completed — Keyword Ideas proof:** implement the DataForSEO adapter, cost controls and deterministic cache; complete controlled live and cache-only validation.
5. **Completed — external evidence providers:** validate Keyword Ideas, SERP Advanced and Search Console with deterministic caching and provenance.
6. **Completed — aggregation and sufficiency:** group evidence, expose conflicts/gaps and enforce objective-specific sufficiency.
7. **Completed — page state and Decision Brief:** derive Current Page Inventory, Gap Matrix and the compact model-facing representation.
8. **Completed — interpretation:** validate GPT-5.6 Sol decisions, canonical citations, product value and immutable controlled calls.
9. **Current — human-approved constrained generation:** record individual approvals and generate only from the evidence-bounded approved subset.
10. **Next — controlled generation validation and review:** validate one generated change set and complete human approval for the first real page change.
11. **Later — publication and learning loop:** publish only approved output, measure performance and feed outcomes into later decisions.

Targeted competitor-page extraction may be scheduled when a decision needs page-level evidence unavailable from structured SERP results. Manual imports and Reddit are not milestones on the critical V1 path.
