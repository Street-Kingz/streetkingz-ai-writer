import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyBrandEditor } from "../brand/editor.js";
import { STREET_KINGZ_BRAND_VOICE } from "../brand/street-kingz.js";

const root = "artifacts/cornerstone/best-car-drying-towel/production-semantic-article-v1";
const source = JSON.parse(await readFile(path.join(root, "semantic-page.json"), "utf8"));
const result = applyBrandEditor(source, STREET_KINGZ_BRAND_VOICE);
const output = path.join(root, "brand-edited-v1");
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "semantic-page.json"), `${JSON.stringify(result.page, null, 2)}\n`);
await writeFile(path.join(output, "brand-editor-report.json"), `${JSON.stringify({ ...result, page: undefined, wordpress_writes: 0, ai_calls: 0 }, null, 2)}\n`);
await writeFile(path.join(output, "brand-voice-profile.json"), `${JSON.stringify(STREET_KINGZ_BRAND_VOICE, null, 2)}\n`);
console.log(JSON.stringify({ output, brand: result.brand_name, source_semantic_page_sha256: result.source_semantic_page_sha256, semantic_page_sha256: result.semantic_page_sha256, analyzed_components: result.editorial_report.components.length, rewritten_components: result.editorial_report.rewrite_count, product_references_preserved: result.product_references_preserved, wordpress_writes: 0, ai_calls: 0 }, null, 2));
