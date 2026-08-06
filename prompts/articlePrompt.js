import { PRODUCTS_SLIM } from "../catalogue/products.js";
import { BANNED_PHRASES } from "../utils/articleFormatting.js";

export function buildPrompt({ topic, primary_keyword, featured_product_name, featured_product_url }) {
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

RULES
- Buyer-intent, UK spelling, practical.
- Write like a human who actually washes cars, not marketing fluff.
- Do NOT use: ${BANNED_PHRASES.join(", ")}
- Do NOT use the em dash character and do NOT use double hyphens.
- Use real HTML only: all normal text MUST be inside <p>. No loose text.
- Use <ul><li> for lists (no <ol>).
- Steps must be a <ul><li> list (do NOT use numbered paragraphs like "1.").
- IMPORTANT: Do NOT write any “featured box” section and do NOT write any “View the kit” or “Get the featured kit” links or text.
  (The server injects those.)
- IMPORTANT: Do NOT include a decision section or who-not-for section.
  (The server injects those to keep it consistent.)
- IMPORTANT: Do NOT include any sign-off or author line (no “Cheers, Ben”, no “Ben, founder of Street Kingz”).
  (The server injects the sign-off.)

INCLUDE
- Intro, why this matters, steps, product-pick section (without CTAs), FAQs (3 to 5), conclusion.
- Keep it helpful and specific to the UK (rain, road film, winter salt etc).

SMART LENGTH
- LONG 1800–2300 if topic is broad/full routine.
- MEDIUM 1200–1600 if one main process.
- SHORT 800–1000 if one simple question.
Set target_word_count accordingly.

PRIMARY KEYWORD
- Must appear in the title.
- Must appear in meta_description once.

CONTENT_HTML
- Do NOT include <h1>. Your blog template already renders the H1.
- You MAY use <h2> and <h3>.
- Put <!-- IMAGE: img1 --> near the top.
- No markdown.
`.trim();
}
