# Street Kingz AI Ecommerce Assistant Architecture

## Purpose

This document describes the technical architecture of the Street Kingz AI Ecommerce Assistant.

This project is NOT an AI article generator.

The architecture is designed around an AI ecommerce assistant that can:

- Understand products
- Understand customers
- Research opportunities
- Make commercial decisions
- Create valuable outputs
- Safely deliver outputs into ecommerce systems

The core product is the intelligence layer. Content generation is only one output.

---

# What This Architecture Is Not

This system is not:

- An AI blog writer
- A keyword-to-article generator
- An SEO content factory
- A system that creates content simply because it can
- A fully automated publishing system

Content generation is an output of business intelligence, not the starting point.

---

# High Level Architecture

User Goal

↓

Workflow Engine

↓

Product Understanding Layer

↓

Research Layer

↓

Opportunity Decision Engine

↓

Semantic Content Model

↓

Brand Intelligence Layer

↓

Rendering Layer

↓

Platform Connector

↓

Human Review

---

# Core Architectural Principle

## Persistent Intelligence and Cost-Aware Execution

The system must be designed so that intelligence is reusable rather than repeatedly regenerated.

LLM context is not persistent storage.

Product understanding, human corrections, research evidence and approved business knowledge must eventually persist outside the model and be retrieved only when required.

The architecture must support large catalogues without placing an entire catalogue into model context.

Future execution should follow:

Source Data
↓
Persistent Structured Intelligence
↓
Retrieve Relevant Context
↓
AI Reasoning
↓
Persist Useful New Intelligence

The system should avoid recomputing unchanged knowledge.

Cost is an architectural constraint.

Every workflow should use the cheapest reliable mechanism for each task:

- deterministic code where possible
- cached/reused evidence where appropriate
- lower-cost models for simple AI tasks
- frontier reasoning models only where their additional reasoning creates value
- paid external APIs only when existing/fresh-enough evidence cannot be reused

Optimisation must not reduce accuracy or trust.

v0.1 does not require building the final persistence/database architecture. It must, however, avoid design decisions that make persistent intelligence or cost-efficient retrieval difficult later.

## Intelligence must be separated from output

Bad:

AI → HTML → WordPress

Good:

AI → Semantic Model → Renderer → Platform Output

This allows support for:

- WordPress
- Shopify
- Other ecommerce platforms
- Email
- Social content
- Product pages

---

# Architecture Layers

## Workflow Layer

Status: Planned

The workflow layer allows users to choose outcomes rather than write prompts.

Examples:

- Find content opportunities
- Improve product pages
- Create cornerstone content
- Create supporting content
- Analyse competitors
- Generate marketing assets

The workflow controls inputs, research, AI tasks, validation and output format.

---

## Product Understanding Layer

Status: Partially implemented foundation. Next major build.

Purpose:

Create a factual understanding of products before decisions are made.

Initial input:

Product URL

Future inputs:

- WooCommerce API
- Shopify API
- Catalogue imports

The system creates a Product Knowledge Object containing:

- Product information
- Features
- Benefits
- Customer problems
- Objections
- Commercial context
- Related products

Everything downstream consumes this object.

The AI should not guess what a product is.

---

## Research Layer

Status: Planned

Purpose:

Understand market context before deciding what content should exist.

Sources may include:

- Search APIs
- SERP data
- Competitor content
- Customer language
- Existing website content

Research extracts:

- Search intent
- Customer questions
- Alternative terminology
- Competitor weaknesses
- Content opportunities

Research informs decisions. It does not become a keyword-generation engine.

---

## Opportunity Decision Engine

Status: Planned

Core differentiator.

Purpose:

Determine whether work is actually worth doing.

Possible outcomes:

- Create cornerstone content
- Create supporting article
- Improve existing content
- Improve product page
- No action

A successful result can be deciding not to create content.

This is the primary difference between this system and existing AI writing tools.

---

## Semantic Content Model

Status: Complete

Purpose:

Represent content independently from the final platform.

The system does not generate uncontrolled HTML.

Content exists as structured semantic components.

Benefits:

- Predictable output
- Validation
- Reusable rendering
- Platform flexibility
- Preserved product references

---

## Product References

Status: Complete

Products are represented semantically, not through hardcoded URLs.

Benefits:

- Prevent broken links
- Support multiple platforms
- Maintain product relationships

---

## Editorial Intelligence Layer

Status: Complete

Purpose:

Improve commercial quality without destroying authenticity.

Includes:

- EditorialReport
- Brand Editor

Rules:

- Make selective improvements
- Preserve good writing
- Avoid generic AI language
- Preserve facts
- Reject unsupported claims

---

## Brand Intelligence Layer

Status: Complete

Architecture:

Generic Engine + BrandVoiceProfile = Brand Specific Output

Brand rules are configuration, not hardcoded logic.

Validated with:

- Street Kingz
- TrailForge

Requirements:

- No brand leakage
- No assumed personality
- No invented claims

---

## Rendering Layer

Status: Complete

Purpose:

Convert semantic content into platform output.

Current renderer:

WordPress Gutenberg

The renderer should not contain:

- Business logic
- Brand logic
- Research logic

---

## Platform Connector

Status: Complete for WordPress Draft Publishing

WordPress is a connector, not the product.

Current capabilities:

- Create drafts
- Verify persistence
- Rollback failures
- Restricted permissions

Safety mechanisms:

- Execution contracts
- Capability controls
- Bounded reads
- Exact verification
- Cleanup lifecycle

---

# Execution Lifecycle

Create Contract

↓

Validate

↓

Authorise

↓

Atomic Claim

↓

Create Draft

↓

Verify

↓

Retain or Cleanup

Rules:

- No automatic publishing
- No arbitrary content access
- No uncontrolled changes

---

# Completed Architecture

Complete:

- Semantic Content Model
- Brand Intelligence Layer
- Editorial System
- Rendering Architecture
- WordPress Draft Publishing Connector
- Cross Brand Validation

---

# Remaining Architecture

Next:

- Workflow Engine
- Product Understanding Automation
- Research Integration
- Opportunity Scoring
- User Interface

---

# First Real World Validation

Target:

Street Kingz

Workflow:

Product URL

↓

Product Understanding

↓

Opportunity Recommendation

↓

Content Brief

↓

Semantic Article

↓

Brand Review

↓

WordPress Draft

↓

Human Approval

Success criteria:

The assistant must demonstrate that it can make a commercially useful recommendation faster or better than manual analysis.

---

# Architectural Rules

Do not:

- Put brand logic into the core engine
- Put WordPress logic into intelligence layers
- Generate raw HTML directly
- Create keyword-first workflows
- Create content without evaluating value
- Build features without proving business impact

Always:

- Separate intelligence from rendering
- Preserve semantic structure
- Keep connectors replaceable
- Validate before publishing
- Optimise for ecommerce outcomes