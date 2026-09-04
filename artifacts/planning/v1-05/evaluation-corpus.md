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

Each row binds to the corresponding JSONL record and hash in the machine
manifest. The fixture reference is a JSONL case identity, not a second copy of
the evidence packet.

| Case | Fixture reference | SHA-256 |
|---|---|---|
| V105-EVAL-001 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-001` | `e1d71f64fef7eb4408328394e221a31f760e11ec1d50bb9201f3a782916c9c3d` |
| V105-EVAL-002 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-002` | `4e5333d890ea52dc281d82cc4bb425207e07f9d4122c08a25f1e52706cb134ae` |
| V105-EVAL-003 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-003` | `f2c2d3dbed18a952c10a4a9e80d523b76eba43933e3fc8eeac32a7396073c46e` |
| V105-EVAL-004 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-004` | `ecdce191b1b43f199264873757125762b114516655f9955b401f085d0f30c5bc` |
| V105-EVAL-005 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-005` | `842c43fa4beb50d2700582ad2e6acf2a472e9be3227ff10bec7edca52856df42` |
| V105-EVAL-006 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-006` | `285dfe59d07964aaaa09569dc5ab1bd3d572a5f7ce48e9fafb994680a2e17c0c` |
| V105-EVAL-007 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-007` | `5dd1f8cd6ac987270dd3d3b8726e6688f45202818c96ecb1c0eb173de4b33456` |
| V105-EVAL-008 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-008` | `8f92f94cb0d8f4523c73e411dfb3308241bc6994823f712c0595eb9c8650443c` |
| V105-EVAL-009 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-009` | `edad1cb846b1114485ed94c1e592d63c5f0850e77ddc0cf7210029115914fc81` |
| V105-EVAL-010 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-010` | `9dbc3ff231eea3bf74d9b23ce7e86b648b005dda493b5370570484789e2d6c3f` |
| V105-EVAL-011 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-011` | `49171270bcb7bbe610f0376654ae1d99e50b25d48d3ed8fb3226801c90cdb65c` |
| V105-EVAL-012 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-012` | `d57c7e241cec3c94edec38af0c9ef600b83c5b931e401d2f001407e5b42f43a9` |
| V105-EVAL-013 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-013` | `585df9376e199973c31218d6e18c0cac6d105b2f7dd548c0a17770628ed24da6` |
| V105-EVAL-014 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-014` | `fb996c43cc302d253ad62ab31bd699edba92673c51afd03c1824352e704b98cd` |
| V105-EVAL-015 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-015` | `2ddf39c0d734bc4a3346d011c8862cb073509227323c1b2bf322b4543141fdbd` |
| V105-EVAL-016 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-016` | `40536ae8aec4001514c6b59d2890445fb4a94b449d294661004745d09c239996` |
| V105-EVAL-017 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-017` | `ef56a1696b9a5b21e12a7fa0ff8b042f34728626e9e069c1d8cc7a9076af48ad` |
| V105-EVAL-018 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-018` | `20166219b66c1415a0bf63035b5043a235377b06750dc67dcfc386f3a832168e` |
| V105-EVAL-019 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-019` | `2738a6af9d7ed6998d823a31ed950341414bef941b28ad739ff05dc97b45a0cc` |
| V105-EVAL-020 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-020` | `618c5fed000c8cac89c97ff37e73faaba2b34c4872fc37f2d99b207eb1064591` |
| V105-EVAL-021 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-021` | `b44920ff393a45e27d409ceec76ad75c59b6a8f7015e46486dab91507b4d8b9d` |
| V105-EVAL-022 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-022` | `cca93770dfdc7fd34f547f6e3aa021ed54a917cbccfb434402c5183df80cbc44` |
| V105-EVAL-023 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-023` | `fec996145719fec496a113b91757531a59db00a5d61eb634a3edb19ef0fd6da3` |
| V105-EVAL-024 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-024` | `44072bac2356b30e1164cae6684c877717e11e4ed1e2bd0c136fbbc37ad98e0d` |
| V105-EVAL-025 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-025` | `8180ae419b28cdfeb6d4e3881375d773d0021e0a8e669a1e37893f4177443414` |
| V105-EVAL-026 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-026` | `41dcebb698c93d5c0224d7e4dd728750a1e6bceae29526e613a3b5d7ebef1932` |
| V105-EVAL-027 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-027` | `057e284c111bf30bb4d2a29e5bfeac201031ee310e64ad250fd6be89911bc0dc` |
| V105-EVAL-028 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-028` | `3fd602b0bb45e7e7b8bf597424340a77e087eaa3dc2cc6217406d7f1e58d0206` |
| V105-EVAL-029 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-029` | `a05aaa0cbb9f7ce15f906f63fb69e32507d72c27e1a3007224cb45d63995f773` |
| V105-EVAL-030 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-030` | `487406615801572bd45dfa3b92774e004d3ad1efa52b548a61145739d33ec2f8` |
| V105-EVAL-031 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-031` | `c795586908a645d2136af7ee75a0f306dcede16bc81029c3341deb9fe2767c1c` |
| V105-EVAL-032 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-032` | `d560587ee0002112d98e3a296fd913e23b6f2bde58fe77133061f536bd5673e7` |
| V105-EVAL-033 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-033` | `0fe071c2dedbcb36c07bf0b3b0211e4ee123dc8d85d801fdf269211d60d655e7` |
| V105-EVAL-034 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-034` | `cda2e4a90893d25fa1b18da9ff563476db1dbd96753bf2c32f1a9dc30a09c988` |
| V105-EVAL-035 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-035` | `4ad89d5379b207e58084c4724f861028f42fd51307d3c9c936b33a69c278dfbf` |
| V105-EVAL-036 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-036` | `e424cd4eb217bf005c199bc5b980241cc50f2b01593b20b3197567c12fa34ea5` |
| V105-EVAL-037 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-037` | `b65df0ee3ef215178b1cd9ee5fba3683fb56f292e9b7eaf9a258a054d5e56f5c` |
| V105-EVAL-038 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-038` | `d6f36cf476fdf2f5eb58e272738de7e08a54063fb21bafd505d1d58974b02eef` |
| V105-EVAL-039 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-039` | `54133da98a0ce1aec7eb5401314dd0f6a0eb81405911c6591469974c4d010977` |
| V105-EVAL-040 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-040` | `7680d48c05a8f1b7c7c02aadfe7edf3239a56cb761c9c933c31bc4ae9d267084` |
| V105-EVAL-041 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-041` | `1a2b2f9e75d89ae3cc9d68091db116b94477c4915ca57aa2e81a1eb3c22c82d1` |
| V105-EVAL-042 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-042` | `b9278467ed6d56b827bf437f35623ea090ae74cbe3022c12188862255ecb42bc` |
| V105-EVAL-043 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-043` | `7a0b3308cb36e851c236685fa2353f9b7f15f8d57c6dbff7168f8617f647906b` |
| V105-EVAL-044 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-044` | `834c3887631655ab299686f891c82087f8f413328150246ea9c2b4342b2aa082` |
| V105-EVAL-045 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-045` | `a7c20fd8fdcf5af6b18792f8298377f8320eb30d207c9637b0f754fd596698e0` |
| V105-EVAL-046 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-046` | `aa87c7c69ebad75d9ff99f129ad44c634075bab0de2da9dacd1252dbd137b8f0` |
| V105-EVAL-047 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-047` | `b9ede95779efc00b348d5f42d32d10d756bba014e1cdbdce9724a53ff03d7598` |
| V105-EVAL-048 | `fixtures/evaluation-inputs.jsonl#V105-EVAL-048` | `31aeb486542e7d9909800072dc14542e7819a37d624db677d5e141c252ab2e3d` |
