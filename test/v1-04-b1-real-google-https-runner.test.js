import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { assertRealGoogleHttpsEnvironment, isFixedLoopbackHttpsAddress, safeRealGoogleHttpsConfiguration } from "../scripts/runV104B1RealGoogleAcceptanceHttps.js";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v104-https-test-"));
const cert = path.join(temp, "cert.pem");
const key = path.join(temp, "key.pem");
fs.writeFileSync(cert, "synthetic certificate");
fs.writeFileSync(key, "synthetic private key", { mode: 0o600 });

const base = () => ({ V1_04_B1_REAL_GOOGLE_ACCEPTANCE: "1", NODE_ENV: "test", SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable", SUPABASE_SERVICE_ROLE_KEY: "synthetic-service", GOOGLE_SEARCH_CONSOLE_CLIENT_ID: "123456789012-synthetic.apps.googleusercontent.com", GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET: "synthetic-secret", GOOGLE_SEARCH_CONSOLE_CALLBACK_URL: "https://127.0.0.1:3443/api/product/organic-evidence/search-console/callback", V1_04_REAL_GOOGLE_HTTPS_PORT: "3443", V1_04_REAL_GOOGLE_TLS_CERT: cert, V1_04_REAL_GOOGLE_TLS_KEY: key });

test("real Google HTTPS runner accepts the fixed loopback configuration", () => {
  const value = assertRealGoogleHttpsEnvironment(base());
  assert.equal(value.port, 3443);
  assert.equal(safeRealGoogleHttpsConfiguration(value).bind, "127.0.0.1");
  assert.equal(isFixedLoopbackHttpsAddress({ address: "127.0.0.1", family: "IPv4", port: 3443 }, 3443), true);
});

for (const [name, change, expected] of [
  ["requires enable flag", env => delete env.V1_04_B1_REAL_GOOGLE_ACCEPTANCE, /required/],
  ["rejects production", env => { env.NODE_ENV = "production"; }, /production/],
  ["rejects hosted Supabase", env => { env.SUPABASE_URL = "https://project.supabase.co"; }, /loopback/],
  ["rejects HTTP callback", env => { env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL = env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL.replace("https:", "http:"); }, /exactly match/],
  ["rejects non-loopback callback", env => { env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL = env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL.replace("127.0.0.1", "localhost"); }, /exactly match/],
  ["rejects wrong callback path", env => { env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL = env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL.replace(/callback$/, "wrong"); }, /exactly match/],
  ["rejects callback/listener port mismatch", env => { env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL = env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL.replace(":3443/", ":3444/"); }, /exactly match/],
  ["rejects missing certificate", env => { env.V1_04_REAL_GOOGLE_TLS_CERT = path.join(temp, "missing-cert"); }, /certificate/],
  ["rejects missing key", env => { env.V1_04_REAL_GOOGLE_TLS_KEY = path.join(temp, "missing-key"); }, /private key/],
  ["rejects unsafe key permissions", env => { fs.chmodSync(key, 0o644); }, /permissions/]
]) test(name, () => { const env = base(); change(env); assert.throws(() => assertRealGoogleHttpsEnvironment(env), expected); fs.chmodSync(key, 0o600); });

test("safe configuration output excludes secrets", () => {
  const value = assertRealGoogleHttpsEnvironment(base());
  const output = JSON.stringify(safeRealGoogleHttpsConfiguration(value));
  assert.doesNotMatch(output, /synthetic-secret|synthetic-service|publishable/);
});
