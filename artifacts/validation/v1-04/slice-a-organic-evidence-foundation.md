# V1-04 Slice A — Organic Evidence Foundation

Status: `SLICE A: BLOCKED`

This artifact records the bounded local acceptance of the common organic-evidence
source/run envelope. It contains no provider credentials, tokens, Vault IDs or
customer evidence.

The first Slice A implementation was initially reported as passing, but review
identified three integrity gaps: incomplete runs could be promoted as complete,
historical runs did not retain `evidence_as_of`, and status fabricated current
completeness. These were corrected by the monotonic integrity migration
`20260903000000_v1_04_slice_a_integrity.sql`; the original migration was not
rewritten.

## Scope accepted

- Business-owned typed source records for `search_console`, `site` and
  `external_search`, with bounded source classes and optional same-Business
  customer Connection binding.
- Business-owned lifecycle runs with bounded pending, complete, partial and
  failed states, provenance timestamps, observation period, completeness and
  bounded error identity.
- Service-only begin/finish lifecycle functions with row locking, one active
  run per source, atomic complete-run promotion and last-known-good retention.
- Customer-safe authenticated status reads under the existing Account →
  Business ownership model.
- RLS denies customer direct writes and cross-tenant access; lifecycle mutation
  is bounded to server-side service-role functions.
- Business deletion cascades owned sources and historical runs.
- Complete promotion requires `complete` or `provider_limited` completeness and
  a non-null historical `evidence_as_of`; partial/unavailable/unknown complete
  combinations fail closed.
- Current/active run pointers are guarded by a database constraint trigger and
  historical runs retain their own evidence timestamps.

## Local acceptance evidence

- Existing V1-03 local database was upgraded by applying the Slice A migration
  without a reset; accepted commerce data and its tenant model remained valid.
- A disposable local authenticated Business created a site source, completed a
  first run, then failed a later run. The complete run remained current;
  `last_successful_at` and `evidence_as_of` remained unchanged while
  `last_attempted_at` advanced and failure state was exposed.
- Repeated source ensure returned the same logical source.
- A second begin while a run was active was rejected.
- A later successful run atomically replaced the current run while the earlier
  completed run remained historical.
- A stale completion was rejected after a newer run transition.
- Concurrent completion/failure had one lifecycle winner and left no active run.
- Direct authenticated source insertion was denied, and Business deletion
  removed the owned source/run records.
- Two disposable authenticated tenants proved same-Business Connection binding,
  cross-tenant source isolation, direct mutation denial, and the actual HTTP
  status route. The route returned the current run's real `provider_limited`
  completeness state without internal run identifiers.
- Separate no-prior-complete sources proved failed-first and partial-first runs
  leave no current evidence, no successful timestamp and no fabricated
  completeness state.
- Concurrent begin allowed exactly one active run; completion/failure races had
  one winner; stale completion was rejected. Conflicting logical source ensure
  inputs were rejected.
- Local Supabase migration/application tests and the full repository suite
  passed; no provider calls were made.

## State boundary

The correction migration was applied to the existing local V1-03 database
without a reset. An isolated-stack attempt with a unique project identity was
stopped before database creation because the pinned CLI still attempted to bind
the default database port; no preserved containers or data were affected. Slice
A cannot be marked accepted until a genuinely empty isolated migration run
completes.

Slice A does not collect Search Console, site or external-search observations.
Slice B — Google Search Console Connection + Evidence — remains not started.
V1-04 remains in progress pending the separately authorised next slice.
