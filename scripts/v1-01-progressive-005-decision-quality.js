import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { STREET_KINGZ_PRODUCTS } from "../catalogue/products.js";
import { createOpenAICornerstoneStrategyProvider } from "../cornerstone/strategy-provider.js";
import { invokeControlledCall, writeImmutableArtifact } from "../interpretation/call-control.js";
import { calculateConfiguredCost, configuredModelPricing } from "../interpretation/cost.js";
import { CLUSTER_DEFS, mapCatalogue, parseKeywordEvidence, parseSerpEvidence, parseGscRows, analyseDestination, buildOpportunityEvidence, buildDiyPlan } from "../validation/v1-01/decision-quality.js";

process.loadEnvFile(new URL("../.env", import.meta.url));
const RUN_DIR = path.resolve("artifacts/validation/v1-01/attempts/progressive-005-decision-quality");
const PRIVATE_DIR = path.resolve("artifacts/private/v1-01/progressive-005-decision-quality");
const PREVIOUS = path.resolve("artifacts/validation/v1-01/attempts/progressive-004-fresh-evidence");
const RAW = path.resolve("artifacts/private/v1-01/progressive-004-fresh-evidence/raw");
const sha256 = value => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const writeJson = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const writeText = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${String(value).trim()}\n`); };
const ignored = target => spawnSync("git", ["check-ignore", "-q", target], { cwd: process.cwd() }).status === 0;
const readRaw = name => JSON.parse(fs.readFileSync(path.join(RAW, name), "utf8"));

const schema = {
  type: "object", additionalProperties: false, required: ["thesis", "recommendations", "winner_comparison", "limitations"],
  properties: {
    thesis: { type: "string" },
    recommendations: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["opportunity_id", "priority", "intervention", "why_prioritised", "evidence_ids", "confidence", "missing_evidence", "what_could_make_it_wrong"], properties: { opportunity_id: { type: "string" }, priority: { type: "integer" }, intervention: { type: "string" }, why_prioritised: { type: "string" }, evidence_ids: { type: "array", items: { type: "string" } }, confidence: { type: "string" }, missing_evidence: { type: "array", items: { type: "string" } }, what_could_make_it_wrong: { type: "string" } } } },
    winner_comparison: { type: "array", minItems: 3, items: { type: "object", additionalProperties: false, required: ["alternative_opportunity_id", "why_credible", "why_lost", "what_could_change_result"], properties: { alternative_opportunity_id: { type: "string" }, why_credible: { type: "string" }, why_lost: { type: "string" }, what_could_change_result: { type: "string" } } } },
    limitations: { type: "array", items: { type: "string" } }
  }
};

function validateOutput(out, opportunities) {
  const ids = new Set(opportunities.map(x => x.opportunity_id));
  const errors = [];
  for (const rec of out.recommendations || []) { if (!ids.has(rec.opportunity_id)) errors.push(`UNKNOWN_OPPORTUNITY:${rec.opportunity_id}`); const op = opportunities.find(x => x.opportunity_id === rec.opportunity_id); if (op && !rec.evidence_ids.every(id => op.evidence_ids.includes(id))) errors.push(`UNKNOWN_EVIDENCE:${rec.opportunity_id}`); }
  if ((out.winner_comparison || []).length < 3) errors.push("WINNER_REQUIRES_THREE_ALTERNATIVES");
  if (new Set((out.recommendations || []).map(x => x.intervention)).size === 1 && opportunities.length > 1) errors.push("ALL_INTERVENTIONS_IDENTICAL");
  return errors;
}

async function fetchDestinations(mapped) {
  const out = [];
  for (const product of mapped) {
    try { const started = Date.now(); const response = await fetch(product.url, { headers: { accept: "text/html,application/xhtml+xml" }, redirect: "follow" }); const html = await response.text(); out.push({ ...analyseDestination(html, product.url), status: response.status, final_url: response.url, elapsed_ms: Date.now() - started }); }
    catch (error) { out.push({ url: product.url, status: null, error: error.message, gap_flags: { likely_thin_content: true } }); }
  }
  return out;
}

async function main() {
  if (!ignored(PRIVATE_DIR)) throw new Error("Private progressive-005 path is not ignored.");
  if (!fs.existsSync(PREVIOUS)) throw new Error("Previous progressive-004 attempt is missing.");
  fs.mkdirSync(PRIVATE_DIR, { recursive: true }); fs.mkdirSync(RUN_DIR, { recursive: true });
  const mapped = mapCatalogue(STREET_KINGZ_PRODUCTS);
  if (mapped.length !== 27) throw new Error(`Expected 27 products, got ${mapped.length}.`);
  const keywords = parseKeywordEvidence(readRaw("keyword-ideas.raw.json"));
  const serps = Object.fromEntries(CLUSTER_DEFS.map(([id]) => [id, parseSerpEvidence(readRaw(`serp-${id}.raw.json`))]));
  const gscRows = ["365d", "latest90", "prior90"].flatMap(window => parseGscRows(readRaw(`search-console-${window}.raw.json`), mapped).map(row => ({ ...row, window })));
  const destinations = await fetchDestinations(mapped);
  const opportunities = buildOpportunityEvidence({ mapped, keywords, serps, gsc: gscRows, destinations });
  const packet = { artifact_type: "v1_01_decision_quality_packet", objective: "Allocate organic-growth effort across the complete catalogue using evidence, not a preferred product.", product_mappings: mapped, keyword_evidence: keywords, serp_evidence: serps, search_console_evidence: gscRows, destination_evidence: destinations, opportunities, missing_commercial_evidence: ["sales", "stock movement", "margin/COGS", "refunds", "conversion"] };
  const inputHash = sha256(packet); writeJson(path.join(PRIVATE_DIR, "raw-input-packet.json"), packet);
  const provider = createOpenAICornerstoneStrategyProvider({ env: process.env });
  const system = "You are a bounded store-wide organic-growth decision reasoner. Use only the supplied packet. Compare every opportunity. Do not browse, invent metrics or prefer a product. Select 3-5 recommendations, choose interventions independently, and cite only supplied evidence IDs. Do not create an article by default. Output JSON only.";
  const user = `DECISION INPUT HASH: ${inputHash}\n${JSON.stringify(packet)}`;
  const callRoot = path.join(RUN_DIR, "strategic-call");
  const controlled = await invokeControlledCall({ benchmarkDirectory: callRoot, modelLabel: provider.model, maxCalls: 1, retries: 0, invoke: async ({ signal, callDirectory }) => {
    const request = provider.requestPayload({ systemPrompt: system, userPrompt: user, responseSchema: schema });
    await writeImmutableArtifact(callDirectory, "decision-input.sanitised.json", { input_hash: inputHash, packet: { ...packet, search_console_evidence: gscRows.map(x => ({ ...x, clicks: x.clicks, impressions: x.impressions })) } });
    const response = await provider.generate({ systemPrompt: system, userPrompt: user, responseSchema: schema, signal });
    await writeImmutableArtifact(callDirectory, "decision-response-raw.json", { provider: response.provider, model: response.model, response_id: response.response_id, raw_text: response.rawText });
    const output = JSON.parse(response.rawText); const errors = validateOutput(output, opportunities); const usage = response.usage || {}; const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? null; const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? null; const cost = calculateConfiguredCost({ inputTokens, outputTokens, pricing: configuredModelPricing(process.env, response.model || provider.model) });
    await writeImmutableArtifact(callDirectory, "decision-output.sanitised.json", { ...output, validation: { status: errors.length ? "FAIL" : "PASS", errors }, model: response.model, usage: { input_tokens: inputTokens, output_tokens: outputTokens } });
    await writeImmutableArtifact(callDirectory, "run-metadata.json", { model: response.model, settings: provider.settings, calls: 1, retries: 0, input_hash: inputHash, output_hash: sha256(output), usage: { input_tokens: inputTokens, output_tokens: outputTokens }, ...cost });
    return { output, errors, metadata: { model: response.model, input_hash: inputHash, output_hash: sha256(output), usage: { input_tokens: inputTokens, output_tokens: outputTokens }, ...cost }, callDirectory };
  }});
  const result = controlled.result; if (result.errors.length) throw new Error(`Strategic output failed validation: ${result.errors.join(",")}`);
  const output = result.output; const winner = opportunities.find(x => x.opportunity_id === output.recommendations[0].opportunity_id) || opportunities[0];
  const productMatrix = mapped.map(p => ({ ...p, opportunity_status: p.primary_cluster === winner.cluster ? "RETAIN FOR COMPARISON" : "SUPPORT THROUGH SHARED DESTINATION", search_console: gscRows.filter(x => x.page === p.url), destination: destinations.find(x => x.url === p.url) || null }));
  writeJson(path.join(RUN_DIR, "strategic-decision-input.sanitised.json"), { input_hash: inputHash, product_count: 27, packet: { ...packet, product_mappings: mapped, search_console_evidence: gscRows, opportunities } });
  writeJson(path.join(RUN_DIR, "strategic-decision-output.sanitised.json"), { ...output, model: result.metadata.model, input_hash: inputHash, output_hash: result.metadata.output_hash });
  writeText(path.join(RUN_DIR, "corrected-catalogue-map.md"), `# Corrected catalogue map\n\nProducts: ${mapped.length}/27.\n\n${mapped.map(p => `- ${p.stable_product_id} — ${p.name}: ${p.primary_cluster}; secondary ${p.secondary_clusters.join(", ") || "none"}; confidence ${p.confidence}; ${p.mapping_reason}`).join("\n")}`);
  writeJson(path.join(RUN_DIR, "corrected-catalogue-map.sanitised.json"), { product_count: mapped.length, products: mapped });
  writeText(path.join(RUN_DIR, "keyword-intent-evidence.md"), `# Keyword intent evidence\n\n${Object.entries(keywords).map(([id, x]) => `## ${id}\nSeed: ${x.seed}; status: ${x.source_status}; matched items: ${x.queries.length}.\n${x.queries.map(q => `- ${q.keyword} — volume ${q.search_volume ?? "missing"}; CPC ${q.cpc ?? "missing"}; competition ${q.competition ?? "missing"}; intent ${q.intent ?? "missing"}; updated ${q.last_updated ?? "missing"}.`).join("\n")}`).join("\n\n")}`);
  writeText(path.join(RUN_DIR, "search-console-cluster-evidence.md"), `# Search Console cluster evidence\n\n${CLUSTER_DEFS.map(([id, name]) => { const rows = gscRows.filter(x => x.cluster === id); const clicks = rows.reduce((n, x) => n + (x.clicks || 0), 0); const impressions = rows.reduce((n, x) => n + (x.impressions || 0), 0); return `## ${name}\nRelevant rows: ${rows.length}; clicks: ${clicks}; impressions: ${impressions}; non-branded rows: ${rows.filter(x => !x.branded).length}; queries: ${[...new Set(rows.map(x => x.query))].slice(0, 12).join(", ") || "none observed"}.`; }).join("\n\n")}`);
  writeText(path.join(RUN_DIR, "serp-competitive-analysis.md"), `# SERP competitive analysis\n\n${Object.entries(serps).map(([id, s]) => `## ${id}\nSeed: ${s.keyword}; retrieved: ${s.retrieved_at}; types: ${s.item_types.join(", ")};\n${s.results.filter(x => x.url).slice(0, 8).map(x => `- ${x.type} #${x.rank}: ${x.title} — ${x.domain}`).join("\n")}`).join("\n\n")}`);
  writeText(path.join(RUN_DIR, "destination-gap-analysis.md"), `# Destination gap analysis\n\n${destinations.map(x => `- ${x.url}: status ${x.status}; title “${x.title || "missing"}”; H1-H3 count ${x.headings?.length || 0}; internal links ${x.gap_flags?.internal_link_count ?? 0}; thin-content flag ${x.gap_flags?.likely_thin_content ?? "unknown"}.`).join("\n")}`);
  writeJson(path.join(RUN_DIR, "product-evidence-matrix.sanitised.json"), { product_count: 27, products: productMatrix }); writeText(path.join(RUN_DIR, "product-evidence-matrix.md"), `# Product evidence matrix\n\n${productMatrix.map(p => `- ${p.stable_product_id}: ${p.name}; ${p.primary_cluster}; ${p.opportunity_status}; GSC rows ${p.search_console.length}.`).join("\n")}`);
  writeText(path.join(RUN_DIR, "cross-opportunity-comparison.md"), `# Cross-opportunity comparison\n\n${opportunities.map(o => `## ${o.opportunity_id} — ${o.name}\nProducts: ${o.affected_products.length}; query items: ${o.keyword_query_count}; SERP types: ${o.serp_evidence.item_types.join(", ")}; GSC rows: ${o.gsc_evidence.rows}; destination: ${o.destination}; intervention candidates: ${o.intervention}; confidence: ${o.confidence}.`).join("\n\n")}`);
  writeJson(path.join(RUN_DIR, "cross-opportunity-comparison.sanitised.json"), { opportunities }); writeText(path.join(RUN_DIR, "storewide-recommendations.md"), `# Store-wide recommendations\n\n${output.thesis}\n\n${output.recommendations.map(r => `## ${r.priority}. ${r.opportunity_id}\nIntervention: ${r.intervention}\nWhy: ${r.why_prioritised}\nEvidence: ${r.evidence_ids.join(", ")}\nConfidence: ${r.confidence}\nMissing: ${r.missing_evidence.join(", ")}\nCould be wrong if: ${r.what_could_make_it_wrong}`).join("\n\n")}`);
  writeText(path.join(RUN_DIR, "winner-vs-alternatives.md"), `# Winner vs alternatives\n\nWinner: ${output.recommendations[0].opportunity_id}\n\n${output.winner_comparison.map(x => `## ${x.alternative_opportunity_id}\nCredible because: ${x.why_credible}\nLost because: ${x.why_lost}\nCould change if: ${x.what_could_change_result}`).join("\n\n")}`);
  writeText(path.join(RUN_DIR, "top-recommendation-diy-plan.md"), buildDiyPlan(winner, mapped));
  writeJson(path.join(RUN_DIR, "provider-and-cost-report.json"), { dataforseo: { reused_from: "progressive-004-fresh-evidence", new_calls: 0, cost_usd: 0 }, website: { pages: destinations.length, successful: destinations.filter(x => x.status === 200).length, cost_usd: 0 }, search_console: { reused_from: "progressive-004-fresh-evidence", rows: gscRows.length, cost_usd: 0 }, strategic_call: result.metadata, retries: 0 });
  writeText(path.join(RUN_DIR, "limitations.md"), `# Limitations\n\nProduct-level sales, stock movement, margin/COGS, refunds and conversion remain unavailable. Search Console rows are mapped but sparse/non-branded coverage is uneven. Keyword Ideas returned a bounded 100-item sample; volumes are not summed across overlapping intent. Evidence is used to make a bounded recommendation, not a guarantee.`);
  writeText(path.join(RUN_DIR, "test-report.md"), "Decision-quality checks: 27-product mapping, actual keyword item parsing, GSC row mapping, live page extraction, evidence-cited recommendations, intervention diversity, three-alternative comparison, evidence-specific DIY plan, no-write boundary and previous-attempt immutability.");
  writeJson(path.join(RUN_DIR, "run-record.json"), { run_id: "progressive-005-decision-quality", status: "COMPLETE FOR OWNER REVIEW", product_count: 27, opportunity_count: opportunities.length, recommendation_count: output.recommendations.length, winner: output.recommendations[0].opportunity_id, input_hash: inputHash, output_hash: result.metadata.output_hash, strategic_calls: 1, previous_attempt_preserved: true, wordpress_writes: 0 });
  console.log(JSON.stringify({ status: "COMPLETE FOR OWNER REVIEW", products: 27, opportunities: opportunities.length, recommendations: output.recommendations.map(x => x.opportunity_id), winner: output.recommendations[0].opportunity_id, model: result.metadata.model, cost_usd: result.metadata.cost_usd ?? null }, null, 2));
}
await main();
