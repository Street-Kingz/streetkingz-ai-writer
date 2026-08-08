import { sha256, stableId } from "../research/core/canonical.js";
import { validateProductUrl } from "../extractors/productPage.js";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export const VERIFICATION_SCHEMA_VERSION = "1.0.0";
export const MATCH_STATES = Object.freeze(["exact", "normalised_exact", "structural", "unmatched", "ambiguous"]);
export const BASELINE_STATES = Object.freeze(["UNCHANGED", "CHANGED", "PARTIALLY_MATCHED", "NOT_FOUND", "AMBIGUOUS"]);
export const IMPLEMENTATION_OPERATIONS = Object.freeze(["replace", "consolidate", "blocked", "requires_cms_field_mapping"]);

export async function prepareImmutableRunDirectory(runDirectory) {
  const resolved = path.resolve(runDirectory);
  await mkdir(path.dirname(resolved), { recursive: true });
  await mkdir(resolved, { recursive: false });
  const rawDirectory = path.join(resolved, "raw");
  await mkdir(rawDirectory, { recursive: false });
  return { runDirectory: resolved, rawDirectory };
}

const decodeHtml = (value) => String(value || "")
  .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
  .replace(/&#039;|&apos;/gi, "'").replace(/&ndash;/gi, "–").replace(/&mdash;/gi, "—")
  .replace(/&times;/gi, "×").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");

export function textFromHtml(value) {
  return decodeHtml(String(value || "").replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(?:p|li|h[1-6]|summary|div)>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[\t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{2,}/g, "\n").trim();
}

export const normaliseText = (value) => textFromHtml(value).toLowerCase().replace(/[–—]/g, "-").replace(/[^a-z0-9£%×]+/g, " ").replace(/\s+/g, " ").trim();

function elements(html, tag, predicate = () => true) {
  const output = [];
  const pattern = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let index = 0;
  for (const match of String(html).matchAll(pattern)) {
    const attrs = match[1];
    const text = textFromHtml(match[2]);
    if (text && predicate(attrs, text)) output.push({ text, locator: `${tag}[${index}]`, html: match[0], attributes: attrs });
    index += 1;
  }
  return output;
}

function classContains(attrs, name) {
  const classValue = attrs.match(/\bclass=["']([^"']*)["']/i)?.[1] || "";
  return classValue.split(/\s+/).includes(name);
}

function sectionBlocks(html) {
  const headings = [...String(html).matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];
  return headings.map((heading, index) => {
    const start = heading.index + heading[0].length;
    const end = headings[index + 1]?.index ?? html.length;
    const sectionHtml = html.slice(start, end);
    return {
      heading: textFromHtml(heading[1]),
      locator: `section[h2=${JSON.stringify(textFromHtml(heading[1]))}]`,
      text: textFromHtml(sectionHtml),
      paragraphs: elements(sectionHtml, "p").map((item, paragraphIndex) => ({ ...item, locator: `section[h2=${JSON.stringify(textFromHtml(heading[1]))}] p[${paragraphIndex}]` })),
      html: sectionHtml
    };
  });
}

function faqBlocks(html) {
  return elements(html, "details").map((detail, index) => {
    const question = elements(detail.html, "summary")[0]?.text || "";
    const answers = elements(detail.html, "p").map((item) => item.text);
    return { question, answer: answers.join(" ").trim(), text: `${question}\n${answers.join(" ")}`.trim(), locator: `details[${index}]`, match_method: "structural" };
  }).filter((item) => item.question && item.answer);
}

function occurrences(nodes, pattern, method = "exact") {
  const matched = nodes.filter((node) => pattern.test(node.text));
  const smallest = matched.filter((candidate) => !matched.some((other) => other !== candidate && other.text.length < candidate.text.length && normaliseText(candidate.text).includes(normaliseText(other.text))));
  const unique = new Map(smallest.map((node) => [`${normaliseText(node.text)}:${node.locator}`, node]));
  return [...unique.values()].map((node) => ({ text: node.text, locator: node.locator, match_method: method, confidence: method }));
}

function compareOne(expected, matches) {
  if (matches.length > 1) return "AMBIGUOUS";
  if (matches.length === 1) return normaliseText(matches[0].text) === normaliseText(expected) ? "UNCHANGED" : "CHANGED";
  return "NOT_FOUND";
}

function compareLines(expected, searchableText) {
  const lines = String(expected || "").split(/\n+/).map((line) => normaliseText(line)).filter(Boolean);
  if (!lines.length) return "NOT_FOUND";
  const page = normaliseText(searchableText);
  const matched = lines.filter((line) => page.includes(line)).length;
  if (matched === lines.length) return "UNCHANGED";
  if (matched > 0) return "PARTIALLY_MATCHED";
  return "NOT_FOUND";
}

export function resolveTargetUrl({ generationBrief }) {
  const value = generationBrief?.product?.product_url;
  if (!value) throw Object.assign(new Error("No canonical product URL exists in the generation brief."), { code: "MISSING_TARGET_URL" });
  return validateProductUrl(value);
}

export function parseFinalReviewMarkdown(markdown) {
  const definitions = [
    ["title_headings", "Title / H1"], ["differentiation", "Differentiation"], ["product_description_benefits", "Product description / benefits"],
    ["comparisons", "Comparison"], ["clarity_trust", "Clarity / trust"]
  ];
  const decisions = [];
  for (const [area, label] of definitions) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const section = markdown.match(new RegExp(`## \\d+\\. ${escaped}([\\s\\S]*?)(?=\\n## \\d+\\.|\\n## Cross-section)`, "i"))?.[1] || "";
    const decision = section.match(/\*\*Decision:\s*(APPROVE|MODIFY|REJECT)\*\*/i)?.[1]?.toUpperCase();
    if (!decision) throw new Error(`Final review is missing a decision for ${label}.`);
    const wordingBlock = section.match(/### Final wording\s*\n+((?:>[^\n]*(?:\n|$))+)/i)?.[1] || "";
    const finalWording = wordingBlock.split("\n").map((line) => line.replace(/^>\s?/, "")).join("\n").trim() || null;
    decisions.push({ decision_area: area, label, human_decision: decision, final_wording: finalWording });
  }
  return { decisions, source_sha256: sha256(markdown) };
}

export function extractCurrentPage(html, sourceUrl) {
  const h1s = elements(html, "h1");
  const productH1s = h1s.filter((item) => classContains(item.attributes, "product_title"));
  const headings = [1, 2, 3, 4, 5, 6].flatMap((level) => elements(html, `h${level}`).map((item) => ({ ...item, level })));
  const shortDescriptions = elements(html, "div", (attrs) => classContains(attrs, "woocommerce-product-details__short-description"));
  const sections = sectionBlocks(html);
  const faqs = faqBlocks(html);
  const aboutSections = sections.filter((item) => /about this product/i.test(item.heading));
  const descriptionBlocks = [
    ...shortDescriptions.map((item, index) => ({ text: item.text, locator: `div.woocommerce-product-details__short-description[${index}]`, match_method: "structural" })),
    ...aboutSections.flatMap((section) => section.paragraphs.map((item) => ({ text: item.text, locator: item.locator, match_method: "structural" })))
  ];
  const comparisonMatches = faqs.filter((item) => /heavy duty/i.test(item.text) && /xl\s*800gsm/i.test(item.text));
  const allObservableNodes = [
    ...h1s, ...headings, ...elements(html, "li"), ...elements(html, "p"), ...faqs, ...descriptionBlocks
  ];
  const exactAbsorbency = occurrences(allObservableNodes, /\bExtreme absorbency\b/i);
  const exactSafety = occurrences(allObservableNodes, /\bSafe on all paint\b/i);
  const equivalentAbsorbency = exactAbsorbency.length ? [] : occurrences(allObservableNodes, /\b(?:strong|high|extra|extreme)\s+(?:water[- ]holding|absorben(?:cy|t))\b/i, "normalised_exact");
  const equivalentSafety = exactSafety.length ? [] : occurrences(allObservableNodes, /\b(?:safe|suitable)\s+(?:for|on)\s+(?:all\s+)?paint(?:work)?\b/i, "normalised_exact");
  const qualificationFaqs = faqs.filter((item) => /scratch|safe|paint/i.test(item.question) && /used correctly|clean,?\s+shampooed paint/i.test(item.answer));
  const pageTitle = elements(html, "title")[0]?.text || null;
  const metaDescription = String(html).match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1]
    || String(html).match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)?.[1] || null;
  const internalLinks = [...String(html).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((match, index) => ({ url: decodeHtml(match[1]), text: textFromHtml(match[2]), locator: `a[${index}]` }));
  return {
    identity: {
      visible_title: {
        state: productH1s.length === 1 ? "structural" : productH1s.length > 1 ? "ambiguous" : "unmatched",
        matches: productH1s.map((item) => ({ text: item.text, locator: item.locator, match_method: "structural", confidence: "structural" }))
      },
      headings: headings.map((item) => ({ level: item.level, text: item.text, locator: item.locator }))
    },
    description: {
      blocks: descriptionBlocks,
      distribution: descriptionBlocks.length > 1 ? "distributed_across_observable_blocks" : descriptionBlocks.length === 1 ? "single_observable_block" : "unmatched",
      cms_field_ownership: "unknown"
    },
    comparison: { state: comparisonMatches.length === 1 ? "structural" : comparisonMatches.length > 1 ? "ambiguous" : "unmatched", matches: comparisonMatches },
    clarity_trust: {
      exact_absorbency_claims: exactAbsorbency,
      exact_safety_claims: exactSafety,
      bounded_equivalent_absorbency_claims: equivalentAbsorbency,
      bounded_equivalent_safety_claims: equivalentSafety,
      associated_qualification: qualificationFaqs.length === 1 ? { state: "structural", matches: qualificationFaqs } : qualificationFaqs.length > 1 ? { state: "ambiguous", matches: qualificationFaqs } : { state: "unmatched", matches: [] }
    },
    observed_blocked_areas: {
      metadata: { title: pageTitle, description: metaDescription, authorised_for_change: false },
      specifications: sections.filter((item) => /tech specs/i.test(item.heading)).map((item) => ({ text: item.text, locator: item.locator })),
      care_usage: sections.filter((item) => /how to use|care/i.test(item.heading)).map((item) => ({ text: item.text, locator: item.locator })),
      internal_links: internalLinks,
      additional_faqs: faqs,
      authorised_for_change: false
    },
    limitations: [
      "Rendered HTML does not establish WordPress or CMS field ownership.",
      "Missing rendered content does not prove missing CMS content.",
      "Bounded equivalent-phrase matching is lexical and does not establish unrestricted semantic equivalence."
    ]
  };
}

export function buildCurrentPageVerification({ targetUrl, retrieval, html, finalReview, frozenGeneration, generationBrief }) {
  const extracted = extractCurrentPage(html, retrieval.final_url || targetUrl);
  const finalDecisions = new Map(finalReview.decisions.map((item) => [item.decision_area, item]));
  const frozen = new Map(frozenGeneration.changes.map((item) => [item.decision_area, item]));
  const titleMatches = extracted.identity.visible_title.matches;
  const comparisonMatches = extracted.comparison.matches;
  const clarityMatches = [...extracted.clarity_trust.exact_absorbency_claims, ...extracted.clarity_trust.exact_safety_claims];
  const baselineComparison = {
    title_headings: compareOne(frozen.get("title_headings")?.existing_content, titleMatches),
    product_description_benefits: compareLines(frozen.get("product_description_benefits")?.existing_content, extracted.description.blocks.map((item) => item.text).join("\n")),
    comparisons: compareOne(frozen.get("comparisons")?.existing_content, comparisonMatches.map((item) => ({ text: item.answer }))),
    clarity_trust: compareLines(frozen.get("clarity_trust")?.existing_content, clarityMatches.map((item) => item.text).join("\n"))
  };
  if (titleMatches.length > 1) baselineComparison.title_headings = "AMBIGUOUS";
  if (comparisonMatches.length > 1) baselineComparison.comparisons = "AMBIGUOUS";

  const mappings = [];
  const titleDecision = finalDecisions.get("title_headings");
  mappings.push({
    decision_area: "title_headings", human_decision: titleDecision.human_decision,
    operation: titleMatches.length === 1 ? "replace" : "blocked",
    current_live_content: titleMatches.map((item) => item.text), approved_candidate: titleDecision.final_wording,
    source_locators: titleMatches.map((item) => item.locator), cms_field_ownership: "unknown",
    reason: titleMatches.length === 1 ? "A unique rendered product H1 is identifiable." : "The rendered product H1 is missing or ambiguous.",
    implementation_notes: ["Verify the WordPress field before writing.", "Do not alter metadata or heading hierarchy."]
  });
  const descriptionDecision = finalDecisions.get("product_description_benefits");
  mappings.push({
    decision_area: "product_description_benefits", human_decision: descriptionDecision.human_decision,
    operation: extracted.description.blocks.length ? "requires_cms_field_mapping" : "blocked",
    current_live_content: extracted.description.blocks.map((item) => item.text), approved_candidate: descriptionDecision.final_wording,
    source_locators: extracted.description.blocks.map((item) => item.locator), cms_field_ownership: "unknown",
    reason: extracted.description.blocks.length ? "Relevant rendered content is observable, but rendered HTML does not establish its CMS field boundaries." : "No relevant rendered description content was identified.",
    implementation_notes: ["Map the exact CMS fields before replacing or consolidating content.", "Do not infer rendered section ordering or remove unrelated content."]
  });
  const comparisonDecision = finalDecisions.get("comparisons");
  mappings.push({
    decision_area: "comparisons", human_decision: comparisonDecision.human_decision,
    operation: comparisonMatches.length === 1 ? "replace" : "blocked",
    current_live_content: comparisonMatches.map((item) => `${item.question}\n${item.answer}`), approved_candidate: comparisonDecision.final_wording,
    source_locators: comparisonMatches.map((item) => item.locator), cms_field_ownership: "unknown",
    reason: comparisonMatches.length === 1 ? "One existing Heavy Duty / XL 800GSM FAQ comparison is identifiable for replacement or consolidation." : comparisonMatches.length > 1 ? "Multiple comparison matches would risk duplication or replacing the wrong content." : "The existing comparison target was not found.",
    implementation_notes: ["Replace or consolidate the existing answer; never add a second comparison.", "Verify the FAQ CMS field before writing."]
  });
  const trustDecision = finalDecisions.get("clarity_trust");
  const trustTargets = [...extracted.clarity_trust.exact_absorbency_claims, ...extracted.clarity_trust.exact_safety_claims];
  const trustBlocked = !trustTargets.length;
  mappings.push({
    decision_area: "clarity_trust", human_decision: trustDecision.human_decision,
    operation: trustBlocked ? "blocked" : "requires_cms_field_mapping",
    current_live_content: trustTargets.map((item) => item.text), approved_candidate: trustDecision.final_wording,
    source_locators: trustTargets.map((item) => item.locator), cms_field_ownership: "unknown",
    preserve_current_content: extracted.clarity_trust.associated_qualification.matches.map((item) => `${item.question}\n${item.answer}`),
    reason: trustBlocked ? "No exact current absorbency or safety claim target was identified." : "Current claim text is observable, but CMS field boundaries and nearby qualification placement are not established by rendered HTML.",
    implementation_notes: ["Preserve useful existing safety FAQ guidance.", "Do not weaken correct-use or clean-paint qualifications."]
  });

  const core = {
    schema_version: VERIFICATION_SCHEMA_VERSION,
    artifact_type: "current_page_verification",
    target_url: targetUrl,
    retrieval,
    verified_content_hash: retrieval.content_hash,
    source_final_review_sha256: finalReview.source_sha256,
    source_generation_sha256: sha256(frozenGeneration),
    source_generation_brief_sha256: generationBrief.generation_brief_sha256,
    extracted_current_state: extracted,
    frozen_baseline_comparison: baselineComparison,
    implementation_mappings: mappings,
    rejected_or_blocked_decisions: [
      { decision_area: "differentiation", human_decision: "REJECT", implementation_action: false },
      ...["faqs_questions", "metadata", "specifications", "care_usage_guidance", "internal_linking"].map((decision_area) => ({ decision_area, implementation_action: false }))
    ],
    write_guard: { required: true, verified_content_hash: retrieval.content_hash, on_mismatch: "STOP_AND_REVERIFY" },
    publication_allowed: false,
    human_review_state: "awaiting_implementation_approval"
  };
  return { ...core, verification_id: stableId("current_page_verification", core), verification_sha256: sha256(core) };
}

export function validateCurrentPageVerification(verification, { html, finalReview, frozenGeneration, generationBrief }) {
  const errors = [];
  const contentHash = sha256(html);
  if (verification.target_url !== resolveTargetUrl({ generationBrief })) errors.push({ code: "TARGET_URL_MISMATCH", path: "target_url" });
  if (verification.retrieval.http_status < 200 || verification.retrieval.http_status >= 300) errors.push({ code: "RETRIEVAL_FAILED", path: "retrieval.http_status" });
  if (verification.verified_content_hash !== contentHash || verification.retrieval.content_hash !== contentHash) errors.push({ code: "CONTENT_HASH_MISMATCH", path: "verified_content_hash" });
  if (verification.source_final_review_sha256 !== finalReview.source_sha256) errors.push({ code: "CANDIDATE_REVIEW_MUTATED", path: "source_final_review_sha256" });
  if (verification.source_generation_sha256 !== sha256(frozenGeneration)) errors.push({ code: "SOURCE_GENERATION_MUTATED", path: "source_generation_sha256" });
  const allowed = new Set(finalReview.decisions.filter((item) => ["APPROVE", "MODIFY"].includes(item.human_decision) && item.final_wording).map((item) => item.decision_area));
  const seen = new Set();
  const observable = new Set([
    ...verification.extracted_current_state.identity.visible_title.matches.map((item) => item.text),
    ...verification.extracted_current_state.description.blocks.map((item) => item.text),
    ...verification.extracted_current_state.comparison.matches.map((item) => `${item.question}\n${item.answer}`),
    ...verification.extracted_current_state.clarity_trust.exact_absorbency_claims.map((item) => item.text),
    ...verification.extracted_current_state.clarity_trust.exact_safety_claims.map((item) => item.text)
  ]);
  for (const [index, mapping] of verification.implementation_mappings.entries()) {
    const path = `implementation_mappings[${index}]`;
    if (!allowed.has(mapping.decision_area)) errors.push({ code: "UNAPPROVED_IMPLEMENTATION_ACTION", path });
    if (seen.has(mapping.decision_area)) errors.push({ code: "DUPLICATE_IMPLEMENTATION_ACTION", path });
    seen.add(mapping.decision_area);
    if (!IMPLEMENTATION_OPERATIONS.includes(mapping.operation)) errors.push({ code: "INVALID_IMPLEMENTATION_OPERATION", path });
    const decision = finalReview.decisions.find((item) => item.decision_area === mapping.decision_area);
    if (mapping.approved_candidate !== decision?.final_wording) errors.push({ code: "APPROVED_COPY_CHANGED", path });
    if (mapping.cms_field_ownership !== "unknown") errors.push({ code: "CMS_FIELD_OWNERSHIP_INFERRED", path });
    for (const text of mapping.current_live_content) if (!observable.has(text)) errors.push({ code: "CURRENT_TEXT_NOT_EXACT", path, text });
    if (["AMBIGUOUS"].includes(verification.frozen_baseline_comparison[mapping.decision_area]) && mapping.operation !== "blocked") errors.push({ code: "AMBIGUOUS_MATCH_NOT_BLOCKED", path });
  }
  for (const area of allowed) if (!seen.has(area)) errors.push({ code: "MISSING_IMPLEMENTATION_MAPPING", path: area });
  if (seen.has("differentiation") || seen.has("metadata") || seen.has("faqs_questions") || seen.has("specifications") || seen.has("care_usage_guidance") || seen.has("internal_linking")) errors.push({ code: "BLOCKED_AREA_LEAKAGE", path: "implementation_mappings" });
  const comparison = verification.implementation_mappings.find((item) => item.decision_area === "comparisons");
  if (comparison?.operation !== "blocked" && comparison?.current_live_content.length !== 1) errors.push({ code: "COMPARISON_DUPLICATION_RISK", path: "implementation_mappings.comparisons" });
  const trust = verification.implementation_mappings.find((item) => item.decision_area === "clarity_trust");
  if (verification.extracted_current_state.clarity_trust.associated_qualification.matches.length && !(trust?.preserve_current_content || []).length) errors.push({ code: "SAFETY_GUIDANCE_REMOVAL_RISK", path: "implementation_mappings.clarity_trust" });
  if (verification.publication_allowed !== false) errors.push({ code: "PUBLICATION_AUTHORISED", path: "publication_allowed" });
  return errors;
}

export function validateWriteEligibility(verification, currentContentHash) {
  return verification?.write_guard?.required === true && verification.verified_content_hash === currentContentHash
    ? { eligible: true, errors: [] }
    : { eligible: false, errors: [{ code: "PAGE_CHANGED_SINCE_VERIFICATION", expected: verification?.verified_content_hash, actual: currentContentHash }] };
}

export async function retrieveCurrentPage(url, { fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  const targetUrl = validateProductUrl(url);
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  const response = await fetchImpl(targetUrl, { redirect: "follow", headers: { "User-Agent": "StreetKingzCurrentPageVerifier/1.0" } });
  const html = await response.text();
  return {
    html,
    metadata: {
      requested_url: targetUrl,
      final_url: response.url || targetUrl,
      http_status: response.status,
      retrieved_at: now().toISOString(),
      content_type: response.headers.get("content-type"),
      content_hash: sha256(html),
      response_size_bytes: Buffer.byteLength(html),
      retrieval_count: 1,
      redirect_handling: "fetch_follow"
    }
  };
}
