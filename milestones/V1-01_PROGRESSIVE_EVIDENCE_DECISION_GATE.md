# Milestone V1-01 — Progressive Evidence Decision Gate

Status: Approved — Current
Roadmap milestone: V1-01
Milestone type: Product hypothesis validation
Product code status: Authorised only within this approved V1-01 contract
Decision owner: Ben

## Objective

Prove that the Product can generate a useful, evidence-backed organic-growth plan for a low-traffic ecommerce store using sparse but reliable evidence, and that richer first-party commercial or search evidence can refine the recommendation without requiring a separate Product.

## Required evidence operation

The implementation must acquire evidence read-only and automatically where available. It must establish current site and catalogue understanding, real external search-demand and SERP evidence, available WooCommerce sales/stock/margin evidence, and Search Console evidence when available. There is no minimum traffic requirement.

Evidence maturity must be explicit. Foundation evidence includes the business description/objectives, catalogue, public website, product economics where available, external demand, SERPs, competitors and site structure. Performance evidence includes Search Console, sales history, stock movement, margin/COGS and existing organic visibility. Behavioural evidence includes reliable conversion and analytics data only where later approved. Missing data remains missing and lowers confidence; it is never converted to zero or silently inferred. Social, TikTok, marketplace or other channel demand is optional supporting evidence.

## Required output

The run must produce three to five prioritised recommendations, with intervention selection that does not default to articles. The top recommendation must include complete DIY guidance. The run must include an evidence-backed comparison showing what changed or became more confident after richer evidence was added. Honest no-action and insufficient-evidence states are required.

Recommendations must not be simply one per catalogue product. No named product, page, keyword, intervention or founder target may be hidden in the method.

## Pass criteria

The milestone passes only if:

1. The sparse-evidence output is useful and actionable by itself.
2. External search and SERP evidence is real and current.
3. Recommendations are not simply one per catalogue product.
4. Missing traffic data does not block the analysis.
5. At least one recommendation is credible enough that Ben would genuinely consider implementing it.
6. Richer available evidence either changes priority/intervention or materially strengthens, weakens or qualifies reasoning and confidence for a valid reason.
7. The result clearly explains why.
8. No article-by-default behaviour occurs.
9. Evidence, inputs and outputs are frozen and reproducible.
10. No Critical or High defect remains.

Richer evidence does not have to change the top recommendation if it materially strengthens or weakens confidence for a valid, explained reason.

## Explicit exclusions

This milestone does not include customer UI, accounts, onboarding, payments, a paid executor, WordPress writes, monitoring, GA4, additional platforms, Create SEO Article continuation, a generic opportunity product, a generic data warehouse, or a universal provider abstraction.

It does not run a six-run Control/Challenger experiment, create Package A or Package B, use a 10-point blind-scoring requirement, or generate a final V1-01 decision through hidden founder judgement.

## Validation boundary

Street Kingz validates the sparse-evidence and low-traffic journey. Independent established ecommerce businesses validate the richer-evidence journey and primary target-market proposition under V1-07 and later milestones. Success on Street Kingz alone does not prove established-store performance.

## Failure and stop conditions

Stop honestly if evidence is unavailable, stale, unmapped, unsafe or insufficient. Return no-action or insufficient-evidence where appropriate. Do not invent values, fill gaps from model memory, or broaden the scope to force a recommendation. No other Product milestone or executor work is authorised by this contract.
