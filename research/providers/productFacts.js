import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SCHEMA_VERSION } from "../contracts/schemas.js";
import {
  createEvidenceId,
  createRequestFingerprint,
  sha256,
  stableId
} from "../core/canonical.js";
import {
  assertValid,
  validateEvidenceRecord,
  validateProviderRequest,
  validateProviderResult
} from "../validation/evidence.js";

const PROVIDER_ID = "product_facts";
const PROVIDER_VERSION = "1.0.0";
const NORMALISER_VERSION = "1.0.0";

function portablePath(filePath) {
  const relative = path.relative(process.cwd(), filePath);
  return relative && !relative.startsWith("..") ? relative : filePath;
}

function factLeaves(value, currentPath = "product", output = []) {
  if (!value || typeof value !== "object") return output;
  if (Object.hasOwn(value, "value") && Object.hasOwn(value, "provenance")) {
    output.push({ fieldPath: currentPath, fact: value });
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => factLeaves(child, `${currentPath}[${index}]`, output));
  } else {
    Object.entries(value).forEach(([key, child]) => factLeaves(child, `${currentPath}.${key}`, output));
  }
  return output;
}

function fieldLabel(fieldPath) {
  return fieldPath
    .replace(/^product\./, "")
    .replace(/\[\d+\]/g, "")
    .split(".")
    .at(-1)
    .replaceAll("_", " ");
}

function confidenceFor(fact) {
  const derived = fact.provenance.extraction_method === "deterministic_derivation";
  const components = {
    source_reliability: 0.95,
    directness: derived ? 0.8 : 1,
    corroboration: 0,
    freshness: 1,
    extraction_integrity: derived ? 0.9 : 1
  };
  const score = Number((
    components.source_reliability * 0.35 +
    components.directness * 0.25 +
    components.corroboration * 0.2 +
    components.freshness * 0.1 +
    components.extraction_integrity * 0.1
  ).toFixed(4));
  return {
    scoring_version: "1.0.0",
    score,
    components,
    rationale: derived
      ? "Reviewed first-party product fact produced by deterministic derivation."
      : "Reviewed first-party product fact extracted directly from the rendered product page."
  };
}

async function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export function createProductFactsProvider() {
  return {
    id: PROVIDER_ID,
    version: PROVIDER_VERSION,
    evidenceTypes: ["product_fact"],
    cachePolicy: { owner: PROVIDER_ID, freshness: "until_input_hash_changes" },

    async createRequest({ productFactsPath, scope, approval }) {
      const absolutePath = path.resolve(productFactsPath);
      const raw = await readFile(absolutePath, "utf8");
      const facts = JSON.parse(raw);
      if (facts.artifact_type !== "product_facts" || facts.schema_version !== "1.0.0") {
        throw new Error("Product Facts Provider requires a Phase 2 product_facts artifact.");
      }
      if (approval?.status !== "approved") {
        throw new Error("Product Facts Provider requires explicit approval of the Phase 2 artifact.");
      }
      const subjectId = stableId("product", { product_url: facts.product_url });
      const request = {
        schema_version: SCHEMA_VERSION,
        artifact_type: "provider_request",
        provider_id: PROVIDER_ID,
        subject_id: subjectId,
        product_facts_ref: {
          path: portablePath(absolutePath),
          sha256: sha256(raw),
          artifact_type: facts.artifact_type,
          schema_version: facts.schema_version
        },
        scope: {
          market: scope?.market || "GB",
          language: scope?.language || "en-GB"
        },
        approval: {
          status: "approved",
          asserted_by: approval.asserted_by || "local_user"
        }
      };
      assertValid("Product facts provider request", request, validateProviderRequest);
      return { request, facts, raw, absolutePath };
    },

    requestFingerprint(request) {
      return createRequestFingerprint({
        provider_id: PROVIDER_ID,
        provider_version: PROVIDER_VERSION,
        product_facts_sha256: request.product_facts_ref.sha256,
        subject_id: request.subject_id,
        scope: request.scope,
        approval_status: request.approval.status
      });
    },

    async run({ preparedRequest, cacheRoot, now }) {
      const { request, facts, raw } = preparedRequest;
      const requestFingerprint = this.requestFingerprint(request);
      const cacheDirectory = path.join(path.resolve(cacheRoot), PROVIDER_ID, requestFingerprint);
      const rawPath = path.join(cacheDirectory, "raw.json");
      const normalisedPath = path.join(cacheDirectory, "normalised.json");
      const runPath = path.join(cacheDirectory, "run.json");
      const cachedNormalised = await readJsonIfPresent(normalisedPath);
      const cachedRun = await readJsonIfPresent(runPath);

      if (cachedNormalised && cachedRun) {
        const result = {
          ...cachedRun,
          cache: { ...cachedRun.cache, hit: true }
        };
        assertValid("Cached product facts provider result", result, validateProviderResult);
        return { result, records: cachedNormalised.records, request, cacheDirectory };
      }

      const retrievedAt = now().toISOString();
      const providerRunId = stableId("provider_run", {
        provider_id: PROVIDER_ID,
        request_fingerprint: requestFingerprint
      });
      const rawHash = sha256(raw);
      const rawReference = {
        path: `provider-cache://${PROVIDER_ID}/${requestFingerprint}/raw.json`,
        local_path: portablePath(rawPath),
        sha256: rawHash
      };
      const records = factLeaves(facts.product).map(({ fieldPath, fact }) => {
        const value = {
          field_path: fieldPath,
          label: fieldLabel(fieldPath),
          value: fact.value
        };
        const evidenceId = createEvidenceId({
          providerId: PROVIDER_ID,
          evidenceType: "product_fact",
          subjectId: request.subject_id,
          sourceRecordId: fieldPath,
          value: fact.value
        });
        const record = {
          evidence_id: evidenceId,
          provider_id: PROVIDER_ID,
          provider_run_id: providerRunId,
          evidence_type: "product_fact",
          subject_id: request.subject_id,
          seed_ids: [],
          query_or_question: null,
          value,
          context: {
            market: request.scope.market,
            language: request.scope.language,
            product_url: facts.product_url
          },
          observed_at: facts.extracted_at,
          retrieved_at: retrievedAt,
          provenance: {
            provider_id: PROVIDER_ID,
            provider_version: PROVIDER_VERSION,
            source_owner: facts.source_owner || facts.business_name || "product_owner",
            source_url: fact.provenance.source_url,
            source_record_id: fieldPath,
            query_seed: null,
            market: request.scope.market,
            language: request.scope.language,
            observed_at: facts.extracted_at,
            retrieved_at: retrievedAt,
            raw_artifact: rawReference,
            locator: {
              type: "phase_2_field_path",
              value: fieldPath
            },
            extraction_method: fact.provenance.extraction_method,
            normaliser_version: NORMALISER_VERSION,
            parent_evidence_ids: [],
            source_page: {
              artifact: fact.provenance.source_artifact,
              selector: fact.provenance.selector,
              evidence: fact.provenance.evidence
            }
          },
          confidence: confidenceFor(fact),
          raw_ref: rawReference,
          normaliser_version: NORMALISER_VERSION,
          status: "active"
        };
        assertValid(`Evidence record ${fieldPath}`, record, validateEvidenceRecord);
        return record;
      });
      records.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));

      const normalised = {
        schema_version: SCHEMA_VERSION,
        artifact_type: "normalised_provider_evidence",
        provider_id: PROVIDER_ID,
        provider_version: PROVIDER_VERSION,
        provider_run_id: providerRunId,
        request_fingerprint: requestFingerprint,
        records
      };
      const normalisedText = `${JSON.stringify(normalised, null, 2)}\n`;
      const result = {
        schema_version: SCHEMA_VERSION,
        artifact_type: "provider_result",
        provider_id: PROVIDER_ID,
        provider_version: PROVIDER_VERSION,
        provider_run_id: providerRunId,
        request_fingerprint: requestFingerprint,
        status: "complete",
        cache: {
          owner: PROVIDER_ID,
          hit: false,
          directory: portablePath(cacheDirectory),
          policy: "until_input_hash_changes"
        },
        raw_artifacts: [rawReference],
        normalised_artifact: {
          path: `provider-cache://${PROVIDER_ID}/${requestFingerprint}/normalised.json`,
          local_path: portablePath(normalisedPath),
          sha256: sha256(normalisedText)
        },
        evidence_record_ids: records.map((record) => record.evidence_id),
        started_at: retrievedAt,
        completed_at: retrievedAt,
        rate_limit: null,
        errors: [],
        warnings: []
      };
      assertValid("Product facts provider result", result, validateProviderResult);

      await mkdir(cacheDirectory, { recursive: true });
      await writeFile(rawPath, raw, "utf8");
      await writeFile(normalisedPath, normalisedText, "utf8");
      await writeFile(runPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
      return { result, records, request, cacheDirectory };
    }
  };
}
