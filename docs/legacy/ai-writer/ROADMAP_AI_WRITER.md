# Street Kingz AI Ecommerce Assistant Roadmap

## Purpose

This roadmap defines the path from the current architecture to a real-world Street Kingz trial.

The objective is not to build an AI article writer.

The objective is to prove an AI ecommerce assistant can understand products, make better commercial decisions, and reduce repetitive work.

The first validation case is:

Street Kingz Heavy Duty Drying Towel 1200gsm

The system must prove:

- Research happens before writing
- The system can recommend what should be done
- Content is only one possible output
- Human judgement remains the approval layer

---

# Current Position

Completed:

- Semantic content architecture
- Product references
- Brand intelligence system
- Editorial intelligence
- Gutenberg rendering architecture
- WordPress draft publishing safety system
- Cross-brand validation
- Cornerstone content strategy pipeline
- Component-based page planning
- Offline rendering and style discovery foundations

Production publishing baseline is proven through guarded WordPress draft creation and validation.

The system can safely create drafts.

The missing piece is the intelligence that decides what should be created.

---

# Phase 1: Product Understanding Layer

Status: Next

## Goal

The system must understand a product before making recommendations.

Input:

Product URL

Example:

Street Kingz 1200gsm Drying Towel

The system extracts:

- Product information
- Specifications
- Features
- Benefits
- FAQs
- Customer problems
- Objections
- Related products
- Internal links

Output:

Product Knowledge Object

This becomes the factual foundation for everything else.

## Success Criteria

A user should not need to explain the product manually.

The AI should never guess product information.

---

# Phase 2: Research Engine

Status: Next

## Goal

Collect evidence before deciding what content is valuable.

Research sources:

- Search data
- SERP information
- Competitor evidence
- Customer language
- Existing site content

The system should understand:

- What people search for
- What questions exist
- What competitors cover
- Where opportunities exist

Important:

Research is evidence.

It is not the instruction to create content.

---

# Phase 3: Opportunity Decision Engine

Status: Core milestone

## Goal

Answer:

"What is the highest value action?"

Possible outputs:

- Create cornerstone guide
- Create supporting article
- Improve product page
- Improve existing content
- Do nothing

This is the main difference between this system and normal AI content tools.

The system must be able to say:

"Do not create this."

## Success Criteria

The recommendation must be commercially useful and explain why.

---

# Phase 4: Content Brief Generation

Status: Planned

## Goal

Turn the approved opportunity into a structured plan.

The brief contains:

- Target customer
- Search intent
- Questions to answer
- Products to feature
- Internal links
- Competitor references
- Required sections
- Images required
- CTA strategy

The brief becomes the instruction for generation.

---

# Phase 5: Controlled Content Generation

Status: Partially complete

## Goal

Generate content from approved decisions.

The AI should not decide:

- Topic
- Strategy
- Product recommendation
- Commercial direction

It should execute the approved plan.

Output:

Semantic content model

Then:

Brand editing

Then:

Human review

---

# Phase 6: WordPress Trial

Status: Future milestone

## Goal

Run the complete pipeline on Street Kingz.

Workflow:

Product URL

↓

Product Understanding

↓

Research

↓

Opportunity Recommendation

↓

Human Approval

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

↓

Publish

---

# Phase 7: Measure Whether It Works

Status: Required before expansion

The project should not expand based on excitement.

Measure:

- Time saved
- Research quality
- Accuracy
- Content quality
- Commercial usefulness
- Conversion impact
- Organic performance

Decision:

Continue

Simplify

Change direction

Stop

---

# Non-Goals

Do not build:

- Keyword spam generator
- Fully automated publishing
- Generic blog writer
- Massive dashboard before proving value
- Full catalogue processing before one product works

---

# Drift Protection Rules

Before building any feature ask:

1. Does this improve product understanding?
2. Does this improve decision quality?
3. Does this reduce manual work?
4. Does this improve commercial output?

If no:

Do not build it.

---

# Long Term Vision

The end goal is an AI ecommerce operating system.

Future workflows:

- SEO
- Product pages
- Collections
- Internal linking
- Email marketing
- TikTok scripts
- Competitor analysis
- CRO recommendations
- Customer review analysis
- Advertising assets

But only after the core loop works:

Understand product

↓

Research market

↓

Make decision

↓

Create output

↓

Measure result