# Street Kingz AI Ecommerce Assistant Roadmap

## V1 objective and constraints

V1 will prove one complete product-led content pipeline using the Heavy Duty Drying Towel page:

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
- **AI interpretation:** inferred audiences, problems, intent, opportunities, recommendations and draft content.

Research artifacts must be reusable by future product pages, buying guides, comparison pages, FAQs and articles. Final HTML must not become the canonical source for research or content planning.

The existing `GET /` and `POST /generate-article` behaviour is a compatibility boundary. It must continue to accept the same fields and return the same response shape while V1 is developed.

## Artifact flow

```text
Product URL
    ↓
Product source snapshot
    ↓
Canonical product facts
    ↓
Research seeds
    ↓
Keyword and SERP evidence
    ↓
Opportunity decision
    ↓
Content brief
    ↓
Structured draft
    ↓
Rendered and validated WordPress draft package
```

Each arrow is a stage boundary, not an instruction to combine stages into one prompt. Later phases may consume earlier artifacts, but they must not rewrite facts or evidence to fit a preferred recommendation.

## 1. Phase 0: Baseline and safety

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

### Goal

Create a trustworthy, reusable product-understanding foundation for the Heavy Duty Drying Towel without asking the AI to invent product facts.

### Deliverables

- A captured source snapshot of the rendered Heavy Duty Drying Towel page, including retrieval metadata and source URL.
- A canonical product-facts JSON artifact containing identity, category, specifications, features, usage guidance, factual benefits, FAQs, related products and internal links where present.
- A field-level provenance model linking every extracted fact to its source and distinguishing missing, ambiguous and conflicting information.
- A separate AI-interpretation artifact containing inferred audience, exclusions, problems solved, objections, alternative names, customer language, likely intent and related questions.
- A reusable research-seeds artifact derived from product facts and clearly labelled interpretation.
- A separate brand-knowledge artifact containing approved voice, commercial rules, prohibited language and other reusable editorial constraints.
- Extraction and normalization commands that can rerun from a saved page snapshot without fetching the live page again.
- A documented manual correction mechanism that preserves the original extraction and records overrides separately.

### Acceptance criteria

- The complete extraction can be inspected as JSON and Markdown without reading application logs.
- Every asserted product fact has a source reference or is explicitly marked as an interpretation.
- Rerunning normalization from the same snapshot produces materially identical canonical facts.
- Changing an AI interpretation does not change the stored product facts or source snapshot.
- Brand rules are not embedded inside the product-facts artifact.
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

### Goal

Collect reusable external evidence that can establish whether and how the Heavy Duty Drying Towel deserves content.

### Deliverables

- A provider-neutral research request generated from the reusable research-seeds artifact.
- Raw, immutable response artifacts from the selected keyword and SERP data sources.
- Normalized keyword evidence covering query, market, intent indicators, volume, difficulty and available commercial metrics.
- Normalized SERP evidence covering ranking pages, result types, SERP features, People Also Ask and related searches where available.
- A lightweight existing-site evidence artifact identifying potentially overlapping Street Kingz pages and relevant internal-link targets.
- Retrieval metadata including provider, market, requested parameters, timestamps and errors or unavailable fields.
- A separate AI research-synthesis artifact that interprets the evidence without altering it.
- Cache and rerun rules that allow later content types to reuse research for the same product, topic and market.

### Acceptance criteria

- Raw provider responses and normalized evidence remain separately inspectable.
- The same saved raw response can be normalized again without another paid API request.
- Research is keyed by subject, query, market and retrieval context rather than by content type.
- Missing metrics remain explicitly missing and are not estimated by the AI as facts.
- AI observations can be regenerated without refetching external evidence.
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

### Goal

Use product facts, site context and research evidence to decide the highest-value next action before any draft is written.

### Deliverables

- A normalized opportunity-candidate artifact containing the viable actions:
  - Create a cornerstone guide.
  - Create a supporting article.
  - Improve an existing article.
  - Improve the product page.
  - Add or improve FAQs.
  - Take no action.
- A simple, documented decision rubric covering product relevance, search opportunity, commercial intent, existing-content overlap, evidence quality and implementation effort.
- A decision artifact containing the selected action, alternatives, rationale, supporting evidence references, uncertainty and human approval or override.
- A content-type-neutral brief containing objective, audience, intent, questions, claims, evidence, internal links, products, CTA strategy, required sections, images, schema needs and target length.
- Optional type-specific brief fields selected through a content profile rather than a separate workflow.
- A Markdown rendering of the decision and brief for easy human review.

### Acceptance criteria

- The decision stage can validly return “take no action.”
- No draft-generation call occurs before the decision and brief artifacts exist.
- The selected action cites the product and research evidence that supports it.
- Human approval or override is recorded without overwriting the original recommendation.
- The brief distinguishes required facts from editorial interpretation.
- The same decision mechanism can choose among product-page, buying-guide, comparison, FAQ and article outcomes without separate end-to-end workflows.
- The Heavy Duty Drying Towel produces one reviewed decision and an approved brief suitable for the V1 drafting stage.

### Explicit non-goals

- Automatically publishing the recommendation.
- Creating mathematically sophisticated opportunity scoring.
- Claiming that uncertain or incomplete metrics are definitive.
- Supporting multiple simultaneous products or markets in V1.
- Generating every possible content type during V1.
- Allowing the model to choose a content type without recorded evidence.

## 6. Phase 5: Structured draft generation

### Goal

Generate an inspectable semantic draft from the approved brief while keeping research, facts, interpretation and presentation separate.

### Deliverables

- A structured-draft schema composed of semantic blocks such as introduction, explanation, process, product facts, decision criteria, comparison, recommendation, FAQ, CTA and sources.
- A content profile that declares required and allowed blocks for the selected Heavy Duty Drying Towel opportunity.
- Stage-specific prompts that consume the approved brief, referenced facts, evidence and brand knowledge rather than raw user instructions.
- A structured JSON draft and a readable Markdown representation.
- Claim-to-evidence references for factual or research-dependent statements.
- Generation metadata including model, provider, prompt version, content-profile version and source artifact versions.
- A targeted section-regeneration mechanism that creates a new revision without regenerating unrelated approved blocks.
- A legacy adapter boundary that leaves `/generate-article` on its existing generation and post-processing path.

### Acceptance criteria

- The canonical draft is structured data rather than final HTML.
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

## 8. Phase 7: Evaluate whether the pipeline is worth expanding

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
