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

// Helper: build the prompt we send to OpenAI
function buildPrompt({ topic, primary_keyword }) {
  const productsJson = JSON.stringify(STREET_KINGZ_PRODUCTS);

  return `
You are an expert UK SEO content writer for Street Kingz, a UK-based car care brand. 
You write high-quality, helpful, practical long-form blog articles in clean HTML.

====================================================================
SMART MODE RULES (MANDATORY)
====================================================================

You MUST determine the correct article length based on topic complexity:

1. SHORT ARTICLE (600–1000 words)
   Use this for simple or single-answer topics such as:
   - "Do I need to dry my car?"
   - "What is a drying towel?"
   - "What do I need to wash my car?"

   Short articles get:
   - 1 inline image placeholder (img1)
   - A brief FAQ (2–3 questions)

2. MEDIUM ARTICLE (1100–1600 words)
   Use this for moderately detailed topics such as:
   - "How often should you wash your car?"
   - "How to dry a car without scratching"

   Medium articles get:
   - 2 image placeholders (img1, img2)
   - A fuller FAQ (3–4 questions)

3. LONG ARTICLE (1700–2500 words)
   Use this for broad, competitive, or multi-step guides such as:
   - "How to wash a car safely"
   - "How to wash a black car without scratching it"
   - "Complete beginner’s guide to car washing"

   Long articles get:
   - 3 image placeholders (img1, img2, img3)
   - A deep FAQ (4–6 questions)
   - Detailed breakdowns, examples, reasons, mistakes, tips

You MUST choose the correct mode yourself based ONLY on topic complexity.
Ignore any user word count request. Smart Mode is always in control.

====================================================================
STREET KINGZ PRODUCT RULES (VERY IMPORTANT)
====================================================================

Use ONLY products from this list:
${productsJson}

When referencing a Street Kingz product:
- Use the exact product name from the list.
- On FIRST mention ONLY → wrap the name in an <a> tag using its URL.
Example:
<a href="https://streetkingz.co.uk/product/xl-drying-towel-800gsm/">XL DRYING TOWEL – 800GSM</a>

After the first link, you may mention the product name without a link.

Use at most 3 Street Kingz products per article.
Choose products that genuinely fit the topic.

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
      {
        "id": "img1",
        "position": string,
        "recommended_image_type": string,
        "recommended_alt": string,
        "recommended_caption": string
      },
      {
        "id": "img2",
        "position": string,
        "recommended_image_type": string,
        "recommended_alt": string,
        "recommended_caption": string
      },
      {
        "id": "img3",
        "position": string,
        "recommended_image_type": string,
        "recommended_alt": string,
        "recommended_caption": string
      }
  ]
}

====================================================================
CONTENT RULES FOR content_html
====================================================================

- ONE <h1>, must be article title.
- Clear <h2> sections, e.g.:
  <h2>Why This Matters</h2>
  <h2>What You Need</h2>
  <h2>Step-by-Step Guide</h2>
  <h2>Common Mistakes</h2>
  <h2>Extra Tips</h2>
  <h2>Frequently Asked Questions</h2>
  <h2>Conclusion</h2>

- Short paragraphs (2–4 sentences).
- Use <h3> for FAQ questions or sub-points.
- Expand each section deeply based on Smart Mode:
  - Give real-world examples
  - Give reasons "why"
  - Add troubleshooting
  - Add pro tips
  - Add common mistakes
  - Add variations when relevant

====================================================================
IMAGE PLACEHOLDER RULES
====================================================================

Depending on Smart Mode:

SHORT articles → include ONLY img1
MEDIUM → include img1 + img2
LONG → include img1 + img2 + img3

Image positions:
- img1 → after intro
- img2 → mid-article (tools or step-by-step)
- img3 → before conclusion

In content_html, insert:
<!-- IMAGE: imgX -->

====================================================================
SEO RULES
====================================================================

- Use UK spelling (colour, tyre, litre).
- Answer search intent directly.
- Avoid hype phrases (“transform your vehicle”, “revolutionary results”).
- Do NOT use filler or fluff.
- Do NOT fabricate stats.

====================================================================
BEGIN ARTICLE NOW
====================================================================

Topic: "${topic}"
Primary keyword: "${primary_keyword}"

Return ONLY the JSON.
  `;
}
