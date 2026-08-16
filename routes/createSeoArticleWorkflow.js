import express from "express";
import { runCreateSeoArticleM2 } from "../workflows/createSeoArticleIntelligence.js";
import { runCreateSeoArticleM3 } from "../workflows/createSeoArticleM3.js";

export function createSeoArticleWorkflowRouter({ resolveCandidates, runResearch } = {}) {
  const router = express.Router();

  router.post("/workflows/create-seo-article", async (req, res) => {
    try {
      const result = typeof runResearch === "function"
        ? await runCreateSeoArticleM3({ input: req.body, resolveCandidates, runResearch })
        : await runCreateSeoArticleM2({ input: req.body, resolveCandidates });
      return res.status(201).json(result.plan);
    } catch (error) {
      if (error.code === "INVALID_WORKFLOW_INPUT") return res.status(400).json({ error: error.message, code: error.code, issues: error.errors });
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  return router;
}

export default createSeoArticleWorkflowRouter();
