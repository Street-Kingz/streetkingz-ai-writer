import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../research/core/canonical.js";

const sourceDirectory = path.resolve("artifacts/cornerstone/best-car-drying-towel/rendering-v1/offline-preview-008");
const outputDirectory = path.resolve("artifacts/cornerstone/best-car-drying-towel/rendering-v1/visual-review-v1-007");
const [html, css] = await Promise.all([readFile(path.join(sourceDirectory, "rendered-page.html"), "utf8"), readFile(path.join(sourceDirectory, "rendered-page.css"), "utf8")]);
await mkdir(outputDirectory, { recursive: true });
const document = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Street Kingz Visual Review — Best Car Drying Towel</title><style>${css}</style></head><body>${html}</body></html>\n`;
await writeFile(path.join(outputDirectory, "index.html"), document);
await writeFile(path.join(outputDirectory, "source-manifest.json"), `${JSON.stringify({ artifact_type: "visual_review_preview", source_preview: "../offline-preview-008", source_semantic_sha256: "d55cc6fc52429a1b39e93cb8e676b6f01ccc88230aaac2c163f2be07c2fb6b25", source_render_sha256: sha256(html.trimEnd()), browser_openable: true, screenshots: { desktop: null, mobile: null }, changes_to_content_or_css: false, wordpress_writes: 0, ai_calls: 0 }, null, 2)}\n`);
console.log(JSON.stringify({ outputDirectory, browser_openable: true, screenshots: false }));
