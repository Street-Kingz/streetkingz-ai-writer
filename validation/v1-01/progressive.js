import fs from "node:fs";
import path from "node:path";
import { sha256, canonical } from "./index.js";
import { STREET_KINGZ_PRODUCTS } from "../../catalogue/products.js";
import { mapCatalogue } from "./storewide.js";

export const RUN_DIR = path.resolve("artifacts/validation/v1-01/attempts/progressive-001");
export const PRIVATE_RUN_DIR = path.resolve("artifacts/private/v1-01/progressive-001");
export const SOURCES = { catalogue: "catalogue/products.js", website: "live read-only acquisition", business_intelligence: "optional validated input", product_facts: "optional validated input", search_console: "optional read-only input" };

export function buildRecommendations({ products = STREET_KINGZ_PRODUCTS } = {}) {
  const mapped = mapCatalogue(products);
  const clusters = [...new Set(mapped.map((entry) => entry.primary_cluster))].filter((cluster) => cluster !== "kits_bundles").slice(0, 4);
  return clusters.map((cluster, index) => {
    const entry = mapped.find((item) => item.primary_cluster === cluster);
    return {
      id: `rec-${String(index + 1).padStart(3, "0")}`,
      priority: index + 1,
      archetype: index === 0 ? "improve_existing_destination" : index === 1 ? "improve_internal_linking_or_structure" : "monitor_or_improve_existing_destination",
      target: `${cluster} shared customer-job destination`,
      url: entry?.url || null,
      finding: `The catalogue maps a distinct ${cluster} customer job to an existing destination candidate.`,
      why: "The bounded method evaluates an existing destination before proposing a new resource.",
      intervention: "Improve the existing destination and relevant internal links only where fresh evidence supports the change.",
      outcome: "A clearer customer path grounded in the complete catalogue and available evidence.",
      confidence: "low",
      missing: ["Search Console attribution", "sales and margin evidence", "stock and supply constraints"],
      evidence_refs: [`catalogue:${cluster}`, `destination:${entry?.url || "missing"}`],
      wrong_if: "Fresh evidence or reliable commercial constraints show a different priority or no actionable gap."
    };
  });
}

function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function mdRecommendation(r, maturity) { return `### ${r.priority}. ${r.target}\n\n- Archetype: ${r.archetype}\n- Evidence maturity: ${maturity}\n- Confidence: ${r.confidence}\n- What was found: ${r.finding}\n- Why prioritised: ${r.why}\n- Recommended intervention: ${r.intervention}\n- Intended outcome: ${r.outcome}\n- Supporting evidence: ${r.evidence_refs.join(", ")}\n- Missing evidence: ${r.missing.join(", ")}\n- What could make it wrong: ${r.wrong_if}\n`; }

export function buildRun() {
  const recommendations = buildRecommendations();
  const sparse = recommendations.map((r) => ({ ...r, evidence_maturity: "FOUNDATION_SPARSE" }));
  const enriched = recommendations.map((r) => ({ ...r, evidence_maturity: "ENRICHED_LIMITED" }));
  const comparison = { top_recommendation_changed: false, priority_changed: false, intervention_changed: false, confidence_changes: [{ recommendation_id: sparse[0]?.id || null, from: "low", to: "low", reason: "No additional first-party evidence was asserted." }], warnings_added: ["Product-level commercial evidence remains optional and may be missing"], explanation: "Sparse and enriched states use the same data-driven catalogue clusters; missing first-party fields remain missing." };
  return { sparse, enriched, comparison };
}

export function writeRun() {
  const { sparse, enriched, comparison } = buildRun(); fs.mkdirSync(PRIVATE_RUN_DIR, { recursive: true }); fs.mkdirSync(RUN_DIR, { recursive: true });
  writeJson(path.join(PRIVATE_RUN_DIR, "recommendation-inputs.json"), { sparse, enriched, comparison });
  writeJson(path.join(RUN_DIR, "evidence-maturity.sanitised.json"), { sparse: { level: "FOUNDATION_SPARSE", available: ["catalogue", "external_search", "SERP"], missing: ["Search Console", "sales", "stock", "margin", "conversion"] }, enriched: { level: "ENRICHED_LIMITED", added: [], still_missing: ["Search Console", "sales", "stock", "margin", "conversion"] } });
  writeJson(path.join(RUN_DIR, "source-manifest.sanitised.json"), { captured_at: new Date().toISOString(), sources: Object.entries(SOURCES).map(([id, source]) => ({ id, source })) });
  writeJson(path.join(RUN_DIR, "opportunity-universe.sanitised.json"), { count: sparse.length, clustering: "data-driven intent and intervention clusters", candidates: sparse.map(({ id, target, archetype, url, evidence_refs }) => ({ id, target, archetype, url, evidence_refs })) });
  writeJson(path.join(RUN_DIR, "sparse-recommendations.sanitised.json"), { evidence_maturity: "FOUNDATION_SPARSE", recommendations: sparse });
  writeJson(path.join(RUN_DIR, "enriched-recommendations.sanitised.json"), { evidence_maturity: "ENRICHED_LIMITED", recommendations: enriched });
  fs.writeFileSync(path.join(RUN_DIR, "sparse-recommendations.md"), `# Sparse Evidence Recommendations\n\n${sparse.map((r) => mdRecommendation(r, "FOUNDATION / SPARSE")).join("\n")}`);
  fs.writeFileSync(path.join(RUN_DIR, "enriched-recommendations.md"), `# Enriched Evidence Recommendations\n\n${enriched.map((r) => mdRecommendation(r, "ENRICHED / LIMITED")).join("\n")}`);
  fs.writeFileSync(path.join(RUN_DIR, "sparse-vs-enriched-comparison.md"), "# Sparse vs Enriched Evidence\n\nNo priority or intervention change was asserted; missing first-party evidence remains missing.");
  fs.writeFileSync(path.join(RUN_DIR, "top-recommendation-diy-plan.md"), "# DIY Plan\n\nUse the selected destination’s validated Product Facts and current evidence. Preserve URL/canonical, make only evidence-supported changes, verify links and reassess with Search Console when available.");
  writeJson(path.join(RUN_DIR, "run-record.json"), { run_id: "progressive-001", captured_at: new Date().toISOString(), status: "DATA_DRIVEN_SCAFFOLD", sparse_recommendation_count: sparse.length, enriched_recommendation_count: enriched.length, comparison_hash: sha256(canonical(comparison)), strategic_ai_calls: 0, wordpress_writes: 0 });
  return { sparse, enriched, comparison };
}
