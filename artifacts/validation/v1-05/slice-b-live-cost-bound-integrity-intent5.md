# V1-05 Slice B — Live Cost-Bound Integrity (Instructions-5)

Status: NON-LIVE COST PROOF PASS — OWNER-AUTHORISED FRESH REVALIDATION PENDING

The previous preview estimator counted only the candidate/model input. It did
not establish a bound from the complete OpenAI request body, including the
instructions, message wrapper, strict response schema, and request fields.
The prior unchanged `$4.0867` figure was therefore insufficient proof after the
instructions-5 contract became longer.

The corrected estimator serializes the complete provider request body offline
and uses its UTF-8 byte length as a deliberately pessimistic input-token upper
bound. This protects the owner cap rather than predicting tokenizer usage. The
output bound is the governed 4,000 completion-token ceiling; reasoning tokens
are not added again.

With the exact smoke and 38 formal request payloads, explicit Sol pricing of
$4/M input and $20/M output produces:

- base-39 maximum: `$5.200696`;
- largest formal retry bound: included separately;
- hard-40 maximum: `$5.371544`;
- configured owner cap: `$6`;
- conservative headroom: `$0.628456`.

Preview and live execution share the same configured cap and request-bound
calculation. Before every network request, known calculated current spend plus
the pending request's conservative maximum must be no greater than the
configured cap. Request-count and cost guards both apply to retries. Unknown
pricing, unknown cost, or unknown provider outcome remains fail-safe and blocks
further requests. Actual provider usage remains the truthful ledger accounting;
the conservative bound is only a pre-network safety guard.

Zero-call preflight result: PASS; 38 formal requests planned, 1 smoke planned,
39 base requests, 40 hard maximum, commercial controls 11/11 PASS, provider
calls 0. Focused tests passed 43/43 before commit.

Future session: `slice-b-v6-sol-medium-intent5-001`. This task does not create
or modify a paid ledger. Fresh owner authorization is required for the paid
revalidation session; when run, it must explicitly use `V105_ACCEPTANCE_COST_CAP_USD=6`.

No secrets, prompts, raw provider responses, fixtures, labels, expectations,
or Product semantic logic are included here.
