import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import healthRoute from "./routes/health.js";
import generateArticleRoute from "./routes/generateArticle.js";

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(healthRoute);
app.use(generateArticleRoute);

export default app;
