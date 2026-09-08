# V1-05 Slice B v6 gpt-4o-mini quality analysis

## Scope and session integrity

This is a zero-call forensic analysis of the completed sanitized session
`slice-b-v6-acceptance-001`. No ledger, cache, fixture, label, expectation, or
Product file was changed.

| Field | Verified value |
|---|---|
| Acceptance SHA | `12ed8dff9dacd67dbc3a07dcd865275ddb892ade` |
| Provider/model | OpenAI / `gpt-4o-mini` |
| Smoke/formal/total requests | 1 / 38 / 39 |
| Input/output tokens | 81,332 / 11,601 |
| Cost/status | USD 0.0191604 / `calculated_from_explicit_configuration` |
| Formal completion | 38/38; all complete cases have matching cache results |
| Provider failures / unknown outcomes / bound failures / harness failures | 0 / 0 / 0 / 0 |

The prior v5 session remains separate historical evidence: 9 requests and USD
0.0035226, acceptance SHA `830b21ec...`.

## Recomputed score

The score was recomputed from the 38 cache wrappers, frozen expectations, and
corpus. It matches the live summary exactly:

| Metric | Recomputed |
|---|---:|
| Intent applicable | 38 |
| Intent correct | 22 |
| Intent accuracy | 57.89% |
| High-impact intent errors | 3 |
| High-impact target errors | 3 |
| Interpretive disposition agreement | 25/38 = 65.79% |
| Target attribution agreement | 24/38 = 63.16% |
| Page-type-fit agreement | 30/38 = 78.95% |

Required gates: `mixed_uncertain_preservation=false`, `brand_navigation=false`,
`wrong_page_type=false`, `high_volume_irrelevant=false`,
`low_volume_preservation=true`, and `commercial_invariance=true`.

## 38-case sanitized mismatch matrix

`R` in the relevance columns means relevant, `U` uncertain; `—` means no
separate expected relevance field is governed for that case. Target counts are
counts only; no target text or evidence is included.

| Case | Primary class / type | Prov. / maturity / HI | Intent expected → actual | Target state expected → actual (refs) | Disposition expected → actual | Page expected → actual | Relevance expected → actual |
|---|---|---|---|---|---|---|---|
|001|existing_product_improvement / existing_product_improvement|real / rich / Y|product_selection → product_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|002|existing_product_improvement / existing_product_improvement|real / sparse / N|product_selection → product_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|003|existing_product_improvement / existing_product_improvement|historical / rich / N|product_selection → product_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|004|existing_category_improvement / existing_category_improvement|synthetic / sparse / N|category_selection → category_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|005|existing_category_improvement / existing_category_improvement|real / rich / Y|category_selection → category_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|006|existing_content_improvement / existing_content_improvement|synthetic / sparse / N|informational → informational|established → established (1→1)|retain → retain|aligned → aligned|— → R|
|007|existing_content_improvement / existing_content_improvement|real / rich / N|informational → informational|established → unresolved (1→0)|retain → reject_overlap_redundant|aligned → aligned|— → R|
|008|existing_product_improvement / existing_product_improvement|real / rich / N|comparison_selection → product_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|009|existing_category_improvement / existing_category_improvement|synthetic / sparse / N|category_selection → category_selection|established → unresolved (2→0)|retain → retain|aligned → aligned|— → R|
|010|existing_content_improvement / new_page_or_content_asset|real / rich / Y|informational → informational|established → unresolved (1→0)|retain → retain|aligned → aligned|— → R|
|011|monitor_defer_outcome / new_page_or_content_asset|synthetic / mixed / N|mixed_intent → uncertain|ambiguous → unresolved (3→0)|retain_uncertain → retain_uncertain|ambiguous → ambiguous|— → U|
|012|appropriate_new_asset / new_page_or_content_asset|synthetic / sparse / N|informational → uncertain|unresolved → unresolved (0→0)|retain → retain_uncertain|unknown → unknown|— → U|
|013|existing_category_improvement / new_page_or_content_asset|real / rich / N|category_selection → uncertain|established → unresolved (2→0)|retain → retain_uncertain|aligned → unknown|— → U|
|014|internal_linking / internal_linking|real / rich / Y|navigation_discovery → navigation_discovery|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|015|internal_linking / internal_linking|historical / mixed / N|navigation_discovery → navigation_discovery|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|016|internal_linking / internal_linking|synthetic / sparse / N|navigation_discovery → navigation_discovery|established → unresolved (2→0)|retain → retain_uncertain|aligned → ambiguous|— → R|
|017|monitor_defer_outcome / existing_product_improvement|real / rich / N|uncertain_selection → product_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|018|monitor_defer_outcome / existing_content_improvement|synthetic / sparse / N|mixed_intent → informational|established → unresolved (1→0)|retain_uncertain → retain|aligned → aligned|— → R|
|019|monitor_defer_outcome / existing_category_improvement|synthetic / sparse / N|informational → category_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|020|monitor_defer_outcome / existing_product_improvement|real / rich / N|product_selection → product_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|025|duplicate_overlap / existing_product_improvement|synthetic / rich / N|product_selection → product_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|026|duplicate_overlap / existing_product_improvement|real / rich / N|product_selection → product_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|027|duplicate_overlap / existing_content_improvement|synthetic / mixed / N|mixed_intent → informational|established → unresolved (1→0)|retain_uncertain → retain|ambiguous → aligned|— → R|
|028|duplicate_overlap / existing_category_improvement|synthetic / rich / N|category_selection → category_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|029|duplicate_overlap / existing_product_improvement|historical / rich / N|product_selection → product_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|030|duplicate_overlap / existing_content_improvement|real / rich / N|mixed_intent → informational|established → unresolved (1→0)|retain_uncertain → retain|ambiguous → aligned|— → R|
|032|navigational_brand / existing_content_improvement|real / rich / N|brand_navigation → brand_navigation|established → unresolved (1→0)|retain → retain|aligned → aligned|— → R|
|034|navigational_brand / existing_content_improvement|synthetic / sparse / N|brand_navigation → navigation_discovery|established → established (1→1)|retain → retain|aligned → aligned|— → R|
|036|wrong_page_type / existing_product_improvement|synthetic / rich / N|category_selection → product_selection|established → established (2→2)|reject_wrong_page_type → retain|misaligned → aligned|— → R|
|039|low_volume_commercial / existing_product_improvement|real / mixed / Y|product_selection → product_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|040|low_volume_commercial / existing_category_improvement|synthetic / rich / N|category_selection → category_selection|established → unresolved (2→0)|retain → retain|aligned → aligned|— → R|
|041|high_volume_irrelevant / new_page_or_content_asset|synthetic / rich / Y|broad_information → uncertain|unresolved → unresolved (0→0)|reject_mismatch → retain_uncertain|unknown → aligned|— → U|
|042|high_volume_irrelevant / new_page_or_content_asset|real / mixed / N|broad_information → uncertain|unresolved → unresolved (0→0)|reject_mismatch → retain_uncertain|unknown → unknown|— → U|
|043|consolidation_sequencing / existing_content_improvement|real / rich / Y|comparison_selection → informational|ambiguous → unresolved (2→0)|retain_uncertain → retain|ambiguous → aligned|— → R|
|044|consolidation_sequencing / existing_content_improvement|historical / rich / N|informational → informational|established → unresolved (1→0)|retain → reject_overlap_redundant|aligned → aligned|— → R|
|045|consolidation_sequencing / existing_category_improvement|synthetic / mixed / N|category_selection → category_selection|established → established (2→2)|retain → retain|aligned → aligned|— → R|
|046|consolidation_sequencing / new_page_or_content_asset|synthetic / sparse / N|product_selection → uncertain|unresolved → unresolved (0→0)|retain_uncertain → retain_uncertain|unknown → unknown|— → U|
|048|commercial_calibration / existing_content_improvement|real / mixed / Y|comparison_selection → informational|ambiguous → unresolved (2→0)|retain_uncertain → retain|ambiguous → aligned|— → R|

## Intent confusion and distribution

| Expected \\ Actual | product_selection | category_selection | informational | uncertain | navigation_discovery | brand_navigation | total |
|---|---:|---:|---:|---:|---:|---:|---:|
| product_selection | 8 | 0 | 0 | 1 | 0 | 0 | 9 |
| category_selection | 1 | 6 | 0 | 1 | 0 | 0 | 8 |
| informational | 0 | 1 | 4 | 1 | 0 | 0 | 6 |
| comparison_selection | 1 | 0 | 2 | 0 | 0 | 0 | 3 |
| mixed_intent | 0 | 0 | 3 | 1 | 0 | 0 | 4 |
| navigation_discovery | 0 | 0 | 0 | 0 | 3 | 0 | 3 |
| uncertain_selection | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| brand_navigation | 0 | 0 | 0 | 0 | 1 | 1 | 2 |
| broad_information | 0 | 0 | 0 | 2 | 0 | 0 | 2 |

Actual distribution: product_selection 11, category_selection 7,
informational 9, uncertain 6, navigation_discovery 4, brand_navigation 1.
The largest wrong transition is `mixed_intent → informational` (3). The model
most overuses `uncertain` relative to the expected class distribution (6 actual,
0 expected); `mixed_intent` is the most underrepresented expected class (0
actual versus 4 expected). This is evidence of broad uncertainty collapse and
mixed-intent loss, not a one-case pattern.

## Target, disposition, and page-type errors

There are 14 target mismatches. All 14 are
`both_state_and_resources`: the actual state changes to `unresolved` while the
actual resource count drops below the expected set. No target mismatch was an
isolated over-attribution case. The target errors span product, category,
content, new-asset, and linking cases; they occur in rich, mixed, and sparse
evidence and in all provenance classes, so they are not localized to one axis.

Disposition mismatches: 13. Transitions are:

- `retain → reject_overlap_redundant`: 2
- `retain → retain_uncertain`: 3
- `retain_uncertain → retain`: 5
- `reject_wrong_page_type → retain`: 1
- `reject_mismatch → retain_uncertain`: 2

The dominant transition is loss of preservation (`retain_uncertain → retain`),
with a secondary tendency to soften expected rejection into retention/uncertainty.
Because two expected retains were instead rejected as redundant, this is not a
uniform retain-or-reject bias; it is primarily a failure to preserve governed
uncertainty and rejection rationale.

Page mismatches: 8. Transitions are:

- aligned → unknown: 1
- aligned → ambiguous: 1
- ambiguous → aligned: 4
- misaligned → aligned: 1
- unknown → aligned: 1

The four `ambiguous → aligned` transitions plus the wrong-page gate failure are
evidence of a broader page-type reasoning weakness, not one isolated case.

## Required gates

- `mixed_uncertain_preservation` failed for `V105-EVAL-011` (mixed→uncertain),
  `017` (uncertain_selection→product_selection), `018`, `027`, and `030`
  (mixed→informational). These cases did not all retain the governed mixed or
  uncertain intent/disposition.
- `brand_navigation` covered `V105-EVAL-032` and `034`; 032 passed, while 034
  became `navigation_discovery`.
- `wrong_page_type` covered `V105-EVAL-036`; actual page fit was aligned and
  disposition retain instead of expected misaligned/reject_wrong_page_type.
- `high_volume_irrelevant` covered `V105-EVAL-041` and `042`; both actual
  relevance states were uncertain rather than irrelevant.
- `low_volume_preservation` passed for `V105-EVAL-039` and `040`; both retained
  rather than taking a mismatch/wrong-page rejection.
- `commercial_invariance` remains true for all 11 non-live controls.

## High-impact review

The three high-impact intent errors are `V105-EVAL-041`, `043`, and `048`.
The three high-impact target errors are `V105-EVAL-010`, `043`, and `048`.
The overlap is `043` and `048`; 010 is target-only and 041 is intent-only.

- 010: informational→informational; established 1→unresolved 0; aligned;
  retain→retain.
- 041: broad_information→uncertain; unresolved 0→unresolved 0; unknown→aligned;
  reject_mismatch→retain_uncertain.
- 043: comparison_selection→informational; ambiguous 2→unresolved 0;
  ambiguous→aligned; retain_uncertain→retain.
- 048: comparison_selection→informational; ambiguous 2→unresolved 0;
  ambiguous→aligned; retain_uncertain→retain.

## Accuracy by candidate type

Counts and agreements are shown as correct/total.

| Candidate type | Intent | Target | Disposition | Page |
|---|---:|---:|---:|---:|
| existing_product_improvement | 8/11 (72.73%) | 11/11 (100%) | 10/11 (90.91%) | 10/11 (90.91%) |
| existing_category_improvement | 6/7 (85.71%) | 5/7 (71.43%) | 7/7 (100%) | 7/7 (100%) |
| existing_content_improvement | 4/10 (40.00%) | 2/10 (20.00%) | 3/10 (30.00%) | 6/10 (60.00%) |
| new_page_or_content_asset | 1/7 (14.29%) | 4/7 (57.14%) | 3/7 (42.86%) | 5/7 (71.43%) |
| internal_linking | 3/3 (100%) | 2/3 (66.67%) | 2/3 (66.67%) | 2/3 (66.67%) |

The weakest group is new_page_or_content_asset for intent (14.29%); existing
content improvement is weakest for target (20%), disposition (30%), and page
fit (60%).

## Accuracy by evidence maturity and provenance

| Evidence maturity | Intent | Target | Disposition | Page |
|---|---:|---:|---:|---:|
| rich (21) | 14/21 (66.67%) | 13/21 (61.90%) | 14/21 (66.67%) | 16/21 (76.19%) |
| mixed (7) | 3/7 (42.86%) | 4/7 (57.14%) | 4/7 (57.14%) | 5/7 (71.43%) |
| sparse (10) | 5/10 (50.00%) | 7/10 (70.00%) | 7/10 (70.00%) | 9/10 (90.00%) |

Performance deteriorates most sharply on mixed evidence for intent and
disposition. Sparse evidence is not uniformly worst; its target and page scores
are higher than rich/mixed here.

| Provenance | Intent | Target | Disposition | Page |
|---|---:|---:|---:|---:|
| real (17) | 10/17 (58.82%) | 10/17 (58.82%) | 11/17 (64.71%) | 13/17 (76.47%) |
| historical (4) | 4/4 (100%) | 3/4 (75.00%) | 3/4 (75.00%) | 4/4 (100%) |
| synthetic (17) | 8/17 (47.06%) | 11/17 (64.71%) | 11/17 (64.71%) | 13/17 (76.47%) |

Synthetic intent is weakest, but the four historical cases are too small to
support a broad provenance conclusion. These are diagnostics, not exclusions.

## Integrity and v6 contract checks

- Deterministic primary matching succeeded for 38/38 cases; no duplicate or
  missing primary result.
- Cache contains 38 entries and 123 normalized candidate rows. Every entry
  matches the session, SHA, provider/model, evaluation v6, interpretation v6,
  instruction v4, and current benchmark identity fields. No stale v5 result or
  cache identity mismatch was found.
- All cached target rows have normalized flat internal fields and arrays. There
  were 0 `established + []`, 0 `unresolved + non-empty`, and 0
  `INVALID_TARGET_INVARIANT` occurrences across 123 rows.
- The v6 structural contract therefore succeeded; the quality failure is
  separate from the diagnosed v5 schema defect.

## Failure classification and next decision

Classification: **MODEL_CAPABILITY_FAILURE**, model-specific to the fixed
`gpt-4o-mini`/v6 contract. The evidence is a broad 16/38 intent error rate,
14/38 target error rate, 13/38 disposition mismatch rate, 8/38 page mismatch
rate, three high-impact intent errors, three high-impact target errors, and
four failed quality gates, with provider, cache, benchmark identity, and v6
contract integrity all clean. It is not a Product-input contract bug, scorer
integrity failure, provider failure, or benchmark-ground-truth failure; nor is it
localized to one case or one narrow candidate family.

`STRONGER_MODEL_CHALLENGER_JUSTIFIED: YES`. A stronger-model challenger should
be tested only with the v6 schema, identical Product inputs, instructions-4,
frozen 38-case benchmark, and unchanged thresholds. No challenger was called
or configured in this task.

## Preservation and follow-up

Both paid histories remain preserved: v5 9 requests / USD 0.0035226 and v6 39
requests / USD 0.0191604. No further provider call was made. Slice B is not
accepted. The next governed decision is model selection/challenger authorization;
Slice C remains not authorised.
