import express from "express";
import { createSeoArticleRunPlan } from "../workflows/createSeoArticle.js";

const router = express.Router();

router.post("/workflows/create-seo-article", (req, res) => {
  try {
    return res.status(201).json(createSeoArticleRunPlan(req.body));
  } catch (error) {
    if (error.code === "INVALID_WORKFLOW_INPUT") return res.status(400).json({ error: error.message, code: error.code, issues: error.errors });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
