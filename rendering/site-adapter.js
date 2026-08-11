import { canonicalJson, sha256 } from "../research/core/canonical.js";

export const SITE_ADAPTER_VERSION = "1.0.0";
export const ADAPTER_MAPPING_STATES = Object.freeze(["NATIVE", "COMPOSED", "FALLBACK", "UNSUPPORTED"]);

export function validateSiteAdapter(adapter) {
  const errors = [];
  if (!adapter || adapter.adapter_version !== SITE_ADAPTER_VERSION) errors.push("Unsupported SiteAdapter version.");
  for (const key of ["adapter_id", "site_id", "mappings"]) if (!adapter?.[key]) errors.push(`Missing adapter field: ${key}`);
  if (adapter?.mappings) for (const [type, mapping] of Object.entries(adapter.mappings)) {
    if (!ADAPTER_MAPPING_STATES.includes(mapping.state)) errors.push(`Invalid mapping state for ${type}.`);
    if (mapping.state !== "UNSUPPORTED" && !mapping.target) errors.push(`Mapping target required for ${type}.`);
  }
  return { status: errors.length ? "FAIL" : "PASS", errors };
}

export function createSiteAdapter(config) {
  const adapter = { adapter_version: SITE_ADAPTER_VERSION, cms: { persistence: "not_implemented", writes: false }, confidence_policy: "unmapped components use fallback or fail closed", ...structuredClone(config) };
  const validation = validateSiteAdapter(adapter); if (validation.status === "FAIL") throw new Error(validation.errors.join("; ")); return Object.freeze(adapter);
}

export function mapSemanticPageToSiteAdapter(page, adapter, { fallback_allowed = true } = {}) {
  if (!page || !Array.isArray(page.components)) throw new Error("SemanticPage is required.");
  const validation = validateSiteAdapter(adapter); if (validation.status === "FAIL") throw new Error(validation.errors.join("; "));
  const mappings = page.components.map((component) => { const mapping = adapter.mappings[component.component_type] || (fallback_allowed ? { state: "FALLBACK", target: "generic-fallback-renderer", confidence: "low" } : { state: "UNSUPPORTED", confidence: "none" }); if (mapping.state === "UNSUPPORTED" && !fallback_allowed) throw new Error(`Unsupported component mapping: ${component.component_type}`); return { component_id: component.component_id, component_type: component.component_type, state: mapping.state, target: mapping.target || null, confidence: mapping.confidence || "unknown", evidence_ids: mapping.evidence_ids || [] }; });
  return { artifact_type: "site_adapter_mapping", adapter_id: adapter.adapter_id, adapter_version: adapter.adapter_version, semantic_page_sha256: sha256(canonicalJson(page)), semantic_page: structuredClone(page), mappings, semantic_content_modified: false, cms_persistence: adapter.cms, mapping_hash: sha256(canonicalJson(mappings)) };
}
