# V1-05 Slice A post-acceptance correction

Status: BLOCKED — disposable migration proof incomplete

Original Slice A acceptance: b17a02f0dbd9758cae10e757784ca1a6d9becf6d.
Original strict result: 31/38. Owner benchmark correction checkpoint:
6bf8bccbd65c5c23ec8e24ebbfdadb4d3331f119. Corrected-benchmark v1 baseline:
33/38 (86.84%), missing 014, 015, 016, 018 and 032.

The owner boundary correction withdrew temporary existing-target/new-asset
exclusivity. Slice A remains broad candidate discovery; Slice B owns target fit,
intent, redundancy and cannibalisation. Cases 010, 011, 013 and 041 therefore
remain unchanged.

The corrected Product implementation:

- validates strict type, target/direction and source relationships;
- supports homepage GSC discovery;
- resolves all supported external targets while retaining source-job
  candidates;
- emits directed missing-link candidates from genuine site, commerce and
  shared-GSC relationships;
- removes arbitrary all-pairs link generation;
- applies deterministic type/source round-robin capping;
- preserves durable production evidence IDs and selected run/generation
  references.

Non-live result: 38/38 (100%) strict discovery recall, zero high-impact misses.
Focused Slice A tests, corpus validator and secret scan pass. Full regression:
1,137 passed, 0 failed, 21 pre-existing skips.

Final local Street Kingz validation used durable evidence only and produced
run 46efeea3-22e2-4adc-a8a2-2abdafe50f3c under
v1-05-slice-a-2-provenance: 64 candidates, complete, cap not hit, and zero
missing durable provenance fields. All 64 were unresolved external source-job
new-asset candidates because the accepted primary site run contains no
inspected pages; the newer partial site attempt was not promoted.

The mandatory isolated from-zero migration proof was attempted with the
already-installed local Supabase PostgreSQL image and the named disposable
container was removed afterward. It could not apply the chain because the
image does not contain the platform-created vault schema:

ERROR: schema "vault" does not exist

Therefore disposable migration proof is not PASS, Slice A is not reaccepted,
and Slice B remains unauthorised. No normal Supabase reset occurred; accepted
evidence and historical v1 runs remain preserved. Model calls: 0. External
provider calls: 0. Critical: 0. High: 0. Migration-proof blocker: 1.
