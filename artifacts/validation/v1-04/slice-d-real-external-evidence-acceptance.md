# V1-04 Slice D — Real External Evidence Acceptance Review

- Date: 2026-09-04
- Branch: `feature/v1-04-organic-evidence`
- Candidate SHA: `68fd9d33b9cd93cb23cc01a845cf465e5827108e`
- Scope: canonical governance and acceptance review only; no new provider calls.

## Canonical contract

The review used the V1-04 milestone's External Search Evidence boundary and
criteria 25–36 in `milestones/V1-04_ORGANIC_EVIDENCE_CONNECTIONS.md`, together
with `PRODUCT_VISION.md`, `PRODUCT_SCOPE.md`, `DECISIONS.md`,
`DEFINITION_OF_DONE.md`, `ROADMAP.md` and `PROJECT_STATE.md`.

The canonical contract does not require every bounded provider request to
succeed. It requires bounded evidence, explicit provenance and completeness,
and fail-closed handling of pagination, timeout, malformed responses and cost
limits. Earlier task prompts imposed a stricter effective requirement for a
perfect five-seed run; those prompts do not supersede the milestone contract.

## Real validation result

- Provider: DataForSEO, accepted by owner as the V1 external provider.
- Market/location: GB / United Kingdom / `2826`.
- Language: English / `en`.
- SERP: Google, desktop, depth 10.
- Real attempt state: `partial`.
- Successfully completed direct-seed cycles: 4.
- Keyword Ideas calls: 5.
- SERP calls: 4.
- Keyword observations: 80.
- Organic SERP observations: 31.
- Total durable real observations: 111.
- Fifth Keyword Ideas response: provider-contract deviation, classified
  `PROVIDER_MALFORMED` and rejected.
- Retry after malformed response: NO.
- Valid earlier evidence preserved: YES.
- Fake complete run: NO.
- Fake LKG: NO; no prior external LKG existed.

All retained observations have valid persisted seed foreign keys and parent
lineage. Seeds are direct; provider observations are derived. Missing demand
remains nullable, and no complete keyword, SERP or query dataset is reproduced
here.

## Canonical criteria 25–36

| Criterion | Result | Evidence |
|---|---|---|
| 25. Provider gate | PASS | Owner approval, bounded terms/storage policy, UK quality evidence, cost/rate/failure controls. |
| 26. Identity and lineage | PASS | Deterministic direct seeds, one seed per request, fixed locale/language, no LLM seeds. |
| 27. Provider ideas remain evidence | PASS | No shortlist, ranking, recommendation or intervention output. |
| 28. Demand semantics | PASS | Search volume/monthly series where supplied, provider provenance, retrieval/observation metadata and completeness; missing values remain unavailable. |
| 29. SERP observations | PASS | Bounded organic rank, URL and domain observations with UK/English/device/depth context. |
| 30. Fail-closed behavior | PASS | Malformed response rejected, no retry hammering, partial state retained, cost limits enforced. |
| 31. Ownership/provenance | PASS | Business/source/run/seed lineage and retrieval metadata are durable. |
| 32. Direct/derived separation | PASS | Seeds are `direct`; provider observations are `derived`, enforced in SQL. |
| 33. Connection/source separation | PASS | Product-connected external source has no customer Connection row. |
| 34. Truthful completeness | PASS | Source is `partial`; no fake current complete run or LKG. |
| 35. Tenant isolation | PASS | RLS and tenant integration tests passed. |
| 36. Safety/governance | PASS | Critical 0, High 0, no V1-05 decision logic or paid execution. |

## Cost review

- Known successful-response cost: USD `0.0800`.
- Final malformed request reserved cost: USD `0.0144`; actual cost unknown.
- Conservative fresh exposure: USD `0.0944`.
- Product run ceiling USD `0.10`: PASS.
- Business refresh-window ceiling USD `0.20`: PASS.
- Historical acceptance-campaign conservative exposure: USD `0.1376`.
- Previous USD `0.13` campaign ceiling: exceeded conservatively by USD `0.0076`.
- This is an acceptance-process budget issue, not a Product Critical/High defect;
  Product runtime ceilings operated as designed.
- Owner response: no further Slice D provider calls authorised.

## Boundary and preservation

- Raw provider responses persisted: NO.
- Credentials persisted in evidence: NO.
- Opportunity/recommendation logic: NONE.
- Unauthorized external calls in the accepted run: 0.
- A/B/C unchanged: PASS.
- Partial run remains inspectable and durable; valid evidence was not erased.
- Current external complete run: none.
- Current external LKG: none.
- Critical remaining: 0.
- High remaining: 0.

## Acceptance rationale

The four successful bounded acquisition cycles provide real Street Kingz
external-search evidence. The fifth malformed provider response demonstrates
the required fail-closed partial behavior. Acceptance is of the bounded Slice D
capability and its truthful failure semantics, not a claim that the partial run
is complete or that it represents the global search universe.
