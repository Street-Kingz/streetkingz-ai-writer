# V1-05 Proposed Labelled Evaluation Corpus

Status: PROPOSED — frozen for owner review. Labels are proposed by the Product
Owner review process; material disagreement is adjudicated by Ben. Evidence
references are sanitized and do not include licensed dumps or query lists.

Exactly 48 stable cases are defined below. The two calibration cases make the
manifest total explicit while preserving the required behavioural classes.

| ID | Primary class | Provenance / maturity | Discoverable | Hard filter | Intent / customer job | Intervention / outcome | Overlap / dependency | Commercial | High impact | Reliability | Rationale / evidence ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| V105-EVAL-001 | existing product improvement | real / rich | YES | pass | product selection | improve product | none | YES | YES | YES | Real V1-04 product evidence; product-page fit. |
| V105-EVAL-002 | existing product improvement | real / sparse | YES | pass | product selection | improve product | none | NO | NO | NO | Real commerce plus bounded organic evidence. |
| V105-EVAL-003 | existing product improvement | historical / rich | YES | pass | product selection | improve product | same-job group A | NO | NO | NO | Accepted V1-01 evidence pattern. |
| V105-EVAL-004 | existing category improvement | synthetic / sparse | YES | pass | category selection | improve category | none | YES | NO | NO | Sparse category evidence remains interpretable. |
| V105-EVAL-005 | existing category improvement | real / rich | YES | pass | category selection | improve category | none | NO | YES | NO | Category target is a better fit than a new page. |
| V105-EVAL-006 | existing content improvement | synthetic / sparse | YES | pass | information seeking | improve content | none | NO | NO | NO | Existing content satisfies the job with a bounded improvement. |
| V105-EVAL-007 | existing content improvement | real / rich | YES | pass | information seeking | improve content | none | NO | NO | NO | Existing page and SERP fit. |
| V105-EVAL-008 | existing product improvement | real / rich | YES | pass | comparison / selection | improve product | same-job group A | NO | NO | NO | Existing target beats a duplicate new asset. |
| V105-EVAL-009 | existing category improvement | synthetic / sparse | YES | pass | category selection | improve category | none | YES | NO | NO | Commercial relationship is relevant context with limited evidence. |
| V105-EVAL-010 | appropriate new asset | real / rich | YES | pass | informational | create new asset | prerequisite: none | YES | YES | YES | No suitable existing target; new asset is appropriate. |
| V105-EVAL-011 | appropriate new asset | synthetic / mixed | YES | pass | comparison / selection | create new asset | none | NO | NO | NO | Mixed SERP supports a bounded new comparison asset. |
| V105-EVAL-012 | appropriate new asset | synthetic / sparse | YES | pass | informational | create new asset | evidence limited | NO | NO | NO | Sparse but valid evidence supports cautious creation. |
| V105-EVAL-013 | appropriate new asset | real / rich | YES | pass | category selection | create new asset | architecture prerequisite | NO | NO | NO | Existing pages do not cover the customer job. |
| V105-EVAL-014 | internal linking | real / rich | YES | pass | navigation / discovery | improve internal linking | dependency group A | YES | YES | YES | Linking supports a stronger target opportunity. |
| V105-EVAL-015 | internal linking | historical / mixed | YES | pass | navigation / discovery | improve internal linking | dependency group B | NO | NO | NO | Accepted V1-01 structure pattern. |
| V105-EVAL-016 | internal linking | synthetic / sparse | YES | pass | navigation / discovery | improve internal linking | dependency group B | NO | NO | NO | Sparse structure evidence requires bounded language. |
| V105-EVAL-017 | monitor / defer outcome | real / rich | YES | pass | uncertain selection | monitor / defer | dependency: evidence refresh | YES | NO | NO | Evidence is sufficient but timing is not favourable. |
| V105-EVAL-018 | monitor / defer outcome | synthetic / sparse | YES | pass | mixed intent | monitor / defer | uncertainty | NO | NO | YES | Sparse mixed intent should not force action. |
| V105-EVAL-019 | monitor / defer outcome | synthetic / sparse | YES | pass | informational | monitor / defer | stale evidence | NO | NO | NO | Freshness limitation controls timing. |
| V105-EVAL-020 | monitor / defer outcome | real / rich | YES | pass | product selection | monitor / defer | stock constraint | NO | NO | NO | Stock is context, not a ranking multiplier. |
| V105-EVAL-021 | insufficient evidence | synthetic / mixed | NO | pass | uncertain | insufficient evidence | missing demand | YES | NO | NO | Missing evidence is not zero demand. |
| V105-EVAL-022 | insufficient evidence | synthetic / sparse | NO | pass | uncertain | insufficient evidence | missing target | NO | NO | YES | Target cannot be validated. |
| V105-EVAL-023 | insufficient evidence | real / mixed | NO | pass | uncertain | insufficient evidence | provider-limited | NO | NO | NO | Source limitation prevents reliable choice. |
| V105-EVAL-024 | insufficient evidence | synthetic / sparse | NO | pass | uncertain | insufficient evidence | no usable source | NO | NO | NO | No evidence supports a decision. |
| V105-EVAL-025 | duplicate / lexical overlap | synthetic / rich | YES | reject: duplicate | same customer job | no candidate | lexical duplicate | NO | NO | NO | Exact normalized duplicate retains reason code. |
| V105-EVAL-026 | duplicate / same target | real / rich | YES | reject: same target | product selection | no candidate | same target group | NO | NO | YES | Same-page duplicate must not multiply work. |
| V105-EVAL-027 | duplicate / overlap | synthetic / mixed | YES | reject: overlap | comparison | no candidate | overlap group C | NO | NO | NO | Overlapping query group avoids volume addition. |
| V105-EVAL-028 | duplicate / competing new page | synthetic / rich | YES | reject: overlap | informational | no candidate | competing pages | NO | NO | NO | Existing target remains preferred where fit is clear. |
| V105-EVAL-029 | duplicate / same target | historical / rich | YES | reject: same target | category selection | no candidate | same target group | NO | NO | NO | Canonical target duplicate. |
| V105-EVAL-030 | duplicate / overlap | real / rich | YES | reject: overlap | product selection | no candidate | same-job group A | NO | NO | NO | Preserve one coherent candidate. |
| V105-EVAL-031 | wrong market | synthetic / rich | NO | reject: wrong market | product selection | no candidate | none | NO | YES | NO | Evidence market is outside GB. |
| V105-EVAL-032 | navigational / brand | real / rich | YES | pass | brand navigation | do nothing | none | NO | NO | YES | Brand query is not an organic growth intervention. |
| V105-EVAL-033 | wrong market | synthetic / mixed | NO | reject: wrong market | category selection | no candidate | none | NO | NO | NO | Locale mismatch is explicit. |
| V105-EVAL-034 | navigational / brand | synthetic / sparse | YES | pass | brand navigation | do nothing | none | NO | NO | NO | Navigational evidence should not create work. |
| V105-EVAL-035 | product mismatch | real / rich | NO | reject: mismatch | product selection | no candidate | none | NO | YES | NO | Query and product target do not match. |
| V105-EVAL-036 | wrong page type | synthetic / rich | YES | reject: wrong page type | category selection | no candidate | target mismatch | NO | NO | YES | Invalid target type is deterministic. |
| V105-EVAL-037 | invalid target | synthetic / sparse | NO | reject: invalid target | uncertain | no candidate | none | NO | NO | NO | Target is unavailable. |
| V105-EVAL-038 | product mismatch | historical / rich | NO | reject: mismatch | product selection | no candidate | none | NO | NO | NO | Product relationship is unsupported. |
| V105-EVAL-039 | low-volume commercial | real / mixed | YES | pass | product selection | improve product | dependency: stock | YES | YES | YES | Low demand does not erase credible commercial fit. |
| V105-EVAL-040 | low-volume commercial | synthetic / rich | YES | pass | category selection | improve category | none | YES | NO | NO | Low volume with strong customer fit. |
| V105-EVAL-041 | high-volume irrelevant | synthetic / rich | YES | pass | broad information | monitor / defer | relevance uncertainty | YES | YES | NO | High volume alone cannot justify irrelevant work. |
| V105-EVAL-042 | high-volume irrelevant | real / mixed | YES | pass | broad information | do nothing | none | NO | NO | YES | Commercial irrelevance remains explicit. |
| V105-EVAL-043 | consolidation / sequencing | real / rich | YES | pass | comparison / selection | consolidate existing pages | prerequisite: consolidation | YES | YES | NO | Consolidation precedes new-page creation. |
| V105-EVAL-044 | consolidation / sequencing | historical / rich | YES | pass | informational | improve existing content | prerequisite: canonical | NO | NO | NO | Fix target relationship before expansion. |
| V105-EVAL-045 | consolidation / sequencing | synthetic / mixed | YES | pass | category selection | improve category | prerequisite: architecture | NO | NO | NO | Category architecture precedes support content. |
| V105-EVAL-046 | consolidation / sequencing | synthetic / sparse | YES | pass | product selection | monitor / defer | prerequisite: evidence refresh | NO | NO | NO | Sparse evidence requires reassessment first. |
| V105-EVAL-047 | calibration / missing-data control | synthetic / sparse | NO | pass | uncertain | insufficient evidence | missing commercial data | NO | NO | YES | Missing COGS is unknown, not zero. |
| V105-EVAL-048 | calibration / commercial challenger | real / mixed | YES | pass | comparison / selection | improve existing target | dependency: target fit | YES | YES | YES | Commerce may alter priority only when grounded. |

The reliability subset is exactly 001, 010, 014, 018, 022, 026, 032, 036,
039, 042, 047 and 048. The commercial-context-sensitive paired subset is
exactly 001, 004, 009, 010, 014, 017, 021, 039, 040, 041, 043 and 048.
