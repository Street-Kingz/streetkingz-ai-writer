# Controlled interpretation model benchmark

Frozen decision brief SHA-256: `2d96a3b3020de7bacea96bc54a85e72c42cd10c6867d612acdae884a161d75b5`

Model input/contract SHA-256: `f31a39a5fdd6ad0c3a8ab57ccb37a17f7f9c777f60b9261f5ad43c0481ab797a`

Both models received identical system instructions, user evidence and JSON Schema. GPT-4.1 used Chat Completions strict JSON Schema at temperature 0.1. Sol used Responses strict JSON Schema with high reasoning effort and no temperature field. Benchmark call-count integrity failed: the original process continued after control returned, causing two Sol calls. The later Sol artifacts overwrote the earlier Sol artifacts; GPT-4.1 was not retried.

## Scorecard

| Dimension | GPT-4.1 | Explanation | GPT-5.6 Sol | Explanation |
|---|---:|---|---:|---|
| Evidence synthesis | 4 | Connects Keyword Ideas, Search Console and some SERP/page facts, but several decisions rely on broad pairings. | 5 | Repeatedly connects page state, demand, first-party visibility and bounded SERP observations. |
| Specificity | 3 | Names phrases and areas, but two actions fail the vague-action contract and placement is sometimes broad. | 5 | Names exact placement, factual changes, constraints and trade-offs. |
| Commercial usefulness | 3 | Several useful changes, mixed with broad comparison/format assertions. | 5 | Prioritizes category clarity, choice support, claim qualification and non-duplication. |
| SEO usefulness | 3 | Useful query targeting, but occasionally approaches phrase insertion and unsupported SERP norms. | 4 | Uses query families naturally and distinguishes visibility from causation; one phrase-family match failed machine rules. |
| Page-state awareness | 4 | Correctly recognizes most existing content and unknown metadata; comparison wording triggers a contradiction. | 5 | Accurately handles existing FAQs, care, specs, links, XL comparison and unknown metadata in substance. |
| Use of Keyword Ideas | 4 | Uses specific high-demand terms, though sometimes too directly. | 5 | Uses specific families with anti-stuffing and unsupported-“best” constraints. |
| Use of SERP evidence | 3 | Produces useful themes but overstates comparison/specification formats. | 4 | Treats SERPs as observations and rejects unsupported norms; some cited relationships remain indirect. |
| Use of Search Console | 4 | Connects poor visibility to search changes while noting limits. | 5 | Uses actual URL visibility as corroboration and explicitly avoids causal claims. |
| Restraint | 4 | Six no-change and one insufficient-evidence decisions. | 5 | Three no-change and one insufficient-evidence decisions plus careful limits on every action. |
| Absence of generic advice | 3 | Two machine-vague actions and some generic prominence language. | 5 | Recommendations are concrete and bounded despite two lexical vague-action flags. |
| **Total** | **35/50** |  | **48/50** |  |

## Side-by-side material decisions

| Area | GPT-4.1 | GPT-5.6 Sol | Stronger | Material? |
|---|---|---|---|---|
| Search positioning | Add high-demand phrases to descriptions/headings. | Reposition the category signal in the opening summary, tie it to actual visibility and preserve differentiation. | Sol | Yes |
| Title/headings | Add one high-volume phrase to an H1/H2. | Clarify the H1 category while retaining Heavy Duty/1200GSM and avoiding superiority claims. | Sol | Yes |
| Differentiation | No change. | Reposition verified features and saturated-weight trade-off without uniqueness claims. | Sol | Yes |
| Description/benefits | Highlight SERP/PAA-aligned benefits. | Reorder verified use and benefit-to-feature links with restrained terminology. | Sol | Yes |
| Specifications | No change, claiming alignment with competitor formats. | No change because present and no external requirement is established. | Sol | Yes |
| FAQs | No change. | Preserve existing FAQs and consider one distinct PAA topic subject to product verification. | Sol | Yes |
| Comparisons | Add XL and broader alternatives using existing facts. | Add only an XL choice aid, cross-reference FAQ, reject unsupported waffle/twist comparisons. | Sol | Yes |
| Care/use | No change. | No change and explicitly rejects irrelevant waffle guidance. | Sol | No—same outcome, stronger rationale |
| Internal links | No change. | No change; distinguishes confirmed Origin link from unconfirmed Wash Mitt URL. | Sol | No—same outcome, stronger rationale |
| Metadata | Insufficient evidence. | Insufficient evidence, conditional audit only. | Tie | No |
| Clarity/trust | No change. | Clarify proximity of safety claims, conditions and wet-weight trade-off. | Sol | Yes |

## Result

Both preserved outputs are formally invalid under the unchanged validator. Sol is the clear human-quality leader, but the benchmark winner is **NEITHER** because validity is the first gate and the duplicate Sol call compromises controlled-run integrity. The run also exposes bounded lexical false positives that should be analyzed independently; preserved outputs must not be repaired retroactively.

API cost is unavailable: responses include token usage but not cost, and no authoritative local price table exists. No web lookup was permitted.
