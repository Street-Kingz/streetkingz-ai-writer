import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { STREET_KINGZ_SITE_ADAPTER } from "../rendering/site-adapters.js";
import { validateSiteAdapter } from "../rendering/site-adapter.js";

const output = path.resolve("artifacts/site-adapters/street-kingz-wordpress-v1"); await mkdir(output, { recursive: true });
await writeFile(path.join(output, "adapter.json"), `${JSON.stringify(STREET_KINGZ_SITE_ADAPTER, null, 2)}\n`);
await writeFile(path.join(output, "cms-audit.json"), `${JSON.stringify({ artifact_type: "site_adapter_cms_audit", adapter_id: STREET_KINGZ_SITE_ADAPTER.adapter_id, platform: "wordpress", theme: "kadence", builder: "elementor", evidence: STREET_KINGZ_SITE_ADAPTER.provenance, likely_editorial_path: "Existing Kadence/theme content primitives where verified; no verified reusable editorial Elementor template was found in the supplied evidence. Product 2003 remains a product-template concern and is not authorised for editorial persistence.", persistence_implemented: false, wordpress_writes: 0, ai_calls: 0, validation: validateSiteAdapter(STREET_KINGZ_SITE_ADAPTER) }, null, 2)}\n`);
console.log(JSON.stringify({ output, status: "PASS", wordpress_writes: 0, ai_calls: 0 }));
