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
You are an expert UK SEO writer for Street Kingz. Output MUST be strictly valid JSON only.

INPUTS
- Topic: "${topic}"
- Primary keyword: "${primary_keyword}"
- Featured product (winner): "${featured_product_name}"
- Featured product URL: "${featured_product_url}"

====================================================================
HARD OUTPUT RULES (NO EXCEPTIONS)
====================================================================

1) RETURN JSON ONLY
Return exactly one JSON object with these keys:
{
  "title": string,
  "slug": string,
  "primary_keyword": string,
  "meta_description": string,
  "target_word_count": number,
  "content_html": string,
  "image_placeholders": [
    { "id": "img1", "type": "string", "alt": "string" },
    { "id": "img2", "type": "string", "alt": "string" },
    { "id": "img3", "type": "string", "alt": "string" }
  ]
}
No extra text before or after JSON.

2) HTML VALIDITY
- content_html must be valid HTML.
- Use exactly ONE <h1>.
- All paragraph text must be inside <p>.
- Lists must be <ul><li>... and any non-list text must be wrapped in <p>.
- Do NOT output Markdown.

3) NO EM DASH OR DOUBLE HYPHEN
Do not use — or -- anywhere.

4) UK SPELLING, NO FAKE STATS, NO HYPE.

====================================================================
BANNED PHRASES (STRICT)
====================================================================
Do NOT use:
"in this guide", "in this article", "this comprehensive guide", "showroom shine", "showroom finish",
"gleaming ride", "ultimate shine", "mirror-like finish"

====================================================================
SMART LENGTH MODE (SET target_word_count)
====================================================================
Pick ONE:
- SHORT: 800–1000 words
- MEDIUM: 1200–1600 words
- LONG: 1800–2300 words

Use LONG if the topic is a full routine or broad how-to.
Use MEDIUM for one main process.
Use SHORT only for simple single-question topics.

====================================================================
STREET KINGZ PRODUCT RULES
====================================================================
You may ONLY mention products from this list:
${productsJson}

Linking rules:
- You MUST include 2 or 3 different Street Kingz products total.
- The featured product MUST be one of them and MUST be the main recommendation.
- FIRST time you mention ANY product, you MUST link it like:
<a href="URL">Exact Product Name</a>
- After first mention, product names can be plain text.

====================================================================
CTA DEFINITION (TO AVOID CONFLICT)
====================================================================
A "CTA" is ONLY either:
- a link with anchor text exactly "View the kit"
- OR a final conclusion link to the featured product with anchor text exactly "Get the featured kit"

All other product links are NOT CTAs.

You MUST include exactly 2 CTAs total:
- CTA #1 inside the featured box: "View the kit"
- CTA #2 in the conclusion: "Get the featured kit"

Do NOT include any other links with those anchor texts.

====================================================================
PRIMARY KEYWORD PLACEMENT (STRICT)
====================================================================
Use the primary keyword EXACTLY as written:
- In the <h1> (exact match appears once within the h1 text)
- Once in the first 120 words
- In one <h2> heading (exact match appears once within the h2 text)
- Once in meta_description (140–160 characters)
- slug: lowercase, hyphen-separated, based on the primary keyword

====================================================================
MANDATORY FEATURED BOX (EXACT HTML)
====================================================================
After the intro paragraph(s), insert:
<!-- IMAGE: img1 -->
Then immediately output this section EXACTLY (keep tags + <p> structure):

<section class="sk-featured-box">
  <h2>Best option for most people in the UK</h2>
  <p><strong>Quick pick:</strong> <a href="${featured_product_url}">${featured_product_name}</a></p>
  <p>Short reason in 1 to 2 sentences, practical, no hype.</p>
  <p><a href="${featured_product_url}">View the kit</a></p>
</section>

After </section>, the next content MUST start with a new <p>.

====================================================================
CONTENT STRUCTURE (BUYER INTENT)
====================================================================
Your article must include these sections (H2 titles can vary, except where noted):

- Intro (1–2 short <p>)
- Featured box (as above)
- <h2> that contains the primary keyword exactly once (this is mandatory)
- A practical step-by-step or decision logic relevant to the topic
- <!-- IMAGE: img2 --> somewhere mid-article IF target_word_count >= 1200
- A decision section BEFORE FAQs with EXACTLY 3 options in a <ul>:
  1) Best for most people: featured product (winner)
  2) Best if you want maximum drying: choose a relevant drying product/bundle from the list
  3) Best if you want a full set: choose Origin Wash Kit (must be exactly "Origin Wash Kit" if present in the list)
Each bullet must say who it’s for + one practical reason.

- A "Who this is not for" section with EXACTLY 3 bullets in <ul><li>, blunt and practical.

- FAQs:
  SHORT: 2–3
  MEDIUM: 3–4
  LONG: 4–6
Use <h3> for each question and <p> for each answer.

- Conclusion:
  Include exactly one final CTA sentence inside a <p>:
  <p><a href="${featured_product_url}">Get the featured kit</a> if you want the simplest option that covers most people.</p>

- Author sign-off (final line in content_html):
  One <p>, 1–2 sentences, from Ben, founder of Street Kingz. No links.

- <!-- IMAGE: img3 --> only if LONG mode, placed before the conclusion.

====================================================================
REALISM (REQUIRED)
====================================================================
Include:
- One mild opinion (grounded, not cringe).
- One Sunday-driveway UK example (weather, time pressure, driveway, etc).

====================================================================
NOW WRITE THE ARTICLE
====================================================================
Return ONLY the JSON object.
`;
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
