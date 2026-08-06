import express from "express";
import { GEMINI_API_KEY, OPENAI_API_KEY } from "../config/index.js";
import { generateArticle } from "../services/articleGeneration.js";

const router = express.Router();

router.post("/generate-article", async (req, res) => {
  try {
    const {
      topic,
      primary_keyword,
      featured_product_name,
      featured_product_url,
      featured_box_heading,
      featured_box_blurb,
      featured_box_cta,
      final_cta_text
    } = req.body || {};

    if (!topic || !primary_keyword) {
      return res.status(400).json({ error: "Missing required fields: 'topic' and 'primary_keyword'." });
    }
    if (!featured_product_name || !featured_product_url) {
      return res
        .status(400)
        .json({ error: "Missing required fields: 'featured_product_name' and 'featured_product_url'." });
    }
    if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
      return res.status(500).json({ error: "No AI keys set. Add OPENAI_API_KEY and/or GEMINI_API_KEY in Render." });
    }

    const { article, issues } = await generateArticle({
      topic,
      primary_keyword,
      featured_product_name,
      featured_product_url,
      featured_box_heading,
      featured_box_blurb,
      featured_box_cta,
      final_cta_text
    });

    if (issues.length) {
      return res.status(422).json({
        error: "Generated HTML failed validation",
        issues
      });
    }

    return res.json(article);
  } catch (err) {
    console.error("Unexpected error in /generate-article:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
