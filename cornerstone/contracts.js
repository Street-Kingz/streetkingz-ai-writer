export const CORNERSTONE_SCHEMA_VERSION = "1.0.0";
export const CORNERSTONE_PACKET_VERSION = "1.0.0";
export const CORNERSTONE_BRIEF_VERSION = "1.0.0";

export const INTENTS = Object.freeze([
  "informational",
  "commercial_investigation",
  "transactional",
  "navigational",
  "mixed",
  "unclear"
]);

export const CONFIDENCE_LEVELS = Object.freeze(["low", "medium", "high"]);
export const TRACE_KINDS = Object.freeze(["observed_evidence", "deterministic_derivation", "judgement_required"]);
export const CANNIBALISATION_ACTIONS = Object.freeze([
  "proceed",
  "differentiate_intent",
  "consolidate",
  "update_existing_page_instead",
  "human_review_required"
]);

export const cornerstoneResearchPacketSchema = Object.freeze({
  $id: "streetkingz.cornerstone-research-packet.v1",
  required: [
    "schema_version", "artifact_type", "packet_version", "packet_id", "identity",
    "search_demand", "intent", "serp", "competitor_coverage", "topic_model",
    "streetkingz_relevance", "evidence", "risks", "model_handoff"
  ]
});

export const cornerstoneBriefSchema = Object.freeze({
  $id: "streetkingz.cornerstone-brief.v1",
  required: [
    "schema_version", "artifact_type", "brief_version", "brief_id", "packet_id",
    "topic", "primary_query", "search_intent", "target_reader", "reader_problem",
    "search_opportunity", "serp_observations", "competitor_coverage", "content_gaps",
    "supporting_queries", "entities_concepts", "required_questions",
    "relevant_streetkingz_products", "internal_link_opportunities", "evidence_requirements",
    "claims_requiring_caution", "title_direction", "h1_direction",
    "recommended_article_structure", "conversion_opportunity", "cannibalisation_assessment",
    "confidence", "freshness_requirements", "do_cover", "do_not_cover", "open_questions",
    "human_review_state"
  ]
});
