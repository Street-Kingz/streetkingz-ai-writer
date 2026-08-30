import { privilegedClient } from "./privileged.js";

export function startWooMaintenance({ makeAdmin = privilegedClient, intervalMs = 5 * 60 * 1000, setIntervalFn = setInterval, clearIntervalFn = clearInterval } = {}) {
  const cleanup = async () => {
    try { await makeAdmin().rpc("woo_cleanup_expired_attempts"); } catch { /* Legacy/non-Product startup and transient maintenance errors are non-fatal. */ }
  };
  void cleanup();
  const timer = setIntervalFn(cleanup, intervalMs);
  timer?.unref?.();
  return () => clearIntervalFn(timer);
}
