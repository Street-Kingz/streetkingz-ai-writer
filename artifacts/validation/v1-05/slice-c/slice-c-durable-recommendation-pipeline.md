# V1-05 Slice C2 durable recommendation pipeline

This is development-only Product functionality. It makes no provider calls and
cannot publish, execute paid work, edit a store, or claim production acceptance.

## Integration point

The existing authenticated decision-run workflow remains the source of truth:
discovery persists candidates, evaluation persists interpreted candidates, and
`POST /api/product/decision-runs/:id/recommendations` consumes only a complete
evaluated run. The route uses the privileged server path for recommendation
writes and exposes only business-scoped authenticated reads.

## Persistence and security

Migration `20260931000000_v1_05_slice_c_recommendations.sql` adds one additive
`organic_recommendations` table. It references Business and decision run,
stores structured evidence/provenance and version fields, and has a unique
deterministic recommendation identity. Authenticated users receive SELECT
through an owner policy tied to `accounts.auth_user_id = auth.uid()`;
authenticated inserts/updates are not granted. Service role is the governed
server-write boundary. Migration count is now 37 and requires disposable
from-zero validation before deployment.

## Idempotency and lifecycle

`recommendationRepository.js` upserts by recommendation identity and applies
the same five-current cap as the domain ranking path. Completed, ignored,
superseded and withdrawn states are preserved during regeneration rather than
silently becoming current again.

## Merchant projections

Feed and detail projections order current actionable items first, then priority,
then deferred/reassessment items. They resolve safe product/category/page
references to names when supplied, retain stable references, and omit raw
candidate IDs, intent labels, provider output and internal benchmark metadata.

## Demo and controls

`npm run demo:v1-05:slice-c` writes the machine-readable and Markdown previews.
The synthetic preview includes an actionable `Improve XL Drying Towel`
recommendation, a deferred uncertain case, an unsafe page-fit case blocked
from action, and a no-action outcome. The twelve-case commercial calibration
remains unchanged and tests target/intervention invariance, bounded priority
refinement and unknown missing commercial context.

## Known production blockers

Production acceptance remains ungranted. Target correctness, evidence safety,
uncertainty, provenance, customer review/approval, tenant verification in the
deployed environment, and the broader V1 release gate still require proof.
There are no execution or mutation endpoints in this slice. Street Kingz live
Product evaluation was not run.
