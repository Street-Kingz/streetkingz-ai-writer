# V1-05 qualification safety and evidence-lineage findings

Date: 2026-09-10

## Confirmed safety defect and bounded repair

On the required starting revision, `buildRecommendationRecord()` could promote
a candidate with `deterministic_disposition=bounded_out` and
`interpretation_state=pending` to `merchant_safety_state=safe`, `status=current`,
and an actionable intervention. Merchant safety was evaluated without first
checking applicable qualification. The repair adds the shared
`qualificationEligibility()` decision and applies it before promotion in the
recommendation engine and repository path.

Deterministic rejection remains `ignored` plus `no_action`. Unassessed,
bounded-out, incomplete, and uncertain interpretation remains `deferred` plus
`insufficient_evidence` for audit/reassessment. A qualified sparse candidate
still remains actionable with unknown commercial context; new-asset candidates
do not require an existing target URL.

## Retained evidence facts

Read-only inspection of the isolated destination found the retained commerce
generation 163 containing the product name `Synthetic Street Kingz Product`
and `Synthetic Category`. The exact customer job `Find the named Synthetic
Street Kingz Product.` occurs in persisted evaluations for the retained
decision/evaluation runs. Those evaluations are `complete` but
`retain_uncertain`, have unresolved target attribution and no attributed target
resources, and cite external observations 291–299 from external run 830.

Representative retained first-party evidence includes Search Console run 750,
including `car drying towel` (597 impressions, average position 29.742) and
`car drying towel 1200gsm` (2 impressions, average position 12). Representative
external observations include 1200 GSM drying-towel SERP results from run 830;
they are marked derived and retain provider task/seed provenance. The retained
site inspection run is 764. These facts establish the stored lineage, not the
truth of the underlying business inputs: provider responses do not by
themselves prove that the synthetic commerce record was a genuine business
record.

## Hand-off findings

Discovery stores candidate evidence references and source completeness; the
recommendation route merges candidates and evaluations and passes them to the
Product recommendation repository. The engine treats absent `commercial_context`
as unknown, so missing commercial data does not block advice. The persisted
candidate schema exposes `completeness`, while the engine's priority refinement
expects `evidence_maturity`; this is a projection gap (priority falls back to
the mixed/default path), not evidence that commercial data was mandatory.
Persisted recommendation provenance also has a null `interpretation_version`
because that field is not present on the candidate-evaluation row selected by
the current projection; it is missing hand-off data, not a rewritten batch.

The earliest separately justified follow-up is to bind recommendation
evaluation-row selection explicitly to the selected completed evaluation run
(the current route filters business and decision run, but not evaluation run).
That follow-up is not included in this bounded qualification repair.

This artifact records findings only; no retained recommendation set, source
record, completed batch, counter, cost, or accepted environment was modified.
