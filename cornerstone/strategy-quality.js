function text(strategy) { return JSON.stringify(strategy).toLowerCase(); }

export function reviewCornerstoneStrategyQuality(strategy, validation) {
  const body = text(strategy);
  const checks = {
    clear_article_outcome: strategy.strategy.reader_outcome.statement.trim().length >= 40,
    non_generic_angle: strategy.strategy.recommended_content_angle.statement.trim().length >= 50 && !/comprehensive (?:guide|article)/i.test(strategy.strategy.recommended_content_angle.statement),
    mixed_intent_handled: Boolean(strategy.strategy.secondary_intent) && /commercial|choose|selection|purchase|investigat/i.test(body) && /informational|practical|question|answer/i.test(body),
    product_recommendations_packet_backed: strategy.streetkingz_integration.genuinely_relevant_products.every((item) => Boolean(item.canonical_product)),
    commerce_not_forced: strategy.streetkingz_integration.forced_promotion_areas.length > 0,
    searcher_problem_addressed: strategy.priorities.must_cover_topics.length > 0 && strategy.structure.sections.length >= 3,
    uncertainty_preserved: strategy.evidence.missing_evidence.length > 0 || strategy.open_questions.length > 0,
    unsupported_competitor_gaps_absent: !validation.errors.some((item) => item.code === "UNSUPPORTED_COMPETITOR_CLAIM"),
    cannibalisation_actionable: strategy.cannibalisation.assessment.trim().length >= 30 && Boolean(strategy.cannibalisation.recommended_handling),
    usable_without_research_rediscovery: strategy.structure.sections.every((item) => item.purpose.trim() && Array.isArray(item.evidence_dependencies))
  };
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  return {
    schema_version: "1.0.0",
    artifact_type: "cornerstone_strategy_quality_review",
    status: failed.length ? "NEEDS_HUMAN_REVIEW" : "PASS",
    mechanically_valid: validation.status !== "FAIL",
    checks,
    failed_checks: failed,
    editorial_note: "This review checks usefulness signals without editing or silently improving the model response; final strategy approval remains human."
  };
}
