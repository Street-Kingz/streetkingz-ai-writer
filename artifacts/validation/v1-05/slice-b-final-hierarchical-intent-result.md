# V1-05 Slice B — Final Hierarchical Intent Result

Status: QUALITY_FAIL — FINAL INTENT-ARCHITECTURE EXPERIMENT COMPLETE

## Session

- Session: `slice-b-v7-sol-medium-hierarchical-001`
- SHA: `0f1626c9907007444944e50090e587cd1692f70b`
- Provider/model: OpenAI / `gpt-5.6-sol`
- Reasoning: `medium`
- Interpretation/instruction: `v1-05-interpretation-7` /
  `v1-05-slice-b-instructions-6`
- Requests: 1 smoke, 38 formal, 0 retries, 39 total
- Tokens: 111,713 input; 53,351 output
- Actual cost: `$1.513872`, calculated from explicit pricing
- Provider failures: 0; unknown outcomes: 0; bound failures: 0; harness
  failures: 0

## Formal result

- Completed: 38/38
- Intent: 17/38 (`44.74%`)
- High-impact intent errors: 5
- High-impact target errors: 3
- Interpretive disposition agreement: `52.63%`
- Target attribution agreement: `76.32%`
- Page-type fit agreement: `65.79%`

Required gates:

- mixed/uncertain preservation: FAIL
- brand navigation: FAIL
- wrong page type: PASS
- high-volume irrelevant: PASS
- low-volume preservation: PASS
- commercial invariance: PASS

Commercial controls remained 11/11 PASS: 10 candidate-level and 1 run-level,
with 0 N/A. The hierarchical provider contract completed without semantic
invariant failures; the failure is benchmark quality, not provider/runtime
integrity.

## Decision

`INTENT_CLASSIFIER_EXPERIMENT_LOOP_CLOSED`.

Slice B is not accepted. Do not rerun this benchmark, change the hierarchy,
tune the prompt, try Sol high, switch models, lower thresholds, or change
labels/benchmark truth in response to this result. The next governed action is
`PRODUCT_GOVERNANCE_REVIEW` to determine whether exact `intent_class` accuracy
should remain a V1 blocking signal given the actual downstream Product value.

Street Kingz was not run and remains separately authorized work. Slice C remains
not authorised.
