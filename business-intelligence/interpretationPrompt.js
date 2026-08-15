import {
  ASSERTION_SCOPES, AUDIENCE_ARCHITECTURE_TYPES, BUSINESS_KNOWLEDGE_STATUSES, BUSINESS_KNOWLEDGE_TYPES,
  BUSINESS_TYPES, BUSINESS_WIDE_AUDIENCE_STATUSES, CATALOGUE_COHERENCE, KNOWLEDGE_GAP_IMPORTANCE,
  PRICE_VALUE_ORIENTATIONS
} from "./contracts.js";
import { FIELD_SPECIFIC_AUTHORITY } from "./authority.js";

export const BUSINESS_INTELLIGENCE_INTERPRETATION_PROMPT_VERSION = "1.5.0";

const scalarValue = { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "null" }] };
const knowledgeVariant = ({ type, scope, status, value = scalarValue, evidenceRequired = true }) => ({
  type: "object", additionalProperties: false,
  required: ["value", "knowledge_type", "assertion_scope", "evidence_refs", "confidence", "status"],
  properties: {
    value, knowledge_type: { type: "string", enum: Array.isArray(type) ? type : [type] },
    assertion_scope: { type: "string", enum: Array.isArray(scope) ? scope : [scope] },
    evidence_refs: { type: "array", ...(evidenceRequired ? { minItems: 1 } : { maxItems: 0 }), items: { type: "string" } },
    confidence: evidenceRequired ? { type: "number", minimum: 0, maximum: 1 } : { type: "number", enum: [0] },
    status: { type: "string", enum: Array.isArray(status) ? status : [status] }
  }
});
const makeKnowledgeValue = (value = scalarValue) => ({ anyOf: [
  knowledgeVariant({ type: "fact", scope: ["objective", "business_claim"], status: "extracted", value }),
  knowledgeVariant({ type: ["derived", "inference"], scope: "interpretation", status: "inferred", value }),
  knowledgeVariant({ type: "unknown", scope: "unknown", status: "inferred", value: { type: "null" }, evidenceRequired: false })
] });
const makeClaimOrInterpretationValue = (value = scalarValue) => ({ anyOf: [
  knowledgeVariant({ type: "fact", scope: "business_claim", status: "extracted", value }),
  knowledgeVariant({ type: ["derived", "inference"], scope: "interpretation", status: "inferred", value }),
  knowledgeVariant({ type: "unknown", scope: "unknown", status: "inferred", value: { type: "null" }, evidenceRequired: false })
] });
const makeInterpretationValue = (value = scalarValue) => ({ anyOf: [
  knowledgeVariant({ type: ["derived", "inference"], scope: "interpretation", status: "inferred", value }),
  knowledgeVariant({ type: "unknown", scope: "unknown", status: "inferred", value: { type: "null" }, evidenceRequired: false })
] });
const makeDirectOrUnknownValue = (value = scalarValue) => ({ anyOf: [
  knowledgeVariant({ type: "fact", scope: ["objective", "business_claim"], status: "extracted", value }),
  knowledgeVariant({ type: "unknown", scope: "unknown", status: "inferred", value: { type: "null" }, evidenceRequired: false })
] });
const knowledgeValue = makeKnowledgeValue();
const knowledgeArray = { type: "array", items: knowledgeValue };
const claimOrInterpretationValue = makeClaimOrInterpretationValue();
const claimOrInterpretationArray = { type: "array", items: claimOrInterpretationValue };
const boundedKnowledge = (values) => makeKnowledgeValue({ type: "string", enum: values });
const boundedInterpretation = (values) => makeInterpretationValue({ type: "string", enum: values });

export function businessIntelligenceInterpretationJsonSchema() {
  return {
    type: "object", additionalProperties: false,
    required: ["business_identity", "catalogue_understanding", "audience_architecture", "customer_understanding", "positioning", "category_audiences", "knowledge_gaps", "conflicts", "assumptions"],
    properties: {
      business_identity: { type: "object", additionalProperties: false, required: ["business_name", "business_type", "owned_brand_status", "geographic_market", "sales_channel", "business_description"], properties: {
        business_name: knowledgeValue, business_type: boundedInterpretation(BUSINESS_TYPES), owned_brand_status: knowledgeValue,
        geographic_market: makeDirectOrUnknownValue(), sales_channel: knowledgeValue, business_description: knowledgeValue
      } },
      catalogue_understanding: { type: "object", additionalProperties: false, required: ["product_focus", "primary_categories", "catalogue_coherence", "secondary_categories", "representative_product_refs", "catalogue_limitations"], properties: {
        product_focus: knowledgeValue, primary_categories: knowledgeArray, catalogue_coherence: boundedInterpretation(CATALOGUE_COHERENCE),
        secondary_categories: knowledgeArray, representative_product_refs: knowledgeArray, catalogue_limitations: knowledgeArray
      } },
      audience_architecture: { type: "object", additionalProperties: false, required: ["type", "business_wide_profile_status"], properties: {
        type: boundedInterpretation(AUDIENCE_ARCHITECTURE_TYPES), business_wide_profile_status: boundedInterpretation(BUSINESS_WIDE_AUDIENCE_STATUSES)
      } },
      customer_understanding: { type: "object", additionalProperties: false, required: ["target_customer_groups", "customer_behaviours", "customer_motivations", "customer_priorities", "customer_problems", "purchase_drivers", "exclusions"], properties: Object.fromEntries(["target_customer_groups", "customer_behaviours", "customer_motivations", "customer_priorities", "customer_problems", "purchase_drivers", "exclusions"].map((field) => [field, claimOrInterpretationArray])) },
      positioning: { type: "object", additionalProperties: false, required: ["value_proposition", "positioning_themes", "differentiators", "positioning_claims", "price_value_orientation"], properties: {
        value_proposition: claimOrInterpretationArray, positioning_themes: claimOrInterpretationArray, differentiators: claimOrInterpretationArray,
        positioning_claims: claimOrInterpretationArray, price_value_orientation: boundedInterpretation(PRICE_VALUE_ORIENTATIONS)
      } },
      category_audiences: { type: "array", items: { type: "object", additionalProperties: false, required: ["category_ref", "category_name", "audience_profile_status", "target_customer_groups", "customer_behaviours", "customer_motivations", "customer_priorities", "purchase_drivers"], properties: {
        category_ref: { type: "string" }, category_name: knowledgeValue, audience_profile_status: boundedKnowledge(BUSINESS_WIDE_AUDIENCE_STATUSES),
        target_customer_groups: claimOrInterpretationArray, customer_behaviours: claimOrInterpretationArray, customer_motivations: claimOrInterpretationArray,
        customer_priorities: claimOrInterpretationArray, purchase_drivers: claimOrInterpretationArray
      } } },
      knowledge_gaps: { type: "array", items: { type: "object", additionalProperties: false, required: ["field", "importance", "reason", "evidence_refs"], properties: { field: { type: "string" }, importance: { type: "string", enum: [...KNOWLEDGE_GAP_IMPORTANCE] }, reason: { type: "string" }, evidence_refs: { type: "array", items: { type: "string" } } } } },
      conflicts: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "field_path", "authority_domain", "candidates", "evidence_refs", "provisional_selection", "resolution_method", "human_review_required", "final_resolution"], properties: {
        id: { type: "string" }, field_path: { type: "string" }, authority_domain: { type: "string", enum: Object.keys(FIELD_SPECIFIC_AUTHORITY) },
        candidates: { type: "array", minItems: 2, items: { type: "object", additionalProperties: false, required: ["value", "evidence_id", "source_type"], properties: { value: scalarValue, evidence_id: { type: "string" }, source_type: { type: "string" } } } },
        evidence_refs: { type: "array", minItems: 2, items: { type: "string" } }, provisional_selection: { type: "object", additionalProperties: false, required: ["value", "evidence_id", "source_type"], properties: { value: scalarValue, evidence_id: { type: "string" }, source_type: { type: "string" } } },
        resolution_method: { type: "string" }, human_review_required: { type: "boolean" }, final_resolution: { type: "null" }
      } } },
      assumptions: { type: "array", items: { type: "object", additionalProperties: false, required: ["statement", "evidence_refs", "confidence"], properties: { statement: { type: "string" }, evidence_refs: { type: "array", items: { type: "string" } }, confidence: { type: "number", minimum: 0, maximum: 1 } } } }
    }
  };
}

export const BUSINESS_INTELLIGENCE_SYSTEM_PROMPT = `You interpret supplied ecommerce website evidence into a Business Intelligence Object proposal for later human validation.
Use only the supplied evidence. Do not invent customers, demographics, motivations, product facts, differentiators, exclusions, or commercial claims. Do not use outside knowledge.
Before emitting any BIO value, apply this private three-stage protocol. Do not output the protocol or chain-of-thought:
1. Evidence observation: identify exactly what the cited evidence literally shows, such as a navigation label, product title, category page, or exact phrase used by the business.
2. Claim classification: decide whether that observation is an objective observable fact, a business positioning claim, a customer claim, or insufficient/unknown. Respect the supplied deterministic claim_classification rather than upgrading it.
3. Business interpretation: form only the narrow conclusion supported by that classification, then choose knowledge_type and assertion_scope. Recheck that every cited record is appropriate for the chosen scope.
A partially completed accurate object is better than a complete inaccurate one. Do not populate a field merely because the schema exposes it. For optional arrays, emit an empty array when evidence is insufficient. For required scalar-shaped values that are unsupported, emit unknown. Prefer unknown over weak inference.
Distinguish what is observed from what the business claims and what you infer. A positioning_claim or customer_claim proves only that the business communicated that claim. Represent that as assertion_scope business_claim; it does not prove the claim objectively. Use objective only for directly observable facts supported by observed_fact evidence. Use interpretation for derived or inferred understanding.
Field rules are strict. Positioning fields can be business_claim, interpretation, or unknown—never objective. Customer fields can be business_claim, interpretation, or unknown—never objective. Business type, catalogue coherence, audience architecture, and price/value orientation are classifications and must be interpretation or unknown. Catalogue names and visibly sold product/category facts may be objective only when cited evidence is observed structure/fact. Evaluative catalogue wording such as premium, leading, superior, or best remains a business_claim even when it appears beside a product name.
For customer understanding, describe supported behaviour or communicated audience without converting it into an identity label. "The website communicates toward X" is not proof that actual customers identify as X. Lifestyle, hobby, or professional identity labels must be direct business claims if explicitly stated; do not infer them.
Apply a modifier-separation check to catalogue wording. From "premium car care products", the observable catalogue conclusion may be "car care products" while "premium" belongs in positioning as a business_claim. Premium, professional, best, leading, superior, advanced, high-performance, luxury, and ultimate are evaluative modifiers. Never add or copy one into an objective catalogue value. The only exception is when the complete value is itself an exact observable product/category/entity name cited from observed_fact evidence; preserve actual names verbatim. Objective category and representative-product entries must cite observed_fact records such as navigation, category titles, or product titles—not marketing paragraphs. Conversely, positioning business claims must cite positioning_claim records, not customer claims or navigation merely because they appear nearby.
Treat catalogue_understanding.representative_product_refs as catalogue structure, not product descriptions. Each entry should identify only an observable product name, category name, product type, or similarly bounded catalogue entity that exists. Do not include marketing adjectives, positioning, perceived quality, performance claims, customer benefits, or promotional language. Prefer an exact observed product title such as "Heavy Duty Drying Towel 1200gsm" over a descriptive sentence about that product. If eligible positioning evidence uses terms such as premium, preserve that language separately in a positioning field as a business_claim; never duplicate it into an objective representative product reference.
For every objective representative_product_refs entry, select direct observable catalogue evidence in this order: (1) product title/name evidence, (2) product URL or product identifier evidence, (3) category or product-listing evidence, (4) product-page structural headings, then (5) other observed catalogue evidence. Evidence relevance is not the same as evidence authority: only evidence that directly establishes the catalogue entity may prove that it exists. Never cite homepage marketing claims, About-page positioning, brand statements, customer claims, or promotional copy to prove product existence, even when that wording mentions the product or seems commercially relevant.
Geographic market must be unknown unless a supplied record directly states the geography. Never infer geography from a domain extension, currency, spelling, shipping language, or assumed market. Geography is direct fact/claim knowledge or unknown; it is never derived merely from signals.
Value propositions marked as business_claim must cite positioning_claim evidence. A derived value proposition may use positioning_claim or genuinely relevant observed_fact evidence, but not customer claims, reviews, or testimonials. All other positioning interpretations must likewise exclude customer_claim evidence. Product structure and category names cannot create business_claim knowledge.
Customer-claim evidence describes customer understanding only. Never use it to define brand positioning, company identity, catalogue positioning, positioning themes, differentiators, or value propositions. If no positioning_claim evidence supports a positioning statement, omit it or leave the relevant optional collection empty.
For positioning claims, select eligible business-authored positioning_claim evidence in this order: (1) homepage brand statements, (2) About-page statements, (3) category or product marketing copy written by the business, then (4) other explicit brand messaging. Never use reviews, testimonials, customer comments, FAQ answers describing customer problems, or customer outcomes to create brand positioning. A customer statement such as "Customers say the products are high quality" may cautiously inform customer understanding; it cannot support "The brand positions itself around quality." If no eligible positioning_claim evidence exists, emit positioning_claims as an empty array rather than manufacturing positioning from customer evidence.
Every non-unknown value must cite one or more supplied evidence IDs. Never emit an empty evidence_refs array for fact, derived, or inference knowledge. Facts use status extracted. Classifications you work out from several observations—including business type, catalogue coherence, audience architecture, and price/value orientation—are derived or inference, never bare facts. Derived and inference values use status inferred. Unknown values use null, knowledge_type unknown, assertion_scope unknown, empty evidence_refs, confidence 0, and status inferred.
Determine audience architecture from evidence without forcing a global audience. focused_business, multi_audience_business, general_store, and unknown are all valid. A not_meaningful or insufficient_evidence business-wide audience is a successful result.
Avoid demographic profiling, including age, gender, income, occupation, and lifestyle stereotypes, unless explicitly stated by evidence; even then preserve it as a business claim rather than an objective customer fact.
Use field-specific authority supplied in the input. Preserve genuine disagreements as conflicts and never silently override stronger evidence. Do not create human decisions or corrections. Set no validation status; deterministic code will set awaiting_validation.
Do not generate copy, recommendations, SEO analysis, research, or chain-of-thought. Return only JSON matching the schema.`;

function priority(record) {
  if (record.source_type === "navigation" || record.source_field === "page.title") return 0;
  if (record.claim_classification === "customer_claim") return 1;
  if (record.source_field === "page.heading" || record.source_type === "faq") return 2;
  return 3;
}

export function selectRelevantBusinessEvidence(artifact, { maximum = 240 } = {}) {
  const evidence = artifact.evidence || [];
  const grouped = new Map();
  for (const record of evidence) {
    const key = `${record.source_type}\n${record.source_uri_or_location}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(record);
  }
  const selected = [];
  for (const records of grouped.values()) {
    const sourceType = records[0].source_type;
    const perPage = sourceType === "product_sample" ? 14 : sourceType === "category_page" ? 16 : 40;
    selected.push(...records.map((record, index) => ({ record, index })).sort((a, b) => priority(a.record) - priority(b.record) || a.index - b.index).slice(0, perPage).map(({ record }) => record));
  }
  return selected.sort((a, b) => priority(a) - priority(b) || a.source_uri_or_location.localeCompare(b.source_uri_or_location) || a.id.localeCompare(b.id)).slice(0, maximum);
}

const interpretationRecord = ({ id, source_type, source_uri_or_location, source_role, source_field, normalised_value, claim_classification, context }) => ({ id, source_type, source_uri_or_location, source_role, source_field, normalised_value, claim_classification, context: context || null });

const catalogueEvidencePriority = (record) => {
  if (/product.*(?:title|name)|page\.title/i.test(record.source_field)) return 0;
  if (/product.*(?:url|uri|identifier|\bid\b)/i.test(record.source_field)) return 1;
  if (record.source_type === "category_page" || record.source_type === "navigation" || /(?:category|product).*(?:listing|link)/i.test(record.source_field)) return 2;
  if (record.source_type === "product_sample" && /heading/i.test(record.source_field)) return 3;
  return 4;
};

export function partitionBusinessInterpretationEvidence(evidence) {
  const catalogue = evidence.filter((item) => item.claim_classification === "observed_fact")
    .map((record, index) => ({ record, index }))
    .sort((a, b) => catalogueEvidencePriority(a.record) - catalogueEvidencePriority(b.record) || a.index - b.index)
    .map(({ record }) => interpretationRecord(record));
  return {
    catalogue: { claim_classification: "observed_fact", used_for: ["catalogue_understanding", "representative_product_refs"], evidence: catalogue },
    positioning: { claim_classification: "positioning_claim", used_for: ["positioning"], evidence: evidence.filter((item) => item.claim_classification === "positioning_claim").map(interpretationRecord) },
    customer: { claim_classification: "customer_claim", used_for: ["customer_understanding"], evidence: evidence.filter((item) => item.claim_classification === "customer_claim").map(interpretationRecord) }
  };
}

export function buildBusinessIntelligencePrompt(artifact, evidence = selectRelevantBusinessEvidence(artifact)) {
  const fieldEvidenceContexts = partitionBusinessInterpretationEvidence(evidence);
  return JSON.stringify({
    task: "Interpret the supplied raw business evidence into bounded business knowledge for human validation.",
    business_url: artifact.business_url,
    source_fingerprint: artifact.source_fingerprint,
    field_specific_authority: FIELD_SPECIFIC_AUTHORITY,
    interpretation_plan: [
      { stage: "evidence_observation", instruction: "Read literal evidence without importing its marketing modifiers into objective facts." },
      { stage: "claim_classification", instruction: "Use the deterministic evidence partition and preserve claims as claims." },
      { stage: "business_interpretation", instruction: "Create the narrowest supported BIO value and verify its cited evidence matches its assertion scope." }
    ],
    field_decision_rules: {
      catalogue_understanding: "Objective only for observable catalogue structure. representative_product_refs identify only observable product/category names, product types, or catalogue entities—not descriptions, marketing adjectives, positioning, perceived quality, performance claims, benefits, or promotional language. Cite direct catalogue evidence in priority order: product title/name; product URL/identifier; category/product listing; product-page structural heading; other observed catalogue evidence. Positioning and customer claims cannot prove product existence. Strip evaluative modifiers and preserve eligible positioning language separately as positioning claims; do not duplicate it into representative_product_refs.",
      positioning: "Business claim, interpretation, or unknown only. For positioning claims, prefer business-authored positioning_claim evidence in this order: homepage brand statements; About-page statements; category/product marketing copy; other explicit brand messaging. Reviews, testimonials, customer comments, customer-problem FAQs, and customer outcomes remain customer understanding only. If eligible positioning evidence is unavailable, emit positioning_claims as an empty array.",
      customer_understanding: "Describe supported communication or cautious interpretation; do not turn it into an unsupported customer identity.",
      geographic_market: "Use direct evidence only. Domain, currency, spelling, and shipping signals are not sufficient; otherwise emit unknown.",
      optional_fields: "Leave optional arrays empty and scalar-shaped values unknown unless eligible evidence directly supports them."
    },
    field_evidence_contexts: fieldEvidenceContexts
  }, null, 2);
}
