import { rankRecommendations, projectMerchantRecommendation } from "./recommendationEngine.js";

const activeStatuses = new Set(["current", "deferred", "needs_reassessment"]);
const terminalStatuses = new Set(["completed", "ignored", "superseded", "withdrawn"]);

export function resolveTargetLabels(targetResources = [], { products = [], categories = [], pages = [] } = {}) {
  const lookup = (rows) => new Map(rows.map(row => [String(row.id ?? row.source_id ?? row.identity), row.name || row.title || row.h1 || row.url_label || null]));
  const maps = { product: lookup(products), category: lookup(categories), page: lookup(pages) };
  return targetResources.map(reference => {
    const [kind, ...rest] = String(reference).split(":"); const id = rest.join(":"); const label = maps[kind]?.get(id);
    return { reference: String(reference), label: label || (kind === "product" ? "the identified product" : kind === "category" ? "the identified category" : kind === "page" ? "the identified page" : "the identified target") };
  });
}

export function feedProjection(records, targetOptions = {}) {
  return records.filter(record => activeStatuses.has(record.status)).sort((a, b) => (a.status === "current" ? 0 : 1) - (b.status === "current" ? 0 : 1) || ({ high: 0, medium: 1, low: 2, reassess: 3 }[a.priority_band] ?? 9) - ({ high: 0, medium: 1, low: 2, reassess: 3 }[b.priority_band] ?? 9) || String(a.recommendation_id).localeCompare(String(b.recommendation_id))).map(record => {
    const labels = resolveTargetLabels(record.target_resources, targetOptions);
    return { recommendation_id: record.recommendation_id, title: merchantTitle(record, labels), priority: record.priority_band, state: record.status, recommended_action: record.intervention.replaceAll("_", " "), target: labels, confidence: record.confidence, why_this_matters: record.why_this_matters, limitations: (record.limitations || []).join(" "), evidence_source_count: (record.evidence_refs || []).length, provenance_present: Boolean(record.provenance || record.evidence_refs?.length), updated_at: record.updated_at };
  });
}

export function detailProjection(record, targetOptions = {}) {
  if (!record) return null;
  const labels = resolveTargetLabels(record.target_resources, targetOptions);
  return { ...projectMerchantRecommendation(record), title: merchantTitle(record, labels), customer_job: record.customer_job, target: labels, priority_reasons: record.priority_reasons, commercial_signal: record.commercial_signal, status_metadata: { status: record.status, recommendation_version: record.recommendation_version, candidate_version: record.provenance?.candidate_version || null, interpretation_version: record.provenance?.interpretation_version || null, instruction_version: record.provenance?.instruction_version || null } };
}

function merchantTitle(record, labels) {
  const target = labels[0]?.label;
  const action = { improve_existing_product: "Improve", improve_existing_category: "Improve", improve_existing_content: "Improve", create_new_page_or_content_asset: "Assess", improve_internal_linking: "Improve" }[record.intervention];
  return action && target ? `${action} ${target}` : projectMerchantRecommendation(record).title;
}

export function recommendationPersistenceRow(record, { businessId, runId }) {
  return { recommendation_id: record.recommendation_id, business_id: businessId, source_run_id: runId, source_candidate_identity: record.source_candidate_identity, status: record.status, intervention: record.intervention, priority_band: record.priority_band, priority_reasons: record.priority_reasons, target_resources: record.target_resources, customer_job: record.customer_job, merchant_safety_state: record.merchant_safety_state, merchant_safety_reasons: record.merchant_safety_reasons, commercial_signal: record.commercial_signal, confidence: record.confidence, limitations: record.limitations, evidence_refs: record.evidence_refs, why_this_matters: record.why_this_matters, what_to_do_next: record.what_to_do_next, recommendation_version: record.recommendation_version, candidate_version: record.provenance.candidate_version, interpretation_version: record.provenance.interpretation_version, instruction_version: record.provenance.instruction_version, updated_at: new Date().toISOString() };
}

export async function persistRecommendationRecords({ admin, businessId, runId, candidates }) {
  const ranked = rankRecommendations(candidates, { businessId, runId });
  const existing = await admin.from("organic_recommendations").select("*").eq("business_id", businessId).eq("source_run_id", runId);
  if (existing.error) throw existing.error;
  const old = new Map((existing.data || []).map(row => [row.recommendation_id, row]));
  const rows = ranked.recommendations.map(record => {
    const prior = old.get(record.recommendation_id);
    if (prior && terminalStatuses.has(prior.status)) record.status = prior.status;
    return recommendationPersistenceRow(record, { businessId, runId });
  });
  if (rows.length) { const saved = await admin.from("organic_recommendations").upsert(rows, { onConflict: "recommendation_id" }).select("*"); if (saved.error) throw saved.error; return { records: saved.data || [], outcomes: ranked.outcomes }; }
  return { records: [], outcomes: ranked.outcomes };
}
