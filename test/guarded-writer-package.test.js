import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("writer source and package input contain no live execution authorisation", () => {
  assert.equal(fs.existsSync("wordpress-plugin/streetkingz-ai-guarded-writer/execution-authorisation.json"), false);
  assert.equal(fs.existsSync("wordpress-plugin/streetkingz-ai-guarded-writer/human-implementation-approval.json"), false);
  const packager = fs.readFileSync("scripts/packageGuardedWriterPlugin.js", "utf8");
  assert.match(packager, /Refusing to package live execution authorisation/);
  assert.match(packager, /Refusing to package a product approval artifact/);
  assert.doesNotMatch(packager, /writeFileSync\(.*human-implementation-approval\.json/s);
});
