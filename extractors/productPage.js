const SOURCE_ARTIFACT = "raw/page.html";

export class ProductPageExtractionError extends Error {
  constructor(message, code = "INVALID_PRODUCT_PAGE") {
    super(message);
    this.name = "ProductPageExtractionError";
    this.code = code;
  }
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&pound;/gi, "£")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&times;/gi, "×")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function textFromHtml(value) {
  return decodeHtml(
    String(value || "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>|<\/li>|<\/h[1-6]>|<\/summary>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function normalizeEvidence(value) {
  return textFromHtml(value).replace(/\s+/g, " ").trim().slice(0, 500);
}

function provenance(sourceUrl, selector, evidence) {
  return {
    source_url: sourceUrl,
    source_artifact: SOURCE_ARTIFACT,
    extraction_method: "deterministic_html",
    selector,
    evidence: normalizeEvidence(evidence)
  };
}

function fact(value, sourceUrl, selector, evidence = value) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return { value: normalized, provenance: provenance(sourceUrl, selector, evidence) };
}

function derivedFact(value, sourceUrl, selector, evidence) {
  const result = fact(value, sourceUrl, selector, evidence);
  if (result) result.provenance.extraction_method = "deterministic_derivation";
  return result;
}

function firstMatch(html, pattern) {
  const match = String(html || "").match(pattern);
  return match ? match[1] : "";
}

function sectionAfterHeading(html, heading, nextHeading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const next = nextHeading
    ? `(?=<h2\\b[^>]*>\\s*${nextHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`
    : "(?=<h2\\b|$)";
  return firstMatch(
    html,
    new RegExp(`<h2\\b[^>]*>\\s*${escaped}\\s*<\\/h2>([\\s\\S]*?)${next}`, "i")
  );
}

function listItems(html) {
  return [...String(html || "").matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => ({ value: textFromHtml(match[1]), evidence: match[0] }))
    .filter((item) => item.value);
}

function paragraphs(html) {
  return [...String(html || "").matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => ({ value: textFromHtml(match[1]), evidence: match[0] }))
    .filter((item) => item.value);
}

function parseCommerceData(html) {
  const encoded = firstMatch(html, /name=["']gtm4wp_product_data["'][^>]*value=["']([\s\S]*?)["']/i);
  if (!encoded) return null;
  try {
    return JSON.parse(decodeHtml(encoded));
  } catch {
    return null;
  }
}

function parseTechSpecs(html, sourceUrl) {
  const section = sectionAfterHeading(html, "Tech Specs");
  const entries = [];
  const pattern = /<strong\b[^>]*>\s*[•]?\s*([^:<]+):\s*<\/strong>\s*([\s\S]*?)(?=<br\b|<strong\b|<\/p>)/gi;
  for (const match of section.matchAll(pattern)) {
    const label = textFromHtml(match[1]);
    const value = textFromHtml(match[2]);
    if (!label || !value) continue;
    entries.push({
      name: fact(label, sourceUrl, "section:Tech Specs strong", match[0]),
      value: fact(value, sourceUrl, "section:Tech Specs value", match[0])
    });
  }
  return entries;
}

function parseHowTo(html, sourceUrl) {
  const section = sectionAfterHeading(html, "How to use it", "Tech Specs");
  const text = textFromHtml(section);
  const matches = [...text.matchAll(/(?:^|\s)(\d+)\)\s*([\s\S]*?)(?=\s+\d+\)|$)/g)];
  return matches.map((match) => ({
    step: Number(match[1]),
    instruction: fact(match[2], sourceUrl, `section:How to use it step:${match[1]}`, match[0])
  }));
}

function parseFaqs(html, sourceUrl) {
  const faqs = [];
  const pattern = /<details\b[^>]*>([\s\S]*?)<\/details>/gi;
  for (const detail of html.matchAll(pattern)) {
    const questionHtml = firstMatch(detail[1], /<summary\b[^>]*>([\s\S]*?)<\/summary>/i);
    const question = textFromHtml(questionHtml);
    const answerParts = paragraphs(detail[1]);
    const answer = answerParts.map((part) => part.value).join(" ").trim();
    if (!question || !answer) continue;
    faqs.push({
      question: fact(question, sourceUrl, "details summary", questionHtml),
      answer: fact(answer, sourceUrl, "details answer", answerParts.map((part) => part.evidence).join(" "))
    });
  }
  return faqs;
}

function parseInternalLinks(html, sourceUrl) {
  const links = [];
  const seen = new Set();
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let url;
    try {
      url = new URL(decodeHtml(match[1]), sourceUrl);
    } catch {
      continue;
    }
    const label = textFromHtml(match[2]);
    const isUiLink = /\b(add_to_cart_button|ajax_add_to_cart|elementor-button)\b/i.test(match[0]);
    const isGenericLabel = /^(add to (?:cart|basket)|buy now|select options|read more|view product)$/i.test(label);
    if (url.hostname !== new URL(sourceUrl).hostname) continue;
    if (!url.pathname.startsWith("/product/") || url.href === sourceUrl || url.searchParams.has("add-to-cart")) continue;
    if (!label || isUiLink || isGenericLabel || seen.has(url.href)) continue;
    seen.add(url.href);
    links.push({
      label: fact(label, sourceUrl, "a[href] label", match[0]),
      url: fact(url.href, sourceUrl, "a[href]", match[0])
    });
  }
  return links;
}

function comparableName(value) {
  return String(value || "").toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function meaningfulWords(value) {
  const stopWords = new Set(["this", "that", "with", "from", "your", "using", "product", "heavy", "duty"]);
  return comparableName(value).split(" ").filter((word) => word.length >= 4 && !stopWords.has(word));
}

function parseRelatedProducts(html, sourceUrl, internalLinks, relevanceContext) {
  const relatedStart = html.search(/<h2\b[^>]*>\s*Complete the Kit\s*<\/h2>/i);
  if (relatedStart < 0) return [];
  const afterStart = html.slice(relatedStart);
  const nextHeading = afterStart.slice(1).search(/<h2\b/i);
  const relatedHtml = nextHeading >= 0 ? afterStart.slice(0, nextHeading + 1) : afterStart;
  const headings = [...relatedHtml.matchAll(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi)];
  const relevantWords = new Set(meaningfulWords(relevanceContext));
  return headings.map((heading, index) => {
    const name = textFromHtml(heading[1]);
    if (!meaningfulWords(name).some((word) => relevantWords.has(word))) return null;
    const matchingLink = internalLinks.find((link) =>
      comparableName(link.label.value).includes(comparableName(name)) ||
      comparableName(name).includes(comparableName(link.label.value))
    );
    return {
      name: fact(name, sourceUrl, "section:Complete the Kit h4", heading[0]),
      url: matchingLink
        ? fact(
            matchingLink.url.value,
            sourceUrl,
            "matching meaningful product link",
            matchingLink.url.provenance.evidence
          )
        : null
    };
  }).filter((product) => product?.name);
}

function bySpec(specifications, name) {
  return specifications.find((entry) => entry.name.value.toLowerCase() === name.toLowerCase())?.value || null;
}

export function validateProductUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ProductPageExtractionError("A valid absolute product URL is required.", "INVALID_URL");
  }
  if (url.protocol !== "https:" || !/(^|\.)streetkingz\.co\.uk$/i.test(url.hostname) || !url.pathname.startsWith("/product/")) {
    throw new ProductPageExtractionError(
      "URL must be an HTTPS Street Kingz product page.",
      "INVALID_URL"
    );
  }
  url.hash = "";
  return url.href;
}

export function extractProductPage(html, sourceUrl, { extractedAt = new Date().toISOString() } = {}) {
  const validatedUrl = validateProductUrl(sourceUrl);
  if (!String(html || "").trim()) {
    throw new ProductPageExtractionError("Product page HTML is empty.", "MISSING_PAGE_DATA");
  }

  const titleHtml = firstMatch(html, /<h1\b[^>]*class=["'][^"']*\bproduct_title\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
  const productName = textFromHtml(titleHtml);
  if (!productName) {
    throw new ProductPageExtractionError(
      "Rendered page does not contain a WooCommerce product title.",
      "MISSING_PAGE_DATA"
    );
  }

  const commerceData = parseCommerceData(html);
  const priceHtml = firstMatch(html, /<p\b[^>]*class=["'][^"']*\bprice\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  const visiblePrice = textFromHtml(priceHtml).replace(/([£$€])\s+(?=\d)/, "$1");
  const shortDescription = firstMatch(
    html,
    /<div\b[^>]*class=["'][^"']*woocommerce-product-details__short-description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  const allTechSpecs = parseTechSpecs(html, validatedUrl);
  const specifications = allTechSpecs.filter((entry) =>
    ["gsm", "size", "material", "edge"].includes(entry.name.value.toLowerCase())
  );
  const shortItems = listItems(shortDescription);
  const aboutSection = sectionAfterHeading(html, "About this product", "How to use it");
  const aboutParagraphs = paragraphs(aboutSection);
  const faqs = parseFaqs(html, validatedUrl);
  const productContentStart = html.search(/<h1\b[^>]*class=["'][^"']*\bproduct_title\b/i);
  const internalLinks = parseInternalLinks(html.slice(Math.max(0, productContentStart)), validatedUrl);
  const relatedProducts = parseRelatedProducts(
    html,
    validatedUrl,
    internalLinks,
    `${productName} ${textFromHtml(sectionAfterHeading(html, "How to use it", "Tech Specs"))}`
  );

  const aboutEvidence = aboutParagraphs.map((item) => item.evidence).join(" ");
  const features = [
    derivedFact("1200GSM dual-layer construction", validatedUrl, "derived:short description + Tech Specs GSM", `${shortDescription} ${aboutEvidence}`),
    derivedFact("Double-sided plush microfibre construction", validatedUrl, "derived:About this product", aboutEvidence),
    bySpec(allTechSpecs, "Edge")
  ].filter(Boolean);
  const benefits = [
    derivedFact("Designed to pull water off paint with almost no effort", validatedUrl, "derived:About this product", aboutEvidence),
    derivedFact("Fewer passes and faster drying", validatedUrl, "derived:About this product", aboutEvidence),
    derivedFact("Less contact with paint helps prevent streaks, smears and unwanted marks", validatedUrl, "derived:About this product", aboutEvidence),
    derivedFact("Holds a serious amount of water while remaining soft and manageable", validatedUrl, "derived:About this product", aboutEvidence)
  ];
  const comparisonFaq = faqs.find((entry) => /difference.*XL 800GSM/i.test(entry.question.value));
  const scratchFaq = faqs.find((entry) => /scratch.*paint/i.test(entry.question.value));
  const weightFaq = faqs.find((entry) => /too heavy.*wet/i.test(entry.question.value));
  const limitations = [
    comparisonFaq
      ? derivedFact(
          "Compared with the XL 800GSM towel, it is smaller, heavier and more substantial in the hand",
          validatedUrl,
          "derived:FAQ comparison",
          comparisonFaq.answer.provenance.evidence
        )
      : null,
    scratchFaq
      ? derivedFact(
          "Use only on clean, shampooed paint",
          validatedUrl,
          "derived:FAQ paint-safety caution",
          scratchFaq.answer.provenance.evidence
        )
      : null,
    weightFaq
      ? derivedFact(
          "Feels heavier when fully saturated with water",
          validatedUrl,
          "derived:FAQ wet-weight trade-off",
          weightFaq.answer.provenance.evidence
        )
      : null
  ].filter(Boolean);

  const careInstructions = ["Wash", "Care", "Dry"]
    .map((label) => {
      const value = bySpec(allTechSpecs, label);
      return value ? { name: fact(label, validatedUrl, "section:Tech Specs label", label), instruction: value } : null;
    })
    .filter(Boolean);

  const intendedUse = [
    ...["Suitable for", "Best use"].map((label) => bySpec(allTechSpecs, label)).filter(Boolean)
  ];

  const productType = derivedFact(
    "Microfibre car drying towel",
    validatedUrl,
    "derived:h1.product_title + Tech Specs Material + Suitable for",
    `${titleHtml} ${bySpec(allTechSpecs, "Material")?.provenance.evidence || ""} ${bySpec(allTechSpecs, "Suitable for")?.provenance.evidence || ""}`
  );
  const conciseClaims = shortItems
    .filter((item) => ["Extreme absorbency", "Soft premium feel", "Safe on all paint"].includes(item.value))
    .map((item) => fact(item.value, validatedUrl, "short description li", item.evidence));

  return {
    schema_version: "1.0.0",
    artifact_type: "product_facts",
    product_url: validatedUrl,
    extracted_at: extractedAt,
    source: {
      url: validatedUrl,
      artifact: SOURCE_ARTIFACT,
      kind: "rendered_product_page"
    },
    product: {
      name: fact(productName, validatedUrl, "h1.product_title", titleHtml),
      category_type: productType,
      commerce_category: commerceData?.item_category
        ? fact(commerceData.item_category, validatedUrl, "input[name=gtm4wp_product_data].item_category", commerceData.item_category)
        : null,
      price: visiblePrice
        ? fact(visiblePrice, validatedUrl, "p.price", priceHtml)
        : null,
      specifications,
      features,
      benefits,
      intended_use: intendedUse,
      how_to_use: parseHowTo(html, validatedUrl),
      care_instructions: careInstructions,
      faqs,
      objections_or_buying_questions: faqs.map((entry) => entry.question),
      related_products: relatedProducts,
      internal_links: internalLinks,
      claims: conciseClaims,
      limitations
    },
    warnings: [
      ...(commerceData?.item_category ? [] : ["Product category/type was not visible in supported commerce metadata."]),
      ...(visiblePrice ? [] : ["Product price was not visible on the rendered page."])
    ]
  };
}
