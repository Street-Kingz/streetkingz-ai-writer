import test from "node:test";
import assert from "node:assert/strict";

function saveDecision({ apiResult, persistedHash, expectedHash }) {
  return { proceed: persistedHash === expectedHash, apiResult };
}

function rollbackDecision({ persistedBeforeHash, rollbackHash, restoreApiResult, persistedAfterHash }) {
  const restoreCalled = persistedBeforeHash !== rollbackHash;
  return {
    restoreCalled,
    restoreApiResult: restoreCalled ? restoreApiResult : null,
    verified: (restoreCalled ? persistedAfterHash : persistedBeforeHash) === rollbackHash,
  };
}

test("false Elementor save with unchanged persisted state fails forward execution", () => {
  assert.deepEqual(saveDecision({ apiResult: false, persistedHash: "original", expectedHash: "target" }), { proceed: false, apiResult: false });
});

test("false Elementor save with exact target persistence proceeds by database truth", () => {
  assert.deepEqual(saveDecision({ apiResult: false, persistedHash: "target", expectedHash: "target" }), { proceed: true, apiResult: false });
});

test("truthy Elementor save with wrong persisted state fails closed", () => {
  assert.deepEqual(saveDecision({ apiResult: true, persistedHash: "wrong", expectedHash: "target" }), { proceed: false, apiResult: true });
});

test("product partial write plus unchanged template skips redundant template restore", () => {
  assert.deepEqual(rollbackDecision({ persistedBeforeHash: "original", rollbackHash: "original", restoreApiResult: false, persistedAfterHash: "original" }), { restoreCalled: false, restoreApiResult: null, verified: true });
});

test("false restore return still passes when freshly persisted rollback state is exact", () => {
  assert.deepEqual(rollbackDecision({ persistedBeforeHash: "target", rollbackHash: "original", restoreApiResult: false, persistedAfterHash: "original" }), { restoreCalled: true, restoreApiResult: false, verified: true });
});

test("truthy restore return fails when freshly persisted rollback state is wrong", () => {
  assert.deepEqual(rollbackDecision({ persistedBeforeHash: "target", rollbackHash: "original", restoreApiResult: true, persistedAfterHash: "wrong" }), { restoreCalled: true, restoreApiResult: true, verified: false });
});
