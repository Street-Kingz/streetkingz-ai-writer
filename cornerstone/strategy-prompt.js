import { sha256 } from "../research/core/canonical.js";
import { CORNERSTONE_STRATEGY_PROMPT_VERSION, cornerstoneStrategyJsonSchema } from "./strategy-contracts.js";
import { deriveCornerstoneStrategyAllowlists } from "./strategy-allowlists.js";

export const CORNERSTONE_STRATEGY_SYSTEM_PROMPT = `You are a bounded content-strategy reasoner. Interpret only the supplied packet, brand rules and first-party facts. Do not browse, discover facts, invent metrics, products, URLs, competitors, customer data or scientific claims. The supplied product registry is exhaustive: products absent from it MUST NOT be recommended. Select products only by product_id; never recreate a name or URL. The supplied internal-link registry is exhaustive: select links only by link_id; never recreate a URL. Unknown products or pages may appear only as explicit missing-evidence/open questions, never as established recommendations. Do not infer Product Facts from names, URLs, snippets or general knowledge. Evidence absence must remain evidence absence. Titles and snippets do not prove competitor-page coverage. Preserve unknowns. Return strategy JSON only, never an article or publish decision. Every evidence-backed recommendation must cite supplied evidence IDs. Empty evidence_ids are allowed only for explicit editorial preferences or unresolved questions that make no factual claim.`;

export function buildCornerstoneStrategyInput({ packet, brandRules, productFacts }) {
  if (!packet || packet.artifact_type !== "cornerstone_research_packet") throw new Error("A validated cornerstone research packet is required.");
  const allowlists = deriveCornerstoneStrategyAllowlists(packet);
  const input = {
    schema_version: "1.0.0",
    artifact_type: "cornerstone_strategy_input",
    prompt_version: CORNERSTONE_STRATEGY_PROMPT_VERSION,
    packet,
    brand_rules: brandRules,
    referenced_product_facts: productFacts,
    entity_allowlists: allowlists,
    supplied_evidence_ids: allowlists.evidence_ids,
    boundaries: {
      facts_are_immutable: true, browsing_allowed: false, article_drafting_allowed: false,
      publication_decision_allowed: false, unsupported_absence_claims_allowed: false
    }
  };
  return { ...input, input_sha256: sha256(input) };
}

export function buildCornerstoneStrategyPrompt(input) {
  return [
    "Refine the strategy for the supplied deterministic research packet.",
    "Choose one allowed decision. Prioritise usefulness and search intent; keep commerce natural.",
    "Treat competitor coverage as unknown unless the packet contains page-level extraction.",
    "Do not draft article paragraphs. Return an ordered strategy, not finished copy.",
    "INPUT:\n" + JSON.stringify(input)
  ].join("\n\n");
}

export function buildCornerstoneStrategyRequest({ input, provider }) {
  const userPrompt = buildCornerstoneStrategyPrompt(input);
  const responseSchema = cornerstoneStrategyJsonSchema(input.entity_allowlists);
  const request = provider.requestPayload({ systemPrompt: CORNERSTONE_STRATEGY_SYSTEM_PROMPT, userPrompt, responseSchema, temperature: 0.1 });
  return { systemPrompt: CORNERSTONE_STRATEGY_SYSTEM_PROMPT, userPrompt, responseSchema, request };
}
