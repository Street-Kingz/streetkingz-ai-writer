import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import healthRoute from "./routes/health.js";
import generateArticleRoute from "./routes/generateArticle.js";
import createSeoArticleWorkflowRoute from "./routes/createSeoArticleWorkflow.js";
import productKernelRoute from "./routes/productKernel.js";
import { randomUUID } from "node:crypto";

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use((error, req, res, next) => {
  if (!req.path.startsWith("/api/product/") || error?.type !== "entity.parse.failed") return next(error);
  const correlationId = randomUUID();
  res.set("x-correlation-id", correlationId).status(400).json({ error: { code: "INVALID_REQUEST", message: "Malformed JSON request.", correlation_id: correlationId } });
});
app.use(healthRoute);
app.use(generateArticleRoute);
app.use(createSeoArticleWorkflowRoute);
app.use(productKernelRoute);

export default app;
