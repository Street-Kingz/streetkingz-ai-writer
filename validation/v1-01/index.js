import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const OBJECTIVE = "Grow profitable organic revenue from the existing catalogue without relying on increased paid advertising. Do not prioritise products or categories that cannot support additional demand because of stock or supply constraints. Prefer sustainable, commercially meaningful opportunities that the business can realistically fulfil. Do not favour any named product, category, page, keyword or intervention.";
export const RUBRIC = {
  dimensions: [
    ["priority_usefulness", 25], ["commercial_fit", 20],
    ["search_competitive_feasibility", 15], ["intervention_appropriateness", 15],
    ["evidence_explainability", 15], ["honesty_uncertainty", 10]
  ],
  scale: "0-5 per dimension, converted to 100",
  thresholds: ["Challenger at least 10 points above Control", "Challenger wins at least four of six dimensions", "at least one material decision improvement", "all stability, integrity and defect requirements in the milestone contract"]
};
export const PUBLIC_DIR = path.resolve("artifacts/validation/v1-01");
export const PRIVATE_DIR = path.resolve("artifacts/private/v1-01");

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.keys(value).sort().reduce((o, k) => { o[k] = canonical(value[k]); return o; }, {});
  return value;
}
export function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : JSON.stringify(canonical(value)));
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
export function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
export function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }

export function buildCandidates(products, source = "public catalogue snapshot") {
  const classes = ["improve_existing_product_or_category_page", "improve_internal_linking_or_structure", "monitor", "defer"];
  return products.map((p, i) => ({
    candidate_id: `v1-01-candidate-${String(i + 1).padStart(3, "0")}`,
    target_entity: { type: "product", name: p.name },
    url: p.url,
    intent_cluster: `${p.type} purchase and use`,
    current_state: "Existing catalogue product with a public product URL.",
    candidate_source: source,
    public_evidence_refs: [{ ref: `catalogue/products.js#${i}`, kind: "public_catalogue" }],
    possible_intervention_classes: classes,
    missing_evidence: ["Search Console opportunity evidence for this entity", "commercial fit and supply reliability"],
    provenance: { source, captured_at: "2026-08-23", commercial_data_loaded: false }
  }));
}

export function sanitiseCandidates(candidates) {
  return candidates.map(({ candidate_id, target_entity, url, intent_cluster, current_state, candidate_source, public_evidence_refs, possible_intervention_classes, missing_evidence, provenance }) => ({ candidate_id, target_entity, url, intent_cluster, current_state, candidate_source, public_evidence_refs, possible_intervention_classes, missing_evidence, provenance }));
}

export function validateCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) throw new Error("candidate universe is empty");
  const ids = new Set();
  for (const c of candidates) {
    if (!/^v1-01-candidate-\d{3}$/.test(c.candidate_id) || ids.has(c.candidate_id)) throw new Error("candidate IDs must be stable and unique");
    ids.add(c.candidate_id);
    if (!c.url || !c.target_entity || !c.public_evidence_refs?.length) throw new Error("candidate requires public evidence and target");
    const forbidden = JSON.stringify(c).match(/\b(units_sold|revenue|sales_velocity|current_stock|cogs|margin|private_sales|conversion_rate)\b/i);
    if (forbidden) throw new Error("candidate records cannot contain commercial fields");
  }
  return { count: candidates.length, diversity: [...new Set(candidates.flatMap(c => c.possible_intervention_classes))] };
}

export function captureCommercialSnapshot({ candidateHash, candidates, fields = {} }) {
  const before = sha256(candidates);
  if (before !== candidateHash) throw new Error("candidate-universe hash mismatch before commercial capture");
  const required = ["product_category_mapping", "trading_window", "sales_evidence", "current_stock", "cogs_or_margin", "refunds_cancellations", "additional_signal", "general_business_constraints"];
  const snapshot = { captured_at: "2026-08-23", candidate_universe_hash: candidateHash, fields: {}, status: "BLOCKED" };
  for (const name of required) snapshot.fields[name] = fields[name] ?? { field_name: name, source: null, source_date: null, measurement_window: null, mapping_entity: null, provenance: null, status: "missing", availability: "unavailable", allowed_use: "none", limitation: "No approved private export or read-only connector was available." };
  const after = sha256(candidates);
  if (after !== candidateHash) throw new Error("commercial capture changed candidate universe");
  const ready = required.every((name) => ["observed", "derived", "user-provided"].includes(snapshot.fields[name]?.status));
  if (ready) snapshot.status = "READY";
  return snapshot;
}

export function assertNoDecisionArtifacts(dir = PUBLIC_DIR) {
  const names = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const forbidden = names.filter(n => /control|challenger|consensus|package-a|package-b|blind|decision/i.test(n));
  if (forbidden.length) throw new Error(`Phase B cannot create decision artefacts: ${forbidden.join(", ")}`);
}
