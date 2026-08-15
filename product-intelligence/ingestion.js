import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";
import { resolveKnowledgeCandidates } from "./resolution.js";
import { extractRenderedPageEvidence, extractStreetKingzProductPostId } from "./renderedPageEvidence.js";
import { extractAuthoritativeProductEvidence } from "./woocommerceEvidence.js";

export const RAW_EVIDENCE_ARTIFACT_TYPE = "product_intelligence_raw_evidence";

export function validateStreetKingzProductUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("A valid absolute product URL is required."); }
  if (url.protocol !== "https:" || !/(^|\.)streetkingz\.co\.uk$/i.test(url.hostname) || !url.pathname.startsWith("/product/")) {
    throw new Error("URL must be an HTTPS Street Kingz product page.");
  }
  url.hash = "";
  return url.href;
}

function comparable(value) {
  return String(value ?? "").toLowerCase().replace(/&pound;/g, "£").replace(/[–—]/g, "-").replace(/\s*[×x]\s*/g, "x").replace(/\s+/g, " ").trim();
}

export function detectDeterministicConflicts(evidence) {
  const groups = new Map();
  for (const record of evidence) {
    const field = record.context?.comparable_field;
    if (!field || !["woocommerce", "rendered_product_page"].includes(record.source_type)) continue;
    if (!groups.has(field)) groups.set(field, []);
    groups.get(field).push(record);
  }
  const conflicts = [];
  for (const [field, records] of groups) {
    const bySource = new Map(records.map((record) => [record.source_type, record]));
    if (!bySource.has("woocommerce") || !bySource.has("rendered_product_page")) continue;
    const compared = [...bySource.values()];
    if (new Set(compared.map((record) => comparable(record.normalised_value))).size === 1) continue;
    const candidates = [...bySource.values()].map((record) => ({
      value: record.normalised_value, evidence_id: record.id, source_type: record.source_type, confidence: 1
    }));
    const result = resolveKnowledgeCandidates({ field, candidates });
    if (result.conflict) conflicts.push(result.conflict);
  }
  return conflicts;
}

function slugFromUrl(url) {
  return new URL(url).pathname.split("/").filter(Boolean).at(-1);
}

function safeTimestamp(value) {
  return value.replace(/[:.]/g, "-");
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

export async function ingestProductEvidence(productUrl, {
  readRenderedPage,
  readAuthoritativeProduct,
  now = () => new Date(),
  outputRoot = "artifacts/product-intelligence",
  writeArtifacts = true
} = {}) {
  const validatedUrl = validateStreetKingzProductUrl(productUrl);
  if (typeof readRenderedPage !== "function" || typeof readAuthoritativeProduct !== "function") throw new Error("Rendered-page and authoritative read dependencies are required.");
  const createdAt = now().toISOString();
  const rendered = await readRenderedPage(validatedUrl);
  const html = typeof rendered === "string" ? rendered : rendered.html;
  const renderedRetrieval = typeof rendered === "string" ? {} : (rendered.retrieval || {});
  const productId = extractStreetKingzProductPostId(html);
  const authoritative = await readAuthoritativeProduct({ productUrl: validatedUrl, productId });
  const authoritativePost = authoritative.authoritativePost || authoritative;
  const rawAuthoritative = authoritative.raw ?? authoritativePost;
  const authoritativeRetrieval = authoritative.retrieval || authoritativePost.provenance || {};
  const evidence = [
    ...extractAuthoritativeProductEvidence(authoritativePost, validatedUrl, createdAt),
    ...extractRenderedPageEvidence(html, validatedUrl, createdAt)
  ];
  const ids = evidence.map((record) => record.id);
  if (new Set(ids).size !== ids.length) throw new Error("Evidence ID collision detected.");
  const conflicts = detectDeterministicConflicts(evidence);
  const sourceFingerprint = sha256({ authoritative: sha256(rawAuthoritative), rendered_page: sha256(html) });
  const sourceCounts = Object.fromEntries([...new Set(evidence.map((record) => record.source_type))].sort().map((type) => [type, evidence.filter((record) => record.source_type === type).length]));
  const artifact = {
    schema_version: "1.0.0",
    artifact_type: RAW_EVIDENCE_ARTIFACT_TYPE,
    product_url: validatedUrl,
    created_at: createdAt,
    sources: {
      woocommerce: { retrieved: true, fingerprint: sha256(rawAuthoritative), request_count: authoritativeRetrieval.request_count ?? 1 },
      rendered_product_page: { retrieved: true, fingerprint: sha256(html), request_count: renderedRetrieval.request_count ?? 1 },
      faq: { record_count: sourceCounts.faq || 0 },
      internal_link: { record_count: sourceCounts.internal_link || 0 }
    },
    evidence,
    source_fingerprint: sourceFingerprint,
    conflict_candidates: conflicts,
    execution_metadata: {
      deterministic_steps: ["validate_product_url", "read_rendered_page", "resolve_product_post_id", "read_authoritative_product", "extract_literal_evidence", "detect_bounded_conflicts", "write_artifacts"],
      http_read_request_count: (renderedRetrieval.request_count ?? 1) + (authoritativeRetrieval.request_count ?? 1),
      source_types_used: Object.keys(sourceCounts),
      evidence_counts: sourceCounts,
      external_api_call_count: (renderedRetrieval.request_count ?? 1) + (authoritativeRetrieval.request_count ?? 1),
      ai_calls: 0,
      input_tokens: 0,
      output_tokens: 0,
      estimated_ai_cost: 0,
      write_operations: 0
    }
  };
  if (!writeArtifacts) return { artifact, paths: null, raw: { html, authoritative: rawAuthoritative } };

  const runDirectory = path.resolve(outputRoot, slugFromUrl(validatedUrl), safeTimestamp(createdAt));
  const rawDirectory = path.join(runDirectory, "raw");
  await mkdir(path.dirname(runDirectory), { recursive: true });
  await mkdir(runDirectory, { recursive: false });
  await mkdir(rawDirectory, { recursive: false });
  const paths = {
    runDirectory,
    rawWooCommerce: path.join(rawDirectory, "woocommerce.json"),
    rawRenderedPage: path.join(rawDirectory, "rendered-page.html"),
    retrievalMetadata: path.join(rawDirectory, "retrieval-metadata.json"),
    evidence: path.join(runDirectory, "raw-evidence.json"),
    runMetadata: path.join(runDirectory, "run-metadata.json")
  };
  await Promise.all([
    writeJson(paths.rawWooCommerce, rawAuthoritative),
    writeFile(paths.rawRenderedPage, html, { encoding: "utf8", flag: "wx" }),
    writeJson(paths.retrievalMetadata, { rendered_product_page: renderedRetrieval, woocommerce: authoritativeRetrieval, credentials_persisted: false, request_headers_persisted: false, write_capability: false }),
    writeJson(paths.evidence, artifact),
    writeJson(paths.runMetadata, { schema_version: "1.0.0", artifact_type: "product_intelligence_evidence_run", product_url: validatedUrl, product_id: productId, created_at: createdAt, source_fingerprint: sourceFingerprint, evidence_count: evidence.length, conflict_count: conflicts.length, execution_metadata: artifact.execution_metadata })
  ]);
  return { artifact, paths, raw: { html, authoritative: rawAuthoritative } };
}
