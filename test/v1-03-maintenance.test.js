import test from "node:test";
import assert from "node:assert/strict";
import { startWooMaintenance } from "../product-kernel/woocommerceMaintenance.js";

test("V1-03 maintenance runs expiry cleanup immediately and on the unref timer", async () => {
  const calls = [];
  let tick;
  const timer = { unrefCalled: false, unref() { this.unrefCalled = true; } };
  const stop = startWooMaintenance({ makeAdmin: () => ({ rpc: async name => { calls.push(name); } }), setIntervalFn: fn => { tick = fn; return timer; }, clearIntervalFn: value => assert.equal(value, timer) });
  await new Promise(resolve => setImmediate(resolve));
  await tick();
  assert.deepEqual(calls, ["woo_cleanup_expired_attempts", "woo_cleanup_expired_attempts"]);
  assert.equal(timer.unrefCalled, true);
  stop();
});

test("V1-03 maintenance tolerates missing Product-kernel configuration", async () => {
  const timer = { unref() {} };
  const stop = startWooMaintenance({ makeAdmin: () => { throw new Error("configuration unavailable"); }, setIntervalFn: () => timer, clearIntervalFn: () => {} });
  await new Promise(resolve => setImmediate(resolve));
  stop();
  assert.ok(true);
});
