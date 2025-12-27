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
};

// Helper: build the prompt we send to OpenAI (SMART MODE)
function buildPrompt({ topic, primary_keyword, featured_product_name, featured_product_url }) {
  const productsJson = JSON.stringify(STREET_KINGZ_PRODUCTS);

  return `
You are an expert UK SEO content writer for Street Kingz, a UK-based car care brand.
You produce high-quality, helpful, practical long-form buyer guide articles in clean HTML.

Featured product (must be the main recommendation and the winner):
- Name: "${featured_product_name}"
- URL: "${featured_product_url}"

====================================================================
SMART MODE RULES (MANDATORY)
====================================================================

You MUST determine the correct article length based on topic complexity:

1. SHORT ARTICLE (600–1000 words)
2. MEDIUM ARTICLE (1100–1600 words)
3. LONG ARTICLE (1700–2500 words)

You MUST choose a mode using these rules:

- LONG MODE (1700–2500 words) if the topic is a broad or "pillar" style query, for example:
  - any topic starting with "how to wash a car"
  - any topic containing "complete guide", "beginner’s guide", or "step by step guide"
  - any topic that clearly covers a full routine (for example wash + dry, full wash process, or complete interior deep clean)

- LONG MODE (hard rule) for any topic about drying a car as a full process, including:
  - "how to dry a car"
  - "how to dry your car"
  - "how to dry my car"
  - "best way to dry a car"
  For these topics you MUST:
  - Set "target_word_count" to AT LEAST 1800 (and no more than 2500).
  - Write enough detailed content to realistically reach that length. Do NOT heavily summarise.

- MEDIUM MODE (1100–1600 words) for focused "how to" topics that cover one main process.

- SHORT MODE (600–1000 words) ONLY for simple, single-question topics.

Ignore any user word count request, Smart Mode ALWAYS decides.

====================================================================
REALISM + ANTI-AI-DETECTION RULES (MANDATORY)
====================================================================

- Include at least ONE mild, grounded opinion.
- Include at least ONE real-world Sunday driveway example.
- Vary H2 wording between articles.

====================================================================
BANNED / WEAK PHRASES (MANDATORY)
====================================================================

You MUST NOT use these phrases or close variants in content_html or meta_description:
- "in this guide", "in this article", "this comprehensive guide"
- "showroom shine", "showroom finish"
- "gleaming ride", "ultimate shine", "mirror-like finish"
- marketing clichés and hype

====================================================================
EM DASH AND DOUBLE HYPHEN BAN (MANDATORY)
====================================================================

You MUST NOT use:
- the em dash character (—)
- double hyphens (--)

====================================================================
STREET KINGZ PRODUCT RULES (VERY IMPORTANT)
====================================================================

Use ONLY products from this list:
${productsJson}

Rules:
- Use exact product names.
- On FIRST mention ONLY, wrap the product name in an <a> tag with its URL.
- After first link, you may use plain text.
- Include 2 or 3 different Street Kingz products per article.
- At least 2 different products MUST be linked on first mention.

====================================================================
ARTICLE OUTPUT FORMAT (RETURN JSON ONLY)
====================================================================

Return ONLY this JSON object:

{
  "title": string,
  "slug": string,
  "primary_keyword": string,
  "meta_description": string,
  "target_word_count": number,
  "content_html": string,
  "image_placeholders": [
      { "id": "img1", ... },
      { "id": "img2", ... },
      { "id": "img3", ... }
  ]
}

====================================================================
HTML VALIDITY RULES (MANDATORY, NO EXCEPTIONS)
====================================================================

- content_html MUST be valid HTML.
- ALL normal text MUST be wrapped in <p> tags. No loose text nodes.
- After any </section>, the next content MUST start with a new <p> on a new line.
- The featured box MUST be output EXACTLY as specified below, including indentation and <p> wrappers.
- Do NOT output Markdown.

====================================================================
BUYER-INTENT RULES (MANDATORY, TO MAKE THIS SELL)
====================================================================

1) EARLY RECOMMENDATION BOX (within first 20% of the article)
You MUST output this block EXACTLY after the intro and after img1.
Do not change tags, do not remove <p> tags, do not add extra text inside the section:

<section class="sk-featured-box">
  <h2>Best option for most people in the UK</h2>
  <p><strong>Quick pick:</strong> ${featured_product_name}</p>
  <p>Short reason in 1 to 2 sentences, practical, no hype.</p>
  <p><a href="${featured_product_url}">View the kit</a></p>
</section>

Immediately after </section>, output a blank line then start with a new <p>.

2) DECISION SECTION (mid-article, before FAQs)
- Must be a <h2> section titled like "Which one should you actually buy?" (wording can vary)
- Must compare EXACTLY 3 options using <ul> and <li>
- Each <li> must include: who it’s for + one reason
- The 3 options MUST be:
  - Best for most people (winner, featured product)
  - Best if you want maximum drying (choose a relevant drying towel/bundle)
  - Best if you want a full set (Origin Wash Kit)

3) NOT FOR YOU SECTION (mandatory)
- Add a <h2> section titled like "Who this is not for" (wording can vary)
- Include EXACTLY 3 bullet points using <ul><li>
- Blunt and practical.

4) CTA RULES (hard)
- Exactly 2 CTAs total in the whole article:
  - The featured box CTA (already included)
  - A final CTA sentence in the conclusion that contains a link to the featured product URL.
  - The final CTA MUST be inside a <p> and MUST include: <a href="${featured_product_url}">…</a>

====================================================================
PRIMARY KEYWORD PLACEMENT (MANDATORY)
====================================================================

You MUST use the primary keyword EXACTLY as written as a substring (not necessarily the entire heading):
- The <h1> MUST CONTAIN the primary keyword exactly once.
- In the first 120 words, include the primary keyword exactly once.
- One <h2> MUST CONTAIN the primary keyword exactly once.
- meta_description MUST CONTAIN the primary keyword exactly once.
- meta_description length: 140–160 characters.
- slug must be based on the primary keyword (lowercase, hyphen separated, no stop words if possible).

====================================================================
FAQ RULES BY MODE
====================================================================

SHORT: 2–3 FAQs
MEDIUM: 3–4 FAQs
LONG: 4–6 FAQs

Use <h3> for questions and <p> for answers.

====================================================================
AUTHOR SIGN-OFF RULE (MANDATORY)
====================================================================

At the very end of content_html, after the conclusion and after the final CTA sentence,
include a short sign-off from Ben, founder of Street Kingz, inside one <p> tag. 1–2 sentences.

====================================================================
IMAGE PLACEHOLDER RULES
====================================================================

SHORT → img1 only
MEDIUM → img1 + img2
LONG → img1 + img2 + img3

Placement:
- img1 after intro
- img2 mid-article
- img3 before conclusion

Insert:
<!-- IMAGE: imgX -->

====================================================================
BEGIN ARTICLE NOW
====================================================================

Topic: "${topic}"
Primary keyword: "${primary_keyword}"

Return ONLY the JSON.
`;
}

// Route: generate a real article using OpenAI
app.post("/generate-article", async (req, res) => {
  try {
    const { topic, primary_keyword, featured_product_name, featured_product_url } = req.body || {};

    if (!topic || !primary_keyword) {
      return res.status(400).json({
        error: "Missing required fields: 'topic' and 'primary_keyword'."
      });
    }

    if (!featured_product_name || !featured_product_url) {
      return res.status(400).json({
        error: "Missing required fields: 'featured_product_name' and 'featured_product_url'."
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not set on the server."
      });
    }

    const prompt = buildPrompt({ topic, primary_keyword, featured_product_name, featured_product_url });

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
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

    let article;
    try {
      article = JSON.parse(content);
    } catch (err) {
      console.error("Failed to parse OpenAI JSON:", err, "Raw content:", content);
      return res.status(502).json({
        error: "Failed to parse OpenAI JSON. Check server logs."
      });
    }

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
