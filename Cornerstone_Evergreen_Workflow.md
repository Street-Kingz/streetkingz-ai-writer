# Cornerstone and Evergreen Content Workflow

## Purpose

This document defines the smallest useful extension from the proven Product-70 pipeline into evergreen editorial content. Guarded Writer v0.1.10 remains frozen production infrastructure. Cornerstone work must reuse the evidence and approval architecture without broadening the fixed Product-70 Writer or treating content generation as permission to mutate WordPress.

## Reusable workflow and authority boundaries

```text
DISCOVER -> RESEARCH -> ANALYSE -> PLAN -> DRAFT -> VALIDATE
    -> HUMAN APPROVAL -> FRESH CMS READ -> DRY RUN
    -> ONE-TIME EXECUTION CONTRACT -> GUARDED WRITE
    -> CMS VERIFICATION -> RENDERED VERIFICATION -> AUDIT
```

There are three separate authorities:

1. **Content-generation authority** may read approved facts/evidence and create versioned research, brief and draft artifacts. It has no WordPress mutation capability.
2. **Human approval** selects an exact brief and later an exact rendered/draft candidate. Approval records the approved artifact hashes and allowed targets; it is not itself a write.
3. **CMS mutation authority** belongs only to a narrow Writer operation after a fresh read and dry run. It requires a separately installed one-time execution contract bound to the human approval, current CMS hashes, approved target hashes and exact operation scope.

The artifact handoff is:

| Stage | Primary artifact | Binding that protects the next stage |
| --- | --- | --- |
| Discover/research | provider requests, raw responses, normalized evidence, research state | provider provenance, query/market parameters, timestamps, raw and normalized hashes |
| Analyse/plan | cornerstone research packet and structured content brief | exact input artifact hashes, evidence IDs, explicit limitations and freshness state |
| Human brief approval | immutable brief approval | brief hash, approved topic/intent/scope, reviewer decision |
| Draft/validate | semantic draft, source map, validation report, rendered preview | approved brief hash, content-profile version, evidence IDs, model/prompt metadata |
| Human content approval | immutable generated-content approval | exact candidate hashes, allowed CMS fields/blocks, rejected and blocked targets |
| Fresh read/dry run | authoritative CMS snapshot, write plan, rollback snapshot | strict current-state hashes, approved-target hashes, exact structural diff |
| Execute/verify | one-time contract, claim record, CMS and rendered verification | approval fingerprint, one-time ID, atomic claim, expected persisted hashes |
| Audit/measure | immutable execution and performance records | execution ID, publication URL/ID, observation windows and measurement provenance |

No artifact is silently overwritten. A changed brief, draft, approval or current CMS state creates a new version and invalidates downstream bindings.

## Repository capability audit

| Area | Status | Evidence and limitation |
| --- | --- | --- |
| Keyword discovery | COMPLETE | DataForSEO Keyword Ideas provider, deterministic seeds, normalization, caching, request ceilings and controlled live evidence exist. |
| DataForSEO | COMPLETE | Keyword Ideas and Google Organic SERP Advanced clients/providers are implemented and fixture/live validated. |
| Search Console | COMPLETE | Query, page and query/page metrics plus deterministic relationships are implemented and controlled-live validated. |
| SERP analysis | COMPLETE | Organic results, SERP features, People Also Ask, related searches and other returned result types are normalized and aggregated. Strategic synthesis remains an interpretation task. |
| Competitor research | PARTIAL | Ranking URLs/domains and SERP observations exist. Explicit-URL page extraction for headings, section coverage and claims is documented but not implemented as a reusable provider. |
| Content briefs | PARTIAL | The product-page Decision Brief and generation brief are proven. A cornerstone-specific contract and builder are defined here but not yet implemented in code. |
| Search-intent classification | PARTIAL | Intent indicators and interpretation context exist; no deterministic cornerstone intent decision with reviewed confidence is implemented. |
| Entity/topic extraction | PARTIAL | Research aggregation groups keywords/topics and entity ownership exists in generation validation, but no cornerstone entity/topic coverage contract exists. |
| Internal linking | PARTIAL | Product facts and Search Console/site-page relationships expose candidate pages. Cornerstone link selection, anchor validation and cannibalisation checks are not yet implemented. |
| Drafting | PARTIAL | Constrained Product-70 change generation is proven. A semantic cornerstone article profile, block contract and section-level regeneration are not implemented. |
| Evidence/source handling | COMPLETE | Canonical evidence IDs, provenance, raw/normalized separation, citation validation and immutable artifacts are implemented. Cornerstone drafts must reuse them. |
| Model routing | PARTIAL | GPT-5.6 Sol is proven for high-value interpretation and constrained generation; call controls and explicit pricing hooks exist. Cornerstone stage routing and a measured cheaper-model policy are not yet configured. |
| Quality validation | PARTIAL | Strong schema, citation, approval-scope and product-copy validators exist. Cornerstone-specific editorial structure, link, source, cannibalisation and usefulness checks remain. |
| Human approval | COMPLETE | Decision-level and generated-change approval boundaries plus runtime approval/contract separation are proven. Cornerstone artifacts need profiles, not a weaker boundary. |
| WordPress publishing | PARTIAL | Fixed Product-70 guarded mutation is production-proven. No cornerstone article field mapping or narrowly scoped publisher exists; v0.1.10 must not be broadened for it. A reviewed WordPress-ready draft package is the MVP handoff. |
| GA4 measurement | NOT STARTED | No GA4 provider or normalized analytics artifact exists in the repository. |
| Post-publication learning loop | PARTIAL | Search Console collection exists, but publication-linked observation windows, GA4 evidence and improvement decisions are not implemented. |

## Cornerstone MVP

The MVP produces one high-quality, human-approved WordPress-ready evergreen draft package. It does not auto-publish and does not require a general autonomous SEO platform.

1. Select one commercially relevant topic opportunity from cached Product Facts, Keyword Ideas, SERP and Search Console evidence.
2. Build a deterministic cornerstone research packet containing the evidence universe, site overlap, candidate internal links, SERP observations, questions and explicit evidence gaps.
3. If page-level competitor coverage is necessary, collect only a small explicit set of reviewed SERP URLs with provenance and access controls.
4. Use a high-capability model once to interpret intent, coverage gaps and content strategy into the strict brief contract.
5. Deterministically validate the brief, then obtain human approval of the topic, intent, scope, product relevance and link plan.
6. Generate a semantic structured draft from only the approved brief and cited evidence.
7. Validate structure, claims, usefulness, sources, links, brand constraints and cannibalisation; render a reviewable preview.
8. Obtain exact human content approval.
9. Produce a WordPress-ready draft package. A future narrow cornerstone publisher may create a draft only after its own field mapping, security review and one-time authorisation; automatic publication remains disabled.
10. After publication by an authorised process, record the URL/date and measure performance without autonomous rewriting.

Inputs are versioned Product Facts, brand rules, keyword evidence, SERP evidence, Search Console evidence, site-page inventory and any explicitly collected page-level sources. Outputs are a research packet, structured brief, approval, semantic draft, source map, deterministic validation report, rendered preview, WordPress-ready draft package and later measurement snapshots.

Human checkpoints occur after the brief and after the final candidate. Any later CMS mutation requires the separate write boundary; generation never inherits that authority.

## Cornerstone content brief contract

Only fields that change an editorial or commercial decision belong in the contract:

- `schema_version`, `brief_id`, `created_at` and exact `input_artifact_hashes`.
- `primary_topic` and `primary_query`.
- `search_intent`: dominant intent, secondary intent where material, evidence IDs, confidence and unresolved ambiguity.
- `target_reader` and `problem_to_solve`.
- `serp_observations`: result types, recurring coverage and observed formats, each tied to evidence.
- `competitor_coverage` and `coverage_gaps`: only what inspected evidence supports; unavailable page-level evidence remains explicitly unavailable.
- `supporting_queries`, `questions_to_answer` and `entities_concepts`, deduplicated with evidence references.
- `relevant_products`: only genuinely relevant Street Kingz products, why they help and supporting product-fact IDs.
- `internal_links`: destination, reader purpose, evidence for relevance and proposed anchor direction; not forced keyword insertion.
- `evidence_requirements`: claims needing first-party facts, authoritative external sources or explicit uncertainty.
- `title_h1_direction` and `proposed_structure`, expressed as intent/coverage guidance rather than generated article copy.
- `conversion_opportunity`: useful next step or product bridge, including when no commercial CTA is appropriate.
- `cannibalisation_risk`: overlapping site pages/queries, distinction strategy and confidence.
- `freshness_requirements`: facts that can age, source dates and review trigger.
- `confidence`, `limitations` and `human_review_state`.

The contract deliberately excludes decorative SEO scores, arbitrary word counts, keyword-density targets, invented persona detail and fields that do not alter a decision.

## Model and cost strategy

Use deterministic code for parsing, normalization, deduplication, hashing, schema checks, source resolution, link validation, diffing and repeatable classifications that have an evidence-backed rule. A cheaper model may handle a bounded low-risk classification only after fixture evaluation shows it is reliable; no such cornerstone routing policy is currently proven.

Reserve GPT-5.6 Sol or the then-approved high-capability model for SERP synthesis, ambiguous intent interpretation, information-gap analysis, content strategy, difficult source reconciliation and the final draft/revision where the quality gain justifies it. Keep calls bounded and pass compact research/brief artifacts rather than raw provider payloads.

The repository calculates model cost only from `OPENAI_INTERPRETATION_PRICING_JSON`. No trusted pricing table is currently recorded, so a dollar estimate per cornerstone piece is **unknown**, not zero. The latest controlled generation used 8,778 input and 4,916 output tokens (13,694 total), but its artifact also records `cost_usd: null`. A useful planning formula for a two-call MVP is:

`(brief_input_tokens + draft_input_tokens) / 1,000,000 * configured_input_rate + (brief_output_tokens + draft_output_tokens) / 1,000,000 * configured_output_rate`

DataForSEO costs remain separately metered by the existing request ceilings and provider artifacts; cache reuse can make a new brief run zero-request, but no fixed per-piece cost should be claimed until its query set is known. Search Console has no per-query project price recorded. Competitor-page retrieval and GA4 costs are likewise unpriced because those providers are not implemented here. Pricing must be refreshed explicitly before a budget is quoted.

## Measurement loop

Record the publication URL, canonical identifier, date, approved brief/draft hashes and relevant product/link targets. Use fixed comparison windows rather than daily ranking reactions:

- **7–14 days:** confirm discoverability/indexing signals and data availability; diagnose technical absence, not ranking quality.
- **28 days:** record early Search Console impressions, clicks, CTR, average position, query discovery and page/query distribution.
- **8–12 weeks:** make the first substantive performance decision using Search Console trends and, once implemented, GA4 landing sessions, engagement, product clicks, add-to-cart influence and conversion influence where attribution is defensible.
- **Quarterly or on a recorded freshness trigger:** review evergreen accuracy, unexpected queries, weak CTR, internal-link opportunities and cannibalisation.

The loop may recommend `keep`, `investigate`, `improve`, `consolidate` or `retire`. It must preserve evidence, require human review and create a new brief/draft/approval chain for any change. It must never autonomously rewrite or publish.

## Implemented milestone

The fixture-first deterministic cornerstone research-packet and brief builder is implemented in `cornerstone/`. It consumes existing Product Facts, Keyword Ideas, SERP, Search Console and research-state artifacts, validates every evidence reference, preserves missing competitor-page evidence as uncertainty, produces internal-link and cannibalisation candidates, and renders canonical JSON plus reviewable Markdown. `npm run cornerstone:fixture` builds the cached-evidence demonstration without paid or AI calls.

## Implemented strategy milestone

Controlled AI-assisted cornerstone strategy refinement is implemented. The model receives the bounded packet and packet-derived strict evidence, product and internal-link ID enums; canonical product/link metadata is resolved deterministically after validation. Calls are immutable and zero-retry, invalid output remains downstream-ineligible, and an accepted strategy remains awaiting human review with no drafting or publication authority.

## Implemented component-page architecture milestone

Street Kingz cornerstone and evergreen drafts are component-based ecommerce editorial pages, not unconstrained blog articles. The versioned `editorial/` contract separates semantic strategy, deterministic component selection, strict component data and eventual rendering. It supports hero, quick answer, rich text, takeaways, comparisons, criteria, image/text, product recommendations and comparisons, trade-offs, founder notes, FAQs, related guides, conclusions and calls to action; none is selected merely to fill a template.

Each proposed page has an explicit ordered sequence and stable component IDs. Required components and ordering rules belong to that individual plan/page-type policy; hero, quick answer and conclusion are required by the approved drying-towel decision page, not by every future category guide, how-to, comparison, glossary or support page. Each component has its own strict data schema and packet-derived evidence, product and internal-link boundaries. Product and link references use stable IDs whose canonical metadata is resolved outside the model. Media is expressed only as a requirement or missing placeholder; invented media URLs and arbitrary HTML are rejected. The semantic contract contains no WordPress or Elementor instructions, and rendering remains a separate future stage.

The deterministic page-plan builder chooses only components justified by the accepted strategy and available evidence, records why each exists, and leaves drafting and publication authority false. The first drying-towel plan and a structurally different non-towel fixture prove omission and zero/one/multiple-product support without Product-70, template-2003 or towel-specific contracts.

## Next implementation milestone

The first component plan is approved. Complete **one controlled structured drafting call** that may populate only the approved component IDs and types from bounded evidence. The first authorised attempt failed closed at the provider boundary with HTTP 429, produced no draft and was not retried. A further call must be separately authorised; it still cannot add products, links, component types, arbitrary HTML, rendering instructions or publication authority.
