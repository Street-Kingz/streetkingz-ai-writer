# V1-05 Slice B live cost-bound integrity — instructions-5

## Result

Zero OpenAI calls were made. The prior preview value `$4.0867` was not a
complete hard-cost proof because it counted only serialized candidate input and
omitted the system prompt, messages wrapper, strict response schema, and other
request fields.

## Corrected estimator

Preview and live admission now use `conservativeProviderRequestCostBound()` in
`interpretation/cost.js`. It serializes the complete offline-built provider
request and uses `Buffer.byteLength(..., "utf8")` as a deliberately pessimistic
input-token bound. This protects the owner cap rather than attempting to model
tokenizer efficiency. Each request uses the governed 4,000-token completion
ceiling; reasoning tokens are not added separately.

The exact request path includes the Sol model, medium reasoning effort, strict
JSON Schema response format, system message, user message, and completion-token
limit. Base-39 sums one smoke bound and all 38 individual formal bounds. Hard-40
adds the largest individual formal bound as the possible retry.

Configured pricing was explicit: Sol input `$4/M`, output `$20/M`.

| Bound | Value |
|---|---:|
| Smoke conservative input bound | 8,364 |
| Base-39 aggregate conservative input bound | 520,174 |
| Largest formal input bound | 22,712 |
| Base-39 maximum output tokens | 156,000 |
| Hard-40 maximum output tokens | 160,000 |
| Base-39 maximum cost | `$5.200696` |
| Hard-40 maximum cost | `$5.371544` |

The corrected hard-40 bound exceeds the owner limit of `$5`; preview therefore
returns `HARNESS_FAIL` before any live authorization or network access. No cap
was weakened and no additional owner authorization is assumed.

## Live guard and accounting

The live provider wrapper computes the same pending-request bound before
`provider.generate()` and rejects when current known cost plus that bound would
exceed `$5`, without incrementing request counters. Unknown/missing pricing or
unknown current cost also rejects before network. Actual post-response usage
and cost accounting remains separate and truthful; conservative bounds are not
written as actual usage, and reasoning tokens are diagnostic only rather than
double-counted.

Focused regressions cover request-body components, longer instructions,
base-39/hard-40 arithmetic, pricing absence, `$4.95 + $0.20` rejection,
request-count preservation, and reasoning-token non-double-counting. Existing
request-count, commercial, v6 contract, and provider-profile tests remain
green. Full npm remains green with 1,177 passed, 0 failed, and 21 existing
skips. Secret scan and diff check pass.

Future session remains `slice-b-v6-sol-medium-intent5-001`; no paid ledger was
created. Fresh owner cost-bound decision is required before any live attempt.
Slice B remains not accepted and Slice C remains not authorised.
