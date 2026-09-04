# V1-05 Proposed Evaluation Design

Status: PROPOSED — owner review required. All quantities and thresholds below
are frozen proposal values for review before implementation; they are not yet
accepted Product requirements.

## Labelled corpus

Use 48 cases, created before implementation and frozen by case ID. The corpus
contains 32 evidence-grounded opportunity cases and 16 adversarial/control
cases:

| Class | Cases |
|---|---:|
| Existing product/category/content improvement | 9 |
| Appropriate new page/content asset | 4 |
| Internal linking / dependency | 3 |
| Monitor/defer or do nothing | 4 |
| Insufficient evidence | 4 |
| Duplicate, same-target or overlap cases | 6 |
| Wrong market / navigational-brand cases | 4 |
| Product mismatch / wrong page type / invalid target | 4 |
| Low-volume commercially credible | 2 |
| High-volume commercially irrelevant | 2 |
| Consolidation and sequencing dependency | 4 |
| **Total** | **48** |

Cases use frozen V1-04 evidence, valid historical V1-01 evidence where its
provenance remains valid, and synthetic/adversarial cases needed to cover
failure classes. No founder hint unavailable to a normal customer is included.
At least 12 cases are sparse-evidence cases and at least 12 are rich first-party
evidence cases; 8 cases intentionally combine sparse and rich source states.

Two reviewers independently label discoverability, filter disposition,
customer-job/intent class, appropriate intervention, severity, dependencies and
recommendation usefulness. Disagreements are adjudicated before the set is
released. Evaluation is blinded to control/challenger labels where practical.

## Measurements and thresholds

- Discovery recall: at least **85%** of discoverable labelled opportunities
  surfaced in the bounded candidate universe. Discoverable means a case has the
  minimum evidence and target validity needed to be considered; an explicitly
  insufficient-evidence case is not a missed opportunity.
- Filtering false-positive rate: at most **10%** of labelled non-opportunities
  retained after hard filtering.
- Filtering false-negative rate: at most **5%** of labelled valid opportunities
  rejected by filtering. Any high-impact false negative (commercially credible
  opportunity or dependency that prevents another valid action) is separately
  reported; at most **1** is allowed and it requires a written review.
- Intent/intervention correctness: at least **85%** exact or substantively
  equivalent expert agreement on the 32 applicable cases. Mixed/uncertain
  labels count as correct only when uncertainty is preserved.
- High-impact decision errors: at most **2 of 48**, with zero fabricated
  evidence, zero unsupported commercial facts and zero cross-tenant outputs.
- Recommendation usefulness: five-point rubric, minimum **4.0/5.0 mean**, with
  no dimension mean below **3.5** and at least **80%** of recommendations rated
  4 or 5 by both reviewers.
- Repeat reliability: **5** independent runs per evaluation case with the same
  frozen packet. Unacceptable instability is more than **1 of 5** runs changing
  candidate disposition or intervention materially, or any run violating a
  hard requirement.

## Rubrics

Prioritisation is reviewed without a magic-number requirement across these
dimensions: organic relevance, customer-job fit, target/page fit, commercial
relevance, strategic supporting value, feasibility, dependency sequencing,
evidence grounding, confidence calibration, action worthiness and avoidance of
false precision. Each is rated 1–5; the output must show the vector and reasons,
not only a collapsed score. Missing inputs are `unknown`, never zero.

Recommendation usefulness is rated 1–5 for decision usefulness, evidence
grounding, intervention appropriateness, relative-priority credibility,
commercial appropriateness, clarity, limitations honesty and independence from
founder knowledge. A recommendation must state what was found, why it matters,
why now if applicable, evidence, confidence/unknowns, assumptions, intended
outcome, dependencies, failure conditions and reassessment trigger.

## Control/challenger and progressive evidence

Run the same candidate universe and non-commercial evidence through an SEO-only
control and a commercially informed challenger. Hide labels where practical.
The challenger may claim an advantage only if it improves usefulness by at least
**0.5 rubric points** on the commercial-appropriateness or action-worthiness
dimension without increasing high-impact errors above the threshold.

Run the same engine over sparse, rich and mixed packets. Missing sources must
reduce confidence or add limitations; they must not be treated as zero or make
the engine invent a candidate.

## Street Kingz protocol

Freeze one sanitized snapshot identity from the accepted V1-04 snapshot before
evaluation. Run with no network, no founder hints and no changing evidence.
Report candidates, rejected candidates, no-action and insufficient-evidence
outcomes with evidence references and limitations. This proves the generic
boundary only; it does not prove independent-store performance.

