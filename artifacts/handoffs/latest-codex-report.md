# Codex Handoff

## Task

- Objective: repair the generic V1-05 recommendation priority input contract and verify the genuine read-only dry run.
- Date: 2026-09-28
- Branch: `feature/v1-05-opportunity-recommendation`
- Starting SHA: `0268e6013da8c00abbcead3888668c2ddf998666`
- Final/current SHA at repair commit: `6d5f172`.
- Repair commit: `6d5f172` (`fix(v1-05): derive recommendation priority from genuine evidence`).

## Status

`V1-05 RECOMMENDATION PRIORITY REPAIR PASS — READY FOR PAGE LABEL REPAIR`

## Root cause

- The Slice C synthetic fixtures supplied `evidence_maturity` directly.
- The normal discovery path supplies `freshness_state`, `completeness`, `discovery_sources`, `evidence_refs`, and `limitations`; it never supplied `evidence_maturity`.
- `priorityFor()` read the fixture-only field, so all eight genuine safe actionable candidates fell into the same medium fallback band and five positions were selected by lexical recommendation ID.
- The governed evidence contract already defines freshness and completeness as coverage/maturity facts, including partial and provider-limited states. The repair derives a bounded coverage result from those real fields rather than using evidence-reference quantity or merchant-specific rules.

## Repair

- Changed `product-kernel/recommendationEngine.js` to derive `rich`, `mixed`, `sparse`, `unavailable`, or `unknown` coverage from the freshness/completeness state pair.
- `available + available` is rich; one available plus one limited/provider-limited is mixed; two limited states are sparse; missing/unavailable remains unavailable; unrecognised or absent states remain unknown.
- Source scope and material limitations are explanatory only, not independent business-value scores.
- Priority still fails closed on merchant safety and qualification, preserves commercial unknown, and does not promote uncertain or rejected interpretations.
- Derived maturity and coverage are included in in-memory recommendation records and their state is explainable through priority reasons.
- Updated `test/v1-05-slice-c.test.js` to use genuine-shaped inputs and added coverage, missing-state, source-scope, limitation, determinism, and safety-gate coverage.
- Recommendation version remains `v1-05-slice-c-recommendation-2`. The repair fixes an input-contract defect without changing logical identity; completed/ignored continuity is preserved. There are currently zero genuine recommendation rows.

## Genuine dry-run after repair

- Input hash: `62eb7c3b03bf9912db577b4cd80530bff4fb831435e9de37e203d19cd88eb70d`
- Snapshot fingerprint: `60bda2230263125475bccf1a2fe8dfba82e8f3b6d55027e3d8b23bdd2bf7c114`
- Decision run: `1f9d0211-2737-4fbf-8837-5c474dc1e72a`
- Evaluation run: `95a409b8-ea35-4600-b678-fb9e3ae0550b`
- Candidates: 52; evaluation rows: 52; completed interpretations: 50; bounded out: 2; deterministic rejects: 0.
- Qualification: qualified 11; uncertain 31; rejected 8; unassessed 2.
- Merchant safety: safe 8; uncertain 44; unsafe 0.
- Derived evidence maturity: mixed 22; sparse 30; rich/unavailable/unknown 0.
- Recommendation status after the five-item cap: current 5; deferred 47.
- Interventions: improve existing product 6; improve internal linking 2; insufficient evidence 36; no action 8.
- Priority after the cap: medium 2; low 3; reassess 47; high 0.
- All 31 `retain_uncertain` candidates remain deferred with insufficient evidence. No uncertain or rejected interpretation became actionable.

### Eight safe actionable candidates

| Candidate | Evidence coverage | Result |
|---|---|---|
| XL Wash & Dry Set internal-link route (page targets unresolved by current label resolver) | mixed; available freshness + provider-limited completeness; single source; limitations present | medium; selected |
| Car drying towel internal-link route (page targets unresolved by current label resolver) | mixed; available freshness + provider-limited completeness; single source; limitations present | medium; selected |
| XL Drying Towel – 800GSM | sparse; partial freshness + partial completeness; multi-source; limitations present | low; selected |
| XL Wash & Dry Set | sparse; partial freshness + partial completeness; multi-source; limitations present | low; selected |
| Twisted Loop Power Pack | sparse; partial freshness + partial completeness; multi-source; limitations present | low; selected |
| Stubby Gun + Snow Foam Bundle | sparse; partial freshness + partial completeness; multi-source; limitations present | low before cap; excluded by cap |
| Heavy Duty Car Drying Towel – 1200GSM | sparse; partial freshness + partial completeness; multi-source; limitations present | low before cap; excluded by cap |
| Paint Protection Cloth | sparse; partial freshness + partial completeness; multi-source; limitations present | low before cap; excluded by cap |

All actionable rows retain established target attribution, aligned page fit, unknown commercial context, and evidence-limitation reasons. The two internal-link rows remain eligible; they are not demoted for being internal links.

### Top-five and tie-break audit

- Exact top five: the XL Wash & Dry Set internal-link route; the car-drying-towel internal-link route; XL Drying Towel – 800GSM; XL Wash & Dry Set; Twisted Loop Power Pack.
- Three excluded candidates: Stubby Gun + Snow Foam Bundle; Heavy Duty Car Drying Towel – 1200GSM; Paint Protection Cloth.
- Before repair: all eight actionable candidates were medium and 5/5 selected positions were determined by recommendation ID lexical order.
- After repair: two of five selected positions are separated by a meaningful evidence-maturity band (`mixed` above `sparse`); the remaining three positions are lexical tie-breaks among six otherwise equivalent sparse product actionables. The tie-break is last, deterministic, and visible in the priority reasons.

## Remaining gaps

- `commercial_context`: absent on 52/52 genuine merged rows; `commercial_signal=unknown` remains correct. No catalogue data was used as fake sales, stock, or margin context.
- `MERCHANT_PAGE_LABEL_GAP`: the current target resolver supplies products/categories but no site pages. Page-target recommendations therefore use generic page labels. Page-label repair was not performed.
- No other safety gap was found in this dry run.

## Tests

- Focused `test/v1-05-slice-c.test.js`: 18 passed.
- Relevant V1-05 tests: 69 passed.
- Full `npm test` with local loopback access: 1,272 tests, 1,251 passed, 21 skipped, 0 failed.
- `git diff --check`: passed.
- `npm run security:secrets`: 2,021 tracked files scanned, 0 findings.

## What was NOT done

- Provider/model calls: 0.
- Source calls/acquisition: 0.
- Recommendation rows persisted: 0.
- DataForSEO, WooCommerce, GSC, and public-site calls: 0.
- Page-label repair: not performed.
- No V1-06 work, live-site write, candidate modification, or recommendation generation.

## Current blocker / owner decision

No priority-contract blocker remains. The next separate owner-authorised repair is the known merchant page-label gap; recommendation persistence remains unauthorised in this task.

## Private/local state

- Genuine source snapshot and persisted decision/evaluation state remain in the existing isolated local destination `streetkingz-v105-live-20260927`.
- Existing private lossless commerce, site, Search Console, Product-input, candidate, and interpretation backups were not modified.
- No credentials, tokens, raw evidence, or customer-identifiable data are included here.

## Next step

Authorize and implement the smallest separate `MERCHANT_PAGE_LABEL_GAP` repair.

## Learning Layer

Evidence maturity is a coverage summary, not a sales score: it tells the engine how complete and current the supporting evidence is, while safety and qualification still decide whether action is allowed.
