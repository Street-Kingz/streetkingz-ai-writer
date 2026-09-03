import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

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
