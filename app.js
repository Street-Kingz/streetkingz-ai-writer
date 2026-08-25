import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import healthRoute from "./routes/health.js";
import generateArticleRoute from "./routes/generateArticle.js";
import createSeoArticleWorkflowRoute from "./routes/createSeoArticleWorkflow.js";
import productKernelRoute from "./routes/productKernel.js";

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(healthRoute);
app.use(generateArticleRoute);
app.use(createSeoArticleWorkflowRoute);
app.use(productKernelRoute);

export default app;
