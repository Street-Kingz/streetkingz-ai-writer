# V1-05 Slice B intent taxonomy contract review

## Scope and paid-session preservation

This is a zero-call review of the preserved sanitized caches. The Sol ledger
was unchanged at 39 requests before and after analysis: 1 smoke, 38 formal,
USD 1.186308 calculated. No ledger, cache, Product code, prompt, fixture,
label, expectation, threshold, schema, or commercial-control file was changed.

Historical sessions remain separate: v5 gpt-4o-mini contract failure (9
requests, USD 0.0035226), v6 gpt-4o-mini quality failure (39 requests, USD
0.0191604), and v6 Sol medium quality failure (39 requests, USD 1.186308).

## Actual model-facing intent contract

Both live models received the same Slice B instruction. Its intent clause is a
closed list only:

> Classify intent as product_selection, category_selection,
> comparison_selection, informational, mixed_intent, brand_navigation,
> navigation_discovery, broad_information, uncertain, or uncertain_selection.

The nearby sentence says to use `relevant`, `irrelevant`, or `uncertain` based on
Business-job evidence. That sentence defines the `relevance_state` field, not a
generic definition of the `intent_class` value `uncertain`.

| Intent class | Current model-facing definition | Coverage |
|---|---|---|
| product_selection | Listed by name only | NAME_ONLY |
| category_selection | Listed by name only | NAME_ONLY |
| comparison_selection | Listed by name only | NAME_ONLY |
| informational | Listed by name only | NAME_ONLY |
| mixed_intent | Listed by name only | NAME_ONLY |
| brand_navigation | Listed by name only | NAME_ONLY |
| navigation_discovery | Listed by name only | NAME_ONLY |
| broad_information | Listed by name only | NAME_ONLY |
| uncertain | Listed by name only as an intent; “uncertain” nearby defines relevance | NAME_ONLY |
| uncertain_selection | Listed by name only | NAME_ONLY |

Totals: explicitly defined 0, partially defined 0, name-only 10, undefined 0.
The classes are syntactically enumerated but their semantic boundaries are not
communicated in the model-facing contract.

## Pairwise distinguishability

| Pair | Finding |
|---|---|
| informational vs broad_information | NOT_DISTINGUISHABLE_FROM_CURRENT_INSTRUCTION |
| informational vs mixed_intent | NOT_DISTINGUISHABLE_FROM_CURRENT_INSTRUCTION |
| mixed_intent vs uncertain | NOT_DISTINGUISHABLE_FROM_CURRENT_INSTRUCTION |
| uncertain vs uncertain_selection | NOT_DISTINGUISHABLE_FROM_CURRENT_INSTRUCTION |
| product_selection vs comparison_selection | NOT_DISTINGUISHABLE_FROM_CURRENT_INSTRUCTION |
| product_selection vs uncertain_selection | NOT_DISTINGUISHABLE_FROM_CURRENT_INSTRUCTION |
| brand_navigation vs navigation_discovery | NOT_DISTINGUISHABLE_FROM_CURRENT_INSTRUCTION |
| category_selection vs product_selection | NOT_DISTINGUISHABLE_FROM_CURRENT_INSTRUCTION |

No failed case was used to manufacture a definition. These findings follow from
the exact instruction containing class names without decision rules.

## Taxonomy completeness and frozen benchmark mapping

The taxonomy has labels corresponding to single-product selection,
category-level selection, comparison/evaluation, pure information seeking,
mixed intent, brand/site navigation, generic navigation/discovery, broad
information, insufficiently resolvable intent, and uncertain selection. The
semantic coverage is therefore broad, but the hierarchy and exclusivity rules
are incomplete: informational/broad_information, mixed/uncertain, and
uncertain/uncertain_selection are near-neighbour pairs without generic
boundaries; brand_navigation/navigation_discovery and
product_selection/comparison_selection also lack separating rules.

The frozen corpus has 48 cases. Expected intent counts across the corpus and
the 38 interpretation-applicable subset are:

| Expected intent | Corpus | Applicable |
|---|---:|---:|
| product_selection | 12 | 9 |
| category_selection | 9 | 8 |
| informational | 6 | 6 |
| comparison_selection | 3 | 3 |
| mixed_intent | 4 | 4 |
| navigation_discovery | 3 | 3 |
| uncertain_selection | 1 | 1 |
| uncertain | 6 | 0 |
| brand_navigation | 2 | 2 |
| broad_information | 2 | 2 |

The frozen documents provide case-level owner labels and rationales, and the
evaluation design says mixed/uncertain labels count only when uncertainty is
preserved. They do not provide one complete generic intent glossary that is
also present in the model instruction. Examples of frozen meanings not stated
to the model are: comparison/selection as distinct from ordinary product
selection; mixed intent requiring preservation of multiple jobs; uncertain
selection as a selection context whose timing/evidence does not justify a firm
choice; broad information as a broad non-commercial information request; and
brand navigation as distinct from generic discovery.

Thus benchmark truth remains valid evaluation truth, but not every scorer
distinction is adequately represented in the model-facing instruction.

## Per-class live comparison

| Expected intent | Cases | Mini correct | Mini accuracy | Sol correct | Sol accuracy |
|---|---:|---:|---:|---:|---:|
| product_selection | 9 | 8 | 88.89% | 6 | 66.67% |
| category_selection | 8 | 6 | 75.00% | 7 | 87.50% |
| informational | 6 | 4 | 66.67% | 4 | 66.67% |
| comparison_selection | 3 | 0 | 0.00% | 0 | 0.00% |
| mixed_intent | 4 | 0 | 0.00% | 2 | 50.00% |
| navigation_discovery | 3 | 3 | 100.00% | 2 | 66.67% |
| uncertain_selection | 1 | 0 | 0.00% | 0 | 0.00% |
| brand_navigation | 2 | 1 | 50.00% | 2 | 100.00% |
| broad_information | 2 | 0 | 0.00% | 0 | 0.00% |

Both models repeatedly miss comparison_selection (0/3 each), broad_information
(0/2 each), and uncertain_selection (0/1 each). These small classes are
diagnostic, not threshold changes.

## Cross-model error correlation

| Relationship | Count | Cases |
|---|---:|---|
| BOTH_CORRECT | 18 | 001,002,003,004,005,006,007,009,010,014,015,020,026,032,039,040,044,045 |
| MINI_WRONG_SOL_CORRECT | 5 | 011,013,018,034,036 |
| MINI_CORRECT_SOL_WRONG | 4 | 016,025,028,029 |
| BOTH_WRONG_SAME_INTENT | 5 | 008,017,019,027,043 |
| BOTH_WRONG_DIFFERENT_INTENT | 6 | 012,030,041,042,046,048 |

The five same-wrong cases are: comparison_selection→product_selection (008),
uncertain_selection→product_selection (017), informational→category_selection
(019), mixed_intent→informational (027), and comparison_selection→informational
(043). All correspond to pairings that are not distinguishable from the
current instruction. The six both-wrong/different cases show that model
capability also contributes; the errors are not wholly explained by one
deterministic scorer defect.

## Mixed/uncertain review

The model instruction explicitly names `mixed_intent`, `uncertain`, and
`uncertain_selection`, but gives no intent definitions. Its only “uncertain when
evidence is insufficient” wording applies to relevance state. Frozen governance
uses mixed intent for multiple unresolved jobs, uncertain for insufficiently
resolvable intent, and uncertain selection for a selection-shaped opportunity
that should not be committed to yet. Those meanings are not mutually explicit
in the current model contract, and the model is not given the distinction.

Both models make related mistakes: the incumbent misses all four mixed-intent
cases and the Sol model gets 2/4; Sol still misses the single uncertain-selection
case, while the incumbent also confuses it with product selection. The mixed /
uncertain preservation gate therefore remains a contract-sensitive failure,
though the Sol improvement shows genuine model contribution as well.

## Intent versus downstream reasoning

Among Sol’s 15 intent mismatches:

- 13 also had correct target attribution;
- 11 also had correct page fit;
- 10 also had correct disposition;
- 7 had all three major downstream dimensions correct.

This means several intent disagreements are disconnected from target/page/
disposition reasoning, supporting taxonomy/name-boundary ambiguity as part of the
cause. The remaining cases with downstream errors show that model reasoning is
also imperfect.

## High-impact intent review

| Case | Expected → actual intent | Target | Page | Disposition | Relevance | Generic distinction clear? |
|---|---|---|---|---|---|---|
|041|broad_information → comparison_selection|fail|pass|pass|irrelevant|No |
|043|comparison_selection → informational|pass|fail|pass|relevant|No |
|048|comparison_selection → uncertain_selection|fail|pass|pass|relevant|No |

All three high-impact intent errors involve distinctions that are not defined in
the current generic instruction. This is a contract-adequacy issue, not a
benchmark-label change.

## Integrity and model-contract results

Both caches contain 38 matching completed cases with correct session/SHA/model
and benchmark identity. No duplicate or missing primary result, stale cache,
malformed normalized v6 output, or scorer/cache integrity issue was found. The
v6 target-attribution structural contract succeeded across the Sol result set:
no established-empty pairing, no unresolved-nonempty pairing, and no
`INVALID_TARGET_INVARIANT` runtime failure.

Sol materially improved target agreement from 63.16% to 92.11%, page fit from
78.95% to 81.58%, disposition from 65.79% to 68.42%, and reduced high-impact
target errors from 3 to 2. It improved three of the four previously failed
non-commercial gates, while intent rose only from 22/38 to 23/38 and mixed /
uncertain preservation remained false.

Assessment of the 85% intent gate under the current contract: **NO**. The gate
is valid as a governance target, but it is not a clean model-capability test
when the scorer requires distinctions that the model was only given as names.

Root cause: **MIXED_MODEL_AND_CONTRACT_FAILURE**. Correlated same-wrong errors
and the absent generic definitions establish contract underspecification; the
Sol-vs-mini changes, residual downstream errors, and different wrong answers
establish a model-capability component. Benchmark/scorer integrity is clean.

## Recommended next experiment

**C — GENERIC_INTENT_CONTRACT_HARDENING_THEN_REVALIDATE**.

Future generic contract work should define, without benchmark examples or case
IDs:

- product selection as choosing among existing product-level targets;
- category selection as choosing among category-level targets;
- comparison selection as explicit evaluation of alternatives or trade-offs;
- informational as a single primarily knowledge-seeking job;
- mixed intent when materially distinct jobs coexist and uncertainty must be
  preserved;
- uncertain when the intent cannot be resolved from bounded evidence;
- uncertain selection when selection is plausible but evidence/timing does not
  justify a firm selection;
- brand navigation as reaching a named brand/site versus generic navigation or
  discovery; and
- broad information as broad non-commercial information not reducible to a
  product/category selection job.

This review does not implement those changes, tune prompts, change labels, or
authorize another paid run.
