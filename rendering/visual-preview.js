export const VISUAL_PREVIEW_CONTRACT_VERSION = "1.0.0";

export function buildBrowserOpenablePreview({ html, css, title = "Visual Review", lang = "en" }) {
  if (typeof html !== "string" || !html.trim()) throw new Error("Preview HTML is required.");
  if (typeof css !== "string" || !css.trim()) throw new Error("Preview CSS is required.");
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}</style></head><body>${html}</body></html>\n`;
}

export function validateBrowserOpenablePreview(document, { expectedMarkupSelectors = [] } = {}) {
  const errors = [];
  if (!/^<!doctype html>/i.test(document)) errors.push("Missing doctype.");
  for (const tag of ["<html", "<head", "<meta name=\"viewport\"", "<style", "</style>", "<body", "</body>", "</html>"]) if (!document.toLowerCase().includes(tag.toLowerCase())) errors.push(`Missing preview document marker: ${tag}`);
  const style = document.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] || "";
  if (!style.trim()) errors.push("Embedded CSS is empty.");
  for (const selector of expectedMarkupSelectors) if (!document.includes(selector)) errors.push(`Expected renderer selector/markup missing: ${selector}`);
  return { status: errors.length ? "FAIL" : "PASS", errors, embedded_css_bytes: Buffer.byteLength(style) };
}
