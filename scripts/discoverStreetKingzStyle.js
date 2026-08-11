import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { discoverSiteStyleProfile } from "../rendering/site-style-discovery.js";

const root = path.resolve("artifacts/style-discovery/street-kingz-v1");
const raw = path.join(root, "raw"); const read = (name) => readFile(path.join(raw, name), "utf8");
const pages = [
  { url: "https://streetkingz.co.uk/", page_type: "homepage", html: await read("homepage.html"), stylesheets: [await read("kadence-child.css"), await read("fonts.css")] },
  { url: "https://streetkingz.co.uk/product/heavy-duty-drying-towel-1200gsm/", page_type: "product", html: await read("product.html"), stylesheets: [await read("kadence-child.css"), await read("product-template.css"), await read("fonts.css")] }
];
const result = discoverSiteStyleProfile({ site_id: "streetkingz.co.uk", pages });
const output = path.join(root, "discovery-v1"); await mkdir(output, { recursive: true });
await writeFile(path.join(output, "site-style-discovery.json"), `${JSON.stringify(result, null, 2)}\n`);
await writeFile(path.join(output, "site-style-profile.json"), `${JSON.stringify(result.profile, null, 2)}\n`);
await writeFile(path.join(output, "run-metadata.json"), `${JSON.stringify({ artifact_type: "site_style_discovery_run", discovery_version: result.discovery_version, source_urls: pages.map((page) => page.url), ai_calls: 0, wordpress_writes: 0, profile_hash: result.profile_hash }, null, 2)}\n`);
console.log(JSON.stringify({ output, status: result.status, profile_hash: result.profile_hash, evidence: result.evidence }, null, 2));
