# Content Intelligence and Evidence Engine Roadmap

## V1 objective and constraints

V1 will prove one complete product-led content pipeline using Street Kingz and its Heavy Duty Drying Towel page as the initial real-world customer and validation case:

`https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/`

The pipeline will move from product understanding through research, opportunity selection, briefing, drafting, validation and WordPress-ready draft output. It must demonstrate that research happens before writing and that the system can recommend an outcome rather than blindly generate an article.

V1 is a single-user internal tool. It will remain a modular Node.js application run through simple commands and the existing HTTP service where appropriate. It will not introduce a database, queue, background worker, microservices or polished interface.

Intermediate outputs will be stored as local, human-readable JSON and Markdown artifacts. Every stage will:

- Read explicit versioned input artifacts.
- Write explicit versioned output artifacts.
- Be inspectable without running the application.
- Be independently rerunnable without rerunning earlier successful stages.
- Record its source inputs, generation time, schema version and relevant configuration.
- Avoid silently overwriting reviewed artifacts.

The following information domains must remain separate throughout the pipeline:

- **Brand knowledge:** tone, commercial principles, editorial rules and approved claims.
- **Product facts:** factual product information gathered from authoritative first-party sources.
- **Research evidence:** keyword, SERP, competitor and site evidence returned by external or internal sources.
- **AI interpretation:** evidence-backed findings and recommendations about what should change and why. Draft content belongs only to the later, human-approved generation stage.

Research artifacts must be reusable by future product pages, buying guides, comparison pages, FAQs and articles. Final HTML must not become the canonical source for research or content planning.

The existing `GET /` and `POST /generate-article` behaviour is a compatibility boundary. It must continue to accept the same fields and return the same response shape while V1 is developed.

The underlying product extraction, evidence collection, interpretation and decision architecture must remain generic. Street Kingz-specific URLs, catalogue data and brand rules are customer inputs, not engine assumptions. No final commercial product name is selected in V1.

## Product and engineering principles

- AI does not perform research. Providers collect evidence; AI interprets the collected evidence only after the engine determines that sufficient evidence exists for the requested objective.
- Provider contracts remain independent. DataForSEO is the preferred V1 implementation, not a permanent hard dependency.
- Recurring manual evidence collection is not part of the intended normal workflow. Manual imports are fallback and debugging tools only.
- Paid APIs and subscriptions are acceptable when they materially improve evidence quality or eliminate meaningful manual work. The project must not optimise for zero cost at the expense of automation or output quality.
- New providers, datasets or processing stages are added only when they materially improve the final decision or content, or remove meaningful manual work.
- Targeted competitor-page extraction remains available when actual headings, claims, structure, product information or other page-level content must be inspected.
- Reddit is not a mandatory V1 dependency. It may be evaluated later as a qualitative provider only if evidence shows material benefit.

## Intended normal workflow

```text
Evidence
    ↓
Research state
    ↓
Current Page Inventory / Gap Matrix
    ↓
Decision Brief
    ↓
GPT-5.6 Sol interpretation and deterministic validation
    ↓
Human approval of individual decisions
    ↓
Constrained generation
    ↓
Human approval of generated changes
    ↓
Publication
    ↓
Measurement
```

Provider selection, cache resolution, evidence collection and sufficiency checks happen inside `Run`; recurring manual research is not a user step.

## Artifact flow

```text
Product facts
    ↓
DataForSEO Keyword Ideas
    ↓
DataForSEO Google Organic SERP Advanced
    ↓
Google Search Console
    ↓
Evidence aggregation and objective-specific sufficiency
    ↓
Current Page Inventory and Gap Matrix
    ↓
Compact deterministic Decision Brief
    ↓
Validated interpretation / strategy
    ↓
Decision-level human approval
    ↓
Constrained generation and validation
    ↓
Generated-change human approval
    ↓
Publication and measurement
```

Each arrow is a stage boundary, not an instruction to combine stages into one prompt. Later phases may consume earlier artifacts, but they must not rewrite facts or evidence to fit a preferred recommendation.

## Production publishing baseline

**Status: Proven in production on 2026-08-09.** Guarded Writer v0.1.10 completed the first successful end-to-end guarded implementation against Product 70 and Elementor template 2003. The immutable execution report is `artifacts/implementation/heavy-duty-drying-towel-1200gsm/production-v1/guarded-write-execution-v0.1.10-001/validation-report.json`.

The single authorised request changed exactly `post_title`, `post_excerpt`, `c80e718.settings.editor` and `40869c27.settings.editor`. The expected raw Elementor candidate and strict parsed candidate both matched after persistence; unexpected paths and scope leaks were zero. The safety widget, FAQ questions, unrelated Elementor state, product content, slug, status, metadata, taxonomy, price, stock, media and all other products/templates remained unchanged. CMS and rendered-page verification passed. The one-time execution ID was atomically claimed and permanently consumed, the execution audit finished `succeeded`, the runtime contract was removed, and rollback was not required.

Guarded Writer v0.1.10 is therefore the frozen production baseline. Normal content runs change runtime approval and one-time contract records, not plugin code or ZIPs. Plugin deployment is required only for an independently justified code change.

The production invariants are:

- Dedicated Reader and Writer identities with narrow custom capabilities and no generic CMS editing rights.
- Route-scoped non-cacheable protected REST responses.
- Fixed product, template, widget and field scope.
- Fresh authoritative reads, strict current-state hashes and approved-target hashes.
- Separate content-generation authority, explicit human approval and one-time CMS mutation authority.
- Runtime approval plus a separately installed execution contract with a high-entropy one-time ID, atomic claim, replay rejection and permanent `failed_after_claim` consumption.
- A fresh exact rollback snapshot immediately before mutation.
- Surgical raw Elementor value-token replacement with no full-document decode/reserialisation and no `Elementor Document::save()`.
- Exact persisted raw candidate verification, strict parsed verification, protected-field verification and rendered-page verification.
- Fail-closed handling of any unexpected byte, path, type, field or rendered difference.
- Human approval remains mandatory and automatic publication remains disabled.

Historical approaches and incident evidence remain part of the audit record. `Elementor Document::save()` and whole-document Elementor persistence are retired for normal guarded mutation. Surgical raw Elementor value replacement is the current production architecture. The Template 2003 Recovery plugin remains incident-only emergency tooling and is not part of normal publishing.

## Delivery status and upcoming milestones

### Completed

- [x] Legacy service characterisation and mechanical modularisation with compatibility tests.
- [x] Phase 2 rendered product-page extraction and deterministic snapshot reuse.
- [x] Canonical, provenance-backed product facts for the Heavy Duty Drying Towel.
- [x] Evidence Engine foundation: contracts, provider isolation, coverage, provenance validation, deterministic IDs, aggregation artifacts and human-readable summaries.
- [x] Product Facts provider with deterministic caching.
- [x] DataForSEO Keyword Ideas provider with raw/normalised separation, deterministic caching, configuration validation and cost controls.
- [x] One controlled live Keyword Ideas validation and a zero-request cache-only rerun producing evidence, coverage and summary artifacts at the recorded $0.024 cost.
- [x] DataForSEO Google Organic SERP Advanced provider with deterministic keyword shortlisting, independent per-keyword caching, provenance and cost controls.
- [x] One controlled five-keyword SERP validation and a zero-request cache-only rerun. The live run proved organic results, People Also Ask, related searches, popular products, videos, perspectives, discussions/forums and AI Overviews.
- [x] Google Search Console provider and controlled live validation with a zero-request cache-only rerun. The live run proved first-party query, page and query/page performance evidence covering clicks, impressions, CTR and average position, plus deterministic keyword and site-page relationships.
- [x] Primary V1 evidence-source layer: Product Facts, DataForSEO Keyword Ideas, DataForSEO Google Organic SERP Advanced and Google Search Console.
- [x] Deterministic cross-provider research-state aggregation with inspectable keyword/topic, site-page, external-page/domain, SERP-feature and Search Console relationship groups.
- [x] Objective-specific evidence-sufficiency contracts for product-page improvement, supporting content and content-opportunity identification, with explainable `sufficient`, `partial`, `insufficient` and `unavailable` states.
- [x] Deterministic Current Page Inventory and Gap Matrix separating known page state from external opportunity evidence.
- [x] Compact, model-independent Decision Brief as the permanent primary model-facing interpretation representation.
- [x] Canonical citation architecture covering only evidence explicitly exposed to interpretation.
- [x] GPT-5.6 Sol interpretation with strict Structured Outputs. GPT-5.6 Sol is the preferred production interpretation model; GPT-4.1 is no longer on the critical path.
- [x] Deterministic interpretation validation, immutable controlled AI calls, human product-value review and clean production interpretation validation.
- [x] Human-approved constrained Product-70 generation with strict output contracts, deterministic validation and generated-change review.
- [x] First production guarded implementation using Writer v0.1.10: exact four-target mutation, surgical Elementor persistence, strict raw/type preservation, one-time execution, CMS verification and rendered verification.
- [x] Runtime approval and execution-contract control plane, eliminating plugin redeployment from normal content runs.

### Current

- [x] Fixture-first deterministic cornerstone research packet and structured content brief builder using cached Product Facts, Keyword Ideas, SERP, Search Console and research-state evidence, with strict traceability, uncertainty, internal-link and cannibalisation validation plus JSON/Markdown output.
- [x] Controlled AI-assisted cornerstone strategy refinement from the bounded packet, with packet-derived evidence/product/link enums, stable entity IDs, deterministic canonical resolution, immutable one-call artifacts, fail-closed validation and separate usefulness review. The accepted production fixture is `PASS_WITH_WARNINGS` pending human review of evidence gaps and cannibalisation.
- [x] Versioned Street Kingz component-based editorial page contract and deterministic page-plan builder. Component requirements are declared per page plan/type rather than imposed globally. The semantic layer fixes the approved component types, order, evidence/product/link bindings and media requirements without arbitrary HTML or WordPress/Elementor knowledge. The drying-towel plan is human-approved.

### Next

- [x] Complete and human-approve the drying-towel semantic page, including the final bounded wording correction. The immutable final artifact is `artifacts/cornerstone/best-car-drying-towel/final-human-approved-v2/`.
- [x] Implement the generic offline Street Kingz component renderer and theme contract. The first preview is `artifacts/cornerstone/best-car-drying-towel/rendering-v1/offline-preview-001/`; no WordPress persistence or publication is included.
- [x] Implement the generic SiteStyleProfile boundary, paired surface/foreground tokens and Street Kingz visual pass. The approved semantic fixture now renders through a provenance-bearing Street Kingz profile with neutral/default, dark and mixed-surface contrast coverage; the latest preview is `artifacts/cornerstone/best-car-drying-towel/rendering-v1/visual-review-v1-007/`.

### Later

- [ ] Human review of the final offline rendered page/design and accessibility presentation.
- [ ] Produce a WordPress-ready draft package after separate draft approval; do not auto-publish.
- [ ] Design a separate narrow WordPress handoff/persistence path; do not use Elementor whole-document save or broaden Guarded Writer.
- [ ] Measure Search Console and GA4 outcomes at deliberate review windows and feed evidence back into later decisions.

## 1. Phase 0: Baseline and safety

**Status: Complete.** Legacy behaviour is protected by offline characterisation tests and fixture-backed provider tests.

### Goal

Define the current service as a protected compatibility contract and establish enough repeatable checks to refactor it safely.

### Deliverables

- A documented request and response contract for `GET /` and `POST /generate-article`, including required and optional fields, defaults, status codes and output fields.
- Representative fixtures for successful OpenAI and Gemini responses, malformed responses, provider failures and HTML validation failures.
- Characterisation tests for current provider routing, metadata enforcement, slug handling, HTML transformations, injected sections, retry behaviour and error responses.
- A small set of approved example outputs that capture the existing behaviour, including its current quirks where callers may depend on them.
- A documented local artifact convention covering directory structure, file naming, schema versions, timestamps, provenance and rerun behaviour.
- A V1 configuration inventory covering required environment variables, provider selection and the expected Node.js version.
- A redacted example configuration file containing no credentials.

### Acceptance criteria

- The existing service passes the baseline checks without intentional output changes.
- Tests can run without live AI calls or real credentials.
- The expected behaviour of both existing endpoints is documented well enough for a future change to be classified as compatible or breaking.
- A proposed V1 artifact can be traced to a pipeline run, stage, input artifact version and schema version.
- The Git working tree contains no generated secrets or live research credentials.

### Explicit non-goals

- Improving article quality or changing existing copy.
- Adding product extraction, external research or new generation flows.
- Replacing the current endpoint or changing its public contract.
- Building a database-backed audit system.
- Creating a user interface.

## 2. Phase 1: Mechanical modularisation

**Status: Complete.** Startup, routes, services, providers, prompts, post-processing and validation are separated while the legacy HTTP contract remains protected.

### Goal

Separate the existing monolithic implementation into clear modules without intentionally changing runtime behaviour.

### Deliverables

- Separate modules for application startup, configuration, routes, product catalogue, AI provider adapters, provider routing, prompt construction, article post-processing and validation.
- An application factory that can be exercised in tests without binding a network port.
- Dependency injection points for AI calls, time and configuration so tests remain deterministic.
- A compatibility route that preserves the current `/generate-article` processing sequence, provider order, fallback rules, defaults and response shape.
- A lightweight stage-runner convention that accepts input artifact paths and writes output artifact paths without embedding stage logic in the command layer.
- Written module boundaries showing which components are legacy compatibility components and which are reusable pipeline components.

### Acceptance criteria

- Phase 0 characterisation tests pass unchanged.
- Existing valid requests receive structurally equivalent responses and existing invalid requests retain their established status codes.
- The service still starts through the existing start command.
- Provider code can be tested independently from HTTP routing.
- Post-processing can be tested independently from model generation.
- No V1 pipeline stage imports or mutates Express request or response objects directly.

### Explicit non-goals

- Redesigning prompts, templates or HTML output.
- Fixing every known issue in the legacy sanitisation logic.
- Introducing a framework, plugin platform or dependency-injection container.
- Adding a database, queue, worker or separate service.
- Removing the hardcoded catalogue before a replacement source exists.

## 3. Phase 2: Product-page extraction

**Status: Core extraction complete.** Source capture, canonical product facts, field-level provenance, local artifacts and deterministic cache reuse are implemented. Brand knowledge and correction workflow remain later supporting work and do not block external evidence collection.

### Goal

Create a trustworthy, reusable product-understanding foundation for the Heavy Duty Drying Towel without asking the AI to invent product facts.

### Deliverables

- [x] A captured source snapshot of the rendered Heavy Duty Drying Towel page, including retrieval metadata and source URL.
- [x] A canonical product-facts JSON artifact containing identity, category, specifications, features, usage guidance, factual benefits, FAQs, related products and internal links where present.
- [x] A field-level provenance model linking every extracted fact to its source and distinguishing missing, ambiguous and conflicting information.
- Deterministic, content-type-neutral provider seeds derived from provenance-backed product facts; any inferred seed expansion belongs to the later interpretation/decision stage and must cite evidence.
- A separate brand-knowledge artifact containing approved voice, commercial rules, prohibited language and other reusable editorial constraints.
- [x] Extraction and normalization commands that can rerun from a saved page snapshot without fetching the live page again.
- A documented manual correction mechanism that preserves the original extraction and records overrides separately.

### Acceptance criteria

- [x] The complete extraction can be inspected as JSON and Markdown without reading application logs.
- [x] Every asserted product fact has a source reference or is explicitly marked as an interpretation.
- [x] Rerunning normalization from the same snapshot produces materially identical canonical facts.
- [x] Later AI interpretation cannot change the stored product facts or source snapshot.
- [x] Brand rules are not embedded inside the product-facts artifact.
- The resulting product and seed artifacts are content-type-neutral and can later support product pages, comparisons, FAQs, buying guides and articles.
- A human reviewer confirms that the Heavy Duty Drying Towel facts are accurate enough to support research.

### Explicit non-goals

- Building a general-purpose web crawler.
- Importing the complete WooCommerce catalogue.
- Scraping competitor pages.
- Generating finished content.
- Treating AI inference as authoritative product data.
- Automatically resolving factual conflicts without recording them.

## 4. Phase 3: External keyword/SERP research

**Status: Complete.** Product Facts, DataForSEO Keyword Ideas, DataForSEO Google Organic SERP Advanced and Google Search Console are implemented, tested and controlled-live validated as the primary V1 evidence-source layer. Deterministic cross-provider aggregation and objective-specific evidence sufficiency are also implemented and validated; the opportunity/interpretation decision layer is next.

### Goal

Collect reusable external evidence that can establish whether and how the Heavy Duty Drying Towel deserves content.

Recurring manual evidence collection is not part of the intended normal workflow. Paid providers are acceptable where they materially improve evidence quality or eliminate manual work.

Primary automated external evidence providers are:

- **DataForSEO Keyword Ideas** for keyword discovery, volume, difficulty and available commercial metrics.
- **DataForSEO Google Organic SERP Advanced** for ranking pages, result types, SERP features, People Also Ask and related searches where returned.
- **Google Search Console** for first-party customer-site queries, pages, impressions, clicks and positions (Street Kingz in V1).

Manual Google Autocomplete and People Also Ask imports remain available only as fallback or debugging mechanisms. Separate competitor-page extraction remains appropriate when page-level headings, claims, product information or content structure must be inspected directly.

The controlled SERP Advanced run proved that the provider can collect organic results, People Also Ask, related searches, popular products, videos, perspectives, discussions/forums and AI Overviews. Manual PAA/Autocomplete and Reddit remain off the V1 critical path. Targeted competitor-page extraction remains separate only for evidence requiring inspection of actual page content.

### Deliverables

- A provider-neutral research request generated from the reusable research-seeds artifact.
- Raw, immutable response artifacts from DataForSEO Keyword Ideas, DataForSEO Google Organic SERP Advanced and Google Search Console.
- Normalized keyword evidence covering query, market, intent indicators, volume, difficulty and available commercial metrics.
- Normalized SERP evidence covering ranking pages, result types, SERP features, People Also Ask and related searches where available.
- A lightweight existing-site evidence artifact identifying potentially overlapping customer-site pages and relevant internal-link targets.
- Retrieval metadata including provider, market, requested parameters, timestamps and errors or unavailable fields.
- An evidence aggregation artifact and sufficiency result that remain deterministic and separate from the single downstream AI interpretation/decision stage.
- Cache and rerun rules that allow later content types to reuse research for the same product, topic and market.
- Separate explicit-URL competitor-page extraction for page-level evidence that structured SERP results do not contain.

### Acceptance criteria

- Raw provider responses and normalized evidence remain separately inspectable.
- The same saved raw response can be normalized again without another paid API request.
- Paid-request ceilings and request counts are enforced and recorded for every DataForSEO run.
- Research is keyed by subject, query, market and retrieval context rather than by content type.
- Missing metrics remain explicitly missing and are not estimated by the AI as facts.
- AI observations can be regenerated without refetching external evidence.
- Before AI recommendation or generation, the engine can state whether evidence is sufficient for the requested objective. Detailed scoring and thresholds will be designed only after SERP Advanced and Search Console data are available.
- A reviewer can trace every material research conclusion back to normalized evidence and, where necessary, the raw response.
- The Heavy Duty Drying Towel research contains enough evidence to compare at least the plausible outcomes of a new guide, supporting article, product-page improvement or no action.

### Explicit non-goals

- Supporting every keyword or SERP provider.
- Continuously monitoring rankings or competitors.
- Building a large-scale crawl index.
- Automatically choosing an opportunity during this phase.
- Generating prose from search volume alone.
- Optimizing provider costs beyond basic local reuse of saved artifacts.

## 5. Phase 4: Opportunity decision and content brief

**Status: Complete.** This is the single AI interpretation and strategy stage. It uses deterministic page state, the compact Decision Brief, canonical citations, GPT-5.6 Sol, deterministic validation and mandatory decision-level human approval.

### Goal

Use product facts, site context and research evidence to decide the highest-value next action before any draft is written.

### Deliverables

- [x] Objective-specific sufficiency that declines or defers interpretation when required evidence is missing.
- [x] Deterministic Current Page Inventory and Gap Matrix establishing what exists before strategy is considered.
- [x] Compact, model-independent Decision Brief containing only decision-useful signals and canonical citations.
- [x] Strict interpretation output covering every required decision area with an action, `no_change` or `insufficient_evidence` result.
- [x] Deterministic validation for schema, citations, evidence categories, page state, bounded contradictions, unsupported claims and vague actions.
- [x] GPT-5.6 Sol controlled production validation and two independent 48/50 human product-value reviews.
- [x] Immutable per-call artifacts and explicit zero-retry call lifecycle accounting.
- [x] A Markdown interpretation rendering suitable for direct human review.

### Acceptance criteria

- [x] The decision stage can validly return `no_change` or `insufficient_evidence` without manufacturing work.
- [x] No generation call occurs before validated interpretation and individual human approval artifacts exist.
- [x] No AI interpretation call occurs until the Evidence Engine reports sufficient evidence for the requested objective.
- [x] Every finding and decision cites only evidence exposed through the canonical citation universe.
- [x] Product-page presence is deterministic rather than rediscovered by AI.
- [x] The Heavy Duty Drying Towel interpretation materially uses all four evidence categories and produces commercially useful reviewed decisions.
- [x] Human approval or modification is recorded downstream without overwriting the interpretation.

### Explicit non-goals

- Automatically publishing the recommendation.
- Creating mathematically sophisticated opportunity scoring.
- Claiming that uncertain or incomplete metrics are definitive.
- Supporting multiple simultaneous products or markets in V1.
- Generating every possible content type during V1.
- Allowing the model to choose a content type without recorded evidence.

## 6. Phase 5: Structured draft generation

**Status: Complete for the constrained Product-70 profile; not yet implemented for cornerstone articles.** Generation begins only after evidence-backed interpretation decisions receive explicit individual human approval. Generation implements approved strategy; it does not create new strategy.

### Goal

Generate an inspectable semantic draft from the approved brief while keeping research, facts, interpretation and presentation separate.

### Deliverables

- A structured-draft schema composed of semantic blocks such as introduction, explanation, process, product facts, decision criteria, comparison, recommendation, FAQ, CTA and sources.
- A content profile that declares required and allowed blocks for the selected Heavy Duty Drying Towel opportunity.
- Stage-specific prompts that consume the approved brief, referenced facts, evidence and brand knowledge rather than raw user instructions.
- A structured JSON draft and a readable Markdown representation.
- An immutable decision-level approval artifact supporting `approved`, `modified`, `rejected` and `pending` without changing the interpretation.
- A compact generation brief containing only approved/modified actions, necessary current content, allowed evidence and customer writing constraints.
- A strict generated-change contract and deterministic validation for approval scope, operations, evidence, page state, bounded claim language and human-review state.
- Claim-to-evidence references for factual or research-dependent statements.
- Generation metadata including model, provider, prompt version, content-profile version and source artifact versions.
- A targeted section-regeneration mechanism that creates a new revision without regenerating unrelated approved blocks.
- A legacy adapter boundary that leaves `/generate-article` on its existing generation and post-processing path.

### Acceptance criteria

- The canonical draft is structured data rather than final HTML.
- Rejected and pending decisions cannot enter generation; modified decisions retain the original interpretation and human instruction.
- Generation cannot introduce strategy, search targets, sections or claims outside an approved action and its allowed evidence.
- Generated output remains `awaiting_human_review` and has no publication side effect.
- Required blocks are present and conform to the selected content profile.
- Product claims can be traced to product facts; research claims can be traced to research evidence.
- Unsupported claims are flagged rather than silently accepted.
- A single block can be regenerated from the same inputs while earlier revisions remain inspectable.
- The draft can be read and reviewed in Markdown before rendering.
- Running the new drafting stage does not change the existing `/generate-article` request or response behaviour.

### Explicit non-goals

- Replacing the legacy article endpoint.
- Generating layouts directly as canonical HTML.
- Producing all future content profiles in V1.
- Performing automatic factual approval.
- Adding collaborative editing or a polished editor.
- Generating or uploading finished image assets.

## 7. Phase 6: Rendering, validation and WordPress draft output

**Status: Offline cornerstone rendering implemented; WordPress draft handoff remains later.** Publication remains a separate authority. Automatic publication is disabled.

### Goal

Turn the reviewed structured draft into safe, consistent, WordPress-ready output while retaining a mandatory human approval boundary.

### Deliverables

- A deterministic renderer that converts semantic blocks into HTML and metadata using a versioned content template.
- A WordPress draft package containing title, slug, HTML, meta description, image requirements, internal links, CTA details, schema data and source artifact references.
- Structural validation covering required sections, heading hierarchy, links, CTAs, metadata, image placeholders and profile-specific requirements.
- Factual validation that flags missing evidence references, stale facts and unresolved conflicts.
- Security-focused HTML sanitisation and URL validation separate from editorial formatting.
- A human-readable validation report with errors, warnings and pass results.
- A manual WordPress draft-output path as the default V1 handoff, with an optional API-created WordPress draft only if credentials and field mappings are available and explicitly approved.
- Publication metadata capable of recording a WordPress draft identifier and URL without treating the draft as published.

### Acceptance criteria

- Rendering the same approved structured draft with the same template version produces materially identical output.
- Validation failures prevent a draft from being marked ready for WordPress.
- The output contains no unsupported product URLs or unsafe HTML.
- A reviewer can inspect the structured draft, rendered output and validation report independently.
- The Heavy Duty Drying Towel pipeline produces a complete WordPress-ready draft package.
- No content is published automatically.
- The existing `/generate-article` route continues to behave according to the Phase 0 baseline.

### Explicit non-goals

- Automatic publication.
- A full WordPress editorial interface.
- Media generation, editing or upload automation.
- Supporting every WordPress plugin or SEO field mapping.
- Requiring WordPress API access to complete V1.
- Replacing WordPress revision history or approval controls.

## 8. Phase 7: Generic site-style discovery

**Status: Complete offline.** A deterministic, provenance-bearing discovery layer now derives a SiteStyleProfile from multiple representative pages and feeds the site-independent renderer. Street Kingz is the first fixture; a synthetic second site proves the profile is not a hidden Street Kingz layout.

### Deliverables completed

- Multi-page HTML/CSS observation contract covering tokens, geometry, surfaces, rhythm, imagery, component signals and responsive evidence.
- Confidence/provenance records with GLOBAL, PAGE_TYPE and fallback handling.
- Neutral fallback and synthetic alternate-site profiles.
- Offline Street Kingz profile and deterministic article preview; no WordPress integration or writes.

### Next milestone

Human visual review of the discovered StreetStyleProfile and preview, followed by a narrowly scoped design adjustment only if the review identifies a material mismatch.

## 9. Phase 8: SiteAdapter presentation boundary

**Status: v1 contract implemented offline.** Semantic content now has an explicit adapter boundary for mapping into native site patterns. The existing SiteStyleProfile renderer remains available as a deterministic fallback; it is no longer treated as a universal recreation of a target site's complete design.

Completed:

- Generic versioned SiteAdapter contract with NATIVE, COMPOSED, FALLBACK and UNSUPPORTED states.
- Street Kingz WordPress/Kadence/Elementor adapter configuration with provenance and honest unmapped-pattern fallbacks.
- Synthetic second-site adapter proving the same SemanticPage can map to different presentation targets.
- CMS audit artifact; no WordPress persistence implemented.

Next: human review of the adapter mapping, then a separately authorised narrow CMS integration design.

## 10. Phase 9: Evaluate whether the pipeline is worth expanding

**Status: Later.** Measures the first published asset and feeds real outcomes back into future evidence and decisions.

### Goal

Determine from the Heavy Duty Drying Towel trial whether the pipeline improves decisions and output enough to justify broader product and content-type support.

### Deliverables

- A V1 evaluation report covering total human time, provider cost, reruns, failures, evidence quality, factual corrections and draft quality.
- A comparison with the current `/generate-article` workflow and the previous manual process.
- Reviewer findings on product accuracy, brand alignment, commercial usefulness, search rationale and ease of inspection.
- A list of stages that created meaningful value versus stages that added complexity without improving the result.
- A prioritized recommendation to stop, simplify, refine or expand.
- If expansion is justified, a scoped next-step proposal for additional products and content profiles based on demonstrated reuse of the same artifacts and stages.

### Acceptance criteria

- The evaluation uses recorded V1 artifacts and measurements rather than relying only on subjective recollection.
- It is clear how much work was reused across extraction, research, decision, brief, draft and rendering.
- Known factual errors and unsupported interpretations are counted and reviewed.
- The team can state whether the decision stage changed what would otherwise have been written.
- Expansion is recommended only if the pipeline saves meaningful time, improves confidence or produces a commercially stronger decision or draft.
- Any proposed next phase preserves the shared pipeline and adds content profiles rather than duplicating workflows.

### Explicit non-goals

- Assuming V1 success before evaluation.
- Immediately importing the full catalogue.
- Building production-scale infrastructure.
- Adding multiple users, permissions or collaboration features.
- Adding a polished interface merely to demonstrate progress.
- Expanding to every future workflow listed in the project vision at once.
