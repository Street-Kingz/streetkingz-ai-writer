import crypto from "node:crypto";
export const DISCOVERY_VERSION = "v1-05-slice-a-2-provenance";
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
  } else if (page?.type === "content" || page?.type === "home") targets.push(pageRef(page.id));
  return targets;
}

function sourceId(row, fallback) { return String(row?.source_record_id || row?.id || fallback); }
function refs(kind, type, id, relation = "supports", runReference = null, facts = {}) {
  return [{ source_kind: kind, source_record_type: type, source_record_id: id, source_run_or_generation_reference: runReference, relationship: relation, ...facts }];
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
      const type = page.type === "product" ? "existing_product_improvement" : page.type === "category" ? "existing_category_improvement" : (page.type === "content" || page.type === "home") ? "existing_content_improvement" : null;
      if (type && targets.length) add({ type, targets, targetType: page.type === "home" ? "content" : page.type, sources: ["search_console"], evidence: refs("search_console", "observation", sourceId(row, `row-${i + 1}`), "query_page_relationship", p.search_console?.selected_run_id), identityPart: targets });
    } else if (row.page_url) { const target = commerceTargetForUrl(row.page_url); if (target) add({ ...target, sources: ["search_console"], evidence: refs("search_console", "observation", sourceId(row, `row-${i + 1}`), "query_page_relationship", p.search_console?.selected_run_id), identityPart: target.targets }); }
  }
  for (const [i, row] of extRows.entries()) {
    const evidence = refs("external_search", "observation", sourceId(row, `row-${i + 1}`), "query_serp_relationship", p.external?.selected_run_id, { source_market: row.market || null, source_language: row.language || null });
    const matchedPages = [...new Set((row.serp || []).map(result => pageForUrl(result.url)).filter(Boolean))];
    for (const page of matchedPages) {
      const targets = pageTargets(p, page);
      const type = page.type === "product" ? "existing_product_improvement" : page.type === "category" ? "existing_category_improvement" : (page.type === "content" || page.type === "home") ? "existing_content_improvement" : null;
      if (type && targets.length) add({ type, targets, targetType: page.type === "home" ? "content" : page.type, sources: ["external_search"], evidence, identityPart: targets });
    }
    if (matchedPages.length > 1 && matchedPages.every(item => item.type === "content" || item.type === "home")) {
      const targets = matchedPages.map(item => pageRef(item.id)).sort();
      add({ type: "existing_content_improvement", targets, targetType: "content", sources: ["external_search"], evidence, identityPart: targets });
    }
    if (row.query) add({ type: "new_page_or_content_asset", targets: [], targetType: "unresolved", sources: ["external_search"], evidence, identityPart: { query: norm(row.query), market: row.market, language: row.language } });
  }
  for (const page of pages) {
    if ((page.type === "content" || page.type === "home") && (page.title || page.h1) && (p.site?.state !== "missing")) add({ type: "existing_content_improvement", targets: [pageRef(page.id)], targetType: "content", sources: ["site"], evidence: refs("site", "page", sourceId(page, page.id), "site_page", p.site?.selected_run_id), identityPart: [pageRef(page.id)] });
    if (page.type === "category" && (page.title || page.h1) && (p.site?.state !== "missing")) add({ type: "existing_category_improvement", targets: pageTargets(p, page), targetType: "category", sources: ["site"], evidence: refs("site", "page", sourceId(page, page.id), "site_page", p.site?.selected_run_id), identityPart: pageTargets(p, page) });
    if (page.type === "product" && (page.title || page.h1) && (p.site?.state !== "missing")) add({ type: "existing_product_improvement", targets: pageTargets(p, page), targetType: "product", sources: ["site"], evidence: refs("site", "page", sourceId(page, page.id), "site_page", p.site?.selected_run_id), identityPart: pageTargets(p, page) });
  }
  const hasLink = (source, target) => Boolean((pageById.get(String(source))?.internal_links || []).map(String).includes(String(target)));
  const addDirectedLink = (source, target, evidence, sourceClass) => {
    if (!source || !target || source === target || !pageById.has(String(source)) || !pageById.has(String(target)) || hasLink(source, target)) return;
    const sourceRef = pageRef(source); const targetRefValue = pageRef(target);
    add({ type: "internal_linking", targets: [sourceRef, targetRefValue], targetType: "directed_page_pair", sources: [sourceClass], evidence, identityPart: { source_page: sourceRef, target_page: targetRefValue } });
  };
  for (const page of pages) for (const linkedId of page.internal_links || []) if (pageById.has(String(linkedId))) {
    // The observed page.id -> linkedId edge is evidence for the relationship;
    // the candidate, if any, is the missing reverse edge linkedId -> page.id.
    addDirectedLink(String(linkedId), String(page.id), refs("site", "page", page.id, "link_relationship"), "site");
  }
  for (const relation of p.commerce?.relations || []) {
    const productPage = pages.find(page => pageTargets(p, page).includes(targetRef("product", relation.product_id)));
    const categoryPage = pages.find(page => pageTargets(p, page).includes(targetRef("category", relation.category_id)));
    if (productPage && categoryPage) addDirectedLink(String(categoryPage.id), String(productPage.id), refs("commerce", "product_category_relation", relation.id || "relation-" + relation.product_id + "-" + relation.category_id, "commerce_product_category_relationship", p.commerce?.generation_id), "commerce");
  }
  const queryPages = new Map();
  for (const [i, row] of gscRows.entries()) if (row.query && row.page_id) {
    const key = norm(row.query); const arr = queryPages.get(key) || [];
    arr.push({ id: String(row.page_id), evidence: refs("search_console", "observation", "row-" + (i + 1), "shared_query_relationship") }); queryPages.set(key, arr);
  }
  for (const entries of queryPages.values()) {
    const unique = [...new Map(entries.map(entry => [entry.id, entry])).values()];
    if (unique.length > 1 && unique.length <= 10) for (const source of unique) for (const target of unique) if (source.id !== target.id) addDirectedLink(source.id, target.id, [source.evidence, target.evidence].flat(), "search_console");
  }
  return [...byIdentity.values()].sort((a, b) => a.candidate_identity.localeCompare(b.candidate_identity));
}

export function selectBoundedCandidates(candidates) {
  const all = [...candidates];
  if (all.length <= 200) return { candidates: all.sort((a, b) => a.candidate_identity.localeCompare(b.candidate_identity)), completeness: all.length ? "complete" : "empty", limitations: [] };
  const groups = new Map();
  for (const candidate of all) {
    const primary = [...(candidate.discovery_sources || [])].sort()[0] || "unknown";
    const key = candidate.candidate_type + ":" + primary;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
  }
  for (const group of groups.values()) group.sort((a, b) => a.candidate_identity.localeCompare(b.candidate_identity));
  const keys = [...groups.keys()].sort(); const selected = [];
  for (let index = 0; selected.length < 200; index++) {
    let added = false;
    for (const key of keys) { const candidate = groups.get(key)[index]; if (candidate) { selected.push(candidate); added = true; if (selected.length === 200) break; } }
    if (!added) break;
  }
  return { candidates: selected, completeness: "partial", limitations: ["candidate_cap_hit"] };
}
