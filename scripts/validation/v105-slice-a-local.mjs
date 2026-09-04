import { execFileSync } from "node:child_process";
import express from "express";
import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import { privilegedClient } from "../../product-kernel/privileged.js";
import route from "../../routes/decisionRuns.js";

const envLines = execFileSync("npx", ["supabase", "status", "-o", "env"], { encoding: "utf8" }).split("\n");
for (const line of envLines) { const m = /^(API_URL|PUBLISHABLE_KEY|SERVICE_ROLE_KEY)="?([^"\r]+)"?$/.exec(line); if (m) process.env[{ API_URL: "SUPABASE_URL", PUBLISHABLE_KEY: "SUPABASE_PUBLISHABLE_KEY", SERVICE_ROLE_KEY: "SUPABASE_SERVICE_ROLE_KEY" }[m[1]]] = m[2]; }
const businessId = "5a23564d-45ed-4409-bd67-20c83c7d6d9b";
const admin = privilegedClient();
const b = await admin.from("businesses").select("account_id").eq("id", businessId).single();
const ar = await admin.from("accounts").select("auth_user_id").eq("id", b.data.account_id).single();
const u = await admin.auth.admin.getUserById(ar.data.auth_user_id);
const magic = await admin.auth.admin.generateLink({ type: "magiclink", email: u.data.user.email });
const caller = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const otp = await caller.auth.verifyOtp({ email: u.data.user.email, token: magic.data.properties.email_otp, type: "email" });
const app = express(); app.use(express.json({ limit: "64kb" })); app.use(route);
const server = await new Promise((resolve, reject) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); s.on("error", reject); });
const request = (path, method = "POST", body = "{}") => new Promise((resolve, reject) => { const headers = { authorization: `Bearer ${otp.data.session.access_token}`, "content-type": "application/json", "content-length": Buffer.byteLength(body) }; const req = http.request({ hostname: "127.0.0.1", port: server.address().port, path, method, headers }, res => { let value = ""; res.on("data", chunk => { value += chunk; }); res.on("end", () => resolve({ status: res.statusCode, body: value ? JSON.parse(value) : null })); }); req.on("error", reject); req.end(body); });
const first = await request("/api/product/decision-runs/discover");
const again = await request("/api/product/decision-runs/discover");
const candidates = first.body?.id ? await request(`/api/product/decision-runs/${first.body.id}/candidates`, "GET", "") : null;
console.log(JSON.stringify({ first_status: first.status, first_state: first.body?.state, first_candidates: first.body?.candidate_count, reused_again: again.body?.reused, read_status: candidates?.status, read_candidates: candidates?.body?.candidates?.length || 0 }));
await new Promise(resolve => server.close(resolve));
