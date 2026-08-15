# Legacy Architecture Consolidation Plan

**Status:** Proposed only — no deletion or migration performed.  
**Parent milestone:** M0 Project Control + Legacy Architecture Audit  
**Approval:** Founder review required before any action.

## Scope and classification key

This audit treats a path as a component when it has an independent runtime, import or test boundary. Classifications are: **REUSE**, **MIGRATE**, **LEGACY-ONLY**, **DUPLICATE**, **DEAD**, **UNCERTAIN**. “Legacy” means old architecture, not automatically disposable.

## Legacy inventory (31 audit units)

| # | Component/path | Purpose | Class | Imported by / entry points | Tests | Newer equivalent | Eventual action / removal risk |
|---:|---|---|---|---|---|---|---|
| 1 | `app.js` | Express composition for health and `/generate-article` | LEGACY-ONLY | `index.js` | HTTP generation/no-provider tests | Future workflow router | Keep until a workflow entry point replaces it; HIGH route break risk. |
| 2 | `index.js` | Legacy server listener | LEGACY-ONLY | package `start` | HTTP tests | None yet | Replace only with approved workflow host; HIGH operational risk. |
| 3 | `routes/generateArticle.js` | Topic/keyword/product request route | LEGACY-ONLY | `app.js` | `test/http-generation.test.js`, fallback/no-provider | No direct Create SEO Article route | Retire after new direct workflow route has parity; HIGH API compatibility risk. |
| 4 | `services/articleGeneration.js` | Calls old router/prompt and injects article HTML | LEGACY-ONLY | legacy route | generation/http tests | `editorial/draft-run.js` | Migrate useful normalization only; HIGH semantic drift risk. |
| 5 | `prompts/articlePrompt.js` | Keyword/topic prompt with hardcoded catalogue | DUPLICATE | legacy article service | generation tests | `editorial/draft-prompt.js`, brief contracts | Remove after route retirement; HIGH if accidentally selected by UI. |
| 6 | `providers/router.js` | OpenAI/Gemini fallback JSON caller | LEGACY-ONLY | legacy article service | HTTP fallback tests | controlled provider abstractions | Keep temporarily for route, then retire; MEDIUM provider duplication. |
| 7 | `providers/openai.js` | Chat Completions JSON caller and cooldown | LEGACY-ONLY | `providers/router.js` | fallback tests | `interpretation/providers/openai.js`, Responses provider | Migrate cooldown ideas only; MEDIUM. |
| 8 | `providers/gemini.js` | Gemini JSON caller | LEGACY-ONLY | `providers/router.js` | fallback tests | no canonical Gemini for current target | Retire with route unless explicitly adopted; MEDIUM. |
| 9 | `utils/articleFormatting.js` | Hardcoded article HTML injection/cleanup and Street Kingz defaults | DUPLICATE | legacy article service | generation/editor tests | semantic editorial render/validation | Remove after article route; HIGH accidental hidden content injection. |
| 10 | `validators/articleHtml.js` | Regex HTML checks for legacy article output | DUPLICATE | legacy article service | generation tests | structured editorial validators | Replace/remove after parity; MEDIUM. |
| 11 | `catalogue/products.js` | Static product list embedded in old prompt | LEGACY-ONLY | old prompt/formatting | generation tests | Product Intelligence / catalogue | Retire after migration; HIGH stale product facts. |
| 12 | `extractors/productPage.js` | Generic HTML product extractor | MIGRATE | `services/productExtraction.js`, tests | product extraction tests | `product-intelligence/ingestion.js` and rendered evidence | Reuse parser concepts through adapter; MEDIUM duplicate facts. |
| 13 | `services/productExtraction.js` | URL fetch/cache/facts artifact producer | MIGRATE | scripts/legacy tooling | extraction tests | PIO ingestion | Migrate URL/cache contract; HIGH if two fact authorities diverge. |
| 14 | `renderers/productArtifacts.js` | Markdown for extracted product facts | MIGRATE | legacy extraction service | extraction tests | PIO review/report renderers | Adapt as discovery display; LOW. |
| 15 | `test/http-generation.test.js` | Legacy route/provider contract tests | LEGACY-ONLY | test runner | n/a | New workflow route tests | Replace only with approved route tests; HIGH false confidence if retained as canonical. |
| 16 | `test/http-fallback-cooldown.test.js` | Legacy provider fallback tests | LEGACY-ONLY | test runner | n/a | Controlled provider tests | Retire with provider router; MEDIUM. |
| 17 | `test/http-no-provider.test.js` | Legacy missing-key route tests | LEGACY-ONLY | test runner | n/a | Workflow preflight tests | Retire with route; LOW. |
| 18 | `test/generation.test.js` | Old article schema/prompt/formatting tests | LEGACY-ONLY | test runner | n/a | editorial draft/brief tests | Replace with direct-workflow tests; MEDIUM. |
| 19 | `rendering/wordpress-draft-proof.js` | Safe Gutenberg draft proof package | REUSE | tests/scripts | draft proof tests | Guarded draft path | Retain and connect to M7; LOW. |
| 20 | `rendering/wordpress-native.js` | Semantic-to-native WordPress renderer | REUSE | prototype/scripts/tests | native rendering tests | None | Canonical candidate for article draft output; LOW. |
| 21 | `brand/editor.js` | Deterministic brand editing utility | REUSE | brand/editor tests and legacy utilities | brand tests | editorial voice/validation | Reconcile exports later; MEDIUM duplicate behavior risk. |
| 22 | `brand/street-kingz.js` | Street Kingz-specific brand rules | LEGACY-ONLY | legacy/editor tests | brand tests | validated voice/profile artifacts | Keep as fixture/instance data; do not generalize; MEDIUM. |
| 23 | `brand/voice-profile.js` | Generic voice profile contract | REUSE | brand/editor tests | brand tests | editorial founder voice | Reuse/adapt; LOW. |
| 24 | `editorial/draft-provider.js` | Structured OpenAI editorial provider | REUSE | `editorial/draft-run.js`, product editor | editorial tests | canonical drafting provider | Keep; LOW. |
| 25 | `editorial/draft-run.js` | Approved-plan controlled draft runner | MIGRATE | scripts | editorial draft tests | M5 generic article workflow | Remove fixture assumptions, retain safety; HIGH if bypassed. |
| 26 | `editorial/revision-run.js` and revision contracts | Founder revision/correction lineage | REUSE | revision scripts/tests | revision tests | canonical human review | Keep and generalize; LOW. |
| 27 | `cornerstone/*` strategy pipeline | Strategy/page plan for cornerstone fixture | MIGRATE | scripts/artifacts/tests | cornerstone tests | M3/M4 article decision and brief | Extract generic contracts from fixture defaults; HIGH hardcoded path risk. |
| 28 | `generation/*` approval/brief/execution | Evidence-bound generation authorization | REUSE | interpretation/editorial scripts/tests | generation tests | M4/M5 workflow | Use as canonical safety boundary; LOW. |
| 29 | `interpretation/*` | Evidence context, decisions and briefs | REUSE | scripts/cornerstone/generation/tests | interpretation tests | M3 article decision | Connect to direct objective; LOW. |
| 30 | `research/*` | Evidence providers, aggregation and sufficiency | REUSE | scripts/interpretation/cornerstone/tests | research tests | M2/M3 | Canonical research layer; LOW. |
| 31 | `cms/*`, WordPress plugins and incident scripts | Authoritative read, guarded write, Elementor and draft safety | UNCERTAIN | product workflow, scripts, CMS tests | extensive CMS tests | Canonical implementation layer for runtime CMS code | Retain all now; split runtime CMS code from incident-only scripts in a later audit. HIGH if duplicated or altered. |

### Classification totals

The 31 audit units resolve to: **REUSE 9**, **MIGRATE 5**, **LEGACY-ONLY 13**, **DUPLICATE 3**, **DEAD 0**, **UNCERTAIN 1**. The CMS unit is conservatively marked UNCERTAIN because it combines clearly reusable runtime safety code with incident-only scripts; no deletion decision is implied.

## Existing legacy article path

```text
POST /generate-article
  → routes/generateArticle.js requires topic + primary_keyword + featured product name/URL
  → services/articleGeneration.js
  → prompts/articlePrompt.js (hardcoded catalogue/products.js and keyword/topic prompt)
  → providers/router.js
      → providers/openai.js (Chat Completions gpt-4o-mini)
      → providers/gemini.js fallback
  → article JSON
  → server injects featured box/CTA and formatting via utils/articleFormatting.js
  → validators/articleHtml.js
  → one retry at lower temperature on HTML issues
  → JSON response from route
  → no human review, guarded implementation or WordPress write in this path
```

Topic and keyword are mandatory at the route boundary. Product URL is a featured-link input, not a Product Intelligence starting point. Rendering is direct HTML injection; publishing stops at an API response.

## Target/current article path

```text
Product URL
  → [MISSING] direct workflow selector/input contract
  → [CONNECTED as standalone modules] Product Intelligence ingestion + validated PIO
  → [CONNECTED as standalone modules] Business Intelligence ingestion + validated BIO
  → [CONNECTED as standalone modules] Editorial Intelligence Context
  → [CONNECTED as scripts/artifacts] Product facts / DataForSEO keyword / SERP / Search Console providers
  → [CONNECTED] research aggregation + sufficiency
  → [PARTIAL] interpretation context / decision brief
  → [MISSING for direct article objective] article opportunity decision
  → [FIXTURE-ONLY] cornerstone strategy and editorial page plan
  → [FIXTURE-ONLY] generation brief / approved execution resolution
  → [FIXTURE-ONLY] semantic draft provider and validation
  → [CONNECTED] human revision/correction provenance
  → [CONNECTED as renderers/proofs] semantic/Gutenberg rendering
  → [PARTIAL] guarded draft implementation; no generic article handoff
  → [MISSING] end-to-end user review UI and approved article workflow
```

The important distinction is that most lower-level components exist, but the direct Create SEO Article orchestration and article opportunity decision are not connected. Existing scripts with fixed `artifacts/cornerstone/...` paths are not a generic workflow.

## Duplication and confusion risks

| Risk | Level | Failure mode |
|---|---|---|
| Two article generation paths | HIGH | UI or future route may call `/generate-article` and bypass product-first research, brief, validation and human review. |
| Two provider abstractions | HIGH | Legacy router can silently use Chat Completions/fallback behavior while controlled workflows use structured providers. |
| Static catalogue versus PIO | HIGH | `catalogue/products.js` and legacy prompt can contradict validated product facts. |
| Direct HTML versus semantic page model | HIGH | Legacy output can bypass component ownership, rendering and provenance. |
| Fixture-bound cornerstone scripts | HIGH | “Canonical” commands may operate on one hardcoded towel artifact rather than user input. |
| Two product representations | MEDIUM | `extractors/productPage.js` facts and PIO can diverge in authority and freshness. |
| Brand editor versus founder voice | MEDIUM | Different phrase rules can produce inconsistent copy or hide which profile is authoritative. |
| Draft proof versus guarded product writer | MEDIUM | Teams may confuse create-only Gutenberg proof with Elementor product mutation. |
| Incident scripts and production scripts | MEDIUM | Recovery tooling may be run as normal publishing workflow. |
| Historical artifacts and “latest” assumptions | MEDIUM | Timestamp selection could bind a proposal to the wrong lineage. |
| Legacy tests remain green | MEDIUM | Passing old HTTP/generation tests can obscure that the target workflow is disconnected. |

## Proposed consolidation order

1. Founder approves this document and the current path lock.
2. Add the direct Create SEO Article workflow contract/orchestrator without deleting legacy route code.
3. Connect URL input to validated PIO/BIO and research artifacts.
4. Extract generic contracts from fixture-bound cornerstone/page-plan scripts; keep fixtures as regression fixtures.
5. Connect article-specific opportunity decisions and brief generation.
6. Connect semantic drafting, review/correction and guarded draft handoff.
7. Add parity tests proving the new path, then migrate any genuinely reusable formatting/provider utilities.
8. Mark the old route and prompt explicitly deprecated; obtain separate founder approval for removal.
9. Remove or archive legacy route/provider tests only after replacement coverage exists.
10. Review incident-only scripts and generated ZIPs separately; do not fold them into runtime.

## Safe to keep now

`research/*`, `interpretation/*`, `generation/*`, validated intelligence layers, `editorial/revision-*`, semantic rendering, and mature CMS/WordPress safety infrastructure should remain. They are the strongest reusable foundation for M1–M7.

## Components to become canonical dependencies

Product/business intelligence contracts, Editorial Intelligence Context, research evidence/aggregation, interpretation decision briefs, generation approval/execution boundaries, semantic editorial contracts, human correction lineage, and guarded WordPress draft/write infrastructure.

## Components requiring migration

`services/productExtraction.js`/`extractors/productPage.js` URL handling into PIO ingestion; cornerstone strategy/page-plan fixture defaults into generic brief/plan inputs; `editorial/draft-run.js` fixture assumptions into the direct article workflow; selected generic formatting/brand utilities where they do not inject Street Kingz-specific copy.

## Likely removable after migration approval

The `/generate-article` route, `services/articleGeneration.js`, `prompts/articlePrompt.js`, legacy provider router/callers, static catalogue prompt dependency and legacy-only HTML validator/formatter are likely removable only after M1–M7 parity and explicit founder approval.

## Cannot yet be removed

Legacy route/provider tests, URL extraction compatibility, brand utilities, semantic renderers, and any script referenced by current artifacts or operational recovery documentation cannot be removed until dependency and replacement tests are demonstrated.

## Tests and documentation requiring updates later

Replace `test/http-generation.test.js`, `test/http-fallback-cooldown.test.js`, `test/http-no-provider.test.js` and legacy portions of `test/generation.test.js` with direct workflow contract tests. Update `README.md`, `Roadmap.md`, `Project_Vision.md`, `ARCHITECTURE.md` and package scripts after the canonical route exists. Do not remove old tests in M0.

## Runtime routes to retire eventually

`POST /generate-article` is the only clearly legacy runtime route. `/health` may remain as infrastructure health. No replacement route is proposed until M1 contract approval.

## Risks

- Deleting the old route before a direct workflow exists removes the only running HTTP generation path.
- Migrating formatter behavior may silently change HTML or commercial copy.
- Reusing fixture artifacts as live defaults can create Street Kingz-only behavior in a SaaS workflow.
- Removing provider fallback behavior without a deliberate provider policy can change availability and cost.
- CMS cleanup must not touch the mature Elementor/guarded-writer path while article workflow is being built.

## Non-actions in M0

No legacy files were deleted, renamed or refactored. No runtime behavior changed. No AI, external API or WordPress calls were made.
