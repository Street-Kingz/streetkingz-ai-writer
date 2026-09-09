# Street Kingz Codex-off Product recovery test

This is a standalone acceptance test for the bounded development recovery. It
does not use Codex, the Codex CLI/SDK, synthetic catalogue facts, manual
recommendations, or a second interpretation model.

## Required private prerequisites

Ben must first have an isolated local Supabase destination containing a private
copy of the actual retained Street Kingz evidence and the linked original run
state. It must have the repository migrations applied, including the
recommendation table and migration 38 diagnostics. The destination must be
loopback HTTP, separate from the accepted local environment, and must contain
five interpretation batches: batches 0–2 complete and batches 3–4 pending with
zero attempts. The manifest must record matching evidence/input hashes, model,
versions, original run linkage, and a cumulative upper cost bound no greater
than US$5.

The destination must also contain a provisioned development Business bound to
the private recovery user. Set these private shell variables without printing
them:

`V105_RECOVERY_DEST_SUPABASE_URL`, `V105_RECOVERY_DEST_PUBLISHABLE_KEY`,
`V105_RECOVERY_DEST_SERVICE_ROLE_KEY`, `V105_RECOVERY_EMAIL`,
`V105_RECOVERY_PASSWORD`, `V105_RECOVERY_MANIFEST`.

The service key and password are used only locally and are never written to the
result. Private evidence, the manifest, and the result directory must remain
outside Git.

## Exact Codex-off command

From the repository root, with the isolated destination running and the
variables above exported:

```sh
V105_RECOVERY_APPROVED=1 npm run v1-05:streetkingz:codex-off -- --run
```

The command performs destination checks before opening the application server,
signs in the provisioned development user, and invokes the actual Product HTTP
workflow. It does not run discovery, does not use the original failed session,
and does not make automatic retries. It accepts only the incomplete fourth and
unstarted fifth batches. A refusal or unknown result fails closed.

## Read-only retrieval after restart

After restarting the application, retrieve the saved bounded result without
generation or provider access:

```sh
npm run v1-05:streetkingz:codex-off -- --read
```

Set `V105_RECOVERY_RESULT` if the private result was stored at a non-default
location. The read output contains only saved status, recommendation IDs,
bounded saved fields, request/cost metadata, and reserved unknown exposure. It
does not expose raw responses or private evidence and performs no HTTP request.

## Safety and provenance

The original failed run and counters remain unchanged. The result records the
original/recovery linkage, code and evidence identity from the manifest,
actual request attempts, known cost, and reserved unknown exposure. The Product
route remains development-only: no publishing, site writes, autonomous paid
execution, or production acceptance is enabled.

This repository change proves runner plumbing only. The Codex-off acceptance
test has not been run here and is not claimed as passed.
