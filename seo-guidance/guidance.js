import { sha256, stableId } from "../research/core/canonical.js";

export const GUIDANCE_SCHEMA_VERSION = "1.0.0";
export const GUIDANCE_MANIFEST_VERSION = "1.0.0";
export const GUIDANCE_AUTHORITY_CLASSES = Object.freeze(["SEARCH_ENGINE_PRIMARY", "SEARCH_ENGINE_SECONDARY", "WEB_STANDARD", "QUALITY_INTERPRETIVE_GUIDANCE"]);
export const GUIDANCE_SOURCE_CATEGORIES = Object.freeze(["google_search", "google_ai_search", "google_ranking_systems", "google_search_foundations", "bing_search", "schema", "w3c_wai", "quality_rater"]);
export const GUIDANCE_FRESHNESS_STATES = Object.freeze(["CURRENT", "STALE", "INVALID"]);
export const DEFAULT_GUIDANCE_MAX_AGE_DAYS = 60;

export const TRUSTED_GUIDANCE_SOURCES = Object.freeze([
  { id: "google-search-essentials", url: "https://developers.google.com/search/docs/essentials", domain: "developers.google.com", authority_class: "SEARCH_ENGINE_PRIMARY", category: "google_search" },
  { id: "google-spam-policies", url: "https://developers.google.com/search/docs/essentials/spam-policies", domain: "developers.google.com", authority_class: "SEARCH_ENGINE_PRIMARY", category: "google_search" },
  { id: "google-helpful-content", url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content", domain: "developers.google.com", authority_class: "SEARCH_ENGINE_PRIMARY", category: "google_search" },
  { id: "google-generative-ai", url: "https://developers.google.com/search/docs/fundamentals/using-gen-ai-content", domain: "developers.google.com", authority_class: "SEARCH_ENGINE_PRIMARY", category: "google_search" },
  { id: "google-ai-features", url: "https://developers.google.com/search/docs/appearance/ai-features", domain: "developers.google.com", authority_class: "SEARCH_ENGINE_PRIMARY", category: "google_ai_search" },
  { id: "google-ranking-systems", url: "https://developers.google.com/search/docs/appearance/ranking-systems-guide", domain: "developers.google.com", authority_class: "SEARCH_ENGINE_PRIMARY", category: "google_ranking_systems" },
  { id: "google-how-search-works", url: "https://developers.google.com/search/docs/fundamentals/how-search-works", domain: "developers.google.com", authority_class: "SEARCH_ENGINE_PRIMARY", category: "google_search_foundations" },
  { id: "google-structured-data", url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data", domain: "developers.google.com", authority_class: "SEARCH_ENGINE_PRIMARY", category: "google_search" },
  { id: "bing-webmaster-guidelines", url: "https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a", domain: "www.bing.com", authority_class: "SEARCH_ENGINE_SECONDARY", category: "bing_search" },
  { id: "schema-org-docs", url: "https://schema.org/docs/documents.html", domain: "schema.org", authority_class: "WEB_STANDARD", category: "schema" },
  { id: "w3c-wai-standards", url: "https://www.w3.org/WAI/standards-guidelines/", domain: "www.w3.org", authority_class: "WEB_STANDARD", category: "w3c_wai" }
]);

const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);
const daysSince = (date, now) => Math.max(0, (new Date(now).getTime() - new Date(date).getTime()) / 86400000);

export function normalizeGuidanceText(html) {
  if (typeof html !== "string" || !html.trim()) throw new Error("Guidance source content is empty.");
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>|<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, "\n$1\n")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ").trim();
  if (text.length < 40) throw new Error("Guidance source could not be deterministically normalized.");
  return text.slice(0, 20000);
}

function sourceFor(source) {
  const found = TRUSTED_GUIDANCE_SOURCES.find((item) => item.id === source.id || item.url === source.url);
  if (!found) throw new Error("Guidance source is not allowlisted.");
  const parsed = new URL(source.url || found.url);
  if (parsed.protocol !== "https:" || parsed.hostname !== found.domain) throw new Error("Guidance source authority is not allowlisted.");
  return found;
}

export function validateGuidanceSnapshot(snapshot, { now = new Date().toISOString(), maxAgeDays = DEFAULT_GUIDANCE_MAX_AGE_DAYS } = {}) {
  const errors = [];
  if (!isObject(snapshot) || snapshot.schema_version !== GUIDANCE_SCHEMA_VERSION || snapshot.artifact_type !== "seo_guidance_snapshot") errors.push("Unsupported guidance snapshot schema.");
  if (!snapshot?.snapshot_id || !snapshot?.source_manifest_version || !Array.isArray(snapshot?.sources) || !Array.isArray(snapshot?.records)) errors.push("Guidance snapshot identity or collections are missing.");
  for (const source of snapshot?.sources || []) {
    try { const expected = sourceFor(source); if (source.authority_class !== expected.authority_class || source.category !== expected.category) errors.push(`Invalid authority metadata for ${source.id}.`); if (!/^[a-f0-9]{64}$/.test(source.content_hash || "")) errors.push(`Invalid source hash for ${source.id}.`); } catch (error) { errors.push(error.message); }
  }
  const sourceIds = new Set((snapshot?.sources || []).map((source) => source.id));
  for (const record of snapshot?.records || []) { if (!record.guidance_id || !sourceIds.has(record.source_ref)) errors.push(`Guidance record references an unknown source: ${record.source_ref}.`); if (!GUIDANCE_AUTHORITY_CLASSES.includes(record.authority_class)) errors.push(`Invalid guidance authority class: ${record.authority_class}.`); }
  if (snapshot?.snapshot_sha256 && snapshot.snapshot_sha256 !== sha256({ ...snapshot, snapshot_sha256: undefined })) errors.push("Guidance snapshot hash mismatch.");
  const freshness = snapshot?.retrieved_at && daysSince(snapshot.retrieved_at, now) <= maxAgeDays ? "CURRENT" : "STALE";
  return { valid: errors.length === 0, errors, freshness: errors.length ? "INVALID" : freshness };
}

export function createGuidanceSnapshot({ sources, retrievedAt = new Date().toISOString(), createdAt = retrievedAt, maxRecords = 80 } = {}) {
  if (!Array.isArray(sources) || !sources.length) throw new Error("At least one trusted guidance source is required.");
  const normalized = sources.map((item) => { const trusted = sourceFor(item); const text = item.normalized_text || normalizeGuidanceText(item.content || ""); return { id: trusted.id, url: trusted.url, source_title: item.source_title || null, authority_class: trusted.authority_class, category: trusted.category, retrieved_at: item.retrieved_at || retrievedAt, publication_or_update_date: item.publication_or_update_date || null, content_hash: sha256(text), normalized_text: text }; });
  const records = normalized.flatMap((source) => [{ guidance_id: stableId("guidance", { source: source.id, content_hash: source.content_hash }), source_ref: source.id, authority_class: source.authority_class, category: source.category, statement: source.normalized_text.slice(0, 1200), applicability: source.category === "google_search" ? "Google Search policy and documented principles" : source.category === "bing_search" ? "Bing Search perspective; not Google policy" : "Applicable standard or vocabulary; not a ranking claim", section: null }]).slice(0, maxRecords);
  const snapshot = { schema_version: GUIDANCE_SCHEMA_VERSION, artifact_type: "seo_guidance_snapshot", snapshot_id: stableId("seo_guidance_snapshot", { manifest: GUIDANCE_MANIFEST_VERSION, sources: normalized.map(({ id, content_hash }) => ({ id, content_hash })) }), status: "validated", created_at: createdAt, retrieved_at: retrievedAt, source_manifest_version: GUIDANCE_MANIFEST_VERSION, sources: normalized.map(({ normalized_text, ...source }) => source), records, freshness_state: "CURRENT" };
  snapshot.snapshot_sha256 = sha256(snapshot);
  return snapshot;
}

export async function retrieveGuidanceSnapshot({ sources = TRUSTED_GUIDANCE_SOURCES, fetchImpl = globalThis.fetch, now = () => new Date().toISOString(), maxSources = TRUSTED_GUIDANCE_SOURCES.length, maxBytes = 300000 } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Guidance retrieval requires fetch.");
  const retrievedAt = now();
  const fetched = [];
  for (const manifest of sources.slice(0, maxSources)) {
    const trusted = sourceFor(manifest);
    const response = await fetchImpl(trusted.url, { redirect: "error" });
    if (!response.ok) throw new Error(`Guidance source retrieval failed: ${trusted.id}.`);
    const content = await response.text();
    if (Buffer.byteLength(content, "utf8") > maxBytes) throw new Error(`Guidance source exceeds the bounded response size: ${trusted.id}.`);
    fetched.push({ ...trusted, content, retrieved_at: retrievedAt });
  }
  return createGuidanceSnapshot({ sources: fetched, retrievedAt });
}

export function guidanceContextForAi(snapshot, { now = new Date().toISOString(), maxRecords = 20 } = {}) {
  const validation = validateGuidanceSnapshot(snapshot, { now });
  if (!validation.valid || validation.freshness !== "CURRENT") throw Object.assign(new Error("A current validated SEO guidance snapshot is required."), { code: "GUIDANCE_UNAVAILABLE", validation });
  return { snapshot_id: snapshot.snapshot_id, snapshot_sha256: snapshot.snapshot_sha256, source_manifest_version: snapshot.source_manifest_version, freshness_status: validation.freshness, records: snapshot.records.slice(0, maxRecords).map(({ guidance_id, source_ref, authority_class, category, statement, applicability, section }) => ({ guidance_id, source_ref, authority_class, category, statement, applicability, section })) };
}
