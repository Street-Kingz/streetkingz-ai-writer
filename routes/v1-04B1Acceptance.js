import express from "express";
import crypto from "node:crypto";
import net from "node:net";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productKernelConfig } from "../config/productKernel.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../internal/v1-04-b1");
const allowedOrigins = origin => !origin || /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(origin);
const allowedHost = host => typeof host === "string" && /^(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(host.toLowerCase());
export const isLoopbackPeer = value => value === "::1" || value === "127.0.0.1" || (net.isIP(value) === 6 && value.toLowerCase() === "::ffff:127.0.0.1");

export function createV104B1AcceptanceRouter({ enabled = false, bootstrapToken = crypto.randomBytes(32).toString("base64url"), config = () => productKernelConfig(process.env, { privileged: true }) } = {}) {
  if (!enabled) return express.Router();
  const router = express.Router();
  const peerGuard = (req, res, next) => isLoopbackPeer(req.socket?.remoteAddress) && allowedHost(req.get("host")) && allowedOrigins(req.get("origin")) ? next() : res.status(404).end();
  const bootstrapGuard = (req, res, next) => req.get("x-v1-04-bootstrap") === bootstrapToken ? next() : res.status(403).json({ error: { code: "LOCAL_BOOTSTRAP_REQUIRED", message: "A local acceptance bootstrap is required." } });
  router.use(peerGuard);
  router.get("/internal/v1-04", (_req, res) => res.sendFile("index.html", { root }));
  router.get("/internal/v1-04/harness.js", (_req, res) => res.sendFile("harness.js", { root }));
  router.get("/internal/v1-04/styles.css", (_req, res) => res.sendFile("styles.css", { root }));
  router.get("/internal/v1-04/bootstrap", (_req, res) => res.json({ bootstrap: bootstrapToken }));
  router.use("/internal/v1-04", bootstrapGuard);
  router.post("/internal/v1-04/session", async (_req, res) => {
    const c = config(); const admin = createClient(c.url, c.privilegedKey, { auth: { persistSession: false } });
    const email = `v104-b1-session-${crypto.randomUUID()}@local.test`; const password = `${crypto.randomUUID()}!Aa9`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { v104_b1_acceptance: true } });
    if (created.error) return res.status(503).json({ error: { code: "LOCAL_SESSION_FAILED", message: "Local acceptance session could not be prepared." } });
    const login = createClient(c.url, c.publishableKey, { auth: { persistSession: false } }); const signed = await login.auth.signInWithPassword({ email, password });
    if (signed.error || !signed.data.session?.access_token) { await admin.auth.admin.deleteUser(created.data.user.id); return res.status(503).json({ error: { code: "LOCAL_SESSION_FAILED", message: "Local acceptance session could not be prepared." } }); }
    const caller = createClient(c.url, c.publishableKey, { global: { headers: { authorization: `Bearer ${signed.data.session.access_token}` } }, auth: { persistSession: false } });
    const account = await caller.rpc("product_create_account", { p_correlation_id: crypto.randomUUID() });
    const business = account.error ? account : await caller.rpc("product_create_business", { p_name: "V1-04 B1 Local Acceptance", p_platform: "woocommerce", p_correlation_id: crypto.randomUUID() });
    if (business.error) { await admin.auth.admin.deleteUser(created.data.user.id); return res.status(503).json({ error: { code: "LOCAL_SESSION_FAILED", message: "Local acceptance session could not be prepared." } }); }
    const connection = await caller.rpc("product_create_connection", { p_provider_type: "woocommerce", p_correlation_id: crypto.randomUUID() });
    if (connection.error) { await admin.auth.admin.deleteUser(created.data.user.id); return res.status(503).json({ error: { code: "LOCAL_SESSION_FAILED", message: "Local acceptance session could not be prepared." } }); }
    const accountRow = await admin.from("accounts").select("id").eq("auth_user_id", created.data.user.id).single();
    const site = typeof _req.body?.canonical_base_url === "string" ? _req.body.canonical_base_url : "";
    let parsed; try { parsed = new URL(site); } catch { parsed = null; }
    if (!parsed || parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || !parsed.hostname.includes(".")) { await admin.auth.admin.deleteUser(created.data.user.id); return res.status(400).json({ error: { code: "INVALID_SITE_URL", message: "A valid synthetic HTTPS site URL is required." } }); }
    const attempt = await admin.rpc("woo_create_auth_attempt", { p_user_id: `v104-b1-${created.data.user.id}`, p_account_id: accountRow.data.id, p_business_id: business.data.id, p_connection_id: connection.data, p_canonical_base_url: parsed.toString(), p_expires_at: new Date(Date.now() + 60000).toISOString() });
    if (attempt.error) { await admin.auth.admin.deleteUser(created.data.user.id); return res.status(503).json({ error: { code: "LOCAL_SESSION_FAILED", message: "Local acceptance session could not be prepared." } }); }
    for (const operation of [() => admin.rpc("woo_claim_auth_attempt", { p_user_id: `v104-b1-${created.data.user.id}` }), () => admin.rpc("woo_capture_callback", { p_attempt_id: attempt.data, p_consumer_key: "synthetic-acceptance-key", p_consumer_secret: "synthetic-acceptance-secret", p_key_permissions: "read" }), () => admin.rpc("woo_complete_connection", { p_attempt_id: attempt.data, p_home_url: parsed.toString(), p_site_url: parsed.toString(), p_version: "synthetic", p_timezone: "UTC", p_currency: "GBP", p_correlation_id: crypto.randomUUID() })]) { const result = await operation(); if (result.error) { await admin.auth.admin.deleteUser(created.data.user.id); return res.status(503).json({ error: { code: "LOCAL_SESSION_FAILED", message: "Local acceptance session could not be prepared." } }); } }
    res.set("Cache-Control", "no-store").json({ access_token: signed.data.session.access_token, expires_at: signed.data.session.expires_at, account_ready: !account.error, business_ready: true, site_ready: true, canonical_base_url: parsed.toString() });
  });
  router.post("/internal/v1-04/session/cleanup", async (req, res) => {
    const token = typeof req.get("authorization") === "string" ? req.get("authorization").replace(/^Bearer\s+/i, "") : "";
    if (!token) return res.status(401).json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required." } });
    const c = config(); const login = createClient(c.url, c.publishableKey, { global: { headers: { authorization: `Bearer ${token}` } }, auth: { persistSession: false } }); const identity = await login.auth.getUser();
    if (identity.error || !identity.data.user?.id) return res.status(401).json({ error: { code: "AUTH_INVALID", message: "Authentication is invalid." } });
    const admin = createClient(c.url, c.privilegedKey, { auth: { persistSession: false } }); const user = await admin.auth.admin.getUserById(identity.data.user.id); if (user.error || user.data?.user?.app_metadata?.v104_b1_acceptance !== true) return res.status(403).json({ error: { code: "LOCAL_SESSION_OWNERSHIP_REQUIRED", message: "Only a disposable acceptance session can be cleaned up." } }); const account = await admin.from("accounts").select("id").eq("auth_user_id", identity.data.user.id).maybeSingle();
    if (account.error) return res.status(503).json({ error: { code: "LOCAL_SESSION_CLEANUP_FAILED", message: "Local acceptance session could not be cleaned up." } });
    const deleted = await admin.auth.admin.deleteUser(identity.data.user.id); if (deleted.error && deleted.error.status !== 404) return res.status(503).json({ error: { code: "LOCAL_SESSION_CLEANUP_FAILED", message: "Local acceptance session could not be cleaned up." } });
    res.json({ cleaned: true, account_was_present: Boolean(account.data) });
  });
  return router;
}

export default null;
