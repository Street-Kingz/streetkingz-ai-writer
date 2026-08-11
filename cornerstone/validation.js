import {
  CANNIBALISATION_ACTIONS,
  CONFIDENCE_LEVELS,
  CORNERSTONE_BRIEF_VERSION,
  CORNERSTONE_PACKET_VERSION,
  CORNERSTONE_SCHEMA_VERSION,
  INTENTS,
  TRACE_KINDS
} from "./contracts.js";

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const requiredString = (value, path, errors) => { if (typeof value !== "string" || !value.trim()) errors.push(`${path} must be a non-empty string.`); };
const requiredArray = (value, path, errors, nonempty = false) => { if (!Array.isArray(value)) errors.push(`${path} must be an array.`); else if (nonempty && !value.length) errors.push(`${path} must not be empty.`); };
const duplicates = (values) => values.length !== new Set(values.map((v) => String(v).normalize("NFKC").toLowerCase().trim())).size;

function validateEvidenceRefs(value, evidenceIds, errors, path = "artifact") {
  if (Array.isArray(value)) return value.forEach((item, index) => validateEvidenceRefs(item, evidenceIds, errors, `${path}[${index}]`));
  if (!isObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (key === "evidence_ids" && Array.isArray(item)) for (const id of item) if (!evidenceIds.has(id)) errors.push(`${path}.evidence_ids references unknown evidence ID ${id}.`);
    else validateEvidenceRefs(item, evidenceIds, errors, `${path}.${key}`);
  }
}

export function validateCornerstoneResearchPacket(packet, { evidence, researchState }) {
  const errors = [];
  if (!isObject(packet)) return ["Packet must be an object."];
  for (const field of ["schema_version", "artifact_type", "packet_version", "packet_id", "generated_at", "deterministic_content_sha256"]) requiredString(packet[field], field, errors);
  if (packet.schema_version !== CORNERSTONE_SCHEMA_VERSION) errors.push(`schema_version must be ${CORNERSTONE_SCHEMA_VERSION}.`);
  if (packet.artifact_type !== "cornerstone_research_packet") errors.push("artifact_type must be cornerstone_research_packet.");
  if (packet.packet_version !== CORNERSTONE_PACKET_VERSION) errors.push(`packet_version must be ${CORNERSTONE_PACKET_VERSION}.`);
  for (const field of ["identity", "search_demand", "intent", "serp", "competitor_coverage", "topic_model", "streetkingz_relevance", "evidence", "risks", "model_handoff"]) if (!isObject(packet[field])) errors.push(`${field} must be an object.`);
  requiredString(packet.identity?.topic, "identity.topic", errors); requiredString(packet.identity?.primary_query, "identity.primary_query", errors);
  if (!INTENTS.includes(packet.intent?.primary)) errors.push("intent.primary is invalid.");
  if (!CONFIDENCE_LEVELS.includes(packet.intent?.confidence)) errors.push("intent.confidence is invalid.");
  if (!TRACE_KINDS.includes(packet.intent?.trace?.kind)) errors.push("intent.trace.kind is invalid.");
  requiredArray(packet.search_demand?.supporting_queries, "search_demand.supporting_queries", errors);
  const queries = [packet.identity?.primary_query, ...(packet.search_demand?.supporting_queries || []).map((q) => q.query)];
  if (duplicates(queries)) errors.push("Primary and supporting queries must be unique.");
  const recordsById = new Map(evidence.records.map((record) => [record.evidence_id, record]));
  for (const [path, item] of [["primary_keyword", packet.search_demand?.primary_keyword], ...(packet.search_demand?.supporting_queries || []).map((item, index) => [`supporting_queries[${index}]`, item])]) {
    if (!item?.metrics) continue;
    const source = (item.evidence_ids || []).map((id) => recordsById.get(id)).find((record) => record?.evidence_type === "keyword_idea" && String(record.value?.keyword).normalize("NFKC").toLowerCase() === String(item.query).normalize("NFKC").toLowerCase());
    if (!source) errors.push(`search_demand.${path} metrics lack matching keyword evidence.`);
    else for (const field of ["monthly_search_volume", "cpc_usd", "paid_competition_level", "keyword_difficulty"]) if ((item.metrics[field] ?? null) !== (source.value[field] ?? null)) errors.push(`search_demand.${path}.metrics.${field} does not match source evidence.`);
  }
  for (const [index, result] of (packet.serp?.observed_results || []).entries()) {
    requiredString(result.url, `serp.observed_results[${index}].url`, errors);
    if (result.url) try { new URL(result.url); } catch { errors.push(`serp.observed_results[${index}].url is invalid.`); }
  }
  const canonical = (value) => { try { const url = new URL(value); url.hash = ""; url.search = ""; url.pathname = url.pathname.replace(/\/+$/, "") || "/"; return url.toString(); } catch { return null; } };
  const knownPages = new Set(researchState.site_pages.map((page) => canonical(page.url)));
  for (const link of packet.streetkingz_relevance?.possible_internal_links || []) if (!knownPages.has(canonical(link.destination_page))) errors.push(`Internal link destination is absent from site inventory: ${link.destination_page}.`);
  for (const item of packet.competitor_coverage?.weak_or_missing_coverage || []) if (item.kind !== "judgement_required") errors.push("Competitor gap claims without page-level evidence must be judgement_required.");
  if (!CANNIBALISATION_ACTIONS.includes(packet.risks?.cannibalisation?.recommended_action)) errors.push("Cannibalisation action is invalid.");
  validateEvidenceRefs(packet, new Set(evidence.records.map((record) => record.evidence_id)), errors);
  return errors;
}

export function validateCornerstoneBrief(brief, { packet, evidence }) {
  const errors = [];
  if (!isObject(brief)) return ["Brief must be an object."];
  for (const field of ["schema_version", "artifact_type", "brief_version", "brief_id", "packet_id", "topic", "primary_query", "target_reader", "reader_problem", "title_direction", "h1_direction", "conversion_opportunity", "human_review_state", "deterministic_content_sha256"]) requiredString(brief[field], field, errors);
  if (brief.schema_version !== CORNERSTONE_SCHEMA_VERSION) errors.push(`schema_version must be ${CORNERSTONE_SCHEMA_VERSION}.`);
  if (brief.artifact_type !== "cornerstone_content_brief") errors.push("artifact_type must be cornerstone_content_brief.");
  if (brief.brief_version !== CORNERSTONE_BRIEF_VERSION) errors.push(`brief_version must be ${CORNERSTONE_BRIEF_VERSION}.`);
  if (brief.packet_id !== packet.packet_id) errors.push("brief.packet_id must match packet.packet_id.");
  if (brief.human_review_state !== "awaiting_human_review") errors.push("human_review_state must be awaiting_human_review.");
  for (const field of ["supporting_queries", "entities_concepts", "required_questions", "relevant_streetkingz_products", "internal_link_opportunities", "evidence_requirements", "claims_requiring_caution", "recommended_article_structure", "do_cover", "do_not_cover", "open_questions"]) requiredArray(brief[field], field, errors, ["recommended_article_structure", "do_cover", "do_not_cover", "open_questions"].includes(field));
  if (!INTENTS.includes(brief.search_intent?.primary)) errors.push("search_intent.primary is invalid.");
  if (!CONFIDENCE_LEVELS.includes(brief.confidence?.level)) errors.push("confidence.level is invalid.");
  if (duplicates((brief.recommended_article_structure || []).map((s) => s.section))) errors.push("recommended_article_structure contains duplicate sections.");
  if (duplicates([brief.primary_query, ...(brief.supporting_queries || []).map((q) => q.query)])) errors.push("Brief queries must be unique.");
  validateEvidenceRefs(brief, new Set(evidence.records.map((record) => record.evidence_id)), errors);
  return errors;
}

export function assertCornerstoneValid(name, value, validator, context) {
  const errors = validator(value, context);
  if (errors.length) { const error = new Error(`${name} failed validation.`); error.validation_errors = errors; throw error; }
  return value;
}
