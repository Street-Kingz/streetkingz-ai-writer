# V1-03 verification test report

- Focused V1-03 harness/reference, commerce/route, and V1-02 regression tests:
  145 passed, 0 failed, 7 integration cases skipped when local integration is
  not enabled.
- V1-03 commerce tests: passed.
- V1-03 route tests: passed.
- V1-03 local integration: 66 TAP tests passed, 0 failed.
- V1-02 focused unit regression: passed.
- V1-02 real local integration regression: passed.
- Full `npm test`: 1052 tests, 1045 passed, 0 failed, 7 intentionally skipped.
- Real Street Kingz initial-commerce reconciliation: PASS; source fingerprint
  unchanged on recheck.
- Real Street Kingz incremental reconciliation: PASS; exact Product-category
  pair-set comparison passed and the rolling window removed one Order and one
  Order line from the new complete generation.
- First real incremental category-link failure is retained as historical
  acceptance evidence; the corrected run self-healed 0 links to 103.
- Product Critical remaining: 0.
- Product High remaining: 0.
- No Product code change was required for the real reconciliation; the
  2018/2020 result is the accepted `NO_RECOGNISED_SALES` NULL/NULL semantic.
- Sensitive-data scan: passed; no credentials, tokens, Vault references, raw
  Woo responses, or customer PII are recorded in the acceptance artifacts.

No SQL or migration changes were required for this closeout. Existing accepted
evidence covers genuine refund shapes and attribution, malformed/conflicting
money, pagination, atomic/LKG promotion, concurrency, callback/return,
disconnect lifecycle, read-key mutation rejection, RLS isolation, clean
rebuild, and PII filtering.
