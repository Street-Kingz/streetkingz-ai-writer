const list = (items, render = (item) => item) => items.length ? items.map((item) => `- ${render(item)}`).join("\n") : "- None recorded.";

export function renderCornerstoneBrief(brief) {
  const results = brief.serp_observations.observed_results;
  return `# Cornerstone Brief

## Opportunity

**Topic:** ${brief.topic}  
**Primary query:** ${brief.primary_query}  
${brief.search_opportunity.summary}

## Search Intent

Primary: **${brief.search_intent.primary}**${brief.search_intent.secondary ? `; secondary: **${brief.search_intent.secondary}**` : ""}. Confidence: **${brief.search_intent.confidence}**.

## What Searchers Need

${brief.reader_problem}

## SERP Evidence

${list(results, (item) => `${item.rank ?? "?"}. [${item.title}](${item.url}) — ${item.page_type}; evidence: ${item.evidence_ids.join(", ")}`)}

## Competitor Coverage

Only titles and snippets were collected. They support observed terms and page-type differences, but not claims about complete page coverage.

${list(brief.competitor_coverage.observed_from_snippets, (item) => `${item.term} appears across ${item.observed_result_count} observed results (${item.evidence_ids.join(", ")})`)}

## Content Gaps

${list(brief.content_gaps, (item) => `${item.gap} **Status:** ${item.status}. ${item.limitation || ""}`)}

## Recommended Structure

${list(brief.recommended_article_structure, (item) => `**${item.section}** — ${item.purpose} [${item.trace_kind}]`)}

## Questions We Must Answer

${list(brief.required_questions, (item) => `${item.question} (${item.evidence_ids.join(", ")})`)}

## Street Kingz Relevance

${list(brief.relevant_streetkingz_products, (item) => `[${item.name}](${item.url}) — ${item.relevance}`)}

## Internal Linking

${list(brief.internal_link_opportunities, (item) => `${item.source_page} → ${item.destination_page}: ${item.relationship} Anchor direction: ${item.suggested_anchor_direction}`)}

## Evidence / Claims

${list(brief.evidence_requirements)}

Claims requiring caution:
${list(brief.claims_requiring_caution)}

## Cannibalisation

Overall risk: **${brief.cannibalisation_assessment.overall_risk}**. Action: **${brief.cannibalisation_assessment.recommended_action}**.

${list(brief.cannibalisation_assessment.conflicts, (item) => `${item.conflicting_url} — ${item.overlap_reason}; ${item.recommended_action}`)}

## Do Cover

${list(brief.do_cover)}

## Do Not Cover

${list(brief.do_not_cover)}

## Open Questions

${list(brief.open_questions)}

## Confidence / Risks

**${brief.confidence.level}:** ${brief.confidence.rationale}

Human review state: **${brief.human_review_state}**.
`;
}
