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
    throw new ProductError("INVALID_CONNECTION_TRANSITION", "Invalid connection status transition.", 409);
  }
  return true;
}
export function assertConsentState(value) {
  if (!CONSENT_STATE.includes(value)) {
    throw new ProductError("INVALID_CONNECTION_TRANSITION", "Invalid consent state.", 409);
  }
}
import { ProductError } from "./errors.js";
