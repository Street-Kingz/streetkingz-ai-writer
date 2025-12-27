import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 3000;

// --- STREET KINGZ PRODUCT CATALOGUE ---

const STREET_KINGZ_PRODUCTS = [
  // --- CORE SINGLE PRODUCTS ---
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
    name: "Small Barrel Brush",
    type: "wheel brush",
    details: "Compact barrel brush designed for tighter spoke patterns and smaller wheels.",
    ideal_use: "Smaller wheel designs, tight gaps, behind spokes and brake components.",
    url: "https://streetkingz.co.uk/product/small-barrel-brush/"
  },
  {
    name: "Wheel Hose Guides",
    type: "accessory",
    details: "Wheel arch hose guides to stop your hose or cable snagging on tyres.",
    ideal_use: "Preventing hose snagging and dragging while washing around the car.",
    url: "https://streetkingz.co.uk/product/wheel-hose-guides/"
  },

  // --- TOOLS: FOAM LANCE, STUBBY GUN ---
  {
    name: "Stubby Gun",
    type: "pressure washer tool",
    details: "Compact pressure washer gun offering better control and ergonomics during washing.",
    ideal_use: "Pairing with a foam lance or standard nozzles for controlled washing in tight spaces.",
    url: "https://streetkingz.co.uk/product/stubby-gun/"
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

  // --- ORIGIN CHEMICALS ---
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

  // --- BUNDLES & KITS ---
  {
    name: "The Origin Ultra Wash & Dry Kit",
    type: "bundle",
    details: "Origin Shampoo paired with premium drying gear for a complete wash and dry solution.",
    ideal_use: "A simple, effective all-in-one wash and dry setup.",
    url: "https://streetkingz.co.uk/product/the-origin-ultra-wash-dry-kit/"
  },
  {
    name: "Origin Interior Deep Clean Kit",
    type: "bundle",
    details: "Interior kit containing Multiclean, Scrub Pads and Coral Cloth.",
    ideal_use: "Deep cleaning interiors including fabrics, plastics and trim.",
    url: "https://streetkingz.co.uk/product/origin-interior-deep-clean-kit/"
  },
  {
    name: "Origin XL Wash Kit",
    type: "bundle",
    details: "Shampoo paired with XL Drying Towel and Coral Fleece.",
    ideal_use: "Starter wash kit for a safe wash routine.",
    url: "https://streetkingz.co.uk/product/origin-xl-wash-kit/"
  },
  {
    name: "The Origin Wash Kit",
    type: "bundle",
    details: "Full Origin system: Shampoo, Wash Mitt, Glass Cleaner, Waffle Cloth, Multiclean and Scrub Pads.",
    ideal_use: "Complete wash setup for new and returning customers.",
    url: "https://streetkingz.co.uk/product/origin-wash-kit/"
  },
  {
    name: "Ultimate Wash and Dry Set",
    type: "bundle",
    details: "Wash Mitt, XL Drying Towel and Heavy Duty Drying Towel.",
    ideal_use: "Near-complete wash and dry system.",
    url: "https://streetkingz.co.uk/product/ultimate-wash-and-dry-set/"
  },
  {
    name: "XL Wash & Dry Set",
    type: "bundle",
    details: "XL Towel + Wash Mitt.",
    ideal_use: "Basic wash and dry combo.",
    url: "https://streetkingz.co.uk/product/xl-wash-dry-set/"
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
  },
  {
    name: "Wash, Dry And Polish Kit",
    type: "bundle",
    details: "1200gsm Towel, Wash Mitt, Coral Fleece Cloth.",
    ideal_use: "Complete wash, dry and finishing system.",
    url: "https://streetkingz.co.uk/product/wash-dry-and-polish-kit/"
  },
  {
    name: "Mega Drying Bundle",
    type: "bundle",
    details: "XL towel, Heavy Duty towel and Coral Fleece.",
    ideal_use: "Heavy users or detailers.",
    url: "https://streetkingz.co.uk/product/mega-drying-bundle/"
  },
  {
    name: "Drying Bundle",
    type: "bundle",
    details: "1200gsm towel, 800gsm towel and 380gsm cloth.",
    ideal_use: "Customers wanting multiple drying options.",
    url: "https://streetkingz.co.uk/product/drying-bundle/"
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

// Helper: build the prompt we send to OpenAI (SMART MODE)
function buildPrompt({ topic, primary_keyword, featured_product_name, featured_product_url }) {
  const productsJson = JSON.stringify(STREET_KINGZ_PRODUCTS);

  return `
You are an expert UK SEO content writer for Street Kingz, a UK-based car care brand.
You produce high-quality, helpful, practical long-form blog articles in clean HTML.

Featured product (must be the main recommendation):
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

- MEDIUM MODE (1100–1600 words) for focused "how to" topics that cover one main process,
  such as "how to clean car glass" or "how to deep clean car seats".

- SHORT MODE (600–1000 words) ONLY for simple, single-question topics like:
  - "do I need to dry my car"
  - "what is a drying towel"
  - "how often should I wash my car"

For the mode you choose, you MUST:
- Set "target_word_count" inside the JSON to a number within that mode’s range.
- Write enough detail to realistically reach that length (do not heavily summarise).
- If the topic clearly matches a pillar style query or the drying-hard-rule list above, you MUST pick LONG MODE.

Ignore any user word count request, Smart Mode ALWAYS decides.

====================================================================
REALISM + ANTI-AI-DETECTION RULES (MANDATORY)
====================================================================

To avoid AI-patterned writing and make articles feel authentically human:

1. No two Street Kingz articles should ever use the exact same H2 labels.
   - You MUST vary section titles each time.
   - Use the structure, but allow flexible naming (for example "Why This Matters" can become "Why It Actually Matters").

2. Include at least ONE mild, grounded opinion.

3. Include at least ONE real-world 'Sunday driveway' style example.

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
- After first link, you may use the plain text name.
- You MUST include 2 or 3 different Street Kingz products in each article.
- At least 2 different products MUST be linked on first mention.
- Only reference products that are genuinely relevant to the topic.

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
CONTENT RULES FOR content_html
====================================================================

- ONE <h1>
- Use <h2> sections (names MUST vary)
- Short paragraphs (2–4 sentences)
- <h3> only for FAQs or small subpoints
- No hype, UK spelling only

====================================================================
BUYER-INTENT RULES (MANDATORY, TO MAKE THIS SELL)
====================================================================

This is a BUYER GUIDE, not a general blog.

You MUST include these sections inside content_html:

1) EARLY RECOMMENDATION BOX (within the first 20% of the article)
Add this exact HTML block AFTER the intro and img1, and you MUST replace the placeholders:

<section class="sk-featured-box">
  <h2>Best car wash kit for most people in the UK</h2>
  <p><strong>Quick pick:</strong> ${featured_product_name}</p>
  <p>Short reason in 1 to 2 sentences, practical, no hype.</p>
  <p><a href="${featured_product_url}">View the kit</a></p>
</section>

2) DECISION SECTION (mid-article, before FAQs)
- Must compare EXACTLY 3 options as bullet points:
  - Best for most people (winner, the featured product)
  - Best if you want maximum drying (pick a relevant drying bundle)
  - Best if you want a full set (pick The Origin Wash Kit)
- For each option: who it’s for + one practical reason.
- If it’s the first mention of a product, link it.

3) NOT FOR YOU SECTION
- 3 bullets max, blunt and practical.

4) CTA RULES
- Must include 2 CTAs total:
  - The featured box CTA
  - A final CTA in the conclusion, 1 sentence + link to the featured product URL

====================================================================
PRIMARY KEYWORD PLACEMENT (MANDATORY)
====================================================================

You MUST use the primary keyword EXACTLY as written:
- In the <h1> title
- In the first 120 words once
- In one <h2> heading
- In meta_description
- slug must be based on the primary keyword

====================================================================
FAQ RULES BY MODE
====================================================================

SHORT: 2–3 FAQs
MEDIUM: 3–4 FAQs
LONG: 4–6 FAQs

FAQs:
- Real search wording
- Use <h3> + <p>

====================================================================
AUTHOR SIGN-OFF RULE (MANDATORY)
====================================================================

At the very end of content_html, after the conclusion, include a short sign-off from Ben, founder of Street Kingz, inside one <p> tag. 1–2 sentences.

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
