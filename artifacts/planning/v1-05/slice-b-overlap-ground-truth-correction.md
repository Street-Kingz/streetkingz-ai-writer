# V1-05 Slice B overlap ground-truth correction

Status: owner-approved benchmark correction; fixture and discovery inputs remain frozen.

## Basis

- Prior frozen Slice B expectation checkpoint: `240685442d6920d5a0578e8f23ab8cf110b4e089`
- Prior deterministic result: FP 0, FN 6, FN rate 14.63% (6/41), high-impact FN 0.
- Affected cases: V105-EVAL-025 through V105-EVAL-030.
- Corrected label version: `owner-approved-slice-b-overlap-v4`.
- Thresholds remain unchanged: FP <=10%, FN <=5%, high-impact FN = 0.

## Pure Slice A v3 candidate diagnostic

The diagnostic used the frozen input packets and the current Slice A v3 pure discovery function. Candidate IDs are omitted because pure fixture discovery does not create production UUIDs; candidate order is diagnostic-only.

| Case | Candidates (type; allowed targets; source classes; evidence count) | Shared exact target | Shared source/evidence | Primary exists | Distinct duplicate |
|---|---|---|---|---|---|
| 025 | 2: new asset; `page:page-a`, `product:p-a`; external_search; 1. Existing product; `page:page-a`, `product:p-a`; external_search/search_console/site; 4 | none | external_search row-1 | yes | no |
| 026 | 3: new asset; `page:page-a`, `product:p-a`; external_search; 1. Existing category; `category:c-a`, `page:page-b`; site; 1. Existing product; `page:page-a`, `product:p-a`; external_search/search_console/site; 3 | none | external_search row-1 | yes | no |
| 027 | 3: existing content; `page:page-b`; external_search/search_console/site; 3. New asset; `page:page-a`, `page:page-b`, `product:p-a`; external_search; 1. Existing product; `page:page-a`, `product:p-a`; external_search/search_console/site; 3 | none | external_search row-1 | yes | no |
| 028 | 3: new asset; `category:c-a`, `page:page-a`, `page:page-b`; external_search; 1. Existing category; `category:c-a`, `page:page-b`; external_search/search_console/site; 3. Existing content; `page:page-a`; external_search/search_console/site; 3 | none | external_search row-1 | yes | no |
| 029 | 3: existing category; `category:c-a`, `page:page-b`; site; 1. Existing product; `page:page-a`, `product:p-a`; external_search/search_console/site; 3. New asset; `page:page-a`, `product:p-a`; external_search; 1 | none | external_search row-1 | yes | no |
| 030 | 3: existing content; `page:page-b`; external_search/search_console/site; 3. New asset; `page:page-a`, `page:page-b`, `product:p-a`; external_search; 1. Existing product; `page:page-a`, `product:p-a`; external_search/search_console/site; 3 | none | external_search row-1 | yes | no |

The target sets above are allowed-target context, not assertions that every candidate is attributed to every target. No pair shares an exact canonical target in the discovered candidate identities. The expected primary candidate exists in every case. The new-asset peer targets are bounded by the same source observation as required by the Slice B target-context contract.

## Owner decision

Preserving duplicate multiplicity in Slice A solely to make Slice B reject it would corrupt discovery identity. Slice A correctly merges exact logical duplicate discovery paths. Slice B is responsible for distinct candidate identities that remain objectively duplicate or overlapping.

These concepts remain separate:

- exact discovery merge: one logical candidate emitted by Slice A;
- deterministic distinct duplicate: multiple candidate IDs objectively equivalent by canonical target, directed-link, or normalized source job;
- overlap group: an order-independent relationship among two or more candidates;
- semantic overlap: interpretation of intent, target fit, uncertainty, and redundancy, not automatic deterministic rejection.

## Exact corrections

- 025, 026, 029: retained product candidate; deterministic pass; interpretation applicable; established targets `product:p-a` and `page:page-a`; intent `product_selection`; aligned page fit; `pre_slice_b_resolution=merged_by_discovery_identity`; no overlap labels.
- 027: deterministic pass; interpretation applicable; retain uncertain; established target `page:page-b`; mixed intent; ambiguous page fit; `overlap_group_c` retained.
- 028: deterministic pass; interpretation applicable; retain; established targets `category:c-a` and `page:page-b`; category selection; aligned page fit; `competing_pages` retained.
- 030: deterministic pass; interpretation applicable; retain uncertain; established target `page:page-b`; mixed intent; ambiguous page fit; `same_job_group_a` retained.

All six remain `primary_class=duplicate_overlap`. Reliability membership is unchanged. Fixture bytes, fixture SHA-256 values, Slice A discovery matches, and thresholds are unchanged. The primary class distribution is unchanged; intervention and run-outcome distributions are recalculated from the corrected owner truth.
