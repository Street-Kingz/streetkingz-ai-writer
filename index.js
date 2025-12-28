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

// ---------------------------
// Helpers
// ---------------------------

function stripCodeFences(text) {
  if (!text) return text;
  const trimmed = String(text).trim();
  // Remove ```json ... ``` or ``` ... ```
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z]*\s*/m, "").replace(/```$/m, "").trim();
  }
  return trimmed;
}

function safeJsonParse(text) {
  const cleaned = stripCodeFences(text);
  return JSON.parse(cleaned);
}

async function callOpenAIJson({ prompt, temperature = 0.3 }) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Return strictly valid JSON only. No prose, no markdown, no code fences."
        },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error("OpenAI API error:", errorText);
    throw new Error(`OpenAI API error: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    console.error("No content returned from OpenAI:", data);
    throw new Error("No content returned from OpenAI");
  }

  return safeJsonParse(content);
}

// ---------------------------
// 2-PASS PROMPTS
// ---------------------------

function buildPass1Prompt({ topic, primary_keyword, featured_product_name, featured_product_url }) {
  const productsJson = JSON.stringify(STREET_KINGZ_PRODUCTS);

  return `
You are planning an SEO buyer-intent article for Street Kingz (UK car care).
Return JSON ONLY.

INPUTS
- Topic: "${topic}"
- Primary keyword: "${primary_keyword}"
- Featured product (winner): "${featured_product_name}"
- Featured product URL: "${featured_product_url}"

PRODUCT CATALOGUE (you may only choose from this list):
${productsJson}

GOAL
Create a plan that makes Pass 2 succeed:
- correct word count mode
- correct image placeholders
- correct sections
- correct product picks
- no conflicts with strict HTML rules

HARD RULES
- No em dash character and no double hyphen anywhere in any strings.
- No banned phrases: "in this guide", "in this article", "this comprehensive guide", "showroom shine", "showroom finish", "gleaming ride", "ultimate shine", "mirror-like finish".
- Featured product must be the main recommendation and included in plan.
- Total products in article: 2 or 3.
- Must include "Origin Wash Kit" as the "full set" option in the 3-way decision section.
- Must include a "maximum drying" option that is a drying towel or drying bundle from the catalogue.

SMART LENGTH MODE
Pick one:
- SHORT 800–1000
- MEDIUM 1200–1600
- LONG 1800–2300
Use LONG if topic is broad/full routine; MEDIUM for one process; SHORT only for simple single question.

PRIMARY KEYWORD PLACEMENT PLAN
You must ensure in Pass 2:
- H1 contains the primary keyword exactly once (as a substring).
- First 120 words contains primary keyword exactly once.
- One H2 contains primary keyword exactly once.
- Meta description 140–160 chars contains primary keyword exactly once.
- Slug is based on primary keyword.

DECISION SECTION
Plan the 3 bullets exactly:
1) Best for most people: featured product
2) Best if you want maximum drying: pick from catalogue
3) Best if you want a full set: Origin Wash Kit

OUTPUT JSON SHAPE (EXACT)
{
  "mode": "SHORT" | "MEDIUM" | "LONG",
  "target_word_count": number,
  "slug_suggestion": string,
  "meta_description_suggestion": string,
  "h1_suggestion": string,
  "h2_primary_keyword_suggestion": string,
  "section_h2s": [string, string, string, string, string],
  "products": {
    "featured": { "name": string, "url": string },
    "max_drying": { "name": string, "url": string },
    "full_set": { "name": "Origin Wash Kit", "url": string },
    "optional_third": { "name": string, "url": string } | null
  },
  "image_plan": {
    "include_img1": true,
    "include_img2": boolean,
    "include_img3": boolean
  },
  "realism": {
    "mild_opinion_sentence": string,
    "sunday_driveway_example_sentence": string
  }
}

Return JSON ONLY.
`.trim();
}

function buildPass2Prompt({ topic, primary_keyword, plan }) {
  const productsJson = JSON.stringify(STREET_KINGZ_PRODUCTS);

  return `
You are an expert UK SEO writer for Street Kingz. Output MUST be strictly valid JSON only.

INPUTS
- Topic: "${topic}"
- Primary keyword: "${primary_keyword}"
- Plan JSON (authoritative, follow it):
${JSON.stringify(plan)}

PRODUCT CATALOGUE (you may only mention products from this list):
${productsJson}

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
- No loose text nodes anywhere.
- Lists must be <ul><li> and any non-list text must be in <p>.
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
SMART LENGTH (FOLLOW PLAN)
====================================================================
- Set target_word_count to plan.target_word_count.
- Write enough detail to realistically reach it.

====================================================================
STREET KINGZ PRODUCT RULES
====================================================================
You may ONLY mention products from the catalogue.
Linking rules:
- Total products mentioned in the article must be 2 or 3.
- The featured product MUST be one of them and MUST be the main recommendation.
- FIRST time you mention ANY product, you MUST link it like:
<p><a href="URL">Exact Product Name</a></p> is NOT allowed. Links must be inside normal sentence paragraphs.
Example: <p>Most people should start with <a href="URL">Exact Product Name</a> because ...</p>
- After first mention, product names can be plain text.

====================================================================
CTA DEFINITION (TO AVOID CONFLICT)
====================================================================
A "CTA" is ONLY either:
- a link with anchor text exactly "View the kit"
- OR a final conclusion link to the featured product with anchor text exactly "Get the featured kit"

You MUST include exactly 2 CTAs total:
- CTA #1 inside the featured box: "View the kit"
- CTA #2 in the conclusion: "Get the featured kit"

Do NOT include any other links with those anchor texts.

====================================================================
PRIMARY KEYWORD PLACEMENT (FOLLOW PLAN EXACTLY)
====================================================================
- <h1> must contain the primary keyword exactly once (as a substring).
- First 120 words must contain the primary keyword exactly once.
- One <h2> must contain the primary keyword exactly once.
- meta_description 140–160 chars contains the primary keyword exactly once.
- slug should use plan.slug_suggestion (you may lightly refine but keep based on keyword).

====================================================================
MANDATORY FEATURED BOX (EXACT HTML)
====================================================================
After the intro paragraph(s), insert:
<!-- IMAGE: img1 -->
Then immediately output this section EXACTLY (keep tags + <p> structure exactly):

<section class="sk-featured-box">
  <h2>Best option for most people in the UK</h2>
  <p><strong>Quick pick:</strong> <a href="${plan.products.featured.url}">${plan.products.featured.name}</a></p>
  <p>Short reason in 1 to 2 sentences, practical, no hype.</p>
  <p><a href="${plan.products.featured.url}">View the kit</a></p>
</section>

Immediately after </section>, start a new paragraph:
<p>...</p>

====================================================================
CONTENT STRUCTURE (FOLLOW PLAN)
====================================================================
- Use plan.section_h2s for your H2s (you can add more if needed, but keep them varied).
- Include the H2 that contains the primary keyword exactly once, using plan.h2_primary_keyword_suggestion.
- If plan.image_plan.include_img2 is true, include <!-- IMAGE: img2 --> mid-article.
- If plan.image_plan.include_img3 is true, include <!-- IMAGE: img3 --> before the conclusion.

Decision section BEFORE FAQs:
- Must be a <h2> (wording can vary, but keep buyer intent).
- Must contain EXACTLY 3 options in a <ul>:
  1) Best for most people: featured product (winner)
  2) Best if you want maximum drying: plan.products.max_drying
  3) Best if you want a full set: plan.products.full_set (Origin Wash Kit)
Each <li> must include who it’s for + one practical reason.
First mention linking rules still apply.

"Who this is not for" section:
- <h2> then <ul> with EXACTLY 3 <li>, blunt and practical.

FAQs:
- SHORT: 2–3, MEDIUM: 3–4, LONG: 4–6
- Use <h3> for each question and <p> for each answer.

Conclusion:
- Include exactly one final CTA sentence inside a <p>:
<p><a href="${plan.products.featured.url}">Get the featured kit</a> if you want the simplest option that covers most people.</p>

Author sign-off:
- Final line in content_html must be a single <p>, 1–2 sentences, from Ben, founder of Street Kingz. No links.

REALISM:
- Include plan.realism.mild_opinion_sentence verbatim somewhere in a <p>.
- Include plan.realism.sunday_driveway_example_sentence verbatim somewhere in a <p>.

====================================================================
NOW WRITE THE ARTICLE
====================================================================
Return ONLY the JSON object.
`.trim();
}

// ---------------------------
// Route: generate (2-pass)
// ---------------------------

const BANNED_PHRASES = [
  "in this guide",
  "in this article",
  "this comprehensive guide",
  "showroom shine",
  "showroom finish",
  "gleaming ride",
  "ultimate shine",
  "mirror-like finish"
];

function validateArticleOrThrow(article) {
  const html = String(article?.content_html || "");
  const meta = String(article?.meta_description || "");
  const slug = String(article?.slug || "");
  const title = String(article?.title || "");

  // Basic required fields
  if (!title || !slug || !meta || !html) return { ok: false, reason: "Missing required fields." };

  // Banned phrases (case-insensitive) across HTML + meta
  const haystack = (meta + "\n" + html).toLowerCase();
  const hit = BANNED_PHRASES.find(p => haystack.includes(p));
  if (hit) return { ok: false, reason: `Banned phrase found: "${hit}"` };

  // No placeholder ellipsis paragraph
  if (html.includes("<p>...</p>") || html.includes("…")) {
    return { ok: false, reason: "Found placeholder ellipsis (<p>...</p> or …)." };
  }

  // Enforce: no <ol> (your prompt says lists must be <ul><li>)
  if (/<\s*ol[\s>]/i.test(html) || /<\s*\/\s*ol\s*>/i.test(html)) {
    return { ok: false, reason: "Found <ol> list. Only <ul><li> allowed." };
  }

  // Enforce: featured box exact structure (quick sanity check)
  if (!html.includes('<section class="sk-featured-box">') || !html.includes(">View the kit<")) {
    return { ok: false, reason: "Featured box missing or malformed." };
  }

  // Enforce: final CTA exists
  if (!html.includes(">Get the featured kit<")) {
    return { ok: false, reason: 'Missing final CTA anchor text "Get the featured kit".' };
  }

  // Optional: meta length guardrail (your rule)
  if (meta.length < 140 || meta.length > 160) {
    return { ok: false, reason: `Meta description length out of range (got ${meta.length}).` };
  }

  return { ok: true };
}

function buildPass2FixPrompt({ topic, primary_keyword, plan, article, failReason }) {
  return `
You output an article that FAILED validation.

FAIL REASON:
${failReason}

TASK:
Return a corrected JSON object in the SAME schema as before.
Do NOT change the topic/keyword/featured product.
Do NOT add any new products beyond the 2–3 planned.
Keep the featured box EXACT HTML as specified.
Remove any banned phrases, remove any <p>...</p>, remove any <ol> lists.

INPUTS
- Topic: "${topic}"
- Primary keyword: "${primary_keyword}"
- Plan JSON:
${JSON.stringify(plan)}
- Broken article JSON:
${JSON.stringify(article)}

Return ONLY the corrected JSON object.
`.trim();
}

app.post("/generate-article", async (req, res) => {
  const reqId = Math.random().toString(36).slice(2, 9);
  const t0 = Date.now();

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

    // PASS 1: plan
    console.log(`[${reqId}] PASS1_START`, { t: Date.now() - t0 });
    const pass1Prompt = buildPass1Prompt({ topic, primary_keyword, featured_product_name, featured_product_url });
    const plan = await callOpenAIJson({ prompt: pass1Prompt, temperature: 0.2 });
    console.log(`[${reqId}] PASS1_DONE`, { t: Date.now() - t0, mode: plan?.mode, wc: plan?.target_word_count });

    // Guardrails so Pass 2 doesn't go off the rails
    if (!plan?.products?.featured?.name || !plan?.products?.featured?.url) {
      return res.status(502).json({ error: "Pass 1 plan missing featured product." });
    }
    if (!plan?.products?.full_set?.name || plan.products.full_set.name !== "Origin Wash Kit") {
      const originWashKit = STREET_KINGZ_PRODUCTS.find(p => p.name === "Origin Wash Kit");
      if (originWashKit) {
        plan.products.full_set = { name: "Origin Wash Kit", url: originWashKit.url };
      } else {
        return res.status(502).json({ error: "Catalogue missing Origin Wash Kit; update product list." });
      }
    }

    // PASS 2: final article
    console.log(`[${reqId}] PASS2_START`, { t: Date.now() - t0 });
    const pass2Prompt = buildPass2Prompt({ topic, primary_keyword, plan });
    let article = await callOpenAIJson({ prompt: pass2Prompt, temperature: 0.35 });

    let v = validateArticleOrThrow(article);
    if (!v.ok) {
      console.warn(`[${reqId}] PASS2_FAIL`, { t: Date.now() - t0, reason: v.reason });

      // One automatic retry fix pass
      const fixPrompt = buildPass2FixPrompt({ topic, primary_keyword, plan, article, failReason: v.reason });
      article = await callOpenAIJson({ prompt: fixPrompt, temperature: 0.1 });

      v = validateArticleOrThrow(article);
      if (!v.ok) {
        console.warn(`[${reqId}] PASS2_FAIL_AFTER_RETRY`, { t: Date.now() - t0, reason: v.reason });
        return res.status(502).json({ error: "Article failed validation after retry.", reason: v.reason });
      }
    }

    console.log(`[${reqId}] PASS2_DONE`, { t: Date.now() - t0 });
    return res.json(article);
  } catch (err) {
    console.error(`[${reqId}] ERROR`, err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Street Kingz AI writer service listening on port ${PORT}`);
});
