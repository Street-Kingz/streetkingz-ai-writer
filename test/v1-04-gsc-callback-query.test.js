import assert from "node:assert/strict";
import test from "node:test";
import { ProductError } from "../product-kernel/errors.js";
import { validateGoogleCallbackQuery } from "../routes/googleSearchConsole.js";

const valid = { state: "synthetic-state", code: "synthetic-code", scope: "synthetic-read-only-scope", authuser: "0", prompt: "consent", hd: "synthetic.example" };

test("Google-shaped callback metadata is informational and accepted", () => {
  assert.deepEqual(validateGoogleCallbackQuery(valid), { state: "synthetic-state", code: "synthetic-code", error: null });
});

for (const key of ["account_id", "business_id", "connection_id", "provider_id", "user_id", "auth_user_id", "site_url", "selected_property", "target"]) {
  test(`callback rejects ownership rebinding key ${key}`, () => assert.throws(() => validateGoogleCallbackQuery({ ...valid, [key]: "injected" }), ProductError));
}

test("callback rejects duplicate critical parameters and simultaneous code/error", () => {
  assert.throws(() => validateGoogleCallbackQuery({ ...valid, state: ["a", "b"] }), ProductError);
  assert.throws(() => validateGoogleCallbackQuery({ ...valid, code: ["a", "b"] }), ProductError);
  assert.throws(() => validateGoogleCallbackQuery({ ...valid, error: "access_denied" }), ProductError);
});

test("callback rejects missing state and malformed values", () => {
  assert.throws(() => validateGoogleCallbackQuery({ code: "synthetic-code" }), ProductError);
  assert.throws(() => validateGoogleCallbackQuery({ state: "synthetic-state", code: {} }), ProductError);
  assert.throws(() => validateGoogleCallbackQuery({ state: "synthetic-state", code: "" }), ProductError);
});
