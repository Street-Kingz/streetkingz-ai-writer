import { sha256 } from "../research/core/canonical.js";
import { STREET_KINGZ_FOUNDER_VOICE } from "./founder-voice.js";
import { EDITORIAL_REVISION_VERSION } from "./revision-contracts.js";

export const FOUNDER_REVISION_PROMPT_VERSION = "1.2.0";
export const FOUNDER_REVISION_SYSTEM_PROMPT = `Revise an accepted Street Kingz semantic component page into a founder-led customer voice.
Return only the strict structured output. Do not return HTML, Markdown, WordPress instructions or Elementor data.
Preserve the approved strategy, topic, H1, products, links, evidence universe and media requirements.
You may only remove the existing comparison component if it lacks useful evidence, or insert the single optional founder_note immediately before the product recommendation if it materially improves trust.
Do not add, remove or reorder anything else.
Write as the founder speaking naturally to normal car owners. First person is welcome where useful, but do not force it into every paragraph.
Never invent founder experience. Any first-person statement about testing, use, ownership, history, development, customers, sales, experiments or personal comparison requires an allowed founder_fact ID. If the founder-fact registry is empty, do not make those claims.
Bounded recommendations such as 'I would look at size as well as GSM' are founder_opinion, not founder_fact.
Annotate meaningful claims verbatim as founder_fact, founder_opinion, evidence_bound_fact or editorial_judgement.
Remove internal system language and repeated caveats. Express limitations naturally and only where useful.
Treat the PAGE as the unit of communication: progress the argument as the reader scrolls. Do not make each component independently recap earlier sections.
Obey the supplied page-specific concept ownership policy. A primary owner explains its concept; other components may only make the permitted brief reference, product specification or concise FAQ answer. Never re-explain a concept outside its owner/allowed secondary components.
Obey every component job. The conclusion makes the decision and must not recap a checklist. The practical section explains use, not selection. The FAQ handles residual questions only.
Be transparent that Street Kingz sells the recommended product, but help the reader before selling. Produce an actual low-pressure CTA label.
Do not invent evidence, products, URLs, testing, professional consensus or competitor findings.`;

export function buildFounderRevisionInput({ sourcePage, sourcePageHash, packet, strategy, plan, conceptPolicy, allowlists, founderFacts = [] }) {
  const content = { revision_version: EDITORIAL_REVISION_VERSION, artifact_type: "founder_led_editorial_revision_input", source_semantic_page: sourcePage, source_semantic_page_hash: sourcePageHash, packet, accepted_strategy: strategy, approved_page_plan: plan, concept_ownership_policy: conceptPolicy, fixed_editorial_decisions: { comparison_table: "remove", founder_note: "omit", comparison_reason: "Current bounded evidence cannot support a sufficiently useful microfibre vs waffle vs chamois comparison without a caveat-dominated table." }, editorial_revision_focus: { scope: "minimal_two_issue_correction", product_recommendation: "Rewrite commercial involvement in natural first-person founder/company voice. Make ownership obvious without defensiveness, overselling or repeating the criteria section.", faq_remove_exact_question: "What criteria should I use to choose the best car drying towel for my vehicle and routine?", faq_rule: "Keep only residual questions that add information not already substantially answered. Do not add a replacement merely to preserve count.", preserve_other_copy_unless_flow_requires_change: true }, founder_voice_contract: STREET_KINGZ_FOUNDER_VOICE, founder_fact_registry: founderFacts, canonical_registries: { evidence_ids: allowlists.evidence_ids, products: allowlists.products, internal_links: allowlists.internal_links }, authority: { revise_visible_copy: true, comparison_decision_fixed: "remove", founder_note_decision_fixed: "omit", add_products: false, add_evidence: false, create_urls: false, publish: false, wordpress_mutation: false } };
  return { ...content, input_sha256: sha256(content) };
}

export function buildFounderRevisionPrompt(input) {
  return ["Make one minimal editorial revision to the supplied deterministic-PASS page. Do not broadly rewrite it.", "Fix exactly two issues: (1) make the product recommendation naturally acknowledge in first-person founder/company voice that Street Kingz is our own business/product, then explain its fit without overselling; (2) remove the exact redundant FAQ named in editorial_revision_focus. Review other FAQs only for genuine residual duplication; do not add replacement questions.", "The comparison remains REMOVE and founder note remains OMIT. Preserve the nine-component sequence and all concept ownership/component jobs.", "Do not invent founder experience. Commercial ownership and bounded opinion are allowed; testing, use, customer, sales, development and history claims require founder facts, and there are none.", "Preserve evidence, products, links, media, strategy and all good copy unless a tiny flow edit is required by the two corrections. Return only strict structured output.", "INPUT JSON:", JSON.stringify(input)].join("\n\n");
}
