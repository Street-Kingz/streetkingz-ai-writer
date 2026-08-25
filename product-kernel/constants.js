export const CONNECTION_STATUS = Object.freeze(["pending", "connected", "error", "disconnected"]);
export const CONSENT_STATE = Object.freeze(["pending", "granted", "revoked"]);
const transitions = {
  pending: ["connected", "error", "disconnected"],
  connected: ["error", "disconnected"],
  error: ["pending", "connected", "disconnected"],
  disconnected: ["pending"]
};
export function assertConnectionTransition(from, to) {
  if (!CONNECTION_STATUS.includes(from) || !CONNECTION_STATUS.includes(to) || !transitions[from].includes(to)) {
    const error = new Error("Invalid connection status transition.");
    error.code = "INVALID_CONNECTION_TRANSITION";
    throw error;
  }
  return true;
}
export function assertConsentState(value) {
  if (!CONSENT_STATE.includes(value)) {
    const error = new Error("Invalid consent state.");
    error.code = "INVALID_CONNECTION_TRANSITION";
    throw error;
  }
}
