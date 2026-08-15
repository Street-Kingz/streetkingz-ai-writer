Street Kingz AI Ecommerce Assistant

Technical Stack and Decision Log

Purpose

This document records significant technical decisions made during
development.

For every tool, framework, API, model or architectural decision:

-   What it is
-   Why it was selected
-   What problem it solves
-   Alternatives considered
-   Why alternatives were rejected
-   Current status

This prevents rebuilding decisions, introducing unnecessary complexity,
or drifting away from the original product vision.

------------------------------------------------------------------------

Core Development Environment

Node.js

Purpose:

Application runtime and development environment.

Why chosen:

-   Existing project foundation
-   Large ecosystem
-   Suitable for API integrations
-   Fast iteration speed

Alternatives considered:

Python

Reason not selected:

-   Existing codebase already established in Node.js
-   Rewrite would provide limited benefit

Status:

Active

------------------------------------------------------------------------

AI Models

GPT Models

Purpose:

Reasoning, interpretation and generation.

Used for:

-   Commercial analysis
-   Research interpretation
-   Content generation
-   Editorial improvement
-   Structured decision making

Important principle:

AI is not treated as the source of truth.

The system should provide evidence and context. The model interprets
that information.

The AI should not:

-   Guess product facts
-   Invent strategy
-   Replace business judgement

Status:

Active

------------------------------------------------------------------------

Research Infrastructure

DataForSEO

Purpose:

Search and SERP intelligence.

Used for:

-   Keyword discovery
-   Search volume information
-   SERP analysis
-   Competitor visibility
-   Search opportunity research

Why chosen:

-   API-first approach
-   Structured data
-   Automation capability
-   Suitable for integration into workflows

Alternatives considered:

Manual research.

Rejected because:

-   Does not scale
-   Creates inconsistent results
-   Requires repeated human effort

Status:

Planned integration

------------------------------------------------------------------------

Google Search Console

Purpose:

First-party website performance data.

Used for:

-   Existing search queries
-   Pages receiving impressions
-   Ranking opportunities
-   Content improvement opportunities

Why chosen:

Unlike third-party tools, this represents actual website performance.

Status:

Planned integration

------------------------------------------------------------------------

Content Architecture

Semantic Content Model

Purpose:

Separate intelligence from presentation.

Problem solved:

Avoid:

AI → HTML → WordPress

Preferred approach:

AI → Semantic Structure → Renderer → Platform Output

Benefits:

-   Platform independence
-   Validation
-   Reusable content structures
-   Safer publishing

Status:

Complete

------------------------------------------------------------------------

Product References

Purpose:

Represent products without hardcoded URLs.

Example:

Product ID:

1200gsm-towel

Instead of:

A fixed product URL.

Benefits:

-   Prevent broken links
-   Support multiple platforms
-   Maintain product relationships
-   Allow product destinations to change

Status:

Complete

------------------------------------------------------------------------

Brand Intelligence

BrandVoiceProfile

Purpose:

Separate brand identity from the core engine.

Reason:

The system should support multiple businesses.

Brand rules should be configuration, not hardcoded logic.

Architecture:

Generic Engine

-   

BrandVoiceProfile

=

Brand Specific Output

Status:

Complete

------------------------------------------------------------------------

Editorial Intelligence

Brand Editor

Purpose:

Improve commercial quality without destroying authenticity.

Problems solved:

AI content often becomes:

-   Generic
-   Over-optimised
-   Lacking opinion
-   Less human

Rules:

-   Make selective improvements
-   Preserve strong content
-   Preserve facts
-   Reject unsupported claims

Important:

The editor should not rewrite everything.

A good output may require no changes.

Status:

Complete

------------------------------------------------------------------------

Rendering Architecture

Gutenberg Renderer

Purpose:

Convert semantic content into WordPress-native blocks.

Why:

Avoid:

-   Raw HTML generation
-   Theme dependency
-   Unsafe output

The renderer converts approved structures only.

It should not contain:

-   Brand logic
-   Research logic
-   Business decisions

Status:

Complete

------------------------------------------------------------------------

WordPress Integration

Guarded Writer

Purpose:

Safely create WordPress drafts.

Why:

Writing into a live website is a high-risk action.

Protection includes:

-   Execution contracts
-   Capability checks
-   Atomic claims
-   Verification
-   Rollback
-   Cleanup lifecycle

Why not direct uncontrolled API writing?

Because publishing errors could damage:

-   Website content
-   Brand reputation
-   Customer experience

Status:

Complete

------------------------------------------------------------------------

Storage and Artifacts

Versioned Artifacts

Purpose:

Store intermediate outputs and evidence.

Examples:

-   Research outputs
-   Content briefs
-   Semantic articles
-   Validation reports
-   Test fixtures

Why:

-   Human inspection
-   Debugging
-   Version control
-   Reproducibility

Status:

Active

------------------------------------------------------------------------

Testing Philosophy

Fixture-Based Testing

Purpose:

Ensure predictable system behaviour.

Reason:

AI outputs can vary.

Fixtures allow validation of:

-   Architecture
-   Rendering
-   Transformations
-   Safety rules

without relying on unpredictable live AI responses.

Status:

Active

------------------------------------------------------------------------

Major Architecture Decisions

Why Not Build a WordPress Plugin First?

Decision:

Build the intelligence system first.

Reason:

WordPress is a publishing destination.

The product is the decision engine.

------------------------------------------------------------------------

Why Not Start With Keywords?

Decision:

Use product-first workflows.

Reason:

Keywords alone do not understand:

-   Product fit
-   Customer needs
-   Commercial value

------------------------------------------------------------------------

Why Not Auto Publish?

Decision:

Human approval remains required.

Reason:

Protect:

-   Accuracy
-   Brand reputation
-   Business decisions

------------------------------------------------------------------------

Future Decisions Not Yet Made

These should only be considered after proving the core workflow.

Not yet decided:

-   SaaS infrastructure
-   User accounts
-   Billing
-   Multi-tenant architecture
-   Additional ecommerce connectors
-   Enterprise features

The system should prove value before adding scale complexity.

------------------------------------------------------------------------

Technology Decision Rule

Before introducing any technology ask:

Does this:

1.  Improve product understanding?
2.  Improve decision quality?
3.  Reduce repetitive work?
4.  Improve commercial output?

If not, it should not be prioritised.

# Cost and Persistence Strategy

## Decision

Treat inference cost, external API cost and persistent knowledge as first-class architectural constraints.

## Reason

A commercially viable system cannot repeatedly rebuild product understanding or resend entire catalogues to AI models.

Larger merchants may contain thousands or tens of thousands of products, and long-term usage will accumulate product knowledge, research, corrections and previous decisions.

## Principle

Compute expensive intelligence once where possible, persist it, and reuse it.

Refresh information when its underlying source changes or when freshness requirements justify doing so.

## LLM Memory

LLM context is not the application's memory system.

Persistent business knowledge must eventually live outside the model.

The model should receive only the context relevant to the current task.

## Cost Hierarchy

Prefer, in order:

1. Existing trusted stored intelligence
2. Deterministic computation
3. Cached external evidence
4. Low-cost AI inference where sufficient
5. Frontier reasoning models where materially valuable
6. New paid external research when freshness or missing evidence requires it

## Measurement

During real-world validation, record enough usage information to estimate:

- initial product ingestion cost
- product refresh cost
- AI inference cost
- external research/API cost
- workflow execution cost
- storage/retrieval cost where relevant

These measurements should eventually inform SaaS pricing and gross-margin modelling.

## Current Scope

Do not build databases, vector infrastructure, catalogue-scale optimisation or complex caching during Product Intelligence v0.1 solely to solve hypothetical scale.

Product Intelligence v0.1 remains a one-product validation.

Its architecture must simply avoid preventing efficient persistence and retrieval later.