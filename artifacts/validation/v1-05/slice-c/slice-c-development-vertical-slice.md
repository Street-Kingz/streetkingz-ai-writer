# V1-05 Slice C development vertical slice

This is a deterministic development capability. It does not call a provider,
publish changes, execute paid work, or constitute production acceptance.

## Commercial strengthening

`evaluation-slice-c-commercial.json` freezes twelve genuine commercial-sensitive
scenarios: the eleven existing Slice B scenarios plus
`V105-SLICE-C-COMM-001`. The new scenario holds organic evidence, discovery,
target, relevance, safety and intervention constant while reliable stock and
recent sales context may refine priority or explanation. It cannot create
demand, revenue, a target, or a candidate.

## Recommendation contract

`product-kernel/recommendationEngine.js` consumes bounded candidate evidence and
produces a versioned recommendation record. It supports the approved
interventions, lifecycle states, evidence references, limitations, confidence,
commercial signal and a deterministic recommendation identity. Re-running
unchanged inputs reuses the same logical identity. No recommendation table was
needed: current migrations provide candidate/evaluation foundations but no
recommendation persistence contract.

## Safety and prioritisation

The explicit merchant safety projection is `safe`, `uncertain`, or `unsafe`.
Unsafe candidates are never current actionable recommendations. Uncertain
candidates are deferred or need reassessment and never become confident
actions. Priorities are relative `high`, `medium`, `low`, or `reassess`, with
bounded reasons and at most five current actionable recommendations per run.
Missing commercial context remains `unknown`.

## Merchant projection and demo

The projection exposes plain title, priority, state, action, target,
confidence, limitations, evidence/provenance and a small next-action list. It
hides candidate IDs, model metadata, internal intent labels and raw outputs.

Run `npm run demo:v1-05:slice-c` to generate the committed synthetic preview.
It demonstrates a current product-page recommendation, a deferred uncertain
opportunity, an unsafe page-fit candidate blocked from action, and a no-action
outcome. The preview is inspectable by a non-technical ecommerce owner.

## Known limitations and production blockers

This is development/prototype work. It does not auto-publish, edit WordPress or
WooCommerce, generate content, execute paid actions, or claim production safety.
Production remains blocked until merchant-critical target correctness,
evidence safety, consequence-based relevance/page decisions, provenance,
uncertainty handling, and customer-bound review/approval are proven under the
governed release gate.

Slice B remains `SLICE_B_DEVELOPMENT_READY` and
`SLICE_B_PRODUCTION_NOT_ACCEPTED`. Slice C is development-authorised and this
first vertical slice is complete. Street Kingz live Product evaluation was not
run; it requires separate authorization.
