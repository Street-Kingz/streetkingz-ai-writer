# V1-05 Slice B intent taxonomy contract v5

Status: generic contract hardened; zero OpenAI calls in this task.

## Decision

Instructions-4 enumerated ten intent values but supplied no generic definitions
or tie-breaking rules. The taxonomy review therefore classified all ten as
NAME_ONLY and recommended generic contract hardening before revalidation.

Instructions-5 now defines the existing ten values and their boundaries without
benchmark examples, case IDs, expected answers, or model-specific tuning.

The single Product-owned source is `INTENT_CLASS_DEFINITIONS` and
`buildInterpretationSystemPrompt()` in `product-kernel/candidateEvaluation.js`.
Both `buildInterpretationRequest()` and `evaluateCandidates()` use that source.
No deterministic intent classifier was added.

## Generic contract

- `product_selection`: choose, assess, or identify a specific product/item;
  comparison is not the central job.
- `category_selection`: choose or identify a product category, type, family, or
  class rather than one specific item.
- `comparison_selection`: explicitly compare, differentiate, or weigh
  alternatives/trade-offs to select; comparison is materially central.
- `informational`: obtain specific factual, explanatory, instructional, or
  knowledge-oriented information about one bounded topic.
- `mixed_intent`: multiple materially distinct user jobs are supported and no
  one class represents the whole need; low confidence alone is not mixed.
- `brand_navigation`: reach a named brand, official brand presence, or
  brand-owned destination.
- `navigation_discovery`: discover a generic page, resource, destination, or
  route rather than select or primarily learn.
- `broad_information`: broad exploratory information that cannot be reduced to
  one bounded information or product/category-selection job.
- `uncertain`: the primary intent family itself cannot be resolved from bounded
  evidence.
- `uncertain_selection`: the selection/evaluation family is supported, but its
  product/category/comparison subtype cannot be resolved reliably.

Boundaries explicitly distinguish mixed intent from uncertainty, uncertain from
uncertain selection, product from category selection, comparison from ordinary
selection, bounded from broad information, and named-brand navigation from
generic discovery.

## Frozen-contract preservation

Unchanged: taxonomy values, v6 target-attribution schema, normalizer, validator,
Slice A discovery, deterministic filtering, fixtures, corpus, expectations,
discovery matches, thresholds, commercial controls, provider/model selection,
and database schema. Migration count remains 36. No benchmark-specific examples
were added and no labels or hashes changed.

`INSTRUCTION_VERSION` is now `v1-05-slice-b-instructions-5`; it participates in
batch/cache identity, so instructions-4 paid results are not reusable for the
new contract. Product and benchmark versions remain v6 (`v1-05-slice-b-6` and
`v1-05-interpretation-6`).

## Validation

Static contract coverage: 10 explicitly defined, 0 partial, 0 name-only,
0 undefined. Frozen corpus expected classes all map to one definition. The
important pairwise distinctions are present in the authoritative prompt, and
the prompt contains no benchmark IDs or fixture-derived examples.

Commercial controls remain 11/11: 10 candidate-level and 1 run-level, with
0 N/A. Existing provider-profile regressions preserve gpt-4o-mini temperature
0.1 with no reasoning effort and Sol medium with strict Structured Outputs,
reasoning effort medium, and no temperature.

The intended future session is
`slice-b-v6-sol-medium-intent5-001`; no paid ledger was created and no collision
was found. The historical instructions-4 Sol session and all other paid
sessions remain preserved and are not reused.

Non-live revalidation is PASS: focused Slice B/harness tests pass, preview is
provider-free with 38 formal cases, 1 smoke, 39 base, 40 maximum, commercial
controls 11/11, and projected hard-40 cost `$4.0867` using the configured
conservative estimator. Full npm passes with 1,177 passed, 0 failed, and 21
existing skips. Secret scan and diff check pass.

Fresh live authorization is required before Sol medium revalidation. Slice B is
not yet accepted. Slice C remains not authorised.
