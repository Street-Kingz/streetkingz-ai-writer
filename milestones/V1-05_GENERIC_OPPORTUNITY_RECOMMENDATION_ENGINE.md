# V1-05 — Generic Opportunity and Recommendation Engine

**Status: APPROVED — SLICE B ACTIVE**

**Implementation authorised:** SLICE B ONLY — OWNER AUTHORISED

## Authority and objective

This proposal is governed by `PRODUCT_VISION.md`, `PRODUCT_SCOPE.md`,
`DEFINITION_OF_DONE.md`, `ROADMAP.md`, `DECISIONS.md` and the accepted V1-04
evidence boundary. Its objective is to turn connected business and organic
evidence into generic, prioritised and explainable recommendations that do not
default to article creation.

The customer capability is a portable decision layer: evidence-backed
opportunities are discovered, filtered, interpreted, relatively prioritised and
projected as recommendations or explicit no-action/insufficient-evidence
states. It is not an analytics dashboard, article writer, generic SEO audit,
execution engine or keyword database.

## Dependencies and evidence boundary

V1-05 depends on accepted V1-02 tenant ownership, V1-03 current-generation
commerce truth and V1-04 `GET /api/product/organic-evidence/snapshot`. It reads
the snapshot and typed durable evidence in place; it does not copy those
datasets into a generic warehouse or expand acquisition.

Inputs remain source-specific: current commerce product/category/generation and
trustworthy commercial facts; site current/LKG page truth; Search Console
query/page metrics and provider limitations; and DataForSEO Keyword Ideas/SERP
observations with direct-seed lineage, locale, freshness and limitations.
Missing data remains unknown. Connection state remains distinct from evidence
state.

## Candidate contract

A candidate is a potential in-scope opportunity, not a recommendation. The
proposed typed record contains:

`candidate_id`, `business_id`, `candidate_type`, `target_resources`,
`target_resource_type`, `discovery_sources`, `evidence_refs`,
`direct_derived_relationships`, `market`, `language`, `freshness_state`,
`completeness`, `limitations`, `overlap_group_id`, `candidate_status`,
`rejection_reason_codes`, `snapshot_id`, `candidate_version`, `evaluated_at`.

Candidate types are `existing_product_improvement`,
`existing_category_improvement`, `existing_content_improvement`,
`new_page_or_content_asset` and `internal_linking`. A bounded technical or
indexability blocker is supporting/dependency metadata (`blocking_condition`),
not a generic technical candidate family. Candidate lifecycle is
`discovered`, `eligible`, `rejected` or `interpreted`; rejection reason codes
are retained.

## Discovery and deterministic filtering

Discovery is bounded across products, categories, existing pages, Search
Console visibility, external demand, site structure and already-retained SERP
evidence. It begins from the evidence universe, not from an article request.
Deterministic preparation handles exact/normalized duplicates, canonical target
duplicates, same-page duplicates, invalid or unavailable targets, wrong market,
obvious navigational/brand-only cases, product mismatch, malformed evidence and
explicit source limitations. Rejections retain reason codes.

Filtering ends when a case requires customer-job, mixed-intent, feasibility,
commercial, dependency or intervention judgement. Missing evidence is not a
hard rejection unless the missing fact makes the proposed action unverifiable;
the reason is retained.

Overlap groups collapse lexical duplicates, same-target jobs and competing new
pages. Query overlap does not permit naive volume addition. Existing-page
improvement is preferred over an unnecessary new page only when evidence shows
the existing page is the relevant target; otherwise the uncertainty is
preserved. Internal linking is a dependency/supporting candidate, not a second
copy of the parent recommendation.

## Interpretation and commercial reasoning

SERP and page evidence may indicate product, category, comparison/selection,
informational or mixed intent. Mixed or uncertain intent remains explicit.
Interpretation may select an existing product/category/content improvement, a
new appropriate asset, internal linking, monitor/defer, do nothing or
insufficient evidence; it never forces a page type.

Permitted commercial context includes product/category relationships, sales,
revenue, price, trustworthy COGS/margin, stock availability and explicit
Business constraints. Missing values remain missing; stock is a constraint,
not a priority multiplier. Low demand cannot alone reject credible commercial
value, and high demand cannot make irrelevant work valuable. No precise revenue
uplift or transferred paid-traffic conversion assumption is allowed.

Direct commercial value is kept separate from strategic supporting value such as
internal-link support, prerequisite architecture, consolidation or dependency
resolution.

Feasibility is a source-grounded qualitative/probabilistic judgement using page
fit, visibility, SERP makeup, content fit and available competitive proxies. It
must explain uncertainty and cannot predict a rank or guaranteed outcome.
Dependencies are explicit; a blocker or prerequisite may change sequencing even
when another candidate looks locally attractive.

## Prioritisation and outcomes

The proposed method is an inspectable factor vector plus a bounded tier, not an
opaque universal SEO score. Each factor is rated `strong`, `moderate`, `weak`,
or `unknown`, with evidence and rationale: organic relevance, job fit, target
fit, direct commercial value, strategic supporting value, feasibility,
dependency/sequence, evidence coverage and action worthiness. A qualitative
relative-priority tier (`now`, `next`, `monitor`, `defer`, `no_action`) may be
overridden only by an explicit dependency or evidence limitation. No factor
becomes zero because it is unavailable; no value predicts revenue.

No-action and insufficient-evidence are decision-run outcomes, not candidate
types or recommendations. A run outcome is `recommendations`, `no_action` or
`insufficient_evidence` and preserves snapshot identity, considered count,
rejection reasons, limitations, rationale and reassessment condition. Neither
outcome is an error or a hidden recommendation.

## Recommendation record and projection

A recommendation is a candidate that survives the deterministic and
interpretive gates. The proposed durable record contains:

`recommendation_id`, `business_id`, `decision_run_id`, `candidate_id`,
`snapshot_id`, `what_was_found`, `target_resources`, `why_it_matters`, `why_now`,
`intervention`, `evidence_refs`, `confidence`, `missing_evidence`,
`assumptions`, `intended_outcome`, `dependencies`, `limitations`,
`what_could_make_it_wrong`, `reassess_when`, `status`, `version` and
`supersedes_id`.

Statuses support `current`, `deferred`, `superseded`, `withdrawn` and
`needs_reassessment`. No recommendation record is created for a no-action or
insufficient-evidence run. History is never erased.
The customer-neutral projection uses plain language and exposes evidence
references, confidence and limitations without raw provider dumps, internal
factor machinery, paid offers, executor selection, generated assets or
deployment instructions.

## Model boundary

Deterministic evidence preparation and hard filtering precede any model call.
A model may interpret a bounded evidence packet and propose schema-conforming
candidate dispositions, intent, feasibility and rationale. It may not invent
evidence, search volume, commercial facts, keywords, targets or Business
identity, and may not bypass filters.

All post-filter candidates receive interpretation. Calls are batched at no more
than 10 candidates, with at most 5 interpretation calls and 1 final synthesis
call (6 planned calls total). A single additional model request for the entire
run is permitted only for transport/schema failure. The decision deadline is
180 seconds. Interpretation output is capped at 4,000 tokens per call, final
synthesis at 5,000 and total output at 25,000. Inputs include snapshot
identity, typed evidence references, source limitations, candidate records and
the versioned instruction. Outputs require valid schema and references;
malformed or unavailable model output fails the run safely. O-004 funding
remains deferred.

## Security, tenancy, durability and bounds

Every candidate/recommendation is Business-owned. Customer reads are
authenticated and tenant-scoped; writes are service-only where appropriate;
RLS is mandatory; credentials and unnecessary licensed raw evidence are never
stored in the output. Proposed bounds are: 200 candidates per Business run, 50
after deterministic filtering, 50 interpretive candidates, 5 recommendations,
6 planned model calls, 180 seconds total, one run-wide retry, and a 2 MB
decision packet. Each candidate has at most 40 evidence references and 2,000
bounded text characters; interpretation batches have at most 10 candidates.
Interpretation output is capped at 4,000 tokens per call, synthesis at 5,000 and
the run at 25,000 total. Before Slice A implementation, the separately governed
bounded V1 security-hardening gate must pass: rate limiting, legacy paid/AI
route review, debug-route mounting, CORS, RLS/grant assertions, redacted
logging, request validation and secret scanning.

A durable decision run is proposed with snapshot identity, run identity,
candidate/evaluation version, instruction/model version, deterministic input
hash and recommendation version. An identical current run is reused rather than
duplicated; changed snapshot or explicit future reassessment creates a new run.
Reassessment changes status or supersedes a record without deleting history.
Recurring automation and customer interaction remain out of scope.

## Evaluation and acceptance

The normative proposed evaluation is in
`artifacts/planning/v1-05/evaluation-design.md` and the actual manifest is in
`artifacts/planning/v1-05/evaluation-corpus.md`. It specifies 48 stable cases,
at least 90% discovery recall with zero high-impact misses, FP ≤10%, FN ≤5%,
85% intent/intervention correctness with zero high-impact errors, zero hard
requirement violations, five-point usefulness with mean ≥4.0 and no dimension
below 3.5, exactly 12 reliability cases repeated five times (60 runs), and a
12-case commercial challenger. It includes sparse/rich evidence, failure
classes, no-action and insufficient-evidence.

The machine-readable manifest and input fixtures are immutable evaluation
inputs: `artifacts/planning/v1-05/evaluation-corpus.json` contains the proposed
labels and SHA-256 references to the sanitized fixture collection in
`artifacts/planning/v1-05/fixtures/evaluation-inputs.jsonl`. The evaluation
runner must provide only the input packet to Product code; ground-truth labels
are comparison-only harness data and must never be imported into runtime.
Actionable dispositions are `improve_existing_product`,
`improve_existing_category`, `improve_existing_content`, `create_new_asset`,
`improve_internal_linking` or `monitor_or_defer`; run outcomes remain separate.
The six planned model calls comprise five interpretation calls and one final
synthesis call. At most seven total request attempts are allowed, including one
run-wide transport/schema retry; the retry shares the 180-second deadline and
25,000-token total output budget.

Formal evaluation begins from these V1-04-shaped source facts. Derived
interpretation labels, candidate labels, expected outcomes, commercial-effect
labels and other answer-key features are prohibited from Product inputs;
candidate discovery itself is evaluated. Runtime receives only `input_packet`
from a fixture wrapper. For commercial challenger pairs, the control packet is
the deterministic projection of the same packet with approved commercial
fields removed; products, targets, site/search evidence and SERP evidence are
otherwise unchanged. Ground-truth labels are harness-only and must never be
imported by Product runtime modules.

The planning-only corpus validator is
`artifacts/planning/v1-05/validate-corpus-v2.cjs`; it is evaluation tooling only
and is not a Product runtime dependency.

Street Kingz validation uses one frozen accepted V1-04 snapshot, no founder
hints and no network calls. Independent stores and the full V1-07 competitor
gauntlet are not V1-05 requirements.

## Proposed slices

Pre-implementation gate: the security-hardening gate and this contract/corpus
must be accepted. Then:

1. Candidate contract and deterministic discovery against the already frozen
   corpus.
2. Deduplication, overlap, filtering, target attribution and intent/page type.
3. Commercial relevance, strategic value, feasibility, dependencies and
   relative prioritisation.
4. Intervention selection, recommendation record, plain-language projection,
   no-action and insufficient-evidence.
5. Full evaluation, reliability, frozen Street Kingz validation and closeout.

Each slice requires its own unit, integration, tenant/security, malformed-input
and evaluation gates before the next slice is authorised. Only one slice may be
active.

## Explicit non-goals and completion condition

No article default, content generation, WordPress/WooCommerce writing, paid
execution, V1-06 UI, generic crawler, backlink/rank tracker, provider expansion,
competitor crawling, universal keyword database, revenue forecast, opaque SEO
grade, or V1-05 implementation is authorised by this proposal.

Critical risks are evidence leakage, unsupported inference, false-negative
filtering and commercial weighting becoming an opaque score. High risks are
model instability, stale/mixed snapshots, overlap duplication and cost growth.
Implementation may be authorised only after owner acceptance of this contract,
the labelled corpus, thresholds and slice gates; completion requires all hard
requirements, evaluation thresholds, reliability limits, tenant/security tests
and frozen Street Kingz validation to pass with Critical 0 and High 0.
