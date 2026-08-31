# V1-04 Slice A — Organic Evidence Foundation

Status: `SLICE A: PASS`

This artifact records the bounded local acceptance of the common organic-evidence
source/run envelope. It contains no provider credentials, tokens, Vault IDs or
customer evidence.

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
- Local Supabase migration/application tests and the full repository suite
  passed; no provider calls were made.

## State boundary

Slice A does not collect Search Console, site or external-search observations.
Slice B — Google Search Console Connection + Evidence — remains not started.
V1-04 remains in progress pending the separately authorised next slice.
