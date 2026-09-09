# Street Kingz Codex-off Product recovery test

This is a standalone acceptance test for the bounded development recovery. It
does not use Codex, the Codex CLI/SDK, synthetic catalogue facts, manual
recommendations, or a second interpretation model.

## Required private prerequisites

Ben must first have an isolated local Supabase destination containing a private
copy of the actual retained Street Kingz evidence and the linked original run
state. The runner now refuses repository `.env` inheritance and requires a
private config at `~/.config/streetkingz/v1-05-recovery.json` (or
`V105_RECOVERY_CONFIG`). That config must identify a loopback destination whose
origin differs from the accepted environment, and contain only local secrets.
The destination must have the repository migrations applied, including the
recommendation table and migration 38 diagnostics. It must contain five
interpretation batches: batches 0–2 complete and batches 3–4 pending with zero
attempts. The manifest must record matching evidence, candidate and batch
hashes, model/settings, original run linkage, and a cumulative upper cost bound
no greater than US$5.

The destination must also contain a provisioned development Business bound to
the private recovery user. The service key, OpenAI key and password are read
only from the private config and are never written to the result. Private
evidence, manifest, state and result files remain outside Git.

## Exact Codex-off command

From the repository root, with the isolated destination running and the
variables above exported:

```sh
V105_RECOVERY_APPROVED=1 npm run v1-05:streetkingz:codex-off -- --run
```

The command performs destination/hash checks before opening the application
server, binds Product environment variables to that destination, verifies the
signed-in user with `auth.getUser(token)` and Business ownership, and invokes
the actual Product HTTP workflow. It requires `201` plus
`interpretation_complete`; `202` is not completion. It does not run discovery,
does not use the original failed session, and does not make automatic retries.
The pre-dispatch guard durably reserves each of the two allowed requests and
fails closed on unknown cost/outcome or request/budget exhaustion.

## Read-only retrieval after restart

After restarting the application, retrieve the saved bounded result without
generation or provider access:

```sh
npm run v1-05:streetkingz:codex-off -- --read
```

The command starts a fresh local Product instance, authenticates, and retrieves
the saved recommendation IDs through the feed/detail routes. Generation and
provider access are not invoked. The output contains only saved status,
merchant fields, request/cost metadata, and reserved unknown exposure; it does
not expose raw responses or private evidence.

## Safety and provenance

The original failed run and counters remain unchanged. The result records the
original/recovery linkage, code and evidence identity from the manifest,
actual request attempts, known cost, and reserved unknown exposure. The Product
route remains development-only: no publishing, site writes, autonomous paid
execution, or production acceptance is enabled.

The repository change proves runner plumbing only. The actual private
destination/configuration was not available in this workspace, so the
Codex-off acceptance test has not been run and is not claimed as passed.
