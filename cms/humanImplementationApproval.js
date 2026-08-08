import { sha256 } from "../research/core/canonical.js";
import { normaliseText } from "../verification/currentPage.js";
import { validateImplementationCmsValue } from "./implementationValueValidator.js";

export const APPROVED_IMPLEMENTATION_VALUES = Object.freeze({
  post_title: "Heavy Duty Car Drying Towel – 1200GSM",
  description: "<p>Built for faster, easier vehicle drying, this Heavy Duty microfibre car drying towel uses a 1200GSM dual-layer, double-sided plush construction to pull water from paint with fewer passes and less contact. That helps reduce streaks, smears and unwanted marks, while the 90 × 60 cm size balances coverage with control.</p>\n<p>Suitable for cars, SUVs and vans—especially larger vehicles and heavy rinse-downs—it can be used on clean, shampooed paintwork, glass and exterior plastics.</p>\n<p>Lay it flat, pat dry or glide it across even the wettest panels.</p>",
  comparison: "<p>Choose the Heavy Duty 1200GSM if you prefer a thicker, double-sided towel that is smaller, heavier and more substantial in the hand. Choose the XL 800GSM if you prefer a larger, lighter towel that glides more easily.</p>",
  post_excerpt: "<ul class=\"a-unordered-list a-vertical a-spacing-mini\">\n \t<li>1200GSM dual-layer thickness</li>\n \t<li>Strong water-holding capacity, with a heavier feel once fully saturated</li>\n \t<li>Soft premium feel</li>\n \t<li>Suitable for paintwork when used correctly on a clean, shampooed surface</li>\n \t<li>Ideal for larger vehicles</li>\n</ul>"
});

export const APPROVED_NORMALIZED_VALUES = Object.freeze({
  post_title: APPROVED_IMPLEMENTATION_VALUES.post_title,
  description: "Built for faster, easier vehicle drying, this Heavy Duty microfibre car drying towel uses a 1200GSM dual-layer, double-sided plush construction to pull water from paint with fewer passes and less contact. That helps reduce streaks, smears and unwanted marks, while the 90 × 60 cm size balances coverage with control.\n\nSuitable for cars, SUVs and vans—especially larger vehicles and heavy rinse-downs—it can be used on clean, shampooed paintwork, glass and exterior plastics.\n\nLay it flat, pat dry or glide it across even the wettest panels.",
  comparison: "Choose the Heavy Duty 1200GSM if you prefer a thicker, double-sided towel that is smaller, heavier and more substantial in the hand. Choose the XL 800GSM if you prefer a larger, lighter towel that glides more easily.",
  post_excerpt: "1200GSM dual-layer thickness\nStrong water-holding capacity, with a heavier feel once fully saturated\nSoft premium feel\nSuitable for paintwork when used correctly on a clean, shampooed surface\nIdeal for larger vehicles"
});

export const CURRENT_STATE_GUARDS = Object.freeze({
  post_title: "70d2740df079f126b15fac1a79dbb579accf5cc9b3b8c0f69f2ab8d89496326a",
  post_excerpt: "42403585f01631a26e0ab3139ad11ad40874882d46dc70a94e756fc24e653675",
  template_elementor_data: "81991fbccece6edcedb9cd84fc4d8dca99765b473cf24b2f8df26b5946f91c01",
  description_widget: "72f9f609c59de983f61e8305d6cea67d8ae07d5743ca77e0d0efcd5fea2169b7",
  comparison_widget: "019780f33556ba09df132a4a92e473f2523fe41615c7f058916b96ebec31ba07",
  safety_widget: "bcf0b42d978be2f9caf218bfd55bab0bd902f05532e00868eae40fa06dc74bb6",
  rendered_page: "a5db743344a3c3bd732fa0acddb20df1bbe9a4097d9ba1f9070264e1f93b8c5f"
});

const FIELD_DEFINITIONS = Object.freeze({
  post_title: { target: { post_id: 70, field: "post_title" }, guard: "post_title" },
  description: { target: { template_id: 2003, meta_key: "_elementor_data", element_id: "c80e718", property: "settings.editor" }, guard: "description_widget", structure: { paragraphs: 3, lists: 0, items: 0 } },
  comparison: { target: { template_id: 2003, meta_key: "_elementor_data", element_id: "40869c27", property: "settings.editor", parent_element_id: "4691e088" }, guard: "comparison_widget", structure: { paragraphs: 1, lists: 0, items: 0 } },
  post_excerpt: { target: { post_id: 70, field: "post_excerpt" }, guard: "post_excerpt", structure: { paragraphs: 0, lists: 1, items: 5 } }
});

export function buildHumanImplementationApproval({ approvedAt, reviewArtifact, reviewArtifactSha256 }) {
  const approvedFields = Object.entries(FIELD_DEFINITIONS).map(([fieldId, definition]) => ({
    field_id: fieldId,
    status: "approved",
    cms_target: definition.target,
    exact_cms_value: APPROVED_IMPLEMENTATION_VALUES[fieldId],
    normalized_approved_representation: APPROVED_NORMALIZED_VALUES[fieldId],
    current_state_guard_sha256: CURRENT_STATE_GUARDS[definition.guard],
    approved_target_sha256: sha256(APPROVED_IMPLEMENTATION_VALUES[fieldId])
  }));
  return {
    schema_version: 1,
    product_id: 70,
    template_id: 2003,
    status: "approved",
    approval_timestamp: approvedAt,
    approval_source: "explicit_user_approval",
    source_review: { artifact: reviewArtifact, sha256: reviewArtifactSha256 },
    approved_fields: approvedFields,
    current_state_guards: { ...CURRENT_STATE_GUARDS },
    approved_target_hashes: Object.fromEntries(approvedFields.map((field) => [field.field_id, field.approved_target_sha256])),
    authorisation: {
      slug_change_authorised: false,
      metadata_change_authorised: false,
      unrelated_elementor_changes_authorised: false,
      detailed_safety_widget_change_authorised: false,
      publication_authorised: false
    },
    detailed_safety_widget: { template_id: 2003, element_id: "43d7d6f0", status: "blocked_unchanged" },
    future_write_requires_fresh_pre_write_snapshot: true
  };
}

export function validateHumanImplementationApproval(approval) {
  const errors = [];
  if (approval?.product_id !== 70) errors.push("PRODUCT_NOT_ALLOWLISTED");
  if (approval?.template_id !== 2003) errors.push("TEMPLATE_NOT_ALLOWLISTED");
  if (approval?.status !== "approved" || approval?.approval_source !== "explicit_user_approval") errors.push("INVALID_APPROVAL_STATE");
  if (!approval?.approval_timestamp) errors.push("MISSING_APPROVAL_TIMESTAMP");
  for (const [key, value] of Object.entries(approval?.authorisation || {})) if (value !== false) errors.push(`FORBIDDEN_AUTHORISATION:${key}`);
  const fields = approval?.approved_fields || [];
  if (fields.length !== Object.keys(FIELD_DEFINITIONS).length) errors.push("APPROVED_FIELD_COUNT");
  const seen = new Set();
  for (const field of fields) {
    if (seen.has(field.field_id)) errors.push(`DUPLICATE_FIELD:${field.field_id}`);
    seen.add(field.field_id);
    const definition = FIELD_DEFINITIONS[field.field_id];
    if (!definition) { errors.push(`BLOCKED_OR_UNKNOWN_FIELD:${field.field_id}`); continue; }
    if (JSON.stringify(field.cms_target) !== JSON.stringify(definition.target)) errors.push(`TARGET_OUTSIDE_ALLOWLIST:${field.field_id}`);
    if (field.exact_cms_value !== APPROVED_IMPLEMENTATION_VALUES[field.field_id]) errors.push(`APPROVED_VALUE_CHANGED:${field.field_id}`);
    if (field.approved_target_sha256 !== sha256(field.exact_cms_value)) errors.push(`TARGET_HASH_MISMATCH:${field.field_id}`);
    if (field.current_state_guard_sha256 !== CURRENT_STATE_GUARDS[definition.guard]) errors.push(`CURRENT_GUARD_MISMATCH:${field.field_id}`);
    if (field.normalized_approved_representation !== APPROVED_NORMALIZED_VALUES[field.field_id]) errors.push(`NORMALIZED_VALUE_CHANGED:${field.field_id}`);
    if (definition.structure) {
      const validation = validateImplementationCmsValue({ html: field.exact_cms_value, intendedText: field.normalized_approved_representation, expectedStructure: definition.structure });
      if (!validation.valid) errors.push(...validation.errors.map((error) => `${field.field_id}:${error}`));
      if (normaliseText(validation.rendered_text) !== normaliseText(field.normalized_approved_representation)) errors.push(`SEMANTIC_ROUND_TRIP:${field.field_id}`);
    }
  }
  for (const fieldId of Object.keys(FIELD_DEFINITIONS)) if (!seen.has(fieldId)) errors.push(`MISSING_FIELD:${fieldId}`);
  if (JSON.stringify(approval?.current_state_guards) !== JSON.stringify(CURRENT_STATE_GUARDS)) errors.push("CURRENT_STATE_GUARDS_CHANGED");
  if (approval?.detailed_safety_widget?.element_id !== "43d7d6f0" || approval?.detailed_safety_widget?.status !== "blocked_unchanged") errors.push("SAFETY_WIDGET_NOT_BLOCKED");
  if (approval?.future_write_requires_fresh_pre_write_snapshot !== true) errors.push("FRESH_SNAPSHOT_NOT_REQUIRED");
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
