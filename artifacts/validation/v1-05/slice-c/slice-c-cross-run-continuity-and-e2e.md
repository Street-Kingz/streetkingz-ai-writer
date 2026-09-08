# V1-05 Slice C3 cross-run continuity and disposable E2E

## Scope and provider safety

This task made zero OpenAI or external paid-provider calls. Historical paid
ledgers and caches remain untouched and untracked.

## Cross-run defect and correction

The prior recommendation identity included `source_run_id` and evidence
references, while persistence searched only `business_id + source_run_id`.
The same logical opportunity therefore produced a new recommendation across
decision runs. This was a real merchant task-duplication defect.

Recommendation identity is now version 2 and contains only Business identity,
stable candidate identity, governed target resources and intervention. Run ID,
evidence references and provenance update the existing record but do not create
a new logical task. Terminal states are preserved during regeneration.

Offline continuity and distinctness tests pass for same-run reruns, different
runs, targets, interventions and Businesses; the five-current cap and safety
guards remain covered.

## Disposable validation status

The required actual from-zero Supabase proof was attempted with `npx supabase`
in an isolated temporary project. Startup was blocked before migrations by a
Docker port collision: the temporary CLI attempted to bind `54322`, already
occupied by `supabase_db_streetkingz-ai-writer`. A second attempt with explicit
temporary workdir and ports produced the same blocker. The existing accepted
local Supabase project was not stopped, reset or modified.

Consequently the following are **NOT CLAIMED** in this commit: 37/37 migration
application, migration 37 database validation, actual RLS behavior, two-tenant
Auth/JWT proof, authenticated API E2E generation/feed/detail, and disposable
service-role write proof. They require a disposable Supabase instance with
non-conflicting ports.

## Current status

The Product continuity correction is implemented and locally tested, but Slice
C3 is infrastructure-blocked and not an E2E acceptance result. No production
acceptance or autonomous execution is enabled. Street Kingz live Product
evaluation was not run.
