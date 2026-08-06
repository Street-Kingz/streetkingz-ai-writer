import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createEvidenceId } from "../research/core/canonical.js";
import { runEvidenceEngine, generateCoverage } from "../research/evidenceEngine.js";
import { createProductFactsProvider } from "../research/providers/productFacts.js";
import {
  validateEvidenceArtifact,
  validateEvidenceRecord,
  validateProvenance
} from "../research/validation/evidence.js";

const FACTS_PATH = "artifacts/product-extraction/heavy-duty-drying-towel-1200gsm/2026-08-06T16-37-16-159Z/facts.json";
const FIXED_TIME = "2026-08-06T17:00:00.000Z";

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "streetkingz-evidence-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function buildEvidence(t, options = {}) {
  const outputRoot = options.outputRoot || await temporaryDirectory(t);
  return runEvidenceEngine({
    productFactsPath: options.productFactsPath || FACTS_PATH,
    approvedBy: "test_user",
    providers: options.providers || [createProductFactsProvider()],
    outputRoot,
    now: () => new Date(FIXED_TIME)
  });
}

test("evidence contracts validate a complete artifact and reject schema drift", async (t) => {
  const result = await buildEvidence(t);
  assert.deepEqual(validateEvidenceArtifact(result.evidence), []);
  assert.ok(result.evidence.records.length > 0);
  assert.equal(result.interpretation.status, "not_generated");
  assert.deepEqual(result.interpretation.findings, []);

  const invalid = structuredClone(result.evidence);
  invalid.schema_version = "99.0.0";
  invalid.records[0].confidence.score = 2;
  const errors = validateEvidenceArtifact(invalid);
  assert.ok(errors.some((error) => error.includes("schema_version")));
  assert.ok(errors.some((error) => error.includes("confidence.score")));
});

test("evidence IDs are stable across object key ordering and change with evidence", () => {
  const first = createEvidenceId({
    providerId: "product_facts",
    evidenceType: "product_fact",
    subjectId: "product_123",
    sourceRecordId: "product.features[0]",
    value: { label: "Weight", value: "1200 GSM" }
  });
  const reordered = createEvidenceId({
    value: { value: "1200 GSM", label: "Weight" },
    sourceRecordId: "product.features[0]",
    subjectId: "product_123",
    evidenceType: "product_fact",
    providerId: "product_facts"
  });
  const changed = createEvidenceId({
    providerId: "product_facts",
    evidenceType: "product_fact",
    subjectId: "product_123",
    sourceRecordId: "product.features[0]",
    value: { label: "Weight", value: "1100 GSM" }
  });
  assert.equal(first, reordered);
  assert.notEqual(first, changed);
});

test("every product fact retains valid raw and page-level provenance", async (t) => {
  const { evidence } = await buildEvidence(t);
  for (const record of evidence.records) {
    assert.deepEqual(validateEvidenceRecord(record), []);
    assert.deepEqual(validateProvenance(record.provenance), []);
    assert.equal(record.provider_id, "product_facts");
    assert.match(record.provenance.raw_artifact.path, /^provider-cache:\/\/product_facts\//);
    assert.equal(record.provenance.locator.type, "phase_2_field_path");
    assert.ok(record.provenance.source_page.selector);
    assert.ok(record.provenance.source_page.evidence);
  }

  const broken = structuredClone(evidence.records[0].provenance);
  delete broken.raw_artifact.sha256;
  assert.ok(validateProvenance(broken).some((error) => error.includes("raw_artifact.sha256")));
});

test("request hashes are stable and provider cache keys change with inputs", async (t) => {
  const directory = await temporaryDirectory(t);
  const provider = createProductFactsProvider();
  const approval = { status: "approved", asserted_by: "test_user" };
  const original = await provider.createRequest({ productFactsPath: FACTS_PATH, scope: { market: "GB", language: "en-GB" }, approval });
  const copiedPath = path.join(directory, "facts-copy.json");
  const raw = await readFile(FACTS_PATH, "utf8");
  await writeFile(copiedPath, raw, "utf8");
  const copy = await provider.createRequest({ productFactsPath: copiedPath, scope: { market: "GB", language: "en-GB" }, approval });
  const otherMarket = await provider.createRequest({ productFactsPath: copiedPath, scope: { market: "US", language: "en-US" }, approval });

  assert.equal(provider.requestFingerprint(original.request), provider.requestFingerprint(copy.request));
  assert.notEqual(provider.requestFingerprint(copy.request), provider.requestFingerprint(otherMarket.request));
  await assert.rejects(
    provider.createRequest({ productFactsPath: FACTS_PATH, scope: {}, approval: { status: "pending" } }),
    /explicit approval/
  );
});

test("coverage reports complete, partial, and failed provider outcomes", async (t) => {
  const completeRun = await buildEvidence(t);
  assert.equal(completeRun.coverage.status, "complete");
  assert.equal(completeRun.coverage.usable_record_count, completeRun.evidence.records.length);
  assert.equal(completeRun.coverage.evidence_type_counts.product_fact, completeRun.evidence.records.length);

  const failedProvider = {
    id: "future_provider",
    version: "1.0.0",
    cachePolicy: { freshness: "one_day" },
    async createRequest() { throw new Error("Fixture provider unavailable"); }
  };
  const partialRun = await buildEvidence(t, {
    outputRoot: await temporaryDirectory(t),
    providers: [createProductFactsProvider(), failedProvider]
  });
  assert.equal(partialRun.coverage.status, "partial");
  assert.equal(partialRun.coverage.provider_statuses[1].status, "failed");
  assert.match(partialRun.coverage.provider_statuses[1].errors[0].message, /unavailable/);

  const failedCoverage = generateCoverage({ providerResults: [partialRun.providerResults[1]], records: [] });
  assert.equal(failedCoverage.status, "failed");
  assert.deepEqual(failedCoverage.missing_evidence_types, ["product_fact"]);
});

test("cached and uncached runs produce deterministic evidence artifacts", async (t) => {
  const outputRoot = await temporaryDirectory(t);
  const first = await buildEvidence(t, { outputRoot });
  const second = await buildEvidence(t, { outputRoot });

  assert.equal(first.providerResults[0].cache.hit, false);
  assert.equal(second.providerResults[0].cache.hit, true);
  assert.deepEqual(second.evidence, first.evidence);
  assert.deepEqual(second.coverage, first.coverage);
  assert.deepEqual(second.interpretation, first.interpretation);
  assert.equal(await readFile(second.files.evidence, "utf8"), `${JSON.stringify(first.evidence, null, 2)}\n`);
  assert.equal(await readFile(second.files.summary, "utf8"), await readFile(first.files.summary, "utf8"));
});
