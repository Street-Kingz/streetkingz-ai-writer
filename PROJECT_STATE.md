# Street Kingz AI Ecommerce Assistant — Canonical Project State

**Document status:** M0, M1, M2, M3 and M3A complete; M4 ready to begin
**Last updated:** 2026-08-16
**Repository checkpoint:** `87acf1722de22c20eb867a1d1064bf4719363614` plus the uncommitted M3 working tree

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

**Current milestone: M4 — Structured Article Brief + Page Plan**

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
| Workflow orchestration | M2 COMPLETE | `workflows/createSeoArticle.js` defines the generic `create_seo_article` contract and deterministic fail-closed orchestrator; `workflows/createSeoArticleIntelligence.js` resolves trusted validated PIO/BIO and deterministic EIC with lineage-bound hashes; `POST /workflows/create-seo-article` accepts a product URL alone and reaches `research` READY without executing research. The legacy `/generate-article` remains isolated and operational. |
| Product Understanding | SUBSTANTIAL / CONNECTED FOR M2 SLICE | `product-intelligence/`, `scripts/runProductIntelligence*`; validated PIO and human correction exist for the towel. M2 resolves exact validated product intelligence from the canonical URL boundary and pauses when validation is unavailable. |
| Business Understanding | SUBSTANTIAL / CONNECTED FOR M2 SLICE | `business-intelligence/`, multi-pass interpretation and founder validation artifacts. M2 resolves exact validated business intelligence by domain and pauses when validation is unavailable. |
| Editorial Intelligence Context | COMPLETE / CONNECTED FOR M2 SLICE | `editorial-intelligence/context.js`; deterministic validated PIO+BIO projection is generated/reused and provenance-bound to the workflow. |
| Research aggregation | COMPLETE / CONNECTED FOR M3 SLICE | `research/evidenceEngine.js`, `research/aggregation/researchState.js`; article-specific objective, provenance and sufficiency are connected to Create SEO Article. |
| Product Facts research | COMPLETE / CONNECTED FOR M3 SLICE | `research/productFactsProjection.js` adapts validated PIO deterministically into the existing Product Facts provider contract. |
| DataForSEO Keyword Ideas | SUBSTANTIAL | `research/providers/dataForSeoKeywordIdeas.js`, `scripts/buildKeywordIdeasEvidence.js`; approval/cache preconditions exist. |
| DataForSEO SERP research | SUBSTANTIAL | `research/providers/dataForSeoSerpAdvanced.js`, `scripts/buildSerpEvidence.js`; requires prior cached keyword evidence. |
| Google Search Console | PARTIAL | `research/providers/googleSearchConsole.js`, script/client/tests; property/auth and orchestration are not part of a user workflow. |
| Competitor research | PARTIAL | SERP evidence can expose ranking pages; no dedicated competitor-analysis decision workflow. |
| Research sufficiency | SUBSTANTIAL | evidence coverage and research-state validators; not yet wired to Create SEO Article selection. |
| Opportunity discovery | COMPLETE / CONNECTED FOR M3 SLICE | `workflows/createSeoArticleOpportunity.js` derives bounded candidates and validates article outcomes from evidence. |
| Decision making | COMPLETE / CONNECTED FOR M3 SLICE | Create SEO Article now uses a bounded controlled opportunity interpretation with strict evidence validation and no volume-only fallback; it produces validated article outcomes without switching objectives or generating content. |
| Current SEO Guidance | COMPLETE / CONNECTED FOR M3A | Allowlisted first-party Google, Bing, Schema.org and W3C/WAI guidance is represented by validated immutable snapshots with hashes, freshness and workflow lineage; guidance remains separate from search evidence and intelligence. |
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
| Post-publication measurement | PARTIAL | Google Search Console evidence capability already exists. There is no publication-linked measurement workflow yet and no closed learning loop from published article performance back into decisions. GA4 integration remains NOT STARTED. |
| GA4 integration | NOT STARTED | No GA4 client/module found. |

## Milestone roadmap to the first usable article

### M0 — Project Control + Legacy Architecture Audit (complete)

**Objective:** establish one canonical path, document legacy boundaries and lock Create SEO Article v1. Reuse `PROJECT_STATE.md`, this audit and `docs/LEGACY_CONSOLIDATION_PLAN.md`. **Status:** complete; the founder-directed M1 start signed off the path while preserving the rule that no legacy deletion or migration occurs without explicit approval.

### M1 — Create SEO Article workflow contract and orchestrator

**Status:** COMPLETE — 2026-08-15. **Objective:** expose a direct workflow whose only required merchant input is a product URL. `workflows/createSeoArticle.js` now provides the explicit input, ordered-stage, output, lineage and transition contract. `POST /workflows/create-seo-article` creates a validated deterministic run plan without a keyword, topic or prompt. Invalid, failed, foreign-lineage, out-of-order or objective-changing stage results fail closed and block downstream stages. The contract performs no AI, external API or WordPress calls and cannot publish. Deterministic proof: `artifacts/workflows/create-seo-article/development-proof.json`. Tests: focused workflow/HTTP/legacy tests pass; full `npm test` passes 838/838. M2 later connected this contract to validated intelligence without changing the M1 contract.

### M2 — URL-to-evidence integration

**Status:** COMPLETE — 2026-08-15. **Objective:** connect product URL extraction/PIO and relevant business context to the research pipeline. M2 adds the thin `workflows/createSeoArticleIntelligence.js` boundary, which resolves exact validated PIO/BIO artifacts, verifies actual SHA-256 content hashes and identity, creates or validates deterministic EIC, and binds provenance to the existing M1 stages. Missing validation pauses with an actionable required stage; malformed, ambiguous, mismatched, unsupported or tampered artifacts fail closed. The Street Kingz proof reaches `product_understanding` COMPLETE → `business_understanding` COMPLETE → `research` READY; research itself is not executed. No durable persistence, AI, external API, WordPress or publishing path was added.
**Tests:** focused M1/M2 workflow and HTTP tests pass; full `npm test` passes 845/845. **Development proof:** `artifacts/workflows/create-seo-article/m2-url-to-evidence-proof.json`.

### M3 — Research Execution + Article Opportunity Decision

**Status:** COMPLETE — 2026-08-16. **Objective:** execute bounded product-led research and make article opportunity selection explicit within the direct Create SEO Article objective. M3 adds deterministic validated-PIO → Product Facts projection, automatic product-derived research seeds, an article-specific research objective, bounded candidate selection and validated `ARTICLE_RECOMMENDED`, `NO_ARTICLE_RECOMMENDED` and `RESEARCH_INSUFFICIENT` outcomes. The offline Street Kingz proof starts with `product_url` only, selects `microfiber towel for drying car` as a `supporting_article`, treats Search Console as optional and preserves unknown page-level competitor coverage. The workflow reaches `article_brief READY`; no brief is generated, no article is generated and nothing publishes.
**Tests:** focused M3 tests pass 4/4; full `npm test` passes 849/849 with localhost permission. **Development proof:** `artifacts/workflows/create-seo-article/m3-research-opportunity-proof.json`.
**External activity:** one bounded injected AI decision call in the offline proof; external provider/API calls 0, WordPress calls/writes 0, publishing attempts 0.
**Scope:** no durable persistence, competitor crawler, research expansion, article brief generation, article generation, legacy cleanup or Product Page work was started.

**Decision-quality hardening:** advisor review identified that the initial deterministic volume-ordered fallback was not strategically sufficient. The bounded correction now sends only a filtered candidate/evidence packet through the existing controlled structured-output pattern, validates article type, intent, candidate queries and evidence references, performs one no-retry controlled decision call, and pauses as `decision_unavailable` rather than pretending highest volume is the strategy when interpretation is unavailable. The offline proof uses an injected `gpt-5.6-sol`-labelled fixture provider with one controlled call, selects `microfiber towel for drying car` from supplied candidates, records `supporting_article` and `commercial_investigation`, and generates a founder-readable review without generating a brief or article. External provider/API calls: 0.

### M3A — Current SEO Guidance & Search Standards

**Status:** COMPLETE — 2026-08-16. A bounded trusted-source manifest and retrieval boundary now accepts only explicitly allowlisted HTTPS authorities, normalizes content deterministically, records source hashes and creates immutable validated snapshots with configurable freshness. Google Search guidance is primary for Google-specific questions and now explicitly covers Search Essentials, spam policies, helpful/people-first content, generative-AI content, AI Features (AI Overviews/AI Mode), ranking systems, structured data and How Search Works. Bing remains secondary, Schema.org/W3C remain standards evidence, and no third-party SEO commentary enters the authoritative snapshot. The M3 opportunity packet receives compact guidance records as a distinct evidence class, validates current snapshot provenance, and carries snapshot ID/hash into the opportunity stage lineage and technical decision artifact. Stale, invalid or absent guidance does not silently fall back to model memory. The offline proof uses a new immutable frozen snapshot and product URL only; no brief, article or publishing is performed.
**Proof:** `artifacts/workflows/create-seo-article/m3-research-opportunity-proof.json`; current snapshot: `artifacts/workflows/create-seo-article/m3-seo-guidance-snapshot-v2.json`; prior snapshot preserved at `artifacts/workflows/create-seo-article/m3-seo-guidance-snapshot.json`.
**Tests:** focused guidance/M3 tests pass 11/11; full `npm test` passes 856/856; `git diff --check` passes.
**External activity:** official source verification only; no DataForSEO, Search Console, WordPress or publishing calls. The offline proof uses one injected controlled AI decision call.

### M4 — Structured article brief and page plan

**Status:** NOT STARTED. **Objective:** connect a selected article opportunity to a reusable brief and semantic page plan. Reuse `generation/brief.js`, `editorial/plan.js`, cornerstone allowlists and rendering contracts. **Done when:** an approved opportunity produces a validated, provenance-bound brief and plan without fixture-only paths.

### M5 — Controlled generation and validation

**Objective:** connect the existing semantic draft provider and validators to the generic brief/plan. Reuse `editorial/draft-run.js`, `editorial/validation.js`, brand/voice checks and deterministic artifact lineage. **Done when:** one controlled draft is produced, validated and marked awaiting human review with no automatic retry beyond the existing bounded policy.

### M6 — Human article review/correction

**Objective:** expose the existing revision/correction provenance for arbitrary merchant review. Reuse revision contracts, founder voice, correction lineage and human validation. **Done when:** a merchant can approve, correct or reject a draft while preserving original AI output and effective corrected values.

### M7 — WordPress draft handoff

**Objective:** pass an approved semantic article to the existing guarded draft writer. Reuse Gutenberg rendering, execution contracts, capability restrictions, verification and cleanup. **Done when:** one approved article can be created as a draft, read back and verified, with zero automatic publication.

## Deferred work

**Product Page Optimisation: PAUSED / DEFERRED — NOT ABANDONED.** Current state: Product Page workflow, PIO/BIO integration, founder correction lineage, proposal validation, protected-substructure guard and fresh-state candidate preparation exist. The current Guarded Writer dry-run is blocked because required `rendered_page` guard data is not supplied through the current integration path. Validation was not weakened; no approval mutation, execution or WordPress write occurred.

### Outcome Measurement & Learning Loop — DEFERRED

Freeze a pre-implementation baseline tied to page identity, proposal/recommendation identity and hash, target queries, rankings, impressions, clicks, CTR, landing-page traffic, conversions, revenue where available, Search Console/GA4 metrics, relevant page state and known confounders. Compare workflow-appropriate post-change periods and distinguish measured change from attribution confidence. Future outcomes may be positive, neutral, negative or inconclusive, creating a recommendation → baseline → implementation → measurement → outcome → learning history. No measurement or learning-loop implementation has started.

### Expert Benchmarking & Product Validation — DEFERRED

Compare bounded system recommendations against independent human SEO practitioners through the same-task, blinded, structured-assessment process, followed by disagreement analysis and eventual real-world outcome comparison. Assess factual accuracy, SEO reasoning, commercial relevance, prioritisation, practicality, evidence quality, unnecessary work, expected impact, time and cost. Expert disagreement must be classified by the appropriate layer—knowledge, research, decision, interpretation/prompt, validation or subjective preference—before any system change; one disagreement must not trigger fine-tuning. Repeated findings and measured outcomes may later support evaluation or fine-tuning datasets and credible SaaS case-study evidence. No benchmarking or marketing claim has been implemented.

### Current SEO Guidance — COMPLETE / M3A

The repository now has a bounded, validated and versioned trusted-source guidance snapshot capability. M3A is complete; M4 remains NOT STARTED.

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

### Vertical Slice Rule

Milestones should optimise for the smallest end-to-end usable vertical slice rather than attempting to perfect each subsystem independently.

When a subsystem is already sufficient to support the current user-visible proof, prefer connecting and exercising it over expanding it.

Do not spend multiple milestones perfecting an intermediate layer when a bounded implementation can move the workflow closer to real merchant use.

Hardening discovered during an end-to-end run is valid blocker work.

Once resolved, return immediately to the active milestone/path.

The purpose of this rule is to stop development becoming:

research
→ more research infrastructure
→ more interpretation infrastructure
→ more editorial infrastructure

without ever producing the user-visible outcome.

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
**Scope:** M2 URL-to-evidence integration was completed in the subsequent M2 milestone; Product Page work was untouched; legacy cleanup was not started.
**Legacy cleanup:** not started.
**Next milestone:** M4 — Structured Article Brief + Page Plan; M4 is current and NOT STARTED.

### M2 — URL-to-Evidence Integration

**Status:** COMPLETE
**Date:** 2026-08-15
**Files changed:** `workflows/createSeoArticle.js`, `workflows/createSeoArticleIntelligence.js`, `routes/createSeoArticleWorkflow.js`, `scripts/proveCreateSeoArticleM2.js`, `test/create-seo-article-m2.test.js`, `test/http-create-seo-article-m2.test.js`, `artifacts/workflows/create-seo-article/m2-url-to-evidence-proof.json`, `PROJECT_STATE.md`.
**Integration:** URL-only Create SEO Article runs resolve exact validated PIO and BIO candidates through an injected resolver, verify structural validators, identity and actual artifact hashes, then create or reuse and validate deterministic EIC. Product and business stage results bind artifact identifiers, hashes, object/business IDs and source fingerprints to the M1 workflow lineage. Missing validation pauses safely; invalid, corrupt, ambiguous, mismatched or untrusted artifacts fail closed. The workflow stops at `research` READY; research is not implemented or executed.
**Tests:** focused M1/M2 workflow and HTTP tests pass; full `npm test` passes 845/845; `git diff --check` passes.
**External activity:** AI calls 0, external API calls 0, WordPress calls/writes 0, publishing attempts 0.
**Scope:** no durable workflow persistence, research implementation, legacy cleanup or Product Page work was started.
**Next milestone:** M3 — Research Execution + Article Opportunity Decision.

### M3 — Research Execution + Article Opportunity Decision

**Status:** COMPLETE
**Date:** 2026-08-16
**Files changed:** `package.json`, `research/contracts/schemas.js`, `research/aggregation/researchState.js`, `research/providers/productFacts.js`, `research/providers/dataForSeoKeywordIdeas.js`, `research/providers/dataForSeoSerpAdvanced.js`, `research/productFactsProjection.js`, `workflows/createSeoArticleM3.js`, `workflows/createSeoArticleOpportunity.js`, `routes/createSeoArticleWorkflow.js`, `scripts/proveCreateSeoArticleM3.js`, `test/create-seo-article-m3.test.js`, `artifacts/workflows/create-seo-article/m3-research-opportunity-proof.json`, `PROJECT_STATE.md`.
**Integration:** validated PIO/BIO/EIC now feed bounded product-led research through a deterministic PIO → Product Facts adapter. Research seeds are automatic and capped at two; keyword candidates are capped at 25; SERP inspection is capped at five; Search Console remains optional. The article-specific research objective produces a validated sufficient state, then a bounded evidence-backed opportunity decision. `ARTICLE_RECOMMENDED` advances `article_brief` to READY without generating a brief. `NO_ARTICLE_RECOMMENDED` and `RESEARCH_INSUFFICIENT` remain distinct and do not advance.
**Tests:** focused M3 tests pass 4/4; full `npm test` passes 849/849 with localhost test binding permission; `git diff --check` passes.
**External activity:** one bounded injected AI decision call in the offline proof; external provider/API calls 0, WordPress calls/writes 0, publishing attempts 0.
**Scope:** no durable persistence, research platform expansion, article brief generation, article generation, legacy cleanup or Product Page work was started.
**Next milestone:** M4 — Structured Article Brief + Page Plan, NOT STARTED.
