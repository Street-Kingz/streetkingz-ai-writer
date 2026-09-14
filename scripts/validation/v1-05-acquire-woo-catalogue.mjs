import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { wooCollectionRequest } from "../../product-kernel/woocommerceEgress.js";
import { collectInitialCatalogue } from "../../product-kernel/woocommerceCommerce.js";

const ORIGIN = "https://streetkingz.co.uk/";
const DESTINATION = "/private/tmp/streetkingz-v105-input-20260914-ad9sko";
const PER_PAGE = 100;

async function readHidden(label) {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== "function") throw Object.assign(new Error("HIDDEN_TTY_INPUT_REQUIRED"), { code: "HIDDEN_TTY_INPUT_REQUIRED" });
  process.stderr.write(`${label}: `);
  const wasRaw = Boolean(input.isRaw);
  input.setRawMode(true);
  input.resume();
  let value = "";
  try {
    return await new Promise((resolve, reject) => {
      const cleanup = () => input.off("data", onData);
      const onData = chunk => {
        for (const char of chunk.toString("utf8")) {
          if (char === "\u0003") { cleanup(); reject(Object.assign(new Error("INPUT_CANCELLED"), { code: "INPUT_CANCELLED" })); return; }
          if (char === "\r" || char === "\n") { cleanup(); process.stderr.write("\n"); resolve(value); return; }
          if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
          else if (char >= " " && char !== "\u007f") value += char;
        }
      };
      input.on("data", onData);
    });
  } finally {
    input.setRawMode(wasRaw);
    input.pause();
  }
}

function positiveHeader(value) {
  return typeof value === "string" && /^(?:0|[1-9][0-9]{0,5})$/.test(value) ? Number(value) : null;
}

export async function acquireCatalogue({ consumerKey, consumerSecret, request = wooCollectionRequest, destination = DESTINATION }) {
  const pages = [];
  const provider = {
    async collection(pathname, options) {
      const result = await request(ORIGIN, `wp-json/wc/v3/${pathname}`, {
        credentials: { consumerKey, consumerSecret },
        fields: options.fields,
        query: options.query
      });
      pages.push({
        collection: pathname,
        page: options.query.page,
        received: result.data.length,
        source_total: positiveHeader(result.headers?.["x-wp-total"]),
        source_pages: positiveHeader(result.headers?.["x-wp-totalpages"])
      });
      return result;
    }
  };
  const catalogue = await collectInitialCatalogue(provider, { perPage: PER_PAGE });
  if (catalogue.products.some(row => !row.name || !row.canonical_url)) throw Object.assign(new Error("WOO_PRODUCT_IDENTITY_INCOMPLETE"), { code: "WOO_PRODUCT_IDENTITY_INCOMPLETE" });
  const pageSummary = new Map();
  for (const page of pages) {
    const current = pageSummary.get(page.collection) || { source_total: page.source_total, source_pages: page.source_pages, received: 0, pages: 0 };
    if (current.source_total !== page.source_total || current.source_pages !== page.source_pages) throw Object.assign(new Error("WOO_PAGINATION_CHANGED"), { code: "WOO_PAGINATION_CHANGED" });
    current.received += page.received;
    current.pages += 1;
    pageSummary.set(page.collection, current);
  }
  for (const [collection, summary] of pageSummary) {
    const requestedPages = summary.source_pages === 0 ? 1 : summary.source_pages;
    if (summary.received !== summary.source_total || summary.pages !== requestedPages) throw Object.assign(new Error("WOO_PAGINATION_INCOMPLETE"), { code: "WOO_PAGINATION_INCOMPLETE" });
    if (collection === "products" && summary.received !== catalogue.products.length) throw Object.assign(new Error("WOO_PRODUCT_COUNT_MISMATCH"), { code: "WOO_PRODUCT_COUNT_MISMATCH" });
    if (collection === "products/categories" && summary.received !== catalogue.categories.length) throw Object.assign(new Error("WOO_CATEGORY_COUNT_MISMATCH"), { code: "WOO_CATEGORY_COUNT_MISMATCH" });
  }
  for (const product of catalogue.products.filter(row => row.product_type === "variable")) {
    const key = `products/${product.source_id}/variations`;
    if (!pageSummary.has(key)) throw Object.assign(new Error("WOO_VARIATION_COVERAGE_MISMATCH"), { code: "WOO_VARIATION_COVERAGE_MISMATCH" });
  }
  const variationTotal = [...pageSummary.entries()].filter(([collection]) => collection.startsWith("products/") && collection.endsWith("/variations")).reduce((sum, [, summary]) => sum + summary.received, 0);
  if (variationTotal !== catalogue.variations.length) throw Object.assign(new Error("WOO_VARIATION_COUNT_MISMATCH"), { code: "WOO_VARIATION_COUNT_MISMATCH" });
  const serialized = {
    artifact_type: "genuine_woocommerce_catalogue_acquisition",
    schema_version: 1,
    source: { origin: ORIGIN, retrieved_at: new Date().toISOString(), connector: "wooCollectionRequest", method: "GET" },
    scope: { products: true, categories: true, product_category_relationships: true, supported_variations: true, orders: false, customer_identities: false },
    page_coverage: pages,
    collection_totals: Object.fromEntries(pageSummary),
    counts: { products: catalogue.products.length, categories: catalogue.categories.length, product_category_relationships: catalogue.links.length, variations: catalogue.variations.length },
    catalogue
  };
  const output = path.join(destination, "catalogue-acquisition.json");
  fs.writeFileSync(output, `${JSON.stringify(serialized, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  return { output, request_count: pages.length, counts: serialized.counts, collection_totals: serialized.collection_totals };
}

async function main() {
  let consumerKey = "", consumerSecret = "";
  try {
    consumerKey = await readHidden("Existing WooCommerce read-only Consumer Key (hidden)");
    consumerSecret = await readHidden("Existing WooCommerce read-only Consumer Secret (hidden)");
    const result = await acquireCatalogue({ consumerKey, consumerSecret });
    process.stdout.write(`${JSON.stringify({ status: "GENUINE_CATALOGUE_ACQUIRED", ...result }, null, 2)}\n`);
  } catch (error) {
    const safeCode = /^[A-Z0-9_]{1,80}$/.test(error?.code || "") ? error.code : "WOO_CATALOGUE_ACQUISITION_FAILED";
    process.stderr.write(`${JSON.stringify({ status: "GENUINE_CATALOGUE_NOT_ACQUIRED", safe_error_code: safeCode })}\n`);
    process.exitCode = 1;
  } finally {
    consumerKey = "";
    consumerSecret = "";
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
