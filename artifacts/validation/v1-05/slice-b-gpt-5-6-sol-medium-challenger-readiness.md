# V1-05 Slice B GPT-5.6 Sol medium challenger readiness

## Frozen experiment

The incumbent `gpt-4o-mini` result is preserved: 22/38 intent accuracy
(57.89%), 3 high-impact intent errors, 3 high-impact target errors, 65.79%
disposition agreement, 63.16% target agreement, 78.95% page-fit agreement,
and four failed required gates. This supports a stronger-model challenger, but
does not change benchmark truth or acceptance thresholds.

The challenger is `gpt-5.6-sol` with `reasoning_effort=medium`. Discovery,
filtering, candidate preparation, fixtures, labels, expectations, thresholds,
commercial controls, v6 schema, normalizer, validator, instructions, and
model-facing Product inputs remain unchanged. Product versions remain:

- Slice A: `v1-05-slice-a-4-provenance`
- Filter: `v1-05-filter-3`
- Slice B evaluation: `v1-05-slice-b-6`
- Interpretation: `v1-05-interpretation-6`
- Instructions: `v1-05-slice-b-instructions-4`

## Provider profile and offline request proof

`interpretation/providers/openai.js` now exposes the authoritative
`interpretationModelProfile()` capability profile. The existing Chat
Completions endpoint remains the request path. The Sol profile emits strict
JSON Schema Structured Outputs, `reasoning_effort: medium`, and
`max_completion_tokens: 4000`; it omits `temperature`, `top_p`, and
`logprobs`. The nested v6 `target_attribution.anyOf` remains in the exact
response schema.

The legacy `gpt-4o-mini` profile remains strict Structured Outputs with
`temperature: 0.1`, no reasoning parameter, and the same schema. Supplying a
reasoning effort to that legacy profile is rejected before a request is made.
Sol accepts only the bounded configured values `none`, `low`, `medium`, `high`,
`xhigh`, and `max`; arbitrary values are rejected before network access.

Provider settings report API, response format, strictness, and active reasoning
effort without falsely reporting temperature for Sol.

## Usage and cost accounting

Chat Completions `completion_tokens` remains the billed output total. When
present, `completion_tokens_details.reasoning_tokens` is exposed separately as
`reasoning_tokens`; it is not added to output totals a second time.

The future acceptance pricing source is explicit environment configuration:

```text
gpt-5.6-sol: $4/M input, $20/M output
```

The preview uses the actual deterministic request payloads and a conservative
one-character-per-input-token upper bound. It estimates 221,675 input tokens.
With the 4,000-token output ceiling:

- base 39 requests: 156,000 output tokens; maximum estimated cost USD
  4.0067;
- hard 40 requests: 160,000 output tokens; maximum estimated cost USD
  4.0867.

Both remain below the owner USD 5 cap, subject to the owner’s separate fresh
live authorization and truthful runtime accounting.

## Offline validation

Focused tests passed, including the Sol request profile, invalid reasoning
configuration rejection, v6 schema retention, mocked Chat Completions parsing,
v6 normalization/validation, and reasoning-token accounting. No OpenAI request
was made. The preview passed with 38 formal cases, 1 smoke request, 39 base
requests, a 40-request maximum, 11/11 commercial controls, and zero provider
calls.

## Session and authorization boundary

The future session ID `slice-b-v6-sol-medium-001` passes the accepted safe
session-path containment rules and has no existing paid session. No paid ledger
was created. The historical v5 and gpt-4o-mini v6 ledgers/caches remain
preserved and are not reused.

This artifact authorizes no live work. A fresh owner authorization is required
before any Sol smoke or formal benchmark. Street Kingz evaluation is not part
of this challenger preparation.
