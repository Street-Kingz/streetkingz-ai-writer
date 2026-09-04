# V1-05 Slice A discovery ground-truth correction

Status: OWNER-APPROVED BENCHMARK CORRECTION — HARNESS-ONLY

The original frozen benchmark checkpoint was the V1-05 materialised corpus and
discovery-match manifest at the Slice A v1 acceptance lineage. The Slice A v1
acceptance SHA was `b17a02f0dbd9758cae10e757784ca1a6d9becf6d`.

The strict matcher review found that the prior seven misses were not all
Product failures. The pre-correction strict result was **31 / 38 = 81.6%**;
the misses were 014, 015, 016, 018, 032, 036 and 046.

Owner-approved corrections: 014 and 015 now test the missing reverse link
`page:page-b` → `page:page-a`; 016 includes the omitted source-shaped
`relation-1` Product↔Category relation and tests `page:page-a` → `page:page-b`;
018 targets content `page:page-b`; 036 targets observed Product/page
`product:p-a` and `page:page-a`; and 046 tests an unresolved external source
job as a new-asset source. Case 032 is unchanged and remains a genuine Product
requirement for homepage discovery from `search_console:row-1`.

The discovery-match schema is now v2 and uses `internal_link_direction` for
directed missing links. Acceptance thresholds, case labels, high-impact flags,
and the 38-case discoverable set are unchanged. Only fixture case 016 and its
input hash change; all other fixture bytes and hashes remain frozen.

This correction is evaluation ground truth only and must not be imported by
Product runtime code.
