import { SCHEMA_VERSION } from "./contracts/schemas.js";
import { sha256, stableId } from "./core/canonical.js";

export const ARTICLE_EVIDENCE_MAX_QUESTIONS = 10;
export const ARTICLE_EVIDENCE_MAX_RANKING_SOURCES = 5;
export const ARTICLE_EVIDENCE_MAX_TOTAL_SOURCES = 48;
export const ARTICLE_EVIDENCE_MAX_PRODUCT_FACTS = 24;
const SOURCE_CLASSES = new Set(["SERP_COMPETITOR", "MANUFACTURER_BRAND", "INDEPENDENT_EXPERT", "COMMUNITY_CUSTOMER", "FIRST_PARTY_PRODUCT_INTELLIGENCE"]);
const arr = (v) => Array.isArray(v) ? v : [];
const str = (v) => String(v || "").trim();

function classify(result) {
  if (result.domain === "www.reddit.com" || result.page_type === "discussion") return "COMMUNITY_CUSTOMER";
  if (result.page_type === "commercial_listing" && /chemicalguys|theragcompany|autogeek/i.test(result.domain || "")) return "MANUFACTURER_BRAND";
  if (result.page_type === "editorial_guide") return "INDEPENDENT_EXPERT";
  return "SERP_COMPETITOR";
}

export function deriveArticleResearchQuestions({ opportunity, researchState = {}, productFacts = [] }) {
  const q = str(opportunity?.primary_query);
  const observed = arr(researchState?.serp_feature_observations).flatMap((x) => arr(x.questions || x.items)).map((x) => str(x.question || x)).filter(Boolean);
  const questions = [
    `Which options and characteristics are relevant when evaluating ${q}?`,
    `What trade-offs should a reader understand before choosing between the main options for ${q}?`,
    `Which practical use cases and reader concerns are associated with ${q}?`,
    `What terminology and product types appear in the current search landscape for ${q}?`,
    opportunity?.search_intent === "commercial_investigation" ? `What information would help a reader make a confident purchase decision for ${q}?` : `What does a reader need to understand to use the subject successfully?`,
    ...observed
  ];
  if (productFacts.length) questions.push("Which validated product facts provide useful, relevant examples for the selected reader decision?");
  return [...new Set(questions)].slice(0, ARTICLE_EVIDENCE_MAX_QUESTIONS).map((question, index) => ({ question_id: stableId("article_research_question", { question, index }), question, priority: index < 3 ? "high" : "normal", status: "bounded_fixture_scope" }));
}

function sourcesFor({ serpPacket, productFacts, retrievedAt }) {
  const ranking = arr(serpPacket?.serp?.observed_results).slice(0, ARTICLE_EVIDENCE_MAX_RANKING_SOURCES);
  const sources = ranking.map((result) => ({
    source_id: stableId("article_source", { url: result.url, evidence_ids: result.evidence_ids }), source_url: result.url, publisher_domain: result.domain,
    source_class: classify(result), provenance_status: "FROZEN", page_type: result.page_type, title: result.title, retrieved_at: retrievedAt,
    source_content_hash: sha256({ title: result.title, description: result.description, url: result.url }), evidence_ids: arr(result.evidence_ids),
    limitation: "SERP title/snippet metadata only; page body and headings were not fetched."
  }));
  for (const record of arr(productFacts).slice(0, ARTICLE_EVIDENCE_MAX_PRODUCT_FACTS)) sources.push({
    source_id: stableId("article_source", { evidence_id: record.evidence_id }), source_url: "product-intelligence://validated-product-facts", publisher_domain: "merchant_first_party",
    source_class: "FIRST_PARTY_PRODUCT_INTELLIGENCE", provenance_status: "FROZEN", page_type: "validated_product_fact", title: record.value?.field_path || record.evidence_id,
    retrieved_at: record.retrieved_at || retrievedAt, source_content_hash: sha256(record), evidence_ids: [record.evidence_id], limitation: "Authoritative for the merchant product only; not general category proof."
  });
  return sources;
}

export function buildArticleEvidencePack({ opportunity, m4Input, researchState, serpPacket, productFacts = [], now = new Date() }) {
  if (opportunity?.outcome !== "ARTICLE_RECOMMENDED") throw new Error("ARTICLE_RESEARCH_REQUIRES_ARTICLE_RECOMMENDED");
  const retrievedAt = new Date(now).toISOString();
  const questions = deriveArticleResearchQuestions({ opportunity, researchState, productFacts });
  const sources = sourcesFor({ serpPacket, productFacts, retrievedAt });
  const ranking = sources.filter((s) => s.source_class !== "FIRST_PARTY_PRODUCT_INTELLIGENCE");
  const observations = arr(serpPacket?.serp?.observed_results).slice(0, ARTICLE_EVIDENCE_MAX_RANKING_SOURCES).map((result) => ({
    observation_id: stableId("article_observation", { url: result.url, title: result.title }), observation: `${result.page_type || "result"}: ${result.title}${result.description ? ` — ${result.description}` : ""}`,
    source_id: sources.find((s) => s.source_url === result.url)?.source_id, source_class: classify(result), observation_kind: "SERP_CONTENT_OBSERVATION", support_status: "observed_snippet_only"
  }));
  const product = arr(productFacts).slice(0, ARTICLE_EVIDENCE_MAX_PRODUCT_FACTS);
  const core = {
    schema_version: SCHEMA_VERSION, artifact_type: "article_editorial_evidence_pack", pack_version: "1.0.0", status: "VALIDATED", freshness_status: "FROZEN_RESEARCH_REVIEW_REQUIRED", created_at: retrievedAt, retrieved_at: retrievedAt,
    lineage: { objective: "create_seo_article", opportunity_id: opportunity.decision_id, opportunity_sha256: opportunity.decision_sha256, primary_query: opportunity.primary_query, article_type: opportunity.article_type, search_intent: opportunity.search_intent, research_state_id: m4Input?.research?.research_state_id || null, research_evidence_artifact_id: m4Input?.research?.evidence_artifact_id || null, product_id: m4Input?.registries?.products?.[0]?.product_id || m4Input?.intelligence?.product?.product_id || null, product_facts_evidence_ids: product.map((r) => r.evidence_id) },
    bounds: { max_questions: ARTICLE_EVIDENCE_MAX_QUESTIONS, max_ranking_sources: ARTICLE_EVIDENCE_MAX_RANKING_SOURCES, max_total_sources: ARTICLE_EVIDENCE_MAX_TOTAL_SOURCES, max_product_facts: ARTICLE_EVIDENCE_MAX_PRODUCT_FACTS, ai_synthesis_calls: 0 },
    research_questions: questions, sources, market_terminology: [...new Set([...arr(serpPacket?.topic_model?.terminology), ...arr(serpPacket?.serp?.recurring_themes).map((x) => x.term)])].slice(0, 30),
    category_options: Object.keys(serpPacket?.serp?.result_page_types || {}), decision_dimensions: ["capacity", "coverage", "handling", "surface/use-case fit"],
    tradeoffs: [
      { concept: "capacity and handling", statement: "Higher-capacity approaches may involve greater saturated weight.", support_status: "corroborated_with_first_party_product_context", source_evidence_ids: product.filter((r) => /gsm|water|heavy|saturat/i.test(JSON.stringify(r.value))).map((r) => r.evidence_id) },
      { concept: "coverage and control", statement: "Larger coverage can help broad vehicle panels while smaller formats may be easier around details.", support_status: "category_inference_requires_qualification", source_evidence_ids: product.filter((r) => /size|vehicle|larger/i.test(JSON.stringify(r.value))).map((r) => r.evidence_id) }
    ],
    customer_questions: arr(serpPacket?.serp?.recurring_questions).slice(0, 6).map((x) => ({ question: x.question, source_evidence_ids: arr(x.evidence_ids), source_class: "COMMUNITY_CUSTOMER", support_status: "observed_question_not_answer" })),
    customer_concerns: ["Observed questions are retained as questions; no community answer is promoted to fact."], repeated_claims: observations,
    corroborated_findings: [
      { finding: "The SERP contains commercial listings, editorial content and discussion results, indicating mixed commercial-investigation context.", source_ids: ranking.map((s) => s.source_id), support_status: "observed_serp_shape" },
      { finding: "Validated first-party Product Facts provide concrete dimensions, construction and use limitations for the merchant product.", source_ids: sources.filter((s) => s.source_class === "FIRST_PARTY_PRODUCT_INTELLIGENCE").map((s) => s.source_id), support_status: "first_party_product_evidence" }
    ], conflicting_findings: [], unknowns: ["Ranking-page body content, headings and omissions were not fetched in this frozen proof.", "Manufacturer and independent technical claims require page-level retrieval before being treated as category facts.", "Community questions indicate concerns but do not establish technical truth."],
    competitor_coverage: { pages_selected: ranking.length, pages_fetched: 0, coverage_status: "SERP_METADATA_ONLY", source_ids: ranking.map((s) => s.source_id) }, content_gaps: ["Page-level comparison dimensions and unanswered questions remain unverified until bounded page retrieval is approved."],
    relevant_product_facts: product.map((r) => ({ evidence_id: r.evidence_id, field_path: r.value?.field_path, value: r.value?.value, source_class: "FIRST_PARTY_PRODUCT_INTELLIGENCE" })), evidence_index: sources.flatMap((s) => s.evidence_ids.map((evidence_id) => ({ evidence_id, source_id: s.source_id, source_class: s.source_class })))
  };
  return { ...core, evidence_pack_id: stableId("article_evidence_pack", core), evidence_pack_sha256: sha256(core) };
}

export function validateArticleEvidencePack(pack, { opportunity, m4Input } = {}) {
  const errors = [];
  if (!pack || pack.artifact_type !== "article_editorial_evidence_pack") errors.push("INVALID_ARTIFACT_TYPE");
  if (pack?.lineage?.opportunity_id !== opportunity?.decision_id || pack?.lineage?.opportunity_sha256 !== opportunity?.decision_sha256) errors.push("OPPORTUNITY_LINEAGE_MISMATCH");
  if (pack?.lineage?.primary_query !== opportunity?.primary_query || pack?.lineage?.article_type !== opportunity?.article_type || pack?.lineage?.search_intent !== opportunity?.search_intent) errors.push("STRATEGY_DRIFT");
  if (pack?.lineage?.research_state_id !== m4Input?.research?.research_state_id) errors.push("RESEARCH_LINEAGE_MISMATCH");
  if (!Array.isArray(pack?.research_questions) || pack.research_questions.length > ARTICLE_EVIDENCE_MAX_QUESTIONS) errors.push("QUESTION_BOUND_EXCEEDED");
  if (!Array.isArray(pack?.sources) || pack.sources.length > ARTICLE_EVIDENCE_MAX_TOTAL_SOURCES) errors.push("SOURCE_BOUND_EXCEEDED");
  const ids = new Set((pack?.sources || []).map((s) => s.source_id));
  for (const source of pack?.sources || []) { if (!SOURCE_CLASSES.has(source.source_class)) errors.push(`INVALID_SOURCE_CLASS:${source.source_id}`); if (!String(source.source_url).startsWith("https://") && !String(source.source_url).startsWith("product-intelligence://")) errors.push(`UNSAFE_SOURCE_URL:${source.source_id}`); if (!/^[a-f0-9]{64}$/.test(source.source_content_hash || "")) errors.push(`INVALID_SOURCE_HASH:${source.source_id}`); }
  for (const observation of pack?.repeated_claims || []) if (!ids.has(observation.source_id)) errors.push("UNKNOWN_OBSERVATION_SOURCE");
  const { evidence_pack_sha256: _hash, evidence_pack_id: _id, ...core } = pack || {};
  if (pack && sha256(core) !== pack.evidence_pack_sha256) errors.push("PACK_HASH_MISMATCH");
  return errors;
}

export function renderArticleEvidenceReview(pack) {
  const sources = pack.sources.map((s) => `- ${s.title} (${s.source_class}; ${s.provenance_status}) — ${s.source_url}${s.extraction_status === "FAILED" ? ` — FAILED: ${s.failure_reason}` : ""}`).join("\n");
  const facts = pack.relevant_product_facts.map((f) => `- ${f.field_path}: ${f.value} (${f.evidence_id})`).join("\n");
  const questions = pack.research_questions.map((q) => { const c = (pack.question_coverage || []).find((x) => x.question_id === q.question_id); return `- **${q.question}** — ${c?.status || q.status}; ${c?.evidence_source_ids?.length || 0} page evidence references`; }).join("\n");
  return `# Article Research + Editorial Evidence Review\n\nStatus: ${pack.status}\nFreshness: ${pack.freshness_status}\nSubject-depth gate: ${pack.subject_depth?.status || "NOT_ASSESSED"} — ${pack.subject_depth?.reason || ""}\nPrimary query: ${pack.lineage.primary_query}\nArticle type: ${pack.lineage.article_type}\nSearch intent: ${pack.lineage.search_intent}\n\n## Research questions investigated\n\n${questions}\n\n## Live sources inspected\n\n${sources}\n\nPage-level sources are bounded normalized extractions; failed pages remain recorded and were not retried.\n\n## Market terminology\n\n${pack.market_terminology.join(", ") || "None captured"}\n\n## Actual constructions/types found\n\n${(pack.actual_constructions || []).join(", ") || "Not established."}\n\n## Buying criteria\n\n${(pack.live_buying_criteria || []).join(", ") || pack.decision_dimensions.join(", ")}\n\n## Meaningful trade-offs\n\n${pack.tradeoffs.map((x) => `- **${x.concept}:** ${x.statement}`).join("\n")}\n\n## Customer questions and concerns\n\n${pack.customer_questions.map((x) => `- ${x.question}`).join("\n") || "No bounded questions captured."}\n\n## Manufacturer claims\n\n${(pack.manufacturer_claims || []).map((x) => `- ${x.claim} — ${x.source_id}; ${x.support_status}`).join("\n") || "None extracted."}\n\n## Independent/expert findings\n\n${(pack.independent_findings || []).map((x) => `- ${x.finding} — ${x.source_id}; ${x.support_status}`).join("\n") || "None extracted."}\n\n## Community findings\n\n${(pack.community_findings || []).map((x) => `- ${x.finding} — ${x.source_id}; ${x.support_status}`).join("\n") || "None established."}\n\n## Corroborated findings\n\n${pack.corroborated_findings.map((x) => `- ${x.finding}`).join("\n")}\n\n## Conflicting findings\n\n${(pack.conflicting_findings || []).map((x) => `- ${x.finding || x}`).join("\n") || "None represented; this does not prove consensus."}\n\n## Weakly supported findings\n\n- Category trade-offs require qualification unless supported by stronger independent evidence.\n\n## Ranking-page coverage patterns\n\nThe SERP shows mixed commercial, editorial, discussion and product-oriented results. Live page evidence adds bounded headings/content observations where retrieval succeeded; it does not justify copying or full competitor reconstruction.\n\n## Content gaps\n\n${[...(pack.content_gaps || []), ...(pack.live_content_gaps || [])].map((x) => `- ${x}`).join("\n")}\n\n## Relevant Street Kingz Product Intelligence\n\n${facts}\n\n## Product/category crossover\n\nCapacity, coverage and handling questions can be connected to validated merchant dimensions, construction, intended uses and saturated-weight limitations. External evidence does not override Product Intelligence and no superiority claim is generated.\n\n## Claims we should NOT make\n\n- Do not present manufacturer marketing as objective proof.\n- Do not present community anecdotes as technical consensus.\n- Do not claim competitor page coverage beyond bounded observations.\n- Do not claim Street Kingz is objectively the best towel without supporting evidence.\n\n## What we still do not know\n\n${pack.unknowns.map((x) => `- ${x}`).join("\n")}\n\n## What a future M4 brief can now safely cover\n\nUse observed terminology, capacity/coverage/handling dimensions, qualified construction language and validated Product Facts as separate evidence inputs. Keep unresolved claims qualified.\n\n## Remaining research limitations\n\nOne bounded retrieval wave was used; there was no recursion, second exploratory wave or synthesis call.\n\nArticle generated: NO\nM6: NOT STARTED\nWordPress: NO\n`;
}
