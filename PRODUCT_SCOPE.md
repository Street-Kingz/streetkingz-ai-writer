Product Scope

1. Purpose of This Document

This document defines what the finished product is intended to do.

PRODUCT_VISION.md defines why the product exists and the principles governing it.

PRODUCT_SCOPE.md defines what capabilities belong within that product.

This document intentionally does not define:

development order;

current implementation status;

milestone sequencing;

technical architecture;

final pricing;

final branding;

implementation-specific technology choices.

Those belong elsewhere.

A capability does not enter development simply because it appears useful.

If a capability is not represented within the approved product scope, it must first be proposed as a scope change or placed in the backlog.

2. Product Boundary

The product is an ecommerce organic-growth intelligence and autonomous execution platform.

Its core journey is:

Understand the business

→ Understand its existing organic presence

→ Discover meaningful opportunities and problems

→ Determine what deserves attention

→ Explain the decision and evidence

→ Provide complete DIY implementation guidance for free

→ Optionally prepare and execute the work autonomously as a paid action

→ Allow the customer to review and amend it

→ Deploy approved changes safely

→ Monitor what happened

→ Use new evidence to inform future decisions

The product is not intended to manage every aspect of ecommerce growth.

Its approved core domain is organic search and the commercially informed decisions surrounding it.

Part I — Customer-Facing Product

3. Account and Business Connection

The customer should be able to:

create and secure an account;

connect one supported ecommerce business;

connect and disconnect required evidence sources;

see connection health;

resolve connection problems through clear self-service guidance;

configure relevant business information;

manage consent and connected-provider access where supported;

delete their account and associated business data where applicable.

The initial intelligence experience should use read-only access wherever practical.

Write permissions should only be requested when the customer initiates a supported paid execution and only for the resources required by that intervention.

The product should make setup understandable to non-technical ecommerce owners.

This section does not imply:

agency workspaces;

multi-client management;

complex team roles;

unlimited sites;

enterprise permission systems.

Those require separate evidence and roadmap approval.

4. Business Setup and Understanding

The customer should be able to connect or provide sufficient information for the system to understand their business.

This may include:

ecommerce platform;

website or domain;

products;

categories or collections;

product variations;

pricing;

stock;

historical orders;

sales performance;

COGS or margin where available;

business priorities;

important products or categories;

relevant geographic markets;

customer type;

relevant commercial constraints;

brand voice and positioning where relevant to execution;

factual, legal or claims constraints that generated work must respect.

The system should distinguish:

Observed Facts

Directly obtained from connected data.

User-Provided Facts

Information explicitly supplied by the customer.

Inferred Information

Conclusions produced by analysis.

The user should be able to correct important inferred information.

The product should collect only the data reasonably required for its approved organic-growth functions.

Customer-identifiable data should not be ingested by default where aggregated order, product or behavioural information is sufficient.

5. Connection Health and Data Quality

The customer should be able to understand whether the system has enough reliable information to make recommendations.

The product should identify:

missing integrations;

stale connections;

missing commercial information;

insufficient historical data;

tracking problems;

conflicting information;

low-confidence data;

incomplete product mappings.

Missing information should reduce confidence rather than automatically preventing all analysis where useful analysis remains possible.

The system should explain what additional data would improve recommendation quality and why.

6. Organic Overview

The customer should have a simple view of their current organic position without requiring them to understand specialist SEO tools.

This may include:

organic visibility;

organic traffic;

important ranking changes;

pages gaining visibility;

pages losing visibility;

commercially important products or categories with weak visibility;

significant new opportunities;

significant risks or problems;

recently completed interventions;

intervention outcomes;

areas currently being monitored.

The overview exists only to support decisions.

It should summarise:

current priorities;

important blockers;

material changes;

active implementations;

monitored outcomes.

It must not duplicate the general reporting already available inside the ecommerce platform, Search Console or analytics products.

7. Opportunity Feed

The primary customer experience should be an opinionated opportunity queue rather than a large collection of raw SEO metrics.

The system should surface meaningful opportunities such as:

existing pages close to materially better visibility;

commercially important products or categories with weak organic coverage;

useful search demand not adequately served by the site;

content gaps;

category or collection opportunities;

product-page opportunities;

comparison or buying-guide opportunities;

existing content requiring improvement;

declining content;

internal-link opportunities;

cannibalisation or conflicting pages;

content-consolidation opportunities;

material technical or indexability blockers that directly affect an in-scope organic opportunity;

structured-data or product-data issues where they materially affect organic discovery and a supported response exists.

A detected issue is not automatically a recommendation.

It must pass qualification, relevance, feasibility and priority assessment before appearing as work the customer should perform.

The system should avoid creating work merely to populate the feed.

No meaningful recommendation is an acceptable state.

8. Opportunity Prioritisation

The system should help the customer understand which opportunities deserve attention first.

Prioritisation may consider evidence including:

commercial relevance;

product or category importance;

existing sales;

conversion performance;

margin or COGS where reliable;

stock or supply constraints where reliable;

existing organic visibility;

external search demand;

search intent;

competitive landscape;

likely feasibility;

existing site relevance;

current content quality;

effort;

dependencies;

time-to-impact;

strategic supporting value;

confidence in available evidence.

Unavailable evidence must not be treated as evidence of zero value.

Missing information should reduce confidence, change the decision method where necessary and be disclosed in the explanation.

The system should not present false precision where the underlying evidence does not justify it.

Opportunity ranking must remain explainable.

9. Opportunity Detail

Every recommendation should have a detailed view answering:

What Did We Find?

A plain-English description of the opportunity or problem.

Why Does It Matter?

Why the system believes the customer should care.

Why Now?

Where relevant, why this deserves attention at the present time.

Why This Before Something Else?

An explanation of relative priority.

What Evidence Supports This?

Relevant business, search, site and competitor evidence.

How Confident Are We?

The confidence level and important uncertainty.

What Should Be Done?

The recommended intervention.

What Are We Trying to Achieve?

The intended organic and commercial outcome.

What Could Make This Recommendation Wrong?

Important assumptions or limitations where appropriate.

10. Evidence Explorer

Users who want greater depth should be able to inspect the evidence underlying a recommendation.

Depending on the opportunity, this may include:

relevant queries;

search demand;

Search Console performance;

ranking history;

relevant landing pages;

SERP competitors;

competitor-page characteristics;

search intent;

commercial or product performance;

stock;

conversion;

site structure;

internal links;

existing content;

supporting research;

source and provenance information.

The default experience should remain simple.

Depth should be available without forcing every user to become an analyst.

The Evidence Explorer presents evidence gathered from connected sources, licensed providers and product analysis.

This section does not authorise development of proprietary keyword, backlink or universal rank-tracking databases.

11. Plain-English Education

Technical concepts should be explainable within the product.

Where the product uses terms such as:

SERP;

canonical;

schema;

cannibalisation;

structured data;

search intent;

topical authority;

crawlability;

indexability;

the user should be able to understand:

what the term means;

why it matters here;

whether they actually need to care about it.

Education should be contextual rather than requiring the customer to leave the product and research terminology independently.

12. DIY Implementation Plan — Free

Every actionable recommendation should provide sufficient guidance for the customer to implement it themselves.

Where appropriate, this should include:

objective;

expected difficulty;

approximate effort or time;

required access;

required skills;

prerequisites;

exact implementation steps;

content or page requirements;

structural changes;

examples;

warnings;

QA checklist;

verification process;

measurement plan.

The DIY instructions must not intentionally omit important steps to encourage paid execution.

Complete DIY guidance means the user receives enough information, evidence and ordered instruction to perform the work correctly.

It does not require the free product to:

generate every final production-ready asset;

perform execution-specific production work;

modify the connected website;

deploy changes.

Where producing a final site-specific asset is itself the implementation labour, the free product must explain how the user can create it themselves or with a tool of their choice.

Autonomously producing and preparing that asset may be part of paid execution.

13. Guided DIY Mode

Where appropriate, the customer should be able to work through an implementation as a guided process.

This may include:

step-by-step progression;

completion tracking;

contextual explanations;

copyable outputs;

checks;

validation;

ability to mark work complete;

ability to pause and resume.

Guided DIY is a usability enhancement rather than a condition of complete free intelligence.

A complete, clear and verifiable implementation plan can satisfy the Free Product Doctrine before a fully interactive guided workflow exists.

14. Recommendation Actions

The customer should be able to:

start DIY;

mark an opportunity as in progress;

mark it complete;

defer it;

ignore it;

provide a reason for ignoring it;

request reassessment;

view related opportunities;

view dependencies;

choose paid autonomous execution where available.

The system should remember these choices.

15. Free Recommendation Portability

The customer should be able to copy, export or otherwise retain:

the recommendation;

the reasoning;

the evidence summary;

the DIY implementation plan;

the QA and verification checklist;

the monitoring guidance.

The free product must not trap the recommendation inside the platform in order to force paid execution.

This does not require elaborate report-generation features at the outset. A clear, structured and copyable output can satisfy the requirement.

16. Opportunity History

The customer should be able to see:

previous recommendations;

recommendation date;

evidence and confidence at the time;

actions taken;

ignored or deferred opportunities;

completed work;

paid executions;

subsequent monitoring and results;

material changes to the recommendation over time.

Historical context should prevent the system repeatedly rediscovering the same issue without acknowledging previous decisions.

Recommendations should have a clear lifecycle such as:

current;

in progress;

completed;

deferred;

ignored;

superseded;

withdrawn due to changed evidence.

The product must not continue presenting an obsolete recommendation as current after material evidence changes.

17. Monitoring and Alerts

The product should monitor signals tied to:

active high-priority opportunities;

completed interventions;

commercially important pages;

material risks already identified by the system.

It should detect meaningful changes such as:

significant ranking gains or losses;

impression changes;

click changes;

declining important pages;

newly emerging opportunities;

material SERP changes;

completed work not producing expected leading indicators;

indexing problems;

unexpected negative effects;

opportunities whose commercial context has materially changed.

It is not intended to become a generic all-keyword rank tracker.

External SERP checks should be targeted, proportionate and performed only where their freshness affects a decision or outcome assessment.

The system should avoid noisy alerts.

Recommendation generation and reprioritisation should occur only when evidence warrants reassessment.

18. Results and Outcome View

For completed interventions, the customer should be able to see:

what changed;

when;

the baseline;

relevant leading indicators;

subsequent organic performance;

commercial performance where appropriate;

whether the intended outcome appears to be occurring;

confidence and limitations of the assessment.

The product must not present correlation as proven causation.

19. Customer-Funded Provider Access and Cost Visibility

Where an approved infrastructure model requires customer-funded AI or data access, the customer should be able to:

connect a supported provider safely;

test the connection;

understand expected cost;

understand actual cost where measurable;

understand which operation consumed the cost;

configure reasonable usage controls;

revoke access.

Provider setup should be hidden from customers where it does not create meaningful value.

The product must not require every customer to configure multiple technical provider accounts merely because the architecture supports them.

Whether bring-your-own-provider access is used in V1 belongs in DECISIONS.md and ROADMAP.md.

Costs should be translated into normal language and currency where possible.

Raw tokens and API units should not be the primary customer experience.

Part II — Paid Autonomous Execution

20. Paid Execution Principle

Paid capabilities remove implementation labour.

They do not unlock superior strategic intelligence that was deliberately withheld from free users.

The core paid action is:

Do It for Me

Execution should be software-led and designed to require minimal human effort from the customer.

Not every recommendation must offer paid execution.

A Do It for Me option should only be shown where:

the intervention has a supported executor;

the executor is sufficiently validated;

the change can be prepared safely;

review and recovery requirements are satisfied.

Paid execution may perform additional execution-specific research required to produce high-quality work.

It must not create a hidden paid-only strategic recommendation tier.

If execution research materially changes the original recommendation, the revised reasoning and evidence must be shown to the customer before approval.

21. Paid Execution Offer and Confirmation

Before a paid execution begins, the customer should be shown:

the intervention being automated;

what the system will prepare;

what it will not change;

expected outputs;

required permissions;

important limitations;

the price or usage basis;

whether external provider costs may also apply;

the approval and recovery process.

The customer must explicitly confirm the execution before chargeable work begins.

A recommendation without a validated executor should remain fully usable through its free DIY path without displaying a misleading Do It for Me option.

22. Execution Preparation

When a customer purchases or initiates an automated intervention, the system should:

confirm the target opportunity;

confirm the relevant scope;

gather required evidence;

perform any additional research required for execution;

generate the proposed intervention;

run quality checks;

capture current state and baseline;

prepare a reviewable change set.

The customer should not need to repeat information the system already possesses.

23. Review and Preview

Before significant changes are deployed, the customer should be able to inspect what will change.

Depending on intervention type, this may include:

before and after views;

content diff;

metadata diff;

structural changes;

internal-link changes;

new pages;

removed or consolidated content;

schema changes;

affected URLs;

important reasoning.

The review experience should prioritise clarity over technical detail.

24. Amendments

The customer should be able to:

edit proposed work directly where appropriate;

request an amendment in natural language;

regenerate specific parts;

reject proposed changes;

return to the original proposal;

approve the final version.

Amendments should not require restarting the entire intervention unnecessarily.

25. Approval

Significant customer-facing or structural changes should require explicit approval before deployment.

The approval record should capture:

what was approved;

by whom;

when;

which version.

Explicit customer approval is the default product behaviour for significant changes.

Any future ability to deploy without per-intervention approval is a separate evidence-gated scope decision and is not authorised by this section.

26. Deployment

For supported interventions, the system should be capable of safely deploying approved changes to the ecommerce website.

Deployment should:

apply only approved changes;

verify success;

detect partial failure;

preserve audit information;

avoid unrelated changes.

27. Rollback and Recovery

Every supported write executor must have a documented recovery path before release.

Where safe automatic rollback is practical, it should be provided.

Where automatic rollback is unsafe or impossible, the executor must retain a verified snapshot or provide another tested restoration process.

An executor must not modify a live customer website if a failed or incorrect deployment cannot be reasonably recovered.

The recovery path should support, where relevant:

customer request;

deployment failure;

detected regression;

incorrect implementation.

Rollback and recovery must be designed into executors rather than added as an afterthought.

28. Potential Paid Executor Families

The following are potential long-term executor families within the product boundary.

Their inclusion here does not mean that every family is:

required for V1;

approved for immediate development;

commercially validated;

promised to customers.

An executor family enters the roadmap only when:

the intelligence system repeatedly identifies the intervention as worthwhile;

customer value is evidenced;

the intervention can be bounded;

safe preparation, review, deployment and recovery are feasible;

a complete corresponding free DIY path exists.

New SEO Content

Create a new supporting article or resource where research demonstrates that new content is the appropriate intervention.

Existing Content Optimisation

Improve an existing article or resource rather than unnecessarily creating additional content.

Category or Collection Optimisation

Improve an existing ecommerce category or collection page for relevant organic demand and customer usefulness.

Product Page Optimisation

Improve product-page organic visibility and usefulness where the product page is the correct search destination.

Comparison or Buying Guide Creation

Create commercially useful comparison or buying-guide content where appropriate to search intent.

Organic Landing Page Creation

Create a new landing page where a meaningful search need exists that is not adequately served by existing site architecture.

Internal Linking

Prepare and implement relevant internal-link improvements.

Cannibalisation or Consolidation

Resolve overlapping pages or content where consolidation, redirection or clearer differentiation is appropriate.

Content Refresh

Update existing content that has become outdated, incomplete or competitively weak.

Metadata Optimisation

Prepare and apply appropriate metadata improvements where meaningful.

Structured Data or Product Data

Improve supported structured-data or product-data implementation where this materially improves organic discovery or machine understanding.

Supported Technical SEO Fixes

Automate narrowly defined technical interventions where:

the issue is reliably detectable;

the correct fix is sufficiently deterministic;

execution can be made safe;

recovery and verification are possible.

The product should not attempt arbitrary autonomous technical development merely because an issue is labelled technical SEO.

Metadata, structured data, indexation, redirects and similar actions should usually be treated as supporting parts of a broader intervention rather than separate paid executors.

They should become standalone executors only where independent customer value is proven.

Supported Technical SEO Fixes remain future and evidence-gated.

This section does not authorise a general autonomous technical SEO agent.

Part III — Internal Product Capabilities

29. Commerce Data Ingestion

The internal system should be capable of ingesting and normalising relevant ecommerce information from supported platforms.

This may include:

products;

variations;

categories;

pricing;

stock;

orders;

sales;

aggregated customer or repeat-purchase metrics where required and appropriate;

COGS;

commercial metadata.

The system should avoid ingesting customer-identifiable information where product-, order- or aggregate-level data is sufficient.

The internal representation should avoid unnecessary platform-specific assumptions.

30. Commercial Business Model

The system should construct a usable commercial model of the store from available evidence.

This may include:

product importance;

category importance;

revenue contribution;

sales velocity;

conversion;

stock position;

COGS or margin;

product relationships;

commercial trends.

The system must distinguish known facts from inferred commercial significance.

31. Search Console Intelligence

The system should ingest and analyse organic-search performance including:

queries;

pages;

impressions;

clicks;

CTR;

average position;

time-series changes;

query and page relationships.

It should account for limitations in Search Console data.

32. Analytics Intelligence

Where analytics data is connected, the system should understand relevant website behaviour such as:

organic sessions;

landing-page performance;

conversion;

ecommerce outcomes;

engagement where useful;

changes over time.

Analytics data should not be treated as perfectly reliable without validation.

33. Site Understanding

The system should maintain a model of the website including:

URLs;

page types;

products;

categories;

articles or resources;

metadata;

headings and content;

internal links;

canonical signals;

indexability;

structured data where relevant;

site hierarchy.

34. External Search Intelligence

The system should be capable of acquiring external evidence such as:

search demand;

keyword or topic relationships;

SERPs;

competitor pages;

search intent;

result types;

relevant trends;

competitive characteristics.

Commodity external data should be purchased or accessed through appropriate providers where rebuilding it would be wasteful.

This capability does not authorise development of a proprietary search index, keyword-volume database, backlink index or universal keyword-difficulty platform.

35. Research Orchestration

The system should determine:

what evidence is required to make or reassess a decision;

whether existing evidence remains sufficient;

when external research is justified;

how deeply an opportunity should be investigated;

how to bound unnecessary cost and latency;

how to retain evidence and provenance.

Research effort should be proportional to:

decision importance;

uncertainty;

potential customer impact.

Specific provider routing, cache design and implementation architecture belong in technical design.

36. Opportunity Discovery Engine

The system should discover candidate organic opportunities from:

existing rankings;

existing pages;

products and categories;

external demand;

competitor gaps;

site structure;

content performance;

commercial context;

technical or indexability evidence.

Discovery should prioritise recall initially without allowing low-quality candidates to automatically become recommendations.

37. Candidate Filtering

The system should remove or deprioritise candidates that are:

irrelevant;

commercially inappropriate;

duplicate;

navigational noise;

wrong market;

temporally inappropriate;

mismatched to products;

unsupported by evidence;

clearly unrealistic.

Filtering should be bounded and explainable.

38. Search Intent and SERP Interpretation

The system should determine:

what the searcher appears to want;

what page or content types search engines currently reward;

whether the store has an appropriate destination;

whether an existing page should be improved;

whether a new page is justified;

whether the opportunity is inappropriate for the site.

39. Commercial Relevance Assessment

Where sufficient evidence exists, the system should evaluate whether an organic opportunity is commercially meaningful to the specific business.

Commercial context should inform decisions without reducing every SEO action to immediate direct revenue.

The system should recognise strategic and supporting value where appropriate.

40. Competitive Feasibility

The system should assess whether the specific website appears capable of competing for an opportunity.

This may consider:

current visibility;

existing topical or site relevance;

SERP composition;

competitor strength;

page quality;

search-intent fit;

available authority evidence;

distance from competitive positions;

evidence from similar existing performance.

Feasibility should be probabilistic rather than presented as certainty.

Feasibility should use available and integrated evidence.

This capability does not authorise development of a proprietary backlink index, universal keyword-difficulty database or standalone authority metric.

41. Opportunity Prioritisation Engine

The system should compare surviving opportunities and determine which deserve attention.

It should not rely on a single simplistic metric such as search volume.

Prioritisation should combine relevant evidence while preserving explainability.

The system should be capable of deciding that no current candidate justifies action.

42. Dependency and Strategic Sequencing

The system should recognise where opportunities depend on other work.

Examples include:

supporting content before a broader commercial target;

category restructuring before page optimisation;

fixing cannibalisation before creating additional content;

resolving indexability before attempting ranking improvements.

The locally highest-value action may not always be the strategically correct next action.

43. Intervention Selection

For a prioritised opportunity, the system should determine the appropriate intervention.

Possible decisions include:

create;

optimise;

refresh;

consolidate;

internally link;

restructure;

fix;

monitor;

defer;

do nothing.

The system must not default to article creation.

44. Evidence and Provenance

Important recommendations should retain sufficient evidence to explain and reproduce the decision.

The system should preserve, where relevant:

source;

provider;

retrieval date and time;

query or research parameters;

source URL or identifier where appropriate;

relevant extracted evidence;

data freshness;

confidence;

transformations or interpretations applied;

relationship between evidence and recommendation.

The system should distinguish:

direct evidence;

derived metrics;

model interpretation;

assumptions;

user-provided information.

Important decisions should not depend on evidence that cannot subsequently be inspected or explained.

45. Evidence Freshness

The system should understand that different evidence has different useful lifetimes.

Examples include:

SERPs may change quickly;

stock may change daily;

commercial performance may require a meaningful historical window;

site content may change following deployment;

search demand may exhibit seasonality;

competitor pages may change;

business priorities may change.

The system should determine when existing evidence remains sufficient and when fresh research is required.

It should avoid unnecessary repeated research solely because data is technically old.

46. Confidence Framework

Recommendations should include a meaningful confidence assessment.

Confidence may be affected by:

evidence quality;

evidence completeness;

data freshness;

agreement between evidence sources;

sample size;

uncertainty in inferred information;

competitive uncertainty;

missing commercial information;

tracking quality.

Confidence should affect how strongly the system communicates a recommendation.

Low confidence should not be disguised through confident language.

47. Recommendation Engine

The recommendation engine should convert prioritised opportunities into clear customer-facing decisions.

A recommendation should contain enough structured information to support:

plain-English explanation;

evidence display;

DIY guidance;

paid execution;

monitoring;

future reassessment.

The recommendation itself should remain separate from the implementation mechanism.

This allows the same recommendation to support:

DIY implementation;

third-party implementation;

customer employees;

external agencies;

autonomous paid execution.

48. DIY Plan Generator

The system should convert a recommendation into complete implementation guidance.

The plan should determine:

prerequisites;

required access;

required skills;

ordered steps;

expected difficulty;

approximate effort;

implementation warnings;

validation steps;

measurement plan.

Instructions should adapt to the customer's platform and situation where reliable information is available.

The DIY plan must not intentionally become less complete because an automated executor exists.

49. Common Execution Framework Requirement

Paid executors should share a common product and safety contract wherever practical.

Every supported executor should be able to produce:

a bounded proposed change set;

relevant reasoning;

QA results;

a clear preview or diff;

amendment support appropriate to the intervention;

an approval record;

a deployment result;

a recovery record;

monitoring requirements.

Individual intervention logic may differ.

The implementation architecture used to satisfy this contract belongs in technical design.

50. Automated Quality Assurance

Before proposed work reaches the customer for approval, the system should perform appropriate quality checks.

Depending on intervention type, this may include:

factual consistency;

unsupported claims;

duplication;

intent alignment;

relevance;

content completeness;

internal-link validity;

URL validity;

metadata constraints;

structured-data validity;

formatting;

page integrity;

accidental removal of important information;

commercial or product accuracy;

prohibited or unapproved changes.

QA should combine deterministic validation and model-based evaluation where appropriate.

Passing QA should not imply absolute correctness.

51. Change Management

Every executable intervention should produce a structured record of proposed changes.

The system should understand:

current state;

proposed state;

affected resources;

dependencies;

potential conflicts;

approval status;

deployment status;

verification status.

Unrelated site changes must not be bundled into an intervention merely because they were discovered during execution.

52. Deployment Engine

The deployment layer should provide controlled write access to supported ecommerce or content platforms.

It should:

apply only approved changes;

use the minimum required permissions;

handle partial failures;

verify resulting state;

maintain audit records;

avoid silent failure;

support executor-specific recovery where appropriate.

Free intelligence should not require write access where read-only access is sufficient.

Write permissions should be requested only:

for a supported paid execution;

after the customer chooses that execution;

for the narrowest required resources;

for only as long as reasonably necessary.

53. Rollback Engine

The system should preserve sufficient pre-change state for supported interventions to be reversed or restored.

Recovery should understand:

what changed;

original state;

dependencies;

whether subsequent customer changes make automatic rollback unsafe.

Where automatic rollback is unsafe, the product should explain why rather than blindly overwriting newer work.

54. Baseline Capture

Before an intervention is deployed, the system should capture relevant baseline information.

Depending on the intervention, this may include:

page state;

rankings;

queries;

impressions;

clicks;

organic sessions;

conversion;

commercial performance;

indexability;

internal-link state;

relevant SERP characteristics.

Baseline selection should be appropriate to the intervention rather than collecting every available metric.

55. Intervention Monitoring

After deployment, the system should monitor signals relevant to the intended outcome.

Monitoring should distinguish:

Leading Indicators

Examples include:

successful crawl or indexing;

impressions;

query coverage;

ranking movement.

Behavioural Indicators

Examples include:

organic sessions;

engagement;

conversion.

Commercial Indicators

Examples include:

transactions;

revenue;

contribution where sufficiently reliable.

The product should not wait exclusively for final revenue before determining whether an intervention appears to be progressing.

56. Outcome Assessment

The system should periodically assess whether an intervention appears to have:

succeeded;

partially succeeded;

failed;

produced insufficient evidence;

caused an unexpected negative result;

become impossible to assess confidently.

Outcome assessment should explain the evidence supporting the conclusion.

Correlation must not automatically be presented as causation.

57. Learning and Feedback

The system should use new evidence to improve the individual customer's future recommendations where technically appropriate.

Useful customer-specific feedback may include:

acceptance or rejection;

customer amendments;

implementation success or failure;

QA failures;

rollback events;

observed organic outcomes;

changes in competitive conditions.

Cross-customer aggregated learning is future and evidence-gated.

It must not enter implementation until:

lawful basis and consent requirements are defined;

data minimisation is established;

security and governance are adequate;

the product can demonstrate that the aggregated learning materially improves customer outcomes.

The business must remain viable without assuming a future proprietary-data moat.

58. Variable-Cost Control

The product should understand and control variable research and AI costs where measurable.

It should:

avoid unnecessary duplicate work;

estimate expensive operations where practical;

record actual variable cost where available;

prevent uncontrolled usage;

preserve required decision quality.

Specific caching, routing and model-selection architecture belongs in technical design.

59. Provider Portability

Core product logic should avoid unnecessary dependence on one provider where a realistic substitution need exists.

The product does not require a universal provider-abstraction framework from the beginning.

Provider abstraction should be introduced only when justified by:

supported bring-your-own-provider access;

meaningful quality differences;

cost;

reliability;

contractual risk;

actual provider-substitution requirements.

60. Business Rules and Deterministic Controls

Important product behaviour should not depend entirely on unconstrained model judgement.

Deterministic rules should be used where:

correctness can be explicitly defined;

safety requires hard boundaries;

filtering can be performed reliably;

platform constraints are known;

output requirements are objective;

unnecessary model usage can be avoided.

AI reasoning should be used where interpretation genuinely adds value.

The system should combine deterministic controls with model reasoning rather than treating either as universally superior.

61. Auditability

Important system actions should be auditable.

The system should be able to reconstruct, where relevant:

what evidence existed;

what decision was made;

which model, provider or rules contributed;

what recommendation was shown;

what the customer chose;

what was generated;

what was approved;

what was deployed;

what subsequently happened.

Auditability supports:

debugging;

customer trust;

quality improvement;

recovery;

dispute resolution;

benchmarking.

62. Privacy and Security

The product may process commercially sensitive business information.

Security and privacy are therefore core product requirements rather than optional later improvements.

The system should support appropriate controls for:

authentication;

authorisation;

encrypted credentials and secrets;

API-key handling;

least-privilege access;

secure storage;

sensitive logging;

data deletion;

account disconnection;

provider revocation;

audit trails;

applicable privacy requirements.

The product should minimise:

the data collected;

the permissions requested;

the retention period;

the number of systems receiving sensitive information.

Sensitive commercial or personal information should not be included in model prompts unless required for the approved operation.

API keys and access credentials must not be exposed unnecessarily to client-side code, logs, prompts or other customers.

63. Failure Handling

The product should fail visibly and safely.

Where something cannot be completed, the system should explain:

what failed;

what was and was not completed;

whether anything changed;

whether customer action is required;

whether retrying is safe.

The system should not present partial execution as successful execution.

Part IV — Product Boundaries

64. Explicitly Out of Scope

Unless deliberately added through the scope-change process, the product is not intended to become a general-purpose platform for:

paid advertising management;

advertising attribution;

email marketing;

CRM;

customer-service management;

inventory management;

warehouse management;

accounting;

financial forecasting;

general business intelligence;

social-media management;

marketplace management;

generic website building;

generic copywriting;

backlink marketplace or brokerage;

full-scale rank-tracking databases sold as a standalone product;

general keyword-research databases;

agency project management;

multi-client agency management unless separately approved through evidence;

a generic BYOK or MCP wrapper that merely exposes WordPress actions to an AI model;

a high-volume programmatic content or landing-page factory without decision evidence.

Relevant data from adjacent domains may be consumed where it improves organic-growth decisions.

Consuming that data does not automatically place the adjacent domain within product scope.

65. No Feature-Count Competition

The product should not add capabilities merely because a paid competitor has them.

Competitor capabilities should only enter scope where they:

materially improve the free intelligence product;

materially improve recommendation quality;

enable a valuable autonomous intervention;

are required for safety or reliability;

provide necessary infrastructure.

Feature-count parity with mature SEO platforms is explicitly not a product objective.

66. No Artificial Free-Tier Restrictions

The following should not be used purely to force monetisation:

artificially limiting recommendation quality;

hiding evidence already gathered;

withholding DIY instructions;

deliberately using worse reasoning;

locking basic explanations;

preventing customers from implementing recommendations elsewhere.

Operational limits may exist where required for:

infrastructure protection;

provider limits;

security;

abuse prevention;

genuinely expensive external operations.

Such limits should be technically or economically justified rather than designed as artificial frustration.

67. No Manual-Service Dependency

The finished product should not require routine founder or employee labour to fulfil normal paid executions.

Temporary manual review during development is acceptable.

Manual work should not silently become the permanent business model.

68. Platform Scope

The product may support approved ecommerce platforms through platform-specific connectors and executors.

Current platform priorities belong in DECISIONS.md and ROADMAP.md.

The internal business, opportunity and recommendation models should avoid unnecessary platform-specific assumptions.

Support for additional platforms is evidence-gated and does not enter development merely because a connector is technically possible.

69. Organic Discovery Scope

The approved core domain is organic search and the website changes required to improve relevant unpaid discoverability.

Expansion into AI-assisted shopping, answer engines or other unpaid discovery surfaces is future and evidence-gated.

The phrase organic discovery does not automatically place every unpaid acquisition channel within product scope.

Each additional discovery surface requires:

demonstrated customer value;

reliable evidence;

a defined decision job;

a supported implementation path;

explicit scope approval.

Part V — Scope Governance

70. Scope Change Process

New capabilities must not silently enter development.

A proposed material scope addition should state:

Proposed Capability

What is being added.

Customer Problem

What problem it solves.

Evidence

Why we believe the problem is worth solving.

Existing Alternatives

Who already solves it and how.

Vision Alignment

Why it belongs in this product.

Complexity

Expected technical and operational burden.

Dependencies

What it requires.

Roadmap Impact

What approved work would be delayed or changed.

Decision

One of:

approve into scope;

backlog;

reject.

Code should not precede the scope decision.

71. Relationship to the Backlog

BACKLOG.md may contain ideas that are not currently part of approved product scope.

Being in the backlog does not mean:

approved;

planned;

promised;

scheduled.

The backlog exists specifically so useful ideas can be remembered without disrupting approved work.

72. Relationship to the Roadmap

PRODUCT_SCOPE.md defines the destination.

ROADMAP.md defines the approved route toward that destination.

Not every scoped capability must appear in the current roadmap.

Later capabilities can remain within long-term scope without being scheduled.

The roadmap may not add major capabilities that contradict or bypass this scope without first updating this document.

73. Relationship to Project State

PROJECT_STATE.md describes what actually exists today.

A capability appearing in this document does not imply that it has been:

built;

tested;

validated;

scheduled.

Current implementation status belongs in PROJECT_STATE.md.

74. Real-World Validation Requirement

Street Kingz is the initial validation environment, not the product.

Product capabilities must be generic.

Where a capability is initially proven using Street Kingz, the implementation must not rely on undocumented knowledge of that business.

Before broad release, critical decision capabilities should subsequently be validated against independent ecommerce businesses.

75. Finished Product Definition

The long-term product is within scope when it can support the following customer journey:

Connect my ecommerce business.

Understand my business and existing organic presence.

Identify where meaningful organic opportunities or problems exist.

Filter out work that is not worth my attention.

Prioritise what appears most worthwhile.

Explain what I should do and why.

Show me the evidence.

Teach me everything required to do it myself for free.

Let me retain the recommendation and use it elsewhere.

Let me track and verify my own implementation.

If I choose, let me pay to have the software prepare the implementation autonomously.

Let me review, edit and approve it.

Deploy only the approved work safely.

Monitor what happened.

Use new evidence to improve future decisions.

This is the product boundary.

How we reach it is the responsibility of the roadmap.

76. Scope Authority

The repository is the authoritative source of product scope.

Current approved repository documentation overrides:

previous conversations;

AI memory;

abandoned plans;

superseded specifications;

undocumented assumptions.

If an AI assistant, coding agent or contributor proposes work outside this scope, the correct action is:

identify the scope conflict;

explain the proposed value;

recommend backlog or scope review if warranted;

do not implement the capability until approved.

New ideas are not new priorities.

Scope changes before code changes.

Appendix A — Scope Horizons

A1. Purpose

Scope horizon does not define detailed build order.

It defines whether a capability is:

V1 Required

Required for the first coherent end-to-end product proving:

Free Intelligence → Paid Autonomous Execution

Post-V1

Within approved product scope but not required for initial proof.

Future / Evidence-Gated

Within the possible long-term product boundary but unable to enter the roadmap without supporting evidence and explicit approval.

ROADMAP.md remains authoritative for actual sequence.

A capability's presence in V1 Required does not imply it must be built from zero. The repo audit must identify what already exists, what can be reused and what must be bought or integrated.

A2. V1 Required

Governance and Boundaries

Sections 1–2;

Sections 64–67;

Sections 70–76.

Basic Customer Foundation

Section 3, limited to one account and one connected business;

Sections 4–5.

Core Free Product

Section 7 — Opportunity Feed;

Section 8 — Opportunity Prioritisation;

Section 9 — Opportunity Detail;

Section 10 — a bounded Evidence Explorer;

Section 11 — Plain-English Education;

Section 12 — Complete DIY Implementation Plan;

Section 14 — basic recommendation actions;

Section 15 — Free Recommendation Portability.

A separate Organic Overview and fully interactive Guided DIY workflow are not required if the Opportunity Feed and Opportunity Detail provide the same initial value.

Core Paid Product

V1 requires one proven executor, not every potential executor family.

For the selected executor, V1 requires:

Section 20 — Paid Execution Principle;

Section 21 — Paid Execution Offer and Confirmation;

Sections 22–27;

Sections 49–54;

Section 50 — executor-specific QA;

Section 63 — Failure Handling.

The specific first executor is selected by ROADMAP.md after the repo audit and evidence review. This document does not authorise development of additional executor families merely because they appear in Section 28.

Core Internal Intelligence

Section 29 — minimum commerce-data ingestion;

Section 30 — minimum commercial business model;

Section 31 — Search Console intelligence;

Section 33 — minimum site understanding;

Section 34 — integrated external-search evidence;

Sections 35–48.

These capabilities form the decision-intelligence spine.

Minimum Safety and Trust

Section 52 — controlled deployment permissions;

Section 53 — recovery support;

Section 54 — baseline capture;

basic targeted post-intervention monitoring from Section 55;

Section 58 — minimum variable-cost telemetry;

Section 60 — deterministic controls;

Section 61 — auditability;

Section 62 — privacy and security;

Section 63 — failure handling.

A3. Post-V1

Customer Experience

Section 6 — a separate Organic Overview;

Section 13 — interactive Guided DIY Mode;

advanced related-opportunity and dependency interfaces from Section 14;

rich recommendation history from Section 16;

Section 17 — alerts beyond active interventions and material priorities;

Section 18 — polished results and outcome views;

Section 19 — public customer-funded provider onboarding, unless later selected as necessary for V1 economics.

Additional Evidence

Section 32 — GA4 or equivalent analytics intelligence beyond the minimum available through store and Search Console data;

advanced ranking and competitor-history data;

advanced commercial signals such as contribution margin, product affinity or repeat-purchase modelling.

Additional Paid Executors

Additional executors may be considered only after the intelligence system repeatedly produces those interventions and customer demand is evidenced.

Potential post-V1 candidates include:

Existing Content Optimisation;

Category or Collection Optimisation;

Product Page Optimisation;

Internal Linking;

Content Refresh;

Comparison or Buying Guide Creation;

Organic Landing Page Creation.

Their order must be determined by observed recommendation frequency, customer value, safety and willingness to pay—not by the order in Section 28.

Execution Sophistication

natural-language amendment loops beyond basic editing or regeneration;

rich version comparison;

framework generalisation beyond what proven executors require;

automated outcome classification;

broader provider portability.

A4. Future / Evidence-Gated

The following must not enter the roadmap without explicit evidence and approval:

multi-business workspaces;

multi-user team roles;

agency or multi-client management;

deployment without per-intervention customer approval;

raw customer-level ingestion;

customer-lifetime-value modelling;

cross-customer aggregated learning;

cross-customer model training;

standalone Structured Data or Product Data executors;

Supported Technical SEO Fixes as an executor family;

automated cannibalisation or consolidation involving redirects and destructive changes;

additional ecommerce platforms;

AI-assisted shopping and answer-engine optimisation;

other unpaid discovery surfaces;

generalised provider abstraction across many models;

a generic MCP or WordPress-action layer;

programmatic page generation at scale;

broad all-keyword rank tracking;

broad competitor monitoring;

a standalone analytics or reporting suite.

Appendix B — Build, Buy and Integrate Constraints

This appendix constrains implementation strategy without prescribing detailed architecture.

B1. Search Console and First-Party Search Data — Integrate

Use official APIs.

Do not reproduce Search Console reporting or infer data already available directly.

B2. External Search Demand, SERPs and Keyword Data — Buy or Integrate

Use an appropriate licensed provider.

Do not build:

a search index;

a keyword-volume database;

a backlink index;

a universal keyword-difficulty platform.

B3. Ecommerce Data — Integrate

Use supported commerce APIs and platform standards.

Do not build a parallel ecommerce analytics warehouse beyond what the product needs for decisions.

B4. Analytics — Integrate Selectively

Use GA4 or another approved source where the incremental decision value justifies the connector and data-quality burden.

Do not recreate a general ecommerce analytics platform.

B5. Crawling and Page Extraction — Use Mature Libraries or Services

Use existing crawling primitives, HTML parsers, structured-data parsers, sitemap libraries, URL utilities and canonical utilities where appropriate.

Build the interpretation and decision layer, not commodity parsing infrastructure.

B6. Platform SEO Foundations — Interoperate

For any supported platform, do not attempt to replace established SEO foundations merely to control metadata or schema.

Where WordPress or WooCommerce is an approved platform, executors should safely interoperate with supported SEO plugins and platform formats rather than recreating them.

B7. Schema Validation — Use Existing Validators and Libraries

Do not build a standards-validation engine unless existing options genuinely fail a supported executor.

B8. AI Models — Integrate

Use approved external model providers.

Do not build a generic prompt playground, model marketplace or AI wrapper as the product.

B9. Authentication, Secrets and Payments — Use Managed Infrastructure

Do not hand-roll:

password security;

OAuth;

payment-card storage;

secrets management;

email authentication;

billing primitives.

B10. Diffing and Version History — Use Mature Libraries

Build the intervention model and customer review experience.

Do not reinvent general text or structured-data diff algorithms.

B11. Monitoring — Build the Decision Layer, Integrate the Measurements

Build:

which interventions and signals should be monitored;

when reassessment is justified;

how outcomes relate to recommendations.

Use integrated data sources for raw measurements.

Do not build a generic rank-tracking business.