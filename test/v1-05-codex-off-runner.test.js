import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Codex-off runner is a Product-route runner with bounded recovery markers", () => {
  const source = fs.readFileSync("scripts/validation/v1-05-streetkingz-codex-off-recovery.mjs", "utf8");
  assert.match(source, /\/api\/product\/decision-runs\/\$\{manifest\.recovery_run_id\}\/evaluate/);
  assert.match(source, /\/api\/product\/decision-runs\/\$\{manifest\.recovery_run_id\}\/recommendations/);
  assert.match(source, /allowed_batch_indexes\?\.join\(.*,.*\) !== "3,4"/);
  assert.match(source, /max_additional_requests !== 2/);
  assert.match(source, /deadline_ms !== 180000/);
  assert.match(source, /RECOVERY_DESTINATION_MUST_BE_LOCAL_HTTP/);
  assert.doesNotMatch(source, /candidate_type.*=>|if \(.*query|manual/i);
});

test("Codex-off runner exposes read-only retrieval without generation", () => {
  const source = fs.readFileSync("scripts/validation/v1-05-streetkingz-codex-off-recovery.mjs", "utf8");
  const readBranch = source.slice(source.indexOf('if (mode === "read")'), source.indexOf('} else {', source.indexOf('if (mode === "read")')));
  assert.doesNotMatch(readBranch, /fetch\(|app\.listen|\/evaluate|\/recommendations/);
  assert.match(readBranch, /saved_fields/);
});
