# V1-04 Slice B1 — Google Search Console Customer Connection

Status: `READY FOR REAL GOOGLE ACCEPTANCE`

This artifact records the bounded B1 implementation and deterministic local
proof. No Google account data, tokens, credentials, property responses or
customer evidence are stored here.

## Implemented boundary

- Customer-authenticated start and reconnect endpoints create a tenant-bound,
  fifteen-minute, single-use OAuth attempt.
- The Product-owned OAuth client uses HTTPS callback configuration, exact
  `webmasters.readonly` scope, offline access, high-entropy state and S256 PKCE.
- Authorization codes are exchanged server-side. Only the customer refresh
  token is stored in Vault; access tokens are request-memory-only.
- Sites are discovered through the official read API and selected only after a
  fresh safe property probe.
- URL-prefix properties use strict scheme, host, port and path-boundary rules.
- Domain properties use registrable-domain matching, including `co.uk`, while
  later evidence remains constrained to the Business canonical site.
- Activation occurs only after property verification. The organic source is
  then bound to the same-Business GSC Connection with evidence state
  `never_collected`.
- Disconnect removes the local Vault secret, invalidates pending attempts,
  preserves evidence LKG and does not claim remote Google revocation.
- GSC operations use provider-specific Connection state and do not use the Woo
  lifecycle or Business-level Woo status as their state machine.

## Recovery and validation record

- A local acceptance environment reset incident removed local runtime rows; it
  did not alter committed V1-03/Slice A evidence and did not contact Google or
  WooCommerce. The incident is recorded separately in
  `b1-local-reset-incident.md`.
- The clean current local database was verified at nine migrations through the
  B1 migration, with zero Accounts, Stores, sources or runs.
- A verified detached worktree on project
  `streetkingz-ai-writer-v104-b1-zero-proof` used ports 56320–56329. All nine
  migrations applied from empty state and a disposable authenticated site
  source completed a lifecycle smoke proof. The temporary stack was removed.
- A separate detached upgrade proof applied Slice A migrations, retained a
  representative complete source/run, applied both B1 migrations, and verified
  the source remained complete while the B1 objects/functions existed. That
  temporary stack was removed; the normal local stack remained running.
- The B1 focused tests passed 4/4 and the Slice A local integration passed 1/1
  after the reset. No live Google authorization was performed.

## Deterministic proof

- Four focused B1 tests passed: exact OAuth scope/PKCE, PSL-aware property
  normalization, URL-prefix/domain matching, and no Search Analytics collection.
- Slice A local integration remained green after the B1 migration.
- No live Google authorization or Google API call was performed.

## Acceptance boundary

B1 is ready for Ben's owner-authorized real Google acceptance. B2 — Search
Analytics evidence acquisition — remains not started. V1-04 remains in progress.
