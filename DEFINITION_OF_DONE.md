# Definition of Done

**Status:** Authoritative completion standard
**Last updated:** 2026-08-23
**Product name:** Not yet selected; referred to as **the Product**
**Decision owner:** Ben
**Applies to:** All project tasks, modules, milestones, connectors, intelligence capabilities, customer-facing features, executors, releases and governance artefacts

---

## 1. Purpose of This Document

This document defines what the project is allowed to call **done**.

It exists to prevent:

* partially working code being treated as a completed capability;
* a successful happy-path demo being mistaken for product readiness;
* model output that looks plausible being accepted without evidence;
* work being declared complete while security, failure handling, recovery or documentation remain unfinished;
* synthetic tests being used as a substitute for real-world validation;
* quality gates being relaxed after results are known;
* unresolved defects being hidden in future work;
* Cody, ChatGPT or a contributor expanding scope while attempting to “finish” a task;
* the project moving on while near-complete work remains permanently unfinished;
* the word **done** becoming subjective.

This document does not decide what should be built.

It decides the minimum evidence required before approved work can be treated as complete.

---

## 2. Authority and Relationship to Other Documents

The governing hierarchy is:

1. `PRODUCT_VISION.md` — why the Product exists and its non-negotiable principles;
2. `PRODUCT_SCOPE.md` — what belongs inside the approved Product boundary;
3. `DECISIONS.md` — accepted choices within that Vision and Scope;
4. `ROADMAP.md` — the approved order of work;
5. current milestone contract — the bounded result currently being pursued;
6. current task — the immediate implementation instruction.

`DEFINITION_OF_DONE.md` applies across that hierarchy and determines whether work has met its approved completion standard.

`PROJECT_STATE.md` records what is actually complete, partial, blocked, frozen, deprecated or missing.

`COMPETITORS.md` constrains relevant quality benchmarks and competitive claims.

`BACKLOG.md` records ideas and deferred work that are not required for current completion unless explicitly included in the milestone contract.

If this document conflicts with `PRODUCT_VISION.md`, `PRODUCT_SCOPE.md` or an Accepted decision in `DECISIONS.md`, the higher-authority document wins and the conflict must be corrected before work continues.

---

## 3. Core Rule

> **Done is an evidence-backed state, not an opinion.**

A task is not done because:

* code exists;
* the main example worked once;
* Cody says it is complete;
* ChatGPT likes the output;
* the interface looks finished;
* tests were added but not run;
* the model produced one impressive result;
* the founder can manually work around the failure;
* the remaining work appears small;
* a competitor offers something similar;
* the next task is more interesting.

Work is done only when every applicable gate in this document and the approved milestone contract has passed, the evidence is preserved, and the result has been accepted through the project’s sign-off process.

---

## 4. What “Done” Does and Does Not Mean

### Done means

* the approved objective has been delivered;
* applicable acceptance criteria pass;
* required tests and evaluations pass;
* important failure modes have been exercised;
* evidence exists and can be inspected;
* scope has not expanded silently;
* known limitations are explicit;
* no blocking defects remain;
* relevant documentation reflects reality;
* the capability can be relied upon for its approved purpose.

### Done does not mean

* perfect;
* permanently finished;
* incapable of later improvement;
* suitable for every customer or platform;
* feature-complete against paid competitors;
* publicly launchable unless release gates also pass;
* commercially validated unless commercial validation gates also pass;
* safe for autonomous deployment unless executor and deployment gates also pass.

A capability may be **done for its approved bounded scope** while later improvements remain in `BACKLOG.md` or future roadmap phases.

---

## 5. Completion States

Every meaningful task, module and milestone must use one of the following states.

### Not Started

Approved work exists but implementation has not begun.

### In Progress

Work has begun and one or more completion gates remain open.

### Blocked

Progress cannot continue because of a documented dependency, defect, decision conflict, missing access or external limitation.

`Blocked` is not a completion level. It can apply alongside `In Progress`.

### Code Complete

The intended implementation exists, but full verification, validation, evidence, documentation or sign-off is incomplete.

**Code Complete is not Done.**

### Verified

The implementation passes its approved automated and manual checks in the controlled test environment.

Verification proves that the implementation behaves as specified under tested conditions.

**Verified is not necessarily Validated or Done.**

### Validated

The capability has produced acceptable results under the real-world validation conditions defined in its milestone contract.

Validation proves usefulness or reliability in representative conditions, not merely technical correctness.

### Done

All applicable universal, capability-specific, milestone-specific, documentation and sign-off gates have passed.

### Frozen

The capability is Done and deliberately protected from further expansion during the current roadmap phase.

Only defects, security issues, approved dependencies or explicit roadmap work may reopen it.

### Deprecated

The capability remains in the repository temporarily but is no longer part of the active Product direction.

Its replacement, migration or removal status must be documented.

### Removed

The capability and its supported migration path have been removed from the active system and repository where appropriate.

---

## 6. Roles and Sign-Off

### Ben — Product Owner and Final Approver

Ben:

* approves Product Vision, Scope, Decisions and Roadmap changes;
* accepts or rejects material product outcomes;
* decides whether a documented non-blocking limitation is acceptable;
* gives final milestone approval unless explicitly delegated;
* decides whether evidence justifies reopening accepted scope or decisions.

### ChatGPT — Product, Research and Governance Review

ChatGPT:

* compares reported work against repository authority and the milestone contract;
* challenges unsupported completion claims;
* checks for scope drift, missing evidence and unearned claims;
* returns a clear `PASS`, `FAIL` or `BLOCKED` assessment;
* does not invent extra work outside the approved milestone merely because it would be useful.

### Cody — Engineering and Evidence Producer

Cody:

* implements the approved bounded task;
* runs applicable tests and evaluations;
* provides the completion evidence package;
* reports defects, limitations, dependencies and out-of-scope discoveries honestly;
* updates approved repository documents when instructed;
* does not self-authorise Product scope expansion;
* does not treat its own completion statement as final approval.

### External Testers or Specialists

Where a milestone requires independent-store, usability, security or human-specialist validation, the relevant participant supplies evidence but does not silently alter Product requirements.

### Required Sign-Off Pattern

Unless a milestone contract explicitly states otherwise:

1. Cody reports completion and supplies evidence.
2. ChatGPT assesses the evidence against this document and the milestone contract.
3. Ben approves, rejects or requests only the failed gates to be corrected.
4. The accepted state is written to `PROJECT_STATE.md`.
5. The capability is frozen where the roadmap requires it.

---

# Part I — Universal Completion Gates

## 7. Gate 1 — Scope and Authority Alignment

Work cannot be Done unless:

* it serves an approved customer problem or required infrastructure or safety need;
* it is inside `PRODUCT_SCOPE.md` or has an approved scope-change record;
* it does not contradict an Accepted decision in `DECISIONS.md`;
* it belongs to the current milestone or is necessary to satisfy that milestone;
* out-of-scope discoveries were reported rather than silently implemented;
* competitor findings did not become features without approval;
* no abandoned Product direction has returned through implementation;
* any material new decision is recorded in `DECISIONS.md` before completion.

A technically excellent out-of-scope feature fails this gate.

---

## 8. Gate 2 — Milestone Contract

No milestone begins or completes without a written contract defining:

* objective;
* customer-facing or internal capability enabled;
* rationale;
* dependencies;
* deliverables;
* acceptance criteria;
* validation method;
* relevant benchmark;
* explicit non-goals;
* evidence required;
* completion condition.

Acceptance criteria must be set before results are known.

Criteria must not be weakened, reinterpreted or removed merely because the implementation failed them.

If legitimate evidence shows a criterion was wrong, the contract must be deliberately revised with the reason recorded before rerunning the evaluation.

---

## 9. Gate 3 — Implementation Completeness

Work cannot be Done unless:

* every approved deliverable exists;
* all required code paths are implemented;
* incomplete branches, placeholders, fake data, temporary bypasses and TODOs affecting the approved behaviour have been removed or explicitly accepted as limitations;
* no manual founder action is silently required for the normal supported workflow;
* unsupported cases fail safely and clearly rather than pretending to work;
* the implementation does not depend on undocumented local state;
* required configuration is documented and reproducible;
* relevant migrations or state changes are included;
* obsolete superseded paths are removed, isolated or clearly deprecated.

A capability is not complete if the founder must remember an undocumented sequence to make it work.

---

## 10. Gate 4 — Automated Verification

All applicable automated checks must pass.

Depending on the capability, these may include:

* unit tests;
* integration tests;
* contract or schema tests;
* end-to-end tests;
* regression tests;
* migration tests;
* permission tests;
* security checks;
* static analysis;
* linting;
* type checking;
* build checks;
* provider-adapter tests;
* deterministic validation;
* cost-limit tests;
* rollback or restoration tests.

A universal line-coverage percentage is not required.

Tests must cover the important behaviours and risks, not merely inflate coverage.

Skipped, quarantined or flaky tests must be disclosed. A required test that is skipped does not pass.

---

## 11. Gate 5 — Negative, Boundary and Failure Testing

The happy path is insufficient.

Applicable failure cases must be tested, including:

* missing data;
* stale data;
* contradictory evidence;
* malformed provider responses;
* provider timeout or outage;
* rate limits;
* unauthorised or expired credentials;
* partial API success;
* retry behaviour;
* duplicate requests;
* empty candidate sets;
* no worthwhile recommendation;
* unsupported platform configuration;
* low-confidence evidence;
* customer changes made between preview and deployment;
* partial deployment failure;
* restoration failure;
* user rejection or amendment;
* unsafe or prohibited content;
* unexpected model output;
* cost limit exceeded.

The milestone contract should identify which boundary cases are material.

---

## 12. Gate 6 — Evidence and Reproducibility

Completion must be supported by preserved evidence.

Where applicable, the evidence must include:

* test inputs;
* configuration;
* model and provider identifiers;
* prompt or instruction version;
* provider-response snapshots where lawful and practical;
* retrieved evidence and freshness;
* deterministic transformations;
* outputs;
* quality scores;
* test results;
* manual review notes;
* benchmark results;
* affected commit SHA;
* date and environment.

Evidence should be frozen before it is used as a permanent proof artefact.

A proof artefact must not be silently rewritten to match a new implementation.

If expected outputs legitimately change, the reason, reviewer and replacement evidence must be recorded.

---

## 13. Gate 7 — Real-World Validation

Where the capability makes a judgement, customer recommendation or live-site change, controlled tests alone are insufficient.

The milestone contract must define real-world validation appropriate to the capability.

Initial validation may use Street Kingz as the first test environment.

The capability must not rely on:

* Street Kingz-specific product names hard-coded into logic;
* undocumented founder knowledge;
* manual correction that a normal customer would not receive;
* a hand-selected example chosen only because it performs well.

Critical capabilities require independent-store validation before broad release or general claims.

The required number and selection criteria for validation stores must be agreed in the Roadmap or milestone contract before testing begins.

---

## 14. Gate 8 — Customer Usefulness and UX

A customer-facing capability cannot be Done merely because the backend works.

Where applicable, it must provide:

* a clear purpose;
* plain-English output;
* visible evidence and uncertainty;
* useful empty, loading, error and unsupported states;
* actionable next steps;
* no unnecessary SEO jargon;
* no artificial free-tier restriction;
* no dark pattern designed to force paid execution;
* no raw internal IDs, model terminology or token counts as the primary experience;
* a usable flow on the supported device and browser range defined in the milestone contract;
* basic accessibility appropriate to the interface;
* self-service guidance for common connection or input failures.

A customer should not need developer tools or founder explanation to understand the supported workflow.

---

## 15. Gate 9 — Free and Paid Boundary Integrity

Any capability touching Free or Paid behaviour must prove that:

* the strategic answer is not hidden behind payment;
* the evidence summary is not deliberately degraded for free users;
* the DIY route is complete enough for a motivated user to implement correctly;
* the recommendation can be retained or used elsewhere;
* paid access removes production or implementation labour rather than unlocking superior hidden intelligence;
* the decision engine is not biased toward interventions that generate execution revenue;
* a recommendation without a supported executor remains fully useful for DIY;
* paid execution-specific research does not silently become a paid-only strategic tier.

Any implementation that weakens Free to improve conversion fails this gate.

---

## 16. Gate 10 — Security, Privacy and Permissions

Applicable security and privacy requirements must be complete before Done.

These include:

* no secrets committed to the repository;
* no credentials exposed in client-side code;
* no secrets or sensitive data written to logs unnecessarily;
* encrypted credential storage using approved managed infrastructure;
* read-only access where write access is unnecessary;
* least-privilege permissions;
* clear consent and connection state;
* revocation and disconnection support;
* data minimisation;
* defined retention behaviour;
* safe deletion where applicable;
* no unnecessary customer-identifiable data;
* no sensitive commercial data sent to a model unless required for the approved operation;
* tenant isolation where multiple customers exist;
* applicable threat and misuse cases tested.

A security limitation that could expose customer data, credentials or live-site control is a blocking defect.

---

## 17. Gate 11 — Failure Visibility and Recovery

A capability must fail visibly and safely.

The user or operator must be able to determine:

* what failed;
* what completed;
* what did not complete;
* whether anything changed;
* whether retrying is safe;
* whether customer action is required;
* whether recovery was attempted;
* whether the system remains in a consistent state.

Partial success must not be presented as complete success.

For write capabilities, a tested recovery path is mandatory.

---

## 18. Gate 12 — Performance and Variable-Cost Control

Where applicable, the capability must have:

* an agreed performance expectation;
* bounded loops and retries;
* no uncontrolled provider calls;
* no duplicate expensive research without justification;
* an estimated variable-cost range where measurable;
* actual cost telemetry where available;
* a safe limit or abort behaviour;
* acceptable latency for the customer job;
* no significant quality degradation introduced only to make cost numbers look attractive.

A capability that can produce an unbounded bill or infinite or repeated work is not Done.

---

## 19. Gate 13 — Auditability and Observability

Important actions must be reconstructable.

Where relevant, the system must record:

* the evidence available;
* the rules, model or provider used;
* the recommendation produced;
* the customer choice;
* the proposed change;
* the approved version;
* the deployment result;
* recovery actions;
* the subsequent monitored outcome.

Operational failures must be diagnosable without exposing sensitive customer data.

Logging, traces or structured events should be proportionate to the capability rather than added indiscriminately.

---

## 20. Gate 14 — Documentation and Repository State

Work is not Done until the repository reflects reality.

Applicable updates include:

* `PROJECT_STATE.md` — actual status, evidence, blockers and next approved action;
* `ROADMAP.md` — milestone status only after acceptance;
* `DECISIONS.md` — any material decision created or changed;
* `COMPETITORS.md` — any material competitor finding affecting the capability or claim;
* `BACKLOG.md` — out-of-scope discoveries worth retaining;
* technical documentation — setup, contracts, runbooks or architecture required to maintain the capability;
* user-facing documentation — where the supported customer flow requires it;
* proof artefacts and test fixtures;
* relevant changelog or release notes.

Documentation must describe the implementation that actually exists, not the intended future state.

---

## 21. Gate 15 — Defect Standard

No capability or milestone may be Done with:

* an unresolved Critical defect;
* an unresolved High defect;
* a known violation of Product Vision, Scope or an Accepted decision;
* a known failure of a required acceptance criterion;
* a known data-loss, security, privacy or unrecoverable-write risk;
* a manual hidden dependency required for normal operation.

Medium and Low defects are governed by Section 23.

---

# Part II — Defects, Limitations and Evidence

## 22. Defect Severity

### Critical

A defect that can cause or plausibly enable:

* customer data exposure;
* credential exposure;
* unauthorised access or write action;
* changes to the wrong customer, site, page or resource;
* unrecoverable data or content loss;
* live-site corruption;
* false reporting that a failed deployment succeeded;
* uncontrolled material cost;
* a severe legal or privacy breach;
* systemic recommendations based on corrupted or misattributed evidence.

Critical defects stop work and block every release or Done decision affected by them.

### High

A defect that:

* prevents the core customer outcome;
* produces materially unreliable recommendations;
* fails an approved acceptance criterion;
* makes a supported workflow unusable;
* lacks required recovery or verification;
* causes repeated execution failure;
* exposes a serious trust problem;
* requires undocumented founder intervention for normal operation.

High defects block Done.

### Medium

A defect that:

* degrades a non-core supported behaviour;
* has a safe and documented workaround;
* does not invalidate the central result;
* does not create a security, privacy, data-loss or false-success risk.

A Medium defect may remain only when:

* it is documented;
* impact and workaround are clear;
* Ben explicitly accepts it;
* a backlog or scheduled remediation item exists;
* it does not violate the milestone’s explicit acceptance criteria.

### Low

A minor cosmetic, wording or convenience defect that does not materially impair the approved capability.

Low defects may move to Backlog if documented.

---

## 23. Known Limitations and Accepted Debt

A limitation is not automatically a defect.

A supported capability may intentionally have a bounded limitation such as:

* one supported platform;
* one supported page-builder configuration;
* one supported executor;
* no automated write access for an unsupported plugin;
* lower confidence when commercial data is missing.

A limitation is acceptable only when:

* it is deliberate rather than accidental;
* it is documented before acceptance;
* the customer is not misled;
* unsupported cases fail safely;
* it does not contradict the approved milestone contract;
* it does not create hidden manual service work.

Technical debt may remain only when it does not undermine current reliability, safety or maintainability and is explicitly documented.

“Temporary” is not a valid status without an owner, reason and future trigger.

---

## 24. Evidence Package Required for Completion

Cody’s completion report must include, where applicable:

1. **Milestone or task identifier**
2. **Objective**
3. **Approved scope and non-goals**
4. **Files changed**
5. **Commit SHA or exact repository state**
6. **Implementation summary**
7. **Automated checks executed**
8. **Exact commands and results**
9. **Manual checks performed**
10. **Negative and failure cases exercised**
11. **Proof artefacts and their locations**
12. **Benchmark or evaluation results**
13. **Real-world validation evidence**
14. **Security and permission review**
15. **Cost and performance evidence where relevant**
16. **Known limitations**
17. **Open defects by severity**
18. **Out-of-scope discoveries**
19. **Documentation updated**
20. **Recommended classification: Verified, Validated, Done or Blocked**

Assertions without evidence are not completion evidence.

---

## 25. Test and Evaluation Integrity

The project must not game its own tests.

The following are prohibited:

* selecting only examples known to work;
* changing the expected result solely to make a failure disappear;
* excluding difficult cases without documenting why;
* changing evaluation criteria after seeing the result without recording the change;
* presenting one successful stochastic run as reliable performance;
* hiding failed runs;
* using founder knowledge inside the test input when normal users would not provide it;
* comparing our full connected system against an intentionally weak competitor setup;
* treating vendor marketing claims as verified capability quality.

Test sets, scoring rubrics and required sample sizes should be fixed before formal evaluation begins.

---

## 26. AI and Model-Based Output Standard

A model-based capability cannot be Done through unit tests alone.

Its completion contract must separate:

### Hard Requirements

Deterministic or objectively checkable requirements such as:

* valid schema;
* required fields present;
* no prohibited output;
* evidence references valid;
* URLs resolve where required;
* limits respected;
* approved facts preserved;
* unsupported claims absent;
* platform constraints satisfied.

### Quality Requirements

Rubric-based evaluation such as:

* relevance;
* decision usefulness;
* intent fit;
* factual grounding;
* completeness;
* clarity;
* commercial appropriateness;
* quality relative to benchmark.

### Reliability Requirements

Where model variability matters:

* repeat runs must be evaluated;
* unacceptable failure frequency must be defined in advance;
* model, provider and version must be recorded;
* fallbacks and failure behaviour must be tested;
* a single strong output cannot conceal unreliable average behaviour.

The milestone contract defines the relevant rubric and threshold.

---

## 27. External Provider and Integration Standard

A provider-backed capability cannot be Done unless:

* provider terms permit the intended use;
* authentication is implemented safely;
* provider failure is handled;
* rate limits are understood;
* retries are bounded;
* response contracts are validated;
* data freshness is recorded where relevant;
* cost behaviour is understood;
* customer-facing errors do not expose internal secrets;
* substitution risk is documented where material;
* the Product does not claim ownership of commodity provider data or capability.

An adapter working once against a mocked response is not sufficient.

---

# Part III — Completion by Work Type

## 28. Definition of Done for an Individual Task

An individual task is Done when:

* it belongs to the current milestone;
* its exact deliverable is complete;
* relevant automated checks pass;
* no blocking defect was introduced;
* the result is reviewed against the task instruction;
* evidence is included in the task report;
* discoveries outside scope are reported rather than implemented;
* the task does not leave the repository in a broken or misleading state.

Task completion does not automatically mean the parent module or milestone is Done.

---

## 29. Definition of Done for a Module or Capability

A module or capability is Done when:

* every required constituent task is complete;
* its external and internal contracts are documented;
* supported and unsupported behaviour is clear;
* applicable universal gates pass;
* regression coverage protects the approved behaviour;
* integration with dependent modules is verified;
* real-world validation passes where required;
* evidence is preserved;
* no Critical or High defects remain;
* `PROJECT_STATE.md` reflects its true state;
* it is frozen if the roadmap says to stop expanding it.

A module may not be classified Complete merely because its code exists in the repository.

---

## 30. Definition of Done for a Milestone

A milestone is Done when:

* its approved contract exists;
* every deliverable is complete;
* every acceptance criterion passes;
* all applicable universal gates pass;
* all blocking defects are closed;
* required real-world validation is complete;
* relevant benchmark evidence is complete;
* out-of-scope discoveries are recorded in Backlog or a formal change proposal;
* no unauthorised work was bundled into the milestone;
* the completion evidence package is accepted;
* `PROJECT_STATE.md` is updated;
* `ROADMAP.md` is updated only after approval;
* the next approved action is explicit;
* Ben accepts the milestone.

A milestone cannot be “mostly done.”

It is either Done, Blocked or In Progress.

---

## 31. Definition of Done for a Governance Document

A governance document is Done when:

* its purpose and authority are explicit;
* it does not duplicate or contradict higher-authority documents;
* terminology is consistent with the current Product;
* superseded directions are removed or clearly recorded as superseded;
* ambiguous wording that could authorise scope drift is corrected;
* current evidence supports its claims;
* relevant cross-references are correct;
* the repository version is clean Markdown;
* Ben approves it;
* the document status and last-updated date are current.

Governance documents are not frozen forever, but changes require the process defined in their governing rules.

---

## 32. Definition of Done for the Repository Audit

The repository audit is Done when Cody has inspected the relevant repository, tests, workflows, artefacts and documentation against the current Vision, Scope, Decisions, Competitors and Definition of Done.

The audit must:

* identify all material existing capabilities and workflows;
* map each to approved Product Scope where applicable;
* classify each as `COMPLETE`, `KEEP`, `MODIFY`, `REPURPOSE`, `FREEZE`, `DEPRECATE` or `MISSING`;
* cite concrete files, functions, tests and proof artefacts supporting each classification;
* distinguish implemented behaviour from intended behaviour;
* identify current test status;
* identify dependencies and architectural constraints;
* identify material technical debt;
* identify security, privacy, provider and deployment risks;
* identify work that belongs to the superseded Product direction;
* assess the current article workflow without assuming it must be the first executor;
* identify what can be bought or integrated rather than rebuilt;
* avoid changing Product code unless separately authorised;
* produce an evidence-backed audit report suitable for creating `PROJECT_STATE.md`.

The audit is not Done if it merely repeats filenames, old documentation or repository claims without inspecting the implementation.

---

## 33. Definition of Done for `PROJECT_STATE.md`

`PROJECT_STATE.md` is Done for the rebaseline when it records:

* current repository commit or state;
* current Product phase;
* current milestone status;
* verified existing capabilities;
* partial capabilities;
* frozen capabilities;
* deprecated or superseded work;
* missing V1 capabilities;
* open Critical, High and accepted Medium defects;
* relevant proof artefacts;
* current dependencies and blockers;
* unresolved open decisions affecting sequence;
* actual technical debt that matters to the approved Product;
* the next approved planning action.

Every status must be supported by the repository audit.

`PROJECT_STATE.md` must not describe planned work as implemented reality.

---

## 34. Definition of Done for `ROADMAP.md`

`ROADMAP.md` is Done for its initial approval when:

* it is derived from locked Vision, Scope, Decisions, DoD, Competitors and verified Project State;
* milestones are ordered by dependency and customer value;
* near-complete existing work is finished only where the audit proves that is the best approved use of effort;
* V1 requires one executor, not a speculative executor catalogue;
* every milestone has an objective and completion outcome;
* every milestone maps to approved Scope;
* explicit non-goals prevent drift;
* evidence and validation gates are included;
* future and evidence-gated capabilities are not scheduled without approval;
* capacity assumptions are realistic for one founder using AI assistance;
* no dates or promises are invented without an evidence basis;
* the current milestone and next milestone are unambiguous;
* Ben approves the sequence.

The Roadmap is not Done if it is simply a feature list.

---

## 35. Definition of Done for `BACKLOG.md`

`BACKLOG.md` is fit for use when:

* each item has a concise description;
* the customer problem or reason for retaining it is recorded;
* its source is recorded where useful;
* it is clearly marked unapproved;
* duplicate items are consolidated;
* rejected directions are not reintroduced as neutral ideas without context;
* evidence-gated items state the evidence required;
* no backlog item appears in active work without roadmap approval.

Backlog completeness is not a launch gate. Its purpose is containment, not exhaustive idea collection.

---

# Part IV — Data and Intelligence Capability Gates

## 36. Definition of Done for a Data Connector

A connector is Done for its approved scope when:

* supported account and data boundaries are explicit;
* authentication uses an approved secure method;
* minimum permissions are requested;
* read and write access are separated where practical;
* required entities and fields are ingested correctly;
* pagination, date ranges, rate limits and retries are handled;
* data freshness is visible;
* duplicate ingestion is prevented or handled safely;
* disconnection and revocation work;
* missing permissions and expired credentials produce actionable errors;
* sensitive data is minimised;
* provider failure does not corrupt stored state;
* a representative real account has been validated;
* tests cover contract changes and malformed responses;
* setup and recovery are self-service for the supported flow.

A connector is not Done because an API request returned `200` once.

---

## 37. Definition of Done for Commerce Data Ingestion and the Business Model

The commerce-data layer is Done for its approved scope when:

* supported products, variants, categories, prices, stock, orders and approved commercial fields map correctly into generic internal models;
* platform-specific identifiers remain traceable;
* observed facts, user-provided facts and inferences remain distinct;
* missing values remain missing rather than silently becoming zero;
* refunds, cancellations, taxes, discounts and order states are treated according to documented rules where relevant;
* derived commercial metrics have documented formulas;
* time windows are explicit;
* product or category mappings are tested;
* unsupported data conditions reduce confidence or fail clearly;
* no unnecessary customer-identifiable data is required;
* representative real-store reconciliation has been performed;
* totals or samples can be traced back to source records;
* no generic analytics warehouse has been created beyond Product needs.

---

## 38. Definition of Done for Search Console Intelligence

Search Console intelligence is Done for its approved scope when:

* query and page data are ingested for the approved property and period;
* clicks, impressions, CTR and position are handled according to documented semantics;
* known API limits and aggregation constraints are documented;
* query-page relationships can be inspected;
* data freshness and date range are visible;
* missing or sparse data affects confidence correctly;
* branded, navigational or irrelevant query handling is bounded and testable;
* time-series comparisons use valid comparable periods;
* representative data reconciles sufficiently with the source interface, allowing for documented API differences;
* no claim of exact rank or exhaustive query coverage is made where Search Console cannot support it.

---

## 39. Definition of Done for Site Understanding

The site-understanding capability is Done for its approved scope when:

* supported URLs are discovered through approved sources;
* page types are classified with an agreed error tolerance;
* products, categories, articles and other supported pages map correctly;
* headings, content, metadata, canonicals, indexability and internal links are extracted where in scope;
* rendered or builder-specific limitations are explicit;
* redirects and duplicate URLs are handled according to documented rules;
* malformed pages do not break the crawl or corrupt the model;
* rate limits and crawl politeness are respected;
* evidence can be traced to the page version and retrieval time;
* unsupported environments fail clearly rather than producing false completeness;
* the capability does not become a generic crawler product.

---

## 40. Definition of Done for External Search and SERP Evidence

The external-search layer is Done for its approved scope when:

* data is sourced through an approved licensed provider or allowed source;
* market, language, device and location assumptions are explicit;
* search-demand evidence is not treated as exact truth;
* keyword overlap and intent clustering prevent naive volume summation;
* SERP evidence includes retrieval time and relevant parameters;
* result types and dominant intent are represented;
* provider failures, missing results and volatility are handled;
* data cost is bounded;
* external evidence can be inspected in the recommendation proof;
* the Product does not imply it owns or independently measures a universal keyword or backlink database.

---

## 41. Definition of Done for Opportunity Discovery

Opportunity discovery is Done for its approved scope when:

* candidate sources are explicitly defined;
* discovery finds the intended opportunity types on the approved test set;
* recall is evaluated against a predeclared benchmark or labelled set;
* duplicate and semantically equivalent candidates are identified;
* the system can produce an empty result without failure;
* candidate evidence is retained;
* candidate generation does not automatically promote work into recommendations;
* discovery does not default to article opportunities;
* unsupported opportunity types are not silently invented;
* cost and candidate-volume bounds are enforced;
* real-store outputs are inspectable and not dependent on founder hints.

---

## 42. Definition of Done for Candidate Filtering

Candidate filtering is Done when:

* irrelevant, duplicate, navigational, wrong-market, temporal and product-mismatched candidates are handled according to documented rules;
* hard filters are deterministic where possible;
* model-based interpretation is bounded and auditable;
* false-positive and false-negative behaviour is measured on an agreed labelled set;
* valuable low-volume opportunities are not automatically discarded solely due to volume;
* missing evidence does not become a false rejection without explanation;
* rejected candidates retain a reason code or explanation sufficient for debugging;
* filtering remains generic and does not encode test-store-specific product knowledge;
* regression tests protect previously fixed failure classes.

---

## 43. Definition of Done for Intent and SERP Interpretation

Intent and SERP interpretation is Done when:

* the intended search job is explained in usable terms;
* dominant result and page types are identified;
* mixed or uncertain intent is represented rather than forced into false certainty;
* the system can distinguish when a product, category, comparison page, guide, article, existing-page improvement or no action is appropriate;
* interpretation is grounded in preserved SERP evidence;
* outputs are evaluated against a labelled or expert-reviewed set;
* important errors are measured by their downstream decision impact, not only classification accuracy;
* the system does not assume every keyword deserves new content.

---

## 44. Definition of Done for Commercial Relevance and Prioritisation

Commercially informed prioritisation is Done for its approved scope when:

* commercial factors used are explicitly defined;
* unavailable factors reduce confidence rather than becoming zero;
* the system distinguishes direct commercial value from strategic supporting value;
* supply constraints are treated as constraints rather than simplistic stock multipliers;
* conversion evidence is not transferred blindly between incompatible traffic sources;
* ranking feasibility and incremental upside are considered rather than raw demand alone;
* dependencies and sequencing can override the locally highest score when justified;
* the prioritisation remains explainable;
* the system can recommend no action;
* results are compared against a strong SEO-only control where the commercial-context hypothesis is being tested;
* evaluation is blinded where practical;
* the commercially informed result must demonstrate material decision usefulness under the predeclared rubric before the advantage is claimed;
* no precise revenue forecast is produced without validated support.

---

## 45. Definition of Done for the Recommendation Engine

A recommendation capability is Done when each supported recommendation can state:

* what was found;
* why it matters;
* why now, where relevant;
* why it ranks above alternatives;
* supporting evidence;
* confidence and missing evidence;
* what should be done;
* intended outcome;
* dependencies;
* important assumptions;
* what could make the recommendation wrong;
* when to reassess.

It must also:

* preserve evidence and provenance;
* separate facts from inference;
* use plain English;
* allow defer, ignore, monitor and no-action states;
* avoid recommending work merely because an executor exists;
* avoid hidden execution-revenue bias;
* pass relevant human and free-alternative usefulness evaluation;
* remain portable outside the Product.

A plausible paragraph generated by a model is not a completed recommendation system.

---

# Part V — Free Customer Product Gates

## 46. Definition of Done for the Opportunity Feed

The Opportunity Feed is Done for its approved scope when:

* it presents only qualified recommendations rather than raw issues;
* priority order is stable enough to be meaningful and changes are explainable;
* no-recommendation and insufficient-evidence states are supported;
* each item shows enough context to decide whether to inspect it;
* stale, superseded, completed, deferred and ignored states are handled;
* repeated rediscovery does not erase prior customer decisions;
* raw metric volume does not overwhelm the decision;
* the feed does not manufacture a constant task list for engagement;
* free recommendations are not visually crippled to promote execution;
* the flow is usable by the approved target customer without specialist explanation.

---

## 47. Definition of Done for Opportunity Detail and Evidence Explorer

The detail experience is Done when:

* the recommendation questions defined in Product Scope are answered;
* the default view is understandable to a non-specialist;
* deeper evidence is available without forcing every user into raw data;
* sources, dates and confidence are visible where relevant;
* assumptions and limitations are explicit;
* evidence does not imply greater precision or coverage than the source provides;
* the user can challenge or correct important inferred business information;
* unsupported technical jargon has contextual explanation;
* the experience does not duplicate a general SEO analytics dashboard.

---

## 48. Definition of Done for a Free DIY Plan

A DIY plan is Done when a motivated user can reasonably complete the supported intervention without paying the Product or needing hidden founder knowledge.

The plan must include, where applicable:

* objective;
* prerequisites;
* required access;
* required skills;
* expected difficulty;
* approximate effort expressed as an estimate, not a factual guarantee;
* ordered implementation steps;
* page or content requirements;
* platform-specific instructions for the supported environment;
* warnings and risks;
* QA checklist;
* verification process;
* monitoring plan;
* what not to change;
* when to stop or seek specialist help.

The plan need not generate every final production asset for free when generating the asset is itself the paid implementation labour.

It must still explain how the user can create that asset themselves or with a tool of their choice.

The DIY plan fails if important steps are omitted solely to improve paid conversion.

---

## 49. Definition of Done for Recommendation Portability

Recommendation portability is Done when the free user can retain and practically use:

* the recommendation;
* reasoning;
* evidence summary;
* DIY steps;
* QA checklist;
* verification and monitoring guidance.

The initial implementation may use structured copy or export rather than elaborate report design.

Portability must not expose licensed raw data in a way that violates provider terms.

The user’s actionable conclusion and guidance must remain portable even when raw third-party evidence cannot be redistributed.

---

# Part VI — Paid Autonomous Execution Gates

## 50. Definition of Done for a Paid Execution Offer

An execution offer is Done when the customer can understand before chargeable work begins:

* which recommendation is being automated;
* what the Product will prepare;
* what it will not change;
* expected outputs;
* required access and permissions;
* important limitations;
* price or charging basis;
* possible third-party provider costs;
* review and approval process;
* recovery process;
* what happens if execution fails.

The customer must explicitly confirm the action.

A recommendation without a validated executor must not display a misleading execution option.

---

## 51. Definition of Done for a Paid Executor

A paid executor is Done only when all of the following pass:

### Strategic Integrity

* it starts from an approved recommendation;
* it does not replace the recommendation with a hidden paid strategy;
* any execution research that changes the recommendation is disclosed before approval.

### Bounded Scope

* supported intervention type is explicit;
* affected resources are explicit;
* unrelated changes are excluded;
* unsupported environments are rejected safely.

### Production

* the proposed intervention is generated without routine hidden manual labour;
* required evidence, business constraints and brand constraints are used;
* output is complete for the supported intervention.

### QA

* deterministic checks pass;
* model-based quality review passes the approved rubric;
* prohibited, unsupported or unsafe changes are blocked;
* material commercial and factual claims are verified.

### Review

* the customer can inspect the proposed work;
* meaningful before-and-after or diff is available;
* amendments are supported at the level defined by the milestone;
* the exact approved version is preserved.

### Deployment

* only the approved change is applied;
* permissions are least-privilege;
* partial failure is detected;
* resulting state is verified.

### Recovery

* a tested restoration path exists;
* pre-change state is preserved;
* newer customer changes are not blindly overwritten.

### Monitoring

* baseline and intended indicators are recorded;
* post-deployment verification begins;
* failure and unexpected movement are visible.

### Commercial Readiness

* actual variable cost is understood;
* support burden is bounded;
* the intervention can be delivered as software rather than an agency service.

If any required part remains manual, the executor may be classified **Validated With Human Review** but not fully Done for autonomous paid release.

---

## 52. Additional Definition of Done for a Content-Generating Executor

Any executor that creates or materially rewrites content must additionally prove:

* the chosen page type matches search intent;
* creation is justified over improving an existing page;
* the content does not create avoidable cannibalisation;
* research sources are preserved;
* factual and product claims are supported;
* brand, legal and claims constraints are respected;
* unsupported specifications are not invented;
* the output is original enough for the approved use and does not copy competitor wording;
* content structure serves the customer job rather than merely repeating keywords;
* internal links are relevant, valid and not fabricated;
* metadata and schema outputs respect platform constraints where included;
* content is useful to humans and not produced solely for search-volume coverage;
* a customer can review the complete final asset before approval;
* publication does not occur automatically without the approved deployment flow;
* post-publication URL, indexability and rendered state are verified.

This section does not approve content generation as the first executor. It defines the additional quality bar if such an executor enters the Roadmap.

---

## 53. Definition of Done for Review, Amendment and Approval

The review and approval capability is Done when:

* the customer can understand what will change;
* the current and proposed states are distinguishable;
* important changes are not hidden in a large unstructured output;
* the customer can reject the proposal;
* supported amendments do not require restarting unrelated work;
* regeneration does not silently discard approved constraints;
* versions are identifiable;
* approval records the exact version, user and time;
* post-approval edits invalidate or require renewed approval;
* no significant deployment can bypass the approved flow.

---

## 54. Definition of Done for Deployment

Deployment is Done for a supported intervention when:

* write access is requested only after the customer chooses execution;
* permissions are the narrowest practical;
* the target customer, site and resource are revalidated before writing;
* the exact approved change set is applied;
* the operation is idempotent or safely detects duplicate execution;
* partial failures are detected and reported;
* unrelated resources are untouched;
* the resulting state is fetched and verified;
* audit records are stored;
* secrets are not exposed;
* recovery can be initiated;
* representative live or production-equivalent validation has passed.

A deployment endpoint returning success without verifying the resulting state is not Done.

---

## 55. Definition of Done for Recovery and Rollback

Recovery is Done when:

* pre-change state is captured and retrievable;
* the affected resources are known;
* automatic rollback is tested where supported;
* unsafe rollback conditions are detected;
* newer customer edits are protected;
* a manual restoration path is documented where automatic rollback is unsafe;
* failed restoration is visible;
* the customer can understand the restoration outcome;
* recovery evidence is retained.

A write executor without a credible recovery path cannot be Done.

---

## 56. Definition of Done for Intervention Monitoring and Outcome Assessment

Monitoring is Done for its approved intervention type when:

* the intended outcome and relevant signals are defined before deployment;
* baseline data is captured;
* leading indicators are distinguished from behavioural and commercial outcomes;
* monitoring frequency matches the likely time-to-impact;
* the system avoids unnecessary broad rank tracking;
* data gaps and confounding events are visible;
* the system can classify success, partial success, failure, insufficient evidence or inability to assess;
* the explanation does not present correlation as proven causation;
* negative or unexpected movement triggers an appropriate review;
* the recommendation history links the decision, implementation and observed result.

---

# Part VII — Security, Provider and Operational Gates

## 57. Definition of Done for Security and Privacy Readiness

Security and privacy readiness for a milestone is Done when:

* the data flow is documented;
* data categories and sensitivity are identified;
* the minimum required data and permissions are justified;
* secrets use approved managed storage;
* logs are reviewed for sensitive leakage;
* access controls are tested;
* connection revocation is tested;
* deletion behaviour is tested where in scope;
* model prompts are reviewed for unnecessary sensitive data;
* third-party processors are documented;
* obvious abuse and cross-tenant risks are tested;
* no Critical or High security finding remains.

Formal external security review may be required by a later launch milestone. It is not implied for every internal prototype.

---

## 58. Definition of Done for Customer-Funded Provider Access

If customer-funded provider access is selected for a milestone, it is Done when:

* setup is understandable to the approved target customer;
* key creation and billing requirements are explained accurately;
* credentials are encrypted and never unnecessarily exposed;
* connection testing is clear;
* provider errors are translated into actionable language;
* usage and cost are explained in currency where possible;
* customer controls and limits are available where required;
* revocation works;
* provider-specific details do not leak throughout core Product logic;
* the flow is tested with a real non-founder user before public launch;
* support burden is measured rather than assumed.

BYOK is not Done merely because an API-key input field exists.

---

## 59. Definition of Done for Variable-Cost Control

Variable-cost control is Done for a capability when:

* each material billable provider operation is identifiable;
* expected cost range is understood;
* actual cost can be recorded where the provider exposes it;
* retries and loops are bounded;
* duplicate expensive calls are prevented where practical;
* cache or evidence reuse does not compromise freshness incorrectly;
* a usage ceiling or abort mechanism exists where necessary;
* customer-funded and Product-funded costs are distinguished;
* cost reporting does not mislabel estimates as exact costs;
* quality remains above the approved acceptance threshold.

---

# Part VIII — Validation, Benchmarks and Release Gates

## 60. Definition of Done for Test-Store Validation

A capability has completed initial test-store validation when:

* it runs against current real data from the approved test environment;
* test inputs are frozen or reproducible;
* no hidden founder knowledge is inserted into the system;
* the founder records an independent expectation before seeing the final result where practical;
* the system’s output is reviewed for correctness, usefulness and novelty;
* failures and obvious recommendations are recorded honestly;
* any implementation is performed through the supported Product path where that path is being tested;
* the result is monitored for the period defined in advance;
* the evidence is preserved;
* test-store-specific assumptions are identified and removed or documented.

Success on the initial test store is necessary but not sufficient for public generalisation.

---

## 61. Definition of Done for Independent-Store Validation

Independent-store validation is Done for a capability when:

* participant selection criteria were defined before testing;
* the required number of stores was defined in the Roadmap or milestone contract before results were known;
* stores are sufficiently different to test generalisation;
* the Product operates without undocumented founder knowledge;
* connection and onboarding burden is observed;
* recommendation usefulness is rated by the business owner and, where applicable, a specialist benchmark;
* customer action or non-action is recorded;
* important failures are included, not discarded;
* the capability meets the predeclared pass criteria;
* privacy, consent and data access are handled correctly;
* evidence and lessons are written back to the repository.

---

## 62. Definition of Done for a Human-Specialist Benchmark

A human-specialist benchmark is Done when:

* the specialist or benchmark process is appropriately qualified for ecommerce SEO;
* both system and benchmark receive comparable evidence;
* the evaluation question is fixed in advance;
* outputs are anonymised or blinded where practical;
* scoring focuses on decision usefulness, evidence, commercial fit, feasibility and actionability;
* disagreement is analysed rather than automatically treating either side as correct;
* the benchmark is used for development and evaluation, not inserted as a permanent production dependency;
* results, limitations and sample size are preserved.

The Product is not required to beat every specialist on every case.

It must demonstrate acceptable judgement for its approved customer promise.

---

## 63. Definition of Done for the Free Competitor Gauntlet

The governed free competitor gauntlet is Done when:

* participants match the current list and method in `COMPETITORS.md`;
* the competent composite free stack is included;
* each participant receives a fair version of the same customer job;
* our Product does not receive hidden information unavailable to the comparison unless the purpose is explicitly to test connected commercial context;
* scoring criteria are fixed in advance;
* multiple stores are included according to the predeclared launch gate;
* results are repeatable enough to support the conclusion;
* wins, ties and losses are all reported;
* failure cases produce Product improvements or an explicit decision;
* no “best free” claim is made unless the current claims policy is satisfied.

---

## 64. Definition of Done for V1

V1 is Done only when the first coherent end-to-end customer journey works:

1. one supported customer connects one supported ecommerce business;
2. required evidence sources connect successfully;
3. the system understands the minimum business and organic context;
4. it discovers and filters candidate opportunities;
5. it prioritises a worthwhile recommendation or honestly returns no action;
6. it explains the decision and evidence in plain English;
7. it provides a complete free DIY route;
8. the user can retain the recommendation;
9. one validated paid executor is available for a supported recommendation;
10. the customer can confirm, review, amend and approve the work;
11. only the approved work is deployed;
12. deployment is verified and recoverable;
13. the intervention is monitored;
14. the repository can reconstruct the decision and execution;
15. the free and paid boundary remains intact.

Additionally:

* all V1 Required scope items selected by the Roadmap pass their relevant DoD gates;
* no Critical or High defects remain;
* independent validation requirements defined by the Roadmap pass;
* the free competitor gauntlet passes at the level required for V1 release;
* security, privacy and cost controls pass the V1 milestone requirements;
* support burden is understood and bounded;
* Product State and documentation are current;
* Ben approves V1.

V1 is not Done because a collection of disconnected modules exists.

The end-to-end journey must work.

---

## 65. Definition of Done for a Private Alpha or Beta

A private release is Done when:

* the intended tester group is defined;
* supported environments and limitations are explicit;
* onboarding and consent are appropriate;
* data and write risks are controlled;
* feedback and incident channels exist;
* release telemetry can identify failures;
* recovery and kill-switch behaviour are available where required;
* known Medium limitations are disclosed;
* no Critical or High defects remain;
* the release has a clear stop or expansion criterion;
* participants are not misled about production maturity.

---

## 66. Definition of Done for Public Launch

Public launch is Done only when:

* V1 is Done;
* required independent-store validation passes;
* the free competitor gauntlet passes the current launch gate;
* claims comply with `COMPETITORS.md`;
* production security and privacy review requirements pass;
* supported environments are published;
* self-service onboarding and connection recovery are proven;
* payment or charging behaviour for paid execution is tested where applicable;
* operational monitoring and incident response exist;
* backups and recovery are tested;
* data deletion and connection revocation work;
* provider limits and cost exposure are controlled;
* user-facing legal, privacy and product terms required for launch exist;
* support demand is within a sustainable operating model;
* no Critical or High defects remain;
* Ben explicitly approves launch.

---

## 67. Definition of Done for a Competitive or Outcome Claim

A claim is Done—that is, earned and permitted—only when:

* its wording is precise;
* the evidence standard in `COMPETITORS.md` is satisfied;
* the supporting test was predeclared and fair;
* the sample size and limitations are disclosed internally;
* the evidence remains current enough for the claim;
* no contradictory material evidence is being hidden;
* the claim does not exceed what was measured;
* the supporting artefacts can be inspected.

Claims such as the following remain prohibited until their specific evidence gates pass:

* first or only;
* best free;
* better than a named paid competitor;
* replacement for an SEO agency;
* fully autonomous;
* guaranteed ranking, traffic or revenue improvement;
* precise hours or money saved without measurement.

---

# Part IX — Freezing, Reopening and Exceptions

## 68. Freezing Completed Work

A capability should be marked `FROZEN` when:

* it is Done for its approved scope;
* current roadmap work does not require further expansion;
* its contracts and evidence are preserved;
* regression tests protect its behaviour;
* known limitations are documented.

Frozen means:

* no shiny additions;
* no competitor-parity additions;
* no unplanned refactor;
* no interface expansion;
* no new options merely because they are easy to add.

Allowed changes are limited to:

* Critical or High defect fixes;
* security or privacy fixes;
* provider compatibility required to preserve current behaviour;
* approved dependency work;
* explicit future roadmap milestones.

---

## 69. Reopening Done or Frozen Work

Done or Frozen work may be reopened only when:

* a defect violates its accepted contract;
* a dependency change breaks it;
* security or privacy evidence requires action;
* real customer evidence invalidates an assumption;
* a Roadmap milestone explicitly extends it;
* an Accepted decision changes.

The reopening record must state:

* why it is being reopened;
* which completion gates are affected;
* whether current users or evidence are impacted;
* whether the previous Done status remains valid historically;
* what new completion condition applies.

---

## 70. Exception and Waiver Policy

Critical and High defects cannot be waived for Done.

Security, privacy, wrong-site writes, unrecoverable deployment and false-success risks cannot be waived for public release.

A non-blocking exception may be accepted only when:

* the unmet requirement is identified;
* the reason is documented;
* customer and technical impact are understood;
* a safe workaround exists;
* the exception does not contradict Product Vision or an Accepted decision;
* Ben approves it;
* a remediation trigger or explicit permanent limitation is recorded.

An exception is not permission to call unfinished core behaviour Done.

---

## 71. Stop-Work Conditions

Work must pause and be escalated when:

* the task conflicts with Product Vision or Scope;
* an Accepted decision would be violated;
* Cody discovers that the milestone contract is technically impossible as written;
* a Critical security, privacy, data-loss or wrong-site-write risk appears;
* required evidence is unavailable or corrupted;
* the implementation requires routine hidden manual service;
* the work is expanding materially beyond the milestone;
* a competitor finding materially invalidates the approved customer job;
* provider terms prohibit the intended use;
* variable cost becomes unbounded;
* a test must be weakened merely to obtain a pass.

The correct response is to report the problem and seek a decision—not to improvise around governance.

---

# Part X — Completion Checklists and Templates

## 72. Universal Done Checklist

The following checklist applies to every milestone. Items may be marked not applicable only with a reason.

### Authority

* [ ] Work is inside approved Product Scope.
* [ ] Work aligns with Accepted decisions.
* [ ] A milestone contract exists.
* [ ] No unauthorised scope was added.

### Delivery

* [ ] All approved deliverables exist.
* [ ] No hidden manual dependency remains.
* [ ] Supported and unsupported cases are explicit.
* [ ] Temporary bypasses affecting supported behaviour are removed.

### Verification

* [ ] Applicable automated checks pass.
* [ ] Negative and failure cases pass.
* [ ] Regression tests protect the approved behaviour.
* [ ] Required provider and integration tests pass.

### Evidence

* [ ] Proof artefacts are preserved.
* [ ] Configuration, versions and commit are recorded.
* [ ] Real-world validation passes where required.
* [ ] Benchmark results are complete where required.

### Customer Quality

* [ ] Customer-facing output is understandable.
* [ ] Evidence and uncertainty are visible.
* [ ] Empty and error states are usable.
* [ ] Free and paid boundaries remain intact.

### Safety

* [ ] No Critical or High defects remain.
* [ ] Security and privacy checks pass.
* [ ] Permissions are least-privilege.
* [ ] Failure is visible and safe.
* [ ] Recovery passes where writes occur.

### Operations

* [ ] Cost and retries are bounded.
* [ ] Important actions are auditable.
* [ ] Monitoring exists where required.
* [ ] Support and recovery guidance exist.

### Repository

* [ ] `PROJECT_STATE.md` reflects reality.
* [ ] Decisions are updated where required.
* [ ] Competitor evidence is updated where required.
* [ ] Out-of-scope ideas are in Backlog.
* [ ] Relevant technical and user documentation is current.

### Approval

* [ ] Cody supplied the evidence package.
* [ ] ChatGPT returned `PASS` against the contract and DoD.
* [ ] Ben approved completion.
* [ ] The capability or milestone is marked Done or Frozen in Project State.

---

## 73. Milestone Contract Template

```md
# Milestone [ID] — [Name]

## Objective

[One sentence describing the bounded outcome.]

## Customer Capability Enabled

[What customer-facing or internal Product promise this enables.]

## Why This Exists

[Approved rationale and dependency.]

## Inputs and Dependencies

- [Dependency]

## Deliverables

- [Exact deliverable]

## Acceptance Criteria

1. [Objective pass/fail criterion]

## Validation Plan

- Controlled verification:
- Real-world validation:
- Independent validation, if required:

## Benchmark

[Free competitor, paid benchmark, human benchmark or none.]

## Evidence Required

- [Proof artefact]

## Explicit Non-Goals

- [What must not be built]

## Blocking Defects

- Critical and High defects block completion.
- [Any milestone-specific rules]

## Completion Condition

[Exact condition under which the milestone can be marked Done.]
```

---

## 74. Cody Completion Report Template

```md
# Completion Report — [Milestone or Task]

## Result

[COMPLETE / BLOCKED / FAILED]

## Objective Delivered

[What was delivered.]

## Files Changed

- [Path]

## Commit / Repository State

[SHA or exact state]

## Implementation Summary

[Concise technical summary]

## Automated Verification

- Command:
- Result:

## Manual and Real-World Verification

- Check:
- Result:

## Negative and Failure Cases

- Case:
- Result:

## Proof Artefacts

- [Path]

## Benchmark Results

[Result or not applicable with reason]

## Security / Permissions

[Checks and result]

## Cost / Performance

[Evidence or not applicable]

## Known Limitations

- [Limitation]

## Open Defects

- Critical:
- High:
- Medium:
- Low:

## Out-of-Scope Discoveries

- [Backlog recommendation only]

## Documentation Updated

- [File]

## Recommended State

[VERIFIED / VALIDATED / DONE / BLOCKED]
```

---

## 75. Evidence Register Template

```md
| Evidence ID | Capability | Input / Dataset | Environment | Provider / Model | Version / Commit | Date | Expected Result | Actual Result | Pass/Fail | Artefact Path | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
```

---

## 76. Exception Record Template

```md
# DoD Exception — [ID]

## Requirement Not Met

[Exact DoD or milestone requirement]

## Reason

[Why it cannot currently be met]

## Impact

[Customer, technical, security and roadmap impact]

## Workaround or Limitation

[Safe current treatment]

## Why This Does Not Block Done

[Evidence]

## Remediation Trigger

[When this must be revisited]

## Approval

- Approved by: Ben
- Date:
```

---

## 77. Final Authority Rule

If a contributor or AI claims work is Done but cannot supply the required evidence:

> **The work is not Done.**

If a useful improvement is discovered after the approved work passes:

> **Freeze the completed capability and place the improvement in Backlog unless the Roadmap explicitly requires it now.**

If the evidence shows the approved direction is wrong:

> **Stop, update the governing decision deliberately, and change the documents before changing the Product.**

**We finish the approved thing before chasing the next thing.**
