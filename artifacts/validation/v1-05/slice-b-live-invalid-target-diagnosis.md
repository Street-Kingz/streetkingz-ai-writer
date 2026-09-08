# V1-05 Slice B live invalid-target diagnosis

## Session and caps

- Acceptance SHA: `830b21ecde1945eb27036e9dc19b735f61a8332d`
- Provider/model: OpenAI / `gpt-4o-mini`
- Caps: 40 requests and USD 5
- Smoke: PASS, 1 request
- Current total: 9 requests; formal 8 requests
- Usage: 14,640 input tokens; 2,211 output tokens
- Cost: USD 0.0035226, calculated from configured pricing

## Sanitized session state

Six formal cases completed successfully: `V105-EVAL-001` through
`V105-EVAL-006`. `V105-EVAL-007` has two attempts and no successful result.
The remaining formal cases are not started. There are no unknown provider
outcomes. The case cache contains six successful cases, matching all six
completed ledger entries.

The frozen expectation order makes `V105-EVAL-007` formal ordinal 7 of 38.
Its expected primary type is `existing_content_improvement`, attribution is
`established` with `page:page-a`, intent is `informational`, and it is not
high-impact.

## Local reconstruction

Product-only reconstruction found 3 discovered, 3 prepared, 0 duplicate
rejections, 3 eligible, 3 selected, and 0 bounded out. The batch contains one
frozen primary candidate and two other candidates. All three have valid Product
inputs: the primary has one allowed target and one target resource; the other
two have respectively two allowed/target refs and one allowed ref with no
target resource. Evidence-ref counts are 3, 1, and 1. No candidate input makes
target attribution impossible. Their interpretation input hashes were
calculated locally and no descriptive evidence was persisted here.

## Contract comparison

`INTERPRETATION_RESPONSE_SCHEMA` independently permits both
`established` with an empty target array and `unresolved` with a non-empty
target array because the two fields are structurally independent. The live
instruction explicitly says established attribution requires a supplied allowed
target and unresolved requires none. `validateInterpretation()` rejects both
pairings with `INVALID_TARGET_INVARIANT`; these are the only branches producing
that code.

The raw invalid pairing is unavailable because raw provider output is not
persisted by policy. It is therefore not claimed to be either pairing.

## Classification and safeguards

The observed failure is a `MODEL_SEMANTIC_CONTRACT_FAILURE`, with a related
`HARNESS_CLASSIFICATION_BUG`: the prior top-level classifier treated semantic
invariant errors as `HARNESS_FAIL`. It is not a Product input-contract bug,
provider failure, or benchmark ground-truth bug. Safe validation diagnostics
now include only the validation code, candidate identity/type, attribution
state, target counts, and allowlist boolean. Raw model text, prompts, evidence,
and secrets remain excluded.

Future formal semantic invariant failures classify as `QUALITY_FAIL` and stop
without spending remaining requests. Network/provider, ledger/cache, and bound
failures retain their separate classifications.

## Request-cap mathematics

Nine requests are consumed. Six formal cases are complete. The seventh case
consumed two attempts and remains unsuccessful. Thirty-two formal cases still
lack a successful accepted result. The minimum further requests for completion
would be 32, requiring 41 total requests. With a hard maximum of 40, the
current authorised session cannot reach formal PASS. The session is not
resumed and no further provider calls are made.
