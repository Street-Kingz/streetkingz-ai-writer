import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { RUN_DIR, buildRun } from "./progressive.js";

const { sparse, enriched, comparison } = buildRun();
test("sparse evidence produces bounded recommendations without requiring traffic", () => { assert.equal(sparse.length, 4); assert.equal(sparse[0].evidence_maturity, "FOUNDATION_SPARSE"); assert.ok(sparse.some(r => r.archetype !== "create_justified_new_resource")); });
test("overlapping search intent is represented as a cluster, not one product per candidate", () => { assert.ok(sparse.every(r => r.evidence_refs.length >= 2)); assert.ok(sparse.some(r => r.archetype === "improve_internal_linking_or_structure")); });
test("enriched evidence may preserve top priority while explaining confidence limits", () => { assert.equal(comparison.top_recommendation_changed, false); assert.ok(comparison.confidence_changes.length); assert.ok(enriched.every(r => r.evidence_maturity === "ENRICHED_LIMITED")); });
test("public recommendation records do not contain sensitive commercial values", () => { const text = fs.readFileSync(`${RUN_DIR}/enriched-recommendations.sanitised.json`, "utf8"); assert.doesNotMatch(text, /email|phone|address|£\s*\d|\$\s*\d/i); });
test("DIY plan contains required sections and no execution call", () => { const text = fs.readFileSync(`${RUN_DIR}/top-recommendation-diy-plan.md`, "utf8"); for (const heading of ["Objective", "Prerequisites", "Required access", "Ordered steps", "What not to change", "QA checklist", "Verification and monitoring"]) assert.match(text, new RegExp(heading)); assert.doesNotMatch(text, /wordpress write|publish automatically/i); });
