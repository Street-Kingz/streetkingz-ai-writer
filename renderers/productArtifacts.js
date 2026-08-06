function valueOf(fact) {
  return fact?.value ?? "Not found on page";
}

function factList(items) {
  if (!items?.length) return "- None found on page.";
  return items.map((item) => `- ${valueOf(item)}`).join("\n");
}

export function renderProductFactsMarkdown(facts, interpretation) {
  const product = facts.product;
  const specifications = product.specifications.length
    ? product.specifications.map((item) => `- **${valueOf(item.name)}:** ${valueOf(item.value)}`).join("\n")
    : "- None found on page.";
  const steps = product.how_to_use.length
    ? product.how_to_use.map((item) => `${item.step}. ${valueOf(item.instruction)}`).join("\n")
    : "No instructions found on page.";
  const faqs = product.faqs.length
    ? product.faqs.map((item) => `### ${valueOf(item.question)}\n\n${valueOf(item.answer)}`).join("\n\n")
    : "No FAQs found on page.";
  const links = product.internal_links.length
    ? product.internal_links.map((item) => `- [${valueOf(item.label)}](${valueOf(item.url)})`).join("\n")
    : "- None found in product content.";

  return `# ${valueOf(product.name)}

Source: ${facts.product_url}

Extracted: ${facts.extracted_at}

## Identity

- **Category/type:** ${valueOf(product.category_type)}
- **WooCommerce category:** ${valueOf(product.commerce_category)}
- **Price:** ${valueOf(product.price)}

## Specifications

${specifications}

## Features

${factList(product.features)}

## Benefits

${factList(product.benefits)}

## Intended use

${factList(product.intended_use)}

## How to use

${steps}

## Care instructions

${product.care_instructions.length
  ? product.care_instructions.map((item) => `- **${valueOf(item.name)}:** ${valueOf(item.instruction)}`).join("\n")
  : "- None found on page."}

## FAQs and buying questions

${faqs}

## Related products

${product.related_products.length
  ? product.related_products.map((item) => `- ${valueOf(item.name)}${item.url ? `: ${valueOf(item.url)}` : ""}`).join("\n")
  : "- None found on page."}

## Internal links

${links}

## Claims

${factList(product.claims)}

## Limitations

${factList(product.limitations)}

## AI interpretation

Status: ${interpretation.status}

${interpretation.reason}

## Provenance

Every value in the structured JSON includes its source URL, source artifact, extraction method, selector and supporting page evidence. This Markdown file is a human-readable view; \`facts.json\` is canonical.
`;
}
