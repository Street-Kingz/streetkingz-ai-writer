import { sha256 } from "../research/core/canonical.js";

const clone = (value) => structuredClone(value);

function diffPaths(before, after, path = "$", output = []) {
  if (Object.is(before, after)) return output;
  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length) output.push(path);
    const length = Math.min(before.length, after.length);
    for (let index = 0; index < length; index += 1) diffPaths(before[index], after[index], `${path}[${index}]`, output);
    return output;
  }
  if (before && after && typeof before === "object" && typeof after === "object" && !Array.isArray(before) && !Array.isArray(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    for (const key of keys) if (!(key in before) || !(key in after)) output.push(`${path}.${key}`); else diffPaths(before[key], after[key], `${path}.${key}`, output);
    return output;
  }
  output.push(path);
  return output;
}

export function customerFacingProjection(page) {
  const value = clone(page);
  delete value.validation_metadata;
  return value;
}

export function bindRevisionToImmediateSource({ revision, immediateSourcePage, expectedImmediateSourceHash }) {
  const actualImmediateSourceHash = sha256(immediateSourcePage);
  if (actualImmediateSourceHash !== expectedImmediateSourceHash) throw new Error("Immediate revision source hash mismatch.");
  const declared = revision?.page?.validation_metadata?.source_semantic_page_hash;
  if (typeof declared !== "string") throw new Error("Revision source binding is missing.");
  const immediateParent = immediateSourcePage?.validation_metadata?.source_semantic_page_hash ?? null;
  if (declared !== expectedImmediateSourceHash && declared !== immediateParent) throw new Error("Revision declares neither its immediate source nor the immediate source's auditable parent.");
  const correctedRevision = clone(revision);
  correctedRevision.page.validation_metadata.source_semantic_page_hash = expectedImmediateSourceHash;
  const changedPaths = diffPaths(revision, correctedRevision);
  const allowedPath = "$.page.validation_metadata.source_semantic_page_hash";
  if (changedPaths.length !== (declared === expectedImmediateSourceHash ? 0 : 1) || changedPaths.some((path) => path !== allowedPath)) throw new Error("Metadata-only source correction changed an unauthorised path.");
  const visibleBefore = customerFacingProjection(revision.page);
  const visibleAfter = customerFacingProjection(correctedRevision.page);
  const visibleBeforeHash = sha256(visibleBefore);
  const visibleAfterHash = sha256(visibleAfter);
  if (visibleBeforeHash !== visibleAfterHash) throw new Error("Customer-facing content changed during source correction.");
  return {
    revision: correctedRevision,
    audit: {
      schema_version: "1.0.0",
      artifact_type: "revision_immediate_source_binding",
      declared_source_hash: declared,
      immediate_source_hash: expectedImmediateSourceHash,
      immediate_source_parent_hash: immediateParent,
      correction_required: declared !== expectedImmediateSourceHash,
      changed_paths: changedPaths,
      customer_facing_hash_before: visibleBeforeHash,
      customer_facing_hash_after: visibleAfterHash,
      customer_facing_content_changed: false,
      historical_artifacts_modified: false
    }
  };
}

