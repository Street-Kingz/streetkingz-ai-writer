import { sha256, stableId } from "../research/core/canonical.js";
import { normaliseText, textFromHtml } from "../verification/currentPage.js";

const BLOCKED_FIELDS = Object.freeze(["post_name", "metadata", "schema", "images", "pricing", "inventory", "product_attributes", "layout", "specifications", "care_usage", "internal_links", "additional_faqs", "differentiation"]);

function decodeAttribute(value) {
  return String(value || "").replace(/&amp;|&#038;/gi, "&");
}

export function resolveWordPressProductResource(pageHtml, canonicalUrl) {
  const restHref = [...String(pageHtml).matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*type=["']application\/json["'][^>]*href=["']([^"']*\/wp-json\/wp\/v2\/product\/(\d+)[^"']*)["'][^>]*>/gi)][0]
    || [...String(pageHtml).matchAll(/<link\b[^>]*href=["']([^"']*\/wp-json\/wp\/v2\/product\/(\d+)[^"']*)["'][^>]*rel=["']alternate["'][^>]*>/gi)][0];
  const bodyId = String(pageHtml).match(/\bpostid-(\d+)\b/i)?.[1] || null;
  const gtmRaw = String(pageHtml).match(/name=["']gtm4wp_product_data["'][^>]*value=["']([^"']*)["']/i)?.[1] || "";
  const gtmId = gtmRaw.match(/&quot;internal_id&quot;:(\d+)/i)?.[1] || null;
  if (!restHref) throw Object.assign(new Error("The verified page does not expose a WordPress product REST resource."), { code: "CMS_RESOURCE_NOT_FOUND" });
  const endpoint = new URL(decodeAttribute(restHref[1]), canonicalUrl);
  const restId = restHref[2];
  const observedIds = [restId, bodyId, gtmId].filter(Boolean);
  if (new Set(observedIds).size !== 1) throw Object.assign(new Error("WordPress product IDs disagree across deterministic page signals."), { code: "CMS_PRODUCT_ID_AMBIGUOUS", observedIds });
  endpoint.search = "";
  endpoint.searchParams.set("context", "view");
  return {
    product_post_id: Number(restId), endpoint: endpoint.href,
    signals: { rest_resource: Number(restId), body_class: bodyId ? Number(bodyId) : null, gtm_internal_id: gtmId ? Number(gtmId) : null }
  };
}

function includesRendered(rendered, value) {
  return normaliseText(rendered).includes(normaliseText(value));
}

function fieldRecord({ storageType, identifier, currentStoredValue, currentRenderedValue, rawAvailable, targetContent, status, reason, representation }) {
  return {
    cms_storage_type: storageType,
    field_identifier: identifier,
    current_stored_value: currentStoredValue,
    current_rendered_value: currentRenderedValue,
    current_value_representation: representation || (rawAvailable ? "raw" : "rest_rendered_view"),
    raw_stored_value_available: rawAvailable,
    cms_hash_guard_eligible: rawAvailable,
    rollback_source_complete: rawAvailable,
    cms_current_value_sha256: sha256(currentStoredValue),
    target_content: targetContent,
    mapping_status: status,
    mapping_reason: reason
  };
}

function elementorWidget(pageHtml, text) {
  const index = String(pageHtml).indexOf(text);
  if (index < 0) return null;
  const prefix = String(pageHtml).slice(0, index);
  const start = prefix.lastIndexOf('<div class="elementor-element ');
  const tag = start >= 0 ? String(pageHtml).slice(start, String(pageHtml).indexOf(">", start) + 1) : "";
  return tag.match(/data-id="([a-f0-9]+)"/i)?.[1] || null;
}

export function buildCmsFieldMap({ cmsResponse, cmsRetrieval, resource, verification, finalReview, pageHtml = "" }) {
  if (cmsResponse?.id !== resource.product_post_id) throw Object.assign(new Error("CMS response product ID does not match the verified page."), { code: "CMS_PRODUCT_ID_MISMATCH" });
  const decisions = new Map(finalReview.decisions.map((item) => [item.decision_area, item]));
  const mappings = new Map(verification.implementation_mappings.map((item) => [item.decision_area, item]));
  const titleRendered = textFromHtml(cmsResponse.title?.rendered || "");
  const contentRendered = cmsResponse.content?.rendered || "";
  const excerptRendered = cmsResponse.excerpt?.rendered || "";
  const titleLive = mappings.get("title_headings").current_live_content[0];
  const descriptionLive = mappings.get("product_description_benefits").current_live_content;
  const comparisonLive = mappings.get("comparisons").current_live_content[0];
  const trustLive = mappings.get("clarity_trust").current_live_content;
  const safetyPreserve = mappings.get("clarity_trust").preserve_current_content || [];
  const titleMapped = normaliseText(titleRendered) === normaliseText(titleLive);
  const descriptionMapped = descriptionLive.every((text) => includesRendered(contentRendered, text));
  const comparisonMapped = includesRendered(contentRendered, comparisonLive);
  const trustMapped = trustLive.every((text) => includesRendered(excerptRendered, text));
  const safetyMapped = safetyPreserve.every((text) => includesRendered(contentRendered, text));
  const rawContentAvailable = typeof cmsResponse.content?.raw === "string";
  const rawExcerptAvailable = typeof cmsResponse.excerpt?.raw === "string";
  const rawTitleAvailable = typeof cmsResponse.title?.raw === "string";
  const descriptionWidget = elementorWidget(pageHtml, descriptionLive[0]);
  const comparisonAnswer = comparisonLive.split("\n").slice(1).join("\n");
  const comparisonWidget = elementorWidget(pageHtml, comparisonAnswer);
  const safetyAnswer = safetyPreserve[0]?.split("\n").slice(1).join("\n") || "";
  const safetyWidget = elementorWidget(pageHtml, safetyAnswer);

  const title = fieldRecord({
    storageType: "wp_posts", identifier: "post_title", currentStoredValue: rawTitleAvailable ? cmsResponse.title.raw : titleRendered,
    currentRenderedValue: titleLive, rawAvailable: rawTitleAvailable, targetContent: decisions.get("title_headings").final_wording,
    status: titleMapped ? "SAFE_TO_WRITE_AFTER_HUMAN_APPROVAL" : "BLOCKED",
    reason: titleMapped ? "The public product REST title matches the unique verified H1." : "The CMS title does not match the verified H1."
  });
  title.side_effect_boundaries = { slug_field: "post_name", slug_current_value: cmsResponse.slug, slug_change_authorised: false, navigation_or_schema_may_consume_title: true };

  const description = fieldRecord({
    storageType: descriptionWidget ? "elementor_rendered_widget" : "unknown", identifier: descriptionWidget ? `widget:${descriptionWidget}:text-editor` : "unknown",
    currentStoredValue: descriptionLive.join("\n\n"), currentRenderedValue: descriptionLive.join("\n\n"), rawAvailable: false, representation: "rendered_elementor_widget",
    targetContent: decisions.get("product_description_benefits").final_wording,
    status: "BLOCKED",
    reason: descriptionWidget ? "All three live paragraphs render from one Elementor text widget, but its raw _elementor_data value is unavailable and the approved copy requires a human merge." : "The live description's CMS owner could not be identified."
  });
  description.current_concepts = [
    "ultra-dense 1200GSM dual-sided microfibre construction", "heavy-rinse positioning", "90 × 60 cm sizing and control",
    "fewer passes, faster drying and reduced paint contact", "double-sided plush water holding", "lay / pat / glide usage", "wettest panels wording"
  ];
  description.content_that_survives_unchanged = ["How to use it section", "Tech Specs section", "FAQ section", "all unrelated post_content sections"];
  description.content_that_would_be_removed_by_verbatim_section_replacement = descriptionLive.filter((paragraph) => !normaliseText(decisions.get("product_description_benefits").final_wording).includes(normaliseText(paragraph)));
  description.proposed_operation = "requires_human_copy_merge";

  const comparison = fieldRecord({
    storageType: comparisonWidget ? "elementor_rendered_widget" : "unknown", identifier: comparisonWidget ? `nested-accordion:4691e088/answer-widget:${comparisonWidget}` : "unknown",
    currentStoredValue: comparisonLive, currentRenderedValue: comparisonLive, rawAvailable: false, representation: "rendered_elementor_widget",
    targetContent: decisions.get("comparisons").final_wording, status: "BLOCKED",
    reason: comparisonWidget ? "The unique comparison answer renders from an Elementor nested-accordion text widget, but raw _elementor_data is unavailable for a bounded replacement." : "The comparison FAQ's CMS owner could not be identified."
  });
  comparison.proposed_operation = "requires_raw_elementor_data";
  comparison.content_that_survives_unchanged = ["FAQ question", "all other FAQs", "all non-comparison post_content"];
  comparison.content_that_would_be_removed = [mappings.get("comparisons").current_live_content[0].split("\n").slice(1).join("\n")];

  const clarityTrust = fieldRecord({
    storageType: "wp_posts", identifier: "post_excerpt", currentStoredValue: rawExcerptAvailable ? cmsResponse.excerpt.raw : excerptRendered,
    currentRenderedValue: trustLive.join("\n"), rawAvailable: rawExcerptAvailable, targetContent: decisions.get("clarity_trust").final_wording,
    status: trustMapped && safetyMapped ? (rawExcerptAvailable ? "SAFE_TO_WRITE_AFTER_HUMAN_APPROVAL" : "REQUIRES_HUMAN_CHANGE") : "BLOCKED",
    reason: trustMapped && safetyMapped ? "The two short claims are rendered from post_excerpt, while the detailed safety FAQ remains separately in post_content." : "The short claims or detailed safety guidance could not be mapped to separate CMS fields."
  });
  clarityTrust.proposed_operation = rawExcerptAvailable ? "partial_replace_excerpt_items" : "requires_raw_post_excerpt";
  clarityTrust.content_that_survives_unchanged = ["1200GSM dual layer thickness", "Soft premium feel", "Ideal for larger vehicles", ...safetyPreserve];
  clarityTrust.content_that_would_be_removed = trustLive;
  clarityTrust.detailed_safety_guidance_source = safetyWidget ? `elementor_rendered_widget:nested-accordion:4691e088/answer-widget:${safetyWidget}` : "unknown";

  const core = {
    schema_version: "1.0.0", artifact_type: "wordpress_product_cms_field_map", product_post_id: cmsResponse.id,
    target_url: verification.target_url, cms_resource: resource, cms_retrieval: cmsRetrieval,
    verified_live_content_hash: verification.verified_content_hash,
    source_verification_sha256: verification.verification_sha256,
    source_final_review_sha256: finalReview.source_sha256,
    cms_record: { id: cmsResponse.id, type: cmsResponse.type, status: cmsResponse.status, slug: cmsResponse.slug, link: cmsResponse.link, modified: cmsResponse.modified, template: cmsResponse.template },
    field_mappings: { title_headings: title, product_description_benefits: description, comparisons: comparison, clarity_trust: clarityTrust },
    unknown_cms_ownership: [
      "raw Elementor _elementor_data for widgets c80e718, 40869c27 and 43d7d6f0",
      ...(rawExcerptAvailable ? [] : ["raw post_excerpt representation"]),
      "theme/template rendering internals beyond the public REST field relationship"
    ],
    blocked_fields: [...BLOCKED_FIELDS],
    write_operations_performed: 0,
    approval_state: "awaiting_human_implementation_approval",
    publication_allowed: false,
    guards: { live_hash_required: verification.verified_content_hash, cms_value_hashes_required: true, on_mismatch: "STOP_AND_REVERIFY" }
  };
  return { ...core, cms_field_map_id: stableId("cms_field_map", core), cms_field_map_sha256: sha256(core) };
}

export function validateCmsFieldMap(fieldMap, { cmsResponse, verification, finalReview }) {
  const errors = [];
  if (fieldMap.product_post_id !== cmsResponse.id) errors.push({ code: "CMS_PRODUCT_ID_MISMATCH", path: "product_post_id" });
  if (fieldMap.verified_live_content_hash !== verification.verified_content_hash) errors.push({ code: "LIVE_HASH_MISMATCH", path: "verified_live_content_hash" });
  if (fieldMap.source_final_review_sha256 !== finalReview.source_sha256) errors.push({ code: "FINAL_REVIEW_MUTATED", path: "source_final_review_sha256" });
  if (fieldMap.write_operations_performed !== 0 || fieldMap.publication_allowed !== false) errors.push({ code: "WRITE_OR_PUBLICATION_AUTHORISED", path: "$" });
  const decisions = new Map(finalReview.decisions.map((item) => [item.decision_area, item]));
  for (const [area, mapping] of Object.entries(fieldMap.field_mappings || {})) {
    if (mapping.target_content !== decisions.get(area)?.final_wording) errors.push({ code: "APPROVED_COPY_CHANGED", path: `field_mappings.${area}.target_content` });
    if (mapping.cms_current_value_sha256 !== sha256(mapping.current_stored_value)) errors.push({ code: "CMS_VALUE_HASH_MISMATCH", path: `field_mappings.${area}.cms_current_value_sha256` });
    if (typeof mapping.current_stored_value !== "string" || !mapping.current_stored_value.length) errors.push({ code: "ROLLBACK_VALUE_MISSING", path: `field_mappings.${area}.current_stored_value` });
  }
  for (const blocked of BLOCKED_FIELDS) if (!fieldMap.blocked_fields.includes(blocked)) errors.push({ code: "BLOCKED_FIELD_NOT_PRESERVED", path: "blocked_fields", field: blocked });
  const description = fieldMap.field_mappings?.product_description_benefits;
  if (description?.content_that_would_be_removed_by_verbatim_section_replacement?.length
    && !["REQUIRES_HUMAN_COPY_MERGE", "BLOCKED"].includes(description.mapping_status)) {
    errors.push({ code: "DESTRUCTIVE_DESCRIPTION_REPLACEMENT", path: "field_mappings.product_description_benefits" });
  }
  const trust = fieldMap.field_mappings?.clarity_trust;
  if (!trust?.content_that_survives_unchanged?.some((item) => /scratch my paint/i.test(item))) errors.push({ code: "SAFETY_GUIDANCE_NOT_PRESERVED", path: "field_mappings.clarity_trust" });
  return errors;
}

export function validateCmsPreWrite(fieldMap, { currentLiveHash, currentCmsValues }) {
  const errors = [];
  if (currentLiveHash !== fieldMap.verified_live_content_hash) errors.push({ code: "LIVE_PAGE_DRIFT", expected: fieldMap.verified_live_content_hash, actual: currentLiveHash });
  for (const [area, mapping] of Object.entries(fieldMap.field_mappings)) {
    if (!mapping.cms_hash_guard_eligible) errors.push({ code: "RAW_CMS_VALUE_REQUIRED", area });
    const current = currentCmsValues?.[area];
    if (typeof current !== "string" || sha256(current) !== mapping.cms_current_value_sha256) errors.push({ code: "CMS_FIELD_DRIFT", area, expected: mapping.cms_current_value_sha256, actual: typeof current === "string" ? sha256(current) : null });
  }
  return { eligible: errors.length === 0, errors };
}
