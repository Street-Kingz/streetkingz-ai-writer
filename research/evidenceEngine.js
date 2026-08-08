import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SCHEMA_VERSION } from "./contracts/schemas.js";
import { artifactHash, assertValid, validateCoverage, validateEvidenceArtifact, validateInterpretationPlaceholder, validateProviderResult } from "./validation/evidence.js";
import { sha256, stableId } from "./core/canonical.js";
import { renderEvidenceMarkdown } from "./renderers/evidence.js";

function safeTimestamp(value) {
  return value.replace(/[:.]/g, "-");
}

function productSlug(url) {
  return new URL(url).pathname.split("/").filter(Boolean).at(-1);
}

function providerFailure(provider, error, now) {
  const timestamp = now().toISOString();
  const result = {
    schema_version: SCHEMA_VERSION,
    artifact_type: "provider_result",
    provider_id: provider.id,
    provider_version: provider.version,
    provider_run_id: stableId("provider_run", { provider_id: provider.id, failed_at: timestamp }),
    request_fingerprint: stableId("failed_request", { provider_id: provider.id, failed_at: timestamp }),
    status: "failed",
    cache: { owner: provider.id, hit: false, directory: null, policy: provider.cachePolicy?.freshness || null },
    raw_artifacts: [],
    normalised_artifact: {},
    evidence_record_ids: [],
    started_at: timestamp,
    completed_at: timestamp,
    rate_limit: error.providerMetadata?.rateLimit || null,
    cost: error.providerMetadata?.cost || null,
    errors: [{
      type: error.name || "Error",
      code: error.code || "PROVIDER_FAILURE",
      message: error.message
    }],
    warnings: []
  };
  result.raw_artifacts = error.providerMetadata?.rawArtifacts || [];
  result.requested_evidence_types = provider.evidenceTypes || [];
  assertValid(`Failed provider result for ${provider.id}`, result, validateProviderResult);
  return result;
}

export function generateCoverage({ providerResults, records }) {
  const complete = providerResults.filter((result) => result.status === "complete").length;
  const usableRecordCount = records.filter((record) => record.status === "active").length;
  const status = usableRecordCount === 0
    ? "failed"
    : complete === providerResults.length
      ? "complete"
      : "partial";
  const evidenceTypeCounts = {};
  for (const record of records) {
    evidenceTypeCounts[record.evidence_type] = (evidenceTypeCounts[record.evidence_type] || 0) + 1;
  }
  const requestedEvidenceTypes = [...new Set(
    providerResults.flatMap((result) => result.requested_evidence_types || []).concat("product_fact")
  )].sort();
  const categoryTypes = {
    product_truth: (type) => type === "product_fact",
    market_demand: (type) => type === "keyword_idea",
    serp_competitive_evidence: (type) => type.startsWith("serp_"),
    first_party_search_console_evidence: (type) => type.startsWith("search_console_")
  };
  const evidenceCategories = Object.fromEntries(Object.entries(categoryTypes).map(([category, matches]) => {
    const matchingTypes = Object.keys(evidenceTypeCounts).filter(matches).sort();
    const recordCount = matchingTypes.reduce((sum, type) => sum + evidenceTypeCounts[type], 0);
    return [category, { available: recordCount > 0, record_count: recordCount, evidence_types: matchingTypes }];
  }));
  const coverage = {
    schema_version: SCHEMA_VERSION,
    artifact_type: "evidence_coverage",
    status,
    requested_providers: providerResults.map((result) => result.provider_id),
    provider_statuses: providerResults.map((result) => ({
      provider_id: result.provider_id,
      status: result.status,
      evidence_record_count: result.evidence_record_ids.length,
      errors: result.errors
    })),
    requested_evidence_types: requestedEvidenceTypes,
    evidence_type_counts: evidenceTypeCounts,
    evidence_categories: evidenceCategories,
    usable_record_count: usableRecordCount,
    missing_evidence_types: requestedEvidenceTypes.filter((type) => !evidenceTypeCounts[type])
  };
  return assertValid("Evidence coverage", coverage, validateCoverage);
}

export async function runEvidenceEngine({
  productFactsPath,
  evidenceArtifactPath,
  approvedBy = "local_user",
  providers,
  outputRoot = "artifacts/evidence",
  scope = { market: "GB", language: "en-GB" },
  now = () => new Date()
}) {
  if (!Array.isArray(providers) || !providers.length) throw new Error("At least one evidence provider is required.");
  const absoluteOutputRoot = path.resolve(outputRoot);
  const cacheRoot = path.join(absoluteOutputRoot, "cache");
  const executions = [];
  let subjectFacts = null;
  let subjectRequest = null;

  for (const provider of providers) {
    try {
      const preparedRequest = await provider.createRequest({
        productFactsPath,
        evidenceArtifactPath,
        scope,
        approval: { status: "approved", asserted_by: approvedBy }
      });
      subjectFacts ||= preparedRequest.facts;
      subjectRequest ||= preparedRequest.request;
      const execution = await provider.run({ preparedRequest, cacheRoot, now });
      execution.result.requested_evidence_types ||= provider.evidenceTypes || [];
      executions.push(execution);
    } catch (error) {
      executions.push({ result: providerFailure(provider, error, now), records: [], request: null });
    }
  }

  if (!subjectFacts || !subjectRequest) {
    const firstError = executions[0]?.result?.errors?.[0]?.message || "No provider accepted the product facts artifact.";
    throw new Error(`Evidence collection failed: ${firstError}`);
  }

  const providerResults = executions.map((execution) => execution.result);
  const records = executions.flatMap((execution) => execution.records).sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
  const coverage = generateCoverage({ providerResults, records });
  const createdAt = now().toISOString();
  const evidenceArtifactId = stableId("evidence", {
    subject_id: subjectRequest.subject_id,
    product_facts_sha256: subjectRequest.product_facts_ref.sha256,
    provider_runs: providerResults.map((result) => result.provider_run_id).sort(),
    evidence_record_ids: records.map((record) => record.evidence_id)
  });
  const evidenceRunId = `run_${safeTimestamp(createdAt)}_${evidenceArtifactId.slice(-8)}`;
  const runDirectory = path.join(absoluteOutputRoot, productSlug(subjectFacts.product_url), evidenceRunId);
  const evidence = {
    schema_version: SCHEMA_VERSION,
    artifact_type: "research_evidence",
    evidence_artifact_id: evidenceArtifactId,
    evidence_run_id: evidenceRunId,
    subject: {
      subject_id: subjectRequest.subject_id,
      product_url: subjectFacts.product_url,
      product_name: subjectFacts.product.name.value,
      product_type: subjectFacts.product.category_type.value,
      product_facts_ref: subjectRequest.product_facts_ref.path,
      product_facts_sha256: subjectRequest.product_facts_ref.sha256
    },
    scope: subjectRequest.scope,
    provider_runs: providerResults.map((result) => ({
      provider_id: result.provider_id,
      provider_version: result.provider_version,
      provider_run_id: result.provider_run_id,
      request_fingerprint: result.request_fingerprint,
      status: result.status,
      normalised_artifact: {
        path: result.normalised_artifact.path,
        sha256: result.normalised_artifact.sha256
      },
      rate_limit: result.rate_limit,
      cost: result.cost || null,
      evidence_record_count: result.evidence_record_ids.length,
      errors: result.errors,
      warnings: result.warnings
    })),
    records,
    coverage_ref: "coverage.json",
    created_at: createdAt,
    warnings: providerResults.flatMap((result) => result.warnings)
  };
  assertValid("Evidence artifact", evidence, validateEvidenceArtifact);
  const evidenceHash = artifactHash(evidence);
  const interpretation = {
    schema_version: SCHEMA_VERSION,
    artifact_type: "ai_interpretation",
    evidence_artifact_id: evidenceArtifactId,
    evidence_artifact_hash: evidenceHash,
    status: "not_generated",
    reason: "Evidence collection does not perform AI interpretation.",
    findings: []
  };
  assertValid("Interpretation placeholder", interpretation, validateInterpretationPlaceholder);

  const requestArtifact = {
    schema_version: SCHEMA_VERSION,
    artifact_type: "evidence_request",
    product_facts_ref: subjectRequest.product_facts_ref,
    scope: subjectRequest.scope,
    approval: subjectRequest.approval,
    provider_requests: executions.filter((execution) => execution.request).map((execution) => execution.request)
  };
  const summary = renderEvidenceMarkdown(evidence, coverage);
  await mkdir(runDirectory, { recursive: true });
  const files = {
    request: path.join(runDirectory, "request.json"),
    evidence: path.join(runDirectory, "evidence.json"),
    coverage: path.join(runDirectory, "coverage.json"),
    interpretation: path.join(runDirectory, "interpretation.json"),
    summary: path.join(runDirectory, "summary.md")
  };
  await Promise.all([
    writeFile(files.request, `${JSON.stringify(requestArtifact, null, 2)}\n`, "utf8"),
    writeFile(files.evidence, `${JSON.stringify(evidence, null, 2)}\n`, "utf8"),
    writeFile(files.coverage, `${JSON.stringify(coverage, null, 2)}\n`, "utf8"),
    writeFile(files.interpretation, `${JSON.stringify(interpretation, null, 2)}\n`, "utf8"),
    writeFile(files.summary, summary, "utf8")
  ]);
  return {
    evidence,
    coverage,
    interpretation,
    providerResults,
    files: { runDirectory, ...files },
    hashes: { evidence: evidenceHash, request: sha256(requestArtifact) }
  };
}
