# Product Vision

## 1. Purpose of This Document

This document defines the long-term vision and non-negotiable principles of the product.

It exists to prevent product drift.

Features, architecture, models, providers, interfaces and implementation details will change over time. The fundamental purpose of the product should not change casually.

`PRODUCT_VISION.md` is the highest product authority.

`PRODUCT_SCOPE.md` defines the approved product boundary beneath it. `ROADMAP.md` orders the approved work. `PROJECT_STATE.md` records current reality. `COMPETITORS.md` constrains competitive claims and build/buy decisions.

Lower-level documents may operationalise this vision but may not silently override it.

If proposed work conflicts with this document, the work does not proceed unless the product vision itself is deliberately reviewed and changed first.

**New ideas are not new priorities.**

---

## 2. The Problem

Organic growth is valuable to ecommerce businesses but difficult to navigate without specialist knowledge.

A business owner trying to improve organic performance can already access enormous amounts of information through:

* Google Search Console;
* Google Analytics;
* ecommerce-platform reporting;
* free SEO tools;
* paid SEO platforms;
* YouTube;
* blogs and guides;
* AI assistants;
* freelancers;
* consultants;
* agencies.

The fundamental problem is therefore not a lack of information.

The problem is turning that information into reliable decisions.

A typical ecommerce owner can discover hundreds of things they *could* work on:

* keywords;
* product pages;
* category pages;
* articles;
* internal links;
* metadata;
* structured data;
* technical issues;
* content gaps;
* competitor gaps;
* declining pages;
* ranking opportunities.

Knowing these opportunities exist does not automatically answer:

> **What should this particular business work on next?**

A good specialist can combine SEO knowledge with commercial context and make those decisions.

However, accessing that expertise can be expensive, while learning enough SEO to make the decisions independently requires significant time and effort.

Growing ecommerce businesses currently face a fragmented spectrum of options.

### DIY and Free Tools

Use Search Console, free SEO tools and plugins, crawlers, educational content and general-purpose AI.

This can be powerful, but the owner must assemble, interpret and act on fragmented information.

### Paid Software and Automation

Use paid SEO platforms or AI products.

These can reduce work, but may still require specialist judgement, monetise access to the useful answer, or optimise a narrower SEO task rather than the priorities of that specific ecommerce business.

### Professional Help

Hire a freelancer, consultant or agency.

This can provide judgement and execution, but good support may be unaffordable or disproportionate for a growing store.

The market therefore does not lack options.

Our chosen opportunity is to make the strategic answer and complete DIY route genuinely accessible for free, then charge only when the customer asks the software to perform the implementation labour.

---

## 3. Our Mission

### Make useful ecommerce organic-growth intelligence accessible regardless of whether a business can afford an SEO specialist.

The product should help an ecommerce business understand:

* where meaningful organic opportunities exist;
* which opportunities deserve attention;
* which opportunities do not;
* why;
* what should be done;
* how the work can be completed correctly;
* and what happened after the work was performed.

The customer should not need to become an SEO professional to make informed organic-growth decisions.

---

## 4. Core Product Philosophy

The product is built around two distinct layers.

### Intelligence is free.

### Autonomous execution is paid.

We do not intend to make money by deliberately withholding the information required for somebody to improve their business.

We intend to make money by using software to remove the implementation labour when the customer chooses not to perform it themselves.

This distinction is fundamental to the product.

---

## 5. Free Intelligence

The free product should provide genuine value.

It must not be a deliberately crippled preview of the real product.

If the system has determined that an ecommerce business should take a particular action, the free user should be able to understand:

### What We Found

The opportunity, problem or risk identified.

### Why It Matters

Why the system believes this deserves the business's attention.

### The Evidence

The relevant data and research supporting the recommendation.

### Its Priority

Why this opportunity deserves attention relative to other available opportunities.

### What Should Be Done

The intervention the system recommends.

### How to Do It

Complete instructions allowing the customer to implement the recommendation themselves.

### How to Verify It

How the customer can determine whether the work was implemented correctly.

### What to Monitor

Which signals should subsequently be watched and when the result should be reassessed.

A customer willing to invest their own time should be able to receive substantial ongoing value without paying us.

That is intentional.

---

## 6. Free Product Doctrine

The following principles are non-negotiable unless this vision is explicitly changed.

We will not deliberately:

* hide recommendations behind a subscription;
* blur or lock opportunities the system has already identified;
* provide intentionally inferior reasoning to free users;
* withhold important evidence solely to encourage payment;
* omit implementation steps solely to create an upsell;
* manufacture unnecessary complexity;
* recommend more labour-intensive work because it is more profitable for us to automate;
* turn the free product into a glorified sales demo.

A useful internal rule is:

> **If the system knows the answer, give the user the answer.**

The free product should be good enough that a capable and motivated user can take the recommendation elsewhere and implement it without paying us.

They may:

* do it themselves;
* use ChatGPT or another AI;
* give it to an employee;
* give it to a freelancer;
* give it to an agency;
* use another software product.

That is acceptable.

Our job is to earn trust by giving the best recommendation we can.

---

## 7. Paid Autonomous Execution

The paid product exists to remove labour.

After receiving a complete free recommendation, the customer may decide:

> **I understand what needs doing, but I do not want to spend my time doing it.**

At that point the product can offer:

### Do It for Me

This must mean software execution, not an agency service hidden behind software.

The intended experience is:

**Recommendation**

→ **Do it for me**

→ autonomous research and preparation

→ automated quality assurance

→ preview of proposed work

→ customer review

→ customer edits or amendment requests

→ customer approval

→ deployment

→ verification

→ monitoring

The intended paid value is to reduce potentially hours of implementation work to a short review-and-approval process.

The actual time saved must be measured before it is presented as a factual marketing claim.

---

## 8. We Are Not Building an Agency

The business must not depend on the founder or employees manually performing routine SEO work for customers.

Human intervention may be used during development, validation and quality assurance while capabilities are being proven.

However, recurring manual work should be treated as a product-development problem.

The question should be:

> **Why did a human have to do this, and can the system safely automate it?**

Paid execution should ultimately be delivered by the product.

---

## 9. Alignment Between Free and Paid

The intelligence layer must make recommendations based on what appears best for the customer.

It must not optimise recommendations around what generates the most execution revenue for us.

If:

* Option A is better for the customer and takes ten minutes to implement manually;
* Option B is worse for the customer but would generate a £200 execution fee;

the system must recommend Option A.

Recommendation quality and execution monetisation should remain structurally separate wherever practical.

We make money because customers trust the recommendation enough to let the product execute it.

We do not create recommendations in order to manufacture execution revenue.

---

## 10. Customer

The initial target customer is an ecommerce business that:

* wants meaningful organic growth;
* has a real trading history;
* has sufficient website, product and search data for useful analysis;
* lacks strong in-house SEO expertise;
* is willing to invest time or money into organic growth;
* and wants clearer guidance about where that effort should be spent.

The product is platform-independent in its long-term purpose.

Initial platform choices belong in `DECISIONS.md` and `ROADMAP.md`, where they can be changed deliberately without rewriting the product mission.

The architecture should avoid unnecessary platform-specific assumptions that make later expansion prohibitively difficult.

---

## 11. What the Product Should Understand

The product should reason across two evidence domains.

### The Business

The commercial and operational reality of the ecommerce business.

### The Organic Market

The website's current organic position and the external search and discovery landscape.

The product should connect these domains only where reliable evidence exists, distinguish observed facts from user-provided information and inference, and remain explicit when important data is missing.

The objective is not merely to find SEO work.

The objective is to determine which organic-growth decisions appear worth the business's attention.

---

## 12. Decision Philosophy

The system should be opinionated without pretending to know things it cannot know.

It should be capable of saying:

> **Do this.**

It should also be capable of saying:

> **Do not prioritise this.**

And:

> **We do not currently have enough evidence to make this decision confidently.**

More recommendations are not inherently better.

The system should filter noise rather than manufacture an endless SEO to-do list.

Recommendations should be:

* evidence-backed;
* commercially informed where reliable commercial evidence exists;
* explainable;
* actionable;
* proportionate to confidence;
* explicit about uncertainty.

False precision should be avoided.

The system must not invent credible-looking ROI figures simply because a numerical estimate looks persuasive.

---

## 13. Education

The product should teach while it works.

Customers should not be required to understand terminology such as:

* SERP;
* canonical;
* schema;
* cannibalisation;
* search intent;
* topical authority;
* structured data.

Where specialist terminology is necessary, explain it in plain English and explain why it matters to the customer's specific situation.

The objective is not to make SEO appear complicated.

The objective is to make complicated SEO understandable.

---

## 14. Content Philosophy

Our public educational content should follow the same trust philosophy as the free product.

When we choose to teach a task, we should teach it sufficiently for a motivated user to complete it correctly.

Content must not deliberately stop before the useful part solely to force a sale.

If we teach:

> How to improve internal linking on an ecommerce site

we should teach the complete process.

If we teach:

> How to assess a category-page SEO opportunity

we should explain the complete process.

The relationship between content and product should be:

### Content

**Teach me how this works.**

### Free Product

**Tell me where this applies to my business.**

### Paid Execution

**Do the work for me.**

Content exists primarily to build awareness, usefulness and trust rather than to constantly force immediate sales.

---

## 15. Competitive Objective

We do not need to build the best SEO platform in the world.

We do not need to outperform every paid SEO product.

That would create unnecessary scope and force us to compete with mature, well-funded companies on their terms.

Our primary competitive objective is:

### Become the most useful free ecommerce organic-growth intelligence product we can build.

Competitors should be separated into two categories.

### Free Alternatives

These are products and workflows we intend to outperform on usefulness.

The relevant question is:

> **Would an ecommerce owner receive more useful, actionable organic-growth guidance from our free product than from the credible free alternatives available to them?**

### Paid Alternatives

Paid platforms, consultants and agencies are benchmarks and sources of learning.

We should study:

* what they do well;
* what customers value;
* what capabilities materially improve outcomes;
* what can be economically reproduced;
* what should be purchased via API rather than rebuilt;
* and what is unnecessary for our product.

Paid competitor feature completeness is not our development target.

Free access is not unique and should not be treated as proof of differentiation.

The relevant free competitor is not only one individual tool. It is also the competent combination of Search Console, free webmaster tools, WordPress plugins, crawlers, general-purpose AI and educational content.

The product must therefore earn its position through:

* decision usefulness;
* ecommerce relevance;
* complete DIY guidance;
* clarity;
* convenience.

“Best free” remains a development objective until documented testing across multiple stores earns the claim.

AI access, WordPress actions, content generation, approval workflows and website editing already exist elsewhere.

Our value must not depend on presenting those commodity capabilities as novel.

The product must earn its right to exist through how it:

* gathers evidence;
* understands the ecommerce context;
* selects and prioritises the right intervention;
* explains the decision completely;
* enables proper DIY implementation;
* and executes approved work safely.

---

## 16. Human Expertise as a Benchmark

Commercially informed ecommerce SEO is not something we invented.

A good ecommerce SEO specialist may already combine:

* search opportunity;
* commercial priorities;
* product performance;
* conversion;
* catalogue structure;
* business goals;
* competitive feasibility.

Our ambition is to productise and automate useful parts of that expertise.

Human specialists should therefore remain an important quality benchmark.

The system should not merely ask:

> **Is this technically functioning?**

It should increasingly ask:

> **Would a strong ecommerce SEO specialist consider this a sensible decision given the same evidence?**

---

## 17. Development Philosophy

Development should be deliberate and bounded.

The approved customer-facing and internal product scope must precede and constrain the roadmap.

The development hierarchy is:

**PRODUCT_VISION**

→ **PRODUCT_SCOPE**

→ **ROADMAP**

→ **CURRENT MILESTONE**

→ **CURRENT TASK**

Lower levels may not silently override higher levels.

A feature does not enter development simply because it appears useful.

Before substantial new work is approved, we should understand:

* which customer problem it solves;
* whether it belongs within approved product scope;
* its dependencies;
* where it belongs on the roadmap;
* what existing competitors already provide;
* whether the current competitor register has been checked or updated for that customer job;
* whether the capability should be built, bought, integrated, backlogged or avoided;
* how completion will be objectively tested.

---

## 18. Scope Discipline

### New ideas are not new priorities.

Ideas discovered during development should normally enter the backlog.

They do not interrupt the current milestone unless new evidence demonstrates that continuing the approved work would be materially wrong.

A competitor launching an impressive capability does not automatically make that capability part of our product.

Competitive changes should trigger assessment, not automatic implementation.

Scope changes are allowed.

Uncontrolled scope drift is not.

Material changes should be deliberate, documented and approved before implementation.

---

## 19. Real-World Validation

The product should be developed and tested against real ecommerce conditions rather than synthetic demonstrations alone.

Street Kingz is the initial real-world validation environment.

It is not the product.

No product logic should depend on Street Kingz-specific products, terminology, founder knowledge or undocumented assumptions.

A capability that only works because we already understand the test business intimately has failed the generalisation test.

Critical capabilities should first prove themselves in the initial test environment and subsequently be validated against independent ecommerce businesses.

---

## 20. Evidence Before Claims

The vision contains hypotheses that are not yet proven.

In particular, we must establish whether combining commercial ecommerce context with organic-search evidence produces materially better decisions than strong SEO analysis without that context.

We must also prove:

* users find the recommendations useful;
* users act on them;
* our free product can outperform credible free alternatives on usefulness;
* non-experts can understand and implement the DIY guidance;
* autonomous execution can reliably remove meaningful labour;
* the system can operate economically and safely;
* the initial target customer genuinely values the problem being solved.

Until evidence exists, these remain hypotheses rather than marketing claims.

We should not convert aspirations into claims merely because they appear in the product vision.

All competitive and outcome claims must comply with the current claims policy in `COMPETITORS.md`.

Until the required evidence gates are met, we must not claim that the product is:

* the first or only product of its kind;
* the best free alternative;
* better than named paid competitors;
* a replacement for an SEO agency;
* commercially smarter than existing tools;
* fully autonomous;
* guaranteed to improve rankings, traffic or revenue.

---

## 21. Infrastructure Philosophy

Access to the free intelligence product should not require us to subsidise unlimited variable AI or external-data costs.

Where practical, customer-funded providers, bring-your-own-provider access or other sustainable infrastructure models may be used.

BYOK, model choice and AI access are infrastructure options.

They are not the product's identity, customer value or moat.

The product should use the least expensive reliable method that achieves the required quality and should explain customer-funded usage in understandable terms.

Detailed provider selection, caching, routing and model orchestration belong in `PRODUCT_SCOPE.md` and the technical architecture rather than this vision.

---

## 22. Trust

Trust is a core product asset.

We earn it by:

* giving useful intelligence away without artificial restrictions;
* showing evidence;
* acknowledging uncertainty;
* avoiding fake precision;
* recommending what appears best for the customer;
* allowing users to inspect proposed changes;
* requiring approval before significant execution;
* providing rollback where appropriate;
* being transparent about costs;
* being clear about data use and permissions;
* showing failures and limitations rather than hiding them.

Trust should compound through repeated useful decisions.

---

## 23. Measurement and Learning

Recommendations and interventions should not disappear after implementation.

The system should ultimately remember:

* what it recommended;
* why;
* what evidence existed;
* what the customer chose;
* what was implemented;
* when it changed;
* what the baseline was;
* what subsequently happened.

Relevant outcomes may include:

* indexing;
* impressions;
* rankings;
* clicks;
* organic traffic;
* conversions;
* revenue;
* commercial performance.

The system must distinguish observed correlation from proven causation.

Where appropriate and properly consented, aggregated intervention and outcome information may eventually improve future decision quality.

The business must not depend on this becoming a proprietary data moat.

If it does, that is additional strategic value.

---

## 24. What We Are Not Building

Unless future evidence deliberately changes product scope, this is not intended to become:

* another Ahrefs;
* another Semrush;
* a generic keyword database;
* a generic AI writer;
* an ecommerce analytics dashboard;
* an attribution platform;
* an advertising-management platform;
* an email-marketing platform;
* an inventory-management system;
* an AI COO;
* an SEO agency;
* a collection of loosely connected AI agents;
* a feature-completeness clone of existing paid SEO platforms;
* a generic BYOK or MCP layer that merely exposes WordPress actions to an AI model;
* a high-volume programmatic content or landing-page factory without decision evidence.

External platforms and APIs should be used where they can provide commodity capabilities more effectively than rebuilding them ourselves.

Our value should come from how the system turns evidence into useful decisions and execution.

---

## 25. Long-Term Customer Experience

The eventual product should feel approximately this simple:

### Connect My Ecommerce Business

The system builds an understanding of the store and its organic presence.

### Tell Me What Deserves Attention

It monitors relevant signals, investigates when evidence warrants reassessment, and filters noise rather than manufacturing a constant task feed.

### Explain Why

It shows the evidence and reasoning in language I understand.

### Tell Me Exactly What to Do

It provides complete implementation guidance for free.

### Let Me Do It Myself

I can follow the instructions without paying the platform.

### Or Do It for Me

I press a button.

The system prepares the intervention autonomously.

### Let Me Remain in Control

I review, edit or request amendments and approve the work.

### Deploy Safely

The system implements the approved change and verifies it.

### Tell Me What Happened

The system monitors the relevant outcome and incorporates what was learned into future decisions.

---

## 26. North Star

### Give ecommerce businesses the best organic-growth intelligence we can for free.

### Tell them what matters, why it matters and exactly how to do it themselves.

### Never make the free answer worse to force a sale.

### When they would rather spend minutes reviewing than hours implementing, let them press a button and have the software do the work.

---

## 27. Authority

The repository is the authoritative source of truth for this project.

Current repository documentation overrides:

* previous conversation history;
* AI memory;
* abandoned plans;
* superseded product ideas;
* undocumented assumptions.

No critical project knowledge should exist only inside a ChatGPT or coding-agent conversation.

Important decisions must be written back into the repository.

The product should be understandable and governable by a new contributor or AI agent using the repository documentation without requiring access to the project's historical conversations.

**The repository remembers. Conversations are disposable.**
