import express from "express";
import { runCreateSeoArticleM2 } from "../workflows/createSeoArticleIntelligence.js";

export function createSeoArticleWorkflowRouter({ resolveCandidates } = {}) {
  const router = express.Router();

  router.post("/workflows/create-seo-article", async (req, res) => {
    try {
      const result = await runCreateSeoArticleM2({ input: req.body, resolveCandidates });
      return res.status(201).json(result.plan);
    } catch (error) {
      if (error.code === "INVALID_WORKFLOW_INPUT") return res.status(400).json({ error: error.message, code: error.code, issues: error.errors });
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  return router;
}

export default createSeoArticleWorkflowRouter();
