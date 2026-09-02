import express from "express";
import crypto from "node:crypto";
import { productKernelConfig } from "../config/productKernel.js";
import { createV104B1AcceptanceRouter } from "../routes/v1-04B1Acceptance.js";

const loopbackSupabase = value => { try { return ["localhost", "127.0.0.1", "::1"].includes(new URL(value).hostname); } catch { return false; } };
export function assertV104B1AcceptanceEnvironment(env = process.env) {
  if (env.V1_04_B1_ACCEPTANCE !== "1") throw new Error("V1_04_B1_ACCEPTANCE=1 is required.");
  if (env.NODE_ENV === "production") throw new Error("The V1-04 B1 acceptance harness cannot run in production.");
  const c = productKernelConfig(env, { privileged: true });
  if (!loopbackSupabase(c.url)) throw new Error("The V1-04 B1 acceptance harness requires a local Supabase URL.");
  return c;
}
export function createV104B1AcceptanceApp({ env = process.env, bootstrapToken = crypto.randomBytes(32).toString("base64url") } = {}) {
  const config = assertV104B1AcceptanceEnvironment(env); const app = express();
  app.disable("x-powered-by"); app.use((_req, res, next) => { res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "frame-ancestors 'none'" }); next(); }); app.use(express.json({ limit: "32kb" }));
  app.use(createV104B1AcceptanceRouter({ enabled: true, bootstrapToken, config: () => config }));
  return app;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  try { const app = createV104B1AcceptanceApp(); const port = Number(process.env.V1_04_B1_PORT || 3041); const server = app.listen(port, "127.0.0.1", () => console.log(`V1-04 B1 local acceptance harness listening on http://127.0.0.1:${port}/internal/v1-04`)); const stop = () => server.close(() => process.exit(0)); process.once("SIGINT", stop); process.once("SIGTERM", stop); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
