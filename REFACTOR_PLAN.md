# Refactor Plan

## Objective

Refactor the existing single-file Express application into focused modules without changing its functionality, API contract, prompts, output, business rules or runtime provider behaviour.

This is a mechanical maintainability refactor. It does not introduce new workflows, pipeline stages, dependencies, storage, endpoints or user-facing features.

## Proposed folder structure

```text
streetkingz-ai-writer/
├── index.js
├── app.js
├── package.json
├── catalogue/
│   └── products.js
├── config/
│   └── index.js
├── prompts/
│   └── articlePrompt.js
├── providers/
│   ├── openai.js
│   ├── gemini.js
│   └── router.js
├── routes/
│   ├── health.js
│   └── generateArticle.js
├── services/
│   └── articleGeneration.js
├── utils/
│   ├── articleFormatting.js
│   └── json.js
└── validators/
    └── articleHtml.js
```

## Responsibilities and move map

### `index.js`

Keep only the process entry point:

- Import the configured Express application.
- Import the configured port.
- Start listening.
- Preserve the existing startup log message.

### `app.js`

Move Express application construction here:

- Create the Express application.
- Register unrestricted CORS exactly as it is currently configured.
- Register the current JSON body parser with the same defaults.
- Mount the health and article-generation routes.

No middleware ordering or configuration should change.

### `config/index.js`

Move environment-derived configuration here:

- `PORT`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `AI_PROVIDER`
- Existing missing-key warning messages

Values must continue to be read at module initialization. Existing defaults and warning text must remain unchanged.

### `catalogue/products.js`

Move product data here:

- `STREET_KINGZ_PRODUCTS`
- `PRODUCTS_SLIM`

All product records, spelling, punctuation, descriptions, URLs and ordering must remain identical. The slim catalogue must continue to be derived from the full catalogue in the same way.

### `routes/health.js`

Move the existing `GET /` handler here. Preserve its status and exact JSON response.

### `routes/generateArticle.js`

Move the HTTP-specific portion of `POST /generate-article` here:

- Request-body field extraction
- Required-field checks
- Missing-key check
- Existing HTTP status codes
- Existing error response bodies
- Existing catch-all error logging and response
- Successful response serialization

The route must continue to accept the same required and optional fields.

### `services/articleGeneration.js`

Move article-generation orchestration here:

- Build the existing prompt.
- Invoke the existing provider router.
- Force the supplied primary keyword into the returned article object.
- Apply the current slug fallback and truncation.
- Apply metadata enforcement.
- Apply HTML enforcement.
- Supply fallback image placeholders under the same condition.
- Run HTML validation.
- Retry once at the current lower temperature when issues are found.
- Return the final article and validation issues to the route.

The order of these operations is part of existing behaviour and must not change.

### `providers/openai.js`

Move the OpenAI-specific implementation here:

- Existing endpoint and headers
- Hardcoded model name
- JSON response mode
- Message construction
- Error-body logging
- Error metadata
- Rate-limit cooldown state and calculation
- JSON extraction and parsing

Cooldown state must remain process-local and shared across OpenAI calls within the process.

### `providers/gemini.js`

Move the Gemini-specific implementation here:

- Existing endpoint construction
- Existing default model and environment override
- Request shape
- JSON response MIME type
- Error-body logging and metadata
- Candidate text extraction and JSON parsing

### `providers/router.js`

Move provider selection and fallback policy here:

- Forced Gemini path
- Forced OpenAI path
- Automatic OpenAI-first order
- Cooldown shortcut to Gemini
- Fallback on OpenAI rate limits and 5xx responses
- Gemini-only path when OpenAI is unavailable
- Existing no-provider error

The order and conditions must remain identical.

### `prompts/articlePrompt.js`

Move `buildPrompt` here. Preserve:

- Prompt wording and whitespace
- JSON output description
- Catalogue serialization
- Banned-phrase interpolation
- Content rules
- Smart-length ranges
- HTML instructions

Prompt output should be compared directly with the pre-refactor output for representative inputs.

### `validators/articleHtml.js`

Move `findHtmlIssues` here. Preserve every existing check, issue identifier and ordering.

### `utils/articleFormatting.js`

Move the existing deterministic article transformations here, including:

- Banned phrases
- HTML escaping and string clamping
- Metadata cleanup and length enforcement
- Featured-box construction
- Decision-section construction
- “Who this is not for” construction
- Final CTA construction
- Link filtering
- Paragraph and list normalization
- Core structure enforcement

Function bodies and transformation order should initially be copied without cleanup. Any later behavioural improvements must be handled separately from this refactor.

### `utils/json.js`

Move model-response parsing helpers here:

- Code-fence stripping
- Safe JSON parsing wrapper

Despite its current name, the parser should retain the same exception behaviour rather than introducing recovery logic during this refactor.

## Migration sequence

1. Capture the current endpoint, prompt and transformation behaviour with tests and fixtures.
2. Extract configuration and catalogue constants without changing their values.
3. Extract pure JSON, validation and formatting functions.
4. Extract the prompt builder and verify exact prompt output.
5. Extract OpenAI and Gemini provider adapters.
6. Extract provider routing while retaining the same cooldown state lifetime.
7. Extract generation orchestration into the service module.
8. Extract HTTP handlers into route modules.
9. Reduce `index.js` to application startup and move Express construction to `app.js`.
10. Run the complete compatibility test plan before accepting the refactor.

Each extraction should leave the application runnable. Structural cleanup, renaming and business-logic changes should not be mixed into these steps.

## Risks

### Prompt drift

Moving or reformatting a template literal can alter whitespace, punctuation or interpolated values and therefore change model output.

Mitigation: compare generated prompt strings before and after the refactor using identical inputs.

### Transformation-order changes

The HTML pipeline is order-sensitive. Reordering individually reasonable helpers can change links, paragraph nesting, injected sections or validation results.

Mitigation: preserve the exact call sequence and test final HTML using fixed model-response fixtures.

### Provider fallback changes

Moving cooldown state into the wrong module scope could reset it per call. Changing catch boundaries could alter which failures trigger Gemini fallback.

Mitigation: keep cooldown state at provider-module scope and test forced-provider, automatic, cooldown and fallback scenarios.

### Module initialization changes

ES module imports are evaluated before dependent module bodies. Moving configuration can change when missing-key warnings occur or when environment variables are captured.

Mitigation: retain initialization-time environment reads and check startup output under each key configuration.

### Express routing differences

Replacing direct application routes with routers could accidentally change paths, middleware order, body parsing or error handling.

Mitigation: mount routers without prefixes, preserve middleware order and run HTTP contract tests against both endpoints.

### Exporting mutable data

Moving the catalogue into an exported module makes the same array visible to multiple modules. Accidental mutation could affect later requests.

Mitigation: do not introduce catalogue mutation during the refactor and test repeated requests in one process.

### Error-response drift

Moving errors across service and route boundaries can alter HTTP status codes, response bodies or logged messages.

Mitigation: keep HTTP decisions in the route and snapshot existing error cases.

### Circular imports

The prompt needs banned phrases, while formatting needs catalogue data. Poor boundaries could create a prompt/formatting/provider cycle.

Mitigation: keep dependency direction one-way and verify the full import graph by starting the application in a clean process.

### False confidence from syntax checks

Files can parse successfully while runtime imports, provider state or Express wiring are incorrect.

Mitigation: combine syntax checks with pure-function comparisons, mocked provider tests and HTTP tests.

## Preserving existing behaviour

The following are explicit compatibility boundaries:

- `GET /` remains available at the same path with the same response.
- `POST /generate-article` remains available at the same path.
- Required and optional request fields remain unchanged.
- Validation order, status codes and error bodies remain unchanged.
- OpenAI remains the first automatic provider when configured and not cooling down.
- Gemini fallback conditions remain unchanged.
- Model names, request payloads and generation temperatures remain unchanged.
- The prompt string remains unchanged for identical inputs and catalogue state.
- The catalogue data and prompt catalogue projection remain unchanged.
- Slug, metadata, HTML and image-placeholder processing remain unchanged.
- The retry still regenerates the complete article once at the same temperature.
- The final response shape remains unchanged.
- Existing logs and warnings remain materially unchanged.

No functions should be “improved” while being moved. Known shortcomings, duplicate wording, regex behaviour, fixed recommendations and debug markers are part of the baseline until a separately approved behavioural change addresses them.

## Test plan

### Static checks

- Run `node --check` against every JavaScript file.
- Confirm every import resolves with exact filename casing.
- Run `git diff --check`.
- Confirm `package.json` and dependencies are unchanged.

### Source-equivalence checks

- Compare the full catalogue data before and after extraction.
- Compare banned phrases before and after extraction.
- Compare prompt output for multiple representative requests.
- Compare each formatting helper or its observable output against the original.
- Confirm validation issue identifiers and ordering are identical.

### Route contract tests

For `GET /`:

- Confirm the status code and exact JSON body.

For `POST /generate-article`:

- Missing topic and keyword
- Missing featured product name and URL
- No provider keys configured
- Successful generation
- Malformed provider JSON
- Provider error
- HTML validation failure followed by a successful retry
- HTML validation failure after both attempts

For every case, compare status, JSON body and relevant logs with the baseline.

### Provider tests

- Forced OpenAI uses only OpenAI.
- Forced Gemini uses only Gemini.
- Automatic mode prefers OpenAI.
- OpenAI 429 falls back to Gemini and sets cooldown.
- OpenAI 5xx falls back to Gemini.
- Other OpenAI errors do not unexpectedly fall back.
- Active cooldown routes directly to Gemini.
- OpenAI-only and Gemini-only key configurations retain their current behaviour.
- No configured provider produces the current error.

All network calls should be mocked.

### Output compatibility tests

Using fixed model JSON fixtures, compare before and after outputs for:

- Model-provided and fallback slugs
- Metadata below, within and above the enforced length
- Missing image placeholders
- Featured-box insertion
- Decision and exclusion section replacement
- Link whitelist enforcement
- `<h1>` removal
- Ordered and numbered-list conversion
- Invalid nested paragraph cleanup
- CTA and sign-off injection
- Validation-triggered regeneration

Comparisons should be exact where practical, especially for HTML and metadata.

### Runtime smoke tests

- Start the application with no keys and confirm the health endpoint works.
- Start with OpenAI only, Gemini only and both providers configured.
- Confirm the configured port and default port behave as before.
- Send two requests through the same process to verify shared provider state.

No live paid provider requests are required for refactor acceptance.

## Rollback plan

The refactor should be committed separately from feature or dependency changes so it can be reverted as one unit.

If compatibility tests fail during development:

1. Stop the extraction at the failing step.
2. Compare the moved function and its call site with the baseline.
3. Restore the last known-good module arrangement using version control.
4. Rerun the baseline suite before attempting a smaller extraction.

If problems appear after deployment:

1. Redeploy the last known-good pre-refactor commit.
2. Do not attempt production data migration because this refactor creates no data or schema changes.
3. Preserve failing request details and sanitized provider fixtures for reproduction.
4. Reproduce the issue against both revisions locally.
5. Correct the module boundary or initialization difference without combining the fix with unrelated cleanup.
6. Repeat the full compatibility suite before redeployment.

Because this plan changes only source organization, rollback requires no database reversal, artifact migration, credential change or API-client migration.

## Completion criteria

The refactor is complete only when:

- The proposed modules own the responsibilities described above.
- The public endpoints and their contracts are unchanged.
- Prompt output is unchanged for identical inputs.
- Fixed provider fixtures produce identical final article output.
- Provider selection and fallback tests pass.
- All static, contract and smoke tests pass.
- No new feature, dependency or business rule has been introduced.
