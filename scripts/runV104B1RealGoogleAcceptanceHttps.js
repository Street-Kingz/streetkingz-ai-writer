import fs from "node:fs";
import https from "node:https";
import net from "node:net";
import process from "node:process";
import { productKernelConfig } from "../config/productKernel.js";

const CALLBACK_PATH = "/api/product/organic-evidence/search-console/callback";
const LOOPBACK = "127.0.0.1";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const GOOGLE_TOKEN_HOST = "oauth2.googleapis.com";
const GOOGLE_API_HOST = "www.googleapis.com";

function loopbackSupabase(value) {
  try { return ["localhost", LOOPBACK, "::1"].includes(new URL(value).hostname); } catch { return false; }
}

function clientFingerprint(value) {
  return typeof value === "string" && value.length >= 12 ? `${value.slice(0, 6)}…${value.slice(-6)}` : "<masked>";
}

function callbackConfig(env) {
  if (!env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL) throw new Error("GOOGLE_SEARCH_CONSOLE_CALLBACK_URL is required.");
  let callback;
  try { callback = new URL(env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL); } catch { throw new Error("GOOGLE_SEARCH_CONSOLE_CALLBACK_URL must be a valid URL."); }
  const port = Number(env.V1_04_REAL_GOOGLE_HTTPS_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("V1_04_REAL_GOOGLE_HTTPS_PORT must be a valid fixed port.");
  if (callback.protocol !== "https:" || callback.hostname !== LOOPBACK || callback.port !== String(port) || callback.pathname !== CALLBACK_PATH || callback.search || callback.hash || callback.username || callback.password) throw new Error(`GOOGLE_SEARCH_CONSOLE_CALLBACK_URL must exactly match https://${LOOPBACK}:${port}${CALLBACK_PATH}.`);
  return { callback, port };
}

export function assertRealGoogleHttpsEnvironment(env = process.env, fsImpl = fs) {
  if (env.V1_04_B1_REAL_GOOGLE_ACCEPTANCE !== "1") throw new Error("V1_04_B1_REAL_GOOGLE_ACCEPTANCE=1 is required.");
  if (env.NODE_ENV === "production") throw new Error("Real Google acceptance runner cannot run in production.");
  const config = productKernelConfig(env, { privileged: true });
  if (!loopbackSupabase(config.url)) throw new Error("Real Google acceptance runner requires a loopback Supabase URL.");
  if (!env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID) throw new Error("GOOGLE_SEARCH_CONSOLE_CLIENT_ID is required.");
  if (!env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET) throw new Error("GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET is required.");
  const { callback, port } = callbackConfig(env);
  if (!env.V1_04_REAL_GOOGLE_TLS_CERT) throw new Error("V1_04_REAL_GOOGLE_TLS_CERT is required.");
  if (!env.V1_04_REAL_GOOGLE_TLS_KEY) throw new Error("V1_04_REAL_GOOGLE_TLS_KEY is required.");
  for (const [label, path] of [["certificate", env.V1_04_REAL_GOOGLE_TLS_CERT], ["private key", env.V1_04_REAL_GOOGLE_TLS_KEY]]) {
    let stat;
    try { stat = fsImpl.statSync(path); } catch { throw new Error(`${label} file is not readable.`); }
    if (!stat.isFile()) throw new Error(`${label} path must be a file.`);
  }
  const keyMode = fsImpl.statSync(env.V1_04_REAL_GOOGLE_TLS_KEY).mode & 0o777;
  if ((keyMode & 0o077) !== 0) throw new Error("private key permissions must not be accessible by group or other users.");
  return { config, callback, port, client_id_fingerprint: clientFingerprint(env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID), tls: { certificate: env.V1_04_REAL_GOOGLE_TLS_CERT, private_key: env.V1_04_REAL_GOOGLE_TLS_KEY, private_key_mode: keyMode } };
}

export function safeRealGoogleHttpsConfiguration(value) {
  return { callback: value.callback.toString(), port: value.port, bind: LOOPBACK, supabase: "loopback", client_id_fingerprint: value.client_id_fingerprint, private_key_mode: value.tls.private_key_mode };
}

export function isFixedLoopbackHttpsAddress(address, expectedPort) {
  return address?.address === LOOPBACK && address?.family === "IPv4" && address?.port === expectedPort;
}

function pathClass(url) {
  if (url.pathname.includes("searchAnalytics")) return "google-search-analytics-blocked";
  if (url.pathname.includes("urlInspection") || url.pathname.includes("sitemaps")) return "google-write-or-inspection-blocked";
  if (url.hostname === GOOGLE_TOKEN_HOST && url.pathname === "/token") return "google-token";
  if (url.hostname === GOOGLE_API_HOST && url.pathname === "/webmasters/v3/sites") return "google-sites-list";
  if (url.hostname === GOOGLE_API_HOST && url.pathname.startsWith("/webmasters/v3/sites/")) return "google-sites-probe";
  if (url.hostname === "streetkingz.co.uk") return "streetkingz-blocked";
  if (url.hostname.includes("dataforseo")) return "dataforseo-blocked";
  return "external-blocked";
}

function requestUrl(input) {
  try { return new URL(typeof input === "string" ? input : input?.url); } catch { return null; }
}

export function installRealGoogleNetworkGuard({ fetchImpl = globalThis.fetch, loopbackHosts = LOOPBACK_HOSTS } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required for the network guard.");
  const counters = { allowed: {}, blocked: {} };
  const bump = (bucket, key) => { bucket[key] = (bucket[key] || 0) + 1; };
  const guardedFetch = async (input, init = {}) => {
    const url = requestUrl(input);
    const method = String(init.method || input?.method || "GET").toUpperCase();
    const key = `${method} ${url ? url.hostname : "invalid"} ${url ? pathClass(url) : "invalid-url"}`;
    const loopback = url && loopbackHosts.has(url.hostname);
    const googleToken = url?.hostname === GOOGLE_TOKEN_HOST && url.pathname === "/token" && method === "POST";
    const googleSitesList = url?.hostname === GOOGLE_API_HOST && url.pathname === "/webmasters/v3/sites" && method === "GET";
    const googleSitesProbe = url?.hostname === GOOGLE_API_HOST && url.pathname.startsWith("/webmasters/v3/sites/") && !url.pathname.includes("searchAnalytics") && !url.pathname.includes("urlInspection") && !url.pathname.includes("sitemaps") && method === "GET";
    if (!url || (!loopback && !googleToken && !googleSitesList && !googleSitesProbe)) {
      bump(counters.blocked, key);
      throw new Error("LIVE_NETWORK_GUARD_BLOCKED");
    }
    bump(counters.allowed, key);
    return fetchImpl(input, init);
  };
  globalThis.fetch = guardedFetch;
  return { counters, restore() { globalThis.fetch = fetchImpl; } };
}

export async function assertPortFree(port, host = LOOPBACK) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", error => { server.close(); reject(error); });
    server.listen(port, host, () => server.close(resolve));
  });
}

export async function startRealGoogleHttpsRunner({ env = process.env, fsImpl = fs, appFactory } = {}) {
  const value = assertRealGoogleHttpsEnvironment(env, fsImpl);
  await assertPortFree(value.port);
  process.env.V1_03_ACCEPTANCE_HARNESS = "1";
  const networkGuard = installRealGoogleNetworkGuard();
  const app = appFactory ? await appFactory() : (await import("../app.js")).default;
  const server = https.createServer({ cert: fsImpl.readFileSync(value.tls.certificate), key: fsImpl.readFileSync(value.tls.private_key) }, app);
  try { await new Promise((resolve, reject) => { server.once("error", reject); server.listen(value.port, LOOPBACK, resolve); }); } catch (error) { networkGuard.restore(); throw error; }
  const address = server.address();
  if (!isFixedLoopbackHttpsAddress(address, value.port)) { server.close(); networkGuard.restore(); throw new Error("HTTPS listener did not bind to the fixed loopback address."); }
  const close = server.close.bind(server);
  server.close = callback => close(() => { networkGuard.restore(); callback?.(); });
  return { server, value, safe: safeRealGoogleHttpsConfiguration(value), networkGuard };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const { server, safe } = await startRealGoogleHttpsRunner();
    console.log(`V1-04 B1 local HTTPS acceptance runner listening on https://${LOOPBACK}:${safe.port}${CALLBACK_PATH}`);
    console.log(`Supabase: ${safe.supabase}; client ID: ${safe.client_id_fingerprint}`);
    const stop = () => server.close(() => process.exit(0));
    process.once("SIGINT", stop); process.once("SIGTERM", stop);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
