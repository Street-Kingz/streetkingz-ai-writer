# V1-05 Proposed Evaluation Design

Status: PROPOSED — owner review required. All quantities and thresholds below
are frozen proposal values for review before implementation; they are not yet
accepted Product requirements.

## Labelled corpus

Use the actual 48-case manifest in
`artifacts/planning/v1-05/evaluation-corpus.md`, created before implementation
and frozen by case ID. The corpus
contains 32 evidence-grounded opportunity cases and 16 adversarial/control
cases:

| Class | Cases |
|---|---:|
| Existing product/category/content improvement | 9 |
| Appropriate new page/content asset | 4 |
| Internal linking / dependency | 3 |
| Monitor/defer or do nothing | 4 |
| Insufficient evidence | 4 |
| Duplicate, same-target or overlap cases | 6 |
| Wrong market / navigational-brand cases | 4 |
| Product mismatch / wrong page type / invalid target | 4 |
| Low-volume commercially credible | 2 |
| High-volume commercially irrelevant | 2 |
| Consolidation and sequencing dependency | 4 |
| **Total** | **48** |

Cases use frozen V1-04 evidence, valid historical V1-01 evidence where its
provenance remains valid, and synthetic/adversarial cases needed to cover
failure classes. No founder hint unavailable to a normal customer is included.
At least 12 cases are sparse-evidence cases and at least 12 are rich first-party
evidence cases; 8 cases intentionally combine sparse and rich source states.
The machine-readable label manifest is
`artifacts/planning/v1-05/evaluation-corpus.json`; its SHA-256 values bind each
case to one sanitized immutable input fixture in
`artifacts/planning/v1-05/fixtures/evaluation-inputs.jsonl`. Hashes cover the
canonical UTF-8 `JSON.stringify(input_packet)` value only. Input packets and
ground-truth labels are separate: labels are available only to the evaluation
harness after the engine run and are never runtime Product input. Manifest
references use the fixture file plus case ID as the JSONL case selector.

The planning-only validator is `artifacts/planning/v1-05/validate-corpus-v2.cjs`;
it verifies packet hashes, fixture coverage, prohibited answer fields,
commercial control equivalence and the predeclared subset counts. It is not
loaded by Product runtime.

The v2 input packets contain source facts, not evaluation conclusions: typed
commerce, page, Search Console and external observations, including explicit
numeric metrics, dates, market/language and legitimate source limitations. The
previous v1 signal-based fixture is superseded and is not a current benchmark
input. For each commercial-sensitive pair, the control is generated from the
same packet by removing approved commercial fields (price, stock, sales,
revenue, COGS/margin and explicit commercial constraints); all non-commercial
records remain byte/logically equivalent.
The real/historical cases are bounded references to already accepted evidence;
synthetic cases use reserved `example.test` URLs and neutral catalogue facts.
Case 039 includes demand 20 plus price, stock, sales, revenue, COGS and a
product/category relationship. Cases 041 and 042 include demand 12,000 and
11,000 plus unrelated catalogue/page facts. Case 043 has two content pages with
overlapping query/page observations and an internal-link relationship. Case 048
has two comparable content targets with equivalent organic evidence and
differing commercial stock/sales facts; its control is the same packet with
approved commercial fields removed.

Reviewer A is Ben, Product Owner. Reviewer B is ChatGPT performing an
independent governance review against this rubric. Codex may prepare the
manifest and calculate metrics but is not its own expert ground truth. Both
reviewers independently label discoverability, filter disposition,
customer-job/intent, intervention, severity, dependencies and usefulness;
material disagreements are adjudicated by Ben. Evaluation is blinded to
control/challenger labels where practical.

The final intervention mapping is explicit: `improve_existing_product`,
`improve_existing_category`, `improve_existing_content`, `create_new_asset`,
`improve_internal_linking` and `monitor_or_defer`. Consolidation is represented
as overlap/dependency reasoning and maps to an approved existing-page,
new-asset, internal-linking or monitor/defer intervention. No generic
consolidation executor is an enum.

Model bounds are 6 planned calls (5 interpretation batches plus 1 synthesis),
7 total request attempts maximum, and one run-wide retry only for transport or
schema failure. Successful interpretation responses are capped at 4,000
tokens, synthesis at 5,000, and all attempts share a 25,000-token output budget
and 180-second deadline. The 2,000-character candidate bound applies to the
combined bounded evidence-summary text, not raw source text; identifiers and
provenance are never truncated.

## Measurements and thresholds

- Discovery recall: at least **90%** of discoverable labelled opportunities
  surfaced in the bounded candidate universe. Discoverable means a case has the
  minimum evidence and target validity needed to be considered; an explicitly
  insufficient-evidence case is not a missed opportunity. Calculate as
  discovered discoverable cases / labelled discoverable cases and round to two
  decimals. High-impact discoverable opportunities missed: **0**.
- Filtering false-positive rate: at most **10%** of labelled non-opportunities
  retained after hard filtering.
- Filtering false-negative rate: at most **5%** of labelled valid opportunities
  rejected by filtering. FP/FN denominators include only cases labelled
  deterministically filterable at this stage; ambiguous cases are not penalized
  for passing to interpretation. High-impact hard-filter false negatives: **0**.
- Intent/intervention correctness: at least **85%** exact or substantively
  equivalent expert agreement on the 32 applicable cases. Mixed/uncertain
  labels count as correct only when uncertainty is preserved.
- High-impact decision errors: **0**, with zero fabricated evidence, fabricated
  commercial facts, wrong-tenant evidence, unsupported precise revenue claims,
  or unavailable evidence treated as zero/present. Hard-requirement violations:
  **0**.
- Recommendation usefulness: five-point rubric, minimum **4.0/5.0 mean**, with
  no dimension mean below **3.5** and at least **80%** of recommendations rated
  4 or 5 by both reviewers.
- High-impact intervention errors: **0**.
- Repeat reliability: all 48 cases receive one formal run. Exactly 12
  predeclared cases receive 5 frozen-input runs (60 repeated runs). More than 1
  of 5 materially changing disposition, intervention or priority tier without
  defensible uncertainty fails that case; any hard violation fails the run.

## Rubrics

Prioritisation is reviewed without a magic-number requirement across these
dimensions: organic relevance, customer-job fit, target/page fit, commercial
relevance, strategic supporting value, feasibility, dependency sequencing,
evidence grounding, confidence calibration, action worthiness and avoidance of
false precision. Each is rated 1–5; the output must show the vector and reasons,
not only a collapsed score. Missing inputs are `unknown`, never zero.

Recommendation usefulness is rated 1–5 for decision usefulness, evidence
grounding, intervention appropriateness, relative-priority credibility,
commercial appropriateness, clarity, limitations honesty and independence from
founder knowledge. A recommendation must state what was found, why it matters,
why now if applicable, evidence, confidence/unknowns, assumptions, intended
outcome, dependencies, failure conditions and reassessment trigger.

## Control/challenger and progressive evidence

Run exactly 12 predeclared commercial-context-sensitive paired cases through an
SEO-only control and a challenger using the same candidate universe and
non-commercial evidence plus approved commercial evidence. The challenger must
improve mean commercial appropriateness or action worthiness by at least **0.5**
points, with zero added high-impact errors and no material degradation in
evidence grounding or organic relevance. On commercial-neutral cases the
challenger need not improve; an unjustified decision change fails.

Run the same engine over sparse, rich and mixed packets. Missing sources must
reduce confidence or add limitations; they must not be treated as zero or make
the engine invent a candidate.

The exact 12-case reliability subset is 001, 010, 014, 018, 022, 026, 032,
036, 039, 042, 047 and 048. At least eight are expected to reach interpretation;
the remaining cases are deterministic boundary controls. The exact 12 paired
commercial subset is 001, 004, 009, 010, 014, 017, 021, 039, 040, 041, 043 and
048. Commercial-sensitive cases carry an explicit expected effect; neutral
cases require `no_material_change`.

## Street Kingz protocol

Freeze one sanitized snapshot identity from the accepted V1-04 snapshot before
evaluation. Run with no network, no founder hints and no changing evidence.
Report candidates, rejected candidates, no-action and insufficient-evidence
outcomes with evidence references and limitations. This proves the generic
boundary only; it does not prove independent-store performance.
