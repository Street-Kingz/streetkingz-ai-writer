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
    details:
      "Extra large 800gsm microfibre drying towel, 90×70cm with deep pile for safe drying.",
    ideal_use: "Primary drying towel for paintwork, especially larger panels and SUVs.",
    url: "https://streetkingz.co.uk/product/xl-drying-towel-800gsm/"
  },
  {
    name: "Heavy Duty Drying Towel – 1200gsm",
    type: "drying towel",
    details: "1200gsm twisted loop heavy duty drying towel, 90×60cm, double sided.",
    ideal_use:
      "Maximum water pick up on heavily soaked vehicles or for people who want overkill drying performance.",
    url: "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/"
  },
  {
    name: "Paint Protection Cloth",
    type: "microfibre cloth",
    details:
      "Soft, short pile microfibre cloth designed for removing coatings, waxes and sealants.",
    ideal_use: "Buffing away wax, sealant or protection products without marring the finish.",
    url: "https://streetkingz.co.uk/product/paint-protection-cloth/"
  },
  {
    name: "CORAL FLEECE CLOTHS – 2 PACK",
    type: "microfibre cloth",
    details: "Pack of two plush coral fleece cloths for interior and light exterior work.",
    ideal_use:
      "Dusting interiors, light wipe downs and jobs where you want something soft and forgiving.",
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
    ideal_use:
      "Main wash stage after pre-wash and rinse, especially on well-maintained paint.",
    url: "https://streetkingz.co.uk/product/microfibre-wash-mitt/"
  },
  {
    name: "Microfibre Scrub Pads",
    type: "scrub pads",
    details: "Microfibre-faced scrub pads available in multiple pack sizes.",
    ideal_use:
      "Agitating cleaners on interiors and exteriors where you need more bite than a cloth, but still safe.",
    url: "https://streetkingz.co.uk/product/microfibre-scrub-pads/"
  },
  {
    name: "Wheel Belt Flosser",
    type: "wheel cleaning tool",
    details:
      "Flexible microfibre tool designed to clean between wheel spokes and behind brake calipers.",
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
    ideal_use:
      "Pairing with a foam lance or standard nozzles for controlled washing in tight spaces.",
    url: "https://streetkingz.co.uk/product/stubby-gun-and-nozzle-set/"
  },
  {
    name: "Snow Foam Lance",
    type: "foam lance",
    details: "Premium snow foam lance with adjustable fan and flow pattern.",
    ideal_use:
      "Applying thick, even foam during the pre-wash stage to reduce swirl marks.",
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
    details:
      "Ultra concentrated, pH safe shampoo designed to lubricate and clean without stripping protection.",
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
    details:
      "Origin Shampoo paired with premium drying gear for a complete wash and dry solution.",
    ideal_use: "A simple, effective all-in-one wash and dry setup.",
    url: "https://streetkingz.co.uk/product/the-origin-ultra-wash-dry-kit/"
  },
  {
    name: "Wheel Cleaning Kit (XL Brush + Slim Brush + Belt Flosser)",
    type: "bundle",
    details:
      "Complete wheel cleaning with the xl barrel brush, slim barrel brush and the microfibre wheel flosser",
    ideal_use: "For those who want to clean their entire alloys safely",
    url: "https://streetkingz.co.uk/product/wheel-cleaning-power-pack/"
  },
  {
    name: "Origin Wash Kit",
    type: "bundle",
    details: "Origin Ultra Concentrated pH safe shampoo paired with microfibre wash mitt",
    ideal_use:
      "costed efective shampoo that protects your paint and a microfibre mitt that prevents scratches and swirls",
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

// ✅ SLIM CATALOGUE FOR PROMPTS (reduces tokens massively)
const PRODUCTS_SLIM = STREET_KINGZ_PRODUCTS.map((p) => ({
  name: p.name,
  type: p.type,
  url: p.url
}));

// Keys
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Optional: force a provider: "openai" | "gemini" | "auto" (default)
const AI_PROVIDER = (process.env.AI_PROVIDER || "auto").toLowerCase();

if (!OPENAI_API_KEY) console.warn("⚠️ OPENAI_API_KEY not set (OpenAI calls disabled).");
if (!GEMINI_API_KEY) console.warn("⚠️ GEMINI_API_KEY not set (Gemini calls disabled).");
if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
  console.warn(
    "⚠️ No AI keys set. /generate-article will not work until you add OPENAI_API_KEY and/or GEMINI_API_KEY."
  );
}

app.use(cors());
app.use(bodyParser.json());

// Healthcheck route
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Street Kingz AI writer service running" });
});

// ---------------------------
// OpenAI cooldown (AUTO failover, no env flipping)
// ---------------------------
let OPENAI_COOLDOWN_UNTIL_MS = 0;

function setOpenAICooldownFromResponse(resp, fallbackSeconds = 6 * 60 * 60) {
  const ra = resp?.headers?.get?.("retry-after");
  const secs = ra ? Number(ra) : NaN;
  const wait = Number.isFinite(secs) && secs > 0 ? secs : fallbackSeconds;
  OPENAI_COOLDOWN_UNTIL_MS = Date.now() + wait * 1000;
}

function openaiInCooldown() {
  return Date.now() < OPENAI_COOLDOWN_UNTIL_MS;
}

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
  "mirror-like finish",

  // kill generic SEO opener patterns
  "keeping your car clean is essential",
  "one standout option",
  "we’ll walk you through",
  "follow these steps to achieve"
];

const ORIGIN_WASH_KIT = STREET_KINGZ_PRODUCTS.find((p) => p.name === "Origin Wash Kit");
const DEFAULT_MAX_DRYING = STREET_KINGZ_PRODUCTS.find(
  (p) => p.name === "Heavy Duty Drying Towel – 1200gsm"
);

function stripBannedPhrases(text) {
  if (!text) return text;
  let out = String(text);
  for (const p of BANNED_PHRASES) {
    const re = new RegExp(p, "gi");
    out = out.replace(re, "");
  }
  out = out.replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").trim();
  out = out
    .replace(/(\.|!|\?)\s*,/g, "$1 ")
    .replace(/\s+,/g, ", ")
    .replace(/,\s+\./g, ".")
    .trim();
  return out;
}

function dedupeSentenceEnd(meta) {
  const s = String(meta || "").trim();
  const parts = s.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length < 2) return s;
  const last = parts[parts.length - 1];
  const prev = parts[parts.length - 2];
  if (last.toLowerCase() === prev.toLowerCase()) parts.pop();
  return parts.join(" ").trim();
}

function removeEmptyPTags(html) {
  return String(html || "").replace(/<p>\s*<\/p>\s*/gi, "");
}

function convertOlToUl(html) {
  return String(html || "")
    .replace(/<\s*ol(\s[^>]*)?>/gi, "<ul>")
    .replace(/<\s*\/\s*ol\s*>/gi, "</ul>");
}

function removeExistingFeaturedBox(html) {
  if (!html) return html;
  return String(html)
    .replace(/<section class=["']sk-featured-box["'][\s\S]*?<\/section>\s*/gi, "")
    .trim();
}

function removeEllipsisPlaceholders(html) {
  if (!html) return html;
  return String(html).replace(/<p>\s*\.\.\.\s*<\/p>/gi, "").replace(/…/g, "").trim();
}

function stripAllAnchorsExceptWhitelist(html, whitelistUrls) {
  const wl = new Set((whitelistUrls || []).filter(Boolean));
  return String(html || "").replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (m, href, inner) => (wl.has(href) ? m : inner)
  );
}

// ✅ NEW: force img1 placeholder to the top (prevents intro appearing before your featured box)
function forceImg1PlaceholderTop(html) {
  let out = String(html || "");
  out = out.replace(/<!--\s*IMAGE:\s*img1\s*-->\s*/gi, "");
  out = `<!-- IMAGE: img1 -->\n${out}`;
  return out.trim();
}

function wrapLooseTextLinesInParagraphs(html) {
  const s = String(html || "");
  const parts = s.split(/(<[^>]+>)/g).filter(Boolean);

  let out = "";
  let buffer = [];
  const stack = [];

  const isSelfClosing = (tag) =>
    /\/>$/.test(tag) || /^<(br|hr|img|input|meta|link)\b/i.test(tag);
  const getOpenTagName = (tag) => {
    const m = tag.match(/^<\s*([a-zA-Z0-9]+)\b/);
    return m ? m[1].toLowerCase() : null;
  };
  const getCloseTagName = (tag) => {
    const m = tag.match(/^<\s*\/\s*([a-zA-Z0-9]+)\s*>/);
    return m ? m[1].toLowerCase() : null;
  };

  const inListContext = () => stack.includes("li") || stack.includes("ul") || stack.includes("ol");

  const flush = () => {
    const t = buffer.join(" ").replace(/\s+/g, " ").trim();
    buffer = [];
    if (!t) return;

    if (inListContext()) {
      out += t;
      return;
    }

    out += `<p>${t}</p>\n`;
  };

  for (const part of parts) {
    if (part.startsWith("<")) {
      if (/^<!--[\s\S]*-->$/.test(part)) {
        flush();
        out += part;
        continue;
      }

      flush();

      const closeName = getCloseTagName(part);
      if (closeName) {
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i] === closeName) {
            stack.splice(i, 1);
            break;
          }
        }
        out += part;
        continue;
      }

      const openName = getOpenTagName(part);
      if (openName && !isSelfClosing(part) && !/^<!/.test(part)) {
        stack.push(openName);
      }

      out += part;
    } else {
      buffer.push(part);
    }
  }

  flush();

  out = out
    .replace(/<p>\s*(<(h1|h2|h3|ul|li|section|\/section|\/ul|\/li)[\s>])/gi, "$1")
    .replace(/(<\/(h1|h2|h3|ul|section)>)\s*<\/p>/gi, "$1");

  return out.trim();
}

// ✅ Convert numbered <p> steps into a proper <ul><li> list (still useful for sloppy outputs)
function convertNumberedParagraphsToList(html) {
  let out = String(html || "");

  out = out.replace(/(?:<p>\s*\d+\.\s*[\s\S]*?<\/p>\s*){2,}/gi, (block) => {
    const items = [];
    const re = /<p>\s*\d+\.\s*([\s\S]*?)<\/p>/gi;
    let m;
    while ((m = re.exec(block)) !== null) {
      const text = (m[1] || "").replace(/\s+/g, " ").trim();
      if (text) items.push(`<li>${text}</li>`);
    }
    if (!items.length) return block;
    return `<ul>\n${items.join("\n")}\n</ul>`;
  });

  return out.trim();
}

// ✅ Fix invalid HTML nesting
function fixInvalidHtmlNesting(html) {
  let out = String(html || "");

  out = out.replace(/<p>\s*<p>/gi, "<p>").replace(/<\/p>\s*<\/p>/gi, "</p>");

  out = out
    .replace(/<(h1|h2|h3|li|a|strong|em)(\b[^>]*)?>\s*<p>/gi, "<$1$2>")
    .replace(/<\/p>\s*<\/(h1|h2|h3|li|a|strong|em)>/gi, "</$1>");

  out = out.replace(/<li([^>]*)>\s*<p>/gi, "<li$1>").replace(/<\/p>\s*<\/li>/gi, "</li>");

  out = out.replace(/<p>\s*<\/p>\s*/gi, "");

  return out.trim();
}

function flattenParagraphsInsideLi(html) {
  let out = String(html || "");

  out = out.replace(
    /<li([^>]*)>([\s\S]*?)<p>\s*[-–—]?\s*([\s\S]*?)<\/p>([\s\S]*?)<\/li>/gi,
    (_m, attrs, before, middle, after) => {
      const a = (before || "").replace(/\s+/g, " ").trim();
      const b = (middle || "").replace(/\s+/g, " ").trim();
      const c = (after || "").replace(/\s+/g, " ").trim();
      const joined = [a, b, c].filter(Boolean).join(" ");
      return `<li${attrs}>${joined}</li>`;
    }
  );

  return out.trim();
}

// ✅ Strip ALL <p> tags that appear anywhere inside <li>...</li>
function stripPTagsInsideLi(html) {
  return String(html || "").replace(/<li([^>]*)>([\s\S]*?)<\/li>/gi, (_m, attrs, inner) => {
    const cleaned = String(inner)
      .replace(/<\/?p\b[^>]*>/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return `<li${attrs}>${cleaned}</li>`;
  });
}

function findHtmlIssues(html) {
  const issues = [];
  const s = String(html || "");

  if (/<h1\b/i.test(s)) issues.push("h1_found");

  if (/<h1[^>]*>\s*<p>/i.test(s)) issues.push("h1_contains_p");
  if (/<a\b[^>]*>\s*<p>/i.test(s)) issues.push("a_contains_p");
  if (/<li\b[^>]*>[\s\S]*?<p\b[\s>][\s\S]*?<\/li>/i.test(s)) issues.push("li_contains_p");
  if (/<p>\s*\d+\.\s*/i.test(s)) issues.push("numbered_paragraph_steps");
  if (/<ol\b/i.test(s)) issues.push("ordered_list_found");

  return issues;
}

function enforceMetaLength(meta, primaryKeyword) {
  let m = stripBannedPhrases(meta || "");
  m = dedupeSentenceEnd(m);

  const kw = String(primaryKeyword || "").trim();
  if (kw) {
    const lower = m.toLowerCase();
    const kwLower = kw.toLowerCase();
    if (!lower.includes(kwLower)) m = `${kw}: ${m}`.trim();

    const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    let seen = 0;
    m = m
      .replace(re, (match) => {
        seen += 1;
        return seen === 1 ? match : "";
      })
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  m = m.replace(/\s{2,}/g, " ").trim();

  const PAD = " UK delivery available.";
  while (m.length < 140) m = (m + PAD).slice(0, 160);
  if (m.length > 160) m = m.slice(0, 160).replace(/\s+\S*$/, "").trim();

  if (m.length < 140) m = (m + " UK tips and product picks.").slice(0, 160).trim();
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
  const maxDry = DEFAULT_MAX_DRYING || {
    name: "Heavy Duty Drying Towel – 1200gsm",
    url: "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/"
  };
  const fullSet = ORIGIN_WASH_KIT || {
    name: "Origin Wash Kit",
    url: "https://streetkingz.co.uk/product/origin-wash-kit/"
  };

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
  return String(html || "")
    .replace(
      /<h2>\s*(Decision Section|Choosing the Right Kit|Choosing the right products|Choosing the Right Products|Choosing the right kit|Choosing the Right Products.*?)\s*<\/h2>[\s\S]*?(?=<h2>|$)/gi,
      ""
    )
    .replace(/<h3>\s*Best for Most People\s*<\/h3>[\s\S]*?(?=<h3>|<h2>|$)/gi, "")
    .replace(/<h3>\s*Best if You Want Maximum Drying\s*<\/h3>[\s\S]*?(?=<h3>|<h2>|$)/gi, "")
    .replace(/<h3>\s*Best if You Want a Full Set\s*<\/h3>[\s\S]*?(?=<h3>|<h2>|$)/gi, "");
}

function removeWhoNotForVariants(html) {
  return String(html || "").replace(
    /<h2>\s*(Who This is Not For|Who this is not for|Who Is This Kit Not For\??|Who is this not for)\s*<\/h2>[\s\S]*?(?=<h2>|$)/gi,
    ""
  );
}

function enforceCoreStructure({ html, featured_product_name, featured_product_url }) {
  let out = String(html || "");

  out = stripBannedPhrases(out);
  out = removeEllipsisPlaceholders(out);

  out = removeExistingFeaturedBox(out);
  out = removeDecisionVariants(out);
  out = removeWhoNotForVariants(out);

  out = convertOlToUl(out);
  out = removeEmptyPTags(out);

  // Strip any H1 returned by the model (your blog template already has the H1)
  out = out.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>\s*/gi, "");

  // Strip model CTAs before we inject ours
  out = out
    .replace(/<a[^>]*>\s*View the kit\s*<\/a>/gi, "")
    .replace(/<a[^>]*>\s*Get the featured kit\s*<\/a>/gi, "");

  // ✅ Force img1 placeholder to top so featured box always sits above intro
  out = forceImg1PlaceholderTop(out);

  const featuredBox = buildFeaturedBox({ featured_product_name, featured_product_url });
  out = out.replace("<!-- IMAGE: img1 -->", `<!-- IMAGE: img1 -->\n\n${featuredBox}\n`);

  const maxDry =
    DEFAULT_MAX_DRYING && DEFAULT_MAX_DRYING.url
      ? DEFAULT_MAX_DRYING.url
      : "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/";
  const fullSet =
    ORIGIN_WASH_KIT && ORIGIN_WASH_KIT.url
      ? ORIGIN_WASH_KIT.url
      : "https://streetkingz.co.uk/product/origin-wash-kit/";
  const whitelist = [featured_product_url, maxDry, fullSet];

  out = stripAllAnchorsExceptWhitelist(out, whitelist);

  out = wrapLooseTextLinesInParagraphs(out);
  out = convertNumberedParagraphsToList(out);
  out = flattenParagraphsInsideLi(out);
  out = fixInvalidHtmlNesting(out);

  // Guarantee no <p> survives inside <li>
  out = stripPTagsInsideLi(out);

  // Inject decision + who-not-for consistently (server-owned)
  const decision = buildDecisionSection({ featured_product_name, featured_product_url });
  const whoNotFor = buildWhoNotFor();

  if (/<h2>\s*FAQs\s*<\/h2>/i.test(out)) {
    out = out.replace(/<h2>\s*FAQs\s*<\/h2>/i, `${decision}\n${whoNotFor}\n<h2>FAQs</h2>`);
  } else {
    out = out + "\n" + decision + "\n" + whoNotFor;
  }

  const finalCta = buildFinalCta({ featured_product_url });

  // Remove loose/duplicate signoffs
  out = out.replace(/(?:^|\n)\s*Cheers,\s*Ben\s*(?:\n|$)/gi, "\n");
  out = out.replace(/(?:^|\n)\s*Ben,\s*founder\s*of\s*Street\s*Kingz\.\s*(?:\n|$)/gi, "\n");
  out = out.replace(
    /Get the featured kit<\/a>\s*if you want the simplest option that covers most people\.\s*/gi,
    ""
  );

  // Add CTA + final Ben paragraph at end
  out = out.trim() + "\n" + finalCta + "\n" + `<p>Ben, founder of Street Kingz.</p>`;

  out = convertOlToUl(out);
  out = removeEmptyPTags(out);

  out = flattenParagraphsInsideLi(out);
  out = fixInvalidHtmlNesting(out);
  out = stripPTagsInsideLi(out);
  out = removeEmptyPTags(out);

  // Final guarantee: no H1 survives
  out = out.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>\s*/gi, "");

  return out.trim();
}

// ---------------------------
// JSON parsing helpers
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

// ---------------------------
// OpenAI caller (JSON mode)
// ---------------------------

async function callOpenAIJson({ prompt, temperature = 0.35 }) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

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

    if (resp.status === 429) {
      setOpenAICooldownFromResponse(resp, 6 * 60 * 60);
    }

    const err = new Error(`OpenAI API error: ${resp.status}`);
    err.status = resp.status;
    err.provider = "openai";
    err.raw = errorText;
    throw err;
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content returned from OpenAI");
  return safeJsonParse(content);
}

// ---------------------------
// Gemini caller (JSON mode-ish via responseMimeType)
// ---------------------------

async function callGeminiJson({ prompt, temperature = 0.35 }) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json"
      }
    })
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error("Gemini API error:", errorText);
    const err = new Error(`Gemini API error: ${resp.status}`);
    err.status = resp.status;
    err.provider = "gemini";
    err.raw = errorText;
    throw err;
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || "").join("").trim();
  if (!text) throw new Error("No content returned from Gemini");
  return safeJsonParse(text);
}

// ---------------------------
// Provider router (auto fallback + cooldown)
// ---------------------------

async function callLLMJson({ prompt, temperature = 0.35 }) {
  if (AI_PROVIDER === "gemini") return callGeminiJson({ prompt, temperature });
  if (AI_PROVIDER === "openai") return callOpenAIJson({ prompt, temperature });

  if (openaiInCooldown() && GEMINI_API_KEY) {
    console.warn("OpenAI in cooldown, using Gemini");
    return callGeminiJson({ prompt, temperature });
  }

  if (OPENAI_API_KEY) {
    try {
      return await callOpenAIJson({ prompt, temperature });
    } catch (e) {
      const status = e?.status;
      const raw = String(e?.raw || e?.message || "");
      const isRateLimit = status === 429 || /rate[_\s-]?limit/i.test(raw);
      const isServery = status >= 500 && status <= 599;

      if ((isRateLimit || isServery) && GEMINI_API_KEY) {
        console.warn("OpenAI rate-limited/server error, falling back to Gemini");
        return callGeminiJson({ prompt, temperature });
      }
      throw e;
    }
  }

  if (GEMINI_API_KEY) return callGeminiJson({ prompt, temperature });
  throw new Error("No AI provider keys available");
}

// ---------------------------
// Prompt (structured, opinionated, like your example)
// ---------------------------

function buildPrompt({ topic, primary_keyword, featured_product_name, featured_product_url }) {
  const productsJson = JSON.stringify(PRODUCTS_SLIM);

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

VOICE + QUALITY BAR (non-negotiable)
- UK voice. Plain-English. Slightly opinionated. Reads like a real bloke who washes cars.
- NO generic SEO opener lines. No “Keeping your car clean is essential…”.
- Explain WHY each step matters (swirls, water spots, grit, brake dust), but keep it tight.
- Include 3–6 “contrarian takes” (things people do that are popular but wrong / overkill / pointless).

HARD HTML RULES
- Real HTML only. No markdown. No code fences.
- Do NOT include <h1>.
- Use <h2> and <h3> for structure.
- All normal text must be wrapped in <p>. No loose text nodes.
- Lists must be <ul><li>. No <ol>.
- Steps section MUST be: <h2> then multiple <h3> sub-steps + <p> + optional <ul>.
- Put <!-- IMAGE: img1 --> right at the top of content_html. (Very first line.)

LINK RULES (very strict)
- Only link to:
  1) Featured product URL
  2) Heavy Duty Drying Towel – 1200gsm URL
  3) Origin Wash Kit URL
- Do not create any “View the kit” or “Get the featured kit” CTA links (server injects them).
- Mention products naturally in text; only the above links are allowed.

REQUIRED SECTION ORDER (match this exact flow)
1) <!-- IMAGE: img1 -->
2) Intro: 2–4 <p> that read like your example (value + paint protection + UK roads + no fluff)
3) <h2>What makes a great car wash kit?</h2> + 2–4 <p>
4) <h2>Your step-by-step guide to a proper car wash</h2>
   - <h3>1. Pre-wash: loosen the grit</h3> + 1–3 <p> + optional <ul>
   - <h3>2. Contact wash: safe technique</h3> + 1–3 <p> + optional <ul>
   - <h3>3. Wheels: keep brake dust off the paint</h3> + 1–3 <p> + optional <ul>
   - <h3>4. Final rinse: don’t leave shampoo behind</h3> + 1–2 <p>
   - <h3>5. Drying: prevent water spots</h3> + 1–3 <p> + optional <ul>
   - <h3>6. Finishing touches: optional, not mandatory</h3> + 1–2 <p> + optional <ul>
5) <h2>Contrarian takes</h2> + <ul><li>…</li></ul> (3–6 bullets)
6) <h2>FAQs</h2> with 3–5 Q&As:
   - Each question as <h3>Question?</h3>
   - Each answer as 1–2 <p> (use product mentions naturally where relevant)
7) <h2>Conclusion</h2> + 1–2 <p>
8) Sign-off line: <p>Cheers, Ben.</p>

SMART LENGTH
- LONG 1800–2300 if broad/full routine.
- MEDIUM 1200–1600 if one main process.
- SHORT 800–1000 if one simple question.
Set target_word_count accordingly.

PRIMARY KEYWORD
- Must be in the title.
- Must appear exactly once in meta_description.

META DESCRIPTION
- 140–160 chars. Human. Not spammy. UK spelling.

Do NOT use: ${BANNED_PHRASES.join(", ")}
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
      return res
        .status(400)
        .json({ error: "Missing required fields: 'featured_product_name' and 'featured_product_url'." });
    }
    if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
      return res.status(500).json({ error: "No AI keys set. Add OPENAI_API_KEY and/or GEMINI_API_KEY in Render." });
    }

    const prompt = buildPrompt({ topic, primary_keyword, featured_product_name, featured_product_url });

    const runOnce = async (temp) => {
      const article = await callLLMJson({ prompt, temperature: temp });

      article.primary_keyword = primary_keyword;
      article.slug = (
        article.slug ||
        primary_keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      ).slice(0, 80);

      article.meta_description = enforceMetaLength(article.meta_description, primary_keyword);

      article.content_html = enforceCoreStructure({
        html: article.content_html,
        featured_product_name,
        featured_product_url
      });

      if (!Array.isArray(article.image_placeholders)) {
        article.image_placeholders = [
          { id: "img1", type: "image", alt: "Car wash kit and routine" },
          { id: "img2", type: "image", alt: "Safe contact wash" },
          { id: "img3", type: "image", alt: "Drying towel on paintwork" }
        ];
      }

      const issues = findHtmlIssues(article.content_html);
      return { article, issues };
    };

    let { article, issues } = await runOnce(0.35);

    if (issues.length) {
      const retry = await runOnce(0.2);
      article = retry.article;
      issues = retry.issues;
    }

    if (issues.length) {
      return res.status(422).json({
        error: "Generated HTML failed validation",
        issues
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
 
