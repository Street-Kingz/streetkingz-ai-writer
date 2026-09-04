import crypto from "node:crypto";

export const DISCOVERY_VERSION = "v1-05-slice-a-1";
export const CANDIDATE_TYPES = Object.freeze([
  "existing_product_improvement",
  "existing_category_improvement",
  "existing_content_improvement",
  "new_page_or_content_asset",
  "internal_linking"
]);

const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).sort().join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
};
export const canonicalJson = value => stable(value);
export const sha256 = value => crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");

const norm = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const pageRef = id => `page:${id}`;
const targetRef = (kind, id) => `${kind}:${id}`;

function pageTargets(packet, page) {
  const text = norm(`${page?.title || ""} ${page?.h1 || ""} ${page?.url || ""}`);
  const targets = [];
  if (page?.type === "product") {
    const product = (packet.commerce?.products || []).find(p => {
      const productText = norm(`${p.name || ""} ${p.slug || ""} ${p.canonical_url || ""}`);
      return productText && (text.includes(productText) || productText.includes(text));
    });
    if (product) targets.push(targetRef("product", product.id));
    targets.push(pageRef(page.id));
  } else if (page?.type === "category") {
    const category = (packet.commerce?.categories || []).find(c => {
      const categoryText = norm(`${c.name || ""} ${c.slug || ""}`);
      return categoryText && (text.includes(categoryText) || categoryText.includes(text));
    });
    if (category) targets.push(targetRef("category", category.id));
    targets.push(pageRef(page.id));
  } else if (page?.type === "content") targets.push(pageRef(page.id));
  return targets;
}

function refs(kind, type, id, relation = "supports") {
  return [{ source_kind: kind, source_record_type: type, source_record_id: id, relationship: relation }];
}

export function buildSnapshotFingerprint(snapshot) { return sha256(snapshot); }
export function buildInputHash(packet) { return sha256(packet); }

export function discoverCandidates(packet) {
  const p = packet || {};
  const pages = Array.isArray(p.site?.pages) ? p.site.pages : [];
  const pageById = new Map(pages.map(page => [page.id, page]));
  const byIdentity = new Map();
  const add = ({ type, targets, targetType, sources, evidence, identityPart }) => {
    if (!CANDIDATE_TYPES.includes(type) || !sources.length || !evidence.length) return;
    const identity = sha256({ type, identity: identityPart || targets });
    const prior = byIdentity.get(identity);
    if (prior) {
      prior.discovery_sources = [...new Set([...prior.discovery_sources, ...sources])].sort();
      prior.evidence_refs = [...prior.evidence_refs, ...evidence];
      return;
    }
    byIdentity.set(identity, {
      candidate_identity: identity,
      candidate_type: type,
      target_resources: targets,
      target_resource_type: targetType,
      discovery_sources: [...new Set(sources)].sort(),
      evidence_refs: evidence,
      direct_derived_relationships: evidence.map(ref => ({ ...ref, direct_source: true, derived_candidate: true })),
      market: p.business?.market || null,
      language: p.business?.language || null,
      freshness_state: p.external?.state || p.search_console?.state || p.site?.state || "unknown",
      completeness: p.external?.state || p.search_console?.state || p.site?.state || "unknown",
      limitations: [...new Set([...(p.site?.limitations || []), ...(p.search_console?.limitations || []), ...(p.external?.limitations || [])])],
      overlap_group_id: null,
      candidate_status: "discovered",
      rejection_reason_codes: [],
      snapshot_id: p.snapshot_id || null,
      candidate_version: DISCOVERY_VERSION,
      evaluated_at: null
    });
  };
  const pageForUrl = url => pages.find(page => page.url && url && norm(page.url) === norm(url));
  const commerceTargetForUrl = url => {
    const product = (p.commerce?.products || []).find(item => item.canonical_url && norm(item.canonical_url) === norm(url));
    if (product) return { type: "existing_product_improvement", targets: [targetRef("product", product.id)], targetType: "product" };
    const category = (p.commerce?.categories || []).find(item => item.canonical_url && norm(item.canonical_url) === norm(url));
    return category ? { type: "existing_category_improvement", targets: [targetRef("category", category.id)], targetType: "category" } : null;
  };
  const gscRows = p.search_console?.rows || [];
  const extRows = p.external?.rows || [];
  for (const [i, row] of gscRows.entries()) {
    const page = pageById.get(row.page_id);
    if (page) {
      const targets = pageTargets(p, page);
      const type = page.type === "product" ? "existing_product_improvement" : page.type === "category" ? "existing_category_improvement" : page.type === "content" ? "existing_content_improvement" : null;
      if (type && targets.length) add({ type, targets, targetType: page.type, sources: ["search_console"], evidence: refs("search_console", "observation", `row-${i + 1}`), identityPart: targets });
    } else if (row.page_url) { const target = commerceTargetForUrl(row.page_url); if (target) add({ ...target, sources: ["search_console"], evidence: refs("search_console", "observation", `row-${i + 1}`), identityPart: target.targets }); }
  }
  for (const [i, row] of extRows.entries()) {
    const evidence = refs("external_search", "observation", `row-${i + 1}`);
    const matchedPages = (row.serp || []).map(result => pageForUrl(result.url)).filter(Boolean);
    const page = matchedPages[0];
    if (page) {
      const targets = pageTargets(p, page);
      const type = page.type === "product" ? "existing_product_improvement" : page.type === "category" ? "existing_category_improvement" : page.type === "content" ? "existing_content_improvement" : null;
      if (type && targets.length) add({ type, targets, targetType: page.type, sources: ["external_search"], evidence, identityPart: targets });
      if (matchedPages.length > 1 && matchedPages.every(item => item.type === "content")) add({ type: "existing_content_improvement", targets: matchedPages.map(item => pageRef(item.id)).sort(), targetType: "content", sources: ["external_search"], evidence, identityPart: matchedPages.map(item => pageRef(item.id)).sort() });
      if (row.query) add({ type: "new_page_or_content_asset", targets: [], targetType: "unresolved", sources: ["external_search"], evidence, identityPart: { query: norm(row.query), market: row.market, language: row.language } });
    } else if (row.query) {
      const commerceTarget = (row.serp || []).map(result => commerceTargetForUrl(result.url)).find(Boolean);
      if (commerceTarget) add({ ...commerceTarget, sources: ["external_search"], evidence, identityPart: commerceTarget.targets });
      else {
      add({ type: "new_page_or_content_asset", targets: [], targetType: "unresolved", sources: ["external_search"], evidence, identityPart: { query: norm(row.query), market: row.market, language: row.language } });
      }
    }
  }
  for (const page of pages) {
    if ((page.type === "content" || page.type === "home") && (page.title || page.h1) && (p.site?.state !== "missing")) add({ type: "existing_content_improvement", targets: [pageRef(page.id)], targetType: "content", sources: ["site"], evidence: refs("site", "page", page.id), identityPart: [pageRef(page.id)] });
    if (page.type === "category" && (page.title || page.h1) && (p.site?.state !== "missing")) add({ type: "existing_category_improvement", targets: pageTargets(p, page), targetType: "category", sources: ["site"], evidence: refs("site", "page", page.id), identityPart: pageTargets(p, page) });
    if (page.type === "product" && (page.title || page.h1) && (p.site?.state !== "missing")) add({ type: "existing_product_improvement", targets: pageTargets(p, page), targetType: "product", sources: ["site"], evidence: refs("site", "page", page.id), identityPart: pageTargets(p, page) });
  }
  const linked = new Set();
  for (const page of pages) for (const linkedId of page.internal_links || []) {
    if (!pageById.has(linkedId)) continue;
    const pair = [page.id, linkedId].sort(); const key = pair.join("|");
    linked.add(key);
    add({ type: "internal_linking", targets: pair.map(pageRef), targetType: "page_pair", sources: ["site"], evidence: refs("site", "page", page.id, "link_relationship"), identityPart: pair.map(pageRef) });
  }
  const queryPages = new Map();
  for (const row of gscRows) if (row.query && row.page_id) { const key = norm(row.query); const arr = queryPages.get(key) || []; arr.push(row.page_id); queryPages.set(key, arr); }
  for (const ids of queryPages.values()) {
    const pair = [...new Set(ids)].sort();
    if (pair.length === 2 && !linked.has(pair.join("|"))) add({ type: "internal_linking", targets: pair.map(pageRef), targetType: "page_pair", sources: ["search_console"], evidence: refs("search_console", "query_page", pair.join("|"), "shared_query_relationship"), identityPart: pair.map(pageRef) });
  }
  if (pages.length <= 20) {
    for (let i = 0; i < pages.length; i++) for (let j = i + 1; j < pages.length; j++) {
      const a = pages[i], b = pages[j];
      if (!(a.type === "category" || b.type === "category")) continue;
      const pair = [a.id, b.id].sort(); if (linked.has(pair.join("|"))) continue;
      add({ type: "internal_linking", targets: pair.map(pageRef), targetType: "page_pair", sources: ["site"], evidence: refs("site", "page", a.id, "bounded_relationship"), identityPart: pair.map(pageRef) });
    }
  }
  return [...byIdentity.values()].sort((a, b) => a.candidate_identity.localeCompare(b.candidate_identity));
}

export function selectBoundedCandidates(candidates) {
  const sorted = [...candidates].sort((a, b) => `${a.candidate_type}:${a.candidate_identity}`.localeCompare(`${b.candidate_type}:${b.candidate_identity}`));
  return { candidates: sorted.slice(0, 200), completeness: sorted.length > 200 ? "partial" : sorted.length ? "complete" : "empty", limitations: sorted.length > 200 ? ["candidate_cap_hit"] : [] };
}
