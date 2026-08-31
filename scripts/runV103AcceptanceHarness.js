import { spawn, spawnSync } from "node:child_process";
import http from "node:http";

const port = process.env.PORT || "3000";
const loopback = value => { try { return ["localhost", "127.0.0.1", "::1"].includes(new URL(value).hostname); } catch { return false; } };
const status = spawnSync("npx", ["--no-install", "supabase", "status", "-o", "env"], { encoding: "utf8" });
if (status.error || status.status !== 0) { console.error("Local Supabase is not running. Start it with: npx supabase start"); process.exit(1); }
const envLines = Object.fromEntries(status.stdout.split(/\r?\n/).map(line => line.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map(([, key, value]) => [key, value.replace(/^['\"]|['\"]$/g, "")]));
const supabaseUrl = envLines.API_URL || envLines.SUPABASE_URL;
const publishable = envLines.PUBLISHABLE_KEY || envLines.ANON_KEY || envLines.SUPABASE_PUBLISHABLE_KEY;
const service = envLines.SERVICE_ROLE_KEY || envLines.SUPABASE_SERVICE_ROLE_KEY;
if (!loopback(supabaseUrl) || !publishable || !service) { console.error("Local Supabase status did not provide safe local API credentials."); process.exit(1); }
const baseEnv = { ...process.env, SUPABASE_URL: supabaseUrl, SUPABASE_PUBLISHABLE_KEY: publishable, SUPABASE_SERVICE_ROLE_KEY: service, V1_03_ACCEPTANCE_HARNESS: "1", WOOCOMMERCE_APP_NAME: "V1-03 Street Kingz Acceptance", PORT: port };
const tunnel = spawn("cloudflared", ["tunnel", "--url", `http://127.0.0.1:${port}`], { stdio: ["ignore", "pipe", "pipe"] });
let buffer = "", origin;
const originPromise = new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error("Timed out waiting for cloudflared Quick Tunnel.")), 30000); const onData = chunk => { buffer += chunk.toString(); const match = buffer.match(/https:\/\/[-a-z0-9]+\.trycloudflare\.com/); if (match) { clearTimeout(timer); origin = match[0]; resolve(origin); } }; tunnel.stdout.on("data", onData); tunnel.stderr.on("data", onData); tunnel.once("error", reject); tunnel.once("exit", code => { if (!origin) reject(new Error(`cloudflared exited before creating a tunnel (${code}).`)); }); });
let product;
try { await originPromise; product = spawn(process.execPath, ["index.js"], { env: { ...baseEnv, PRODUCT_PUBLIC_ORIGIN: origin }, stdio: "ignore" }); await new Promise((resolve, reject) => { const req = () => { const r = http.get(`http://127.0.0.1:${port}/health`, response => { response.resume(); response.statusCode && resolve(); }); r.on("error", () => setTimeout(req, 100)); }; req(); setTimeout(() => reject(new Error("Product did not start.")), 15000); }); console.log("V1-03 Acceptance Harness ready"); console.log(`Local UI: http://127.0.0.1:${port}/internal/v1-03`); console.log(`Public Product callback origin: ${origin}`); console.log("Woo app name: V1-03 Street Kingz Acceptance"); console.log("Supabase: local"); } catch (error) { console.error(error.message); tunnel.kill("SIGTERM"); if (product) product.kill("SIGTERM"); console.error("Manual fallback: start a HTTPS tunnel to the local Product port, set PRODUCT_PUBLIC_ORIGIN=https://<origin>, then run V1_03_ACCEPTANCE_HARNESS=1 npm start."); process.exit(1); }
const shutdown = () => { if (product) product.kill("SIGTERM"); tunnel.kill("SIGTERM"); process.exit(0); }; process.once("SIGINT", shutdown); process.once("SIGTERM", shutdown);
