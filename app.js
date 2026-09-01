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
import v104B1AcceptanceRoute from "./routes/v1-04B1Acceptance.js";
import { randomUUID } from "node:crypto";

const app = express();


app.use(cors());
app.use(woocommerceRoute);
app.use(bodyParser.json());
app.use((error, req, res, next) => {
  if (!req.path.startsWith("/api/product/")) return next(error);
  const correlationId = randomUUID();
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
app.use(generateArticleRoute);
app.use(createSeoArticleWorkflowRoute);
app.use(productKernelRoute);
app.use(organicEvidenceRoute);
app.use(googleSearchConsoleRoute);
if (v104B1AcceptanceRoute) app.use(v104B1AcceptanceRoute);
if (v103AcceptanceHarnessRoute) app.use(v103AcceptanceHarnessRoute);

export default app;
