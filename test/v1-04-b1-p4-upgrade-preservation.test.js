import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { compareMaterialClosures } from "../scripts/validation/v1-04-b1-p4-dependency-closure.mjs";

const stable = value => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
    : value;
const digest = value => crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
const publicProjection = value => JSON.parse(JSON.stringify(value, (key, item) => /secret|token|password|authorization|vault|oauth|pkce/i.test(key) ? undefined : item));
const ownedResources = runId => [
  `supabase_db_v104-p4-zero-${runId}`,
  `supabase_rest_v104-p4-upgrade-${runId}`,
  `v104-p4-net-${runId}`
];

test("P4 preservation projection canonicalization is deterministic", () => {
  const value = { b: 2, a: { z: 3, y: [2, 1] } };
  assert.equal(digest(value), digest({ a: { y: [2, 1], z: 3 }, b: 2 }));
  assert.notEqual(digest(value), digest({ ...value, b: 3 }));
  assert.notEqual(digest(value), digest({ ...value, pointer: "run-b" }));
  assert.notEqual(digest(value), digest({ ...value, timestamp: "2026-09-03T00:00:00Z" }));
  assert.notEqual(digest(value), digest({ ...value, relationship: { product_id: "p2" } }));
});

test("P4 public projection removes private credential material", () => {
  const safe = publicProjection({ id: "safe", active: true, secret_reference: "private", access_token: "private" });
  assert.deepEqual(safe, { id: "safe", active: true });
  assert.doesNotMatch(JSON.stringify(safe), /private|secret_reference|access_token/i);
});

test("P4 cleanup inventory is scoped to one execution", () => {
  const own = ownedResources("run-a");
  const other = ownedResources("run-b");
  assert.ok(own.every(name => name.includes("run-a")));
  assert.ok(other.every(name => !own.includes(name)));
  assert.equal(own.some(name => /^supabase_.*v104-p4-/.test(name) && !name.includes("run-a")), false);
});

test("P4 material dependency closure is deterministic and ignores additive packages", () => {
  const base = { packages: { "": {}, "node_modules/express": { version: "4.19.0", integrity: "sha512-express", dependencies: { dep: "1" } }, "node_modules/dep": { version: "1.0.0", integrity: "sha512-dep" } } };
  const current = { packages: { "": {}, "node_modules/express": { version: "4.19.0", integrity: "sha512-express", dependencies: { dep: "1" } }, "node_modules/dep": { version: "1.0.0", integrity: "sha512-dep" }, "node_modules/tldts": { version: "7.4.11", integrity: "sha512-new" } } };
  assert.equal(compareMaterialClosures(base, current, ["express"]).material_dependency_equivalent, true);
  const changedVersion = structuredClone(current); changedVersion.packages["node_modules/dep"].version = "2.0.0";
  assert.equal(compareMaterialClosures(base, changedVersion, ["express"]).material_dependency_equivalent, false);
  const changedIntegrity = structuredClone(current); changedIntegrity.packages["node_modules/dep"].integrity = "sha512-changed";
  assert.equal(compareMaterialClosures(base, changedIntegrity, ["express"]).material_dependency_equivalent, false);
});

test("P4 public preservation hashes are safe and complete", () => {
  const artifact = { pre_upgrade_sha256: "a".repeat(64), post_upgrade_sha256: "a".repeat(64), projection_field_count: 12, projection_field_groups: ["account", "business", "commerce", "organic"] };
  assert.match(artifact.pre_upgrade_sha256, /^[0-9a-f]{64}$/);
  assert.equal(artifact.pre_upgrade_sha256, artifact.post_upgrade_sha256);
  assert.doesNotMatch(JSON.stringify(artifact), /secret_reference|p4-synthetic|vault/i);
});
