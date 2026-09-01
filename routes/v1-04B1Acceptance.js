import express from "express";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productKernelConfig } from "../config/productKernel.js";

const router = express.Router();
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../internal/v1-04-b1");
const localHost = value => ["localhost", "127.0.0.1", "::1"].includes(value || "");
const enabled = process.env.V1_04_B1_ACCEPTANCE === "1";
if (enabled) {
  router.use((req, res, next) => localHost(req.hostname) ? next() : res.status(404).end());
  router.post("/internal/v1-04/session", async (_req, res) => {
    const config = productKernelConfig(process.env, { privileged: true });
    const admin = createClient(config.url, config.privilegedKey, { auth: { persistSession: false } });
    const email = `v104-b1-session-${crypto.randomUUID()}@local.test`;
    const password = `${crypto.randomUUID()}!Aa9`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) return res.status(503).json({ error: { code: "LOCAL_SESSION_FAILED", message: "Local acceptance session could not be prepared." } });
    const login = createClient(config.url, config.publishableKey, { auth: { persistSession: false } });
    const signed = await login.auth.signInWithPassword({ email, password });
    if (signed.error || !signed.data.session?.access_token) { await admin.auth.admin.deleteUser(created.data.user.id); return res.status(503).json({ error: { code: "LOCAL_SESSION_FAILED", message: "Local acceptance session could not be prepared." } }); }
    const caller = createClient(config.url, config.publishableKey, { global: { headers: { authorization: `Bearer ${signed.data.session.access_token}` } }, auth: { persistSession: false } });
    const account = await caller.rpc("product_create_account", { p_correlation_id: crypto.randomUUID() });
    const business = account.error ? account : await caller.rpc("product_create_business", { p_name: "V1-04 B1 Local Acceptance", p_platform: "woocommerce", p_correlation_id: crypto.randomUUID() });
    if (business.error) { await admin.auth.admin.deleteUser(created.data.user.id); return res.status(503).json({ error: { code: "LOCAL_SESSION_FAILED", message: "Local acceptance session could not be prepared." } }); }
    res.json({ access_token: signed.data.session.access_token, expires_at: signed.data.session.expires_at, account_ready: !account.error, business_ready: true });
  });
  router.get("/internal/v1-04", (_req, res) => res.sendFile("index.html", { root }));
  router.get("/internal/v1-04/harness.js", (_req, res) => res.sendFile("harness.js", { root }));
  router.get("/internal/v1-04/styles.css", (_req, res) => res.sendFile("styles.css", { root }));
}
export default enabled ? router : null;
