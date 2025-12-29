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
// Sanitiser / Enforcer
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

const ORIGIN_WASH_KIT = STREET_KINGZ_PRODUCTS.find(p => p.name === "Origin Wash Kit");
const DEFAULT_MAX_DRYING = STREET_KINGZ_PRODUCTS.find(p => p.name === "Heavy Duty Drying Towel – 1200gsm");

function stripBannedPhrases(text) {
  if (!text) return text;
  let out = String(text);
  for (const p of BANNED_PHRASES) {
    const re = new RegExp(p, "gi");
    out = out.replace(re, "");
  }
  out = out.replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").trim();
  // Fix common punctuation glitches after stripping
  out = out.replace(/(\.|!|\?)\s*,/g, "$1 ").replace(/\s+,/g, ", ").replace(/,\s+\./g, ".").trim();
  return out;
}

// PATCH: de-dupe repeated tail sentence in meta
function dedupeSentenceEnd(meta) {
  const s = String(meta || "").trim();
  const parts = s.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length < 2) return s;
  const last = parts[parts.length - 1];
  const prev = parts[parts.length - 2];
  if (last.toLowerCase() === prev.toLowerCase()) parts.pop();
  return parts.join(" ").trim();
}

// PATCH: remove empty <p></p> tags
function removeEmptyPTags(html) {
  return String(html || "").replace(/<p>\s*<\/p>\s*/gi, "");
}

// PATCH: convert <ol>..</ol> to <ul>..</ul> (keeps <li>)
function convertOlToUl(html) {
  return String(html || "")
    .replace(/<\s*ol(\s[^>]*)?>/gi, "<ul>")
    .replace(/<\s*\/\s*ol\s*>/gi, "</ul>");
}

function removeExistingFeaturedBox(html) {
  if (!html) return html;
  return String(html).replace(/<section class=["']sk-featured-box["'][\s\S]*?<\/section>\s*/gi, "").trim();
}

function removeEllipsisPlaceholders(html) {
  if (!html) return html;
  return String(html)
    .replace(/<p>\s*\.\.\.\s*<\/p>/gi, "")
    .replace(/…/g, "")
    .trim();
}

function stripAllAnchorsExceptWhitelist(html, whitelistUrls) {
  const wl = new Set((whitelistUrls || []).filter(Boolean));
  return String(html || "").replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, href, inner) => {
    // keep exact whitelist links, otherwise remove the anchor and keep text
    if (wl.has(href)) return m;
    return inner;
  });
}

function wrapLooseTextLinesInParagraphs(html) {
  const s = String(html || "");

  // Split into tokens: tags vs text
  const parts = s.split(/(<[^>]+>)/g).filter(Boolean);

  let out = "";
  let buffer = "";

  const flush = () => {
    const t = buffer.replace(/\s+/g, " ").trim();
    if (t) out += `<p>${t}</p>\n`;
    buffer = "";
  };

  for (const part of parts) {
    if (part.startsWith("<")) {
      // Before writing a tag, flush any accumulated text as <p>
      flush();
      out += part;
    } else {
      // Accumulate text until the next tag
      buffer += " " + part;
    }
  }
  flush();

  // Cleanup: remove <p> around block tags if any slipped through (rare)
  out = out
    .replace(/<p>\s*(<(h1|h2|h3|ul|li|section|\/section|\/ul|\/li)[\s>])/gi, "$1")
    .replace(/(<\/(h1|h2|h3|ul|section)>)\s*<\/p>/gi, "$1");

  return out.trim();
}

function enforceMetaLength(meta, primaryKeyword) {
  let m = stripBannedPhrases(meta || "");
  m = dedupeSentenceEnd(m);

  // Must include keyword once
  const kw = String(primaryKeyword || "").trim();
  if (kw) {
    const lower = m.toLowerCase();
    const kwLower = kw.toLowerCase();
    if (!lower.includes(kwLower)) m = `${kw}: ${m}`.trim();

    // If keyword appears more than once, keep first and remove later occurrences
    const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    let seen = 0;
    m = m.replace(re, (match) => {
      seen += 1;
      return seen === 1 ? match : "";
    }).replace(/\s{2,}/g, " ").trim();
  }

  m = m.replace(/\s{2,}/g, " ").trim();

  const PAD = " UK delivery available.";
  while (m.length < 140) m = (m + PAD).slice(0, 160);
  if (m.length > 160) m = m.slice(0, 160).replace(/\s+\S*$/, "").trim();

  if (m.length < 140) {
    m = (m + " UK tips and product picks.").slice(0, 160).trim();
  }
  if (m.length > 160) m = m.slice(0, 160).trim();

  m = dedupeSentenceEnd(m);
  return m;
}

function buildFeaturedBox({ featured_product_name, featured_product_url }) {
  return `
<section class="sk-featured-box">
  <h2>Best option for most people in the UK</h2>
  <p><strong>Quick pick:</strong> <a href="${featured_product_url}">${featured_product_name}</a></p>
  <p>Simple setup, covers wash and dry in one go, and it’s hard to mess up on a normal driveway wash.</p>
  <p><a href="${featured_product_url}">View the kit</a></p>
</section>
`.trim();
}

function buildDecisionSection({ featured_product_name, featured_product_url }) {
  const maxDry = DEFAULT_MAX_DRYING || { name: "Heavy Duty Drying Towel – 1200gsm", url: "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/" };
  const fullSet = ORIGIN_WASH_KIT || { name: "Origin Wash Kit", url: "https://streetkingz.co.uk/product/origin-wash-kit/" };

  return `
<h2>Choosing the right products</h2>
<ul>
  <li><strong>Best for most people:</strong> <a href="${featured_product_url}">${featured_product_name}</a> for a simple wash and dry setup that covers the basics without overthinking it.</li>
  <li><strong>Best if you want maximum drying:</strong> <a href="${maxDry.url}">${maxDry.name}</a> if you want fewer passes and less towel swapping on a soaked car.</li>
  <li><strong>Best if you want a full set:</strong> <a href="${fullSet.url}">${fullSet.name}</a> if you want shampoo and a mitt sorted in one buy.</li>
</ul>
`.trim();
}

function buildWhoNotFor() {
  return `
<h2>Who this is not for</h2>
<ul>
  <li>People who want someone else to do it, you will be happier paying for a wash.</li>
  <li>Anyone without a safe place to wash where runoff is allowed and you can rinse properly.</li>
  <li>If you will not dry the car, you are likely to end up with spots and streaks anyway.</li>
</ul>
`.trim();
}

function buildFinalCta({ featured_product_url }) {
  return `<p><a href="${featured_product_url}">Get the featured kit</a> if you want the simplest option that covers most people.</p>`;
}

function removeDecisionVariants(html) {
  // remove common decision/choosing sections the model writes
  return String(html || "")
    .replace(/<h2>\s*(Decision Section|Choosing the Right Kit|Choosing the right products|Choosing the Right Products|Choosing the right kit|Choosing the Right Products.*?)\s*<\/h2>[\s\S]*?(?=<h2>|$)/gi, "")
    .replace(/<h3>\s*Best for Most People\s*<\/h3>[\s\S]*?(?=<h3>|<h2>|$)/gi, "")
    .replace(/<h3>\s*Best if You Want Maximum Drying\s*<\/h3>[\s\S]*?(?=<h3>|<h2>|$)/gi, "")
    .replace(/<h3>\s*Best if You Want a Full Set\s*<\/h3>[\s\S]*?(?=<h3>|<h2>|$)/gi, "");
}

function removeWhoNotForVariants(html) {
  return String(html || "")
    .replace(/<h2>\s*(Who This is Not For|Who this is not for|Who Is This Kit Not For\??|Who is this not for)\s*<\/h2>[\s\S]*?(?=<h2>|$)/gi, "");
}

function enforceCoreStructure({ html, featured_product_name, featured_product_url }) {
  let out = String(html || "");

  out = stripBannedPhrases(out);
  out = removeEllipsisPlaceholders(out);

  // remove AI-created featured/decision/who-not-for sections so we can inject canonical ones
  out = removeExistingFeaturedBox(out);
  out = removeDecisionVariants(out);
  out = removeWhoNotForVariants(out);

  // Force list style + remove empty <p>
  out = convertOlToUl(out);
  out = removeEmptyPTags(out);

  // Strip any model-added CTAs BEFORE we inject ours
  out = out
    .replace(/<a[^>]*>\s*View the kit\s*<\/a>/gi, "")
    .replace(/<a[^>]*>\s*Get the featured kit\s*<\/a>/gi, "");

  // Ensure img1 placeholder exists
  if (!out.includes("<!-- IMAGE: img1 -->")) {
    if (out.includes("</h1>")) out = out.replace("</h1>", "</h1>\n<!-- IMAGE: img1 -->\n");
    else out = "<!-- IMAGE: img1 -->\n" + out;
  }

  // Inject featured box immediately after img1
  const featuredBox = buildFeaturedBox({ featured_product_name, featured_product_url });
  out = out.replace("<!-- IMAGE: img1 -->", `<!-- IMAGE: img1 -->\n\n${featuredBox}\n`);

  // Whitelist only the product links we allow (plus injected CTAs)
  const maxDry = (DEFAULT_MAX_DRYING && DEFAULT_MAX_DRYING.url) ? DEFAULT_MAX_DRYING.url : "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/";
  const fullSet = (ORIGIN_WASH_KIT && ORIGIN_WASH_KIT.url) ? ORIGIN_WASH_KIT.url : "https://streetkingz.co.uk/product/origin-wash-kit/";
  const whitelist = [featured_product_url, maxDry, fullSet];
  // Temporarily allow all while we inject; later we will add CTAs to whitelist too
  out = stripAllAnchorsExceptWhitelist(out, whitelist);

  // Inject canonical decision + who-not-for before FAQs if present, else near the end
  const decision = buildDecisionSection({ featured_product_name, featured_product_url });
  const whoNotFor = buildWhoNotFor();

  if (/<h2>\s*FAQs\s*<\/h2>/i.test(out)) {
    out = out.replace(/<h2>\s*FAQs\s*<\/h2>/i, `${decision}\n${whoNotFor}\n<h2>FAQs</h2>`);
  } else {
    out = out + "\n" + decision + "\n" + whoNotFor;
  }

  // Ensure final CTA exists once near the end, and ensure Ben sign-off is LAST
const finalCta = buildFinalCta({ featured_product_url });

// Remove any loose/duplicate Ben sign-offs the model wrote (eg "Cheers, Ben")
out = out.replace(/(?:^|\n)\s*Cheers,\s*Ben\s*(?:\n|$)/gi, "\n");
out = out.replace(/(?:^|\n)\s*Ben,\s*founder\s*of\s*Street\s*Kingz\.\s*(?:\n|$)/gi, "\n");

// Also remove any existing final CTA sentence not wrapped in <p>
out = out.replace(/Get the featured kit<\/a>\s*if you want the simplest option that covers most people\.\s*/gi, "");

// Add CTA + final Ben paragraph at the very end
out = out.trim() + "\n" + finalCta + "\n" + `<p>Ben, founder of Street Kingz.</p>`;

  // Now whitelist includes CTAs too
  const whitelistWithCtas = [featured_product_url, maxDry, fullSet, featured_product_url];
  out = stripAllAnchorsExceptWhitelist(out, whitelistWithCtas);

  // Wrap any loose text lines into <p>...</p> so WP doesn't show raw text nodes
  out = wrapLooseTextLinesInParagraphs(out);

  // Clean again after injections
  out = convertOlToUl(out);
  out = removeEmptyPTags(out);

  return out.trim();
}

// ---------------------------
// OpenAI caller (JSON mode)
// ---------------------------

function stripCodeFences(text) {
  if (!text) return text;
  const trimmed = String(text).trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z]*\s*/m, "").replace(/```$/m, "").trim();
  }
  return trimmed;
}

function safeJsonParse(text) {
  const cleaned = stripCodeFences(text);
  return JSON.parse(cleaned);
}

async function callOpenAIJson({ prompt, temperature = 0.35 }) {
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
        { role: "system", content: "Return strictly valid JSON only. No prose, no markdown, no code fences." },
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
  if (!content) throw new Error("No content returned from OpenAI");
  return safeJsonParse(content);
}

// ---------------------------
// Prompt (simple + buyer intent)
// ---------------------------

function buildPrompt({ topic, primary_keyword, featured_product_name, featured_product_url }) {
  const productsJson = JSON.stringify(STREET_KINGZ_PRODUCTS);

  return `
Return JSON ONLY with:
{
  "title": string,
  "slug": string,
  "primary_keyword": string,
  "meta_description": string,
  "target_word_count": number,
  "content_html": string,
  "image_placeholders": [
    { "id":"img1","type":"string","alt":"string" },
    { "id":"img2","type":"string","alt":"string" },
    { "id":"img3","type":"string","alt":"string" }
  ]
}

INPUTS
- Topic: "${topic}"
- Primary keyword: "${primary_keyword}"
- Featured product name: "${featured_product_name}"
- Featured product URL: "${featured_product_url}"

CATALOGUE (only mention products from here):
${productsJson}

RULES
- Buyer-intent, UK spelling, practical.
- Write like a human who actually washes cars, not marketing fluff.
- Do NOT use: ${BANNED_PHRASES.join(", ")}
- Do NOT use the em dash character and do NOT use double hyphens.
- Use real HTML only: all normal text MUST be inside <p>. No loose text.
- Use <ul><li> for lists (no <ol>).
- Include: intro, steps, FAQs (3 to 5), conclusion, and a 1 line Ben sign-off.
- IMPORTANT: Do NOT write any “featured box” section and do NOT write any “View the kit” or “Get the featured kit” links.
  (The server injects those.)
- IMPORTANT: Do NOT include a decision section or who-not-for section.
  (The server injects those to keep it consistent.)

SMART LENGTH
- LONG 1800–2300 if topic is broad/full routine.
- MEDIUM 1200–1600 if one main process.
- SHORT 800–1000 if one simple question.
Set target_word_count accordingly.

PRIMARY KEYWORD
- Must appear in the title.
- Must appear in meta_description once.

CONTENT_HTML
- Start with exactly one <h1>.
- Put <!-- IMAGE: img1 --> near the top.
- No markdown.
`.trim();
}

// ---------------------------
// Route
// ---------------------------

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
    const article = await callOpenAIJson({ prompt, temperature: 0.4 });

    // Enforce meta + structure reliably
    article.primary_keyword = primary_keyword;

    article.slug = (article.slug || primary_keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""))
      .slice(0, 80);

    article.meta_description = enforceMetaLength(article.meta_description, primary_keyword);

    article.content_html = enforceCoreStructure({
      html: article.content_html,
      featured_product_name,
      featured_product_url
    });

    // Keep placeholders present (plugin expects keys)
    if (!Array.isArray(article.image_placeholders)) {
      article.image_placeholders = [
        { id: "img1", type: "image", alt: "Car wash routine" },
        { id: "img2", type: "image", alt: "Washing step" },
        { id: "img3", type: "image", alt: "Drying step" }
      ];
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
