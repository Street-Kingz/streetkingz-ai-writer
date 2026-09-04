import test from "node:test";
import assert from "node:assert/strict";
import { buildProgressiveState, usableEvidenceKind } from "../product-kernel/organicEvidenceSnapshot.js";
import fs from "node:fs";

test("progressive source selection keeps a complete site primary beside a newer partial attempt", () => {
  assert.equal(usableEvidenceKind({ current_complete_run: 10, evidence_state: "partial" }, { state: "complete" }, 4), "current_complete");
  const state = buildProgressiveState({
    commerce: { selected_evidence: "usable" },
    site: { selected_evidence: "current_complete", source_state: "partial", limitations: ["latest_attempt_partial"] },
    search_console: { selected_evidence: "current_complete" },
    external_search: { selected_evidence: "usable_partial", source_state: "partial", limitations: ["provider_malformed"] }
  });
  assert.deepEqual(state.available_source_classes, ["commerce", "site", "search_console", "external_search"]);
  assert.deepEqual(state.partial_source_classes, ["site", "external_search"]);
  assert.deepEqual(state.limitations, ["site:latest_attempt_partial", "external_search:provider_malformed"]);
});

test("missing and partial evidence are not converted into zero facts", () => {
  const state = buildProgressiveState({
    commerce: { selected_evidence: "usable" },
    site: { selected_evidence: "none", source_state: "unavailable", limitations: ["not_collected"] },
    search_console: { selected_evidence: "not_connected", source_state: "not_connected", limitations: ["not_connected"] },
    external_search: { selected_evidence: "usable_partial", source_state: "partial", limitations: ["partial"] }
  });
  assert.deepEqual(state.unavailable_source_classes, ["site", "search_console"]);
  assert.deepEqual(state.partial_source_classes, ["external_search"]);
  assert.equal(state.limitations.includes("search_console:not_connected"), true);
});

test("no snapshot selection field is an opportunity or recommendation", () => {
  const state = buildProgressiveState({ external_search: { selected_evidence: "usable_partial" } });
  assert.equal(Object.keys(state).some(key => /score|rank|recommend|opportun|priority/i.test(key)), false);
});

test("snapshot is an authenticated read-only projection", () => {
  const route = fs.readFileSync(new URL("../routes/organicEvidence.js", import.meta.url), "utf8");
  assert.match(route, /router\.get\("\/api\/product\/organic-evidence\/snapshot"/);
  assert.doesNotMatch(route, /router\.post\("\/api\/product\/organic-evidence\/snapshot"/);
  assert.doesNotMatch(route, /opportun|recommend|priority|score/i);
});
