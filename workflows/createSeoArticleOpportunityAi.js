import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256, stableId } from "../research/core/canonical.js";
import { invokeControlledCall, writeImmutableArtifact } from "../interpretation/call-control.js";
import { articleOpportunityJsonSchema, ARTICLE_OPPORTUNITY_OUTCOMES, ARTICLE_TYPES, ARTICLE_SEARCH_INTENTS, validateArticleOpportunityDecision } from "./createSeoArticleOpportunity.js";

export const ARTICLE_OPPORTUNITY_MODEL = "gpt-5.6-sol";
export const ARTICLE_OPPORTUNITY_SYSTEM_PROMPT = "You are a bounded article-opportunity reasoner. Use only the supplied validated evidence packet. Treat AUTHORITATIVE_SEO_GUIDANCE, WEB_STRUCTURED_DATA_STANDARDS, EMPIRICAL_SEARCH_EVIDENCE and FIRST_PARTY_PERFORMANCE as distinct evidence classes. For Google decisions, supplied Google guidance is primary; Bing cannot override it. Schema.org and W3C/WAI are standards, not ranking-factor evidence. Do not browse, invent metrics, facts, competitors, product claims, business claims, policy claims or site coverage. Choose only supplied candidate queries and allowed article types/intents. Highest volume is not automatically best. Return JSON only; do not draft, publish or create a brief.";

function candidateByQuery(input, query) { return input.candidates.find((candidate) => candidate.query === query); }

export function validateArticleOpportunityAiOutput(output, input) {
  const errors = [];
  if (!output || typeof output !== "object") return ["Decision must be an object."];
  if (!ARTICLE_OPPORTUNITY_OUTCOMES.includes(output.outcome)) errors.push("Unsupported outcome.");
  if (!ARTICLE_TYPES.includes(output.article_type)) errors.push("Unsupported article type.");
  if (!ARTICLE_SEARCH_INTENTS.includes(output.search_intent)) errors.push("Unsupported search intent.");
  const primary = candidateByQuery(input, output.primary_query);
  if (output.outcome === "ARTICLE_RECOMMENDED" && !primary) errors.push("Primary query is not present in the candidate packet.");
  for (const query of output.supporting_queries || []) if (!candidateByQuery(input, query)) errors.push(`Supporting query is not present in the candidate packet: ${query}.`);
  const knownEvidence = new Set(input.candidates.flatMap((candidate) => [...candidate.evidence_ids, ...candidate.serp.flatMap((item) => [item.evidence_id])]));
  for (const id of output.evidence_ids || []) if (!knownEvidence.has(id) && !input.product.evidence_ids.includes(id)) errors.push(`Unknown evidence reference: ${id}.`);
  if (Object.hasOwn(output, "metrics") || Object.hasOwn(output, "search_volume") || Object.hasOwn(output, "keyword_difficulty") || Object.hasOwn(output, "cpc_usd")) errors.push("Decision may not introduce metric fields.");
  if (output.outcome !== "ARTICLE_RECOMMENDED" && output.primary_query) errors.push("Non-recommendation outcomes must not select a primary query.");
  if (output.outcome === "ARTICLE_RECOMMENDED" && input.research_sufficiency?.state !== "sufficient") errors.push("ARTICLE_RECOMMENDED requires sufficient research.");
  if (output.outcome === "NO_ARTICLE_RECOMMENDED" && input.research_sufficiency?.state !== "sufficient") errors.push("NO_ARTICLE_RECOMMENDED requires sufficient research.");
  errors.push(...validateArticleOpportunityDecision({ ...output, evidence_ids: output.evidence_ids || [] }, { evidenceIds: [...knownEvidence, ...input.product.evidence_ids] }));
  return [...new Set(errors)];
}

function humanReview(decision, input, metadata) {
  const alternatives = (decision.alternatives_considered || []).map((item) => `- ${item.query}: ${item.reason}`).join("\n") || "- None recorded.";
  const guidance = input.authoritative_seo_guidance?.status === "not_supplied" ? "Not supplied" : `Current snapshot (${input.authoritative_seo_guidance?.freshness_status || "unknown"}); Google Search guidance was primary and other standards/search-engine perspectives remained separate.`;
  return `# SEO Article Opportunity Review\n\n## Recommended direction\n\nArticle type: ${decision.article_type}\nPrimary search opportunity: ${decision.primary_query || "None"}\nSearch intent: ${decision.search_intent}\n\n## Why this opportunity\n\n${decision.rationale}\n\n## Why it fits the product\n\n${decision.reader_problem}\n\n## SEO guidance used\n\n${guidance}\n\n## Supporting search opportunities\n\n${(decision.supporting_queries || []).map((query) => `- ${query}`).join("\n") || "- None."}\n\n## Alternatives considered\n\n${alternatives}\n\n## What we know from search results\n\nEvidence-backed observations were supplied to the controlled decision and validated by reference.\n\n## What we do not know yet\n\n${(decision.unknowns || decision.risks || ["No additional unknowns recorded."]).map((item) => `- ${item}`).join("\n")}\n\n## Next step\n\nStructured Article Brief + Page Plan\n\nDecision model: ${metadata.model}\n`;
}

export async function runControlledArticleOpportunityDecision({ input, provider, outputDirectory, now = () => new Date(), maxCalls = 1 }) {
  if (!provider || typeof provider.generate !== "function" || !provider.model) throw Object.assign(new Error("Article opportunity decision provider is unavailable."), { code: "DECISION_UNAVAILABLE" });
  const userPrompt = `Choose the strongest article opportunity for the create_seo_article objective. Consider intent, reader usefulness, product and business fit, SERP shape, differentiation, demand and risks. Do not use highest volume as an automatic rule.\n\nINPUT:\n${JSON.stringify(input)}`;
  const schema = articleOpportunityJsonSchema([...new Set([...input.product.evidence_ids, ...input.candidates.flatMap((candidate) => [...candidate.evidence_ids, ...candidate.serp.flatMap((item) => item.evidence_id)])])], input.candidates.map((candidate) => candidate.query));
  await mkdir(path.resolve(outputDirectory), { recursive: true });
  const controlled = await invokeControlledCall({ benchmarkDirectory: path.resolve(outputDirectory), modelLabel: provider.model, maxCalls, retries: 0, now, invoke: async ({ callDirectory, signal }) => {
    const request = provider.requestPayload ? provider.requestPayload({ systemPrompt: ARTICLE_OPPORTUNITY_SYSTEM_PROMPT, userPrompt, responseSchema: schema, temperature: 0.1 }) : null;
    await writeImmutableArtifact(callDirectory, "opportunity-input.json", { ...input, input_sha256: sha256(input), model_configuration: { provider: provider.id || "injected", model: provider.model, settings: provider.settings || null }, request });
    const response = await provider.generate({ systemPrompt: ARTICLE_OPPORTUNITY_SYSTEM_PROMPT, userPrompt, responseSchema: schema, signal });
    await writeImmutableArtifact(callDirectory, "opportunity-response-raw.json", { provider: response.provider, model: response.model, response_id: response.response_id || null, raw_text: response.rawText, usage: response.usage || null });
    let parsed; try { parsed = JSON.parse(response.rawText); } catch (error) { throw Object.assign(new Error("Opportunity model returned malformed JSON."), { code: "INVALID_DECISION", cause: error }); }
    const errors = validateArticleOpportunityAiOutput(parsed, input);
    const validation = { artifact_type: "article_opportunity_validation", status: errors.length ? "FAIL" : "PASS", errors };
    await writeImmutableArtifact(callDirectory, "opportunity-validation.json", validation);
    if (errors.length) throw Object.assign(new Error("Article opportunity decision failed validation."), { code: "INVALID_DECISION", errors });
    const metadata = { artifact_type: "article_opportunity_run_metadata", model: response.model || provider.model, provider: response.provider || provider.id || "injected", api: provider.settings?.api || "injected", reasoning: provider.settings?.reasoning || null, usage: response.usage || {}, evidence_count: input.candidates.length, input_sha256: sha256(input), validation_status: "PASS", ai_calls: 1 };
    const decision = { ...parsed, objective: "create_seo_article", decision_id: stableId("article_opportunity", { input_sha256: sha256(input), output: parsed }), source_input_sha256: sha256(input), model: metadata.model, metadata, seo_guidance_provenance: !input.authoritative_seo_guidance || input.authoritative_seo_guidance.status === "not_supplied" ? null : { snapshot_id: input.authoritative_seo_guidance.snapshot_id, snapshot_sha256: input.authoritative_seo_guidance.snapshot_sha256, source_manifest_version: input.authoritative_seo_guidance.source_manifest_version, freshness_status: input.authoritative_seo_guidance.freshness_status } };
    await writeImmutableArtifact(callDirectory, "opportunity-decision.json", decision);
    await writeFile(path.join(callDirectory, "opportunity-review.md"), humanReview(parsed, input, metadata), "utf8");
    return { decision, validation, metadata, callDirectory };
  }});
  return { ...controlled.result, lifecycle: controlled.lifecycle };
}
