import { callLLMJson } from "../providers/router.js";
import { buildPrompt } from "../prompts/articlePrompt.js";
import { findHtmlIssues } from "../validators/articleHtml.js";
import { enforceCoreStructure, enforceMetaLength } from "../utils/articleFormatting.js";

export async function generateArticle({
  topic,
  primary_keyword,
  featured_product_name,
  featured_product_url,
  featured_box_heading,
  featured_box_blurb,
  featured_box_cta,
  final_cta_text
}) {
  const prompt = buildPrompt({ topic, primary_keyword, featured_product_name, featured_product_url });

  const runOnce = async (temp) => {
    const article = await callLLMJson({ prompt, temperature: temp });

    article.primary_keyword = primary_keyword;
    article.slug = (
      article.slug ||
      primary_keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    ).slice(0, 80);

    article.meta_description = enforceMetaLength(article.meta_description, primary_keyword);

    article.content_html = enforceCoreStructure({
      html: article.content_html,
      featured_product_name,
      featured_product_url,
      featured_box_heading,
      featured_box_blurb,
      featured_box_cta,
      final_cta_text
    });

    if (!Array.isArray(article.image_placeholders)) {
      article.image_placeholders = [
        { id: "img1", type: "image", alt: "Car wash routine" },
        { id: "img2", type: "image", alt: "Washing step" },
        { id: "img3", type: "image", alt: "Drying step" }
      ];
    }

    const issues = findHtmlIssues(article.content_html);
    return { article, issues };
  };

  let { article, issues } = await runOnce(0.4);

  if (issues.length) {
    const retry = await runOnce(0.25);
    article = retry.article;
    issues = retry.issues;
  }

  return { article, issues };
}
