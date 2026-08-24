Roadmap

Status: Active authoritative V1 build sequence
Last updated: 2026-08-23
Product name: Not yet selected; referred to as the Product
Decision owner: Ben
Governance baseline: 42c4c5933d71b87f471334d4cde3de8aa3a19194 (42c4c59)
Implementation audit baseline: 1c8d0f343f9482ea1eed3434831240de47888b0a (1c8d0f3)
Project State basis: PROJECT_STATE.md, dated 2026-08-23
Current Product implementation status: V1-02 Product implementation is authorised only within the approved V1-02 Single-Business Product Kernel contract

1. Purpose of This Document

This document defines the approved route from the current repository state to the first coherent V1 Product.

It exists to prevent:

returning to the superseded article-first roadmap;

building whatever appears interesting next;

treating existing code as the Product strategy;

starting customer-facing work before the core hypothesis survives testing;

building multiple executor families before one is justified;

expanding infrastructure beyond what the current Product requires;

cleaning non-blocking technical debt instead of delivering customer value;

confusing long-term Product Scope with immediate implementation;

running several milestones in parallel;

weeks of work turning into months because the finish line moved.

PRODUCT_VISION.md defines why the Product exists.

PRODUCT_SCOPE.md defines what belongs within the Product boundary.

DECISIONS.md records settled choices.

PROJECT_STATE.md records what is true today.

DEFINITION_OF_DONE.md defines what may be called complete.

COMPETITORS.md constrains competitive claims and build/buy/integrate choices.

This document defines the order in which approved V1 capability is created and proven.

2. Authority

The governing hierarchy is:

PRODUCT_VISION.md

PRODUCT_SCOPE.md

DECISIONS.md

ROADMAP.md

current milestone contract

current task

DEFINITION_OF_DONE.md applies to every milestone and task.

PROJECT_STATE.md records implementation reality and may expose that a planned milestone is no longer technically valid. It does not silently alter Product Vision or Scope.

COMPETITORS.md is evidence and constraint. It is not a feature shopping list.

If this Roadmap conflicts with a higher-authority document, work stops and the higher-authority document wins until the conflict is corrected.

3. Roadmap Operating Rules

3.1 One active milestone

Only one Product milestone may be active at a time.

Research, fixes and implementation outside the active milestone are prohibited unless they address:

a Critical or High defect;

an immediate security or data-loss risk;

a dependency explicitly included in the milestone contract;

a formally approved Roadmap change.

3.2 A Roadmap milestone is not an implementation instruction

Before Cody begins a milestone, a milestone contract must be created using the template in DEFINITION_OF_DONE.md.

The contract must define:

objective;

customer capability enabled;

dependencies;

deliverables;

exact acceptance criteria;

validation plan;

evidence required;

relevant benchmark;

explicit non-goals;

completion condition.

3.3 Finish, accept and freeze

A milestone does not end when code is written.

It ends only when:

applicable Definition of Done gates pass;

evidence is preserved;

ChatGPT returns PASS;

Ben approves it;

PROJECT_STATE.md is updated;

the completed boundary is frozen where appropriate.

Only then may the next milestone begin.

3.4 No silent Roadmap expansion

New discoveries go to BACKLOG.md unless they invalidate the current milestone.

A competitor releasing a feature does not automatically change the Roadmap.

A useful refactor does not automatically become required work.

3.5 No speculative dates

This Roadmap defines sequence and gates, not delivery promises.

Calendar estimates should not be added until actual velocity from completed new-roadmap milestones provides evidence.

3.6 Existing code is leverage, not authority

Existing article, editorial, evidence and WordPress capabilities should be reused where they reduce the cost of an approved milestone.

They must not force the Product back into an article-writer shape.

3.7 Risk-first sequencing

The earliest work must test the assumptions most capable of killing the Product before substantial customer-platform infrastructure is built.

3.8 No second executor before V1

V1 contains one paid executor.

Additional executors are Post-V1 and may only enter a later Roadmap after evidence from real recommendations and customers.

4. V1 Finish Line

V1 is not a collection of modules.

V1 is the following complete customer journey:

A customer creates an account.

The customer connects one supported ecommerce business.

The Product connects the minimum required commerce, search and site evidence.

The Product understands the minimum commercial and organic context.

The Product discovers and filters candidate opportunities.

The Product recommends the work that deserves attention or honestly recommends no action.

The Product explains:

what it found;

why it matters;

why it is prioritised;

the evidence;

confidence and limitations;

what the customer should do.

The Product gives the customer a complete free DIY implementation route.

The customer can retain the recommendation and use it elsewhere.

One supported recommendation can offer paid autonomous execution.

The customer understands and confirms the paid action.

The Product prepares the work.

The customer reviews, amends and approves the exact version.

Only the approved work is deployed.

Deployment is verified and recoverable.

Relevant baseline and post-change signals are monitored.

The full decision and execution can be audited.

The Product has passed the required real-store, independent-store and free-competitor validation gates.

Anything less is not V1.

5. Explicit V1 Exclusions

The following are not required for V1 and must not interrupt this Roadmap:

a separate analytics-style Organic Overview;

a fully interactive Guided DIY product;

rich multi-year recommendation history;

GA4 unless an evidence gate proves it is essential;

more than one paid executor;

multi-business accounts;

team roles;

agency workspaces;

Shopify or other ecommerce platforms;

automatic deployment without per-intervention approval;

broad all-keyword rank tracking;

generic technical SEO automation;

a generic MCP or WordPress-action layer;

programmatic page generation;

AI-shopping or answer-engine optimisation;

cross-customer model learning;

cross-customer training data;

advanced CLV, attribution or commercial analytics;

Product or repository renaming before the naming decision;

a second content workflow simply because a competitor has one;

cleanup of non-blocking legacy code or proof artefacts.

These items belong in BACKLOG.md or remain Future / Evidence-Gated.

6. Strategic Sequence

The V1 Roadmap deliberately follows this logic:

Prove the decision advantage before building the full customer shell.

Then:

Build the minimum secure customer and data foundation.

Then:

Turn the decision engine into the strongest useful free Product we can validate.

Then:

Let real recommendations and customer behaviour select the first paid executor.

Then:

Build one complete execution vertical slice.

Then:

Validate the full Product before public launch.

The Create SEO Article workflow is preserved as a strong candidate primitive.

It is not completed first because the audit established that:

it remains article-specific;

it lacks customer delivery;

it lacks the free DIY Product;

it lacks a paid offer;

it lacks customer review and approval;

it lacks customer-bound deployment and recovery;

it lacks monitoring;

it is not close to the new paid-executor Definition of Done.

Part I — Roadmap Overview

7. Milestone Summary

ID

Milestone

Primary result

Status

V1-00

Governance Activation

Current governance, Project State, Roadmap and Backlog become the clean repository operating system

Done

V1-01

Progressive Evidence Decision Gate

Prove or reject that commercial context materially improves organic-growth decisions

Done

V1-02

Single-Business Product Kernel

Secure account, tenant, durable state, audit and connection foundation

Current

V1-03

WooCommerce Commerce Connection

Read-only commerce ingestion and minimum commercial business model

Not started

V1-04

Organic Evidence Connections

Search Console, site understanding and external search evidence connected safely

Not started

V1-05

Generic Opportunity and Recommendation Engine

Generic, evidence-backed prioritisation that does not default to article creation

Not started

V1-06

Complete Free Intelligence Experience

Opportunity feed, detail, evidence, plain-English DIY guidance and portability

Not started

V1-07

Free Product Validation Gate

Real-store usefulness, independent validation and free-competitor gauntlet

Not started

V1-08

First Executor Selection Gate

Select exactly one paid executor from observed evidence

Not started

V1-09

First Paid Executor Vertical Slice

One complete paid “Do it for me” workflow from offer to monitoring

Not started

V1-10

Independent Execution Validation and Private Alpha

Prove safe customer use, costs, support and executor reliability beyond the test store

Not started

V1-11

Public V1 Release Gate

Complete every release, claims, security, support and validation gate

Not started

Milestone IDs deliberately do not continue the historical M3–M7 naming.

Part II — Detailed Milestones

8. V1-00 — Governance Activation

Status: Done

Objective

Activate the new repository governance system and establish the first authorised Product milestone.

Why This Exists

The Product cannot remain padlocked if Vision, Scope, Decisions, State and Roadmap are not committed and treated as the single source of truth.

Deliverables

committed PROJECT_STATE.md;

committed ROADMAP.md;

initial BACKLOG.md;

clean worktree;

all governance links and filenames verified;

DECISIONS.md updated with Roadmap resolutions where required;

approved milestone contract for V1-01;

explicit freeze on old article-first implementation work.

Acceptance Criteria

Canonical root governance files exist:

PRODUCT_VISION.md;

PRODUCT_SCOPE.md;

COMPETITORS.md;

DECISIONS.md;

DEFINITION_OF_DONE.md;

PROJECT_STATE.md;

ROADMAP.md;

BACKLOG.md.

Historical writer Roadmap and Project State remain archived.

No Product code is changed.

npm test passes under the documented localhost-permitted environment.

The worktree is clean after commit and push.

PROJECT_STATE.md identifies V1-01 as the current approved milestone.

A bounded V1-01 milestone contract is approved before implementation begins.

Explicit Non-Goals

no Product code;

no repository rename;

no Product name;

no architecture refactor;

no Create SEO Article continuation;

no provider integration changes;

no user interface.

Completion Decision

When accepted, governance rebaseline is complete and V1-01 becomes the only authorised Product milestone.

9. V1-01 — Progressive Evidence Decision Gate

Status: Done

Objective

Prove that the Product can generate a useful, evidence-backed organic-growth plan for a low-traffic ecommerce store using sparse but reliable evidence, and that richer first-party commercial or search evidence can refine the recommendation without requiring a separate Product.

Customer Capability Enabled

None directly.

This milestone validates progressive evidence operation before further Product investment.

Why This Comes First

The most dangerous unresolved assumption is not account infrastructure or UI. It is whether useful recommendations can be produced honestly from sparse evidence and then refined as richer evidence becomes available.

Existing Foundations to Reuse

Product Intelligence;

Business Intelligence;

Search Console and DataForSEO provider contracts;

site extraction;

evidence/provenance;

bounded candidate filtering;

intent and SERP interpretation;

controlled calls;

article-opportunity proof patterns.

progressive evidence maturity and confidence handling.

Deliverables

automated read-only acquisition where available;

current site and catalogue understanding;

real external search-demand and SERP evidence;

available WooCommerce sales, stock and margin evidence;

Search Console evidence when available, with no minimum traffic requirement;

explicit evidence-maturity status and missing-data semantics;

three to five prioritised recommendations;

intervention selection that does not default to articles;

complete DIY guidance for the top recommendation;

a comparison showing what changed or became more confident after richer evidence was added;

honest no-action and insufficient-evidence states;

frozen evidence, inputs and outputs.

Required Commercial Context

Use only reliable available evidence such as:

products and categories;

sales performance;

stock;

COGS or margin where available and trustworthy;

business priorities explicitly supplied;

commercial constraints;

existing Product and Business Intelligence.

Unavailable evidence remains unavailable.

It must not become zero or be invented.

Acceptance Criteria

The milestone passes only if:

Control and Challenger evaluate the same candidate universe.

Control and Challenger receive equivalent non-commercial search and site evidence.

No preferred answer is supplied to either run.

Output labels are hidden during Product-owner review where practical.

The Challenger does not merely repeat obvious facts such as “high stock means prioritise this.”

The sparse-evidence output is useful and actionable by itself.

External search and SERP evidence is real and current.

Recommendations are not simply one per catalogue product.

Missing traffic data does not block analysis.

At least one recommendation is credible enough that Ben would genuinely consider implementing it.

Richer available evidence either changes priority or intervention, or materially strengthens, weakens or qualifies the reasoning and confidence for a valid reason.

The result clearly explains why.

No article-by-default behaviour occurs.

The system can return no action or insufficient evidence honestly.

No hidden founder target exists.

No Critical or High defect remains.

All evidence, inputs and outputs are frozen.

Failure Outcome

If the sparse-evidence output is not useful, the external evidence is not real/current, recommendations default to catalogue products or articles, richer evidence cannot be explained, or the workflow relies on invented values or hidden founder targets, the milestone fails.

On failure:

Product implementation stops;

PROJECT_STATE.md is updated;

the progressive-evidence Product thesis is deliberately reviewed;

no customer-platform milestone begins until a new decision is approved.

Explicit Non-Goals

customer account;

authentication;

customer UI;

general onboarding;

paid execution;

deployment;

completing Create SEO Article;

GA4;

six-run Control/Challenger experiment;

10-point blind-scoring requirement;

second test store;

public competitive claim.

Completion Decision

Independent established-store validation remains governed by V1-07 and later milestones.

PASS authorises V1-02.

FAIL triggers Product-level review rather than automatic iteration.

Accepted Outcome

The sparse/low-traffic recommendation journey was proven across the complete 27-product catalogue using live site, fresh SERP and Search Console evidence. Missing commercial data remained explicit; misleading and off-intent evidence was filtered; deterministic evidence preparation preceded strategic reasoning; exact page-level attribution corrected the earlier cluster-level targeting defect; distinct interventions and complete DIY guidance were produced; and no article-by-default behaviour or live write occurred.

The accepted opportunity was optimisation of the Stubby Gun + Foam Lance Bundle page within the pre-wash and pressure-washer customer job. This is validation evidence only; it was not automatically implemented.

10. V1-02 — Single-Business Product Kernel

Objective

Create the minimum secure, durable customer foundation required for one account to connect one ecommerce business.

Customer Capability Enabled

A customer can create an account and establish one isolated business workspace with clear connection and data status.

Why This Comes Here

The Product kernel is expensive infrastructure.

It should only be built after the core decision hypothesis survives V1-01.

Architecture Decision Gate

Before Product code begins, the milestone contract must resolve O-008 through a bounded architecture decision record covering:

managed authentication;

durable relational or equivalent persistence;

tenant isolation;

encrypted secret storage;

audit events;

job execution requirements;

continuation of the current Node/Express foundation versus bounded evolution.

The decision should prefer managed commodity infrastructure and incremental evolution.

It must not create a speculative distributed architecture.

Deliverables

managed authentication;

one account → one business relationship;

durable customer, business and connection records;

tenant-scoped storage;

secure secret references;

connection consent and status model;

disconnect and deletion foundations;

audit-event model;

failure and support diagnostics;

migration path from local artefacts where required;

test and development environment setup;

architecture decision record.

Acceptance Criteria

Multiple synthetic accounts cannot access each other's data.

One account can connect only one business in V1.

No team, agency or multi-site capabilities are created.

Secrets are encrypted using approved managed infrastructure.

Secrets are absent from client code, logs and Product artefacts.

Read-only and write permissions are distinguishable.

Disconnect, revocation and deletion behaviour is defined and tested for the bounded foundation.

Audit events identify customer, business, action and time.

Local test runs are reproducible.

Existing intelligence contracts are not rewritten unnecessarily.

No Product feature is coupled directly to Street Kingz.

No Critical or High security defect remains.

Explicit Non-Goals

commerce connector;

GSC connector;

opportunity feed;

paid execution;

payments;

team roles;

agency management;

repository or Product rename;

generic provider marketplace;

broad UI design system.

Completion Decision

The kernel is frozen at the minimum required boundary.

New account features go to Backlog.

11. V1-03 — WooCommerce Commerce Connection and Minimum Commercial Model

Objective

Connect one WooCommerce business read-only and construct the minimum reliable commercial model needed for organic decisions.

Customer Capability Enabled

The customer can connect WooCommerce, see connection health and understand what business data is available or missing.

Why This Comes Here

Commercial prioritisation cannot become a Product capability without trustworthy commerce data.

WooCommerce is the accepted first platform.

Existing Foundations to Reuse

Product Intelligence;

Business Intelligence;

WooCommerce evidence handling;

product facts projection;

URL and evidence validation;

customer/business kernel from V1-02.

Deliverables

secure read-only WooCommerce connection;

self-service connection test;

disconnect and revocation;

ingestion and normalisation of the approved V1 fields:

products;

variations;

categories;

prices;

stock;

orders;

order status;

sales totals;

COGS where available;

approved aggregate commercial metadata;

documented handling of:

refunds;

cancellations;

discounts;

taxes;

missing cost data;

variable products;

generic business and product records;

data freshness and quality report;

customer correction for material inferred business facts;

real test-store reconciliation proof.

Acceptance Criteria

Product, variation and category records map correctly.

Order and sales totals reconcile against the connected store under documented rules.

Missing values remain missing.

No missing value is silently treated as zero.

Customer-identifiable data is not ingested where aggregate data is sufficient.

Order-state, refund, discount and tax rules are explicit.

COGS absence reduces confidence and does not block all analysis.

Connection health and stale-state behaviour are visible.

Revocation works.

Provider failure cannot corrupt the last valid business state.

The internal model remains platform-neutral.

No write permission is requested.

Real test-store proof is preserved.

No generic ecommerce analytics dashboard is created.

Explicit Non-Goals

Shopify;

GA4;

CLV;

attribution;

customer-level profiling;

inventory forecasting;

purchasing or replenishment;

write access;

product editing;

paid execution.

Completion Decision

The WooCommerce connector and bounded commercial model are frozen for V1.

Additional commercial metrics require evidence and Roadmap approval.

12. V1-04 — Organic Evidence Connections

Objective

Connect the minimum first-party and external organic evidence required for customer-specific decisions.

Customer Capability Enabled

The customer can connect Search Console, verify the website boundary and see whether the Product has sufficient current organic evidence.

Provider Decision Gate

This milestone resolves O-005.

The existing DataForSEO foundation is the provisional external provider because:

integration foundations already exist;

cost and request contracts exist;

the Product has decided to buy rather than rebuild commodity search data.

It becomes the V1 provider only after:

terms support the intended Product use;

live request behaviour is validated;

costs remain bounded;

evidence quality is adequate.

If it fails, another licensed provider may be selected through an explicit decision update.

Deliverables

Search Console connection;

property selection and business/domain binding;

connection health and revocation;

query and page ingestion;

date range, freshness and source limitations;

minimum site understanding:

supported URLs;

page types;

headings and content;

metadata;

canonicals;

indexability;

internal links;

hierarchy;

live bounded external search and SERP evidence;

evidence freshness policy;

provider usage and cost telemetry;

combined business and organic evidence snapshot;

real test-store reconciliation proof.

Acceptance Criteria

Search Console data is tied to the correct customer and domain.

Query, page, click, impression, CTR and position semantics are documented.

Known Search Console limits are visible.

Missing and sparse data reduce confidence correctly.

Site extraction supports the declared V1 environment.

Unsupported builders or page types fail clearly.

Crawl and request behaviour is bounded and polite.

External evidence includes market, language, location, device and retrieval time.

Search demand is not treated as exact truth.

Keyword overlap and intent prevent naive volume summation.

Provider calls and costs are bounded.

Revocation works.

No universal rank tracker, keyword database or backlink index is built.

GA4 is not required for this milestone.

Real test-store proof is preserved.

Explicit Non-Goals

GA4;

generic web crawler;

all-keyword rank tracking;

backlink index;

AI-shopping visibility;

competitor-history warehouse;

broad technical SEO audit product.

Completion Decision

O-005 is updated with the selected V1 provider.

The evidence connection boundary is frozen.

13. V1-05 — Generic Opportunity and Recommendation Engine

Objective

Turn connected business and organic evidence into a generic, prioritised and explainable recommendation that does not default to article creation.

Customer Capability Enabled

The Product can produce the actual strategic answer that the future free customer experience will expose.

Why This Is the Core Intelligence Milestone

This is where the Product stops being an article workflow and becomes the approved organic-growth decision system.

Existing Foundations to Reuse

V1-01 control/challenger prototype;

Product and Business Intelligence;

Search Console and external evidence;

candidate packets and filtering;

intent/SERP interpretation;

evidence, provenance and confidence;

M3/M4A/M4B patterns where generic;

no-action and insufficient-evidence outcomes.

Initial V1 Intervention Decisions

The engine must be able to distinguish at least:

improve an existing product, category or content page;

create a new appropriate page or content asset;

improve internal linking;

monitor or defer;

do nothing;

insufficient evidence.

Technical or indexability blockers may be identified where they block an in-scope opportunity.

This does not authorise a generic technical SEO executor.

Deliverables

generic opportunity candidate contract;

candidate discovery from:

products and categories;

existing pages;

Search Console visibility;

external demand;

site structure;

relevant competitor evidence;

deterministic and bounded candidate filtering;

intent and SERP interpretation;

commercial relevance;

site-specific competitive feasibility;

dependency and strategic sequencing;

relative prioritisation;

intervention selection;

evidence, freshness and confidence;

no-action and insufficient-evidence handling;

durable recommendation record;

customer-neutral plain-language recommendation projection;

labelled regression and evaluation set.

Acceptance Criteria

The engine does not begin from “find an article.”

Discovery covers the approved V1 opportunity types.

Candidates are separated from recommendations.

Rejected candidates retain reason codes.

Duplicate and overlapping opportunities are handled.

Wrong-market, irrelevant, navigational and product-mismatched candidates are bounded.

Low volume alone does not automatically reject a commercially valuable opportunity.

Missing evidence reduces confidence rather than becoming zero.

Commercial relevance and strategic supporting value remain distinguishable.

Feasibility is probabilistic and explainable.

Dependencies can change sequencing.

The system can recommend no action.

No precise revenue estimate is invented.

The same recommendation record can support:

free DIY;

third-party implementation;

future paid execution.

The test-store output passes the approved rubric.

The commercially informed result still beats or preserves the advantage proven in V1-01.

No hidden founder knowledge is required.

No Critical or High decision-quality defect remains.

Evidence and evaluation artefacts are frozen.

Failure Outcome

If the generic engine loses the decision advantage established in V1-01, work stops before customer UI expansion.

The Product is not allowed to hide weak intelligence behind a good interface.

Explicit Non-Goals

customer dashboard polish;

paid executor;

content generation;

second platform;

technical SEO automation;

broad analytics;

automatic daily recommendation generation;

GA4 unless a formal evidence review proves it essential.

Completion Decision

The intelligence boundary is frozen for the initial Free Product.

Changes after this milestone must be driven by validation failures, not feature ideas.

14. V1-06 — Complete Free Intelligence Experience

Objective

Expose the validated recommendation as a genuinely useful free customer Product.

Customer Capability Enabled

The customer can understand what deserves attention, why, and exactly how to implement it without paying the Product.

Deliverables

opportunity feed;

opportunity priority and state;

opportunity detail;

bounded Evidence Explorer;

plain-English explanations;

confidence and limitations;

complete DIY implementation plan;

basic actions:

start DIY;

defer;

ignore;

mark complete;

request reassessment;

recommendation portability;

current, completed, deferred, ignored, superseded and withdrawn states;

connection and data-quality guidance;

self-service error states;

basic accessibility and supported-device flow.

Free DIY Standard

For the supported recommendation, the customer must receive:

objective;

prerequisites;

required access;

required skills;

expected difficulty;

approximate effort as an estimate;

ordered implementation steps;

platform-specific instructions;

what to change;

what not to change;

warnings;

QA checklist;

verification;

monitoring plan;

when specialist help may be appropriate.

The Product does not have to generate every final production asset for free.

It must explain how the customer can create that asset themselves or with a tool of their choice.

Acceptance Criteria

A non-specialist can identify the top recommendation without founder explanation.

The Product explains why it comes before alternatives.

Evidence can be inspected without overwhelming the default view.

Technical terms are explained contextually.

The customer can complete the supported DIY route using only the supplied plan and normal platform access.

No important implementation step is hidden to promote paid execution.

The recommendation can be copied or exported.

Licensed raw third-party data is not redistributed unlawfully.

The user can defer, ignore, complete or request reassessment.

Obsolete recommendations are superseded or withdrawn.

Empty and insufficient-evidence states are useful.

No “Do it for me” button is shown before a validated executor exists.

No generic analytics dashboard is built.

Customer-facing usability passes the milestone test protocol.

No Critical or High defect remains.

Explicit Non-Goals

separate Organic Overview;

fully interactive Guided DIY;

rich advanced history;

real-time alerts;

paid execution;

multiple sites;

team collaboration;

content library;

general SEO academy.

Completion Decision

The Free Product is ready for formal validation.

It is not yet publicly launchable.

15. V1-07 — Free Product Validation Gate

Objective

Prove that the free Product is useful beyond the founder and more useful for the target job than credible free alternatives.

Why This Gate Comes Before Paid Execution

The Product must earn trust through free intelligence before we invest in monetising execution.

If the free recommendation is not worth acting on, paid automation has nothing valuable to automate.

Validation Set

Before testing begins, the milestone contract must define participant selection.

Minimum validation:

Street Kingz as the known test environment;

validation must include sparse-evidence/newer stores;

validation must include established stores with richer first-party data;

the same Product must work across both evidence states without separate engines;

at least three independent WooCommerce ecommerce businesses;

more than one product category/niche;

more than one catalogue size;

real trading and organic data;

no undocumented founder knowledge.

Competitor Gauntlet

Run the governed free-competitor gauntlet using the method and rubric in COMPETITORS.md.

Minimum coverage:

full gauntlet on Street Kingz;

the Product versus the competent composite free stack on at least two independent stores;

major individual free threats tested where technically applicable;

paid products used only as quality ceilings where access is practical.

Deliverables

fixed validation protocol;

participant criteria and consent;

preserved inputs;

Product outputs;

free competitor outputs;

composite free workflow outputs;

owner usefulness ratings;

DIY comprehension and action evidence;

failure cases;

support burden;

revised claims status;

go, revise or stop decision.

Acceptance Criteria

Independent businesses can connect without undocumented founder intervention.

Recommendations are understandable to the target customer.

Owners judge the recommendations materially useful.

Recommendations change or confirm a real priority with credible evidence.

At least two independent owners choose to act on a recommendation or explicitly state that they would.

The Product clearly beats major single free alternatives on the weighted rubric.

The Product beats the competent composite free stack on convenience and decision usefulness.

DIY completeness and clarity are stronger than the free alternatives.

The Product does not rely on hidden manual SEO analysis.

Failures and losses are preserved.

Support burden remains compatible with one-person operation.

No “best free” claim is made unless the claims gate is actually satisfied.

No Critical or High Product defect remains.

Independent validation evidence is frozen.

Failure Handling

If the Product fails:

one bounded correction cycle may be authorised against the failed milestone criteria;

fixes must remain inside existing Scope;

the gauntlet is rerun fairly;

if the second formal attempt still fails materially, Product strategy is reviewed before paid-executor work.

No endless polishing loop is permitted.

Explicit Non-Goals

paid executor;

public launch;

broad marketing;

second platform;

paid advertising;

new opportunity types merely to improve scores;

changes to competitor configuration designed to weaken comparisons.

Completion Decision

A pass authorises V1-08.

A fail blocks paid-executor development.

16. V1-08 — First Executor Selection Gate

Objective

Select exactly one paid executor using evidence from real recommendations and customers.

Why This Is a Separate Gate

Existing code is not enough to justify an executor.

The selected executor must be pulled by:

recommendation frequency;

customer value;

customer desire to avoid the labour;

technical boundedness;

reviewability;

recovery;

support feasibility.

Candidate Evidence

The existing Create SEO Article path is a candidate because the repository already contains:

evidence-grounded research;

semantic planning;

generation;

correction;

QA;

WordPress primitives.

It receives no automatic preference if real recommendations show another intervention matters more.

Selection Criteria

An executor may be selected only if:

The intelligence system repeatedly recommends the intervention.

Customers understand and value the recommendation.

Customers indicate they would consider paying to avoid the implementation labour.

A complete free DIY path exists.

The intervention has a bounded and reviewable output.

The implementation can avoid unrelated site changes.

A credible recovery path exists.

The intervention can be monitored.

Routine delivery can become software-led.

Variable costs and support burden appear controllable.

Existing code may reduce cost but is not the sole reason for selection.

Deliverables

recommendation-frequency analysis;

customer-demand evidence;

executor risk comparison;

build/buy/integrate assessment;

selected executor;

explicit executor boundary;

rejected alternatives and reasons;

updated DECISIONS.md resolving O-003;

provisional paid pricing/charging hypothesis;

updated Roadmap wording only if the selected executor changes required dependencies.

Failure Outcome

If no executor meets the criteria:

do not guess;

do not select New SEO Content merely because it exists;

continue free Product validation or initiate a formal Scope review;

V1 paid execution remains blocked.

Explicit Non-Goals

executor implementation;

generic execution framework;

second executor;

autopilot;

final public pricing.

Completion Decision

Exactly one executor is accepted into V1-09.

17. V1-09 — First Paid Executor Vertical Slice

Objective

Build one complete paid autonomous execution journey from offer and confirmation through monitoring.

Customer Capability Enabled

A customer can press Do it for me, review the completed proposal, amend it, approve it, deploy it safely and see what happened.

Build Principle

Build the selected executor as a complete vertical slice.

Do not first build a universal executor framework.

Extract shared infrastructure only where the selected executor genuinely requires it.

Existing Foundations to Reuse Where Applicable

evidence and provenance;

controlled calls;

semantic planning and rendering;

M4B/M5D/M6 content primitives if New SEO Content is selected;

founder correction lineage;

WordPress authoritative reads;

guarded writes;

snapshots and recovery concepts.

Deliverables

paid execution offer;

price or charging basis;

explicit customer confirmation;

required permission request;

execution-specific research;

complete production output;

deterministic QA;

model-based QA where justified;

factual and commercial claim verification;

clear preview or diff;

amendment support;

exact-version approval;

least-privilege deployment;

post-write verification;

pre-change snapshot;

tested recovery;

baseline capture;

targeted monitoring;

cost telemetry;

full audit trail;

customer-visible failure handling.

Acceptance Criteria

The executor begins from an approved recommendation.

Paid research does not create a hidden paid-only strategic tier.

Any material change in strategy is disclosed before approval.

The paid offer clearly explains:

what will be done;

what will not change;

price;

provider costs;

permissions;

review;

recovery.

The customer confirms before chargeable work starts.

The full output is generated without routine hidden founder labour.

Deterministic and quality QA pass.

The customer can understand the proposed changes.

The customer can reject or amend the proposal.

Approval binds the exact version.

Changes after approval invalidate approval.

Only approved resources are changed.

Wrong-site and wrong-resource protections pass.

Partial failure is visible.

Resulting state is fetched and verified.

Recovery is tested.

Baseline and monitoring are connected to the intervention.

Variable costs are measured.

The complete flow passes on Street Kingz through the supported Product path.

No Critical or High defect remains.

The executor satisfies all applicable DoD sections, including any intervention-specific content standard.

Human Review During Development

Temporary human review is allowed while proving safety.

The executor cannot be classified fully Done for paid release while routine hidden human work remains necessary.

Explicit Non-Goals

second executor;

general executor marketplace;

generic workflow builder;

deployment without approval;

broad technical SEO fixes;

multi-platform support;

generalised amendment agent beyond the selected executor;

agency service.

Completion Decision

A validated test-store vertical slice authorises independent execution testing.

It is not yet public-release ready.

18. V1-10 — Independent Execution Validation and Private Alpha

Objective

Prove that the full free-to-paid journey works safely for real customers beyond the test store.

Validation Set

Minimum requirements must be fixed in the milestone contract before testing.

Initial minimum:

at least three independent businesses complete the Free Product flow;

at least two independent businesses use the selected paid executor;

at least one customer requests an amendment;

recovery is rehearsed or safely triggered in a controlled case;

more than one supported site configuration is represented where practical.

Deliverables

private alpha onboarding;

participant support and incident channel;

independent execution evidence;

observed customer review behaviour;

actual provider and infrastructure costs;

support burden;

execution time and customer time evidence;

recovery evidence;

permission and revocation evidence;

pricing and funding decision;

AI/provider funding decision;

known limitations and supported-environment matrix;

go, revise or stop decision.

Decision Gates Resolved

This milestone should resolve, with evidence:

O-004 — V1 AI provider and funding model;

O-006 — paid execution pricing model;

supported environment for the selected executor.

Possible outcomes may include:

customer-funded BYOK;

Product-funded inference included in execution price;

a hybrid model.

The choice must be based on:

onboarding completion;

security;

support;

actual cost;

quality;

customer understanding.

Acceptance Criteria

Independent customers can onboard without bespoke founder setup.

Free recommendations remain complete and portable.

Paid confirmation is clear.

Executor output is useful and reviewable.

No wrong-site or wrong-resource event occurs.

Approval and amendment behaviour works.

Deployment and verification work on supported environments.

Recovery works.

Actual variable cost is known within a useful range.

Support burden is measured and sustainable.

Customer time saved is measured before any claim.

No routine hidden agency labour remains.

Security, deletion and revocation work.

No Critical or High defect remains.

Independent evidence is preserved.

Ben approves V1 release preparation.

Failure Handling

A failed independent executor is not hidden as an edge case.

The executor returns to V1-09 with a bounded failed-gate contract.

If independent validation repeatedly fails because the intervention cannot be made safe or supportable, the executor decision is reopened.

Explicit Non-Goals

broad public release;

second executor;

automatic approval;

agency tier;

paid acquisition;

additional platform;

advanced analytics dashboard.

Completion Decision

A pass authorises the public V1 release gate.

19. V1-11 — Public V1 Release Gate

Objective

Confirm that the Product is safe, useful, supportable and honest enough for public availability.

Minimum Validation Evidence

Before public release:

Free Intelligence has been evaluated on at least five independent ecommerce stores;

those stores represent at least three materially different ecommerce categories or catalogue patterns;

the full free competitor gauntlet has been completed on Street Kingz and at least two independent stores;

the selected paid executor has completed successful independent deployment on at least three stores;

the Product has observed at least one amendment flow;

recovery has been tested under representative conditions;

onboarding and support burden have been measured.

These are minimum evidence counts, not marketing claims.

The milestone contract may strengthen them before testing begins.

Deliverables

completed V1 DoD checklist;

final supported-environment matrix;

production security and privacy review;

authentication, deletion and revocation proof;

backup and recovery proof;

incident response and kill-switch process;

provider and cost controls;

charging and payment proof;

customer terms and privacy material;

user-facing setup and support documentation;

claims review against COMPETITORS.md;

final competitor gauntlet report;

final independent-validation report;

launch support plan;

final PROJECT_STATE.md;

explicit Product-owner launch decision.

Acceptance Criteria

The complete V1 customer journey works end to end.

Every V1 Required capability selected by the Roadmap passes applicable DoD gates.

No Critical or High defect remains.

Security and privacy requirements pass.

Costs are bounded.

Support burden is sustainable.

Free recommendations remain advice-complete.

The paid executor is software-led.

Deployment is approval-first and recoverable.

Monitoring is connected to interventions.

Independent validation passes.

The free competitor gauntlet passes.

Claims do not exceed evidence.

No “best free,” “agency replacement,” “fully autonomous” or outcome guarantee is made without its specific earned evidence.

Ben explicitly approves public launch.

Failure Outcome

Public launch is delayed.

Only failed launch gates may be addressed.

The failure does not authorise feature expansion.

Explicit Non-Goals

second executor;

Post-V1 features;

agency plan;

enterprise plan;

Shopify;

autopilot;

perfect feature parity with any paid competitor.

Completion Decision

A pass marks V1 Done.

The Product may then enter controlled public availability.

Part III — Decision Schedule

20. Open Decision Resolution

Decision

Current status

Resolution point

O-001 Product and brand name

Deferred

After V1-01 passes; may not interrupt active Product milestones

O-002 Repository/internal rename

Deferred

After Product naming; not on V1 critical path

O-003 First paid executor

Deferred

V1-08

O-004 AI provider/funding model

Deferred

Evidence gathered through V1-01–V1-09; final V1 choice in V1-10

O-005 External search/SERP provider

Deferred

V1-04

O-006 Paid execution pricing

Deferred

Provisional in V1-08/V1-09; evidence-based decision in V1-10

O-007 GA4 as V1 requirement

Deferred

Roadmap position: not V1 Required unless V1-01 or V1-05 proves the decision job cannot work without it

O-008 Technical architecture

Deferred

Start of V1-02

O-009 Independent validation stores

Deferred

Minimums defined in V1-07, V1-10 and V1-11

O-010 Launch timing

Deferred

No date before V1-10; launch only after V1-11

O-011 Content channels

Deferred

After branding; separate from Product build

O-012 Autopilot

Evidence-Gated

Not in V1 Roadmap

O-013 Additional platforms

Evidence-Gated

Not in V1 Roadmap

O-014 Additional discovery surfaces

Evidence-Gated

Not in V1 Roadmap

O-015 Cross-customer learning

Evidence-Gated

Not in V1 Roadmap

The Roadmap's explicit GA4 and validation positions are recorded in DECISIONS.md without prematurely closing the decisions that remain gated.

Part IV — Stop and Review Gates

21. Product-Level Stop Conditions

The Roadmap pauses for Product review if:

V1-01 fails to show material decision improvement;

V1-05 cannot produce reliable generic recommendations;

V1-07 fails twice against the free alternatives;

independent businesses cannot understand or act on the free guidance;

customer onboarding/support cannot be made self-service enough for one-person operation;

no paid executor satisfies V1-08;

the selected executor cannot be made safe and recoverable;

repeated execution requires hidden agency labour;

variable costs make the free model unsustainable and no aligned funding approach survives testing;

provider terms prohibit intended use;

security cannot establish customer/site isolation;

public claims would require evidence the Product cannot obtain.

The correct response is to stop and update decisions.

It is not to add more features.

22. Milestone Failure Rule

A failed milestone may have one bounded remediation cycle where the cause is:

implementation defect;

insufficient quality within approved scope;

incorrect technical assumption;

incomplete evidence.

A second material failure requires a decision review.

No milestone may remain indefinitely “almost done.”

23. Scope Change Rule

A scope change during this Roadmap requires:

customer problem;

evidence;

competitor check;

Vision alignment;

technical and operational complexity;

dependency effect;

Roadmap displacement;

Ben approval;

document update before code.

Part V — Post-V1 Holding Boundary

24. Post-V1 Capabilities Not Scheduled

The following remain within approved long-term Scope but are not scheduled in this V1 Roadmap:

separate Organic Overview;

interactive Guided DIY;

rich recommendation history;

advanced alerting;

polished outcome dashboards;

GA4 or equivalent analytics intelligence;

advanced commercial metrics;

additional executors;

natural-language amendment sophistication;

rich version comparison;

broader provider portability.

They enter a future Roadmap only after V1 evidence.

25. Future / Evidence-Gated Capabilities Not Scheduled

The following are explicitly excluded from this Roadmap:

multi-business workspaces;

multi-user teams;

agency management;

automatic deployment without approval;

customer-level data ingestion;

CLV modelling;

cross-customer learning;

cross-customer model training;

standalone schema executor;

broad technical SEO executor;

destructive consolidation automation;

additional ecommerce platforms;

AI-shopping and answer-engine optimisation;

generic MCP layer;

programmatic page generation;

broad rank tracking;

broad competitor monitoring;

generic analytics suite.

These should be seeded into BACKLOG.md with their evidence gates.

Part VI — Roadmap Maintenance

26. Status Updates

ROADMAP.md should be updated only when:

a milestone is accepted;

a milestone is blocked by new evidence;

a decision changes the sequence;

a formal Roadmap change is approved;

V1 is completed.

Routine implementation detail belongs in:

the milestone contract;

Cody completion report;

PROJECT_STATE.md.

27. Milestone Statuses

Use only:

Not started;

Current;

In progress;

Blocked;

Done;

Superseded.

A milestone is not “mostly done.”

28. Current Authorised Action

V1-00 Governance Activation is Done.

V1-01 Progressive Evidence Decision Gate is Done.

V1-02 Single-Business Product Kernel is Current.

The canonical PROJECT_STATE.md, ROADMAP.md and BACKLOG.md are present, the required Roadmap resolutions are recorded in DECISIONS.md, and the approved V1-01 contract is present at `milestones/V1-01_PROGRESSIVE_EVIDENCE_DECISION_GATE.md`. The former commercial-context contract is preserved under `milestones/superseded/`.

The next approved action is:

Create and approve the bounded V1-02 Single-Business Product Kernel milestone contract.

V1-02 is the sole authorised Product milestone. V1-02 Product code is not authorised until its milestone contract is created and approved. No V1-03 or executor work is authorised.

29. Final Roadmap Rule

The project does not move forward because the next feature sounds useful.

It moves forward because:

the current milestone is Done;

its evidence supports the next dependency;

the next milestone remains the shortest approved route to V1.

Prove the decision. Build the Product. Validate the free value. Let evidence select the executor. Complete one end-to-end journey.
