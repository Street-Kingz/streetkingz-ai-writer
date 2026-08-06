import { STREET_KINGZ_PRODUCTS } from "../catalogue/products.js";

export const BANNED_PHRASES = [
  "in this guide",
  "in this article",
  "this comprehensive guide",
  "showroom shine",
  "showroom finish",
  "gleaming ride",
  "ultimate shine",
  "mirror-like finish"
];

const ORIGIN_WASH_KIT = STREET_KINGZ_PRODUCTS.find((p) => p.name === "Origin Wash Kit");
const DEFAULT_MAX_DRYING = STREET_KINGZ_PRODUCTS.find(
  (p) => p.name === "Heavy Duty Drying Towel – 1200gsm"
);

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function clampStr(s, max = 220) {
  const out = String(s || "").trim();
  return out.length > max ? out.slice(0, max).trim() : out;
}

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
    // Matches: class="sk-featured-box" OR class='sk-featured-box' OR class=sk-featured-box
    .replace(
      /<section\b[^>]*class\s*=\s*(?:"sk-featured-box"|'sk-featured-box'|sk-featured-box)[^>]*>[\s\S]*?<\/section>\s*/gi,
      ""
    )
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

    // If we're inside a list, do NOT create <p> (it breaks HTML)
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

  // DEBUG MARKER
out += "\n<!-- ENFORCED_OK -->";
  
  return out.trim();
}

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

function stripPTagsInsideLi(html) {
  return String(html || "").replace(/<li([^>]*)>([\s\S]*?)<\/li>/gi, (_m, attrs, inner) => {
    const cleaned = String(inner)
      .replace(/<\/?p\b[^>]*>/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return `<li${attrs}>${cleaned}</li>`;
  });
}

export function enforceMetaLength(meta, primaryKeyword) {
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

// ---------------------------
// ✅ Dynamic featured box + CTA copy (per request)
// ---------------------------
function buildFeaturedBox({
  featured_product_name,
  featured_product_url,
  featured_box_heading,
  featured_box_blurb,
  featured_box_cta
}) {
  const heading = escapeHtml(clampStr(featured_box_heading || "Best option for most people in the UK", 120));
  const blurb = escapeHtml(
    clampStr(
      featured_box_blurb ||
        "Simple setup, covers wash and dry in one go, and it’s hard to mess up on a normal driveway wash.",
      220
    )
  );
  const cta = escapeHtml(clampStr(featured_box_cta || "View the kit", 60));

  return `
<section class="sk-featured-box">
  <h2>${heading}</h2>
  <p><strong>Quick pick:</strong> <a href="${featured_product_url}">${escapeHtml(featured_product_name)}</a></p>
  <p>${blurb}</p>
  <p><a href="${featured_product_url}">${cta}</a></p>
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

function buildFinalCta({ featured_product_url, final_cta_text }) {
  const cta = escapeHtml(clampStr(final_cta_text || "Get the featured kit", 80));
  return `<p><a href="${featured_product_url}">${cta}</a> if you want the simplest option that covers most people.</p>`;
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

export function enforceCoreStructure({
  html,
  featured_product_name,
  featured_product_url,
  featured_box_heading,
  featured_box_blurb,
  featured_box_cta,
  final_cta_text
}) {
  let out = String(html || "");

  out = stripBannedPhrases(out);
  out = removeEllipsisPlaceholders(out);

  // Kill any model-made featured box / injected sections
  out = removeExistingFeaturedBox(out);
  out = removeDecisionVariants(out);
  out = removeWhoNotForVariants(out);

  out = convertOlToUl(out);
  out = removeEmptyPTags(out);

  // Strip any H1 returned by the model (your blog template already has the H1)
  out = out.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>\s*/gi, "");

  // ✅ HARD SCRUB: remove any model CTA anchors by visible text (even if href is whitelisted)
  out = out.replace(/<a\b[^>]*>\s*(View the kit|Get the featured kit)\s*<\/a>/gi, "");

  // ✅ HARD SCRUB: remove any model CTA paragraphs/sentences that often follow
  out = out.replace(
    /<p>\s*(?:<a\b[^>]*>\s*)?(View the kit|Get the featured kit)(?:\s*<\/a>)?[\s\S]*?<\/p>/gi,
    ""
  );

  // ✅ HARD SCRUB: remove any model sign-off variants anywhere
  out = out
    .replace(/\bCheers,\s*Ben\.?\b/gi, "")
    .replace(/\bBen,\s*founder\s*of\s*Street\s*Kingz\.?\b/gi, "");

  if (!out.includes("<!-- IMAGE: img1 -->")) {
    out = "<!-- IMAGE: img1 -->\n" + out;
  }

  // Inject featured box server-side
  const featuredBox = buildFeaturedBox({
    featured_product_name,
    featured_product_url,
    featured_box_heading,
    featured_box_blurb,
    featured_box_cta
  });
  out = out.replace("<!-- IMAGE: img1 -->", `<!-- IMAGE: img1 -->\n\n${featuredBox}\n`);

  // Whitelist only these URLs
  const maxDry =
    DEFAULT_MAX_DRYING && DEFAULT_MAX_DRYING.url
      ? DEFAULT_MAX_DRYING.url
      : "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/";
  const fullSet =
    ORIGIN_WASH_KIT && ORIGIN_WASH_KIT.url
      ? ORIGIN_WASH_KIT.url
      : "https://streetkingz.co.uk/product/origin-wash-kit/";
  const whitelist = [featured_product_url, maxDry, fullSet];

  // Strip non-whitelisted links
  out = stripAllAnchorsExceptWhitelist(out, whitelist);

  // Structure + list hygiene
  out = wrapLooseTextLinesInParagraphs(out);
  out = convertNumberedParagraphsToList(out);
  out = flattenParagraphsInsideLi(out);
  out = fixInvalidHtmlNesting(out);

  // Guarantee no <p> survives inside <li>
  out = stripPTagsInsideLi(out);

  // Inject decision + who-not-for server-side only
  const decision = buildDecisionSection({ featured_product_name, featured_product_url });
  const whoNotFor = buildWhoNotFor();

  if (/<h2>\s*FAQs\s*<\/h2>/i.test(out)) {
    out = out.replace(/<h2>\s*FAQs\s*<\/h2>/i, `${decision}\n${whoNotFor}\n<h2>FAQs</h2>`);
  } else {
    out = out + "\n" + decision + "\n" + whoNotFor;
  }

  // Final CTA + final sign-off (server-owned)
  const finalCta = buildFinalCta({ featured_product_url, final_cta_text });

  out = out.trim() + "\n" + finalCta + "\n" + `<p>Ben, founder of Street Kingz.</p>`;

  // ✅ DEBUG MARKER (correct place)
  out += "\n<!-- ENFORCE_CORE_RAN -->";

  // Final hardening pass
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
