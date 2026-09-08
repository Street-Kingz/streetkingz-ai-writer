# V1-05 — Product Governance Review

Status: DEVELOPMENT PROGRESSION GATE PASS / PRODUCTION ACCEPTANCE GATE FAIL

## Scope and evidence

Zero provider calls were made. No Product implementation, model, prompt,
schema, benchmark, label, threshold or database change was made. Historical
paid evidence remains preserved. The final hierarchical Sol session completed
38/38 cases with provider/runtime integrity PASS but quality FAIL: intent 17/38
(44.74%), high-impact intent errors 5, high-impact target errors 3,
disposition agreement 52.63%, target agreement 76.32%, and page-fit agreement
65.79%. Mixed/uncertain preservation and brand navigation failed; wrong-page,
high-volume irrelevant, low-volume preservation and commercial invariance
passed.

## Separate gates

`DEVELOPMENT_PROGRESSION_GATE` asks whether bounded, inspectable,
evidence-backed recommendation work can continue without autonomous publication
or paid execution. It is PASS.

`PRODUCTION_ACCEPTANCE_GATE` asks whether merchant-facing release can rely on
the capability without unresolved material decision risk. It is FAIL.

Development-ready is not accepted, frozen or production-good.

## Field importance

| Field | V1 role |
|---|---|
| `customer_job` | USEFUL_PRODUCT_SIGNAL |
| `intent_class` | DIAGNOSTIC_ONLY |
| `intent_confidence` | MERCHANT_SAFETY_GUARDRAIL |
| `relevance_state` | MERCHANT_CRITICAL_BLOCKER |
| `target_attribution_state` | MERCHANT_CRITICAL_BLOCKER |
| `attributed_target_resources` | MERCHANT_CRITICAL_BLOCKER |
| `page_type_fit` | MERCHANT_SAFETY_GUARDRAIL |
| `new_asset_fit` | MERCHANT_SAFETY_GUARDRAIL |
| `interpretive_disposition` | MERCHANT_CRITICAL_BLOCKER |
| `reason_codes` | USEFUL_PRODUCT_SIGNAL |
| `limitations` | MERCHANT_SAFETY_GUARDRAIL |

These assignments follow current Product behavior. The exact ten-way intent
label is used for interpretation, persistence, scoring and quality gates, but
no current recommendation/intervention branch switches solely on it.

## Merchant-critical failure definition

Production and the affected development path must fail closed for wrong or
invented targets, irrelevant opportunities retained, clearly wrong page types
retained, redundant new assets recommended, insufficient evidence presented as
confident action, invented evidence/facts, unauthorised commercial reasoning,
high-impact target mistakes, or lost provenance/validator safety.

Intent-label disagreement alone is not merchant-unsafe when target, relevance,
page fit, disposition, evidence and uncertainty remain safe. It remains a
diagnostic quality signal.

## Consequence-based safety view

For offline comparison, `MERCHANT_UNSAFE_DECISION` means a high-impact target
mismatch, irrelevant retention, wrong-page retention, or redundant new-asset
recommendation. `MERCHANT_UNCERTAIN_DECISION` means a non-high-impact target
mismatch or uncertainty presented as definite action. Other cases are
`MERCHANT_SAFE_DECISION`. This view supplements and does not replace frozen
scoring.

| Complete clean run | Safe | Unsafe | Uncertain | High-impact unsafe |
|---|---:|---:|---:|---:|
| gpt-4o-mini instructions-4 | 24 | 3 | 11 | 3 |
| Sol medium instructions-4 | 33 | 3 | 2 | 2 |
| Sol hierarchical instructions-6 | 29 | 3 | 6 | 3 |

Final-run unsafe cases were target-critical errors in `V105-EVAL-005`,
`V105-EVAL-014`, and `V105-EVAL-041`; the last also retained a wrong-page
candidate. No invented target passed validation. Commercial controls were
11/11 PASS. The incomplete instructions-5 session was excluded from acceptance
rescore.

## Governance decisions

`intent_class` is a `DIAGNOSTIC QUALITY SIGNAL` in V1: neither a development
blocker nor a standalone production blocker. This does not lower the unchanged
85% benchmark threshold; it changes which metric governs Product release.

`DEVELOPMENT_PROGRESSION_GATE = PASS`, subject to evidence-backed outputs,
visible provenance and limitations, preserved uncertainty, human inspection,
no auto-publish and no autonomous paid execution.

`PRODUCTION_ACCEPTANCE_GATE = FAIL` because high-impact target errors,
imperfect target attribution, unsafe/uncertain decision outcomes, and failed
merchant-behaviour gates remain unresolved.

The governance state is `SLICE_B_DEVELOPMENT_READY` while
`SLICE_B_PRODUCTION_NOT_ACCEPTED`. Slice C development authorization is
recommended but not granted.

`DECISIONS.md`, `DEFINITION_OF_DONE.md`, `ROADMAP.md`, and `PROJECT_STATE.md`
record the old classifier-centric assumption, the evidence learned, and the
new consequence-based gate. Security, provenance, evidence, cost and
high-impact safety requirements were not weakened.

Every later milestone must advance an inspectable merchant-facing output such
as a ranked opportunity, evidence-backed recommendation, DIY action plan,
merchant explanation or usable intelligence screen.

Street Kingz remains a separate business and validation environment. Manual
non-Product Street Kingz growth work may proceed in parallel without expanding
Product scope or substituting for Product validation.

Next owner decision: authorize bounded Slice C/recommendation-layer development
under these constraints. No further intent-classifier experiment is authorized.
