import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { wooCollectionRequest } from "../../product-kernel/woocommerceEgress.js";

const ORIGIN = "https://streetkingz.co.uk/";
const PATH = "wp-json/wc/v3/products";
const FIELDS = ["id", "name", "permalink", "status"];

export async function verifySourceProduct({ consumerKey, consumerSecret, request = wooCollectionRequest }) {
  if (typeof consumerKey !== "string" || !consumerKey.trim() || typeof consumerSecret !== "string" || !consumerSecret.trim()) {
    throw Object.assign(new Error("WOO_CREDENTIAL_INPUT_REQUIRED"), { code: "WOO_CREDENTIAL_INPUT_REQUIRED" });
  }
  const result = await request(ORIGIN, PATH, {
    credentials: { consumerKey, consumerSecret },
    fields: FIELDS,
    query: { per_page: 1, page: 1 }
  });
  const product = result?.data?.[0];
  if (!Array.isArray(result?.data) || result.data.length !== 1 || !Number.isSafeInteger(product?.id) || product.id < 1 || typeof product.name !== "string" || !product.name.trim() || typeof product.status !== "string") {
    throw Object.assign(new Error("WOO_CATALOGUE_RESPONSE_INVALID"), { code: "WOO_CATALOGUE_RESPONSE_INVALID" });
  }
  let permalink;
  try { permalink = new URL(product.permalink); } catch { throw Object.assign(new Error("WOO_PRODUCT_PERMALINK_INVALID"), { code: "WOO_PRODUCT_PERMALINK_INVALID" }); }
  if (permalink.protocol !== "https:" || permalink.username || permalink.password) {
    throw Object.assign(new Error("WOO_PRODUCT_PERMALINK_INVALID"), { code: "WOO_PRODUCT_PERMALINK_INVALID" });
  }
  return { source_domain: new URL(ORIGIN).hostname, product: { id: product.id, name: product.name, permalink: permalink.toString(), status: product.status } };
}

async function readHidden(label) {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== "function") throw Object.assign(new Error("HIDDEN_TTY_INPUT_REQUIRED"), { code: "HIDDEN_TTY_INPUT_REQUIRED" });
  process.stderr.write(`${label}: `);
  const wasRaw = Boolean(input.isRaw);
  input.setRawMode(true);
  input.resume();
  let value = "";
  try {
    return await new Promise((resolveValue, reject) => {
      const onData = chunk => {
        for (const char of chunk.toString("utf8")) {
          if (char === "\u0003") { cleanup(); reject(Object.assign(new Error("INPUT_CANCELLED"), { code: "INPUT_CANCELLED" })); return; }
          if (char === "\r" || char === "\n") { cleanup(); process.stderr.write("\n"); resolveValue(value); return; }
          if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
          else if (char >= " " && char !== "\u007f") value += char;
        }
      };
      const cleanup = () => input.off("data", onData);
      input.on("data", onData);
    });
  } finally {
    input.setRawMode(wasRaw);
    input.pause();
  }
}

async function main() {
  let consumerKey = "";
  let consumerSecret = "";
  try {
    consumerKey = await readHidden("WooCommerce read-only Consumer Key (hidden)");
    consumerSecret = await readHidden("WooCommerce read-only Consumer Secret (hidden)");
    const verified = await verifySourceProduct({ consumerKey, consumerSecret });
    process.stdout.write(`${JSON.stringify({ status: "WOO_READ_ACCESS_VERIFIED", request_count: 1, ...verified }, null, 2)}\n`);
  } catch (error) {
    const safeCode = /^[A-Z0-9_]{1,80}$/.test(error?.code || "") ? error.code : "WOO_SOURCE_CHECK_FAILED";
    process.stderr.write(`${JSON.stringify({ status: "WOO_READ_ACCESS_NOT_VERIFIED", request_count: error?.code === "WOO_CREDENTIAL_INPUT_REQUIRED" || error?.code === "HIDDEN_TTY_INPUT_REQUIRED" || error?.code === "INPUT_CANCELLED" ? 0 : 1, safe_error_code: safeCode })}\n`);
    process.exitCode = 1;
  } finally {
    consumerKey = "";
    consumerSecret = "";
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
