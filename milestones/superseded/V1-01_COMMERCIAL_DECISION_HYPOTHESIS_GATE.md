Superseded Contract

Reason: The contract assumed the first validation store had sufficient established-store traffic and first-party performance data. The clarified Product must support progressive evidence, including low-traffic stores.

Milestone V1-01 — Commercial Decision Hypothesis Gate

Status: Superseded
Roadmap milestone: V1-01
Milestone type: Product hypothesis validation
Product code status: Authorised only within this approved V1-01 contract
Decision owner: Ben
Repository: Street-Kingz/streetkingz-ai-writer
Required base branch: main
Required base commit: 0b1832565fa1d7e6c2802b822d3b5c1cb872f6ef (0b18325)
Initial validation environment: Street Kingz as the test store, not the Product
Customer-facing capability enabled: None directly
Next milestone if passed: V1-02 — Single-Business Product Kernel

1. Objective

Determine whether adding reliable, private ecommerce commercial context produces materially better organic-growth decisions than a strong SEO-only analysis using the same opportunity candidates and the same non-commercial evidence.

The milestone must answer one question:

Does commercial ecommerce context cause the system to make materially better organic-growth decisions than strong SEO analysis alone?

This is a kill gate.

It is not a feature-building milestone.

2. Why This Milestone Exists

The approved Product thesis depends on the belief that the system can connect:

the organic-search opportunity;

the actual business;

the commercial consequences;

the realistic intervention;

and produce a more useful decision than a strong free SEO workflow that lacks private commercial context.

The repository already contains useful foundations for:

Product Intelligence;

Business Intelligence;

Search Console and external-search evidence;

candidate filtering;

intent and SERP interpretation;

evidence and provenance;

bounded model calls;

article-opportunity proof patterns.

It does not yet prove that private commercial context changes organic priorities usefully.

Building accounts, customer connections, dashboards and paid execution before this hypothesis survives would risk wasting months on a Product whose proposed intelligence advantage is not material.

3. Governing Hypothesis

Null hypothesis

Adding reliable commercial context does not materially improve the decision.

The Challenger may:

produce the same priorities;

change wording without changing action;

make only trivial ranking changes;

overfit to stock or revenue;

become less feasible or less evidence-grounded;

require hidden founder judgement;

produce false precision.

Product hypothesis

Adding reliable commercial context causes the system to:

prioritise a materially better organic action;

correctly demote, defer or reject an attractive but commercially poor SEO opportunity;

choose a more appropriate intervention;

account for business constraints that an SEO-only analysis cannot see;

remain explainable and evidence-backed.

The Product hypothesis passes only through predeclared evidence.

It does not pass because the Challenger sounds more sophisticated.

4. Decision Consequence

If the milestone passes

the Product thesis survives this gate;

V1-02 may begin after governance is updated;

the validated experiment becomes a foundation for the generic decision engine;

no competitive or outcome claim is automatically earned.

If the milestone fails validly

Product implementation stops;

D-032 — Commercial Context Is a Quality Hypothesis is reviewed;

PROJECT_STATE.md records the failure;

V1-02 does not begin;

the Product thesis must be revised, narrowed or rejected deliberately.

If the milestone is blocked or methodologically invalid

the result is neither Pass nor Fail;

one bounded correction cycle may be proposed;

the correction must address the stated methodological defect;

candidate selection and acceptance thresholds may not be changed merely because the output was disappointing.

5. Customer Capability Enabled

None directly.

This milestone is internal validation infrastructure.

It does not build:

customer accounts;

onboarding;

connectors as a customer Product;

an opportunity feed;

DIY guidance;

paid execution;

deployment;

monitoring;

customer UI.

Its value is avoiding months of building before the core decision advantage is proven.

6. Approved Inputs and Existing Foundations

The milestone may reuse, without redefining:

product-intelligence/;

business-intelligence/;

editorial-intelligence/context.js;

Search Console clients/providers;

DataForSEO clients/providers;

site extraction and page inventory;

evidence and provenance contracts;

controlled-call infrastructure;

candidate filtering;

intent and SERP interpretation;

no-action and insufficient-evidence patterns;

immutable artefact and proof conventions.

Existing article-specific modules may be:

imported;

adapted behind experiment-local interfaces;

used as evidence patterns.

They must not silently define the generic Product.

7. Experiment Boundary

The milestone is a read-only, internal, reproducible comparison using one fixed test-store opportunity universe.

The experiment contains two arms.

Control

A strong SEO-only decision using:

public website and catalogue information;

product and category identity visible from the site;

Search Console evidence;

current site structure and content;

external search demand;

SERP and competitor evidence;

search intent;

current organic visibility;

site-specific non-commercial feasibility evidence.

The Control must not receive private:

product sales;

category sales;

revenue contribution;

stock quantity beyond public availability;

COGS;

margin;

private conversion metrics;

private commercial constraints;

private business priorities.

Challenger

The same decision process using:

exactly the same candidate universe;

exactly the same non-commercial evidence;

exactly the same model/provider configuration and decision schema;

reliable private commercial context in addition.

The Challenger must not receive:

the Control output;

the founder’s preferred SEO target;

a desired winning product, category, page or keyword;

invented or estimated commercial values presented as facts.

8. Test-Store Data Package

8.1 Required non-commercial snapshot

The reproducible non-commercial package should include, where available:

canonical domain;

supported public products and categories;

canonical URLs;

public pricing and availability;

supported page inventory;

page type;

page content and metadata required for the decision;

internal links required for the candidate;

Search Console query/page evidence;

date windows and freshness;

external search demand;

current SERP evidence;

search intent;

competitor/result characteristics;

current organic visibility.

8.2 Required private commercial snapshot

The private commercial package must include the reliable data available for the test store, such as:

product and category identifiers;

units sold;

revenue;

sales velocity;

current stock quantity/status;

COGS or margin where available and reliable;

refunds or cancellations where materially relevant and reliably handled;

general business constraints;

general business objectives.

The minimum valid commercial package requires:

a reliable product/category mapping;

a meaningful trading window;

product- or category-level sales evidence;

current stock evidence;

at least one additional reliable commercial signal or explicit business constraint;

a reliability/availability status for every commercial field.

If this minimum cannot be established, the milestone is BLOCKED, not failed.

8.3 Time windows

The extraction must record exact dates.

Preferred windows are:

up to 365 complete days of trading/search evidence where available;

a recent complete 90-day window;

the preceding comparable 90-day window where useful.

The latest incomplete or materially lagged source dates must not be treated as complete.

If the available business history is shorter, the actual period must be disclosed and the validity impact assessed before running.

8.4 Business objective statement

Before decision outputs are generated, Ben may supply a short, fixed business-objective and constraints statement.

It may include general objectives such as:

grow profitable organic revenue;

avoid promoting supply-constrained products;

prioritise sustainable demand;

do not rely on increased paid advertising.

It must not name:

the product expected to win;

the page expected to win;

the keyword expected to win;

the intervention expected to win.

The statement must be frozen before the experiment runs.

9. Public Repository and Sensitive Data Rule

The repository is public.

Raw commercial data must not be committed.

The milestone must use two evidence boundaries.

Private run bundle

Store full sensitive inputs and full-value outputs under a gitignored path such as:

artifacts/private/v1-01/

The exact path may be adjusted if an existing safe convention is better.

The private bundle may contain:

raw WooCommerce exports or responses;

exact revenue;

exact units;

exact stock;

exact COGS/margin;

full commercial context;

full unredacted outputs;

Product-owner evaluation notes containing sensitive values.

Public governed proof bundle

Commit only sanitised evidence under:

artifacts/validation/v1-01/

The public bundle may contain:

schemas;

code/version manifest;

input file hashes;

extraction dates;

candidate IDs;

public URLs and public product names where appropriate;

redacted or banded commercial evidence;

Control and Challenger rankings without sensitive raw values;

evaluation rubric;

blind-review packages;

scores;

decision record;

test results;

cost and call counts;

limitations.

The public proof bundle must not expose:

exact COGS;

exact margin;

exact private sales/revenue where commercially sensitive;

exact private stock quantities where sensitive;

customer personal data;

credentials;

provider secrets.

Integrity

The public manifest must include cryptographic hashes for private input files and full private outputs so that the evaluated run is integrity-bound without publishing the data.

No personal customer information is required for this milestone.

10. Opportunity Universe

10.1 Candidate generation independence

The opportunity candidate universe must be generated and frozen before private commercial metrics are made available to the decision arms.

Private commercial data must not decide which candidates exist in this experiment.

This isolates the effect of commercial context on:

prioritisation;

rejection;

sequencing;

intervention selection.

It does not claim that commercial context can never inform future opportunity discovery.

10.2 Candidate sources

Candidates may be generated from:

near-win Search Console query/page clusters;

important existing pages with weak or declining visibility;

externally evidenced demand not adequately served by the site;

page/intent mismatch;

product or category coverage gaps visible from the public store;

internal-link or architecture opportunities where reliable evidence exists;

content refresh opportunities;

relevant indexability blockers tied directly to an organic opportunity.

10.3 Candidate diversity

The frozen universe must not be an article-topic list.

Where the evidence supports them, it should include at least three opportunity archetypes from:

improve an existing category or product page;

improve an existing content resource;

create a justified new page or resource;

improve internal linking or site structure;

monitor, defer or take no action.

If the evidence cannot support three archetypes, the limitation must be recorded before the decision runs.

10.4 Candidate record

Every candidate must include:

stable candidate ID;

target entity or opportunity;

relevant URL or proposed destination;

intent cluster;

current state;

public/non-commercial evidence references;

candidate source;

possible intervention classes;

missing evidence;

provenance;

candidate-universe hash.

Commercial fields and commercial scores must not exist in the frozen candidate record.

10.5 Candidate count

The target is a meaningful fixed universe of approximately 15–40 qualified candidates.

If fewer than 15 survive:

the reason must be explained;

the Product owner must decide before running whether the sample remains sufficient;

candidates must not be invented solely to reach the target.

If more than 40 survive:

deterministic, non-commercial qualification rules must reduce the set before commercial data is loaded.

11. Control and Challenger Isolation

The following must be identical between arms:

candidate universe;

candidate-universe hash;

non-commercial evidence;

evidence freshness;

decision schema;

output count;

model/provider;

model version;

reasoning setting;

token budget;

call count;

timeout;

retry policy;

candidate order;

deterministic rules unrelated to commercial context.

The only intentional differences are:

the Challenger receives the approved commercial snapshot;

the Challenger receives the approved rules explaining how reliable commercial context may influence the decision;

the Control receives an explicit statement that private commercial evidence is unavailable and must not be invented.

Tests must prove that:

no private commercial field leaks into the Control;

both arms use the same candidate-universe hash;

no Control output becomes Challenger input;

no Challenger output becomes Control input;

neither arm receives a preferred result.

12. Model Variability and Call Budget

12.1 Decision runs

Unless the decision layer is proven fully deterministic, run:

three Control decision runs;

three Challenger decision runs.

Maximum planned decision calls:

6

The same provider/model configuration must be used for all six runs.

12.2 Consensus

Create a consensus ranking for each arm using a deterministic published method such as:

median rank;

Borda-style points;

explicit tie handling.

The method must be fixed before outputs are inspected.

12.3 Stability

The evidence package must report:

top-candidate stability;

top-three stability;

intervention-selection stability;

material disagreements between repeats.

A single impressive stochastic output cannot carry the milestone.

12.4 Retries

No reasoning retry is allowed merely because an output is weak.

A schema-invalid or technically failed run may be rerun only under a predeclared technical-failure policy.

The policy must be applied equally to both arms.

All failed and replacement runs remain recorded.

12.5 Research cost bounds

Candidate research is shared between arms and performed before the candidate universe is frozen.

External provider work must be bounded.

No repeated live research is allowed merely to improve one arm.

13. Required Decision Output

Each run must return the same structured shape containing:

ranked recommendations;

candidate ID;

recommended priority;

recommended intervention;

action:

act;

defer;

monitor;

reject;

insufficient evidence;

explanation;

evidence references;

confidence;

relevant assumptions;

missing evidence;

what could make the recommendation wrong;

why it ranks above lower candidates;

why an attractive candidate was rejected where applicable.

The output must not contain a precise financial forecast unless the evidence and current governance expressly support it.

14. Blind Evaluation

14.1 Review packages

Generate two review packages labelled only:

Package A
Package B

Randomise which arm receives each label and preserve the mapping in a sealed/private manifest until scoring is complete.

The order in which Ben reviews the packages should also be randomised.

Perfect blinding may not be possible because one package may refer to commercial constraints.

Arm labels, implementation notes and developer commentary must still be hidden.

14.2 Product-owner review

Ben scores each package independently before the arm mapping is revealed.

The review must answer:

Which package would I actually follow?

Would either package change what I planned to work on?

Which recommendations are obvious?

Which recommendations are materially useful?

Which recommendations appear wrong?

Which rejected opportunities are valuable rejections?

Does the priority order make commercial sense?

Is the explanation credible?

What hidden founder knowledge would have been required?

Ben must score the fixed rubric before seeing which package is Control or Challenger.

14.3 Secondary governance review

After Ben scores both packages:

reveal the arm mapping;

ChatGPT reviews the method, evidence and scores against this contract;

neither ChatGPT nor Cody may rewrite Ben’s original blind scores;

disagreements are recorded.

The Product-owner score is the primary customer-value judgement.

Automated or model-based evaluation is supporting evidence only.

15. Evaluation Rubric

Score each dimension from 0 to 5.

15.1 Priority usefulness — 25%

Does the output allocate limited organic effort to the most worthwhile work?

15.2 Commercial fit — 20%

Does the output fit the real business, commercial constraints and ability to benefit?

15.3 Search and competitive feasibility — 15%

Does the output respect current visibility, intent, SERPs and realistic ability to compete?

15.4 Intervention appropriateness — 15%

Does it choose the right type of action rather than defaulting to an article or unnecessary new page?

15.5 Evidence and explainability — 15%

Can the recommendation be understood, inspected and challenged?

15.6 Honesty and uncertainty — 10%

Does it expose missing evidence, avoid false precision and allow no action?

Convert the weighted result to a score out of 100.

The rubric and scoring instructions must be frozen before Package A and Package B are reviewed.

16. Material Decision Improvement

At least one material decision improvement is required for a Pass.

A material improvement is not:

richer wording;

more metrics;

a one-place rank swap among otherwise equivalent tasks;

prioritising a product solely because it has high stock;

repeating a business objective back to the founder.

A material improvement is a change such as:

promoting an opportunity that the business should genuinely allocate effort to;

demoting or rejecting an SEO-attractive opportunity that is commercially poor;

changing the intervention because the business cannot exploit the original one;

recognising supply, margin, sales or commercial constraints that alter the action;

choosing an existing page improvement over a new article for commercially relevant reasons;

identifying a lower-volume opportunity with materially better expected business value and feasibility;

preventing wasted effort.

The Product owner must record:

the changed decision;

the commercial evidence responsible;

why the change matters;

whether it would alter actual work allocation.

17. Pass, Revise, Fail and Blocked Rules

17.1 Pass

The milestone passes only if all of the following are true:

Control and Challenger use the same candidate-universe hash.

Commercial data does not leak into the Control.

The experiment uses reliable, integrity-bound data.

Ben completes the blind rubric before arm reveal.

Challenger’s weighted score exceeds Control by at least 10 points out of 100.

Challenger wins at least four of the six rubric dimensions.

At least one material decision improvement is documented.

Challenger does not materially degrade evidence integrity or feasibility.

Challenger’s consensus top candidate appears in at least two of three runs.

At least two Challenger consensus top-three candidates appear in at least two of three runs.

The Challenger does not merely repeat obvious commercial facts.

The system can return no action or insufficient evidence.

The decision does not default to article creation.

No Critical or High factual, evidence, privacy or methodological defect remains.

All required public and private evidence is frozen.

ChatGPT returns PASS against the contract and Definition of Done.

Ben approves the milestone result.

17.2 Revise

The result is REVISE only where the test cannot answer the hypothesis because of a documented methodological or data defect, such as:

commercial data package invalid;

candidate universe corrupted;

arm contamination;

blind mapping exposed early;

provider failure made arms non-comparable;

evaluation package incomplete.

One bounded correction cycle is allowed.

The correction must not:

change thresholds after seeing results;

cherry-pick new candidates;

remove losing cases;

alter commercial data to favour the Challenger;

change only the weaker arm’s model or budget.

Both arms must be rerun where comparability was affected.

17.3 Fail

The milestone fails where the experiment is valid but:

Challenger scores less than 10 points above Control;

Challenger does not win at least four dimensions;

no material decision improvement exists;

differences are cosmetic;

commercial context makes priorities worse;

the result depends on hidden founder judgement;

the Challenger invents or overstates commercial facts;

the Challenger is materially less feasible or evidence-grounded;

the Challenger advantage is unstable.

A valid failure triggers Product review.

It does not trigger automatic optimisation until a pass appears.

17.4 Blocked

The milestone is BLOCKED where required data or access cannot establish a valid experiment.

Examples:

no reliable product/category sales mapping;

no current stock evidence;

insufficient organic evidence;

provider access unavailable;

raw data cannot be handled safely;

the test store cannot produce a meaningful candidate universe.

Blocked is not Pass or Fail.

18. Deliverables

18.1 Governance

this approved milestone contract;

Roadmap state transition:

V1-00 → Done;

V1-01 → Current;

Project State transition reflecting the same;

no unrelated governance changes.

18.2 Experiment implementation

A bounded experiment area such as:

validation/v1-01/

containing:

schemas;

candidate builder;

Control/Challenger input builder;

arm-isolation validation;

run orchestration;

deterministic consensus calculation;

blind-package generation;

sanitisation;

evidence manifest generation.

Equivalent paths are acceptable if repository conventions support them better.

18.3 Tests

Tests must cover:

candidate-universe immutability;

candidate-universe hash equality;

commercial field exclusion from Control;

commercial field inclusion rules for Challenger;

no PII in public artefacts;

sensitive-value redaction;

missing data remains missing;

no-action and insufficient-evidence output;

non-article intervention support;

consensus calculation;

blind mapping;

public/private artefact separation;

cost and call bounds;

malformed output and technical-failure policy.

18.4 Private evidence

Gitignored private bundle containing:

full input snapshots;

exact commercial metrics;

exact Control and Challenger runs;

arm mapping;

founder blind scores;

full evaluation notes;

private hashes and manifest.

18.5 Public governed evidence

Commit:

artifacts/validation/v1-01/

with, at minimum:

README.md
contract-reference.json
methodology.md
rubric.json
input-manifest.json
private-input-hashes.json
candidate-universe.sanitised.json
candidate-universe-hash.txt
control-consensus.sanitised.json
challenger-consensus.sanitised.json
package-a.md
package-b.md
blind-mapping-hash.txt
owner-evaluation.sanitised.json
stability-report.json
cost-report.json
test-report.md
limitations.md
decision.md

Exact filenames may change if the same evidence remains explicit and navigable.

18.6 Completion report

Cody must provide the completion report required by DEFINITION_OF_DONE.md.

19. Permitted Repository Changes

After this contract is approved, the milestone may:

add the approved milestone-contract file;

update ROADMAP.md and PROJECT_STATE.md for milestone activation;

add experiment-local validation code;

add experiment tests;

add bounded npm scripts required to run the experiment;

add gitignore rules for private V1-01 data;

add sanitised governed proof artefacts;

reuse existing internal modules through imports;

add narrow adapters around existing modules.

Core Product modules should not be refactored merely to improve elegance.

If a core modification is genuinely required to make the experiment valid:

Cody must stop;

identify the exact blocker;

explain why an experiment-local adapter cannot solve it;

obtain approval before changing the core module.

20. Explicit Non-Goals

Do not build or continue:

customer accounts;

authentication;

tenancy;

customer onboarding;

customer opportunity feed;

customer dashboard;

public Product UI;

complete DIY Product;

paid execution;

payment;

WordPress writes;

deployment;

rollback implementation;

monitoring;

GA4;

additional ecommerce platforms;

multiple test stores;

the free competitor gauntlet;

Product naming;

repository renaming;

Create SEO Article M7;

completion of the article executor;

a new article-writing feature;

additional executor families;

generic provider abstraction;

a generic analytics store;

a universal opportunity engine;

broad technical SEO;

backlink or rank-tracking infrastructure;

cross-customer learning;

public competitive claims.

The experiment may create generic internal records only to the minimum extent required to run this hypothesis test.

21. Build / Buy / Integrate Constraints

Use existing or licensed sources for:

Search Console evidence;

external search and SERP data;

WooCommerce/store evidence;

AI reasoning;

hashing and schema validation libraries where already available.

Do not build:

a search index;

a backlink index;

a keyword-volume database;

a generic crawler product;

a generic ecommerce analytics warehouse;

a customer connector architecture;

a model marketplace.

22. Security and Privacy Requirements

Before any run:

confirm the public repository boundary;

confirm private paths are ignored;

run a staged/untracked-file check;

scan public artefacts for exact sensitive values;

verify no credentials are written to artefacts or logs;

verify no customer PII is required or retained;

use read-only external access;

do not execute a live WordPress write;

do not commit raw provider responses containing sensitive business data without sanitisation.

Any sensitive-data exposure is a Critical defect and blocks completion.

23. Cost and Performance Requirements

The experiment must report:

number of provider calls;

number of AI decision calls;

input/output usage where available;

actual or estimated variable cost;

research reuse between arms;

run duration;

failures and retries.

Hard bounds:

maximum six planned decision calls;

no unbounded retries;

no repeated live research after candidate freeze;

no expensive second analysis added after seeing which arm is weaker.

A required technical rerun remains recorded.

24. Validation Plan

Phase A — Contract activation

Approve this contract.

Add it to the repository.

Mark V1-00 Done.

Mark V1-01 Current.

Commit and push governance activation.

Confirm a clean worktree.

Phase B — Method and data freeze

Inspect existing reusable modules.

Define experiment-local schemas.

Define candidate-generation rules.

Define extraction windows.

Define commercial field reliability.

Freeze the business-objective statement.

Freeze the evaluation rubric and thresholds.

Secure private-data handling.

Capture and hash the data package.

Generate and freeze the candidate universe.

No decision outputs may be generated before this phase is complete.

Phase C — Arm execution

Validate identical candidate-universe hashes.

Build Control inputs.

Build Challenger inputs.

Prove commercial exclusion/inclusion.

Execute three Control runs.

Execute three Challenger runs.

Calculate consensus.

Generate blind Package A and Package B.

Preserve the sealed mapping.

Phase D — Founder blind review

Ben reviews the packages independently.

Ben completes the rubric.

Ben records actual preferred action and material changes.

Scores are frozen.

Arm mapping is revealed.

Cody must not decide which package is “better” on Ben’s behalf.

Phase E — Governance review and decision

ChatGPT reviews methodology and evidence.

Apply Pass, Revise, Fail or Blocked rules.

Ben gives final approval.

Update:

PROJECT_STATE.md;

ROADMAP.md;

DECISIONS.md where required.

Freeze the evidence.

25. Benchmark

The primary benchmark is:

A strong SEO-only decision using all approved non-commercial evidence.

This is not the formal free-competitor gauntlet.

That occurs in V1-07.

A human SEO specialist is not required as a production dependency or milestone participant.

Human-specialist comparison may be retained as supporting evidence only if it can be performed without delaying the milestone or changing the experiment.

26. Evidence Required

Completion evidence must include:

base commit;

changed files;

exact commands;

tests;

input hashes;

date windows;

provider/model/version;

call counts;

costs;

candidate-universe hash;

Control/Challenger isolation proof;

all six runs;

consensus method;

stability;

blind mapping integrity;

Product-owner rubric;

material decision change;

public sanitisation proof;

limitations;

defects;

final decision.

Assertions without preserved evidence do not count.

27. Blocking Defects

Critical and High defects block completion.

Specific blockers include:

Critical

sensitive commercial data committed publicly;

credentials exposed;

PII retained unnecessarily;

arm contamination;

candidate universe altered after seeing commercial data or outputs;

fabricated commercial evidence;

falsified or overwritten evaluation results.

High

Control and Challenger use different non-commercial evidence;

candidate-universe hashes differ;

model/provider settings differ without approval;

blind scores are completed after arm reveal;

evaluation thresholds change after results;

experiment requires hidden founder target selection;

outputs cannot be reproduced or integrity-checked;

Challenger cannot explain the commercial decision change.

28. Completion Condition

The milestone is Done only when:

every applicable Definition of Done gate passes;

the experiment has a valid PASS, FAIL, REVISE or BLOCKED outcome;

no Critical or High defect remains;

all required evidence is preserved;

ChatGPT reviews the evidence against this contract;

Ben approves the conclusion;

PROJECT_STATE.md reflects reality;

ROADMAP.md reflects the authorised next state;

the completed boundary is frozen.

Pass transition

V1-01 → Done;

V1-02 → Current.

Valid fail transition

V1-01 → Done — Hypothesis Failed;

Product implementation → Paused;

Product-level decision review → Current.

Revise transition

V1-01 remains Current;

one bounded corrected experiment contract amendment is recorded.

Blocked transition

V1-01 → Blocked;

blocker and required owner action are recorded;

no later milestone begins.

29. Final Rule

This milestone exists to learn whether the Product deserves to be built.

It must not be turned into a miniature version of the full Product.

Use the least implementation necessary to run a fair, reproducible and commercially meaningful test.

If the Challenger clearly wins, move forward.

If it does not, stop pretending and confront the result.
