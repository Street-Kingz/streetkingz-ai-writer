import express from "express";
import crypto from "node:crypto";
import net from "node:net";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productKernelConfig } from "../config/productKernel.js";
import googleSearchConsoleRoute from "./googleSearchConsole.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../internal/v1-04-b1");
const allowedHost = (host, port) => { if (typeof host !== "string") return false; try { const url = new URL(`http://${host}`); return ["127.0.0.1", "localhost"].includes(url.hostname.toLowerCase()) && String(url.port || 80) === String(port); } catch { return false; } };
const allowedOrigins = (origin, host, port) => { if (!origin) return true; try { const url = new URL(origin); return url.protocol === "http:" && url.hostname.toLowerCase() === new URL(`http://${host}`).hostname.toLowerCase() && String(url.port || 80) === String(port); } catch { return false; } };
export const isLoopbackPeer = value => value === "::1" || value === "127.0.0.1" || (net.isIP(value) === 6 && value.toLowerCase() === "::ffff:127.0.0.1");
let provisioningTestHook = null;
export function setV104B1AcceptanceProvisioningHookForTests(next) { provisioningTestHook = next || null; }
async function provisioningPause(point) { if (provisioningTestHook) await provisioningTestHook(point); }

export function createV104B1AcceptanceRouter({ enabled = false, bootstrapToken = crypto.randomBytes(32).toString("base64url"), config = () => productKernelConfig(process.env, { privileged: true }) } = {}) {
  if (!enabled) return express.Router();
  const router = express.Router();
  router.use((_req, res, next) => { res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "frame-ancestors 'none'" }); next(); });
  const peerGuard = (req, res, next) => isLoopbackPeer(req.socket?.remoteAddress) && allowedHost(req.get("host"), req.socket?.localPort) && allowedOrigins(req.get("origin"), req.get("host"), req.socket?.localPort) ? next() : res.status(404).end();
  const bootstrapGuard = (req, res, next) => req.get("x-v1-04-bootstrap") === bootstrapToken ? next() : res.status(403).json({ error: { code: "LOCAL_BOOTSTRAP_REQUIRED", message: "A local acceptance bootstrap is required." } });
  router.use(peerGuard);
  router.get("/internal/v1-04", (_req, res) => res.sendFile("index.html", { root }));
  router.get("/internal/v1-04/harness.js", (_req, res) => res.sendFile("harness.js", { root }));
  router.get("/internal/v1-04/styles.css", (_req, res) => res.sendFile("styles.css", { root }));
  router.get("/internal/v1-04/bootstrap", (_req, res) => res.json({ bootstrap: bootstrapToken }));
  router.use("/internal/v1-04", bootstrapGuard);
  const cleanupDisposableUser = async (admin, userId) => {
    const user = await admin.auth.admin.getUserById(userId);
    if (user.error || user.data?.user?.app_metadata?.v104_b1_acceptance !== true) throw new Error("ownership");
    const account = await admin.from("accounts").select("id").eq("auth_user_id", userId).maybeSingle();
    if (account.error) throw new Error("account");
    const businesses = account.data ? await admin.from("businesses").select("id").eq("account_id", account.data.id) : { data: [], error: null };
    if (businesses.error) throw new Error("businesses");
    const refs = new Set();
    for (const business of businesses.data || []) {
      const connections = await admin.from("connections").select("id,provider_type,secret_reference").eq("business_id", business.id);
      if (connections.error) throw new Error("connections");
      for (const connection of connections.data || []) {
        if (connection.secret_reference) refs.add(connection.secret_reference);
        if (connection.provider_type === "google_search_console") {
          const disconnected = await admin.rpc("gsc_disconnect", { p_business_id: business.id, p_connection_id: connection.id });
          if (disconnected.error) throw new Error("gsc_disconnect");
        }
        const table = connection.provider_type === "woocommerce" ? "woocommerce_auth_attempts" : "gsc_oauth_attempts";
        const column = connection.provider_type === "woocommerce" ? "credential_reference" : "staged_secret_reference";
        const attempts = await admin.from(table).select(column).eq("connection_id", connection.id);
        if (attempts.error) throw new Error("attempts");
        for (const attempt of attempts.data || []) if (attempt[column]) refs.add(attempt[column]);
      }
    }
    for (const reference of refs) { const removed = await admin.rpc("vault_delete_secret", { secret_id: reference }); if (removed.error) throw new Error("vault"); }
    const deleted = await admin.auth.admin.deleteUser(userId);
    if (deleted.error && deleted.error.status !== 404) throw new Error("auth_delete");
    return { account_was_present: Boolean(account.data), references_removed: refs.size };
  };
  const provisioningFailure = async (admin, userId, res) => { try { await cleanupDisposableUser(admin, userId); return res.status(503).json({ error: { code: "LOCAL_SESSION_FAILED", message: "Local acceptance session could not be prepared." } }); } catch { return res.status(503).json({ error: { code: "LOCAL_SESSION_CLEANUP_FAILED", message: "Local acceptance session could not be cleaned up." } }); } };
  router.post("/internal/v1-04/session", async (_req, res) => {
    const c = config(); const admin = createClient(c.url, c.privilegedKey, { auth: { persistSession: false } });
    const supplied = _req.body && typeof _req.body === "object" && !Array.isArray(_req.body) ? Object.keys(_req.body) : [];
    if (supplied.some(key => key !== "canonical_base_url")) return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Only canonical_base_url is accepted." } });
    const email = `v104-b1-session-${crypto.randomUUID()}@local.test`; const password = `${crypto.randomUUID()}!Aa9`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { v104_b1_acceptance: true } });
    if (created.error) return res.status(503).json({ error: { code: "LOCAL_SESSION_FAILED", message: "Local acceptance session could not be prepared." } });
    const fail = () => provisioningFailure(admin, created.data.user.id, res);
    try { await provisioningPause("after_user_created"); } catch { return fail(); }
    const login = createClient(c.url, c.publishableKey, { auth: { persistSession: false } }); const signed = await login.auth.signInWithPassword({ email, password });
    if (signed.error || !signed.data.session?.access_token) return fail();
    try { await provisioningPause("after_sign_in"); } catch { return fail(); }
    const caller = createClient(c.url, c.publishableKey, { global: { headers: { authorization: `Bearer ${signed.data.session.access_token}` } }, auth: { persistSession: false } });
    const account = await caller.rpc("product_create_account", { p_correlation_id: crypto.randomUUID() });
    try { await provisioningPause("after_account_created"); } catch { return fail(); }
    const business = account.error ? account : await caller.rpc("product_create_business", { p_name: "V1-04 B1 Local Acceptance", p_platform: "woocommerce", p_correlation_id: crypto.randomUUID() });
    try { await provisioningPause("after_business_created"); } catch { return fail(); }
    if (business.error) return fail();
    const connection = await caller.rpc("product_create_connection", { p_provider_type: "woocommerce", p_correlation_id: crypto.randomUUID() });
    try { await provisioningPause("after_woo_connection_created"); } catch { return fail(); }
    if (connection.error) return fail();
    const accountRow = await admin.from("accounts").select("id").eq("auth_user_id", created.data.user.id).single();
    const site = typeof _req.body?.canonical_base_url === "string" ? _req.body.canonical_base_url : "";
    let parsed; try { parsed = new URL(site); } catch { parsed = null; }
    if (!parsed || parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || !parsed.hostname.includes(".") || net.isIP(parsed.hostname) || parsed.hostname === "localhost" || parsed.hostname.endsWith(".local") || (parsed.port && parsed.port !== "443")) { try { await cleanupDisposableUser(admin, created.data.user.id); } catch { return res.status(503).json({ error: { code: "LOCAL_SESSION_CLEANUP_FAILED", message: "Local acceptance session could not be cleaned up." } }); } return res.status(400).json({ error: { code: "INVALID_SITE_URL", message: "A valid synthetic HTTPS site URL is required." } }); }
    const attempt = await admin.rpc("woo_create_auth_attempt", { p_user_id: `v104-b1-${created.data.user.id}`, p_account_id: accountRow.data.id, p_business_id: business.data.id, p_connection_id: connection.data.id, p_canonical_base_url: parsed.toString(), p_expires_at: new Date(Date.now() + 60000).toISOString() });
    try { await provisioningPause("after_woo_attempt_created"); } catch { return fail(); }
    if (attempt.error) return fail();
    const claimed = await admin.rpc("woo_claim_auth_attempt", { p_user_id: `v104-b1-${created.data.user.id}` });
    if (claimed.error) return fail();
    for (const [point, operation] of [["after_woo_credential_captured", () => admin.rpc("woo_capture_callback", { p_attempt_id: attempt.data, p_consumer_key: "synthetic-acceptance-key", p_consumer_secret: "synthetic-acceptance-secret", p_key_permissions: "read" })], ["after_woo_connection_completed", () => admin.rpc("woo_complete_connection", { p_attempt_id: attempt.data, p_home_url: parsed.toString(), p_site_url: parsed.toString(), p_version: "synthetic", p_timezone: "UTC", p_currency: "GBP", p_correlation_id: crypto.randomUUID() })]]) { const result = await operation(); if (result.error) return fail(); try { await provisioningPause(point); } catch { return fail(); } }
    try { await provisioningPause("before_session_response"); } catch { return fail(); }
    res.set("Cache-Control", "no-store").json({ access_token: signed.data.session.access_token, expires_at: signed.data.session.expires_at, account_ready: !account.error, business_ready: true, site_ready: true, canonical_base_url: parsed.toString() });
  });
  router.post("/internal/v1-04/session/cleanup", async (req, res) => {
    const supplied = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? Object.keys(req.body) : [];
    if (supplied.length) return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Cleanup does not accept target identifiers." } });
    const token = typeof req.get("authorization") === "string" ? req.get("authorization").replace(/^Bearer\s+/i, "") : "";
    if (!token) return res.status(401).json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required." } });
    const c = config(); const login = createClient(c.url, c.publishableKey, { auth: { persistSession: false } }); const identity = await login.auth.getUser(token);
    if (identity.error || !identity.data.user?.id) return res.status(401).json({ error: { code: "AUTH_INVALID", message: "Authentication is invalid." } });
    const admin = createClient(c.url, c.privilegedKey, { auth: { persistSession: false } });
    const user = await admin.auth.admin.getUserById(identity.data.user.id);
    if (user.error || user.data?.user?.app_metadata?.v104_b1_acceptance !== true) return res.status(403).json({ error: { code: "LOCAL_SESSION_OWNERSHIP_REQUIRED", message: "Only a disposable acceptance session can be cleaned up." } });
    try { const result = await cleanupDisposableUser(admin, identity.data.user.id); res.json({ cleaned: true, account_was_present: result.account_was_present }); } catch { res.status(503).json({ error: { code: "LOCAL_SESSION_CLEANUP_FAILED", message: "Local acceptance session could not be cleaned up." } }); }
  });
  router.use(googleSearchConsoleRoute);
  return router;
}

export default null;
