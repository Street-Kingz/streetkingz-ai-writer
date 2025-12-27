import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 3000;

// --- STREET KINGZ PRODUCT CATALOGUE ---
const STREET_KINGZ_PRODUCTS = [
  {
    name: "XL DRYING TOWEL – 800GSM",
    type: "drying towel",
    details: "Extra large 800gsm microfibre drying towel, 90×70cm with deep pile for safe drying.",
    ideal_use: "Primary drying towel for paintwork, especially larger panels and SUVs.",
    url: "https://streetkingz.co.uk/product/xl-drying-towel-800gsm/"
  },
  {
    name: "Heavy Duty Drying Towel – 1200gsm",
    type: "drying towel",
    details: "1200gsm twisted loop heavy duty drying towel, 90×60cm, double sided.",
    ideal_use: "Maximum water pick up on heavily soaked vehicles or for people who want overkill drying performance.",
    url: "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/"
  },
  {
    name: "Paint Protection Cloth",
    type: "microfibre cloth",
    details: "Soft, short pile microfibre cloth designed for removing coatings, waxes and sealants.",
    ideal_use: "Buffing away wax, sealant or protection products without marring the finish.",
    url: "https://streetkingz.co.uk/product/paint-protection-cloth/"
  },
  {
    name: "CORAL FLEECE CLOTHS – 2 PACK",
    type: "microfibre cloth",
    details: "Pack of two plush coral fleece cloths for interior and light exterior work.",
    ideal_use: "Dusting interiors, light wipe downs and jobs where you want something soft and forgiving.",
    url: "https://streetkingz.co.uk/product/coral-fleece-cloths-2-pack/"
  },
  {
    name: "Waffle Glass Cloth",
    type: "glass cloth",
    details: "Tight waffle weave cloth designed for streak-free glass cleaning.",
    ideal_use: "Cleaning interior and exterior glass, reducing smears and lint.",
    url: "https://streetkingz.co.uk/product/waffle-glass-cloth/"
  },
  {
    name: "Microfibre Wash Mitt",
    type: "wash mitt",
    details: "Deep pile microfibre wash mitt with cuffed wrist for safe contact washing.",
    ideal_use: "Main wash stage after pre-wash and rinse, especially on well-maintained paint.",
    url: "https://streetkingz.co.uk/product/microfibre-wash-mitt/"
  },
  {
    name: "Microfibre Scrub Pads",
    type: "scrub pads",
    details: "Microfibre-faced scrub pads available in multiple pack sizes.",
    ideal_use: "Agitating cleaners on interiors and exteriors where you need more bite than a cloth, but still safe.",
    url: "https://streetkingz.co.uk/product/microfibre-scrub-pads/"
  },
  {
    name: "Wheel Belt Flosser",
    type: "wheel cleaning tool",
    details: "Flexible microfibre tool designed to clean between wheel spokes and behind brake calipers.",
    ideal_use: "Cleaning awkward areas of wheels where standard brushes don’t reach.",
    url: "https://streetkingz.co.uk/product/wheel-belt-flosser/"
  },
  {
    name: "The XL Barrel Brush",
    type: "wheel brush",
    details: "Long reach, soft-fibre barrel brush for cleaning deep into wheel barrels.",
    ideal_use: "Cleaning the inside of wheels and behind spokes without removing the wheel.",
    url: "https://streetkingz.co.uk/product/the-xl-barrel-brush/"
  },
  {
    name: "Slim Barrel Brush",
    type: "wheel brush",
    details: "Compact barrel brush designed for tighter spoke patterns and smaller wheels.",
    ideal_use: "Smaller wheel designs, tight gaps, behind spokes and brake components.",
    url: "https://streetkingz.co.uk/product/slim-barrel-brush/"
  },
  {
    name: "Wheel Hose Guides",
    type: "accessory",
    details: "Wheel arch hose guides to stop your hose or cable snagging on tyres.",
    ideal_use: "Preventing hose snagging and dragging while washing around the car.",
    url: "https://streetkingz.co.uk/product/wheel-hose-guides/"
  },
  {
    name: "Stubby Gun & Nozzle Set",
    type: "pressure washer tool",
    details: "Compact pressure washer gun offering better control and ergonomics during washing.",
    ideal_use: "Pairing with a foam lance or standard nozzles for controlled washing in tight spaces.",
    url: "https://streetkingz.co.uk/product/stubby-gun-and-nozzle-set/"
  },
  {
    name: "Snow Foam Lance",
    type: "foam lance",
    details: "Premium snow foam lance with adjustable fan and flow pattern.",
    ideal_use: "Applying thick, even foam during the pre-wash stage to reduce swirl marks.",
    url: "https://streetkingz.co.uk/product/snow-foam-lance/"
  },
  {
    name: "Stubby Gun + Foam Lance Bundle",
    type: "bundle",
    details: "Set including the Stubby Gun and Snow Foam Lance for the ideal pre-wash setup.",
    ideal_use: "Users wanting a full, efficient pre-wash system with maximum control.",
    url: "https://streetkingz.co.uk/product/stubby-gun-bundle/"
  },
  {
    name: "The Origin Shampoo – Ultra Concentrated & pH Safe",
    type: "shampoo",
    details: "Ultra concentrated, pH safe shampoo designed to lubricate and clean without stripping protection.",
    ideal_use: "Main contact wash stage as part of a safe wash routine.",
    url: "https://streetkingz.co.uk/product/origin-shampoo/"
  },
  {
    name: "Origin MultiClean – Interior & Exterior Cleaner",
    type: "multi-purpose cleaner",
    details: "Versatile cleaner suitable for plastics, fabrics, door shuts, engines and more.",
    ideal_use: "General purpose cleaning for interiors and exteriors.",
    url: "https://streetkingz.co.uk/product/origin-multiclean/"
  },
  {
    name: "Origin Glass Cleaner – Streak-Free Window & Mirror Cleaner",
    type: "glass cleaner",
    details: "Fast flashing, streak-free glass cleaner for crystal clear visibility.",
    ideal_use: "Interior and exterior glass cleaning without streaks.",
    url: "https://streetkingz.co.uk/product/origin-glass-cleaner/"
  },
  {
    name: "The Origin Ultra Wash & Dry Kit",
    type: "bundle",
    details: "Origin Shampoo paired with premium drying gear for a complete wash and dry solution.",
    ideal_use: "A simple, effective all-in-one wash and dry setup.",
    url: "https://streetkingz.co.uk/product/the-origin-ultra-wash-dry-kit/"
  },
  {
    name: "Wheel Cleaning Kit (XL Brush + Slim Brush + Belt Flosser)",
    type: "bundle",
    details: "Complete wheel cleaning with the xl barrel brush, slim barrel brush and the microfibre wheel flosser",
    ideal_use: "For those who want to clean their entire alloys safely",
    url: "https://streetkingz.co.uk/product/wheel-cleaning-power-pack/"
  },
  {
    name: "Origin Wash Kit",
    type: "bundle",
    details: "Origin Ultra Concentrated pH safe shampoo paired with microfibre wash mitt",
    ideal_use: "costed efective shampoo that protects your paint and a microfibre mitt that prevents scratches and swirls",
    url: "https://streetkingz.co.uk/product/origin-wash-kit/"
  },
  {
    name: "Origin Interior Deep Clean Kit",
    type: "bundle",
    details: "Interior kit containing Multiclean, Scrub Pads and Coral Cloth.",
    ideal_use: "Deep cleaning interiors including fabrics, plastics and trim.",
    url: "https://streetkingz.co.uk/product/origin-interior-deep-clean-kit/"
  },
  {
    name: "Origin Glass Clarity Kit",
    type: "bundle",
    details: "Streak free glass cleaner paired with a purpose made glass waffle cloth",
    ideal_use: "for those who want effortlessly clean and streak free windows and mirrors",
    url: "https://streetkingz.co.uk/product/origin-glass-clarity-kit-glass-cleaner-waffle-cloth/"
  },
  {
    name: "Origin XL Wash Kit",
    type: "bundle",
    details: "Shampoo paired with XL Drying Towel and Coral Fleece.",
    ideal_use: "Starter wash kit for a safe wash routine.",
    url: "https://streetkingz.co.uk/product/origin-xl-wash-kit/"
  },
  {
    name: "XL Wash & Dry Set",
    type: "bundle",
    details: "XL Towel + Wash Mitt.",
    ideal_use: "Basic wash and dry combo.",
    url: "https://streetkingz.co.uk/product/xl-wash-dry-set/"
  },
  {
    name: "The Origin Trilogy",
    type: "bundle",
    details: "containing the Origin shampoo, Glass cleaner & Interior cleaner",
    ideal_use: "effective cleaning both inside and outside of the car",
    url: "https://streetkingz.co.uk/product/the-origin-trilogy/"
  },
  {
    name: "Twisted Loop Power Pack",
    type: "bundle",
    details: "XL Drying Towel + Heavy Duty Drying Towel.",
    ideal_use: "Maximum drying absorption.",
    url: "https://streetkingz.co.uk/product/twisted-loop-power-pack/"
  },
  {
    name: "Ultra Wash and Dry Set",
    type: "bundle",
    details: "Heavy Duty Drying Towel + Wash Mitt.",
    ideal_use: "All-round wash and dry starter setup.",
    url: "https://streetkingz.co.uk/product/ultra-wash-and-dry-set/"
  }
];

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
function buildPrompt({ topic, primary_keyword, featured_product_name, featured_product_url }) {
  const productsJson = JSON.stringify(STREET_KINGZ_PRODUCTS);

  // IMPORTANT: keep this as a single template string, no stray backticks anywhere.
  return `
You are an expert UK SEO content writer for Street Kingz, a UK-based car care brand.
You produce high-quality, helpful, practical long-form buyer guide articles in clean HTML.

Featured product (must be the main recommendation and the winner):
- Name: "${featured_product_name}"
- URL: "${featured_product_url}"

Use ONLY products from this list (exact names only):
${productsJson}

RETURN JSON ONLY in this exact shape:
{
  "title": string,
  "slug": string,
  "primary_keyword": string,
  "meta_description": string,
  "target_word_count": number,
  "content_html": string,
  "image_placeholders": [{"id":"img1"},{"id":"img2"},{"id":"img3"}]
}

HTML VALIDITY (hard rules):
- content_html MUST be valid HTML.
- All normal text MUST be wrapped in <p> tags, no loose text.
- Do NOT output Markdown.

BUYER INTENT (hard rules):
- Include this exact featured box after the intro and after <!-- IMAGE: img1 -->. Do not change tags:
<section class="sk-featured-box">
  <h2>Best option for most people in the UK</h2>
  <p><strong>Quick pick:</strong> ${featured_product_name}</p>
  <p>Short reason in 1 to 2 sentences, practical, no hype.</p>
  <p><a href="${featured_product_url}">View the kit</a></p>
</section>

- Immediately after </section>, start with a new <p>.
- Include a decision <h2> section before FAQs comparing EXACTLY 3 options in <ul><li>:
  1) Best for most people (featured product)
  2) Best if you want maximum drying (choose a relevant drying towel or drying bundle from the product list)
  3) Best if you want a full set (Origin Wash Kit)
- Include a "Who this is not for" <h2> with EXACTLY 3 bullets.
- Exactly 2 CTAs total in the whole article:
  1) Featured box CTA (already included)
  2) One final CTA sentence in the conclusion containing a link to ${featured_product_url}

PRIMARY KEYWORD PLACEMENT (hard rules):
- <h1> must CONTAIN the primary keyword exactly once.
- In first 120 words, include the primary keyword exactly once.
- One <h2> must CONTAIN the primary keyword exactly once.
- meta_description must CONTAIN the primary keyword exactly once (140 to 160 chars).
- slug based on the primary keyword (lowercase, hyphen-separated).

IMAGE PLACEHOLDERS:
- Insert <!-- IMAGE: img1 --> after intro.
- Insert <!-- IMAGE: img2 --> mid-article if medium/long.
- Insert <!-- IMAGE: img3 --> before conclusion if long.

STYLE:
- UK spelling.
- No hype.
- No em dashes and no double hyphens.

Topic: "${topic}"
Primary keyword: "${primary_keyword}"

Return ONLY the JSON object, nothing else.
`.trim();
}

// Route: generate an article using OpenAI
app.post("/generate-article", async (req, res) => {
  try {
    const { topic, primary_keyword, featured_product_name, featured_product_url } = req.body || {};

    if (!topic || !primary_keyword) {
      return res.status(400).json({ error: "Missing required fields: 'topic' and 'primary_keyword'." });
    }

    if (!featured_product_name || !featured_product_url) {
      return res.status(400).json({ error: "Missing required fields: 'featured_product_name' and 'featured_product_url'." });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not set on the server." });
    }

    const prompt = buildPrompt({ topic, primary_keyword, featured_product_name, featured_product_url });

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: "You are a highly skilled SEO content writer that always returns strictly valid JSON when asked." },
          { role: "user", content: prompt }
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

    let article;
    try {
      article = JSON.parse(content);
    } catch (err) {
      console.error("Failed to parse OpenAI JSON:", err, "Raw content:", content);
      return res.status(502).json({ error: "Failed to parse OpenAI JSON. Check server logs." });
    }

    if (!article.title || !article.content_html) {
      return res.status(502).json({ error: "Article missing required fields from OpenAI." });
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
