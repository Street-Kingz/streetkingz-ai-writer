import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createV103AcceptanceHarnessRouter } from "../routes/v1-03AcceptanceHarness.js";

test("harness is gated, local-host only, and fixed-purpose", () => {
  const source = fs.readFileSync(new URL("../routes/v1-03AcceptanceHarness.js", import.meta.url), "utf8");
  assert.match(source, /V1_03_ACCEPTANCE_HARNESS === "1"/); assert.match(source, /LOCAL_HOSTS/); assert.match(source, /localhost.*127\.0\.0\.1.*::1/s);
  const ui = fs.readFileSync(new URL("../internal/v1-03-harness/harness.js", import.meta.url), "utf8"); assert.match(ui, /\/api\/product\/account/); assert.match(ui, /\/api\/product\/business/); assert.match(ui, /\/api\/product\/connections/);
  assert.match(source, /readCurrentProductSnapshot/); assert.match(source, /collectReference/); assert.doesNotMatch(source, /secret_reference.*res|consumerSecret.*res|SERVICE_ROLE_KEY.*access_token/);
});

test("bootstrap is local-only and never returns password or service key", () => {
  const source = fs.readFileSync(new URL("../routes/v1-03AcceptanceHarness.js", import.meta.url), "utf8");
  assert.match(source, /LOCAL_SUPABASE_REQUIRED/); assert.match(source, /email_confirm: true/); assert.match(source, /signInWithPassword/); assert.match(source, /access_token/); const response = source.match(/res\.json\(\{[^}]+\}\)/s)?.[0] || ""; assert.doesNotMatch(response, /password|service|secret/i);
});

test("public Woo callback/return remain in normal router and harness does not write to Woo", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8"); const woo = fs.readFileSync(new URL("../routes/woocommerce.js", import.meta.url), "utf8");
  assert.match(woo, /\/api\/product\/woocommerce\/callback/); assert.match(woo, /\/api\/product\/woocommerce\/return/); assert.doesNotMatch(fs.readFileSync(new URL("../internal/v1-03-harness/referenceReconciliation.js", import.meta.url), "utf8"), /method\s*:\s*["'](POST|PATCH|PUT|DELETE)/i); assert.match(app, /if \(v103AcceptanceHarnessRoute\)/);
  assert.equal(typeof createV103AcceptanceHarnessRouter, "function");
});

test("launcher verifies intended Product readiness and has a safe tunnel fallback", () => {
  const source = fs.readFileSync(new URL("../scripts/runV103AcceptanceHarness.js", import.meta.url), "utf8");
  assert.match(source, /exitCode/); assert.match(source, /\/health/); assert.match(source, /\/internal\/v1-03/); assert.match(source, /cloudflared/); assert.match(source, /Manual fallback/); assert.doesNotMatch(source, /console\.log\([^)]*(KEY|SECRET|TOKEN)/i);
});
