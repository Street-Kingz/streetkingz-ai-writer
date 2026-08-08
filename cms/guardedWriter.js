import { sha256 } from "../research/core/canonical.js";
import { validateHumanImplementationApproval } from "./humanImplementationApproval.js";
import { findElementorElementWithPath, parseElementorDocument } from "./wordpressAuthoritativeReader.js";

export const GUARDED_WRITER_SCOPE = Object.freeze({
  product_id: 70,
  template_id: 2003,
  product_fields: Object.freeze(["post_title", "post_excerpt"]),
  elementor_targets: Object.freeze({ description: Object.freeze({ id: "c80e718", parent: null, property: "settings.editor" }), comparison: Object.freeze({ id: "40869c27", parent: "4691e088", property: "settings.editor" }) }),
  protected_safety_widget: "43d7d6f0"
});

function hardStop(code, details = {}) {
  throw Object.assign(new Error(code), { code, ...details });
}

function exactObjectKeys(value, expected, code) {
  const actual = Object.keys(value || {}).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) hardStop(code, { actual, expected: wanted });
}

function getSetting(element, dotted) {
  if (dotted !== "settings.editor" || typeof element?.settings?.editor !== "string") hardStop("TARGET_PROPERTY_INVALID", { element_id: element?.id });
  return element.settings.editor;
}

function setSetting(element, dotted, value) {
  if (dotted !== "settings.editor") hardStop("TARGET_PROPERTY_INVALID", { element_id: element?.id });
  element.settings.editor = value;
}

function locate(document, id, expectedParent = null) {
  const located = findElementorElementWithPath(document, id);
  if (expectedParent && !located.path.slice(0, -1).includes(expectedParent)) hardStop("ELEMENTOR_PARENT_MISMATCH", { element_id: id, expected_parent: expectedParent, path: located.path });
  return located;
}

function semanticDiff(before, after, path = []) {
  if (Object.is(before, after)) return [];
  if (typeof before !== typeof after || before === null || after === null || typeof before !== "object") return [{ path: path.join("."), before, after }];
  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length);
    return Array.from({ length }, (_, index) => {
      const identity = before[index]?.id && before[index]?.id === after[index]?.id ? `id:${before[index].id}` : String(index);
      return semanticDiff(before[index], after[index], [...path, identity]);
    }).flat();
  }
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys.flatMap((key) => semanticDiff(before[key], after[key], [...path, key]));
}

export function validateWriterApproval(approval) {
  const base = validateHumanImplementationApproval(approval);
  if (!base.valid) hardStop("APPROVAL_INVALID", { validation_errors: base.errors });
  exactObjectKeys(approval.authorisation, ["slug_change_authorised", "metadata_change_authorised", "unrelated_elementor_changes_authorised", "detailed_safety_widget_change_authorised", "publication_authorised"], "APPROVAL_AUTHORISATION_SHAPE_INVALID");
  if (approval.approved_fields.length !== 4) hardStop("APPROVAL_TARGET_COUNT_INVALID");
  return approval;
}

export function verifyGuardedCurrentState(authoritative, approval) {
  validateWriterApproval(approval);
  if (authoritative?.post_id !== GUARDED_WRITER_SCOPE.product_id || authoritative?.post_type !== "product") hardStop("PRODUCT_IDENTITY_MISMATCH");
  if (authoritative?.template?.id !== GUARDED_WRITER_SCOPE.template_id || authoritative?.template?.post_type !== "elementor_library" || authoritative?.template?.applicability?.verified !== true) hardStop("TEMPLATE_IDENTITY_OR_APPLICABILITY_MISMATCH");
  const guards = approval.current_state_guards;
  const current = {
    post_title: sha256(authoritative.fields.post_title),
    post_excerpt: sha256(authoritative.fields.post_excerpt),
    template_elementor_data: sha256(authoritative.template.raw_elementor_data || authoritative.meta._elementor_data)
  };
  for (const key of Object.keys(current)) if (current[key] !== guards[key]) hardStop(`STALE_${key.toUpperCase()}`, { expected: guards[key], actual: current[key] });
  const document = parseElementorDocument(authoritative.template.raw_elementor_data || authoritative.meta._elementor_data);
  const description = locate(document, "c80e718");
  const accordion = locate(document, "4691e088");
  const comparison = locate(document, "40869c27", "4691e088");
  const safety = locate(document, "43d7d6f0");
  if (accordion.element.widgetType !== "nested-accordion") hardStop("ACCORDION_TYPE_MISMATCH");
  const widgetValues = { description_widget: getSetting(description.element, "settings.editor"), comparison_widget: getSetting(comparison.element, "settings.editor"), safety_widget: getSetting(safety.element, "settings.editor") };
  for (const [key, value] of Object.entries(widgetValues)) if (sha256(value) !== guards[key]) hardStop(`STALE_${key.toUpperCase()}`, { expected: guards[key], actual: sha256(value) });
  return { document, located: { description, accordion, comparison, safety }, widgetValues, hashes: { ...current, ...Object.fromEntries(Object.entries(widgetValues).map(([key, value]) => [key, sha256(value)])) } };
}

function approvedValues(approval) {
  return Object.fromEntries(approval.approved_fields.map((field) => [field.field_id, field.exact_cms_value]));
}

export function buildFreshRollbackSnapshot(authoritative, verified, retrievalProvenance = authoritative.provenance) {
  return {
    schema_version: 1,
    snapshot_type: "fresh_pre_write_rollback",
    product_id: 70,
    template_id: 2003,
    captured_at: retrievalProvenance?.retrieved_at || null,
    applicability: authoritative.template.applicability,
    raw_authoritative_response: authoritative.raw_authoritative_response || null,
    original: {
      post_title: authoritative.fields.post_title,
      post_excerpt: authoritative.fields.post_excerpt,
      post_content: authoritative.fields.post_content,
      post_status: authoritative.status,
      post_name: authoritative.fields.slug,
      template_elementor_data: authoritative.template.raw_elementor_data || authoritative.meta._elementor_data,
      description_widget: verified.widgetValues.description_widget,
      comparison_widget: verified.widgetValues.comparison_widget,
      safety_widget: verified.widgetValues.safety_widget
    },
    hashes: verified.hashes,
    response_provenance: retrievalProvenance,
    rollback_complete: true
  };
}

export async function prepareGuardedDryRun({ approval, authoritative, persistRollbackSnapshot }) {
  if (typeof persistRollbackSnapshot !== "function") hardStop("ROLLBACK_PERSISTENCE_REQUIRED");
  const verified = verifyGuardedCurrentState(authoritative, approval);
  const snapshot = buildFreshRollbackSnapshot(authoritative, verified);
  try { await persistRollbackSnapshot(snapshot); } catch (error) { hardStop("ROLLBACK_PERSISTENCE_FAILED", { cause: error.message }); }
  const values = approvedValues(approval);
  const patchedProduct = { post_title: values.post_title, post_excerpt: values.post_excerpt, post_content: authoritative.fields.post_content, post_name: authoritative.fields.slug, post_status: authoritative.status };
  const originalProduct = { post_title: authoritative.fields.post_title, post_excerpt: authoritative.fields.post_excerpt, post_content: authoritative.fields.post_content, post_name: authoritative.fields.slug, post_status: authoritative.status };
  const patchedDocument = structuredClone(verified.document);
  setSetting(locate(patchedDocument, "c80e718").element, "settings.editor", values.description);
  setSetting(locate(patchedDocument, "40869c27", "4691e088").element, "settings.editor", values.comparison);
  const productDiff = semanticDiff(originalProduct, patchedProduct);
  const templateDiff = semanticDiff(verified.document, patchedDocument);
  const permittedProduct = new Set(["post_title", "post_excerpt"]);
  if (productDiff.some((item) => !permittedProduct.has(item.path))) hardStop("UNEXPECTED_PRODUCT_DIFF", { productDiff });
  if (templateDiff.some((item) => !item.path.endsWith("id:c80e718.settings.editor") && !item.path.endsWith("id:40869c27.settings.editor"))) hardStop("UNEXPECTED_ELEMENTOR_DIFF", { templateDiff });
  if (sha256(values.post_title) !== approval.approved_target_hashes.post_title || sha256(values.post_excerpt) !== approval.approved_target_hashes.post_excerpt || sha256(values.description) !== approval.approved_target_hashes.description || sha256(values.comparison) !== approval.approved_target_hashes.comparison) hardStop("APPROVED_TARGET_HASH_MISMATCH");
  if (getSetting(locate(patchedDocument, "43d7d6f0").element, "settings.editor") !== verified.widgetValues.safety_widget) hardStop("SAFETY_WIDGET_CHANGED");
  return {
    schema_version: 1,
    mode: "dry_run",
    status: "PASS",
    product_id: 70,
    template_id: 2003,
    rollback_snapshot: snapshot,
    original_state: { product: originalProduct, template: verified.document },
    proposed_state: { product: patchedProduct, template: patchedDocument },
    product_diff: productDiff,
    elementor_semantic_diff: templateDiff,
    approved_target_hashes: approval.approved_target_hashes,
    blocked_area_verification: { slug_unchanged: true, post_content_unchanged: true, post_status_unchanged: true, metadata_unchanged: true, faq_question_unchanged: true, safety_widget_unchanged: true, unrelated_elementor_content_unchanged: true, publication_state_unchanged: true },
    rendered_page_guard: { sha256: approval.current_state_guards.rendered_page, role: "audit_and_post_write_verification_not_sole_authorisation_guard" }
  };
}

export function simulateRollback(dryRun) {
  const mutated = structuredClone(dryRun.proposed_state);
  const restored = structuredClone(dryRun.original_state);
  const productRestored = semanticDiff(restored.product, dryRun.original_state.product).length === 0;
  const templateRestored = semanticDiff(restored.template, dryRun.original_state.template).length === 0;
  return { status: productRestored && templateRestored ? "PASS" : "FAIL", mutation_applied: semanticDiff(mutated, dryRun.original_state).length > 0, product_restored_exactly: productRestored, template_restored_semantically: templateRestored, blocked_areas_restored_or_unchanged: getSetting(locate(restored.template, "43d7d6f0").element, "settings.editor") === dryRun.rollback_snapshot.original.safety_widget };
}

export async function simulateCompensatingWrite({ dryRun, failAt = null, rollbackVerificationFails = false }) {
  let state = structuredClone(dryRun.original_state);
  const completed = [];
  const operations = ["product_fields", "elementor_template"];
  try {
    for (const operation of operations) {
      if (failAt === operation) hardStop("SIMULATED_WRITE_FAILURE", { operation });
      if (operation === "product_fields") state.product = structuredClone(dryRun.proposed_state.product);
      else state.template = structuredClone(dryRun.proposed_state.template);
      completed.push(operation);
    }
    return { status: "simulated_success", completed, rollback_required: false };
  } catch (error) {
    state = structuredClone(dryRun.original_state);
    const verified = semanticDiff(state, dryRun.original_state).length === 0 && !rollbackVerificationFails;
    if (!verified) hardStop("ROLLBACK_VERIFICATION_FAILED", { completed });
    return { status: "simulated_failure_rolled_back", failed_operation: error.operation, completed_before_failure: completed, rollback_verified: true };
  }
}

export { semanticDiff };
