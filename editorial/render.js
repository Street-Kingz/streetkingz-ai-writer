const bullets = (values) => values.length ? values.map((value) => `- ${value}`).join("\n") : "- None";

export function renderEditorialPagePlan(plan, allowlists) {
  const products = new Map(allowlists.products.map((item) => [item.product_id, item.name]));
  return `# Proposed Component Page Plan

## Topic

${plan.topic}

## Intent

${plan.search_intent.primary}${plan.search_intent.secondary ? ` with ${plan.search_intent.secondary} support` : ""}

## Page Direction

- Title/H1 direction: ${plan.h1_direction}
- Reader outcome: ${plan.introduction_objective}
- Drafting authorised: **NO**
- Publication authorised: **NO**

## Proposed Component Sequence

${plan.components.map((item, index) => `${index + 1}. **${item.component_type}** (${item.component_id})\n   - Why: ${item.purpose}\n   - Required content: ${item.required_content.join("; ")}\n   - Products: ${item.product_ids.length ? item.product_ids.map((id) => products.get(id) || id).join(", ") : "none"}\n   - Media: ${item.media_requirements.length ? item.media_requirements.map((media) => `${media.kind} (${media.status})`).join(", ") : "none"}`).join("\n")}

## Missing Media

${bullets(plan.components.flatMap((item) => item.media_requirements.map((media) => `${media.kind}: ${media.purpose} [${media.status}]`)))}

## Human Approval Required

Approve or amend this component sequence before any controlled semantic drafting call. Approval of this plan does not authorise publication.
`;
}
