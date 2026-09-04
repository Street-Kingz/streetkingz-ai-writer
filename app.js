import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import healthRoute from "./routes/health.js";
import generateArticleRoute from "./routes/generateArticle.js";
import createSeoArticleWorkflowRoute from "./routes/createSeoArticleWorkflow.js";
import productKernelRoute from "./routes/productKernel.js";
import woocommerceRoute from "./routes/woocommerce.js";
import v103AcceptanceHarnessRoute from "./routes/v1-03AcceptanceHarness.js";
import organicEvidenceRoute from "./routes/organicEvidence.js";
import googleSearchConsoleRoute from "./routes/googleSearchConsole.js";
import siteEvidenceRoute from "./routes/siteEvidence.js";
import externalEvidenceRoute from "./routes/externalEvidence.js";
import decisionRunsRoute from "./routes/decisionRuns.js";
import { correlationMiddleware, productCorsOptions, loopbackOnly, requestLogger, generalProductRateLimit, sensitiveProductRateLimit, expensiveProductRateLimit, protectedProductPath, sensitiveProductPath, expensiveProductPath } from "./product-kernel/security.js";

const app = express();

app.set("trust proxy", false);
app.use(correlationMiddleware);
app.use(cors(productCorsOptions()));
app.use(requestLogger);
app.use((req, res, next) => protectedProductPath(req) ? generalProductRateLimit(req, res, next) : next());
app.use((req, res, next) => sensitiveProductPath(req) ? sensitiveProductRateLimit(req, res, next) : next());
app.use((req, res, next) => expensiveProductPath(req) ? expensiveProductRateLimit(req, res, next) : next());
app.use(woocommerceRoute);
app.use(bodyParser.json({ limit: "64kb", strict: true, type: "application/json" }));
app.use((error, req, res, next) => {
  if (!req.path.startsWith("/api/product/")) return next(error);
  const correlationId = req.correlationId;
  const responses = {
    "entity.parse.failed": [400, "INVALID_REQUEST", "Malformed JSON request."],
    "entity.too.large": [413, "PAYLOAD_TOO_LARGE", "Request body is too large."],
    "encoding.unsupported": [415, "UNSUPPORTED_ENCODING", "Request encoding is not supported."],
    "charset.unsupported": [415, "UNSUPPORTED_ENCODING", "Request encoding is not supported."]
  };
  const [status, code, message] = responses[error?.type] || [400, "INVALID_REQUEST", "Invalid request body."];
  res.set("x-correlation-id", correlationId).status(status).json({ error: { code, message, correlation_id: correlationId } });
});
app.use(healthRoute);
const developmentLegacy = process.env.NODE_ENV !== "production" && process.env.LEGACY_ARTICLE_ROUTES === "1";
if (developmentLegacy) {
  app.use((req, res, next) => req.path === "/generate-article" || req.path.startsWith("/workflows/create-seo-article") ? loopbackOnly(req, res, next) : next());
  app.use(generateArticleRoute);
  app.use(createSeoArticleWorkflowRoute);
}
app.use(productKernelRoute);
app.use(organicEvidenceRoute);
app.use(googleSearchConsoleRoute);
app.use(siteEvidenceRoute);
app.use(externalEvidenceRoute);
app.use(decisionRunsRoute);
if (v103AcceptanceHarnessRoute) {
  if (process.env.NODE_ENV !== "production" && process.env.V1_03_ACCEPTANCE_HARNESS === "1") app.use(loopbackOnly, v103AcceptanceHarnessRoute);
}

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const isProduct = protectedProductPath(req);
  if (!isProduct) return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An internal error occurred.", correlation_id: req.correlationId } });
  const responses = { "entity.parse.failed": [400, "INVALID_REQUEST", "Malformed JSON request."], "entity.too.large": [413, "PAYLOAD_TOO_LARGE", "Request body is too large."], "encoding.unsupported": [415, "UNSUPPORTED_ENCODING", "Request encoding is not supported."] };
  const [status, code, message] = responses[error?.type] || [500, "INTERNAL_ERROR", "An internal error occurred."];
  res.status(status).json({ error: { code, message, correlation_id: req.correlationId } });
});

export default app;
