import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { buildCandidates, sanitiseCandidates, sha256, validateCandidates, captureCommercialSnapshot, RUBRIC, PUBLIC_DIR, ATTEMPT_DIR, PRIVATE_DIR, assertNoDecisionArtifacts } from "./index.js";

const products = [{ name: "Example towel", type: "drying towel", url: "https://example.test/product/towel" }, { name: "Example kit", type: "kit", url: "https://example.test/product/kit" }];
test("candidate records are non-commercial and stable across sanitisation", () => { const c = buildCandidates(products); validateCandidates(c); assert.deepEqual(sanitiseCandidates(c), c); assert.equal(sha256(c), sha256(c)); assert.ok(c.every(x => !JSON.stringify(x).match(/revenue|margin|stock/i))); });
test("commercial capture requires and preserves candidate hash", () => { const c = buildCandidates(products); const h = sha256(c); const snap = captureCommercialSnapshot({ candidateHash: h, candidates: c }); assert.equal(snap.status, "BLOCKED"); assert.equal(snap.candidate_universe_hash, h); assert.equal(snap.fields.current_stock.status, "missing"); });
test("commercial fields are rejected in candidate records", () => { const c = buildCandidates(products); c[0].revenue = 10; assert.throws(() => validateCandidates(c), /commercial fields/); });
test("rubric and thresholds are frozen", () => { assert.deepEqual(RUBRIC.dimensions.map(x => x[1]), [25, 20, 15, 15, 15, 10]); assert.equal(RUBRIC.thresholds[0], "Challenger at least 10 points above Control"); });
test("private path is ignored and public bundle has no commercial fields", () => { const ignored = execFileSync("git", ["check-ignore", "artifacts/private/v1-01/probe.json"], { encoding: "utf8" }); assert.ok(ignored); const text = fs.readFileSync(`${ATTEMPT_DIR}/candidate-universe.sanitised.json`, "utf8"); assert.doesNotMatch(text, /units_sold|revenue|sales_velocity|current_stock|cogs|margin/i); });
test("freeze outputs preserve exact dates and missing reliability statuses", () => { const readiness = JSON.parse(fs.readFileSync(`${ATTEMPT_DIR}/data-readiness.sanitised.json`)); assert.equal(readiness.status, "BLOCKED"); assert.match(fs.readFileSync(`${PRIVATE_DIR}/commercial-snapshot.json`, "utf8"), /missing/); assert.match(fs.readFileSync(`${PRIVATE_DIR}/commercial-snapshot.json`, "utf8"), /2026-08-23/); });
test("phase B cannot create decision artefacts", () => { assert.doesNotThrow(() => assertNoDecisionArtifacts()); });
