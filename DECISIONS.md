# DECISIONS.md

**Status:** Authoritative decision register
**Last updated:** 2026-08-22
**Product name:** Not yet selected; referred to as **the Product**
**Decision owner:** Ben

---

## 1. Purpose of This Document

This document records the material product, commercial, technical-boundary and operating decisions that govern the project.

It exists to prevent:

* settled questions being reopened without new evidence;
* abandoned product directions quietly returning;
* coding agents inferring product strategy from implementation details;
* conversation history overriding current repository truth;
* scope being expanded through code rather than deliberate approval;
* temporary implementation choices becoming permanent product principles;
* the project drifting toward whichever competitor feature looks most interesting that week.

This file records **decisions**, not ideas.

Ideas that have not been approved belong in `BACKLOG.md`.

Detailed product purpose belongs in `PRODUCT_VISION.md`.

Approved capability boundaries belong in `PRODUCT_SCOPE.md`.

Build sequence belongs in `ROADMAP.md`.

Current implementation reality belongs in `PROJECT_STATE.md`.

Completion standards belong in `DEFINITION_OF_DONE.md`.

Competitive evidence belongs in `COMPETITORS.md`.

---

## 2. Authority and Document Hierarchy

The repository is the project's authoritative memory.

The governing hierarchy is:

1. `PRODUCT_VISION.md` — why the Product exists and its non-negotiable principles;
2. `PRODUCT_SCOPE.md` — what belongs within the approved Product boundary;
3. `DECISIONS.md` — settled choices made within that Vision and Scope;
4. `ROADMAP.md` — the approved order of work;
5. current milestone contract — the bounded objective currently being executed;
6. current task — the immediate implementation instruction.

`COMPETITORS.md` constrains competitive claims and build/buy/integrate decisions.

`DEFINITION_OF_DONE.md` constrains what may be called complete.

`PROJECT_STATE.md` records actual reality and may expose that a plan is no longer technically valid, but it does not silently change Product Vision or Scope.

A lower-level document or implementation may not override a higher-level document without an explicit documented change.

Where two repository documents appear to conflict, work stops at the conflict and the higher-authority document wins until the inconsistency is deliberately resolved.

---

## 3. Decision Statuses

Every decision record must use one of the following statuses.

### Accepted

The decision currently governs the project.

### Provisional

The decision may guide bounded investigation or implementation, but a stated evidence gate remains open.

### Evidence-Gated

The option remains within possible future scope but cannot enter the roadmap without the stated evidence and explicit approval.

### Deferred

The decision is intentionally not being made yet because required information is unavailable or the choice is not currently necessary.

### Superseded

The decision previously governed the project but has been replaced by a later accepted decision.

### Rejected

The direction was deliberately considered and is not part of the approved Product.

Only **Accepted** decisions automatically govern current work.

---

## 4. Decision Change Protocol

A material accepted decision may be changed only when the proposed change records:

* the current decision;
* the proposed replacement;
* the evidence that has changed;
* why the current decision is now harmful or invalid;
* impact on Product Vision and Scope;
* impact on current and planned work;
* implementation and migration consequences;
* the approving owner;
* the effective date.

A coding agent, AI assistant or contributor may recommend that a decision be reconsidered.

It may not silently implement the alternative.

**New evidence can change a decision. New enthusiasm cannot.**

---

# Part I — Accepted Product Decisions

## D-001 — Product Category and Core Job

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The Product is an ecommerce organic-growth intelligence and autonomous-execution platform.

Its core job is to help an ecommerce business determine:

* which organic-growth work deserves attention;
* which work does not;
* why;
* how to implement the worthwhile work correctly;
* and, when requested, to prepare and execute supported interventions autonomously.

The Product is not primarily an article writer, keyword tool, analytics dashboard, generic AI assistant or broad ecommerce operating system.

### Rationale

The market already contains strong point solutions for SEO data, content generation, ecommerce analytics and generic AI access. The clearest surviving customer job is turning fragmented business and organic-search evidence into useful decisions and a complete route to action.

### Consequences

Every substantial feature must support at least one of these jobs:

* improve free decision intelligence;
* improve complete free DIY implementation;
* enable a valuable and safe paid autonomous intervention;
* provide required trust, safety or infrastructure.

### Reopen Only If

Real customer testing shows that the decision-and-execution job is not valued or cannot be delivered reliably.

---

## D-002 — Initial Target Customer

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The initial target customer is a growing ecommerce business that:

* has real trading history;
* has enough product, site and search data for useful analysis;
* wants to invest time or money in organic growth;
* lacks strong in-house ecommerce SEO expertise;
* and needs clearer guidance about where that effort should be spent.

The Product is not initially designed for every website, every startup, every local business or every ecommerce store regardless of data maturity.

### Rationale

Very small or inactive stores may lack enough evidence to support useful decisions. Large organisations may already have internal teams and enterprise tooling. The initial customer must have both a meaningful problem and enough data for the Product to solve it.

### Consequences

Onboarding, validation and marketing should qualify the business rather than pretending every connected store will receive equally strong recommendations.

### Reopen Only If

Testing demonstrates a materially better or more reachable initial segment.

---

## D-003 — Free Intelligence, Paid Autonomous Execution

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The Product's permanent commercial boundary is:

> **Intelligence is free. Autonomous execution is paid.**

The free Product provides the strategic recommendation, reasoning, evidence, prioritisation and complete DIY route.

The paid Product removes implementation labour through software.

### Rationale

This creates a clear customer-aligned model and differentiates the Product by where it chooses to monetise, not by claiming that free access itself is novel.

### Consequences

Paid access may not be required to discover the answer, understand the answer or implement it independently.

Execution-specific research and production work may be paid where they are part of autonomously creating the final intervention rather than hiding the strategic answer.

### Reopen Only If

The model proves economically impossible after real cost and customer-behaviour testing, and any replacement preserves the trust doctrine rather than reverting to artificial withholding.

---

## D-004 — Advice-Complete Free Product

**Status:** Accepted
**Date:** 2026-08-22

### Decision

If the system knows the answer, the free user receives the answer.

For an actionable recommendation, Free should provide enough for a motivated user to understand and correctly implement the work themselves, including:

* what was found;
* why it matters;
* why it is prioritised;
* supporting evidence;
* uncertainty;
* what should be done;
* complete ordered DIY guidance;
* QA and verification guidance;
* monitoring guidance.

### Rationale

The Product is intended to earn trust by being genuinely useful rather than by manufacturing frustration.

### Consequences

The free Product must not deliberately:

* hide recommendations;
* blur evidence;
* omit crucial DIY steps;
* use intentionally worse reasoning;
* lock explanations;
* trap the user inside the platform.

### Reopen Only If

A specific free capability creates a genuine safety, legal, abuse or unsustainable variable-cost problem. Any restriction must be justified by that problem rather than conversion pressure.

---

## D-005 — Free Recommendation Portability

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Free users may copy, export or otherwise retain their recommendation, evidence summary, DIY plan, QA checklist and monitoring guidance.

They may implement the recommendation themselves or use another employee, freelancer, agency, AI assistant or software product.

### Rationale

The Product's value cannot depend on trapping the answer inside its interface.

### Consequences

Portability must be supported at a practical level. V1 does not require elaborate branded report generation; structured copy/export is sufficient if the information remains usable.

### Reopen Only If

A particular output contains third-party licensed material that cannot legally be exported in its original form. The customer's recommendation and actionable guidance must still remain portable.

---

## D-006 — Paid Execution Is Software, Not an Agency

**Status:** Accepted
**Date:** 2026-08-22

### Decision

“Do it for me” means:

> button → autonomous preparation → QA → preview → customer amendments → approval → deployment → verification → monitoring.

It does not mean the founder or a hidden team manually performs routine customer work.

### Rationale

The goal is a scalable software business, not another employment obligation or SEO agency.

### Consequences

Temporary human review is acceptable during development and validation.

Repeated manual intervention is treated as unfinished product capability or an unsupported intervention—not as the permanent delivery model.

### Reopen Only If

The owner explicitly chooses a separate managed-service business in the future. That would be a different commercial offering and must not silently redefine the Product.

---

## D-007 — Recommendation and Execution Revenue Must Be Separated

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The intelligence layer recommends what appears best for the customer.

It must not select work based on:

* our execution price;
* our execution margin;
* whether an executor exists;
* whether the recommendation is more likely to convert to payment.

### Rationale

The trust model collapses if recommendations are designed to manufacture paid labour.

### Consequences

A recommendation may have no “Do it for me” button.

A simple ten-minute DIY fix must outrank a more profitable paid intervention when the simple fix is genuinely the better action.

### Reopen Only If

Never for normal commercial optimisation. This is a core trust principle and would require a Product Vision change.

---

## D-008 — Competitive Objective

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The Product does not need feature parity with paid SEO platforms.

Its primary competitive objective is:

> **Become the most useful free way for an ecommerce business to understand what organic-growth work deserves attention, why, and how to implement it properly.**

### Rationale

Trying to outbuild mature paid platforms across every feature would destroy scope and is unnecessary for the intended market position.

### Consequences

Free alternatives—including a competent composite stack—are the launch benchmark.

Paid products are quality ceilings, sources of learning and potential infrastructure providers, not the full feature target.

### Reopen Only If

Testing shows that outperforming the free alternatives is insufficient to create adoption or trust.

---

## D-009 — Paid and Human Competitors Are Benchmarks, Not Shopping Lists

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Paid competitors and strong ecommerce SEO specialists should be studied to understand:

* what good decisions look like;
* what customers value;
* what output quality is achievable;
* which capabilities are commodity;
* which safeguards are required.

Their feature lists do not automatically become our scope.

### Rationale

The project previously missed important competitors and then risked reacting by copying everything they offered.

### Consequences

A competitor capability only enters Scope or Roadmap when it solves an approved customer problem and passes the formal scope-change process.

### Reopen Only If

Never as a general principle.

---

## D-010 — Platform Strategy: Platform-Independent Product, WooCommerce First

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The Product is platform-independent in purpose and internal decision logic.

WooCommerce is the first supported ecommerce platform.

### Rationale

WooCommerce provides:

* a constrained first integration;
* an available real-world test environment;
* an initial market where no single native AI layer currently dominates the full intended journey;
* meaningful opportunity to learn before broader platform expansion.

### Consequences

Platform-specific connectors and executors should translate into generic internal business, opportunity and recommendation models.

Shopify and other platforms do not enter development until evidence and roadmap approval justify them.

### Reopen Only If

The repository audit exposes prohibitive WooCommerce constraints, or market validation shows another platform provides a substantially stronger initial route.

---

## D-011 — Initial Validation Environment

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Street Kingz is the first real-world validation environment.

It is not the Product, brand, customer definition or source of hidden product rules.

### Rationale

It provides real products, commercial data, search performance, website constraints and outcomes without requiring synthetic assumptions.

### Consequences

No decision logic may depend on undocumented founder knowledge or Street Kingz-specific terminology.

Critical capabilities must later be validated against independent ecommerce businesses before broad claims or release.

### Reopen Only If

A better initial validation environment becomes available. Street Kingz must still remain a test environment rather than product identity.

---

## D-012 — Build the Decision Layer; Integrate Commodity Layers

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Proprietary development should focus on:

* joining store and organic evidence;
* candidate filtering;
* commercial and search interpretation;
* relative prioritisation;
* dependency sequencing;
* intervention selection;
* evidence and confidence;
* complete free DIY guidance;
* safe executor orchestration;
* customer-specific outcome learning.

Commodity capabilities should normally be bought, integrated or implemented using mature libraries.

### Rationale

The Product cannot afford to recreate Ahrefs, Semrush, Google, ecommerce platforms, authentication providers, AI models or general-purpose infrastructure.

### Consequences

Do not build proprietary replacements for:

* search indexes;
* keyword-volume databases;
* backlink indexes;
* generic rank trackers;
* generic ecommerce analytics;
* frontier models;
* OAuth or payment primitives;
* general text/JSON diff algorithms;
* schema standards validators where mature options suffice.

### Reopen Only If

A commodity dependency becomes unavailable, economically hostile, legally unusable or materially incapable of supporting an approved Product requirement.

---

## D-013 — Facts, User Input and Inference Must Remain Distinct

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The Product distinguishes:

* observed facts;
* user-provided facts;
* derived metrics;
* model interpretation;
* assumptions.

Important inferred information must be correctable by the user.

### Rationale

Commercial and SEO data are incomplete and noisy. Treating inference as fact would create confident but unreliable decisions.

### Consequences

Recommendation explanations and audit records must preserve the distinction.

### Reopen Only If

Never as a general principle.

---

## D-014 — Missing Data Reduces Confidence; It Does Not Become Zero

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Unavailable margin, conversion, stock, traffic or other evidence must not be interpreted as zero value.

Missing data should:

* reduce confidence;
* change the available decision method;
* be disclosed;
* prevent a decision where the missing evidence is essential.

### Rationale

Treating missing data as zero would systematically distort prioritisation.

### Consequences

The system must be capable of useful progressive evidence without pretending every business has perfect data.

### Reopen Only If

Never as a general principle.

---

## D-015 — Evidence, Provenance and Confidence Are Product Requirements

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Material recommendations must retain sufficient evidence, provenance, freshness and confidence information to be inspected, challenged and reproduced.

### Rationale

The Product's central promise is a decision. A plausible answer without inspectable support is not sufficient.

### Consequences

The system must allow:

* “insufficient evidence”;
* low-confidence recommendations;
* withdrawal or supersession when evidence changes;
* explanation of what could make the decision wrong.

### Reopen Only If

Never as a general principle.

---

## D-016 — No False Precision or Unearned Outcome Claims

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The Product must not invent precise ROI, revenue or opportunity values that the evidence cannot support.

Observed post-change movement must not automatically be presented as caused by the intervention.

### Rationale

False precision may look persuasive but would damage trust and misrepresent uncertainty.

### Consequences

Initial prioritisation may use explainable categories, ranges, evidence strength and relative priority rather than fabricated pound-value forecasts.

All marketing claims must comply with `COMPETITORS.md`.

### Reopen Only If

Better validated modelling and outcome evidence justify a specific stronger claim under the claims policy.

---

## D-017 — The System May Recommend No Action

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The Product may conclude:

* do not prioritise this;
* defer;
* monitor;
* no meaningful current recommendation;
* insufficient evidence.

### Rationale

A system that must constantly manufacture work is not trustworthy.

### Consequences

Opportunity feeds, alerts and monetisation cannot depend on always producing a new task.

### Reopen Only If

Never as a general principle.

---

## D-018 — V1 Requires One Proven Executor, Not an Executor Catalogue

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The first coherent end-to-end Product requires one supported paid executor.

It does not require every potential executor family listed in `PRODUCT_SCOPE.md`.

### Rationale

Each executor is a substantial product involving research, production, QA, preview, amendments, permissions, deployment, recovery and monitoring.

### Consequences

Additional executors only enter the roadmap when actual recommendation frequency, customer value and safe feasibility justify them.

The exact first executor remains deferred until the repository audit and roadmap decision.

### Reopen Only If

The first end-to-end validation demonstrably requires two tightly coupled executors to prove the Product model.

---

## D-019 — Executor Entry Criteria

**Status:** Accepted
**Date:** 2026-08-22

### Decision

A paid executor may enter the roadmap only when:

* the intelligence system repeatedly identifies the intervention as worthwhile;
* customer value is evidenced;
* the intervention can be bounded;
* a complete corresponding free DIY path exists;
* preparation and QA can be automated reliably;
* the customer can meaningfully review it;
* deployment can be limited to approved changes;
* a tested recovery path exists;
* the outcome can be monitored appropriately.

### Rationale

Executor development must be pulled by real customer decisions rather than guessed in advance.

### Consequences

Listing an executor family in long-term Scope does not approve it for implementation.

### Reopen Only If

Evidence shows an additional criterion is unnecessary or a new safety requirement is needed.

---

## D-020 — Approval-First Execution

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Significant customer-facing, structural or technical changes require explicit customer review and approval before deployment.

The Product must preserve:

* the proposed change set;
* relevant reasoning;
* QA results;
* the approved version;
* who approved it;
* when it was approved.

### Rationale

Autonomous preparation without customer control creates unacceptable trust and liability risk.

### Consequences

Per-intervention autopilot or automatic approval is not currently authorised.

### Reopen Only If

Low-risk automatic deployment is separately evidenced, scoped and approved as a future decision.

---

## D-021 — Every Write Executor Requires Recovery

**Status:** Accepted
**Date:** 2026-08-22

### Decision

A write executor must not be released unless incorrect or failed changes can be reasonably recovered.

Recovery may be:

* safe automatic rollback;
* a verified pre-change snapshot;
* another tested restoration process.

### Rationale

Live ecommerce websites are revenue-generating systems. “Rollback where convenient” is not a sufficient safety standard.

### Consequences

An intervention that cannot be recovered remains recommendation-only until a safe implementation method exists.

### Reopen Only If

Never as a general safety principle.

---

## D-022 — Read-Only First and Least Privilege

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Free intelligence should use read-only access wherever practical.

Write access should be requested only:

* after the customer chooses a supported paid execution;
* for the narrowest required resources;
* for only as long as reasonably necessary.

### Rationale

This reduces security, trust, support and accidental-change risk.

### Consequences

The Product must not demand broad permanent administrator access merely because it may eventually execute work.

### Reopen Only If

A supported platform technically prevents the required bounded access and the risk is explicitly accepted.

---

## D-023 — Data Minimisation

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The Product should collect, retain and expose only the information reasonably required for approved organic-growth functions.

Customer-identifiable data should not be ingested where aggregate order, product or behavioural information is sufficient.

Sensitive information should not enter model prompts unless required for the approved operation.

### Rationale

The Product will process commercially sensitive data and provider credentials. Minimisation is a core security and support control.

### Consequences

New data fields and integrations require a clear decision use, retention basis and permission requirement.

### Reopen Only If

A validated Product capability genuinely requires more granular data and the privacy/security implications are explicitly approved.

---

## D-024 — Monitoring Is Targeted, Not a Generic Rank-Tracking Product

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The Product monitors signals tied to:

* current high-priority opportunities;
* completed interventions;
* commercially important pages;
* material risks already identified.

It does not attempt universal all-keyword rank tracking or constant broad SERP polling.

### Rationale

The Product needs outcome evidence, not another generic rank-tracking business or noisy alert system.

### Consequences

Reassessment should be periodic or event-driven where evidence warrants it, not a mechanism for manufacturing a daily task feed.

### Reopen Only If

A broader monitoring capability demonstrates direct decision value and remains within approved Scope.

---

## D-025 — Customer-Specific Learning First; Cross-Customer Learning Is Evidence-Gated

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The Product may use a customer's own:

* decisions;
* amendments;
* implementations;
* QA failures;
* rollbacks;
* observed outcomes;

to improve that customer's future experience where appropriate.

Cross-customer aggregated learning is future and evidence-gated.

### Rationale

Cross-customer learning creates additional privacy, governance and technical complexity and may not produce the assumed moat.

### Consequences

The business must be viable without proprietary cross-customer data.

### Reopen Only If

Lawful basis, consent, security, governance and measurable customer benefit are established.

---

## D-026 — BYOK and Provider Choice Are Infrastructure Options, Not Product Identity

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Bring-your-own-provider, customer-funded model access and provider portability may be used to make the free Product sustainable.

They are not the Product's customer value, brand promise or moat.

### Rationale

Free BYOK and MCP-based WordPress products already exist. Generic AI access is becoming commodity infrastructure.

### Consequences

The Product must earn value through decision quality, ecommerce context, DIY completeness and safe execution.

The exact V1 funding/provider model remains deferred.

### Reopen Only If

Never as a differentiation claim. The implementation choice may change without changing this decision.

---

## D-027 — Scope Horizons Are Not the Roadmap

**Status:** Accepted
**Date:** 2026-08-22

### Decision

`PRODUCT_SCOPE.md` classifies capabilities as:

* V1 Required;
* Post-V1;
* Future / Evidence-Gated.

These horizons do not define detailed build order or guarantee implementation.

### Rationale

The Product needs a complete destination without allowing every long-term capability to become immediate work.

### Consequences

Only `ROADMAP.md` authorises sequence. Future/Evidence-Gated items require evidence and explicit approval before roadmap entry.

### Reopen Only If

The governance structure itself proves confusing in practice.

---

## D-028 — Product Naming Is Deferred

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The final product and brand name will be selected only after:

* Vision is locked;
* Scope is locked;
* key Decisions are recorded;
* Definition of Done is established;
* the repository audit establishes actual state;
* the initial Roadmap is approved.

Until then, repository governance documents refer to **the Product**.

### Rationale

Naming before the Product was defined risked branding an abandoned or incomplete idea.

### Consequences

No product promise, domain, social account or repository rename should force premature brand positioning.

### Reopen Only If

A temporary internal identifier becomes operationally necessary. It must not be treated as the final brand.

---

## D-029 — Public Content Is Complete Education, Not a Crippled Funnel

**Status:** Accepted
**Date:** 2026-08-22

### Decision

When public content chooses to teach a task, it should teach it sufficiently for a motivated user to complete it correctly.

Content exists primarily to build awareness, usefulness and trust.

### Rationale

The same trust model should govern both the Product and its distribution.

### Consequences

Public content should not deliberately stop before the useful part solely to force a sale.

The relationship is:

* Content: teach how it works;
* Free Product: show where it applies to this business;
* Paid Product: perform the work.

### Reopen Only If

Specific content formats require bounded treatment; the anti-withholding principle remains.

---

## D-030 — Street Kingz and the Product Are Distinct Identities

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Street Kingz remains the ecommerce business and initial proof environment.

The Product will have its own identity when branding begins.

Street Kingz is not the Product and must not define the Product's customer-facing name, rules or positioning.

### Rationale

This preserves a generic Product while allowing Street Kingz to provide credible real-world proof.

### Consequences

Street Kingz may appear in Product content as a transparent test case.

The exact social-account and audience-transition strategy remains deferred under O-011.

### Reopen Only If

Never as a product-identity principle.

---

## D-031 — Free Is a Strategic Boundary, Not the Moat by Itself

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Free access is a core distribution and trust strategy, but free access alone is not considered a durable moat or proof of customer value.

### Rationale

The market already contains meaningful free tools, plugins, audits, BYOK systems and composite workflows.

### Consequences

The Product must still earn adoption through:

* better decision usefulness;
* ecommerce relevance;
* complete DIY guidance;
* clarity;
* trustworthy evidence;
* safe paid convenience.

The project must not use “free” to excuse weak output.

### Reopen Only If

Never as a general competitive principle.

---

## D-032 — Commercial Context Is a Quality Hypothesis, Not a Novelty Claim

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Commercial ecommerce context should be used where reliable to improve organic-growth decisions.

The project does not claim that combining commercial and SEO evidence is new, proprietary or automatically better.

### Rationale

Human specialists and ecommerce intelligence products already use commercial signals. The unresolved question is whether our implementation materially improves decisions compared with strong SEO analysis alone.

### Consequences

The Product must prove through controlled testing that commercial context changes recommendations appropriately and usefully before making stronger claims.

### Reopen Only If

Testing shows commercial evidence does not materially improve the target decision job. Scope and positioning must then be reviewed.

---

## D-033 — Initial Domain Is Organic Search

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The approved initial domain is organic search and the website changes required to improve relevant unpaid search discoverability.

“Organic discovery” is the long-term conceptual boundary, not permission to build for every unpaid channel now.

### Rationale

Organic search has usable evidence, existing project foundations and a testable customer job.

### Consequences

AI shopping, answer engines, social discovery, marketplaces and other unpaid surfaces remain evidence-gated under O-014.

### Reopen Only If

Market or platform changes materially undermine organic search as the correct initial domain.

---

## D-034 — Initial Account Scope Is One Business, Not Agency Infrastructure

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The initial Product supports one user/account connecting one supported ecommerce business.

It does not initially include:

* agency workspaces;
* multi-client management;
* complex team roles;
* enterprise permission systems;
* unlimited sites.

### Rationale

These capabilities create substantial account, permissions, billing and support complexity without being required to prove the core Product.

### Consequences

Multi-user, multi-site and agency capabilities remain Future / Evidence-Gated.

### Reopen Only If

Customer evidence demonstrates that a specific collaboration capability is necessary for the initial target customer.

---

# Part II — Accepted Project-Governance Decisions

## G-001 — No Product Code Continues Until Rebaseline Governance Is Complete

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Substantial product implementation remains paused until the following exist and are approved:

* `PRODUCT_VISION.md`;
* `PRODUCT_SCOPE.md`;
* `COMPETITORS.md`;
* `DECISIONS.md`;
* `DEFINITION_OF_DONE.md`.

Cody then performs the repository audit.

`PROJECT_STATE.md` and `ROADMAP.md` are produced from the approved scope and verified repository reality.

### Rationale

Continuing code against the superseded vision would optimise the wrong product and deepen drift.

### Consequences

No new feature is justified merely because it was the next task under the old roadmap.

### Reopen Only If

A critical security or data-loss issue requires immediate bounded remediation.

---

## G-002 — The Repository Is the Long-Term Memory

**Status:** Accepted
**Date:** 2026-08-22

### Decision

No critical Product knowledge may exist only in ChatGPT history, Cody output or another conversation.

Material decisions, state changes, competitor findings and roadmap changes must be written back to the repository.

### Rationale

Conversations become slow, incomplete, unavailable or contaminated by superseded context.

### Consequences

A fresh contributor or AI should be able to understand the Product and current work from the repository documents alone.

### Reopen Only If

Never as a general operating principle.

---

## G-003 — Human Owner, ChatGPT Guide, Cody Engine

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The operating roles are:

* **Ben:** Product owner and final approver of Vision, Scope, Decisions and Roadmap changes;
* **ChatGPT:** product/research/governance guide that reviews evidence, challenges proposals and checks work against repository authority;
* **Cody:** engineering engine that audits and implements approved bounded work in the repository.

Cody does not independently set Product strategy.

ChatGPT does not invent implementation work outside the approved hierarchy.

### Rationale

Clear role boundaries reduce both strategic drift and uncontrolled implementation.

### Consequences

Technical recommendations from Cody inform decisions but do not become Product priorities automatically.

### Reopen Only If

The development workflow materially changes.

---

## G-004 — Every Milestone Requires a Contract Before Implementation

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Before a milestone begins, it must define:

* objective;
* customer-facing capability enabled;
* rationale;
* dependencies;
* deliverables;
* acceptance criteria;
* validation method;
* competitor benchmark where relevant;
* explicit non-goals;
* completion condition.

### Rationale

A bounded milestone prevents “while we are here” expansion and makes completion objectively reviewable.

### Consequences

Cody may not expand beyond the contract. Discoveries outside it are reported and sent to Backlog or scope review.

### Reopen Only If

The contract template is simplified without removing objective boundaries.

---

## G-005 — New Ideas Go to Backlog, Not the Current Milestone

**Status:** Accepted
**Date:** 2026-08-22

### Decision

A new idea is not a new priority.

Ideas discovered during planning, research or implementation normally enter `BACKLOG.md`.

### Rationale

AI-assisted implementation makes it dangerously easy to build attractive but non-essential work quickly.

### Consequences

A Backlog item is not approved, scheduled, promised or part of the Roadmap.

### Reopen Only If

New evidence proves the current milestone is invalid or unsafe. That triggers formal decision review, not silent scope expansion.

---

## G-006 — Repository Audit Classification

**Status:** Accepted
**Date:** 2026-08-22

### Decision

After governance documents are complete, Cody must assess existing modules and workflows against the new Product using:

* **COMPLETE** — satisfies an approved capability and its current quality bar;
* **KEEP** — directly reusable foundation;
* **MODIFY** — useful but requires bounded adaptation;
* **REPURPOSE** — built for the old vision but valuable elsewhere;
* **FREEZE** — complete enough and should not be expanded now;
* **DEPRECATE** — no longer belongs;
* **MISSING** — required but absent.

### Rationale

The project must rebaseline from actual repository evidence rather than memory or assumptions.

### Consequences

The audit records dependencies, proof, technical debt and migration risk but does not independently create the Roadmap.

### Reopen Only If

The audit reveals that additional classifications are necessary.

---

## G-007 — Project State Before Roadmap

**Status:** Accepted
**Date:** 2026-08-22

### Decision

`PROJECT_STATE.md` is written or comprehensively updated after Cody's repository audit.

`ROADMAP.md` is then created from:

* locked Vision;
* locked Scope;
* accepted Decisions;
* Definition of Done;
* competitor constraints;
* verified Project State.

### Rationale

A roadmap built before knowing actual repository reality would be speculative.

### Consequences

The current old roadmap does not govern future work unless reapproved into the new Roadmap.

### Reopen Only If

Never as a general sequencing principle.

---

## G-008 — Existing Code Does Not Dictate Product Strategy

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Work already performed is an input to sequencing, not a reason to retain the old Product direction.

Near-complete work should normally be finished where doing so creates an approved reusable capability at reasonable marginal cost—but only after the audit confirms that conclusion.

### Rationale

The project should avoid both sunk-cost attachment and wasteful abandonment of useful foundations.

### Consequences

The current article workflow is neither automatically discarded nor automatically the next milestone.

### Reopen Only If

The audit shows that finishing an existing module is clearly higher-risk or lower-value than previously assumed.

---

## G-009 — Competitor Research Is Continuous Governance

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Before a major capability enters the Roadmap, the relevant customer job must be checked against the current competitor register and refreshed where necessary.

Competitive changes trigger assessment, not automatic implementation.

### Rationale

The project was previously blindsided by materially relevant products because research was too narrow.

### Consequences

`COMPETITORS.md` remains a living evidence register with dated sources, threats, trials and implications.

### Reopen Only If

Never as a general principle.

---

## G-010 — Free Competitor Gauntlet Is a Launch Gate

**Status:** Accepted
**Date:** 2026-08-22

### Decision

The free Product does not launch merely because it functions.

It must be tested fairly against credible individual free alternatives and a competent composite free workflow using the governed gauntlet in `COMPETITORS.md`.

### Rationale

The central competitive objective is usefulness relative to free alternatives.

### Consequences

“Best free” cannot be claimed before repeatable wins across multiple stores.

### Reopen Only If

The gauntlet methodology is improved. The requirement for comparative proof remains.

---

## G-011 — Independent Validation Is Required Beyond the First Test Store

**Status:** Accepted
**Date:** 2026-08-22

### Decision

Critical recommendation and executor capabilities must be tested on independent ecommerce businesses after initial proof in the first test environment.

### Rationale

A system that succeeds only where the founder already understands the business has not proven generalisation.

### Consequences

Broad product claims and public release depend on independent validation criteria defined later in Roadmap and DoD.

### Reopen Only If

Never as a general principle.

---

## G-012 — Focused Chats and Dedicated Project Context

**Status:** Accepted
**Date:** 2026-08-22

### Decision

After the repository handover is complete, project work should use a dedicated project-only ChatGPT environment and fresh focused conversations by milestone or major planning phase.

The repository remains authoritative even inside the dedicated environment.

### Rationale

A dedicated context reduces contamination from unrelated account history, while short milestone conversations reduce slowdown and accumulated obsolete assumptions.

### Consequences

Historical conversations are not migrated wholesale. Their accepted conclusions must already exist in the repository.

### Reopen Only If

The platform provides a more reliable equivalent isolation method.

---

# Part III — Superseded and Rejected Directions

## X-001 — AI SEO Writer as the Product

**Status:** Superseded
**Date superseded:** 2026-08-22

### Former Direction

The primary Product would discover or receive a keyword and generate an SEO article.

### Replacement

Article creation is a possible paid executor inside the broader decision-and-execution Product.

### Reason

AI article research, writing, internal linking and publishing are already mature and increasingly commodity capabilities.

---

## X-002 — Autonomous SEO Suite as the Primary Vision

**Status:** Superseded
**Date superseded:** 2026-08-22

### Former Direction

Build an autonomous platform covering broad SEO strategy and execution as the main differentiator.

### Replacement

Build complete free ecommerce organic-growth decision intelligence and bounded paid autonomous interventions.

### Reason

Search Atlas, AYSA, Inxy, Essiow, SEO.AI and others already occupy substantial parts of broad autonomous SEO.

---

## X-003 — Broad AI Ecommerce Growth Operator

**Status:** Rejected
**Date:** 2026-08-22

### Direction Rejected

A cross-functional AI operator covering SEO, CRO, inventory, merchandising, retention, paid media and broader commercial decisions.

### Reason

It would place one founder against Shopify Sidekick, Polar, Triple Whale and other well-funded platforms while creating an unmanageable integration and support burden.

Relevant commercial data may inform organic decisions without bringing those domains into Product Scope.

---

## X-004 — General Product Opportunity Engine

**Status:** Superseded
**Date superseded:** 2026-08-22

### Former Direction

Tell ecommerce owners which products to grow, fix, bundle, promote, clear or ignore across all growth channels.

### Replacement

Use product and commercial context specifically to improve in-scope organic-growth decisions.

### Reason

Product intelligence and assortment optimisation already exist, and the broad model would drift into analytics, merchandising and inventory software.

---

## X-005 — Feature Parity With Paid SEO Platforms

**Status:** Rejected
**Date:** 2026-08-22

### Direction Rejected

Copy every valuable feature offered by Koala, Search Atlas, Semrush, Ahrefs, SEO.AI or other paid platforms.

### Reason

Feature-count competition is unwinnable, unnecessary and incompatible with focused solo development.

---

## X-006 — Crippled Free Tier

**Status:** Rejected
**Date:** 2026-08-22

### Direction Rejected

Use locked opportunities, blurred evidence, incomplete instructions, inferior reasoning or arbitrary limits to force upgrades.

### Reason

This contradicts the Product's trust model and commercial boundary.

---

## X-007 — Manual SEO Agency or Hidden Service

**Status:** Rejected
**Date:** 2026-08-22

### Direction Rejected

Monetise by manually implementing recommendations for customers behind a software interface.

### Reason

This would create a labour business and another job rather than the intended scalable software Product.

---

## X-008 — Literal At-Cost Usage Billing as the Core Product Model

**Status:** Superseded
**Date superseded:** 2026-08-22

### Former Direction

The Product would charge customers the exact underlying API/infrastructure cost through credits or metered usage while earning no margin from the core Product.

### Replacement

Free intelligence remains the principle. Customer-funded providers or other sustainable infrastructure models may be used. The exact V1 funding model is deferred.

### Reason

Penny-perfect pass-through billing creates payment, accounting, support and sustainability complexity and is not required to preserve free intelligence.

---

## X-009 — Data Collection as the Primary Reason to Offer Free Access

**Status:** Rejected
**Date:** 2026-08-22

### Direction Rejected

Give the Product away primarily to harvest customer data for a future proprietary moat.

### Reason

Free users may not produce clean intervention/outcome data, and the business must deliver value and remain viable without assuming a future data moat.

Trust and user value come first.

---

## X-010 — Generic BYOK or MCP WordPress Agent as the Product

**Status:** Rejected
**Date:** 2026-08-22

### Direction Rejected

Expose WordPress actions to a customer-funded AI model and treat that connection as the primary Product.

### Reason

ThinkRank and similar tools demonstrate that generic model access and WordPress actions are commodity-bound.

---

## X-011 — Large Multi-Agent Platform

**Status:** Rejected
**Date:** 2026-08-22

### Direction Rejected

Build dozens of loosely connected specialist agents because competitors market broad agent ecosystems.

### Reason

This would maximise feature count and orchestration complexity without proving the core customer job.

---

## X-012 — Build Every Executor Before Testing Demand

**Status:** Rejected
**Date:** 2026-08-22

### Direction Rejected

Build articles, categories, product pages, internal links, technical fixes, schema, consolidation and other executors according to a speculative master list.

### Reason

Executor order should be determined by actual recommendations, customer demand and safe feasibility.

---

# Part IV — Deferred and Open Decisions

The following questions are intentionally unresolved.

They must not be inferred from old code, conversation history or competitor behaviour.

## O-001 — Final Product and Brand Name

**Status:** Deferred

Decision occurs after governance, repository audit and initial Roadmap approval.

---

## O-002 — Repository and Internal Project Rename

**Status:** Deferred

A temporary generic internal identifier may be adopted if necessary, but no rename should imply final branding before O-001 is resolved.

---

## O-003 — First Paid Executor

**Status:** Deferred

The current Create SEO Article workflow is the leading candidate because substantial work already exists.

It is not confirmed until the repository audit establishes:

* actual completion state;
* remaining cost;
* alignment with the new execution contract;
* required refactoring;
* whether finishing it is the best first milestone.

---

## O-004 — V1 AI Provider and Funding Model

**Status:** Deferred

Possible approaches include:

* customer-funded BYOK;
* Product-funded usage;
* a hybrid model;
* another sustainable provider arrangement.

The decision must consider onboarding, security, support, cost and quality.

---

## O-005 — External Search/SERP Data Provider

**Status:** Deferred

The Product will buy or integrate licensed external data rather than build a search index.

The specific provider is not yet selected.

---

## O-006 — Paid Execution Pricing Model

**Status:** Deferred

Possible structures include per-intervention pricing, usage-based pricing or later recurring automation.

No subscription, price point or packaging is currently approved.

Pricing must not alter the free intelligence doctrine or influence recommendation selection.

---

## O-007 — GA4 as a V1 Requirement

**Status:** Deferred

Analytics intelligence is within Product Scope, but its V1 necessity depends on whether it materially improves the first decision job relative to its connector, tracking-quality and support burden.

---

## O-008 — Technical Architecture and Deployment Stack

**Status:** Deferred

The existing repository and Cody audit must be assessed before approving architecture changes.

Product Scope requirements do not prescribe a framework, database, hosting provider or service decomposition.

---

## O-009 — Independent Validation Stores

**Status:** Deferred

The number, selection criteria and access method for independent test businesses will be defined in the Roadmap and relevant milestone contracts.

---

## O-010 — Launch Timing and Public Availability

**Status:** Deferred

Launch requires the governed free-competitor gauntlet, independent validation and relevant Definition of Done gates.

No public date is currently approved.

---

## O-011 — New Product Content Channels and Publishing Cadence

**Status:** Deferred

The Product will use a separate founder-led educational identity, but account name, channel mix and cadence are decided after branding and Product definition are complete.

---

## O-012 — Future Autopilot

**Status:** Evidence-Gated

Automatic deployment without per-intervention approval is not part of current approved Scope.

It may only be reconsidered for narrowly defined low-risk actions after substantial execution, recovery and trust evidence.

---

## O-013 — Additional Ecommerce Platforms

**Status:** Evidence-Gated

Shopify and other platforms require explicit customer evidence, connector feasibility and Roadmap approval.

Technical possibility alone is insufficient.

---

## O-014 — Additional Organic Discovery Surfaces

**Status:** Evidence-Gated

AI-assisted shopping, answer engines and other unpaid discovery surfaces remain possible future scope.

Each requires a defined customer job, reliable evidence and a supported action path before approval.

---

## O-015 — Cross-Customer Aggregated Learning

**Status:** Evidence-Gated

This remains prohibited from implementation until privacy, consent, security, governance and measurable value requirements are satisfied.

---

# Part V — Decision Index

| ID    | Decision                                                         | Status   |
| ----- | ---------------------------------------------------------------- | -------- |
| D-001 | Product category and core job                                    | Accepted |
| D-002 | Initial target customer                                          | Accepted |
| D-003 | Free intelligence, paid autonomous execution                     | Accepted |
| D-004 | Advice-complete free Product                                     | Accepted |
| D-005 | Free recommendation portability                                  | Accepted |
| D-006 | Paid execution is software, not an agency                        | Accepted |
| D-007 | Recommendation and execution revenue separated                   | Accepted |
| D-008 | Compete primarily against free alternatives on usefulness        | Accepted |
| D-009 | Paid/human competitors are benchmarks, not shopping lists        | Accepted |
| D-010 | Platform-independent purpose; WooCommerce first                  | Accepted |
| D-011 | Street Kingz is initial validation environment only              | Accepted |
| D-012 | Build decision layer; integrate commodity layers                 | Accepted |
| D-013 | Facts, user input and inference remain distinct                  | Accepted |
| D-014 | Missing data reduces confidence, not value to zero               | Accepted |
| D-015 | Evidence, provenance and confidence required                     | Accepted |
| D-016 | No false precision or unearned claims                            | Accepted |
| D-017 | The system may recommend no action                               | Accepted |
| D-018 | V1 requires one proven executor                                  | Accepted |
| D-019 | Executor entry criteria                                          | Accepted |
| D-020 | Approval-first execution                                         | Accepted |
| D-021 | Every write executor requires recovery                           | Accepted |
| D-022 | Read-only first and least privilege                              | Accepted |
| D-023 | Data minimisation                                                | Accepted |
| D-024 | Targeted monitoring, not generic rank tracking                   | Accepted |
| D-025 | Customer-specific learning first                                 | Accepted |
| D-026 | BYOK/provider choice is infrastructure, not identity             | Accepted |
| D-027 | Scope horizons are not the Roadmap                               | Accepted |
| D-028 | Product naming deferred                                          | Accepted |
| D-029 | Complete public education, not crippled content                  | Accepted |
| D-030 | Street Kingz and Product are distinct identities                 | Accepted |
| D-031 | Free is a strategic boundary, not the moat by itself             | Accepted |
| D-032 | Commercial context is a quality hypothesis, not novelty          | Accepted |
| D-033 | Initial domain is organic search                                 | Accepted |
| D-034 | Initial account scope is one business, not agency infrastructure | Accepted |
| G-001 | Pause Product code until governance and audit                    | Accepted |
| G-002 | Repository is long-term memory                                   | Accepted |
| G-003 | Owner/guide/engine role separation                               | Accepted |
| G-004 | Milestone contract required                                      | Accepted |
| G-005 | New ideas go to Backlog                                          | Accepted |
| G-006 | Governed repository audit classification                         | Accepted |
| G-007 | Project State before Roadmap                                     | Accepted |
| G-008 | Existing code does not dictate strategy                          | Accepted |
| G-009 | Continuous competitor governance                                 | Accepted |
| G-010 | Free competitor gauntlet is a launch gate                        | Accepted |
| G-011 | Independent validation required                                  | Accepted |
| G-012 | Dedicated project context and focused chats                      | Accepted |

---

## Final Authority Rule

If a proposed task conflicts with an Accepted decision in this file:

1. do not implement the conflicting task;
2. identify the decision conflict;
3. present the new evidence, if any;
4. use the Decision Change Protocol;
5. update the repository before code changes.

**Settled decisions remain settled until evidence earns a change.**
