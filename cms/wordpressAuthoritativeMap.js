import { sha256, stableId } from "../research/core/canonical.js";
import { normaliseText, textFromHtml } from "../verification/currentPage.js";

const LIVE_HASH = "a5db743344a3c3bd732fa0acddb20df1bbe9a4097d9ba1f9070264e1f93b8c5f";
const BLOCKED = Object.freeze(["slug", "metadata", "schema", "layout", "images", "pricing", "inventory", "product_attributes", "specifications", "care_usage", "internal_links", "additional_faqs", "differentiation"]);

function record({ source, current, candidate, status, operation, survives = [], removed = [], reason }) {
  return { source, exact_current_value: current, authoritative_value_sha256: sha256(current), rollback_value: current, approved_candidate: candidate, implementation_status: status, operation, content_that_survives: survives, content_that_would_be_removed: removed, reason };
}

export function buildAuthoritativeCmsFieldMap({ authoritativePost, widgets, finalReview, verification }) {
  const decisions = new Map(finalReview.decisions.map((item) => [item.decision_area, item]));
  const live = new Map(verification.implementation_mappings.map((item) => [item.decision_area, item]));
  const excerptText = textFromHtml(authoritativePost.fields.post_excerpt);
  const excerptItems = [...authoritativePost.fields.post_excerpt.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => textFromHtml(match[1]));
  const targetClaims = ["Extreme absorbency", "Safe on all paint"];
  const extraExcerpt = excerptItems.filter((item) => !targetClaims.some((target) => normaliseText(item) === normaliseText(target)));
  const descriptionText = textFromHtml(widgets.description.exact_stored_value);
  const comparisonText = textFromHtml(widgets.comparison_answer.exact_stored_value);
  const safetyText = textFromHtml(widgets.detailed_safety_answer.exact_stored_value);
  const descriptionSource = live.get("product_description_benefits").current_live_content;
  const concepts = [
    ["90 × 60 cm sizing/control", /90\s*[×x]\s*60\s*cm/i], ["heavy-rinse positioning", /heavy rinse[- ]?downs?/i],
    ["lay/pat/glide usage", /lay it flat[\s\S]*pat dry[\s\S]*glide/i], ["wettest-panels wording", /wettest panels/i],
    ["construction", /(1200GSM|dual-sided|double-sided|plush)/i], ["water holding", /(holds? a serious amount of water|pull water)/i],
    ["benefits", /(fewer passes|faster drying|less contact)/i], ["intended use", /(larger vehicles|cars|SUVs|vans)/i]
  ].map(([name, pattern]) => ({ concept: name, current_supported: pattern.test(descriptionText), candidate_supported: pattern.test(decisions.get("product_description_benefits").final_wording) }));
  const omitted = concepts.filter((item) => item.current_supported && !item.candidate_supported).map((item) => item.concept);
  const title = record({ source: "wp_posts.post_title", current: authoritativePost.fields.post_title, candidate: decisions.get("title_headings").final_wording, status: "SAFE_TO_WRITE_AFTER_HUMAN_APPROVAL", operation: "replace_field", survives: ["post_name/slug", "all unrelated fields"], removed: [authoritativePost.fields.post_title], reason: "Raw post_title is authoritative and the slug remains explicitly excluded." });
  const description = record({ source: "wp_postmeta._elementor_data#c80e718.settings.editor", current: widgets.description.exact_stored_value, candidate: decisions.get("product_description_benefits").final_wording, status: omitted.length ? "REQUIRES_HUMAN_COPY_MERGE" : "SAFE_TO_WRITE_AFTER_HUMAN_APPROVAL", operation: omitted.length ? "human_merge_then_patch_property" : "patch_property", survives: ["all unrelated Elementor elements", ...descriptionSource], removed: omitted, reason: omitted.length ? "The approved candidate omits useful concepts present in the authoritative widget." : "The candidate preserves the authoritative widget's useful concepts." });
  description.content_inventory = concepts;
  const comparisonMatchesLive = normaliseText(comparisonText) === normaliseText(live.get("comparisons").current_live_content[0].split("\n").slice(1).join("\n"));
  const comparison = record({ source: "wp_postmeta._elementor_data#40869c27.settings.editor", current: widgets.comparison_answer.exact_stored_value, candidate: decisions.get("comparisons").final_wording, status: comparisonMatchesLive ? "SAFE_TO_WRITE_AFTER_HUMAN_APPROVAL" : "BLOCKED", operation: "patch_property", survives: ["accordion 4691e088", "FAQ question", "all other accordion items"], removed: [comparisonText], reason: comparisonMatchesLive ? "Only the exact comparison answer widget property needs replacement." : "Authoritative comparison value does not match the verified live target." });
  const claimsPresent = targetClaims.every((claim) => normaliseText(excerptText).includes(normaliseText(claim)));
  const clarity = record({ source: "wp_posts.post_excerpt", current: authoritativePost.fields.post_excerpt, candidate: decisions.get("clarity_trust").final_wording, status: claimsPresent ? (extraExcerpt.length ? "REQUIRES_HUMAN_CHANGE" : "SAFE_TO_WRITE_AFTER_HUMAN_APPROVAL") : "BLOCKED", operation: extraExcerpt.length ? "partial_replace_excerpt_items" : "replace_field", survives: [...extraExcerpt, `Detailed safety widget 43d7d6f0: ${safetyText}`], removed: targetClaims, reason: extraExcerpt.length ? "The raw excerpt contains additional useful list items which must survive a bounded partial replacement." : "The raw excerpt contains only the two authorised short claims." });
  const core = { schema_version: "1.0.0", artifact_type: "wordpress_authoritative_cms_field_map", post_id: authoritativePost.post_id, retrieval_provenance: authoritativePost.provenance, authoritative_fields: authoritativePost.fields, authoritative_hashes: authoritativePost.hashes, authoritative_rollback_values: authoritativePost.rollback_values, elementor_document: { exact_raw_value: authoritativePost.meta._elementor_data, sha256: authoritativePost.hashes._elementor_data }, elementor_widgets: widgets, mappings: { title_headings: title, product_description_benefits: description, comparisons: comparison, clarity_trust: clarity }, unresolved_mappings: [], blocked_fields: [...BLOCKED], drift_guards: { verified_live_hash: LIVE_HASH, authoritative_cms_hashes: true, on_mismatch: "STOP_AND_REVERIFY" }, approval_state: "awaiting_human_implementation_approval", write_operations_performed: 0, publication_allowed: false };
  return { ...core, cms_field_map_id: stableId("authoritative_cms_field_map", core), cms_field_map_sha256: sha256(core) };
}

export function validateAuthoritativeCmsFieldMap(map) {
  const errors = [];
  if (map.drift_guards.verified_live_hash !== LIVE_HASH) errors.push({ code: "LIVE_HASH_MISSING" });
  if (map.write_operations_performed !== 0 || map.publication_allowed !== false) errors.push({ code: "WRITE_AUTHORISED" });
  for (const [area, item] of Object.entries(map.mappings)) {
    if (sha256(item.exact_current_value) !== item.authoritative_value_sha256) errors.push({ code: "VALUE_HASH_MISMATCH", area });
    if (item.rollback_value !== item.exact_current_value) errors.push({ code: "ROLLBACK_MISMATCH", area });
  }
  for (const field of BLOCKED) if (!map.blocked_fields.includes(field)) errors.push({ code: "BLOCKED_FIELD_MISSING", field });
  if (!map.mappings.clarity_trust.content_that_survives.some((item) => /43d7d6f0/.test(item))) errors.push({ code: "SAFETY_WIDGET_UNPROTECTED" });
  return errors;
}
