import { randomUUID } from "node:crypto";
import rateLimit from "express-rate-limit";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const parseOrigins = value => String(value || "").split(",").map(item => item.trim()).filter(Boolean).filter(item => {
  try { const url = new URL(item); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.pathname.replace(/\/$/, "") && !url.search && !url.hash;
  } catch { return false; }
});

export function productCorsOptions(env = process.env) {
  const origins = new Set(parseOrigins(env.PRODUCT_ALLOWED_ORIGINS));
  return { origin(origin, callback) { if (!origin) return callback(null, true); callback(null, origins.has(origin) ? origin : false); }, credentials: true, optionsSuccessStatus: 204 };
}

export function loopbackOnly(req, res, next) {
  if (LOCAL_HOSTS.has(req.hostname) && LOCAL_HOSTS.has(req.socket?.remoteAddress?.replace(/^::ffff:/, ""))) return next();
  return res.status(404).end();
}

const safeLimit = (windowMs, limit) => rateLimit({ windowMs, limit, standardHeaders: "draft-7", legacyHeaders: false, handler: (req, res) => res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later.", correlation_id: req.correlationId } }) });
export const generalProductRateLimit = safeLimit(60_000, 120);
export const sensitiveProductRateLimit = safeLimit(15 * 60_000, 30);
export const expensiveProductRateLimit = safeLimit(60 * 60_000, 10);

export function correlationMiddleware(req, res, next) {
  const id = req.correlationId || randomUUID();
  req.correlationId = id;
  res.set("x-correlation-id", id);
  next();
}

export function requestLogger(req, res, next) {
  const started = Date.now();
  res.on("finish", () => console.info(JSON.stringify({ event: "product_request", correlation_id: req.correlationId, method: req.method, path: req.route?.path || req.path.split("?")[0], status: res.statusCode, duration_ms: Date.now() - started })));
  next();
}

export function protectedProductPath(req) { return req.path.startsWith("/api/product/"); }
export function sensitiveProductPath(req) { return /^\/api\/product\/(account|business|connections|decision-runs\/discover|woocommerce\/(authorize|verify|sync)|organic-evidence\/(search-console\/(connect|reconnect|select|disconnect|acquire)|site\/acquire|external\/acquire))/.test(req.path); }
export function expensiveProductPath(req) { return /\/((woocommerce\/sync)|(organic-evidence\/((site|external)\/acquire|search-console\/acquire)))$/.test(req.path); }
