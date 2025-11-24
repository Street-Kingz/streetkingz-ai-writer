import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 3000;

// Read the OpenAI API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY is not set. The /generate-article endpoint will not work until you add it in Render.");
}

app.use(cors());
app.use(bodyParser.json());

// Healthcheck route
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Street Kingz AI writer service running" });
});

// Helper: build the prompt we send to OpenAI
function buildPrompt({ topic, primary_keyword, target_word_count }) {
  const safeWordCount = target_word_count || 1900;

  return `
You are an SEO content writer for a UK car care brand called Street Kingz.

Brand + audience:
- Street Kingz is a UK-based car care brand for people who genuinely enjoy cleaning their cars on a Sunday.
- Audience: normal enthusiasts, not pros. They care about how their car looks, but they don't want jargon or hype.
- Tone: direct, confident, conversational, no cringe sales talk, UK spelling (colour, tyre, litre etc.).
- Avoid over-the-top phrases like "beloved car", "pristine finish", "transform your vehicle". Keep it grounded and real.

Write a long-form blog article about:
Topic: "${topic}"
Primary keyword: "${primary_keyword}"
Target word count: around ${safeWordCount} words.

Article goals:
- Answer the search intent behind the primary keyword clearly and completely.
- Give simple, practical, real-world advice a normal UK car owner can follow.
- Naturally weave Street Kingz products into the content without a hard sell (1–3 mentions max).
- Use examples that sound like someone who actually washes and dries their own car.

Required JSON output (ONLY return this JSON, no extra text):

{
  "title": string,                // SEO-friendly title (max ~70 chars), includes the primary keyword naturally if possible
  "slug": string,                 // URL slug: lowercase, words separated by hyphens, no special characters
  "primary_keyword": string,      // the primary keyword you used
  "meta_description": string,     // 140-160 characters, compelling, includes the keyword naturally
  "target_word_count": number,    // the target word count you aimed for
  "content_html": string,         // full HTML of the article
  "image_placeholders": [
    {
      "id": "img1",
      "position": "after_intro",
      "recommended_image_type": string,
      "recommended_alt": string,
      "recommended_caption": string
    },
    {
      "id": "img2",
      "position": "mid_article",
      "recommended_image_type": string,
      "recommended_alt": string,
      "recommended_caption": string
    },
    {
      "id": "img3",
      "position": "before_conclusion",
      "recommended_image_type": string,
      "recommended_alt": string,
      "recommended_caption": string
    }
  ]
}

Rules for content_html:
- Use proper HTML tags only: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>.
- Exactly ONE <h1> and it must be the article title at the top.
- Use clear <h2> sections to structure the article, for example (adapt names to fit the topic):
  - <h2>Why [topic/keyword] Actually Matters</h2>
  - <h2>What You Need Before You Start</h2>
  - <h2>Step-by-Step: [main process]</h2>
  - <h2>Common Mistakes to Avoid</h2>
  - <h2>Extra Tips for Better Results</h2>
  - <h2>Frequently Asked Questions</h2>
  - <h2>Conclusion</h2>
- Use <h3> only for sub-points inside a section, not randomly.
- Paragraphs should be short and easy to scan (2–4 sentences).
- Include at least one bullet list (<ul><li>...</li></ul>) where it helps (e.g. tools, mistakes, tips).
- Somewhere in the article, mention Street Kingz products in a natural way, e.g. high GSM drying towels, pH safe shampoo, wheel brushes. No hype, just why they help.

FAQ section:
- Include a dedicated <h2>Frequently Asked Questions</h2> near the end.
- Under it, add 3–5 Q&As using <h3> for the question and <p> for the answer.
- Questions should sound like real searches, e.g. "Can I just let my car air dry?" rather than overly formal ones.

Image markers:
- In content_html, insert exactly three HTML comments to mark where images go:
  <!-- IMAGE: img1 -->
  <!-- IMAGE: img2 -->
  <!-- IMAGE: img3 -->
- Place:
  - img1 after the intro section (after the first 1–2 paragraphs).
  - img2 somewhere in the middle (e.g. in the step-by-step or tools section).
  - img3 near the end (before or in the conclusion).

Image placeholders array:
- For img1, recommend a "hero" or strong visual relevant to the topic (e.g. drying towel in use on paintwork).
- For img2, recommend a close-up process shot (e.g. safe wash technique, foam, wheel cleaning, etc. depending on topic).
- For img3, recommend a product or kit style image (e.g. Street Kingz towel + shampoo together).
- recommended_alt should be descriptive and include natural language, not keyword spam.
- recommended_caption should be short and helpful, not salesy.

Language + content rules:
- Use UK spelling.
- No fake statistics or made-up studies. If you need to refer to knowledge, keep it general ("many detailers find...").
- Avoid generic fluff like "in today's fast-paced world". Get to the point quickly.
- Aim for practical, step-by-step advice with concrete examples over vague statements.
- Do NOT return Markdown or code fences. Return ONLY the JSON object.
  `.trim();
}

// Route: generate a real article using OpenAI
app.post("/generate-article", async (req, res) => {
  try {
    const { topic, primary_keyword, target_word_count } = req.body || {};

    if (!topic || !primary_keyword) {
      return res.status(400).json({
        error: "Missing required fields: 'topic' and 'primary_keyword'."
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not set on the server."
      });
    }

    const prompt = buildPrompt({ topic, primary_keyword, target_word_count });

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: "You are a highly skilled SEO content writer that always returns strictly valid JSON when asked."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      return res.status(502).json({ error: "Error from OpenAI API", details: errorText });
    }

    const data = await openaiResponse.json();

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error("No content returned from OpenAI:", data);
      return res.status(502).json({ error: "No content returned from OpenAI" });
    }

    // content should be JSON as a string – parse it
    let article;
    try {
      article = JSON.parse(content);
    } catch (err) {
      console.error("Failed to parse OpenAI JSON:", err, "Raw content:", content);
      return res.status(502).json({
        error: "Failed to parse OpenAI JSON. Check server logs for details."
      });
    }

    // Basic sanity checks
    if (!article.title || !article.content_html) {
      return res.status(502).json({
        error: "Article missing required fields from OpenAI."
      });
    }

    return res.json(article);
  } catch (err) {
    console.error("Unexpected error in /generate-article:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Street Kingz AI writer service listening on port ${PORT}`);
});
