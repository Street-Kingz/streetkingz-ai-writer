# V1-05 Slice B — Intent Architecture Review

Status: ANALYSIS COMPLETE — NEXT DESIGN DECISION REQUIRED

## Scope and evidence

No provider calls were made. Historical paid evidence was preserved, including
the instructions-5 Sol session at 40 requests, 37/38 completed formal cases,
and calculated cost `$1.342008`. No paid session was resumed or modified.

The current harness contains the retry correction: `formal_retry_cap: 1` and
`formal_retry_count` are durable, the first formal retry is persisted before
network access, later retries fail closed, and smoke retries remain forbidden.
The correction passed focused tests.

## Current intent consumers

`product-kernel/candidateEvaluation.js` owns the model-output enum, system
instruction, normalization, validation, and overlap grouping. The live Slice B
harness uses `intent_class` for scoring and quality gates. The decision-run
route reads it in the bounded evaluation projection, and the database migration
persists it. Tests and validation artefacts use it for scoring/regression.
No current downstream recommendation or intervention branch was found that
switches Product behaviour solely on the ten-way label. Intent is primarily an
interpretation, persistence, scoring, and quality-gate field today. Separate
fields already represent `customer_job`, relevance, target attribution, page
fit, new-asset fit, disposition, reasons, and limitations.

## Flat-axis assessment

The labels mix several concepts rather than one axis:

| Labels | Concept |
|---|---|
| product/category/comparison selection | selection family plus scope or decision mode |
| informational/broad information | information family plus breadth |
| brand/navigation discovery | navigation family plus destination |
| mixed intent | multiplicity across jobs |
| uncertain/uncertain selection | family or subtype resolution fallback |

Classification: `STRONGLY_MIXED_AXES`. The flat output is an implicitly
hierarchical classification encoded as ten mutually exclusive labels.

## Pairwise overlap and anchoring

Product-selection and category-selection can each overlap with comparison;
comparison is a decision mode whose centrality is resolved by a tie-break.
Product/category/comparison selection can each overlap with uncertain-selection
until subtype resolution is applied. Informational and broad-information are
scope levels, while informational and mixed-intent can both describe a job when
multiple jobs coexist. Brand-navigation and navigation-discovery are exclusive
only after the named-brand destination tie-break. Mixed-intent is a
multiplicity dimension that can coexist with any underlying family.

Four highlighted overlap families are naturally dimensional rather than
exclusive by nature: selection scope × comparison mode, information scope,
information × multiplicity, and mixedness × any underlying family. The other
boundaries require explicit tie-break or fallback rules.

On the 37 matched Sol instructions-5 cases, candidate-type → actual-intent
counts were:

- existing product improvement (11): product 5, category 6;
- existing category improvement (7): product 1, category 6;
- existing content improvement (9): informational 5, product 1,
  uncertain-selection 1, brand-navigation 2;
- new page/content asset (7): informational 2, category 3, comparison 2;
- internal linking (3): uncertain 1, navigation-discovery 1, product 1.

Expected distributions for those same candidate types were respectively:
product 8/comparison 1/uncertain-selection 1/category 1; category
6/informational 1; informational 3/mixed 3/brand 2/comparison 1;
informational 2/mixed 1/category 1/broad-information 2/product 1; and
navigation-discovery 3. This shows measurable candidate-type attraction,
especially toward category for product-target interventions and away from
navigation for internal linking. Instructions-5 improved target agreement but
did not strengthen intent robustness uniformly.

The packet distinguishes the user job from candidate/target metadata, but the
presence of intervention type and target context leaves residual anchoring risk.

## Partial live comparison

The seven Sol instructions-4-correct / instructions-5-wrong cases were:

| Case | Transition | Safe pattern |
|---|---|---|
| 002, 003, 026 | product → category | target/scope attraction |
| 004 | category → product | target/scope attraction |
| 011 | mixed → informational | away from multiplicity |
| 014 | navigation-discovery → uncertain | toward uncertainty |
| 018 | mixed → product | toward selection |

All seven retained target agreement; page and disposition results were mixed.
The one instructions-4-wrong / instructions-5-correct case, 028, moved to the
expected category label and also matched target, page, and disposition. One
case does not establish whether this was understanding or attraction.

Both-wrong same-intent cases (7) clustered around comparison, mixedness, broad
information, and uncertainty. Both-wrong different-intent cases (6) spanned
selection, information, navigation, and resolution.

Matched 37-case metrics were: mini instructions-4 intent 22/37; Sol
instructions-4 intent 23/37; Sol instructions-5 intent 17/37. Sol instructions-5
target agreement was 36/37 versus 35/37; page fit 29/37 versus 30/37; and
disposition 24/37 versus 25/37. Thus the instructions-5 effect is `MIXED`, with
target improvement but a large intent regression.

## Minimum hierarchical option

The smallest coherent provider representation is:

```text
family: selection | information | navigation | mixed | uncertain
selection_subtype: product | category | comparison | uncertain
information_scope: bounded | broad
navigation_destination: brand | discovery
```

Legacy mapping is deterministic: selection/product, category, comparison, and
uncertain map to product_selection, category_selection,
comparison_selection, and uncertain_selection; information/bounded and broad
map to informational and broad_information; navigation/brand and discovery
map to brand_navigation and navigation_discovery; mixed maps to mixed_intent;
uncertain maps to uncertain.

Every existing label maps exactly one way to one branch and maps back without
loss. The same 38 labels and 85% threshold can remain unchanged if a single
provider-to-internal boundary normalizes the hierarchy to legacy
`intent_class`. The existing database field can remain initially; no migration
is required for a provider-only experiment.

Uncertainty is best represented as a combination: `uncertain` is a family-level
fallback and `uncertain_selection` is a selection-subtype fallback, while the
existing confidence field remains separate. Mixed intent is retained as a peer
branch for compatibility even though it denotes multiplicity. Comparison is a
selection subtype because the governed meaning makes comparison central to
choosing.

A future strict nested Structured Output with branch-specific objects and
`anyOf` could prevent incompatible combinations, analogous to v6 target
attribution. This is a design option only; the schema was not changed.

## Root cause and recommendation

The dominant classification is `MIXED_MODEL_AND_INTENT_ARCHITECTURE`: benchmark
and scorer integrity are intact, candidate-type attraction is measurable, the
instructions-5 change regressed intent while improving target agreement, and
the flat label hides multiple sub-decisions. This is not sufficient evidence to
call the issue model capability alone.

Recommended next experiment: `HIERARCHICAL_INTENT_PROVIDER_CONTRACT`, holding
model, Product input, instructions except the representation boundary,
benchmark, labels, and thresholds constant, with normalization back to
`intent_class`. Sol-high is not recommended now because it changes model and
reasoning variables before the architecture question is isolated.

No Product, prompt, schema, taxonomy, benchmark, fixture, expectation,
threshold, migration, or semantic change was made. Slice B remains unaccepted;
Slice C remains unauthorised. A fresh paid experiment requires separate owner
authorization.
