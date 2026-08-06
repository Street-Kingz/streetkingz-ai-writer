export const GENERATE_REQUEST = {
  topic: "How to dry a car safely",
  primary_keyword: "how to dry a car",
  featured_product_name: "Heavy Duty Drying Towel – 1200gsm",
  featured_product_url: "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/"
};

export function validArticle(overrides = {}) {
  return {
    title: "How to dry a car safely in the UK",
    slug: "how-to-dry-a-car",
    primary_keyword: "model supplied keyword",
    meta_description: "Practical drying advice.",
    target_word_count: 800,
    content_html: [
      "<!-- IMAGE: img1 -->",
      "<h1>Model heading that must be removed</h1>",
      "<h2>Drying steps</h2>",
      "<ol><li>Use a clean drying towel.</li></ol>",
      '<p><a href="https://example.com/not-allowed">Unapproved link</a></p>',
      "<h2>FAQs</h2>",
      "<p>Use light pressure and keep the towel clean.</p>"
    ].join(""),
    image_placeholders: [],
    ...overrides
  };
}

export function openAIResponse(article = validArticle()) {
  return {
    choices: [{ message: { content: JSON.stringify(article) } }]
  };
}

export function geminiResponse(article = validArticle()) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify(article) }] } }]
  };
}

export const MALFORMED_PROVIDER_JSON = "{not valid JSON";

export function invalidHtmlArticle() {
  return validArticle({ content_html: "<h1>Unclosed heading" });
}
