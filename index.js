import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Healthcheck route
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Street Kingz AI writer service running" });
});

// Placeholder for the AI article generator
app.post("/generate-article", (req, res) => {
  // For now, just return a dummy article in the format we agreed
  const { topic, primary_keyword, target_word_count } = req.body || {};

  return res.json({
    title: `Dummy article for: ${topic || "No topic provided"}`,
    slug: "dummy-article-slug",
    primary_keyword: primary_keyword || "",
    meta_description: "This is a placeholder meta description from the AI writer service.",
    target_word_count: target_word_count || 1500,
    content_html: `
      <h1>Dummy Article: ${topic || "No topic provided"}</h1>
      <p>This is just a placeholder article from the AI writer service. Once we wire in OpenAI, this will become a full, SEO-friendly blog post.</p>
      <!-- IMAGE: img1 -->
      <h2>Section 1</h2>
      <p>Example section content...</p>
      <!-- IMAGE: img2 -->
      <h2>Section 2</h2>
      <p>More example content...</p>
      <!-- IMAGE: img3 -->
      <h2>Conclusion</h2>
      <p>Placeholder conclusion text...</p>
    `,
    image_placeholders: [
      {
        id: "img1",
        position: "after_intro",
        recommended_image_type: "Hero shot of the XL 800gsm drying towel",
        recommended_alt: "Street Kingz 800gsm drying towel absorbing water on car paint",
        recommended_caption: "Our XL 800gsm Drying Towel pulling water off the paint safely."
      },
      {
        id: "img2",
        position: "mid_article",
        recommended_image_type: "Close-up of safe washing technique with a microfibre mitt",
        recommended_alt: "Microfibre wash mitt gliding over shampoo suds on a car panel",
        recommended_caption: "Using a pH-safe shampoo and soft mitt reduces swirl marks."
      },
      {
        id: "img3",
        position: "before_conclusion",
        recommended_image_type: "Product trio shot of shampoo, mitt and drying towel",
        recommended_alt: "Street Kingz Origin Shampoo, microfibre mitt and XL drying towel",
        recommended_caption: "Everything you need for a safe, scratch-free wash routine."
      }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Street Kingz AI writer service listening on port ${PORT}`);
});
