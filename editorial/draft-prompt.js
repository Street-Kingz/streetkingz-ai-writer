import { sha256 } from "../research/core/canonical.js";
import { EDITORIAL_PAGE_SCHEMA_VERSION } from "./contracts.js";

export const EDITORIAL_DRAFT_PROMPT_VERSION = "1.0.0";

export const EDITORIAL_DRAFT_SYSTEM_PROMPT = `You are preparing semantic component data for a premium Street Kingz ecommerce editorial page.
Use only the supplied research packet, accepted strategy, approved page plan, canonical registries and brand rules.
Return only the strict structured output. Never return HTML, Markdown, WordPress instructions or Elementor data.
The approved component IDs, types and sequence are immutable. Do not add, remove, reorder or rename components.
The evidence, product and internal-link registries are exhaustive. Never invent identifiers, URLs, products, testing, experience, competitor findings, metrics or facts.
Factual claims must cite the evidence IDs that support them. When evidence is insufficient, qualify or omit the claim.
Distinguish evidence-backed facts from bounded editorial judgement and first-party opinion. Do not imply first-hand testing.
Write for normal car owners who want a clean car without turning detailing into a hobby. Be useful, direct, easy to scan and commercially aware without being sales-heavy.
The quick answer must genuinely answer the query. Explain selection criteria before the product recommendation. GSM alone is not proof of quality.
Do not draft outside the approved semantic components and do not make publication decisions.`;

export function buildEditorialDraftInput({ packet, strategy, plan, approval, allowlists, brandRules }) {
  const content = {
    schema_version: EDITORIAL_PAGE_SCHEMA_VERSION,
    artifact_type: "controlled_editorial_draft_input",
    prompt_version: EDITORIAL_DRAFT_PROMPT_VERSION,
    packet,
    accepted_strategy: strategy,
    approved_page_plan: plan,
    human_page_plan_approval: approval,
    canonical_registries: {
      evidence_ids: allowlists.evidence_ids,
      products: allowlists.products,
      internal_links: allowlists.internal_links
    },
    brand_rules: brandRules,
    authority: {
      semantic_drafting: true,
      add_components: false,
      alter_component_sequence: false,
      create_products: false,
      create_urls: false,
      create_evidence: false,
      generate_html: false,
      wordpress_mutation: false,
      publication: false
    }
  };
  return { ...content, input_sha256: sha256(content) };
}

export function buildEditorialDraftPrompt(input) {
  return [
    "Populate the approved semantic component plan exactly.",
    "The supplied plan is human-approved for this call only. Preserve its component IDs, types, sequence, scoped products, scoped links and media requirements.",
    "Write a useful page, not generic SEO filler. Do not use phrases such as 'in this comprehensive guide'. Do not claim objective superiority or professional practice without evidence.",
    "Use product IDs and internal-link IDs only; canonical names and URLs are resolved deterministically outside the model.",
    "INPUT JSON:",
    JSON.stringify(input)
  ].join("\n\n");
}
