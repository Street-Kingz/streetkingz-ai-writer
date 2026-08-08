import { normaliseText, textFromHtml } from "../verification/currentPage.js";

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const CONCATENATED_SENTENCE = /[a-z][.!?][A-Z]/;
const CONCATENATED_WORD = /\b[a-z]{4,}(?=[A-Z][a-z])/;

export function readableTextFromCmsHtml(html) {
  return textFromHtml(String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<\/li\s*>/gi, "\n"));
}

function structuralErrors(html) {
  const errors = [];
  const stack = [];
  const source = String(html || "");
  const tokens = [...source.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)];
  const tagRemainder = source.replace(/<!--[\s\S]*?-->/g, "").replace(/<\/?[a-z][a-z0-9-]*\b[^>]*>/gi, "");
  if (/[<>]/.test(tagRemainder)) errors.push("MALFORMED_TAG_FRAGMENT");
  for (const match of tokens) {
    const token = match[0];
    const tag = match[1].toLowerCase();
    if (token.startsWith("</")) {
      if (stack.at(-1) !== tag) errors.push(`ORPHAN_OR_MISNESTED_CLOSING_TAG:${tag}`);
      else stack.pop();
    } else if (!VOID_TAGS.has(tag) && !token.endsWith("/>")) stack.push(tag);
  }
  for (const tag of stack.reverse()) errors.push(`UNCLOSED_TAG:${tag}`);
  return errors;
}

function listErrors(html) {
  const errors = [];
  const source = String(html || "");
  const listTags = [...source.matchAll(/<\/?(?:ul|ol|li)\b[^>]*>/gi)];
  if (!listTags.length) return errors;
  const stack = [];
  for (const match of listTags) {
    const token = match[0];
    const tag = token.match(/^<\/?(ul|ol|li)/i)?.[1].toLowerCase();
    if (token.startsWith("</")) {
      if (stack.at(-1) === tag) stack.pop();
      continue;
    }
    if (tag === "li" && !["ul", "ol"].includes(stack.at(-1))) errors.push("LI_WITHOUT_LIST_PARENT");
    if (tag === "li" && /^(?:\s|<[^>]+>)*$/.test(source.slice(match.index + token.length, source.indexOf("</li>", match.index)))) errors.push("EMPTY_LIST_ITEM");
    stack.push(tag);
  }
  return errors;
}

export function validateImplementationCmsValue({ html, intendedText, expectedStructure }) {
  const errors = [...structuralErrors(html), ...listErrors(html)];
  const renderedText = readableTextFromCmsHtml(html);
  if (!renderedText) errors.push("EMPTY_RENDERED_CONTENT");
  if (CONCATENATED_SENTENCE.test(renderedText)) errors.push("CONCATENATED_SENTENCE_BOUNDARY");
  if (CONCATENATED_WORD.test(renderedText)) errors.push("CONCATENATED_WORD_BOUNDARY");
  const paragraphCount = [...String(html).matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/gi)].length;
  const listCount = [...String(html).matchAll(/<(?:ul|ol)\b[^>]*>[\s\S]*?<\/(?:ul|ol)>/gi)].length;
  const itemCount = [...String(html).matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/gi)].length;
  if (expectedStructure?.paragraphs !== undefined && paragraphCount !== expectedStructure.paragraphs) errors.push(`PARAGRAPH_COUNT:${paragraphCount}`);
  if (expectedStructure?.lists !== undefined && listCount !== expectedStructure.lists) errors.push(`LIST_COUNT:${listCount}`);
  if (expectedStructure?.items !== undefined && itemCount !== expectedStructure.items) errors.push(`LIST_ITEM_COUNT:${itemCount}`);
  if (intendedText !== undefined && normaliseText(renderedText) !== normaliseText(intendedText)) errors.push("SEMANTIC_ROUND_TRIP_MISMATCH");
  return { valid: errors.length === 0, errors: [...new Set(errors)], rendered_text: renderedText, semantic_round_trip: !errors.includes("SEMANTIC_ROUND_TRIP_MISMATCH"), structure: { paragraphs: paragraphCount, lists: listCount, items: itemCount } };
}
