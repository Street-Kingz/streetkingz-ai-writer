Backlog

Status: Authoritative containment register once approved and committed
Last updated: 2026-08-23
Product name: Not yet selected; referred to as the Product
Decision owner: Ben
Governance baseline: 42c4c5933d71b87f471334d4cde3de8aa3a19194 (42c4c59)
Project State basis: PROJECT_STATE.md, dated 2026-08-23
Roadmap basis: ROADMAP.md, dated 2026-08-23

1. Purpose of This Document

This document contains ideas, deferred capabilities, future possibilities and non-blocking technical improvements that are worth remembering but are not approved Product work.

It exists to prevent:

useful ideas being forgotten;

useful ideas interrupting the current milestone;

competitor features silently becoming Product requirements;

Post-V1 scope being mistaken for V1 work;

evidence-gated capabilities entering development before evidence exists;

technical cleanup displacing customer-value milestones;

Cody implementing something merely because it appears in a repository document;

ChatGPT turning every new observation into a new priority;

abandoned or rejected Product directions returning under a different name.

The Backlog is a containment mechanism.

It is not:

a Roadmap;

a priority list;

a promise;

a release plan;

a specification;

an implementation instruction;

evidence that an item should ever be built.

Backlog means remembered, not approved.

2. Authority

The governing hierarchy remains:

PRODUCT_VISION.md

PRODUCT_SCOPE.md

DECISIONS.md

ROADMAP.md

current milestone contract

current task

BACKLOG.md sits below all of them.

A Backlog item may not:

override Product Vision;

expand Product Scope;

alter an Accepted decision;

interrupt an active milestone;

become code without formal promotion;

be presented to customers as planned or promised.

If an item conflicts with a higher-authority document, the higher-authority document wins.

If an item requires a Product Scope change, that change must be approved and documented before the item can enter the Roadmap.

3. Core Backlog Rules

3.1 Nothing here is authorised work

Cody must not implement, refactor toward or prepare infrastructure for a Backlog item unless it has first been promoted into ROADMAP.md through the approved process.

3.2 Backlog order is not priority

Items are grouped for containment and review.

Their order does not indicate:

importance;

sequence;

commercial value;

likelihood of implementation.

3.3 Competitor features do not enter automatically

A competitor launching an impressive capability may create:

a competitor-register update;

a research question;

a Backlog candidate.

It does not create a Product requirement.

3.4 Existing code does not automatically promote an item

A partially built capability may remain in Backlog or frozen indefinitely if real customer evidence does not justify finishing it.

3.5 Post-V1 does not mean “build immediately after V1”

Post-V1 means the capability is within approved long-term Product Scope but is not required for the first coherent Product.

It must still earn a place in a future Roadmap.

3.6 Future / Evidence-Gated means blocked by evidence

An evidence-gated item cannot be promoted merely because:

it is technically possible;

an API exists;

a competitor offers it;

it sounds commercially attractive;

Cody could build it quickly;

the founder personally likes it.

The stated evidence gate must be satisfied.

3.7 Rejected directions do not belong as neutral Backlog ideas

Directions explicitly rejected in DECISIONS.md remain rejected.

They must not be re-added to the Backlog without:

materially new evidence;

an explicit Decision Change Protocol;

acknowledgement of the original rejection.

3.8 Non-blocking debt stays non-blocking

Technical debt may only interrupt the Roadmap when it becomes:

a Critical or High defect;

a security or privacy risk;

a direct milestone dependency;

a release blocker under DEFINITION_OF_DONE.md.

“While we are here” is not sufficient.

4. Backlog Statuses

Every Backlog item uses one of the following statuses.

CAPTURED

Worth remembering, but no promotion evidence has been assembled.

EVIDENCE-GATED

Within possible future scope, but explicitly blocked until the stated evidence exists.

SCOPE-CHANGE REQUIRED

Conflicts with or exceeds current Product Scope.

It cannot be promoted without first changing PRODUCT_SCOPE.md and, where relevant, DECISIONS.md.

READY FOR REVIEW

The stated evidence gate appears to have been satisfied.

This status permits a Product review.

It does not authorise implementation.

PROMOTED

The item has been approved into a dated Roadmap milestone.

The Backlog entry remains as historical lineage and links to the relevant decision and milestone.

DUPLICATE

The item is already represented by another Backlog entry, Roadmap milestone or accepted decision.

REMOVED

The item is no longer worth retaining or has become irrelevant.

The reason should remain recorded.

5. Backlog Horizons

POST-V1

Inside approved long-term Product Scope, but not required for V1.

FUTURE / EVIDENCE-GATED

Potential future Product capability requiring explicit evidence.

SCOPE-CHANGE REQUIRED

Outside or in conflict with current approved Product Scope.

NON-BLOCKING TECHNICAL DEBT

Maintenance or quality improvement that should not displace Product delivery.

ADJACENT WORKSTREAM

Brand, distribution or business work related to the Product but not part of the Product implementation Roadmap.

6. Promotion Process

No Backlog item enters the Roadmap until a promotion proposal records:

Customer problem

What real customer problem has been observed?

Evidence

What proves the problem is material?

Acceptable evidence may include:

repeated Product recommendations;

customer behaviour;

customer requests;

support burden;

failed DIY attempts;

willingness to pay;

competitor evidence;

security or operational evidence;

measured performance or cost evidence.

Current alternatives

Who already solves it and how well?

Vision and Scope alignment

Does it belong inside the current Product?

If not, what formal scope change is required?

Expected customer value

What outcome improves?

Complexity and maintenance

What does one founder have to build, secure, support and maintain?

Dependencies

What approved capability must already exist?

Roadmap displacement

Which approved work would be delayed?

Acceptance criteria

How would we know the capability is actually Done and useful?

Decision

One of:

promote to Roadmap;

retain in Backlog;

reject;

remove as duplicate;

initiate Scope change.

Only Ben can approve promotion.

Documents must be updated before Product code changes.

7. Items Already in the V1 Roadmap — Do Not Duplicate Here

The following are approved Roadmap work and are not Backlog items:

governance activation;

the commercial-decision hypothesis gate;

the single-business Product kernel;

WooCommerce read-only commerce connection;

minimum commercial business model;

Search Console connection;

minimum site understanding;

external search/SERP evidence;

generic opportunity discovery and recommendation;

complete free intelligence experience;

free Product validation and competitor gauntlet;

first-executor selection;

one paid executor vertical slice;

private alpha;

public V1 release gate.

New entries must not duplicate those milestones under different wording.

Part I — Post-V1 Customer Experience

BL-CX-001 — Separate Organic Overview

Status: CAPTURED
Horizon: POST-V1
Source: PRODUCT_SCOPE.md; ROADMAP.md §24

Idea

Create a dedicated summary view showing:

current organic position;

material gains and losses;

important risks;

active opportunities;

completed interventions;

monitored outcomes.

Why Retained

A summary may help returning customers understand overall state without opening individual recommendations.

Why Not V1

The V1 Opportunity Feed and detail experience can provide the core customer value.

A separate overview risks becoming a generic analytics dashboard.

Evidence Required for Promotion

repeated customer difficulty understanding overall state;

evidence that the Opportunity Feed cannot solve the problem simply;

clear distinction from WooCommerce, Search Console and analytics reporting;

measured improvement in customer comprehension or return usage.

Constraints

The overview must support decisions.

It must not become a general ecommerce analytics product.

BL-CX-002 — Interactive Guided DIY Mode

Status: CAPTURED
Horizon: POST-V1
Source: PRODUCT_SCOPE.md; ROADMAP.md §24

Idea

Turn static DIY guidance into an interactive workflow with:

step progression;

completion tracking;

contextual checks;

pause and resume;

validation;

implementation status.

Why Retained

Some customers may value structured guidance while implementing complex recommendations themselves.

Why Not V1

A complete, clear and verifiable static DIY plan satisfies the Free Product doctrine.

An interactive workflow adds substantial UI, state and support complexity.

Evidence Required for Promotion

users understand recommendations but fail during implementation because the static route is difficult to follow;

repeated abandonment at identifiable steps;

demand for progress tracking;

proof that interactivity improves successful DIY completion.

Constraints

The feature must not withhold information from the static free plan.

BL-CX-003 — Rich Recommendation History

Status: CAPTURED
Horizon: POST-V1
Source: PRODUCT_SCOPE.md; ROADMAP.md §24

Idea

Provide richer long-term history including:

recommendation evolution;

evidence at each point;

customer actions;

comparisons across periods;

intervention outcomes;

supersession reasoning.

Why Retained

Longitudinal context may improve trust, reassessment and customer-specific learning.

Why Not V1

V1 needs only the minimum lifecycle:

current;

in progress;

completed;

deferred;

ignored;

superseded;

withdrawn.

Evidence Required for Promotion

customers revisit historical decisions regularly;

existing history is insufficient for understanding why priorities changed;

support questions show missing historical context;

the feature materially improves future decision quality.

BL-CX-004 — Advanced Alerts

Status: CAPTURED
Horizon: POST-V1
Source: PRODUCT_SCOPE.md; ROADMAP.md §24

Idea

Provide configurable alerts for:

material ranking or impression changes;

indexing failures;

changed commercial context;

failed leading indicators;

competitor/SERP changes;

stale unresolved recommendations.

Why Retained

Targeted alerts may help customers act when evidence changes.

Why Not V1

V1 monitoring is tied to active opportunities and interventions.

Advanced alerting risks noise, cost and generic rank-tracker drift.

Evidence Required for Promotion

customers miss material changes without alerts;

signal thresholds can be defined with acceptable noise;

notification cost and support burden remain bounded;

alerts produce useful action rather than engagement theatre.

Constraints

No broad all-keyword monitoring.

No alerts solely to manufacture Product usage.

BL-CX-005 — Polished Outcome Dashboards

Status: CAPTURED
Horizon: POST-V1
Source: PRODUCT_SCOPE.md; ROADMAP.md §24

Idea

Create richer visual outcome views for:

leading indicators;

behavioural indicators;

commercial indicators;

baseline comparisons;

confidence;

confounding events.

Why Retained

Customers may benefit from a clearer explanation of what happened after an intervention.

Why Not V1

V1 requires an honest outcome view, not a reporting suite.

Evidence Required for Promotion

customers cannot understand the bounded V1 outcome explanation;

richer visualisation improves action or trust;

data quality supports the presentation;

the view does not imply causation that cannot be established.

BL-CX-006 — Natural-Language Amendment Workflow

Status: CAPTURED
Horizon: POST-V1
Source: PRODUCT_SCOPE.md; ROADMAP.md §24

Idea

Allow customers to request targeted amendments conversationally across supported execution outputs.

Why Retained

Natural-language amendments may reduce editing effort and improve paid execution convenience.

Why Not V1

The first executor only needs bounded amendments appropriate to that intervention.

A universal amendment agent could become a large, unsafe and ambiguous system.

Evidence Required for Promotion

customers repeatedly request the same types of amendments;

direct editing or bounded regeneration is inadequate;

changes can preserve constraints, QA and exact-version approval;

costs and failure rates are measured.

Constraints

A changed output must invalidate previous approval.

Amendments must not silently alter approved strategy.

BL-CX-007 — Rich Version Comparison

Status: CAPTURED
Horizon: POST-V1
Source: PRODUCT_SCOPE.md; ROADMAP.md §24

Idea

Provide more sophisticated comparison of:

original state;

initial proposal;

amendments;

approved version;

deployed state;

later customer edits.

Why Retained

Rich comparison may become valuable as interventions grow more complex.

Why Not V1

V1 requires a clear bounded preview or diff for one executor.

Evidence Required for Promotion

customers struggle to understand the V1 diff;

multiple amendment rounds are common;

version confusion creates approval or recovery risk;

mature diff libraries cannot satisfy the need through simpler integration.

BL-CX-008 — Broader Provider Portability

Status: CAPTURED
Horizon: POST-V1
Source: PRODUCT_SCOPE.md; ROADMAP.md §24

Idea

Support additional AI or data providers and more flexible provider substitution.

Why Retained

Provider choice may later improve:

resilience;

cost;

quality;

customer-funded usage;

contractual flexibility.

Why Not V1

Provider abstraction can create premature complexity.

V1 should support only the providers required for the approved customer journey.

Evidence Required for Promotion

current provider cost, reliability, terms or quality creates a material problem;

customers need BYOK or a specific provider;

substitution can be implemented without leaking provider logic throughout the Product;

support burden is justified.

Constraints

Provider choice is infrastructure, not Product differentiation.

BL-CX-009 — Advanced Cost Explanation and Usage Controls

Status: CAPTURED
Horizon: POST-V1

Idea

Provide deeper customer-facing visibility into:

research cost;

model cost;

execution cost;

budgets;

alerts;

provider comparisons;

historical usage.

Why Retained

This may matter if customer-funded providers or variable execution costs become central.

Why Not V1

V1 requires understandable expected and actual costs where measurable.

It does not require a full FinOps interface.

Evidence Required for Promotion

customers are confused by costs;

usage becomes material;

customers request budget controls;

cost transparency affects trust or completion.

Part II — Analytics and Commercial Intelligence

BL-DATA-001 — GA4 or Equivalent Analytics Intelligence

Status: EVIDENCE-GATED
Horizon: POST-V1 unless promoted by V1 evidence
Source: DECISIONS.md O-007; ROADMAP.md §§5, 20, 24

Idea

Connect GA4 or another analytics source for:

organic sessions;

landing-page behaviour;

ecommerce conversion;

engagement;

behavioural outcomes.

Why Retained

Analytics may improve:

commercial prioritisation;

intervention assessment;

understanding of traffic quality.

Why Not Currently Required

GA4 introduces:

connection and permission work;

tracking-quality problems;

attribution ambiguity;

support burden;

additional customer confusion.

WooCommerce and Search Console may be sufficient for the initial decision job.

Promotion Gate

Promote before V1 only if V1-01 or V1-05 proves that the required decision quality cannot be achieved without analytics evidence.

Otherwise reconsider after V1 using:

measured recommendation gaps;

customer tracking quality;

incremental decision value;

integration and support cost.

BL-DATA-002 — Advanced Commercial Metrics

Status: CAPTURED
Horizon: POST-V1
Source: ROADMAP.md §24

Idea

Expand commercial modelling to include, where reliable:

contribution margin;

fulfilment costs;

shipping subsidies;

returns;

discounts;

repeat-purchase behaviour;

product affinity;

stock cover;

supplier lead time.

Why Retained

These signals may improve the commercial value and timing of recommendations.

Why Not V1

Data availability and reliability vary significantly.

Complex metrics can create false precision and onboarding burden.

Evidence Required for Promotion

basic commerce data repeatedly produces materially wrong priorities;

the missing metric can be sourced reliably;

the calculation has a documented formula;

the metric changes decisions usefully;

the customer effort required is proportionate.

BL-DATA-003 — Customer-Level Data Ingestion

Status: EVIDENCE-GATED
Horizon: FUTURE / EVIDENCE-GATED
Source: ROADMAP.md §25

Idea

Use customer-level order or behavioural records rather than aggregated metrics.

Why Retained

Granular data could support cohort, repeat-purchase or customer-value analysis.

Why Not Approved

It creates materially higher:

privacy risk;

security burden;

data minimisation concerns;

legal complexity;

support requirements.

The approved Product does not require it for V1.

Promotion Gate

a specific approved organic decision cannot be made from aggregate data;

the customer value is material;

lawful basis, consent and retention are defined;

data minimisation is proven;

security and tenant isolation are mature;

Product Scope remains aligned.

BL-DATA-004 — Customer Lifetime Value Modelling

Status: EVIDENCE-GATED
Horizon: FUTURE / EVIDENCE-GATED
Source: ROADMAP.md §25

Idea

Incorporate customer lifetime value into organic opportunity prioritisation.

Why Retained

Some products may acquire customers whose long-term value is much greater than first-order margin.

Why Not Approved

CLV models can become:

unreliable;

data-hungry;

attribution-heavy;

outside the narrow organic decision job.

Promotion Gate

aggregate first-order economics repeatedly misprioritise opportunities;

sufficient reliable repeat-purchase data exists;

the model changes decisions materially;

uncertainty can be explained;

the Product does not drift into general customer analytics.

BL-DATA-005 — Cross-Customer Aggregated Learning

Status: EVIDENCE-GATED
Horizon: FUTURE / EVIDENCE-GATED
Source: DECISIONS.md O-015; ROADMAP.md §25

Idea

Use appropriately aggregated intervention and outcome evidence across customers to improve recommendations.

Why Retained

A genuine outcome dataset may later improve:

prioritisation;

confidence;

executor QA;

intervention selection.

Why Not Approved

The assumed data moat may not materialise.

This capability creates privacy, governance, consent and cohort-comparability problems.

Promotion Gate

customer-specific learning already works;

intervention and outcome records are clean enough;

lawful basis and consent are defined;

aggregation and anonymisation are adequate;

the dataset materially improves decisions in controlled evaluation;

the Product remains viable without it.

BL-DATA-006 — Cross-Customer Model Training

Status: EVIDENCE-GATED
Horizon: FUTURE / EVIDENCE-GATED
Source: ROADMAP.md §25

Idea

Train or fine-tune Product models using cross-customer data.

Why Retained

Future evidence may show that specialised models outperform orchestration of frontier models and deterministic rules.

Why Not Approved

This is substantially more complex and risky than aggregated evaluation.

Promotion Gate

All gates for BL-DATA-005, plus:

a proven model-performance gap;

sufficient volume and cohort quality;

explicit data-use permissions;

model governance;

deletion and retraining implications;

measured advantage over cheaper prompt, retrieval or rules improvements.

BL-DATA-007 — Advanced ROI or Commercial-Upside Forecasting

Status: EVIDENCE-GATED
Horizon: POST-V1 / future

Idea

Estimate ranges for incremental commercial value from an intervention.

Why Retained

Credible ranges may improve prioritisation and customer confidence.

Why Not Approved

Future rank, CTR, conversion, cannibalisation, seasonality and attribution create large uncertainty.

Promotion Gate

enough intervention history exists;

forecasts are calibrated against actual outcomes;

ranges outperform simple relative categories;

assumptions are visible;

false precision is prevented;

claims comply with COMPETITORS.md.

Part III — Paid Executor Candidate Pool

8. Executor Candidate Rule

The entries in this section are not approved executors.

V1-08 selects exactly one first executor using:

recommendation frequency;

customer value;

willingness to avoid the work;

technical boundedness;

reviewability;

recovery;

monitoring;

cost;

support burden.

After V1, remaining candidates stay in Backlog until evidence promotes them.

Every executor requires:

a complete corresponding free DIY route;

a validated recommendation;

bounded output;

automated QA;

customer preview and amendments;

exact-version approval;

safe deployment;

tested recovery;

targeted monitoring;

software-led delivery.

BL-EX-001 — New SEO Content Executor

Status: CAPTURED
Horizon: V1 CANDIDATE / POST-V1 IF NOT SELECTED
Source: Existing repository foundations

Intervention

Create a new supporting article or resource where research proves that new content is the correct intervention.

Existing Leverage

M4B planning;

M5D generation;

M6 correction;

semantic validation;

claim restrictions;

rendering;

WordPress primitives.

Main Risk

Existing code may create sunk-cost bias and article-first drift.

Specific Promotion Evidence

generic intelligence repeatedly recommends new content;

customers value the recommendation;

customers find production labour painful;

creation does not duplicate or cannibalise existing pages;

the executor can publish safely and monitor outcomes.

BL-EX-002 — Existing Content Optimisation Executor

Status: CAPTURED
Horizon: V1 CANDIDATE / POST-V1

Intervention

Improve an existing article or resource instead of creating unnecessary new content.

Why Retained

Existing pages may offer faster, safer organic improvement than new content.

Main Risks

overwriting valuable content;

factual regression;

damaging existing rankings;

weak diff/recovery;

assuming more copy is better.

Specific Promotion Evidence

repeated recommendations to improve existing content;

measurable customer demand;

reliable before/after QA;

recovery and monitoring;

clear superiority over new-page creation.

BL-EX-003 — Category / Collection Optimisation Executor

Status: CAPTURED
Horizon: V1 CANDIDATE / POST-V1

Intervention

Improve an ecommerce category or collection page for search intent and customer usefulness.

Why Retained

Category pages are often commercially important and may connect organic demand directly to products.

Main Risks

page-builder variation;

theme/layout damage;

harming conversion;

overloading categories with SEO copy;

plugin-specific fields.

Specific Promotion Evidence

category interventions occur frequently in recommendations;

commercial value is high;

supported WooCommerce environments can be bounded;

visual and conversion integrity can be checked;

rollback is reliable.

BL-EX-004 — Product Page Optimisation Executor

Status: CAPTURED
Horizon: V1 CANDIDATE / POST-V1
Source: Existing frozen product-page workflow

Intervention

Improve a product page where the product page is the correct search destination.

Existing Leverage

product facts;

commercial editor;

product-page proposal adapter;

guarded writer;

brand and claim constraints.

Main Risks

unsupported claims;

product-fact errors;

conversion regression;

theme/builder compatibility;

current rendered-page guard limitation.

Specific Promotion Evidence

repeated product-page recommendations;

bounded supported fields;

no conversion harm in validation;

reliable rendered-page verification;

recovery and monitoring.

BL-EX-005 — Comparison / Buying Guide Executor

Status: CAPTURED
Horizon: POST-V1

Intervention

Create commercially useful comparison or buying-guide content where the SERP and customer journey justify it.

Main Risks

biased comparisons;

unsupported competitor claims;

legal and trademark issues;

low-value affiliate-style content;

overlap with existing pages.

Specific Promotion Evidence

repeated comparison-intent opportunities;

clear customer usefulness;

verified product and competitor facts;

a safe claims policy;

measurable commercial path.

BL-EX-006 — Organic Landing Page Executor

Status: CAPTURED
Horizon: POST-V1

Intervention

Create a new landing page where meaningful demand is not served by existing site architecture.

Main Risks

doorway/programmatic-page drift;

duplicate intent;

navigation and hierarchy changes;

thin content;

theme compatibility.

Specific Promotion Evidence

repeated valid landing-page opportunities;

no appropriate existing page;

clear site-architecture role;

quality and uniqueness pass;

safe navigation and internal-link integration.

BL-EX-007 — Internal Linking Executor

Status: CAPTURED
Horizon: V1 CANDIDATE / POST-V1

Intervention

Prepare and implement relevant internal-link improvements.

Why Retained

The intervention may be:

frequent;

comparatively bounded;

measurable;

less expensive than full content production.

Main Risks

irrelevant or excessive links;

broken anchors;

template-wide accidental changes;

poor context;

link churn.

Specific Promotion Evidence

internal linking repeatedly appears as a high-value recommendation;

customer DIY burden is material;

link placement can be bounded;

exact affected pages can be reviewed;

rollback is simple and safe.

BL-EX-008 — Content Refresh Executor

Status: CAPTURED
Horizon: POST-V1

Intervention

Update existing content that is outdated, incomplete or competitively weak.

Main Risks

unnecessary freshness changes;

factual drift;

loss of valuable wording;

confusing refresh with full optimisation;

weak outcome attribution.

Specific Promotion Evidence

repeated decaying-content recommendations;

reliable freshness detection;

bounded changes;

clear version comparison;

outcome monitoring.

BL-EX-009 — Cannibalisation / Consolidation Executor

Status: EVIDENCE-GATED
Horizon: FUTURE / EVIDENCE-GATED

Intervention

Resolve overlapping pages through differentiation, consolidation or redirection.

Main Risks

destructive changes;

traffic loss;

incorrect canonicalisation;

redirect errors;

irreversible customer harm;

complex rollback.

Promotion Gate

repeated high-confidence cannibalisation cases;

specialist-quality decision benchmark;

exact dependency mapping;

customer review of affected pages;

tested redirect and restoration logic;

independent validation.

A recommendation-only and DIY route should precede autonomous destructive execution.

BL-EX-010 — Metadata Optimisation

Status: CAPTURED
Horizon: POST-V1

Intervention

Prepare and apply useful title or description improvements.

Product Boundary

Metadata should usually be a supporting part of a broader intervention.

Promotion Gate for Standalone Status

customers repeatedly need metadata-only changes;

the intervention has independent value;

the Product can avoid mass rewriting for cosmetic scores;

deployment across supported SEO plugins is safe.

BL-EX-011 — Structured Data / Product Data Executor

Status: EVIDENCE-GATED
Horizon: FUTURE / EVIDENCE-GATED

Intervention

Improve structured data or product data where it materially affects organic discovery or machine understanding.

Main Risks

standards complexity;

plugin conflicts;

duplicate schema;

false validation confidence;

rapidly changing search surfaces.

Promotion Gate

a recurring material customer problem;

reliable detection;

deterministic safe fix;

use of mature validators;

supported plugin/environment matrix;

verified rendering;

recovery.

BL-EX-012 — Narrow Technical SEO Fix Executor

Status: EVIDENCE-GATED
Horizon: FUTURE / EVIDENCE-GATED

Intervention

Automate one narrowly defined technical fix where the correct action is sufficiently deterministic.

Main Risks

drifting into a general technical SEO agent;

wrong-site changes;

environment variability;

hidden dependencies;

severe site damage.

Promotion Gate

Each technical fix is its own scope proposal and executor.

It must prove:

reliable detection;

deterministic correction;

bounded affected resources;

testable safety;

reviewability;

recovery;

independent validation.

“Technical SEO” is not one executor.

Part IV — Platforms, Accounts and Collaboration

BL-PLAT-001 — Shopify Support

Status: EVIDENCE-GATED
Horizon: FUTURE / EVIDENCE-GATED
Source: DECISIONS.md O-013; ROADMAP.md §25

Idea

Add Shopify connectors and supported executors.

Why Retained

Shopify has a large ecommerce market and may become commercially attractive after WooCommerce proof.

Why Not Approved

Shopify Sidekick is a powerful native threat;

platform semantics differ;

connectors, permissions and execution need separate validation;

expansion would double support burden.

Promotion Gate

V1 succeeds on WooCommerce;

qualified Shopify demand exists;

clear differentiation from Sidekick survives current research;

customer acquisition opportunity justifies the platform;

connector and executor boundaries are technically feasible;

the existing platform-neutral model genuinely reduces cost.

BL-PLAT-002 — Other Ecommerce Platforms

Status: EVIDENCE-GATED
Horizon: FUTURE / EVIDENCE-GATED

Idea

Support another ecommerce platform beyond WooCommerce and Shopify.

Promotion Gate

A platform-specific proposal must include:

target segment;

customer demand;

competitor position;

API and permission feasibility;

execution feasibility;

maintenance burden;

roadmap displacement.

Technical possibility alone is insufficient.

BL-PLAT-003 — Multi-Business Workspaces

Status: EVIDENCE-GATED
Horizon: FUTURE / EVIDENCE-GATED

Idea

Allow one account to manage multiple ecommerce businesses.

Why Not Approved

V1 deliberately supports one account and one business.

Multi-business support expands:

billing;

permissions;

data isolation;

navigation;

support;

agency-like use.

Promotion Gate

repeated demand from qualified customers;

clear non-agency customer job;

mature tenant isolation;

sustainable pricing and support;

no conflict with the initial customer focus.

BL-PLAT-004 — Multi-User Teams and Roles

Status: EVIDENCE-GATED
Horizon: FUTURE / EVIDENCE-GATED

Idea

Support owners, marketers, developers and approvers in one business workspace.

Promotion Gate

real customers need more than one participant;

approval or review is blocked without roles;

permission requirements are clear;

audit and security architecture are mature;

the simplest role model is sufficient.

BL-PLAT-005 — Agency / Multi-Client Management

Status: SCOPE-CHANGE REQUIRED
Horizon: FUTURE / EVIDENCE-GATED

Idea

Provide multi-client management, reporting and workflows for agencies.

Current Position

Agency infrastructure is not part of the initial Product and conflicts with D-034 unless changed deliberately.

Promotion Gate

strong agency demand;

evidence that agency distribution is better than direct merchants;

scope and commercial model review;

multi-tenant and permission maturity;

explicit Product-owner decision;

no drift into agency project management.

BL-PLAT-006 — Expanded WooCommerce Environment Compatibility

Status: CAPTURED
Horizon: POST-V1

Idea

Expand support across more:

themes;

page builders;

SEO plugins;

custom fields;

hosting environments;

WooCommerce extensions.

Why Retained

Real stores vary significantly.

Why Not Unlimited

Every supported environment adds:

test burden;

write risk;

support;

recovery requirements.

Promotion Gate

measured demand from qualified customers;

compatibility failure rate;

commercial value of the affected segment;

bounded support matrix;

automated regression coverage.

Unsupported configurations should remain unsupported until promoted.

Part V — Future Automation and Discovery

BL-FUT-001 — Low-Risk Autopilot Deployment

Status: EVIDENCE-GATED
Horizon: FUTURE / EVIDENCE-GATED
Source: DECISIONS.md O-012; ROADMAP.md §25

Idea

Allow narrowly defined low-risk actions to deploy without per-intervention approval.

Why Retained

Trusted customers may eventually value greater automation.

Why Not Approved

Approval-first execution is a core current trust and safety decision.

Promotion Gate

substantial successful execution history;

clearly defined low-risk action class;

extremely low failure rate;

tested automatic recovery;

configurable customer controls;

independent security and trust review;

explicit Decision change.

BL-FUT-002 — AI-Assisted Shopping and Answer-Engine Optimisation

Status: EVIDENCE-GATED
Horizon: FUTURE / EVIDENCE-GATED
Source: DECISIONS.md O-014; ROADMAP.md §25

Idea

Expand organic discovery decisions to AI shopping, answer engines or other unpaid machine-mediated surfaces.

Why Retained

Customer discovery may continue shifting beyond traditional search results.

Why Not Approved

The customer job, evidence, measurement and safe implementation path remain immature.

Promotion Gate

material customer discovery occurs through the surface;

reliable business-specific visibility evidence exists;

the Product can identify a decision rather than merely report a score;

a supported DIY or execution path exists;

the work remains inside organic discovery;

competitor and provider research is refreshed.

BL-FUT-003 — Programmatic Page Generation

Status: SCOPE-CHANGE REQUIRED
Horizon: FUTURE / EVIDENCE-GATED

Idea

Generate multiple similar pages where each page serves a justified distinct customer/search need.

Current Position

A high-volume programmatic content factory without decision evidence is explicitly outside Product Vision and Scope.

Promotion Gate

generic intelligence independently identifies repeated justified page opportunities;

each page has distinct intent and value;

quality remains high at scale;

duplicate and doorway risks are controlled;

customer review and rollback remain feasible;

explicit Scope change is approved.

“Competitors generate hundreds of pages” is not evidence.

BL-FUT-004 — Broad Rank Tracking

Status: SCOPE-CHANGE REQUIRED
Horizon: FUTURE / EVIDENCE-GATED

Idea

Track a broad customer-defined keyword set continuously.

Current Position

The Product deliberately monitors signals tied to priorities and interventions.

It is not a generic rank tracker.

Promotion Gate

targeted monitoring repeatedly fails to support the decision job;

customers need broader tracking;

cost and noise are controlled;

the feature supports decisions rather than becoming a standalone database;

Scope change is approved.

BL-FUT-005 — Broad Competitor Monitoring

Status: SCOPE-CHANGE REQUIRED
Horizon: FUTURE / EVIDENCE-GATED

Idea

Continuously monitor a wide competitor set for content, ranking, pricing or site changes.

Current Position

Competitor evidence is gathered when it materially affects a decision.

Promotion Gate

repeated customer decisions require broader monitoring;

the monitored signals lead to useful actions;

legal/provider constraints are clear;

cost and noise remain bounded;

Scope change is approved.

BL-FUT-006 — Generic Analytics Suite

Status: SCOPE-CHANGE REQUIRED
Horizon: FUTURE / EVIDENCE-GATED

Idea

Provide broad ecommerce and SEO dashboards.

Current Position

General analytics is explicitly outside Product Scope.

Promotion Gate

This should normally remain rejected.

Reconsider only if the Product cannot deliver its decision job without owning a specific missing analytical layer and integrating an existing platform cannot solve it.

A dashboard being popular is not sufficient.

BL-FUT-007 — Bulk or Multi-Intervention Execution

Status: EVIDENCE-GATED
Horizon: POST-V1 / future

Idea

Prepare or deploy multiple approved interventions as a coordinated package.

Why Retained

Customers may later want to implement a larger plan efficiently.

Main Risks

dependency errors;

larger blast radius;

approval complexity;

partial failure;

rollback conflicts;

agency-like scope.

Promotion Gate

one-intervention execution is mature;

customers repeatedly approve related intervention groups;

dependencies can be modelled;

grouped review remains understandable;

partial recovery is tested.

BL-FUT-008 — Universal Execution Framework

Status: CAPTURED
Horizon: POST-V1

Idea

Extract a highly general executor framework supporting many intervention types.

Why Retained

Shared execution infrastructure may reduce duplication after several executors exist.

Why Not Now

The Roadmap explicitly requires building one vertical slice before generalising.

Promotion Gate

at least two completed executors expose real shared requirements;

generalisation removes verified duplication;

it does not force dissimilar interventions into weak abstractions;

the change is cheaper than maintaining bounded implementations.

Part VI — Non-Blocking Technical Debt and Repository Maintenance

9. Technical-Debt Rule

Items in this section are not allowed to interrupt active Product milestones unless they become explicit dependencies or blocking defects.

BL-TD-001 — Continuous Integration

Status: CAPTURED
Horizon: NON-BLOCKING TECHNICAL DEBT
Source: Repository audit RBA-006

Idea

Add CI to run approved quality commands on changes.

Why Retained

The current 900-test result is local and requires localhost permission.

Promotion Gate

Promote when:

a milestone begins changing production-facing code;

multiple environments or contributors increase regression risk;

a release gate requires reproducible checks.

The CI design must handle the localhost test requirement correctly.

BL-TD-002 — Linting

Status: CAPTURED
Horizon: NON-BLOCKING TECHNICAL DEBT

Idea

Introduce a bounded lint command and CI check.

Promotion Gate

recurring style or correctness problems;

clear low-maintenance configuration;

no mass refactor merely to satisfy preferences;

included as a milestone dependency or release-quality gate.

BL-TD-003 — Type Checking

Status: CAPTURED
Horizon: NON-BLOCKING TECHNICAL DEBT

Idea

Add type checking through JSDoc, TypeScript or another bounded approach.

Promotion Gate

runtime contract defects indicate material value;

chosen approach fits the current architecture;

migration cost is bounded;

no speculative full-codebase rewrite.

BL-TD-004 — Build and Release Discipline

Status: CAPTURED
Horizon: NON-BLOCKING TECHNICAL DEBT

Idea

Create explicit build, package and release commands where the chosen V1 architecture requires them.

Promotion Gate

This becomes Roadmap work only when:

the architecture decision defines a deployable Product;

private alpha or release requires repeatable packaging;

the command proves an actual release artefact.

BL-TD-005 — Legacy Writer Isolation and Removal

Status: CAPTURED
Horizon: NON-BLOCKING TECHNICAL DEBT
Source: Audit RBA-007

Idea

Isolate and eventually remove:

/generate-article
services/articleGeneration.js
prompts/articlePrompt.js
providers/router.js
catalogue/products.js

and related legacy surfaces.

Why Retained

The old writer can confuse contributors and customers.

Why Not Now

It remains tested historical functionality and may have dependencies.

Promotion Gate

the new canonical Product route exists;

migration and regression dependencies are understood;

no proof or reusable primitive is lost;

removal is included in a bounded milestone.

No expansion of the legacy route is allowed.

BL-TD-006 — Repository, Package and Internal Rename

Status: CAPTURED
Horizon: ADJACENT WORKSTREAM / NON-BLOCKING DEBT
Source: DECISIONS.md O-001, O-002

Idea

Rename the repository/package after the Product name is approved.

Promotion Gate

V1-01 passes;

Product scope and Roadmap remain stable;

final name is approved;

migration impact is understood;

the work does not interrupt an active milestone.

BL-TD-007 — README Rewrite

Status: CAPTURED
Horizon: NON-BLOCKING TECHNICAL DEBT

Idea

Replace the historical AI-writer README with a current Product and contributor overview.

Promotion Gate

the canonical Product architecture and first active milestone are stable;

the README can point to actual commands and current surfaces;

it will not duplicate governance authority.

A minimal governance pointer may be added earlier only if stale README content materially misdirects contributors.

BL-TD-008 — Historical Architecture Documentation Reconciliation

Status: CAPTURED
Horizon: NON-BLOCKING TECHNICAL DEBT

Idea

Review and archive or update:

ARCHITECTURE.md
Research_Architecture.md
Cornerstone_Evergreen_Workflow.md
REFACTOR_PLAN.md

and other stale writer-era documents.

Promotion Gate

current architecture is approved;

active contributors are being misled;

the relevant milestone requires accurate architecture documentation.

Historical files should be archived rather than rewritten as though they never existed.

BL-TD-009 — Proof Artefact Canonicalisation and Retention Policy

Status: CAPTURED
Horizon: NON-BLOCKING TECHNICAL DEBT

Idea

Define:

canonical proof pointers;

immutable historical proofs;

superseded proof labels;

retention rules;

deletion rules for redundant artefacts;

prevention of stale proof use.

Why Retained

The repository contains many M3–M6 proof variants and deployment artefacts.

Promotion Gate

proof ambiguity causes an actual milestone or audit problem;

storage becomes material;

a release evidence register requires canonicalisation.

Do not rewrite historical proof content.

BL-TD-010 — Historical Deployment Archive Cleanup

Status: CAPTURED
Horizon: NON-BLOCKING TECHNICAL DEBT

Idea

Review old WordPress plugin ZIPs, deployment bundles and incident artefacts.

Promotion Gate

selected executor and supported plugin boundary are known;

reproducibility requirements are preserved;

redundant archives can be removed safely;

no current milestone proof depends on them.

BL-TD-011 — Localhost Test Environment Normalisation

Status: CAPTURED
Horizon: NON-BLOCKING TECHNICAL DEBT

Idea

Document or adjust the test harness so local/CI runs handle the known localhost permission requirement consistently.

Why Retained

The first sandbox run produces EPERM for HTTP tests although the permitted run passes 900/900.

Promotion Gate

CI is introduced;

the issue creates contributor confusion;

a bounded environment-safe solution exists without weakening HTTP tests.

BL-TD-012 — Expanded Supported-Environment Test Matrix

Status: CAPTURED
Horizon: POST-V1 / NON-BLOCKING TECHNICAL DEBT

Idea

Automate compatibility tests across supported:

WordPress versions;

WooCommerce versions;

themes/builders;

SEO plugins;

PHP/hosting variations where relevant.

Promotion Gate

the selected executor and supported environments are defined;

customer failures reveal the highest-value compatibility targets;

matrix cost remains sustainable.

Part VII — Adjacent Brand and Distribution Workstreams

10. Adjacent-Workstream Rule

The following may matter commercially but are not Product implementation tasks.

They must not interrupt the active Product milestone unless the Roadmap or Decisions schedule them.

BL-GTM-001 — Product Naming and Brand Identity

Status: CAPTURED
Horizon: ADJACENT WORKSTREAM
Source: DECISIONS.md O-001

Promotion Trigger

After V1-01 passes and the Product thesis remains valid.

Scope

Potentially includes:

Product name;

domain;

basic visual identity;

positioning language;

brand architecture.

Constraints

Naming must not redefine Product Scope.

The active Product milestone continues unless Ben deliberately schedules a bounded naming session.

BL-GTM-002 — Founder-Led Educational Content Channel

Status: CAPTURED
Horizon: ADJACENT WORKSTREAM
Source: DECISIONS.md O-011, D-029, D-030

Idea

Create a separate Product/founder channel focused on:

complete ecommerce SEO education;

Product development evidence;

transparent tests;

successes and failures;

real proof from the test environment.

Why Retained

The content philosophy supports trust-first distribution.

Promotion Trigger

Product name approved;

clear channel identity;

enough Product evidence to discuss honestly;

content work does not threaten active Product delivery.

Constraints

Street Kingz remains the test business, not the Product identity.

Street Kingz's existing audience is not automatically repurposed.

BL-GTM-003 — Free Educational Resource Library

Status: CAPTURED
Horizon: ADJACENT WORKSTREAM / POST-V1

Idea

Publish complete how-to resources corresponding to common Product recommendations.

Why Retained

Content can:

teach the skill;

reduce support;

improve trust;

help free DIY users succeed.

Promotion Gate

repeated recommendation types exist;

customer questions reveal real education needs;

resources can remain current;

content production does not become a second unfinished Product.

BL-GTM-004 — Public Product Website and Waitlist

Status: CAPTURED
Horizon: ADJACENT WORKSTREAM

Promotion Trigger

A bounded website/waitlist may be justified after:

name and positioning are approved;

the Product thesis survives V1-01;

there is something honest to demonstrate;

data collection and privacy requirements are clear.

Constraints

Do not build a polished marketing site before the Product has evidence.

Part VIII — Research and Market Watch

BL-RW-001 — Competitive Landscape Refresh

Status: CAPTURED
Horizon: ONGOING GOVERNANCE
Source: DECISIONS.md G-009; COMPETITORS.md

Idea

Refresh the relevant competitor job before a major capability enters the Roadmap.

Rule

This is not a reason to run constant broad competitor research.

Refresh only when:

a major milestone begins;

a new competitor materially overlaps;

pricing or capability changes affect a decision;

a competitive claim is being considered.

Findings update COMPETITORS.md.

They do not automatically create Backlog features.

BL-RW-002 — Human Specialist Benchmark Expansion

Status: CAPTURED
Horizon: POST-V1 / EVIDENCE

Idea

Expand the human ecommerce SEO benchmark beyond the minimum V1 evaluation.

Promotion Gate

recommendation types diversify;

Product confidence requires a stronger benchmark;

suitably qualified specialists can evaluate comparable evidence;

cost and sample size are justified.

The benchmark remains evaluation infrastructure, not a production dependency.

BL-RW-003 — Pricing and Willingness-to-Pay Research

Status: CAPTURED
Horizon: ROADMAP-DEPENDENT RESEARCH

Idea

Test pricing for autonomous execution.

Current Schedule

The Roadmap addresses this through:

provisional hypothesis in V1-08 / V1-09;

evidence-based decision in V1-10.

Backlog Use

Retain only additional pricing ideas discovered outside the active milestone.

Do not conduct unrelated pricing research before the executor is selected.

Part IX — Rejected Directions — Do Not Re-Add as Neutral Ideas

11. Rejected Register

The following directions are governed by DECISIONS.md and are not active Backlog items:

Decision

Rejected or superseded direction

X-001

AI SEO Writer as the Product

X-002

Broad autonomous SEO suite as the primary vision

X-003

Broad AI ecommerce growth operator

X-004

General cross-channel Product Opportunity Engine

X-005

Feature parity with paid SEO platforms

X-006

Crippled free tier

X-007

Manual SEO agency or hidden service

X-008

Literal penny-perfect at-cost billing as the core model

X-009

Collecting customer data as the main reason to offer free access

X-010

Generic BYOK/MCP WordPress agent as the Product

X-011

Large multi-agent platform

X-012

Building every executor before demand is proven

A future proposal touching one of these directions must explicitly:

cite the original decision;

present materially new evidence;

use the Decision Change Protocol;

explain why the original rejection no longer applies.

Renaming a rejected idea does not make it new.

Part X — Backlog Review and Maintenance

12. Review Cadence

The Backlog is reviewed only:

after a milestone is accepted;

when a formal Roadmap change is considered;

when evidence appears to satisfy an item's gate;

when duplicate or obsolete items need consolidation;

after V1 to create the next Roadmap.

The Backlog is not reviewed during normal task execution merely to find extra work.

13. Adding a New Item

A new entry must contain:

## BL-[CATEGORY]-[ID] — [Title]

**Status:** `CAPTURED`
**Horizon:** `[POST-V1 / FUTURE / SCOPE-CHANGE REQUIRED / NON-BLOCKING TECHNICAL DEBT / ADJACENT WORKSTREAM]`
**Source:** [Customer / milestone / competitor / audit / founder / support / research]

### Idea

[What is being retained.]

### Customer Problem or Reason

[Why it might matter.]

### Why Not Now

[Why it must not interrupt the Roadmap.]

### Evidence Required for Promotion

- [Evidence]

### Dependencies

- [Approved dependency]

### Risks and Constraints

- [Risk]

### Promotion Consequence

[Scope/Decision/Roadmap documents that would need updating.]

An item without a customer problem, reason or evidence gate should not be added merely because it sounds interesting.

14. Promotion Record

When an item is promoted, add:

### Promotion Record

- Status changed to: `PROMOTED`
- Decision:
- Roadmap milestone:
- Date:
- Approved by: Ben
- Evidence:

The Roadmap entry—not the Backlog entry—then governs implementation.

15. Removal and Duplicate Record

Do not silently delete items that influenced past decisions.

Use:

### Closure Record

- Final status: `REMOVED` or `DUPLICATE`
- Date:
- Reason:
- Replacement or related item:

Trivial accidental entries may be removed before commit.

Part XI — Backlog Index

16. Index

Post-V1 Customer Experience

ID

Item

Status

BL-CX-001

Separate Organic Overview

CAPTURED

BL-CX-002

Interactive Guided DIY Mode

CAPTURED

BL-CX-003

Rich Recommendation History

CAPTURED

BL-CX-004

Advanced Alerts

CAPTURED

BL-CX-005

Polished Outcome Dashboards

CAPTURED

BL-CX-006

Natural-Language Amendment Workflow

CAPTURED

BL-CX-007

Rich Version Comparison

CAPTURED

BL-CX-008

Broader Provider Portability

CAPTURED

BL-CX-009

Advanced Cost Explanation and Usage Controls

CAPTURED

Analytics and Commercial Intelligence

ID

Item

Status

BL-DATA-001

GA4 or Equivalent Analytics Intelligence

EVIDENCE-GATED

BL-DATA-002

Advanced Commercial Metrics

CAPTURED

BL-DATA-003

Customer-Level Data Ingestion

EVIDENCE-GATED

BL-DATA-004

Customer Lifetime Value Modelling

EVIDENCE-GATED

BL-DATA-005

Cross-Customer Aggregated Learning

EVIDENCE-GATED

BL-DATA-006

Cross-Customer Model Training

EVIDENCE-GATED

BL-DATA-007

Advanced ROI / Commercial-Upside Forecasting

EVIDENCE-GATED

Executor Candidates

ID

Item

Status

BL-EX-001

New SEO Content Executor

CAPTURED

BL-EX-002

Existing Content Optimisation Executor

CAPTURED

BL-EX-003

Category / Collection Optimisation Executor

CAPTURED

BL-EX-004

Product Page Optimisation Executor

CAPTURED

BL-EX-005

Comparison / Buying Guide Executor

CAPTURED

BL-EX-006

Organic Landing Page Executor

CAPTURED

BL-EX-007

Internal Linking Executor

CAPTURED

BL-EX-008

Content Refresh Executor

CAPTURED

BL-EX-009

Cannibalisation / Consolidation Executor

EVIDENCE-GATED

BL-EX-010

Metadata Optimisation

CAPTURED

BL-EX-011

Structured Data / Product Data Executor

EVIDENCE-GATED

BL-EX-012

Narrow Technical SEO Fix Executor

EVIDENCE-GATED

Platforms and Collaboration

ID

Item

Status

BL-PLAT-001

Shopify Support

EVIDENCE-GATED

BL-PLAT-002

Other Ecommerce Platforms

EVIDENCE-GATED

BL-PLAT-003

Multi-Business Workspaces

EVIDENCE-GATED

BL-PLAT-004

Multi-User Teams and Roles

EVIDENCE-GATED

BL-PLAT-005

Agency / Multi-Client Management

SCOPE-CHANGE REQUIRED

BL-PLAT-006

Expanded WooCommerce Environment Compatibility

CAPTURED

Future Automation and Discovery

ID

Item

Status

BL-FUT-001

Low-Risk Autopilot Deployment

EVIDENCE-GATED

BL-FUT-002

AI-Assisted Shopping and Answer-Engine Optimisation

EVIDENCE-GATED

BL-FUT-003

Programmatic Page Generation

SCOPE-CHANGE REQUIRED

BL-FUT-004

Broad Rank Tracking

SCOPE-CHANGE REQUIRED

BL-FUT-005

Broad Competitor Monitoring

SCOPE-CHANGE REQUIRED

BL-FUT-006

Generic Analytics Suite

SCOPE-CHANGE REQUIRED

BL-FUT-007

Bulk or Multi-Intervention Execution

EVIDENCE-GATED

BL-FUT-008

Universal Execution Framework

CAPTURED

Technical Debt

ID

Item

Status

BL-TD-001

Continuous Integration

CAPTURED

BL-TD-002

Linting

CAPTURED

BL-TD-003

Type Checking

CAPTURED

BL-TD-004

Build and Release Discipline

CAPTURED

BL-TD-005

Legacy Writer Isolation and Removal

CAPTURED

BL-TD-006

Repository, Package and Internal Rename

CAPTURED

BL-TD-007

README Rewrite

CAPTURED

BL-TD-008

Historical Architecture Documentation Reconciliation

CAPTURED

BL-TD-009

Proof Artefact Canonicalisation and Retention Policy

CAPTURED

BL-TD-010

Historical Deployment Archive Cleanup

CAPTURED

BL-TD-011

Localhost Test Environment Normalisation

CAPTURED

BL-TD-012

Expanded Supported-Environment Test Matrix

CAPTURED

Adjacent Workstreams

ID

Item

Status

BL-GTM-001

Product Naming and Brand Identity

CAPTURED

BL-GTM-002

Founder-Led Educational Content Channel

CAPTURED

BL-GTM-003

Free Educational Resource Library

CAPTURED

BL-GTM-004

Public Product Website and Waitlist

CAPTURED

Research and Market Watch

ID

Item

Status

BL-RW-001

Competitive Landscape Refresh

CAPTURED

BL-RW-002

Human Specialist Benchmark Expansion

CAPTURED

BL-RW-003

Pricing and Willingness-to-Pay Research

CAPTURED

Bright Data — future external evidence/provider evaluation

Status: Backlog / Evidence-Gated idea. Not approved for implementation.

Potential future uses: resilient public competitor/site-page acquisition; fallback retrieval for blocked or JavaScript-rendered pages; possible external SERP/search evidence; alternative or complement to DataForSEO.

Principle: use first-party/provider APIs where authoritative; use direct public retrieval first; evaluate Bright Data only as a fallback commodity layer when evidence justifies its cost and reliability. Compare direct retrieval, DataForSEO and Bright Data for quality, reliability, coverage, latency, variable cost, free-tier usefulness, provenance, terms/licensing, privacy and maintenance burden.

Bright Data is not V1-03 WooCommerce work, does not replace WooCommerce REST, Search Console or DataForSEO, and no provider selection is made now. Do not build scraping/proxy/browser infrastructure or create credentials/calls. Revisit at V1-04 or the relevant external-evidence decision gate.

17. Final Authority Rule

If a contributor or AI sees something useful in this file:

Do not build it. Check the Roadmap.

If evidence appears to justify it:

Prepare a promotion proposal. Do not start code.

If it conflicts with Product Vision, Scope or an Accepted decision:

The item remains blocked until governance changes first.

If the current milestone is not Done:

Finish the current milestone before reviewing the next idea.

The Backlog remembers possibilities. The Roadmap authorises work.
