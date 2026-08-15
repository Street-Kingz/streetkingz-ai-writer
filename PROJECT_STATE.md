# Street Kingz AI Ecommerce Assistant — Canonical Project State

**Document status:** M0 and M1 complete; M2 ready for review, not started
**Last updated:** 2026-08-15  
**Repository checkpoint:** `53d1aa8e655ed6a4ccb6e4786ba2eab8deedb313` plus the uncommitted M1 working tree described below

## What we are building

The Street Kingz AI Ecommerce Assistant is a workflow-driven ecommerce assistant, not another AI article writer. A merchant chooses an outcome; the system determines the research, decisions, brief, generation and validation needed inside that objective. It is commercially oriented toward sales, authority, conversion, UX and reduced manual work. Human approval remains required before publishing or CMS mutation.

The canonical shape is:

```text
Workflow selected
  → Product Understanding
  → Business Understanding where relevant
  → Research
  → Decision Making
  → Content Brief / Action Plan
  → AI Generation where appropriate
  → Validation
  → Human Review
  → Guarded implementation / publishing
```

The user chooses the objective. AI makes decisions within that objective. A discovery workflow may choose between article, product-page, category, linking or no-action outcomes. A direct workflow such as Create SEO Article must not be blocked merely because another workflow appears more valuable; “no article recommended” remains valid when evidence genuinely supports it.

## Current Path Lock

**Current objective: CREATE SEO ARTICLE v1**

**Goal:** Starting from a product URL, produce a researched, commercially worthwhile SEO article and finished draft without requiring the merchant to provide a topic, keyword, title, search intent, structure or prompt.

The merchant selects **Create SEO Article** and supplies the product. The first validation target is Street Kingz, but every boundary must remain generic/SaaS-capable.

**Operating lock:** Do not begin unrelated feature development while this objective is active. A blocker may be fixed only when it prevents the active milestone. Once resolved, development returns immediately to the parent milestone; a blocker does not become a new roadmap. Changing the current objective requires explicit founder approval.

## Next User-Visible Proof

Starting from a Street Kingz product URL:

1. Merchant selects Create SEO Article.
2. Merchant supplies no keyword, topic or prompt.
3. System understands the product.
4. System understands relevant business/customer context.
5. System performs relevant SEO/research discovery.
6. System identifies worthwhile article opportunities.
7. System selects or recommends the strongest article opportunity.
8. System creates a structured brief.
9. System generates the article using the canonical editorial architecture.
10. System validates it.
11. Merchant receives the finished article for review.
12. Nothing publishes without approval.

## Current capability map

Statuses below describe actual reusable capability, not file presence.

| Capability | Status | Evidence and current limitation |
|---|---|---|
| Workflow orchestration | M1 COMPLETE | `workflows/createSeoArticle.js` defines the generic `create_seo_article` contract and deterministic fail-closed orchestrator; `POST /workflows/create-seo-article` accepts a product URL alone. The legacy `/generate-article` remains isolated and operational. URL-to-evidence execution is intentionally deferred to M2. |
| Product Understanding | SUBSTANTIAL | `product-intelligence/`, `scripts/runProductIntelligence*`; validated PIO and human correction exist for the towel. Product URL-to-orchestration is not connected. |
| Business Understanding | SUBSTANTIAL | `business-intelligence/`, multi-pass interpretation and founder validation artifacts. No generic workflow entry point. |
| Editorial Intelligence Context | COMPLETE | `editorial-intelligence/context.js`; deterministic validated PIO+BIO projection. |
| Research aggregation | SUBSTANTIAL | `research/evidenceEngine.js`, `research/aggregation/researchState.js`; artifact-driven and objective contracts exist. |
| Product Facts research | SUBSTANTIAL | `research/providers/productFacts.js`; reusable provider and evidence contracts. |
| DataForSEO Keyword Ideas | SUBSTANTIAL | `research/providers/dataForSeoKeywordIdeas.js`, `scripts/buildKeywordIdeasEvidence.js`; approval/cache preconditions exist. |
| DataForSEO SERP research | SUBSTANTIAL | `research/providers/dataForSeoSerpAdvanced.js`, `scripts/buildSerpEvidence.js`; requires prior cached keyword evidence. |
| Google Search Console | PARTIAL | `research/providers/googleSearchConsole.js`, script/client/tests; property/auth and orchestration are not part of a user workflow. |
| Competitor research | PARTIAL | SERP evidence can expose ranking pages; no dedicated competitor-analysis decision workflow. |
| Research sufficiency | SUBSTANTIAL | evidence coverage and research-state validators; not yet wired to Create SEO Article selection. |
| Opportunity discovery | PARTIAL | `interpretation/`, decision briefs and objective contracts; no finished article-opportunity selector from a product URL. |
| Decision making | PARTIAL | interpretation and `generation/execution.js` resolve bounded decisions; article objective is not a first-class direct workflow. |
| Cornerstone strategy/brief | SUBSTANTIAL / FIXTURE-BOUND | `cornerstone/`; strategy, allowlists and validation work against `artifacts/cornerstone/...` fixtures, not arbitrary merchant input. |
| Page planning | SUBSTANTIAL / FIXTURE-BOUND | `editorial/plan.js`, `scripts/buildEditorialPagePlan.js`; deterministic and validated, but script defaults are hardcoded fixture paths. |
| Semantic editorial components | SUBSTANTIAL | `editorial/contracts.js`, `editorial/plan.js`, renderers and validators. |
| Controlled drafting | SUBSTANTIAL / FIXTURE-BOUND | `editorial/draft-run.js` and provider; requires approved fixture plan and explicit approval artifact. |
| Editorial validation | SUBSTANTIAL | structured page, founder revision, concept ownership and quality validators. |
| Brand/voice handling | SUBSTANTIAL | `brand/`, `editorial/founder-voice.js`, revision validation; some legacy Street Kingz-specific paths remain. |
| Human review | SUBSTANTIAL | founder review/correction artifacts and revision contracts; no unified SaaS review UI. |
| Human correction provenance | COMPLETE for validated slices | `editorial/productPageFounderCorrection.js`, `business-intelligence/founderValidation.js`, PIO correction modules. |
| Rendering | SUBSTANTIAL | semantic HTML/Gutenberg/WordPress renderers and visual artifacts. |
| WordPress article draft creation | SUBSTANTIAL / PROOF-BOUND | guarded draft plugin and `rendering/wordpress-draft-proof.js`; product/article end-to-end handoff is not connected. |
| Product Page Optimisation | SUBSTANTIAL / PAUSED | PIO+BIO+editorial proposal and adapter exist; implementation is paused at rendered-page guard. |
| Guarded product-page implementation | SUBSTANTIAL / BLOCKED IN CURRENT ADAPTER | Elementor-aware reader/writer, hashes, approval, rollback and protected targets exist; current candidate lacks required rendered-page guard. |
| Post-publication measurement | NOT STARTED | No connected measurement workflow. |
| GA4 integration | NOT STARTED | No GA4 client/module found. |

## Milestone roadmap to the first usable article

### M0 — Project control and legacy architecture consolidation (complete)

**Objective:** establish one canonical path, document legacy boundaries and lock Create SEO Article v1. Reuse `PROJECT_STATE.md`, this audit and `docs/LEGACY_CONSOLIDATION_PLAN.md`. **Status:** complete; the founder-directed M1 start signed off the path while preserving the rule that no legacy deletion or migration occurs without explicit approval.

### M1 — Create SEO Article workflow contract and orchestrator

**Status:** COMPLETE — 2026-08-15. **Objective:** expose a direct workflow whose only required merchant input is a product URL. `workflows/createSeoArticle.js` now provides the explicit input, ordered-stage, output, lineage and transition contract. `POST /workflows/create-seo-article` creates a validated deterministic run plan without a keyword, topic or prompt. Invalid, failed, foreign-lineage, out-of-order or objective-changing stage results fail closed and block downstream stages. The contract performs no AI, external API or WordPress calls and cannot publish. Deterministic proof: `artifacts/workflows/create-seo-article/development-proof.json`. Tests: focused workflow/HTTP/legacy tests pass; full `npm test` passes 838/838. M2 integration was not started.

### M2 — URL-to-evidence integration

**Status:** CURRENT — READY FOR REVIEW, NOT STARTED. **Objective:** connect product URL extraction/PIO and relevant business context to the research pipeline. Reuse `product-intelligence/ingestion.js`, `business-intelligence/ingestion.js`, `research/evidenceEngine.js` and cached provider clients. **Done when:** a run produces validated product/business/research artifacts from the URL with no manual path selection.

### M3 — Article opportunity decision

**Objective:** make article opportunity selection explicit within the direct Create SEO Article objective. Reuse research sufficiency, interpretation context, decision briefs and evidence validation. Missing: article-specific decision area, recommendation/no-op contract and direct-workflow boundary. **Done when:** the system recommends an article opportunity or a justified no-article result without silently switching workflows.

### M4 — Structured article brief and page plan

**Objective:** connect a selected article opportunity to a reusable brief and semantic page plan. Reuse `generation/brief.js`, `editorial/plan.js`, cornerstone allowlists and rendering contracts. **Done when:** an approved opportunity produces a validated, provenance-bound brief and plan without fixture-only paths.

### M5 — Controlled generation and validation

**Objective:** connect the existing semantic draft provider and validators to the generic brief/plan. Reuse `editorial/draft-run.js`, `editorial/validation.js`, brand/voice checks and deterministic artifact lineage. **Done when:** one controlled draft is produced, validated and marked awaiting human review with no automatic retry beyond the existing bounded policy.

### M6 — Human article review/correction

**Objective:** expose the existing revision/correction provenance for arbitrary merchant review. Reuse revision contracts, founder voice, correction lineage and human validation. **Done when:** a merchant can approve, correct or reject a draft while preserving original AI output and effective corrected values.

### M7 — WordPress draft handoff

**Objective:** pass an approved semantic article to the existing guarded draft writer. Reuse Gutenberg rendering, execution contracts, capability restrictions, verification and cleanup. **Done when:** one approved article can be created as a draft, read back and verified, with zero automatic publication.

## Deferred work

**Product Page Optimisation: PAUSED / DEFERRED — NOT ABANDONED.** Current state: Product Page workflow, PIO/BIO integration, founder correction lineage, proposal validation, protected-substructure guard and fresh-state candidate preparation exist. The current Guarded Writer dry-run is blocked because required `rendered_page` guard data is not supplied through the current integration path. Validation was not weakened; no approval mutation, execution or WordPress write occurred.

Latest corrected proposal SHA: `ab196b959b5ee2be2b39cc9599e471a53030409cc305ba20fee3265ab7a0fab9`  
Latest candidate identifier: `ef308cbe2a79be9a4196e89e125bde5c135c9e52e329d1a89b9ac6734a2d95af`

Rendered-page-guard work is explicitly deferred during M0 and must not become a parallel roadmap.

## Operating rules

### Before starting any milestone

Read this document. Confirm the current objective, current milestone, definition of done and that proposed work directly advances it.

### Blocker rule

Record the blocker, fix only the smallest bounded cause, record the resolution, then return immediately to the parent milestone. Do not let adjacent work silently become the project direction.

### Milestone completion rule

A milestone is incomplete until this document records status, capability changes, remaining gaps, blockers, deferred work, decisions, test state, artifacts and the next milestone.

### Scope-change rule

Changing the current objective requires explicit founder approval.

### Canonical architecture rule

Search for an existing implementation before creating a subsystem. Reuse canonical infrastructure where practical; inconvenience is not sufficient reason for a parallel implementation.

### Legacy rule

Do not extend LEGACY components with new product features unless an explicitly approved migration requires it.

## Decision Log

1. The project is workflow-driven, not prompt-driven.
2. The user chooses the objective; AI makes decisions within that objective.
3. Product URL/product understanding is the primary starting point for product-led workflows.
4. Research precedes content generation.
5. Content may legitimately not be created when opportunity is insufficient.
6. Human approval is required before publishing.
7. Existing infrastructure is reused before parallel infrastructure is created.
8. Product Page implementation is paused while Create SEO Article v1 is current priority.
9. The legacy writer must be audited before removal.
10. Blocker work returns to its parent milestone after resolution.

## Milestone History

### M0 — Project Control + Legacy Architecture Audit

**Status:** COMPLETE / PATH SIGNED OFF FOR M1
**Date:** 2026-08-15  
**Files changed:** `PROJECT_STATE.md`, `docs/LEGACY_CONSOLIDATION_PLAN.md`  
**Tests:** existing `npm test` baseline; no tests changed  
**External activity:** none; AI calls 0, external APIs 0, WordPress calls/writes 0  
**Summary:** audited legacy article route and current evidence/intelligence/editorial/CMS paths; documented the canonical Create SEO Article path, gaps, duplication risks and proposed consolidation order.  
**Next decision:** legacy migration/removal still requires explicit approval; none occurred in M1.

### M1 — Create SEO Article Workflow Contract + Orchestrator

**Status:** COMPLETE
**Date:** 2026-08-15
**Recovery classification:** A — the interrupted session had written no meaningful M1 work; HEAD and the tracked worktree still matched the M0 audit checkpoint. The unrelated untracked authoritative-reader ZIP was preserved.
**Files changed:** `app.js`, `package.json`, `PROJECT_STATE.md`; added `workflows/createSeoArticle.js`, `routes/createSeoArticleWorkflow.js`, `scripts/proveCreateSeoArticleWorkflow.js`, `test/create-seo-article-workflow.test.js`, `test/http-create-seo-article-workflow.test.js`, and `artifacts/workflows/create-seo-article/development-proof.json`.
**Contract:** product URL is the sole required merchant content input; merchant topic, keyword and prompt fields are rejected. Eight ordered stages have explicit expected outputs and immutable workflow/objective/input lineage. Only validated, complete, correctly bound results advance. Invalid or failed results fail the run and block every downstream stage.
**Entry point:** `POST /workflows/create-seo-article` returns the deterministic plan. It is additive and isolated from the operational legacy `POST /generate-article` route.
**Tests:** 5 focused contract/orchestrator tests pass; 11 focused workflow and legacy HTTP tests pass; full `npm test` passes 838/838.
**External activity:** AI calls 0, external API calls 0, WordPress calls/writes 0, legacy files deleted 0.
**Scope:** M2 URL-to-evidence integration was not started; Product Page work and legacy cleanup were untouched.
**Next milestone:** M2 — URL-to-Evidence Integration, ready for review only.
