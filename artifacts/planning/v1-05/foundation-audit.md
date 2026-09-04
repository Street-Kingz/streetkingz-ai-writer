# V1-05 Foundation Audit

- Date: 2026-09-04
- Status: PROPOSED — owner review required
- Scope: planning only; no V1-05 Product implementation

## Reuse

| Foundation | Evidence |
|---|---|
| Account → Business ownership and authenticated reads | `product-kernel/auth.js`, `product-kernel/repository.js`, accepted V1-02/V1-03 integration tests |
| Evidence provenance and validation patterns | `research/validation/evidence.js`, `research/core/canonical.js`, `product-intelligence/validation.js`, `business-intelligence/validation.js` |
| Product and Business fact extraction/conflict preservation | `product-intelligence/evidence.js`, `product-intelligence/ingestion.js`, `product-intelligence/resolution.js`, `business-intelligence/evidence.js`, `business-intelligence/resolution.js` |
| Evidence sufficiency and unknown-state handling | `research/aggregation/researchState.js` (`evaluateSufficiency`, `requirementResult`, `detectConflicts`) |
| V1-01 progressive evidence and target-attribution lessons | `milestones/V1-01_PROGRESSIVE_EVIDENCE_DECISION_GATE.md`, accepted `progressive-007-target-attribution` artefacts |
| V1-04 typed source/run boundary and unified read-only input | `GET /api/product/organic-evidence/snapshot`, `product-kernel/organicEvidenceSnapshot.js`, accepted Slice E artefact |
| V1-03 current-generation commerce truth | `commerce_stores`, `commerce_sync_generations`, typed Product/Category models and accepted V1-03 reconciliation artefacts |

## Adapt

| Foundation | Required adaptation |
|---|---|
| `research/aggregation/researchState.js` | Generalize topic/evidence grouping into candidate-source preparation; retain source IDs and unknowns, remove article-objective assumptions. |
| `product-intelligence` and `business-intelligence` contracts | Use as fact/provenance inputs, not as a recommendation schema; add Business-scoped candidate/recommendation identities and versioning. |
| `research/providers/googleSearchConsole.js` and DataForSEO normalizers | Consume only already durable V1-04 observations through the snapshot/evidence repositories; never recollect from V1-05. |
| `research/articleLiveEvidence.js` and bounded evidence helpers | Reuse bounded evidence-packet patterns only if the packet is generic and read-only; exclude article-specific query acquisition. |
| Confidence and unknown patterns | Replace unexplained scalar confidence with inspectable dimensions: evidence coverage, freshness, source limitation and interpretation uncertainty. |
| Existing interpretation validators | Adapt schema/evidence-reference checks to candidate and recommendation outputs; preserve fail-closed malformed-output behaviour. |

## Replace

| Foundation | Replacement boundary |
|---|---|
| Article-first research objective contracts | Generic candidate discovery across product, category, content, linking, monitor/defer, no-action and insufficient-evidence outcomes. |
| Historical article opportunity packet as Product output | A durable candidate record separated from a durable recommendation record, both portable outside an executor. |
| Single-objective source aggregation | A unified, source-specific evidence packet keyed to a frozen V1-04 snapshot identity. |

## Do not use

| Foundation | Reason |
|---|---|
| `selectSerpShortlist(...)` in `research/providers/dataForSeoSerpAdvanced.js` | Uses product-term matching, volume/difficulty and near-duplicate ranking; it is research-boundary shortlist logic, not generic Product prioritisation. |
| `OBJECTIVE_CONTRACTS` article objectives in `research/aggregation/researchState.js` as V1-05 architecture | They encode article/product-topic workflows and would make “find an article” the hidden default. |
| `research/articleEvidence.js`, `research/articleAdaptiveEvidence.js`, `research/articleEvidencePolicy.js` as recommendation authority | These support article research/claims, not generic opportunity selection or commercial prioritisation. |
| `business-intelligence/planning.js` representative-product sampling as opportunity ranking | It is bounded ingestion sampling, not a decision-quality ranking method. |
| Editorial planning/rendering and WordPress paths | V1-05 stops at a portable recommendation; no content generation, executor selection or write operation is authorised. |
| Historical founder-selected target as a hidden answer key | The accepted V1-01 Stubby Gun + Foam Lance result is evidence of a prior experiment, not a required V1-05 answer. |

## Missing Product capabilities

No durable generic candidate/recommendation model, decision-run identity,
candidate rejection ledger, generic intent/intervention contract, dependency
graph, commercial-vs-supporting-value distinction, or customer-neutral
recommendation projection currently exists. These are proposed future work only;
this task creates no code or migration.

