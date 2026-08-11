const bullets = (items, project = (item) => item.statement) => items.length ? items.map((item) => `- ${project(item)}`).join("\n") : "- None recorded.";

export function renderCornerstoneStrategyMarkdown(strategy) {
  const s = strategy.strategy;
  return `# Cornerstone Strategy

## Decision

**${strategy.decision.outcome}** — ${strategy.decision.rationale}

## Recommended Angle

${s.recommended_content_angle.statement}

## Search Intent

${s.primary_intent_interpretation.statement}${s.secondary_intent ? ` Secondary intent: ${s.secondary_intent.statement}` : ""}

## What This Article Must Achieve

${s.reader_outcome.statement}

## Must Cover

${bullets(strategy.priorities.must_cover_topics)}

## Secondary Coverage

${bullets(strategy.priorities.secondary_topics)}

## What to Avoid

${bullets(strategy.priorities.low_value_topics)}
${strategy.drafting_guidance.what_to_avoid.map((item) => `- ${item}`).join("\n")}

## Recommended Structure

${strategy.structure.sections.map((item, index) => `${index + 1}. **${item.heading_direction}** — ${item.purpose}`).join("\n")}

## Evidence Gaps

${bullets(strategy.evidence.missing_evidence)}

## Street Kingz Integration

${bullets(strategy.streetkingz_integration.genuinely_relevant_products, (item) => `${item.canonical_product?.name || item.product_id}: ${item.placement_reason}`)}

## Internal Links

${bullets(strategy.internal_linking, (item) => `${item.priority}: ${item.canonical_link?.destination_url || item.link_id} — ${item.reasoning}`)}

## Cannibalisation

${strategy.cannibalisation.assessment} Recommended handling: **${strategy.cannibalisation.recommended_handling}**.

## Open Questions

${bullets(strategy.open_questions)}

## Confidence

**${s.confidence}**
`;
}
