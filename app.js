import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import healthRoute from "./routes/health.js";
import generateArticleRoute from "./routes/generateArticle.js";
import createSeoArticleWorkflowRoute from "./routes/createSeoArticleWorkflow.js";
import productKernelRoute from "./routes/productKernel.js";
import woocommerceRoute from "./routes/woocommerce.js";
import { randomUUID } from "node:crypto";
import { startWooMaintenance } from "./product-kernel/woocommerceMaintenance.js";

const app = express();

startWooMaintenance();

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

export default app;
