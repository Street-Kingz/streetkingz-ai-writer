# V1-05 Slice A — Deterministic Candidate Discovery

Status: DONE / ACCEPTED  
Validation type: local, authenticated, no-provider/no-model validation  
Starting checkpoint: `13a2ac5f020745f034f92181b3a5a099d4e99552`  
Discovery-label checkpoint: `20679e6c84f3f105f9b2965fb49f525604f870ce`  
Implementation checkpoint: `f16124d` (`feat: add V1-05 deterministic candidate discovery`)

## Boundary and rule table

Slice A begins with the accepted V1-04 evidence boundary and emits potential
candidates only. It does not filter semantic overlap, interpret intent, score
commercial value, choose interventions, or create recommendations.

| Candidate family | Required generic source facts | Target identity | Evidence relationship |
| --- | --- | --- | --- |
| Existing product | Organic/site or search relationship resolving to a current Product page | Product reference, with page reference when available | Site, Search Console, or external observation |
| Existing category | Organic/site or search relationship resolving to a current Category page | Category reference, with page reference when available | Site, Search Console, or external observation |
| Existing content | Organic/site or search relationship resolving to a supported content page | Page reference | Site, Search Console, or external observation |
| New page/content asset | Bounded organic query/job evidence without a sufficiently established target | Normalized source query/job identity | External or first-party organic observation |
| Internal linking | Concrete source/target page relationship supported by site, commerce, or shared organic evidence | Stable ordered page pair | Relationship observation |

Exact logical identity is merged; semantic overlap remains for Slice B. The
candidate cap is 200. If more logical candidates exist, deterministic type/source
round-robin with stable identity ordering is used and the run is marked
`partial` with `candidate_cap_hit`.

## Durable contracts

Migration: `supabase/migrations/20260926000000_v1_05_slice_a_decision_discovery.sql`

Tables:

- `organic_decision_runs`: immutable input identity and discovery lifecycle;
  Slice A states are `pending`, `discovery_complete`, and `failed`.
- `organic_opportunity_candidates`: Business-owned candidate records with typed
  target resources and bounded evidence references.

Candidates are persisted as `discovered`; `overlap_group_id` is null,
`rejection_reason_codes` is empty, and `evaluated_at` is null. No recommendation,
priority, model output, or intervention table was added.

Snapshot fingerprints are SHA-256 over stable selected source/run references and
source-selection state; rendering time is excluded. `input_hash` is SHA-256 over
the canonical bounded evidence packet used by discovery. Candidate identity is
SHA-256 over candidate type plus stable target identity (or normalized source
job/pair identity), excluding commercial and metric magnitudes.

Every evidence locator is produced from the selected Business packet and is
stored as a typed source kind/record type/record identity relationship. The
adapter never stores raw provider responses or credentials.

## Evaluation

The harness-only discovery-match manifest was fixed before Product code. It
contains 48 case IDs, 38 discoverable labels, 0 ambiguous matches, and 0 label
conflicts. Frozen fixture bytes and hashes were unchanged at that checkpoint.

The same pure discovery implementation evaluated 48 frozen packets. 35 of 38
discoverable labelled opportunities were matched (92.1%, rounded to one decimal
place); the three unmatched cases were non-high-impact. High-impact misses: 0.
Maximum candidate universe observed: 64. Commercial control/challenger
discovery identities remained invariant, and consistent renaming of synthetic
entities preserved candidate structure. Runtime source has no corpus-label or
answer-key import and no corpus-specific constants.

The approved candidate types are exactly:
`existing_product_improvement`, `existing_category_improvement`,
`existing_content_improvement`, `new_page_or_content_asset`, and
`internal_linking`. Search-volume magnitude and commercial metrics are not
discovery inclusion criteria.

## Security and routes

Both tables have RLS enabled. Authenticated users have owner-scoped SELECT only;
direct authenticated INSERT/UPDATE/DELETE is denied. Service-role writes are
used by the Product route. The database posture assertion passed with no new
RLS, public/anon privilege, or authenticated-write finding.

Routes added:

- `POST /api/product/decision-runs/discover` — authenticated Product route,
  sensitive mutation rate limit, empty body only, no customer-supplied Business,
  topic, or keyword.
- `GET /api/product/decision-runs/:id` — authenticated owner-scoped bounded run
  metadata.
- `GET /api/product/decision-runs/:id/candidates` — authenticated owner-scoped
  bounded candidate projection, maximum 200 records.

Unchanged input, snapshot, and discovery version reuse the successful run;
failed runs remain retryable; database uniqueness prevents duplicate pending or
successful runs for the same input. Route responses contain no raw evidence,
model reasoning, recommendation, or commercial score.

## Street Kingz local validation

One authenticated Product invocation was run against the accepted local
Street Kingz Business after implementation commit `f16124d`. It used durable
local evidence only and made 0 external calls and 0 model calls. The run was
`discovery_complete`, produced 64 candidates, and the repeated identical request
returned `reused: true` with 64 candidates. Candidate reads returned 64 records.

The adapter resolved the accepted commerce generation, accepted Search Console
run (1,125 observations), and accepted external partial evidence. Existing
Account, Business, Commerce, site, GSC, external evidence, Vault, and other
tenant records were not modified; only Slice A decision-run/candidate rows were
added.

## Validation result

- Focused Slice A tests: PASS (5 tests, 0 failures).
- Full npm suite: PASS (1,135 passed, 0 failed, 21 pre-existing skips).
- Database migration: applied monotonically; no normal database reset.
- Security posture: PASS.
- Secret scan: PASS, 0 findings.
- `git diff --check`: PASS.
- Model calls: 0.
- External calls: 0.
- Critical: 0.
- High: 0.

Known limitation: current real site evidence remains governed by its accepted
complete/LKG/partial semantics; Slice A does not promote or rewrite site state.
Later semantic filtering and intent/intervention reasoning are intentionally
deferred to Slice B and later slices.
