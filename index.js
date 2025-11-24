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
  const safeWordCount = target_word_count || 1800;

  return `
You are an SEO content writer for a UK car care brand called Street Kingz.

Write a long-form blog article about the topic: "${topic}"
Primary keyword: "${primary_keyword}"
Target word count: ~${safeWordCount} words.

Audience:
- UK car owners who actually enjoy cleaning their cars on a Sunday.
- They want clear, no-nonsense advice, not hype.
- Tone: calm, confident, conversational, slightly informal, UK spelling.

Requirements:
- Only ONE H1 in the article (the main title).
- Use clear H2 and H3 headings for structure.
- No keyword stuffing. Use the primary keyword naturally in the title, intro and a few sections.
- Never invent fake stats, data, or wild claims.
- Include practical, real-world tips (as if you’ve actually washed and dried cars yourself).
- Mention Street Kingz products naturally when relevant, not as a hard sell.

Output format:
Return a SINGLE JSON object ONLY (no extra text, no Markdown, no code fences).
The JSON must have exactly these fields:

{
  "title": string,                // SEO-friendly title for the blog post
  "slug": string,                 // URL slug based on the title, lowercase, hyphens, no special chars
  "primary_keyword": string,      // the primary keyword
  "meta_description": string,     // 140-160 chars, compelling, includes the keyword naturally
  "target_word_count": number,    // the target word count you aimed for
  "content_html": string,         // full HTML of the article, including <h1> and other headings
  "image_placeholders": [         // exactly 3 image slots
    {
      "id": "img1",
      "position": "after_intro",  // where in the article it should roughly go
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
- Use proper HTML tags: <h1>, <h2>, <h3>, <p>, <ul>, <li>.
- Insert image markers as HTML comments where images should go, exactly like:
  <!-- IMAGE: img1 -->
  <!-- IMAGE: img2 -->
  <!-- IMAGE: img3 -->
- Place img1 after the intro, img2 somewhere in the middle, img3 near the conclusion.
- Do NOT include actual <img> tags, only the comments and the text content.

Return ONLY the JSON. No explanations, no extra text before or after.
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
