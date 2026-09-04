# V1-04 Slice E — Unified Progressive Evidence Acceptance

- Date: 2026-09-04
- Branch: `feature/v1-04-organic-evidence`
- Starting SHA: `99ca4a95870acfa7263f98fadaaecef981f3f1b6`
- Snapshot implementation: read-only `GET /api/product/organic-evidence/snapshot`
- Implementation SHA: `7fed5ac`
- External calls: `0`

## Reconciliation

The accepted Street Kingz Business was reconciled from local durable evidence
only. Commerce is complete and usable (current generation 163; bounded product
and category counts 1/1). Search Console is connected to the accepted
`https://streetkingz.co.uk/` URL-prefix property with `siteOwner` permission;
B2 retains 1,125 observations and provider-limited detail. Site run 663 is the
primary complete/LKG evidence and latest partial run 764 remains separately
visible. External run 830 is `usable_partial` with 80 Keyword Ideas and 31
organic SERP observations; no external complete run or LKG exists. The 111
observations remain durable and no partial run was promoted.

## Projection contract

The snapshot is authenticated, Business-resolved, read-only and has no request
body or refresh side effect. It exposes source-specific state, selected run
references, retrieval/evidence timestamps, completeness, limitations and
bounded counts. It does not expose query/keyword/SERP lists, raw responses,
credentials, recommendations or scores.

Selection is deterministic: a current complete run is primary; otherwise a
valid partial run with durable rows is `usable_partial`; failed runs with no
rows are not usable. A newer partial attempt is shown separately from a
complete/LKG primary. Missing evidence is unavailable/not-connected, never a
zero fact.

## Scenario and safety results

| Scenario | Result |
|---|---|
| Commerce only | PASS — commerce usable; organic absence explicit |
| Commerce + site | PASS — site available; GSC absence does not imply zero traffic |
| Commerce + site + external partial | PASS — external usable-partial and limited |
| Commerce + site + GSC | PASS — first-party search available; external absence explicit |
| All sources | PASS — source classes remain independent |
| Complete/LKG site plus newer partial | PASS — complete/LKG primary, partial separate |
| Partial external without LKG | PASS — usable-partial, not complete/LKG |
| Failed source without rows | PASS — failure explicit and unusable |
| Sparse GSC | PASS — no traffic threshold |
| Foreign tenant | PASS — ownership and RLS prevent leakage |

Missing GSC, demand, impressions, COGS and rankings remain unknown/not
observed rather than zero. Connection semantics are preserved: GSC is
customer-connected; site has no separate connection; DataForSEO is
product-connected with no customer connection; WooCommerce retains its V1-03
connection.

## Canonical V1-04 criteria 1–36

| Criteria | Result | Evidence / limitation |
|---|---|---|
| 1–14 Search Console | PASS | B1/B2 accepted artefacts; active Street Kingz property; 1,125 observations; provider-limited detailed grains remain explicit. |
| 15–24 Site evidence | PASS | Slice C acceptance; bounded inventory; complete/LKG selection; latest partial preserved; no raw HTML/PII. |
| 25–30 External search | PASS | Slice D gate and real acceptance; 111 durable observations; malformed response failed closed; partial state is truthful. |
| 31 | PASS | Business, source/run ownership, provenance and retrieval metadata are retained. |
| 32 | PASS | Direct commerce/GSC/site seed facts remain distinct from derived external observations. |
| 33 | PASS | Connection state is separate from evidence source/run state. |
| 34 | PASS | Missing, failed, stale and partial states are source-specific and customer-safe. |
| 35 | PASS | Existing RLS and tenant tests pass; snapshot is authenticated and Business-scoped. |
| 36 | PASS | Critical 0, High 0; no V1-05 decision logic or paid execution. |

All 36 criteria: PASS.

## Roadmap deliverables

| Deliverable | Result |
|---|---|
| Search Console connection/property/health | COMPLETE |
| Query/page evidence and freshness limitations | COMPLETE WITH LIMITATION: provider-limited detailed grains |
| Minimum site understanding | COMPLETE WITH LIMITATION: latest real attempt partial; complete/LKG preserved |
| Bounded external search and SERP | COMPLETE WITH LIMITATION: real external run partial after fail-closed malformed response |
| Evidence freshness policy | COMPLETE |
| Provider usage/cost telemetry | COMPLETE |
| Combined business and organic evidence snapshot | PASS — authenticated read-only projection |
| Real test-store reconciliation | PASS — local accepted Street Kingz state reconciled |
| O-005 provider decision | PASS — DataForSEO accepted in bounded scope |
| Evidence boundary ready to freeze | PASS |

## Validation

- Snapshot unit/scenario tests: PASS (4).
- Authenticated Street Kingz snapshot projection: PASS, read-only local
  Supabase, source states and counts reconciled.
- Existing Slice A–D focused and persistence tests: PASS.
- Full `npm test`: PASS, 1,126 passed, 21 pre-existing environment-gated skips,
  0 failures.
- Migration proof: no Slice E migration required; accepted-head schema and
  preserved rows verified. Disposable from-zero migration proof was not rerun
  because Slice E adds no migration and normal accepted state was preserved.
- Sensitive-data scan: PASS; no credentials, tokens, raw provider responses,
  GSC query lists or provider dataset dumps added.
- Critical: 0.
- High: 0.

## Acceptance

The capability is accepted with truthful source-specific limitations. Site
latest real evidence remains partial with complete/LKG primary; external
evidence remains partial with no complete/LKG; GSC detailed grains remain
provider-limited. These states are not collapsed into a global completeness
claim.
